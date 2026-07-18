"use client";

import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { spain2010 } from "@/data/champions";
import { getDraftEra, isPlayerInDraftEra } from "@/data/eras";
import { getFormation } from "@/data/formations";
import { managers, managersById } from "@/data/managers";
import { players, playersById } from "@/data/players";
import {
  createDraftSeed,
  generateDraftOptions,
  generateManagerOptions,
  isEligibleForSlot,
  validateDraftPicks,
} from "@/engine/draft";
import { hashString } from "@/engine/random";
import { simulateMatch } from "@/engine/simulation";
import type {
  DraftEraId,
  DraftPick,
  FormationId,
  MatchResult,
} from "@/types/game";

const SAVE_VERSION = 2;
const opponentIdentityIds = new Set(
  spain2010.lineup.map((player) => player.playerIdentityId),
);

type GameStore = {
  hasHydrated: boolean;
  saveNotice: string | null;
  eraId: DraftEraId | null;
  managerId: string | null;
  managerOptionIds: string[];
  formationId: FormationId | null;
  draftSeed: number;
  picks: DraftPick[];
  selectedSlotId: string | null;
  optionIds: string[];
  rejectedIdentityIds: string[];
  respinUsed: boolean;
  respinStage: "manager" | "player" | null;
  simulationNonce: number;
  matchResult: MatchResult | null;
  setHasHydrated: (value: boolean) => void;
  dismissNotice: () => void;
  selectEra: (id: DraftEraId) => void;
  selectManager: (id: string) => void;
  respinManagers: () => void;
  selectFormation: (id: FormationId) => void;
  selectSlot: (slotId: string) => void;
  cancelSlot: () => void;
  respinPlayers: () => void;
  selectPlayer: (cardId: string) => void;
  resetDraft: () => void;
  simulate: () => MatchResult;
  prepareRematch: () => void;
  clearGame: () => void;
  repairHydratedState: () => void;
};

const browserStorage: StateStorage = {
  getItem: (name) =>
    typeof window === "undefined" ? null : window.localStorage.getItem(name),
  setItem: (name, value) => {
    if (typeof window !== "undefined") window.localStorage.setItem(name, value);
  },
  removeItem: (name) => {
    if (typeof window !== "undefined") window.localStorage.removeItem(name);
  },
};

const managerOptionsFor = (
  eraId: DraftEraId,
  seed: number,
  excluded: Iterable<string> = [],
  respinIndex = 0,
) =>
  generateManagerOptions(managers, eraId, seed, excluded, respinIndex).map(
    (manager) => manager.id,
  );

const playerOptionsFor = ({
  formationId,
  eraId,
  picks,
  selectedSlotId,
  draftSeed,
  rejectedIdentityIds,
  respinIndex = 0,
}: {
  formationId: FormationId;
  eraId: DraftEraId;
  picks: DraftPick[];
  selectedSlotId: string;
  draftSeed: number;
  rejectedIdentityIds: string[];
  respinIndex?: number;
}) => {
  const formation = getFormation(formationId);
  const slot = formation.slots.find((candidate) => candidate.id === selectedSlotId);
  if (!slot || picks.some((pick) => pick.slotId === slot.id)) return [];
  return generateDraftOptions(
    players.filter((player) => isPlayerInDraftEra(player, eraId)),
    slot,
    picks.map((pick) => pick.cardId),
    draftSeed,
    picks.length,
    {
      excludedIdentityIds: opponentIdentityIds,
      rejectedIdentityIds,
      respinIndex,
    },
  ).map((card) => card.id);
};

const cleanState = {
  eraId: null,
  managerId: null,
  managerOptionIds: [] as string[],
  formationId: null,
  draftSeed: 2026,
  picks: [] as DraftPick[],
  selectedSlotId: null,
  optionIds: [] as string[],
  rejectedIdentityIds: [] as string[],
  respinUsed: false,
  respinStage: null as "manager" | "player" | null,
  simulationNonce: 0,
  matchResult: null,
};

const migratedEra = (value: unknown): DraftEraId | null => {
  if (
    value === "all" ||
    value === "turn-of-century" ||
    value === "modern-masters" ||
    value === "new-generation"
  ) {
    return value;
  }
  if (value === "open") return "all";
  if (value === "1990s" || value === "2000s") return "turn-of-century";
  if (value === "2010s") return "modern-masters";
  if (value === "2020s") return "new-generation";
  return null;
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      hasHydrated: false,
      saveNotice: null,
      ...cleanState,
      setHasHydrated: (value) => set({ hasHydrated: value }),
      dismissNotice: () => set({ saveNotice: null }),
      selectEra: (eraId) => {
        const draftSeed = createDraftSeed();
        set({
          ...cleanState,
          eraId,
          draftSeed,
          managerOptionIds: managerOptionsFor(eraId, draftSeed),
          saveNotice: null,
        });
      },
      selectManager: (managerId) => {
        const state = get();
        if (!state.managerOptionIds.includes(managerId) || !managersById.has(managerId)) {
          return;
        }
        set({
          managerId,
          formationId: null,
          picks: [],
          selectedSlotId: null,
          optionIds: [],
          matchResult: null,
        });
      },
      respinManagers: () => {
        const state = get();
        if (!state.eraId || state.respinUsed || state.managerId) return;
        const rejected = state.managerOptionIds
          .map((id) => managersById.get(id)?.managerIdentityId)
          .filter((id): id is string => Boolean(id));
        set({
          managerOptionIds: managerOptionsFor(
            state.eraId,
            state.draftSeed,
            rejected,
            1,
          ),
          rejectedIdentityIds: rejected,
          respinUsed: true,
          respinStage: "manager",
        });
      },
      selectFormation: (formationId) => {
        const state = get();
        if (!state.eraId || !state.managerId) return;
        set({
          formationId,
          picks: [],
          selectedSlotId: null,
          optionIds: [],
          rejectedIdentityIds: [],
          simulationNonce: 0,
          matchResult: null,
        });
      },
      selectSlot: (selectedSlotId) => {
        const state = get();
        if (!state.formationId || !state.eraId) return;
        const formation = getFormation(state.formationId);
        if (
          !formation.slots.some((slot) => slot.id === selectedSlotId) ||
          state.picks.some((pick) => pick.slotId === selectedSlotId)
        ) {
          return;
        }
        set({
          selectedSlotId,
          optionIds: playerOptionsFor({
            formationId: state.formationId,
            eraId: state.eraId,
            picks: state.picks,
            selectedSlotId,
            draftSeed: state.draftSeed,
            rejectedIdentityIds: state.rejectedIdentityIds,
          }),
        });
      },
      cancelSlot: () => set({ selectedSlotId: null, optionIds: [] }),
      respinPlayers: () => {
        const state = get();
        if (
          state.respinUsed ||
          !state.formationId ||
          !state.eraId ||
          !state.selectedSlotId ||
          state.optionIds.length !== 3
        ) {
          return;
        }
        const rejected = [
          ...state.rejectedIdentityIds,
          ...state.optionIds
            .map((id) => playersById.get(id)?.playerIdentityId)
            .filter((id): id is string => Boolean(id)),
        ];
        set({
          optionIds: playerOptionsFor({
            formationId: state.formationId,
            eraId: state.eraId,
            picks: state.picks,
            selectedSlotId: state.selectedSlotId,
            draftSeed: state.draftSeed,
            rejectedIdentityIds: rejected,
            respinIndex: 1,
          }),
          rejectedIdentityIds: rejected,
          respinUsed: true,
          respinStage: "player",
        });
      },
      selectPlayer: (cardId) => {
        const state = get();
        if (
          !state.formationId ||
          !state.selectedSlotId ||
          !state.optionIds.includes(cardId)
        ) {
          return;
        }
        const formation = getFormation(state.formationId);
        const slot = formation.slots.find(
          (candidate) => candidate.id === state.selectedSlotId,
        );
        const selectedPlayer = playersById.get(cardId);
        const draftedIdentities = new Set(
          state.picks
            .map((pick) => playersById.get(pick.cardId)?.playerIdentityId)
            .filter((id): id is string => Boolean(id)),
        );
        if (
          !slot ||
          !selectedPlayer ||
          opponentIdentityIds.has(selectedPlayer.playerIdentityId) ||
          draftedIdentities.has(selectedPlayer.playerIdentityId) ||
          state.picks.some(
            (pick) => pick.cardId === cardId || pick.slotId === slot.id,
          ) ||
          !isEligibleForSlot(selectedPlayer, slot)
        ) {
          return;
        }
        set({
          picks: [...state.picks, { slotId: slot.id, cardId }],
          selectedSlotId: null,
          optionIds: [],
          matchResult: null,
        });
      },
      resetDraft: () => {
        const state = get();
        if (!state.formationId || !state.eraId) return;
        set({
          draftSeed: createDraftSeed(),
          picks: [],
          selectedSlotId: null,
          optionIds: [],
          rejectedIdentityIds: [],
          respinUsed: state.respinStage === "manager",
          respinStage: state.respinStage === "manager" ? "manager" : null,
          simulationNonce: 0,
          matchResult: null,
        });
      },
      simulate: () => {
        const state = get();
        if (
          !state.formationId ||
          !state.eraId ||
          !state.managerId ||
          state.picks.length !== 11
        ) {
          throw new Error("Complete the era, manager, formation, and XI first");
        }
        const formation = getFormation(state.formationId);
        const validation = validateDraftPicks({
          picks: state.picks,
          formation,
          cards: players,
          excludedIdentityIds: opponentIdentityIds,
        });
        if (validation.issues.length || validation.valid.length !== 11) {
          throw new Error("The saved XI failed identity or positional validation");
        }
        const lineup = formation.slots.map((slot) => {
          const pick = state.picks.find((candidate) => candidate.slotId === slot.id)!;
          return playersById.get(pick.cardId)!;
        });
        const manager = managersById.get(state.managerId);
        if (!manager) throw new Error("The selected manager is unavailable");
        const simulationNonce = state.simulationNonce + 1;
        const seed = hashString(
          `${state.draftSeed}:${state.picks
            .map((pick) => `${pick.slotId}:${pick.cardId}`)
            .join("|")}:spain-2010:${state.managerId}:${simulationNonce}`,
        );
        const matchResult = simulateMatch({
          lineup,
          picks: state.picks,
          formation,
          manager,
          eraId: state.eraId,
          opponent: spain2010,
          seed,
        });
        set({ matchResult, simulationNonce });
        return matchResult;
      },
      prepareRematch: () => set({ matchResult: null }),
      clearGame: () => set({ ...cleanState, saveNotice: null }),
      repairHydratedState: () => {
        const state = get();
        if (!state.eraId) return;
        const era = getDraftEra(state.eraId);
        const manager = state.managerId ? managersById.get(state.managerId) : null;
        if (
          state.managerId &&
          (!manager ||
            manager.tournamentYear < era.yearRange[0] ||
            manager.tournamentYear > era.yearRange[1])
        ) {
          set({
            managerId: null,
            managerOptionIds: managerOptionsFor(state.eraId, state.draftSeed),
            formationId: null,
            picks: [],
            selectedSlotId: null,
            optionIds: [],
            matchResult: null,
            saveNotice:
              "Your previous save used an unavailable manager and was safely returned to manager selection.",
          });
          return;
        }
        if (!state.formationId) return;
        const formation = getFormation(state.formationId);
        const repaired = validateDraftPicks({
          picks: Array.isArray(state.picks) ? state.picks : [],
          formation,
          cards: players.filter((player) =>
            isPlayerInDraftEra(player, state.eraId!),
          ),
          excludedIdentityIds: opponentIdentityIds,
        });
        const optionsValid =
          state.selectedSlotId &&
          state.optionIds.length === 3 &&
          state.optionIds.every((id) => playersById.has(id));
        if (repaired.issues.length || repaired.valid.length !== state.picks.length) {
          set({
            picks: repaired.valid,
            selectedSlotId: null,
            optionIds: [],
            matchResult: null,
            saveNotice:
              "We repaired an older or invalid saved XI. Duplicate, missing, opponent, or out-of-position entries were removed.",
          });
        } else if (!optionsValid && (state.selectedSlotId || state.optionIds.length)) {
          set({
            selectedSlotId: null,
            optionIds: [],
            saveNotice:
              "An incomplete archived choice was cleared. Select an open position to continue.",
          });
        }
      },
    }),
    {
      name: "trophy-xi-game-v1",
      version: SAVE_VERSION,
      storage: createJSONStorage(() => browserStorage),
      skipHydration: true,
      migrate: (persisted, version) => {
        const previous = (persisted ?? {}) as Partial<GameStore> & {
          eraId?: unknown;
        };
        const eraId = migratedEra(previous.eraId);
        if (version < SAVE_VERSION && eraId && !previous.managerId) {
          return {
            ...cleanState,
            eraId,
            draftSeed: previous.draftSeed ?? 2026,
            managerOptionIds: managerOptionsFor(
              eraId,
              previous.draftSeed ?? 2026,
            ),
            saveNotice:
              "Trophy XI’s draft format expanded. Choose a tournament manager to continue.",
          };
        }
        return {
          ...cleanState,
          ...previous,
          eraId,
        };
      },
      partialize: (state) => ({
        eraId: state.eraId,
        managerId: state.managerId,
        managerOptionIds: state.managerOptionIds,
        formationId: state.formationId,
        draftSeed: state.draftSeed,
        picks: state.picks,
        selectedSlotId: state.selectedSlotId,
        optionIds: state.optionIds,
        rejectedIdentityIds: state.rejectedIdentityIds,
        respinUsed: state.respinUsed,
        respinStage: state.respinStage,
        simulationNonce: state.simulationNonce,
        matchResult: state.matchResult,
        saveNotice: state.saveNotice,
      }),
      onRehydrateStorage: () => (state) => {
        state?.repairHydratedState();
        state?.setHasHydrated(true);
      },
    },
  ),
);
