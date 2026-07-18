"use client";

import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { calculateEraFit } from "@/data/eras";
import { getFormation } from "@/data/formations";
import { managers, managersById } from "@/data/managers";
import { historicalOpponentsById } from "@/data/opponents";
import { players, playersById } from "@/data/players";
import {
  canPlacePlayer,
  createDraftSeed,
  generateBenchOptions,
  generateDraftOptions,
  generateFormationOffer,
  generateFormationRespin,
  generateManagerOptions,
  getPositionFitPreview,
  hasDraftCompletionPath,
  validateDraftPicks,
} from "@/engine/draft";
import { hashString } from "@/engine/random";
import { calculateTeamRatings } from "@/engine/ratings";
import { simulateMatch } from "@/engine/simulation";
import type {
  BenchPick,
  BenchSlotId,
  DraftEraId,
  DraftPick,
  FormationId,
  MatchResult,
  PlacementFeedback,
  PlayerTournamentCard,
  PositionFitPreview,
} from "@/types/game";

const SAVE_VERSION = 5;

export type OpponentFilters = {
  query: string;
  year: number | null;
  nation: string;
  finish: string;
  confederation: string;
  difficulty: string;
  dataStatus: string;
  championOnly: boolean;
};

export const defaultOpponentFilters: OpponentFilters = {
  query: "",
  year: null,
  nation: "",
  finish: "",
  confederation: "",
  difficulty: "",
  dataStatus: "",
  championOnly: true,
};

type DraftPhase = "starters" | "bench" | "review" | "opponent";

type GameStore = {
  hasHydrated: boolean;
  saveNotice: string | null;
  eraId: DraftEraId | null;
  managerId: string | null;
  managerOptionIds: string[];
  originalFormationOptionIds: FormationId[];
  formationOptionIds: FormationId[];
  formationRespinRemaining: number;
  formationRespinIndex: number;
  formationId: FormationId | null;
  draftSeed: number;
  picks: DraftPick[];
  benchPicks: BenchPick[];
  draftPhase: DraftPhase;
  selectedPlayerId: string | null;
  selectedSlotId: string | null;
  pendingBenchCardId: string | null;
  optionIds: string[];
  projectedPositionFits: PositionFitPreview[];
  draftFeasible: boolean;
  lastPlacementFeedback: PlacementFeedback | null;
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
  respinFormations: () => void;
  selectFormation: (id: FormationId) => void;
  selectPlayer: (cardId: string) => void;
  placeSelectedPlayer: (slotId: string) => void;
  cancelPlayerSelection: () => void;
  selectSlot: (slotId: string) => void;
  cancelSlot: () => void;
  respinPlayers: () => void;
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
  draftSeed,
  rejectedIdentityIds,
  contextKey,
  respinIndex = 0,
}: {
  formationId: FormationId;
  picks: DraftPick[];
  draftSeed: number;
  rejectedIdentityIds: string[];
  contextKey: string;
  respinIndex?: number;
}) =>
  generateDraftOptions(
    players,
    getFormation(formationId),
    picks,
    draftSeed ^ hashString(contextKey),
    picks.length,
    {
      rejectedIdentityIds,
      respinIndex,
    },
  ).map((card) => card.id);

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

const previewsFor = ({
  formationId,
  picks,
  player,
  rejectedIdentityIds,
}: {
  formationId: FormationId;
  picks: DraftPick[];
  player: PlayerTournamentCard;
  rejectedIdentityIds: string[];
}) => {
  const formation = getFormation(formationId);
  const filled = new Set(picks.map((pick) => pick.slotId));
  return formation.slots
    .filter((slot) => !filled.has(slot.id))
    .map((slot) =>
      getPositionFitPreview(
        player,
        slot,
        canPlacePlayer({
          cards: players,
          formation,
          picks,
          player,
          slot,
          excludedIdentityIds: rejectedIdentityIds,
        }),
      ),
    );
};

const lineupFor = (picks: DraftPick[]) =>
  picks
    .map((pick) => playersById.get(pick.cardId))
    .filter((player): player is PlayerTournamentCard => Boolean(player));

const cleanState = {
  eraId: null,
  managerId: null,
  managerOptionIds: [] as string[],
  originalFormationOptionIds: [] as FormationId[],
  formationOptionIds: [] as FormationId[],
  formationRespinRemaining: 1,
  formationRespinIndex: 0,
  formationId: null,
  draftSeed: 2026,
  picks: [] as DraftPick[],
  benchPicks: [] as BenchPick[],
  draftPhase: "starters" as DraftPhase,
  selectedPlayerId: null,
  selectedSlotId: null,
  pendingBenchCardId: null,
  optionIds: [] as string[],
  projectedPositionFits: [] as PositionFitPreview[],
  draftFeasible: true,
  lastPlacementFeedback: null as PlacementFeedback | null,
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
        const formationOptionIds = formationOptionsFor(
          managerId,
          state.eraId,
          state.draftSeed,
        );
        set({
          managerId,
          originalFormationOptionIds: formationOptionIds,
          formationOptionIds,
          formationRespinRemaining: 1,
          formationRespinIndex: 0,
          formationId: null,
          picks: [],
          benchPicks: [],
          draftPhase: "starters",
          selectedPlayerId: null,
          selectedSlotId: null,
          pendingBenchCardId: null,
          optionIds: [],
          projectedPositionFits: [],
          draftFeasible: true,
          lastPlacementFeedback: null,
          selectedOpponentId: null,
          matchResult: null,
        });
      },
      respinManagers: () => undefined,
      respinFormations: () => {
        const state = get();
        const manager = state.managerId
          ? managersById.get(state.managerId)
          : undefined;
        if (
          !manager ||
          !state.eraId ||
          state.formationId ||
          state.formationRespinRemaining !== 1 ||
          state.formationOptionIds.length !== 4
        ) {
          return;
        }
        set({
          formationOptionIds: generateFormationRespin(
            manager,
            state.eraId,
            state.draftSeed,
            state.originalFormationOptionIds,
          ),
          formationRespinRemaining: 0,
          formationRespinIndex: 1,
        });
      },
      selectFormation: (formationId) => {
        const state = get();
        if (
          !state.eraId ||
          !state.managerId ||
          !state.formationOptionIds.includes(formationId)
        ) {
          return;
        }
        const optionIds = playerOptionsFor({
          formationId,
          picks: [],
          draftSeed: state.draftSeed,
          rejectedIdentityIds: [],
          contextKey: `${state.eraId}:${state.managerId}:${formationId}:2`,
        });
        set({
          formationId,
          picks: [],
          benchPicks: [],
          draftPhase: "starters",
          selectedPlayerId: null,
          selectedSlotId: null,
          pendingBenchCardId: null,
          optionIds,
          projectedPositionFits: [],
          draftFeasible: true,
          lastPlacementFeedback: null,
          rejectedIdentityIds: [],
          playerRespinsRemaining: 2,
          playerRespinIndex: 0,
          selectedOpponentId: null,
          simulationNonce: 0,
          matchResult: null,
        });
      },
      selectPlayer: (cardId) => {
        const state = get();
        if (!state.optionIds.includes(cardId)) return;
        const selectedPlayer = playersById.get(cardId);
        if (!selectedPlayer) return;
        const usedIdentities = usedIdentityIdsForState(state);
        if (usedIdentities.has(selectedPlayer.playerIdentityId)) return;
        if (state.draftPhase === "bench") {
          set({
            pendingBenchCardId:
              state.pendingBenchCardId === cardId ? null : cardId,
          });
          return;
        }
        if (state.draftPhase !== "starters" || !state.formationId) return;
        if (state.selectedPlayerId === cardId) {
          set({
            selectedPlayerId: null,
            selectedSlotId: null,
            projectedPositionFits: [],
          });
          return;
        }
        const projectedPositionFits = previewsFor({
          formationId: state.formationId,
          picks: state.picks,
          player: selectedPlayer,
          rejectedIdentityIds: state.rejectedIdentityIds,
        });
        set({
          selectedPlayerId: cardId,
          selectedSlotId: null,
          projectedPositionFits,
          draftFeasible: projectedPositionFits.some(
            (preview) => preview.canPlace,
          ),
        });
      },
      placeSelectedPlayer: (slotId) => {
        const state = get();
        if (
          state.draftPhase !== "starters" ||
          !state.formationId ||
          !state.selectedPlayerId ||
          !state.eraId ||
          !state.managerId
        ) {
          return;
        }
        const preview = state.projectedPositionFits.find(
          (candidate) => candidate.slotId === slotId,
        );
        const player = playersById.get(state.selectedPlayerId);
        const manager = managersById.get(state.managerId);
        const formation = getFormation(state.formationId);
        const slot = formation.slots.find((candidate) => candidate.id === slotId);
        if (!preview?.canPlace || !player || !manager || !slot) return;

        const currentRatings = calculateTeamRatings(
          lineupFor(state.picks),
          formation,
          {
            picks: state.picks,
            manager,
            eraId: state.eraId,
          },
        );
        const picks = [
          ...state.picks,
          { slotId, cardId: state.selectedPlayerId },
        ];
        const projectedRatings = calculateTeamRatings(
          lineupFor(picks),
          formation,
          {
            picks,
            manager,
            eraId: state.eraId,
          },
        );
        const lastPlacementFeedback: PlacementFeedback = {
          cardId: player.id,
          slotId,
          slotLabel: slot.label,
          fit: preview.fit,
          penaltyPercent: preview.penaltyPercent,
          eraFit: calculateEraFit(player, state.eraId, {
            manager,
            formation,
          }),
          managerFit: projectedRatings.managerFit,
          chemistryChange:
            projectedRatings.chemistry - currentRatings.chemistry,
          overallChange: projectedRatings.overall - currentRatings.overall,
        };
        const complete = picks.length === formation.slots.length;
        const optionIds = complete
          ? []
          : playerOptionsFor({
              formationId: state.formationId,
              picks,
              draftSeed: state.draftSeed,
              rejectedIdentityIds: state.rejectedIdentityIds,
              contextKey: `${state.eraId}:${state.managerId}:${state.formationId}:${state.playerRespinsRemaining}`,
              respinIndex: state.playerRespinIndex,
            });
        set({
          picks,
          selectedPlayerId: null,
          selectedSlotId: null,
          projectedPositionFits: [],
          optionIds,
          draftFeasible: hasDraftCompletionPath({
            cards: players,
            formation,
            picks,
            excludedIdentityIds: state.rejectedIdentityIds,
          }),
          lastPlacementFeedback,
          matchResult: null,
        });
      },
      cancelPlayerSelection: () =>
        set({
          selectedPlayerId: null,
          selectedSlotId: null,
          projectedPositionFits: [],
        }),
      // Compatibility aliases now obey the player-first state machine.
      selectSlot: (slotId) => get().placeSelectedPlayer(slotId),
      cancelSlot: () => get().cancelPlayerSelection(),
      respinPlayers: () => {
        const state = get();
        if (
          state.playerRespinsRemaining <= 0 ||
          state.optionIds.length !== 5 ||
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
          state.draftPhase === "starters" && state.formationId
            ? playerOptionsFor({
                formationId: state.formationId,
                picks: state.picks,
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
          selectedPlayerId: null,
          selectedSlotId: null,
          pendingBenchCardId: null,
          projectedPositionFits: [],
        });
      },
      startBenchDraft: () => {
        const state = get();
        if (state.picks.length !== 11 || state.draftPhase !== "starters") return;
        set({
          draftPhase: "bench",
          selectedPlayerId: null,
          selectedSlotId: null,
          projectedPositionFits: [],
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
        const state = get();
        if (
          state.picks.length !== 11 ||
          state.benchPicks.length !== 3 ||
          state.draftPhase !== "opponent"
        ) {
          return;
        }
        const opponent = historicalOpponentsById.get(selectedOpponentId);
        if (!opponent) return;
        const draftedIdentities = usedIdentityIdsForState(state);
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
        const draftSeed = createDraftSeed();
        set({
          draftSeed,
          picks: [],
          benchPicks: [],
          draftPhase: "starters",
          selectedPlayerId: null,
          selectedSlotId: null,
          pendingBenchCardId: null,
          optionIds: playerOptionsFor({
            formationId: state.formationId,
            picks: [],
            draftSeed,
            rejectedIdentityIds: [],
            contextKey: `${state.eraId}:${state.managerId}:${state.formationId}:2`,
          }),
          projectedPositionFits: [],
          draftFeasible: true,
          lastPlacementFeedback: null,
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
        });
        if (validation.issues.length || validation.valid.length !== 11) {
          throw new Error("The saved XI failed identity or positional validation");
        }
        const lineup = formation.slots.map((slot) => {
          const pick = state.picks.find(
            (candidate) => candidate.slotId === slot.id,
          )!;
          return playersById.get(pick.cardId)!;
        });
        const bench = benchSlotOrder.map((slotId) => {
          const pick = state.benchPicks.find(
            (candidate) => candidate.slotId === slotId,
          )!;
          return playersById.get(pick.cardId)!;
        });
        const allIdentityIds = [...lineup, ...bench].map(
          (player) => player.playerIdentityId,
        );
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
        const manager = state.managerId
          ? managersById.get(state.managerId)
          : undefined;
        if (state.managerId && !manager) {
          set({
            ...cleanState,
            eraId: state.eraId,
            draftSeed: state.draftSeed,
            managerOptionIds: managerOptionsFor(state.eraId, state.draftSeed),
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
        });
        const starterIdentities = usedIdentityIdsForState({
          picks: repaired.valid,
          benchPicks: [],
        });
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
        const feasible = hasDraftCompletionPath({
          cards: players,
          formation,
          picks: repaired.valid,
          excludedIdentityIds: state.rejectedIdentityIds,
        });
        const invalid =
          repaired.issues.length > 0 ||
          repaired.valid.length !== state.picks.length ||
          repairedBench.length !== state.benchPicks.length ||
          !feasible;
        if (invalid) {
          const safePicks = feasible ? repaired.valid : [];
          set({
            picks: safePicks,
            benchPicks: feasible ? repairedBench : [],
            draftPhase:
              safePicks.length === 11
                ? repairedBench.length === 3
                  ? "review"
                  : "bench"
                : "starters",
            selectedPlayerId: null,
            selectedSlotId: null,
            pendingBenchCardId: null,
            projectedPositionFits: [],
            optionIds:
              safePicks.length < 11
                ? playerOptionsFor({
                    formationId: state.formationId,
                    picks: safePicks,
                    draftSeed: state.draftSeed,
                    rejectedIdentityIds: state.rejectedIdentityIds,
                    contextKey: `${state.eraId}:${state.managerId}:${state.formationId}:${state.playerRespinsRemaining}`,
                    respinIndex: state.playerRespinIndex,
                  })
                : [],
            selectedOpponentId: null,
            matchResult: null,
            draftFeasible: true,
            saveNotice:
              "We repaired an older or invalid save. Duplicate, missing, incompatible, or infeasible entries were removed.",
          });
          return;
        }
        const opponent = state.selectedOpponentId
          ? historicalOpponentsById.get(state.selectedOpponentId)
          : undefined;
        const squadIdentities = usedIdentityIdsForState(state);
        const opponentConflict = opponent
          ? [...opponent.startingLineup, ...opponent.substitutes].some((player) =>
              squadIdentities.has(player.playerIdentityId),
            )
          : false;
        if (
          state.selectedOpponentId &&
          (!opponent || opponentConflict)
        ) {
          set({
            selectedOpponentId: null,
            matchResult: null,
            saveNotice:
              "The saved opponent was unavailable or shared a player identity with your squad and has been cleared.",
          });
          return;
        }
        const expectedOptionCount =
          state.draftPhase === "starters" || state.draftPhase === "bench"
            ? 5
            : 0;
        if (state.optionIds.length !== expectedOptionCount) {
          set({
            selectedPlayerId: null,
            selectedSlotId: null,
            pendingBenchCardId: null,
            projectedPositionFits: [],
            optionIds:
              state.draftPhase === "starters" && state.picks.length < 11
                ? playerOptionsFor({
                    formationId: state.formationId,
                    picks: state.picks,
                    draftSeed: state.draftSeed,
                    rejectedIdentityIds: state.rejectedIdentityIds,
                    contextKey: `${state.eraId}:${state.managerId}:${state.formationId}:${state.playerRespinsRemaining}`,
                    respinIndex: state.playerRespinIndex,
                  })
                : state.draftPhase === "bench"
                  ? benchOptionsFor({
                      picks: state.picks,
                      benchPicks: state.benchPicks,
                      draftSeed: state.draftSeed,
                      rejectedIdentityIds: state.rejectedIdentityIds,
                      contextKey: `${state.eraId}:${state.managerId}:${state.formationId}:bench:${state.playerRespinsRemaining}`,
                      respinIndex: state.playerRespinIndex,
                    })
                  : [],
            saveNotice:
              "Trophy XI upgraded this draft to five-card, player-first placement.",
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
        const originalFormationOptionIds =
          previous.originalFormationOptionIds?.length === 4
            ? previous.originalFormationOptionIds
            : eraId && managerId
              ? formationOptionsFor(managerId, eraId, draftSeed)
              : [];
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
          originalFormationOptionIds,
          formationOptionIds:
            previous.formationOptionIds?.length === 4
              ? previous.formationOptionIds
              : originalFormationOptionIds,
          formationRespinRemaining:
            previous.formationRespinRemaining === 0 ? 0 : 1,
          formationRespinIndex: previous.formationRespinIndex ?? 0,
          selectedPlayerId: null,
          selectedSlotId: null,
          projectedPositionFits: [],
          optionIds: [],
          playerRespinsRemaining:
            previous.playerRespinsRemaining ??
            (previous.respinUsed && previous.respinStage === "player" ? 1 : 2),
          playerRespinIndex:
            previous.playerRespinIndex ??
            (previous.respinUsed && previous.respinStage === "player" ? 1 : 0),
          benchPicks: previous.benchPicks ?? [],
          opponentFilters: {
            ...defaultOpponentFilters,
            ...(previous.opponentFilters ?? {}),
          },
          selectedOpponentId:
            previous.selectedOpponentId &&
            historicalOpponentsById.has(previous.selectedOpponentId)
              ? previous.selectedOpponentId
              : null,
          matchResult:
            previous.matchResult &&
            Array.isArray(previous.matchResult.opponentSubstitutions)
              ? previous.matchResult
              : null,
          saveNotice:
            "Trophy XI upgraded your save to player-first five-card drafting, one formation respin, and the expanded opponent archive.",
        };
      },
      partialize: (state) => ({
        eraId: state.eraId,
        managerId: state.managerId,
        managerOptionIds: state.managerOptionIds,
        originalFormationOptionIds: state.originalFormationOptionIds,
        formationOptionIds: state.formationOptionIds,
        formationRespinRemaining: state.formationRespinRemaining,
        formationRespinIndex: state.formationRespinIndex,
        formationId: state.formationId,
        draftSeed: state.draftSeed,
        picks: state.picks,
        benchPicks: state.benchPicks,
        draftPhase: state.draftPhase,
        selectedPlayerId: state.selectedPlayerId,
        selectedSlotId: state.selectedSlotId,
        pendingBenchCardId: state.pendingBenchCardId,
        optionIds: state.optionIds,
        projectedPositionFits: state.projectedPositionFits,
        draftFeasible: state.draftFeasible,
        lastPlacementFeedback: state.lastPlacementFeedback,
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

const usedIdentityIdsForState = (
  state: Pick<GameStore, "picks" | "benchPicks">,
) =>
  new Set(
    [...state.picks, ...state.benchPicks]
      .map((pick) => playersById.get(pick.cardId)?.playerIdentityId)
      .filter((id): id is string => Boolean(id)),
  );
