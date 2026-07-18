"use client";

import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { getFormation } from "@/data/formations";
import {
  historicalOpponents,
  historicalOpponentsById,
} from "@/data/opponents/generated";
import { managers, managersById } from "@/data/managers";
import { players, playersById } from "@/data/players";
import {
  createDraftSeed,
  generateBenchOptions,
  generateDraftOptions,
  generateFormationOffer,
  generateManagerOptions,
  isEligibleForSlot,
  validateDraftPicks,
} from "@/engine/draft";
import { hashString } from "@/engine/random";
import { simulateMatch } from "@/engine/simulation";
import type {
  BenchPick,
  BenchSlotId,
  DraftEraId,
  DraftPick,
  FormationId,
  MatchResult,
} from "@/types/game";

const SAVE_VERSION = 4;

export type OpponentFilters = {
  query: string;
  year: number | null;
  nation: string;
  finish: string;
  confederation: string;
  difficulty: string;
  championOnly: boolean;
};

const defaultOpponentFilters: OpponentFilters = {
  query: "",
  year: null,
  nation: "",
  finish: "",
  confederation: "",
  difficulty: "",
  championOnly: false,
};

type DraftPhase = "starters" | "bench" | "review" | "opponent";

type GameStore = {
  hasHydrated: boolean;
  saveNotice: string | null;
  eraId: DraftEraId | null;
  managerId: string | null;
  managerOptionIds: string[];
  formationOptionIds: FormationId[];
  formationId: FormationId | null;
  draftSeed: number;
  picks: DraftPick[];
  benchPicks: BenchPick[];
  draftPhase: DraftPhase;
  selectedSlotId: string | null;
  pendingBenchCardId: string | null;
  optionIds: string[];
  rejectedIdentityIds: string[];
  playerRespinsRemaining: number;
  playerRespinIndex: number;
  opponentFilters: OpponentFilters;
  selectedOpponentId: string | null;
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
  startBenchDraft: () => void;
  assignBenchPlayer: (slotId: BenchSlotId) => void;
  cancelBenchAssignment: () => void;
  moveBenchPlayer: (slotId: BenchSlotId, direction: -1 | 1) => void;
  finalizeBench: () => void;
  setOpponentFilters: (filters: Partial<OpponentFilters>) => void;
  selectOpponent: (id: string) => void;
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
) =>
  generateManagerOptions(managers, eraId, seed, excluded).map(
    (manager) => manager.id,
  );

const formationOptionsFor = (
  managerId: string,
  eraId: DraftEraId,
  seed: number,
) => {
  const manager = managersById.get(managerId);
  return manager ? generateFormationOffer(manager, eraId, seed) : [];
};

const playerOptionsFor = ({
  formationId,
  picks,
  selectedSlotId,
  draftSeed,
  rejectedIdentityIds,
  contextKey,
  respinIndex = 0,
}: {
  formationId: FormationId;
  picks: DraftPick[];
  selectedSlotId: string;
  draftSeed: number;
  rejectedIdentityIds: string[];
  contextKey: string;
  respinIndex?: number;
}) => {
  const formation = getFormation(formationId);
  const slot = formation.slots.find((candidate) => candidate.id === selectedSlotId);
  if (!slot || picks.some((pick) => pick.slotId === slot.id)) return [];
  return generateDraftOptions(
    players,
    slot,
    picks.map((pick) => pick.cardId),
    draftSeed ^ hashString(contextKey),
    picks.length,
    {
      rejectedIdentityIds,
      respinIndex,
    },
  ).map((card) => card.id);
};

const benchOptionsFor = ({
  picks,
  benchPicks,
  draftSeed,
  rejectedIdentityIds,
  contextKey,
  respinIndex,
}: {
  picks: DraftPick[];
  benchPicks: BenchPick[];
  draftSeed: number;
  rejectedIdentityIds: string[];
  contextKey: string;
  respinIndex: number;
}) =>
  generateBenchOptions(
    players,
    picks,
    benchPicks,
    draftSeed ^ hashString(contextKey),
    benchPicks.length,
    {
      rejectedIdentityIds,
      respinIndex,
    },
  ).map((card) => card.id);

const cleanState = {
  eraId: null,
  managerId: null,
  managerOptionIds: [] as string[],
  formationOptionIds: [] as FormationId[],
  formationId: null,
  draftSeed: 2026,
  picks: [] as DraftPick[],
  benchPicks: [] as BenchPick[],
  draftPhase: "starters" as DraftPhase,
  selectedSlotId: null,
  pendingBenchCardId: null,
  optionIds: [] as string[],
  rejectedIdentityIds: [] as string[],
  playerRespinsRemaining: 2,
  playerRespinIndex: 0,
  opponentFilters: { ...defaultOpponentFilters },
  selectedOpponentId: null,
  simulationNonce: 0,
  matchResult: null,
};

const migratedEra = (value: unknown): DraftEraId | null => {
  if (
    value === "all" ||
    value === "1970s" ||
    value === "1980s" ||
    value === "1990s" ||
    value === "2000s" ||
    value === "2010s" ||
    value === "2020s"
  ) {
    return value;
  }
  if (value === "turn-of-century") return "2000s";
  if (value === "modern-masters") return "2010s";
  if (value === "new-generation") return "2020s";
  if (value === "open") return "all";
  return null;
};

const benchSlotOrder: BenchSlotId[] = ["bench-1", "bench-2", "bench-3"];

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
        if (
          !state.eraId ||
          !state.managerOptionIds.includes(managerId) ||
          !managersById.has(managerId)
        ) {
          return;
        }
        set({
          managerId,
          formationOptionIds: formationOptionsFor(
            managerId,
            state.eraId,
            state.draftSeed,
          ),
          formationId: null,
          picks: [],
          benchPicks: [],
          draftPhase: "starters",
          selectedSlotId: null,
          optionIds: [],
          selectedOpponentId: null,
          matchResult: null,
        });
      },
      // Manager options no longer consume or expose player respins.
      respinManagers: () => undefined,
      selectFormation: (formationId) => {
        const state = get();
        if (
          !state.eraId ||
          !state.managerId ||
          !state.formationOptionIds.includes(formationId)
        ) {
          return;
        }
        set({
          formationId,
          picks: [],
          benchPicks: [],
          draftPhase: "starters",
          selectedSlotId: null,
          pendingBenchCardId: null,
          optionIds: [],
          rejectedIdentityIds: [],
          playerRespinsRemaining: 2,
          playerRespinIndex: 0,
          selectedOpponentId: null,
          simulationNonce: 0,
          matchResult: null,
        });
      },
      selectSlot: (selectedSlotId) => {
        const state = get();
        if (
          state.draftPhase !== "starters" ||
          !state.formationId ||
          !state.eraId
        ) {
          return;
        }
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
            picks: state.picks,
            selectedSlotId,
            draftSeed: state.draftSeed,
            rejectedIdentityIds: state.rejectedIdentityIds,
            contextKey: `${state.eraId}:${state.managerId}:${state.formationId}:${state.playerRespinsRemaining}`,
            respinIndex: state.playerRespinIndex,
          }),
        });
      },
      cancelSlot: () => set({ selectedSlotId: null, optionIds: [] }),
      respinPlayers: () => {
        const state = get();
        if (
          state.playerRespinsRemaining <= 0 ||
          state.pendingBenchCardId ||
          state.optionIds.length !== 3 ||
          (state.draftPhase === "starters" && !state.selectedSlotId) ||
          !["starters", "bench"].includes(state.draftPhase)
        ) {
          return;
        }
        const rejected = [
          ...new Set([
            ...state.rejectedIdentityIds,
            ...state.optionIds
              .map((id) => playersById.get(id)?.playerIdentityId)
              .filter((id): id is string => Boolean(id)),
          ]),
        ];
        const nextIndex = state.playerRespinIndex + 1;
        const optionIds =
          state.draftPhase === "starters" &&
          state.formationId &&
          state.selectedSlotId
            ? playerOptionsFor({
                formationId: state.formationId,
                picks: state.picks,
                selectedSlotId: state.selectedSlotId,
                draftSeed: state.draftSeed,
                rejectedIdentityIds: rejected,
                contextKey: `${state.eraId}:${state.managerId}:${state.formationId}:${state.playerRespinsRemaining - 1}`,
                respinIndex: nextIndex,
              })
            : benchOptionsFor({
                picks: state.picks,
                benchPicks: state.benchPicks,
                draftSeed: state.draftSeed,
                rejectedIdentityIds: rejected,
                contextKey: `${state.eraId}:${state.managerId}:${state.formationId}:bench:${state.playerRespinsRemaining - 1}`,
                respinIndex: nextIndex,
              });
        set({
          optionIds,
          rejectedIdentityIds: rejected,
          playerRespinsRemaining: state.playerRespinsRemaining - 1,
          playerRespinIndex: nextIndex,
        });
      },
      selectPlayer: (cardId) => {
        const state = get();
        if (!state.optionIds.includes(cardId)) return;
        const selectedPlayer = playersById.get(cardId);
        if (!selectedPlayer) return;
        const usedIdentities = new Set(
          [...state.picks, ...state.benchPicks]
            .map((pick) => playersById.get(pick.cardId)?.playerIdentityId)
            .filter((id): id is string => Boolean(id)),
        );
        if (usedIdentities.has(selectedPlayer.playerIdentityId)) {
          return;
        }
        if (state.draftPhase === "bench") {
          set({ pendingBenchCardId: cardId });
          return;
        }
        if (
          state.draftPhase !== "starters" ||
          !state.formationId ||
          !state.selectedSlotId
        ) {
          return;
        }
        const formation = getFormation(state.formationId);
        const slot = formation.slots.find(
          (candidate) => candidate.id === state.selectedSlotId,
        );
        if (
          !slot ||
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
      startBenchDraft: () => {
        const state = get();
        if (state.picks.length !== 11 || state.draftPhase !== "starters") return;
        set({
          draftPhase: "bench",
          selectedSlotId: null,
          optionIds: benchOptionsFor({
            picks: state.picks,
            benchPicks: [],
            draftSeed: state.draftSeed,
            rejectedIdentityIds: state.rejectedIdentityIds,
            contextKey: `${state.eraId}:${state.managerId}:${state.formationId}:bench:${state.playerRespinsRemaining}`,
            respinIndex: state.playerRespinIndex,
          }),
        });
      },
      assignBenchPlayer: (slotId) => {
        const state = get();
        if (
          state.draftPhase !== "bench" ||
          !state.pendingBenchCardId ||
          state.benchPicks.some((pick) => pick.slotId === slotId) ||
          !benchSlotOrder.includes(slotId)
        ) {
          return;
        }
        const benchPicks = [
          ...state.benchPicks,
          { slotId, cardId: state.pendingBenchCardId },
        ];
        set({
          benchPicks,
          pendingBenchCardId: null,
          optionIds:
            benchPicks.length === 3
              ? []
              : benchOptionsFor({
                  picks: state.picks,
                  benchPicks,
                  draftSeed: state.draftSeed,
                  rejectedIdentityIds: state.rejectedIdentityIds,
                  contextKey: `${state.eraId}:${state.managerId}:${state.formationId}:bench:${state.playerRespinsRemaining}`,
                  respinIndex: state.playerRespinIndex,
                }),
          draftPhase: benchPicks.length === 3 ? "review" : "bench",
        });
      },
      cancelBenchAssignment: () => set({ pendingBenchCardId: null }),
      moveBenchPlayer: (slotId, direction) => {
        const state = get();
        if (state.draftPhase !== "review") return;
        const from = benchSlotOrder.indexOf(slotId);
        const to = from + direction;
        if (from < 0 || to < 0 || to >= benchSlotOrder.length) return;
        const first = state.benchPicks.find(
          (pick) => pick.slotId === benchSlotOrder[from],
        );
        const second = state.benchPicks.find(
          (pick) => pick.slotId === benchSlotOrder[to],
        );
        if (!first || !second) return;
        set({
          benchPicks: state.benchPicks.map((pick) =>
            pick.cardId === first.cardId
              ? { ...pick, slotId: benchSlotOrder[to] }
              : pick.cardId === second.cardId
                ? { ...pick, slotId: benchSlotOrder[from] }
                : pick,
          ),
        });
      },
      finalizeBench: () => {
        if (get().benchPicks.length === 3) set({ draftPhase: "opponent" });
      },
      setOpponentFilters: (filters) =>
        set((state) => ({
          opponentFilters: { ...state.opponentFilters, ...filters },
        })),
      selectOpponent: (selectedOpponentId) => {
        if (
          get().picks.length !== 11 ||
          get().benchPicks.length !== 3 ||
          get().draftPhase !== "opponent"
        ) {
          return;
        }
        const opponent = historicalOpponentsById.get(selectedOpponentId);
        if (!opponent) return;
        const draftedIdentities = new Set(
          [...get().picks, ...get().benchPicks]
            .map((pick) => playersById.get(pick.cardId)?.playerIdentityId)
            .filter((id): id is string => Boolean(id)),
        );
        const opponentIdentities = [
          ...opponent.startingLineup,
          ...opponent.substitutes,
        ].map((player) => player.playerIdentityId);
        if (opponentIdentities.some((id) => draftedIdentities.has(id))) return;
        set({ selectedOpponentId, matchResult: null });
      },
      resetDraft: () => {
        const state = get();
        if (!state.formationId) return;
        set({
          draftSeed: createDraftSeed(),
          picks: [],
          benchPicks: [],
          draftPhase: "starters",
          selectedSlotId: null,
          pendingBenchCardId: null,
          optionIds: [],
          rejectedIdentityIds: [],
          playerRespinsRemaining: 2,
          playerRespinIndex: 0,
          selectedOpponentId: null,
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
          !state.selectedOpponentId ||
          state.picks.length !== 11 ||
          state.benchPicks.length !== 3
        ) {
          throw new Error(
            "Complete the environment, manager, formation, squad, and opponent first",
          );
        }
        const formation = getFormation(state.formationId);
        const validation = validateDraftPicks({
          picks: state.picks,
          formation,
          cards: players,
          excludedIdentityIds: [],
        });
        if (validation.issues.length || validation.valid.length !== 11) {
          throw new Error("The saved XI failed identity or positional validation");
        }
        const lineup = formation.slots.map((slot) => {
          const pick = state.picks.find((candidate) => candidate.slotId === slot.id)!;
          return playersById.get(pick.cardId)!;
        });
        const bench = benchSlotOrder.map((slotId) => {
          const pick = state.benchPicks.find(
            (candidate) => candidate.slotId === slotId,
          )!;
          return playersById.get(pick.cardId)!;
        });
        const allIdentityIds = [
          ...lineup.map((player) => player.playerIdentityId),
          ...bench.map((player) => player.playerIdentityId),
        ];
        if (new Set(allIdentityIds).size !== 14) {
          throw new Error("The saved squad contains a duplicate player identity");
        }
        const manager = managersById.get(state.managerId);
        const opponent = historicalOpponentsById.get(state.selectedOpponentId);
        if (!manager || !opponent) throw new Error("Match context is unavailable");
        const opponentIdentities = new Set(
          [...opponent.startingLineup, ...opponent.substitutes].map(
            (player) => player.playerIdentityId,
          ),
        );
        if (allIdentityIds.some((id) => opponentIdentities.has(id))) {
          throw new Error("The saved squad conflicts with the opponent lineup");
        }
        const simulationNonce = state.simulationNonce + 1;
        const seed = hashString(
          `${state.draftSeed}:${state.picks
            .map((pick) => `${pick.slotId}:${pick.cardId}`)
            .join("|")}:${state.benchPicks
            .map((pick) => `${pick.slotId}:${pick.cardId}`)
            .join("|")}:${opponent.id}:${state.managerId}:${simulationNonce}`,
        );
        const matchResult = simulateMatch({
          lineup,
          bench,
          picks: state.picks,
          formation,
          manager,
          eraId: state.eraId,
          opponent,
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
        const manager = state.managerId ? managersById.get(state.managerId) : null;
        if (state.managerId && !manager) {
          set({
            managerId: null,
            managerOptionIds: managerOptionsFor(state.eraId, state.draftSeed),
            formationOptionIds: [],
            formationId: null,
            picks: [],
            benchPicks: [],
            draftPhase: "starters",
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
          cards: players,
          excludedIdentityIds: [],
        });
        const starterIdentities = new Set(
          repaired.valid
            .map((pick) => playersById.get(pick.cardId)?.playerIdentityId)
            .filter((id): id is string => Boolean(id)),
        );
        const benchIdentities = new Set<string>();
        const repairedBench = (Array.isArray(state.benchPicks)
          ? state.benchPicks
          : []
        ).filter((pick) => {
          const card = playersById.get(pick.cardId);
          if (
            !card ||
            !benchSlotOrder.includes(pick.slotId) ||
            starterIdentities.has(card.playerIdentityId) ||
            benchIdentities.has(card.playerIdentityId)
          ) {
            return false;
          }
          benchIdentities.add(card.playerIdentityId);
          return true;
        });
        if (
          repaired.issues.length ||
          repaired.valid.length !== state.picks.length ||
          repairedBench.length !== state.benchPicks.length
        ) {
          set({
            picks: repaired.valid,
            benchPicks: repairedBench,
            draftPhase: repaired.valid.length === 11 ? "bench" : "starters",
            selectedSlotId: null,
            pendingBenchCardId: null,
            optionIds: [],
            selectedOpponentId: null,
            matchResult: null,
            saveNotice:
              "We repaired an older or invalid saved squad. Duplicate, missing, opponent, or out-of-position entries were removed.",
          });
        } else if (
          state.selectedOpponentId &&
          !historicalOpponentsById.has(state.selectedOpponentId)
        ) {
          set({
            selectedOpponentId: null,
            matchResult: null,
            saveNotice:
              "The archived historical opponent was unavailable and has been cleared.",
          });
        }
      },
    }),
    {
      name: "trophy-xi-game-v1",
      version: SAVE_VERSION,
      storage: createJSONStorage(() => browserStorage),
      skipHydration: true,
      migrate: (persisted) => {
        const previous = (persisted ?? {}) as Partial<GameStore> & {
          eraId?: unknown;
          respinUsed?: boolean;
          respinStage?: "manager" | "player" | null;
        };
        const eraId = migratedEra(previous.eraId);
        const managerId =
          previous.managerId && managersById.has(previous.managerId)
            ? previous.managerId
            : null;
        const draftSeed = previous.draftSeed ?? 2026;
        return {
          ...cleanState,
          ...previous,
          eraId,
          managerId,
          draftSeed,
          managerOptionIds:
            eraId && !managerId
              ? managerOptionsFor(eraId, draftSeed)
              : previous.managerOptionIds ?? [],
          formationOptionIds:
            eraId && managerId
              ? formationOptionsFor(managerId, eraId, draftSeed)
              : [],
          playerRespinsRemaining:
            previous.respinUsed && previous.respinStage === "player" ? 1 : 2,
          playerRespinIndex:
            previous.respinUsed && previous.respinStage === "player" ? 1 : 0,
          benchPicks: previous.benchPicks ?? [],
          opponentFilters: {
            ...defaultOpponentFilters,
            ...(previous.opponentFilters ?? {}),
          },
          selectedOpponentId:
            previous.selectedOpponentId &&
            historicalOpponents.some(
              (opponent) => opponent.id === previous.selectedOpponentId,
            )
              ? previous.selectedOpponentId
              : null,
          saveNotice:
            "Trophy XI upgraded your save for match environments, a three-player bench, and two player respins.",
        };
      },
      partialize: (state) => ({
        eraId: state.eraId,
        managerId: state.managerId,
        managerOptionIds: state.managerOptionIds,
        formationOptionIds: state.formationOptionIds,
        formationId: state.formationId,
        draftSeed: state.draftSeed,
        picks: state.picks,
        benchPicks: state.benchPicks,
        draftPhase: state.draftPhase,
        selectedSlotId: state.selectedSlotId,
        pendingBenchCardId: state.pendingBenchCardId,
        optionIds: state.optionIds,
        rejectedIdentityIds: state.rejectedIdentityIds,
        playerRespinsRemaining: state.playerRespinsRemaining,
        playerRespinIndex: state.playerRespinIndex,
        opponentFilters: state.opponentFilters,
        selectedOpponentId: state.selectedOpponentId,
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
