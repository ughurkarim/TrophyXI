"use client";

import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { calculateEraFit } from "@/data/eras";
import { formations, getFormation } from "@/data/formations";
import {
  canonicalManagerIdFor,
  draftEligibleManagers,
  managersById,
} from "@/data/managers";
import { historicalOpponentsById } from "@/data/opponents";
import { draftEligiblePlayers, players, playersById } from "@/data/players";
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
import { resolveWorldCupAllStars } from "@/engine/all-stars";
import { generateFreeSelectionSquad } from "@/engine/free-selection";
import { hashString } from "@/engine/random";
import { calculateTeamRatings } from "@/engine/ratings";
import { simulateMatch } from "@/engine/simulation";
import {
  createWorldCupRun,
  enterWorldCupRunKnockouts,
  getPendingWorldCupRunUserFixture,
  recordWorldCupRunUserResult,
  resolvePendingWorldCupRunCpuFixtures,
  simulateNextWorldCupRunUserFixture,
  simulateRemainingWorldCupRunGroup,
  simulateRemainingWorldCupRunRound,
  type WorldCupRunState,
} from "@/engine/world-cup-run";
import {
  createWorldCupRunOpponentField,
  isActiveWorldCupRunOpponent,
  isWorldCupRunFinalBoss,
  WORLD_CUP_RUN_OPPONENT_COUNT,
} from "@/engine/world-cup-run-opponents";
import type {
  BenchPick,
  BenchSlotId,
  DraftEraId,
  DraftPick,
  FormationId,
  GameMode,
  HistoricalWorldCupTeam,
  MatchResult,
  PlacementFeedback,
  PlayerTournamentCard,
  PositionFitPreview,
} from "@/types/game";

const SAVE_VERSION = 15;
const WORLD_CUP_RUN_MODEL_SAVE_VERSION = 13;

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
  gameMode: GameMode | null;
  eraId: DraftEraId | null;
  managerId: string | null;
  managerLocked: boolean;
  originalManagerOptionIds: string[];
  managerOptionIds: string[];
  managerRespinRemaining: number;
  managerRespinIndex: number;
  seenManagerIdentityCounts: Record<string, number>;
  recentManagerIdentityIds: string[];
  seenManagerCardCounts: Record<string, number>;
  recentManagerCardIds: string[];
  originalFormationOptionIds: FormationId[];
  formationOptionIds: FormationId[];
  formationRespinRemaining: number;
  formationRespinIndex: number;
  seenFormationCounts: Record<string, number>;
  recentFormationIds: FormationId[];
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
  seenIdentityCounts: Record<string, number>;
  recentIdentityIds: string[];
  seenCardCounts: Record<string, number>;
  recentCardIds: string[];
  playerRespinsRemaining: number;
  playerRespinIndex: number;
  opponentFilters: OpponentFilters;
  selectedOpponentId: string | null;
  simulationNonce: number;
  matchResult: MatchResult | null;
  worldCupRun: WorldCupRunState | null;
  worldCupRunOpponents: HistoricalWorldCupTeam[];
  setHasHydrated: (value: boolean) => void;
  dismissNotice: () => void;
  selectGameMode: (mode: GameMode) => void;
  selectEra: (id: DraftEraId) => void;
  selectManager: (id: string) => void;
  lockManager: () => void;
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
  assignFreeBenchPlayer: (cardId: string, slotId: BenchSlotId) => void;
  removeFreePlayer: (cardId: string) => void;
  randomizeFreeSquad: () => void;
  finalizeFreeSelection: () => void;
  editFreeSelection: () => void;
  finalizeBench: () => void;
  startWorldCupRun: () => void;
  restartWorldCupRun: () => void;
  continueWorldCupRun: () => void;
  simulateWorldCupRunMatch: () => void;
  simulateWorldCupRunGroup: () => void;
  simulateWorldCupRunRound: () => void;
  enterWorldCupRunKnockouts: () => void;
  setOpponentFilters: (filters: Partial<OpponentFilters>) => void;
  selectOpponent: (id: string) => void;
  resetDraft: () => void;
  restartFromManager: () => void;
  simulate: () => MatchResult;
  prepareRematch: () => void;
  clearGame: () => void;
  repairHydratedState: () => void;
};

const browserStorage: StateStorage = {
  getItem: (name) => {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(name);
    } catch {
      // Safari can deny storage access even when localStorage exists. In that
      // case the game remains fully usable with its in-memory state.
      return null;
    }
  },
  setItem: (name, value) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(name, value);
    } catch {
      // A failed save must not interrupt navigation or gameplay.
    }
  },
  removeItem: (name) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(name);
    } catch {
      // Clearing an unavailable store is already effectively complete.
    }
  },
};

type ManagerExposureHistory = Pick<
  GameStore,
  | "seenManagerIdentityCounts"
  | "recentManagerIdentityIds"
  | "seenManagerCardCounts"
  | "recentManagerCardIds"
>;

type FormationExposureHistory = Pick<
  GameStore,
  "seenFormationCounts" | "recentFormationIds"
>;

const managerOptionsFor = (
  eraId: DraftEraId,
  seed: number,
  excluded: Iterable<string> = [],
  respinIndex = 0,
  history: Partial<ManagerExposureHistory> = {},
) =>
  generateManagerOptions(
    draftEligibleManagers,
    eraId,
    seed,
    excluded,
    respinIndex,
    {
      seenIdentityCounts: history.seenManagerIdentityCounts,
      recentIdentityIds: history.recentManagerIdentityIds,
      seenCardCounts: history.seenManagerCardCounts,
      recentCardIds: history.recentManagerCardIds,
    },
  ).map((manager) => manager.id);

const formationOptionsFor = (
  managerId: string,
  eraId: DraftEraId,
  seed: number,
  history: Partial<FormationExposureHistory> = {},
) => {
  const manager = managersById.get(managerId);
  return manager
    ? generateFormationOffer(manager, eraId, seed, 4, {
        seenFormationCounts: history.seenFormationCounts,
        recentFormationIds: history.recentFormationIds,
      })
    : [];
};

const playerOptionsFor = ({
  formationId,
  picks,
  draftSeed,
  rejectedIdentityIds,
  seenIdentityCounts,
  recentIdentityIds,
  seenCardCounts,
  recentCardIds,
  contextKey,
  respinIndex = 0,
}: {
  formationId: FormationId;
  picks: DraftPick[];
  draftSeed: number;
  rejectedIdentityIds: string[];
  seenIdentityCounts: Record<string, number>;
  recentIdentityIds: string[];
  seenCardCounts: Record<string, number>;
  recentCardIds: string[];
  contextKey: string;
  respinIndex?: number;
}) =>
  generateDraftOptions(
    draftEligiblePlayers,
    getFormation(formationId),
    picks,
    draftSeed ^ hashString(contextKey),
    picks.length,
    {
      rejectedIdentityIds,
      seenIdentityCounts,
      recentIdentityIds,
      seenCardCounts,
      recentCardIds,
      respinIndex,
    },
  ).map((card) => card.id);

const benchOptionsFor = ({
  picks,
  benchPicks,
  draftSeed,
  rejectedIdentityIds,
  seenIdentityCounts,
  recentIdentityIds,
  seenCardCounts,
  recentCardIds,
  contextKey,
  respinIndex,
}: {
  picks: DraftPick[];
  benchPicks: BenchPick[];
  draftSeed: number;
  rejectedIdentityIds: string[];
  seenIdentityCounts: Record<string, number>;
  recentIdentityIds: string[];
  seenCardCounts: Record<string, number>;
  recentCardIds: string[];
  contextKey: string;
  respinIndex: number;
}) =>
  generateBenchOptions(
    draftEligiblePlayers,
    picks,
    benchPicks,
    draftSeed ^ hashString(contextKey),
    benchPicks.length,
    {
      rejectedIdentityIds,
      seenIdentityCounts,
      recentIdentityIds,
      seenCardCounts,
      recentCardIds,
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

const recordOptionVisibility = (
  state: Pick<
    GameStore,
    "seenIdentityCounts" | "recentIdentityIds" | "seenCardCounts" | "recentCardIds"
  >,
  optionIds: string[],
) => {
  const identities = optionIds
    .map((id) => playersById.get(id)?.playerIdentityId)
    .filter((id): id is string => Boolean(id));
  const seenIdentityCounts = { ...(state.seenIdentityCounts ?? {}) };
  for (const identityId of new Set(identities)) {
    seenIdentityCounts[identityId] =
      (seenIdentityCounts[identityId] ?? 0) + 1;
  }
  const seenCardCounts = { ...(state.seenCardCounts ?? {}) };
  for (const cardId of new Set(optionIds)) {
    seenCardCounts[cardId] = (seenCardCounts[cardId] ?? 0) + 1;
  }
  const newestIdentitiesFirst = [
    ...(state.recentIdentityIds ?? []),
    ...identities,
  ].reverse();
  const recentIdentityIds = [...new Set(newestIdentitiesFirst)]
    .slice(0, 80)
    .reverse();
  const newestCardsFirst = [
    ...(state.recentCardIds ?? []),
    ...optionIds,
  ].reverse();
  const recentCardIds = [...new Set(newestCardsFirst)]
    .slice(0, 120)
    .reverse();
  return {
    seenIdentityCounts,
    recentIdentityIds,
    seenCardCounts,
    recentCardIds,
  };
};

const recordManagerVisibility = (
  state: ManagerExposureHistory,
  optionIds: string[],
) => {
  const identities = optionIds
    .map((id) => managersById.get(id)?.managerIdentityId)
    .filter((id): id is string => Boolean(id));
  const seenManagerIdentityCounts = {
    ...(state.seenManagerIdentityCounts ?? {}),
  };
  for (const identityId of new Set(identities)) {
    seenManagerIdentityCounts[identityId] =
      (seenManagerIdentityCounts[identityId] ?? 0) + 1;
  }
  const seenManagerCardCounts = { ...(state.seenManagerCardCounts ?? {}) };
  for (const cardId of new Set(optionIds)) {
    seenManagerCardCounts[cardId] =
      (seenManagerCardCounts[cardId] ?? 0) + 1;
  }
  const recentManagerIdentityIds = [
    ...new Set(
      [...(state.recentManagerIdentityIds ?? []), ...identities].reverse(),
    ),
  ]
    .slice(0, 40)
    .reverse();
  const recentManagerCardIds = [
    ...new Set(
      [...(state.recentManagerCardIds ?? []), ...optionIds].reverse(),
    ),
  ]
    .slice(0, 60)
    .reverse();
  return {
    seenManagerIdentityCounts,
    recentManagerIdentityIds,
    seenManagerCardCounts,
    recentManagerCardIds,
  };
};

const recordFormationVisibility = (
  state: FormationExposureHistory,
  formationIds: FormationId[],
) => {
  const seenFormationCounts = { ...(state.seenFormationCounts ?? {}) };
  for (const formationId of new Set(formationIds)) {
    seenFormationCounts[formationId] =
      (seenFormationCounts[formationId] ?? 0) + 1;
  }
  const recentFormationIds = [
    ...new Set(
      [...(state.recentFormationIds ?? []), ...formationIds].reverse(),
    ),
  ]
    .slice(0, 16)
    .reverse();
  return { seenFormationCounts, recentFormationIds };
};

const pendingOpponentIdForRun = (run: WorldCupRunState) => {
  const fixture = getPendingWorldCupRunUserFixture(run);
  if (!fixture) return null;
  return fixture.homeTeamId === run.userTeamId
    ? fixture.awayTeamId
    : fixture.homeTeamId;
};

const cleanState = {
  gameMode: null as GameMode | null,
  eraId: null,
  managerId: null,
  managerLocked: false,
  originalManagerOptionIds: [] as string[],
  managerOptionIds: [] as string[],
  managerRespinRemaining: 1,
  managerRespinIndex: 0,
  seenManagerIdentityCounts: {} as Record<string, number>,
  recentManagerIdentityIds: [] as string[],
  seenManagerCardCounts: {} as Record<string, number>,
  recentManagerCardIds: [] as string[],
  originalFormationOptionIds: [] as FormationId[],
  formationOptionIds: [] as FormationId[],
  formationRespinRemaining: 1,
  formationRespinIndex: 0,
  seenFormationCounts: {} as Record<string, number>,
  recentFormationIds: [] as FormationId[],
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
  seenIdentityCounts: {} as Record<string, number>,
  recentIdentityIds: [] as string[],
  seenCardCounts: {} as Record<string, number>,
  recentCardIds: [] as string[],
  playerRespinsRemaining: 2,
  playerRespinIndex: 0,
  opponentFilters: { ...defaultOpponentFilters },
  selectedOpponentId: null,
  simulationNonce: 0,
  matchResult: null,
  worldCupRun: null as WorldCupRunState | null,
  worldCupRunOpponents: [] as HistoricalWorldCupTeam[],
};

const decayExposureCounts = (counts: Record<string, number>) =>
  Object.fromEntries(
    Object.entries(counts)
      .map(([id, count]) => [id, Math.round(count * 850) / 1000] as const)
      .filter(([, count]) => count >= 0.1),
  );

const exposureHistoryFor = (
  state: Pick<
    GameStore,
    | "seenIdentityCounts"
    | "recentIdentityIds"
    | "seenCardCounts"
    | "recentCardIds"
    | "seenManagerIdentityCounts"
    | "recentManagerIdentityIds"
    | "seenManagerCardCounts"
    | "recentManagerCardIds"
    | "seenFormationCounts"
    | "recentFormationIds"
  >,
  decay = false,
) => ({
  seenIdentityCounts: decay
    ? decayExposureCounts(state.seenIdentityCounts ?? {})
    : { ...(state.seenIdentityCounts ?? {}) },
  recentIdentityIds: [...(state.recentIdentityIds ?? [])],
  seenCardCounts: decay
    ? decayExposureCounts(state.seenCardCounts ?? {})
    : { ...(state.seenCardCounts ?? {}) },
  recentCardIds: [...(state.recentCardIds ?? [])],
  seenManagerIdentityCounts: decay
    ? decayExposureCounts(state.seenManagerIdentityCounts ?? {})
    : { ...(state.seenManagerIdentityCounts ?? {}) },
  recentManagerIdentityIds: [...(state.recentManagerIdentityIds ?? [])],
  seenManagerCardCounts: decay
    ? decayExposureCounts(state.seenManagerCardCounts ?? {})
    : { ...(state.seenManagerCardCounts ?? {}) },
  recentManagerCardIds: [...(state.recentManagerCardIds ?? [])],
  seenFormationCounts: decay
    ? decayExposureCounts(state.seenFormationCounts ?? {})
    : { ...(state.seenFormationCounts ?? {}) },
  recentFormationIds: [...(state.recentFormationIds ?? [])],
});

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
      selectGameMode: (gameMode) => {
        const state = get();
        set({
          ...cleanState,
          gameMode,
          ...exposureHistoryFor(state),
          saveNotice: null,
        });
      },
      selectEra: (eraId) => {
        const state = get();
        const gameMode = state.gameMode ?? "classic-draft";
        const draftSeed = createDraftSeed();
        const history = exposureHistoryFor(state);
        const managerOptionIds =
          gameMode === "free-selection"
            ? draftEligibleManagers.map((manager) => manager.id)
            : managerOptionsFor(eraId, draftSeed, [], 0, history);
        const managerVisibility =
          gameMode === "free-selection"
            ? {}
            : recordManagerVisibility(history, managerOptionIds);
        set({
          ...cleanState,
          gameMode,
          eraId,
          draftSeed,
          originalManagerOptionIds: managerOptionIds,
          managerOptionIds,
          managerRespinRemaining: gameMode === "free-selection" ? 0 : 1,
          formationRespinRemaining: gameMode === "free-selection" ? 0 : 1,
          ...history,
          ...managerVisibility,
          saveNotice: null,
        });
      },
      selectManager: (managerId) => {
        const state = get();
        if (state.managerId === managerId) return;
        if (
          !state.eraId ||
          !state.managerOptionIds.includes(managerId) ||
          !managersById.has(managerId)
        ) {
          return;
        }
        const formationOptionIds =
          state.gameMode === "free-selection"
            ? formations.map((formation) => formation.id)
            : formationOptionsFor(
                managerId,
                state.eraId,
                state.draftSeed,
                state,
              );
        const formationVisibility =
          state.gameMode === "free-selection"
            ? {}
            : recordFormationVisibility(state, formationOptionIds);
        set({
          managerId,
          managerLocked: false,
          originalFormationOptionIds: formationOptionIds,
          formationOptionIds,
          ...formationVisibility,
          formationRespinRemaining:
            state.gameMode === "free-selection" ? 0 : 1,
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
      lockManager: () => {
        if (get().managerId) set({ managerLocked: false });
      },
      respinManagers: () => {
        const state = get();
        if (
          !state.eraId ||
          state.managerRespinRemaining !== 1 ||
          state.managerOptionIds.length !== 3
        ) {
          return;
        }
        const excludedIdentityIds = state.originalManagerOptionIds
          .map((id) => managersById.get(id)?.managerIdentityId)
          .filter((id): id is string => Boolean(id));
        const managerOptionIds = managerOptionsFor(
          state.eraId,
          state.draftSeed,
          excludedIdentityIds,
          1,
          state,
        );
        const managerVisibility = recordManagerVisibility(
          state,
          managerOptionIds,
        );
        set({
          managerOptionIds,
          ...managerVisibility,
          managerRespinRemaining: 0,
          managerRespinIndex: 1,
          managerId: null,
          managerLocked: false,
          originalFormationOptionIds: [],
          formationOptionIds: [],
          formationId: null,
          picks: [],
          benchPicks: [],
          optionIds: [],
          selectedPlayerId: null,
          selectedSlotId: null,
          projectedPositionFits: [],
          lastPlacementFeedback: null,
        });
      },
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
        const formationOptionIds = generateFormationRespin(
          manager,
          state.eraId,
          state.draftSeed,
          state.originalFormationOptionIds,
          {
            seenFormationCounts: state.seenFormationCounts,
            recentFormationIds: state.recentFormationIds,
          },
        );
        set({
          formationOptionIds,
          ...recordFormationVisibility(state, formationOptionIds),
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
        const history = exposureHistoryFor(state);
        const optionIds =
          state.gameMode === "free-selection"
            ? []
            : playerOptionsFor({
                formationId,
                picks: [],
                draftSeed: state.draftSeed,
                rejectedIdentityIds: [],
                ...history,
                contextKey: `${state.eraId}:${state.managerId}:${formationId}:2`,
              });
        const visibility = recordOptionVisibility(
          history,
          optionIds,
        );
        set({
          formationId,
          managerLocked: false,
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
          ...visibility,
          playerRespinsRemaining:
            state.gameMode === "free-selection" ? 0 : 2,
          playerRespinIndex: 0,
          selectedOpponentId: null,
          simulationNonce: 0,
          matchResult: null,
        });
      },
      selectPlayer: (cardId) => {
        const state = get();
        const freeSelection = state.gameMode === "free-selection";
        if (!freeSelection && !state.optionIds.includes(cardId)) return;
        const selectedPlayer = playersById.get(cardId);
        if (!selectedPlayer || !selectedPlayer.isDraftEligible) return;
        const usedIdentities = usedIdentityIdsForState(state);
        if (usedIdentities.has(selectedPlayer.playerIdentityId)) return;
        if (!freeSelection && state.draftPhase === "bench") {
          set({
            pendingBenchCardId:
              state.pendingBenchCardId === cardId ? null : cardId,
          });
          return;
        }
        if (
          (!freeSelection && state.draftPhase !== "starters") ||
          !state.formationId
        ) {
          return;
        }
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
          (state.gameMode !== "free-selection" &&
            state.draftPhase !== "starters") ||
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
          eraFit:
            state.eraId === "all"
              ? 0
              : calculateEraFit(player, state.eraId, {
                  manager,
                  formation,
                }),
          managerFit: projectedRatings.managerFit,
          chemistryChange:
            projectedRatings.chemistry - currentRatings.chemistry,
          overallChange: projectedRatings.overall - currentRatings.overall,
        };
        const complete = picks.length === formation.slots.length;
        const optionIds =
          complete || state.gameMode === "free-selection"
          ? []
          : playerOptionsFor({
              formationId: state.formationId,
              picks,
              draftSeed: state.draftSeed,
              rejectedIdentityIds: state.rejectedIdentityIds,
              seenIdentityCounts: state.seenIdentityCounts,
              recentIdentityIds: state.recentIdentityIds,
              seenCardCounts: state.seenCardCounts,
              recentCardIds: state.recentCardIds,
              contextKey: `${state.eraId}:${state.managerId}:${state.formationId}:${state.playerRespinsRemaining}`,
              respinIndex: state.playerRespinIndex,
            });
        const visibility = recordOptionVisibility(state, optionIds);
        set({
          picks,
          selectedPlayerId: null,
          selectedSlotId: null,
          projectedPositionFits: [],
          optionIds,
          ...visibility,
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
                seenIdentityCounts: state.seenIdentityCounts,
                recentIdentityIds: state.recentIdentityIds,
                seenCardCounts: state.seenCardCounts,
                recentCardIds: state.recentCardIds,
                contextKey: `${state.eraId}:${state.managerId}:${state.formationId}:${state.playerRespinsRemaining - 1}`,
                respinIndex: nextIndex,
              })
            : benchOptionsFor({
                picks: state.picks,
                benchPicks: state.benchPicks,
                draftSeed: state.draftSeed,
                rejectedIdentityIds: rejected,
                seenIdentityCounts: state.seenIdentityCounts,
                recentIdentityIds: state.recentIdentityIds,
                seenCardCounts: state.seenCardCounts,
                recentCardIds: state.recentCardIds,
                contextKey: `${state.eraId}:${state.managerId}:${state.formationId}:bench:${state.playerRespinsRemaining - 1}`,
                respinIndex: nextIndex,
              });
        set({
          optionIds,
          ...recordOptionVisibility(state, optionIds),
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
        if (state.gameMode === "free-selection") return;
        if (state.picks.length !== 11 || state.draftPhase !== "starters") return;
        const optionIds = benchOptionsFor({
          picks: state.picks,
          benchPicks: [],
          draftSeed: state.draftSeed,
          rejectedIdentityIds: state.rejectedIdentityIds,
          seenIdentityCounts: state.seenIdentityCounts,
          recentIdentityIds: state.recentIdentityIds,
          seenCardCounts: state.seenCardCounts,
          recentCardIds: state.recentCardIds,
          contextKey: `${state.eraId}:${state.managerId}:${state.formationId}:bench:${state.playerRespinsRemaining}`,
          respinIndex: state.playerRespinIndex,
        });
        set({
          draftPhase: "bench",
          selectedPlayerId: null,
          selectedSlotId: null,
          projectedPositionFits: [],
          optionIds,
          ...recordOptionVisibility(state, optionIds),
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
        const optionIds =
          benchPicks.length === 3
            ? []
            : benchOptionsFor({
                picks: state.picks,
                benchPicks,
                draftSeed: state.draftSeed,
                rejectedIdentityIds: state.rejectedIdentityIds,
                seenIdentityCounts: state.seenIdentityCounts,
                recentIdentityIds: state.recentIdentityIds,
                seenCardCounts: state.seenCardCounts,
                recentCardIds: state.recentCardIds,
                contextKey: `${state.eraId}:${state.managerId}:${state.formationId}:bench:${state.playerRespinsRemaining}`,
                respinIndex: state.playerRespinIndex,
              });
        set({
          benchPicks,
          pendingBenchCardId: null,
          optionIds,
          ...recordOptionVisibility(state, optionIds),
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
      assignFreeBenchPlayer: (cardId, slotId) => {
        const state = get();
        if (
          state.gameMode !== "free-selection" ||
          !benchSlotOrder.includes(slotId)
        ) {
          return;
        }
        const player = playersById.get(cardId);
        if (!player?.isDraftEligible) return;
        const used = usedIdentityIdsForState({
          picks: state.picks,
          benchPicks: state.benchPicks.filter(
            (pick) => pick.slotId !== slotId,
          ),
        });
        if (used.has(player.playerIdentityId)) return;
        const benchPicks = [
          ...state.benchPicks.filter((pick) => pick.slotId !== slotId),
          { slotId, cardId },
        ].sort(
          (first, second) =>
            benchSlotOrder.indexOf(first.slotId) -
            benchSlotOrder.indexOf(second.slotId),
        );
        set({
          benchPicks,
          selectedPlayerId: null,
          pendingBenchCardId: null,
          draftPhase:
            state.picks.length === 11 && benchPicks.length === 3
              ? "review"
              : "starters",
          selectedOpponentId: null,
          matchResult: null,
        });
      },
      removeFreePlayer: (cardId) => {
        const state = get();
        if (state.gameMode !== "free-selection") return;
        const picks = state.picks.filter((pick) => pick.cardId !== cardId);
        const benchPicks = state.benchPicks.filter(
          (pick) => pick.cardId !== cardId,
        );
        if (
          picks.length === state.picks.length &&
          benchPicks.length === state.benchPicks.length
        ) {
          return;
        }
        set({
          picks,
          benchPicks,
          draftPhase:
            picks.length === 11 && benchPicks.length === 3
              ? "review"
              : "starters",
          selectedPlayerId: null,
          selectedSlotId: null,
          projectedPositionFits: [],
          selectedOpponentId: null,
          matchResult: null,
        });
      },
      randomizeFreeSquad: () => {
        const state = get();
        if (
          state.gameMode !== "free-selection" ||
          !state.formationId
        ) {
          return;
        }
        const simulationNonce = state.simulationNonce + 1;
        const squad = generateFreeSelectionSquad({
          formation: getFormation(state.formationId),
          cards: draftEligiblePlayers,
          seed:
            state.draftSeed ^
            hashString(`free-selection:${simulationNonce}`),
        });
        set({
          ...squad,
          draftPhase: "review",
          selectedPlayerId: null,
          selectedSlotId: null,
          pendingBenchCardId: null,
          projectedPositionFits: [],
          selectedOpponentId: null,
          matchResult: null,
          simulationNonce,
        });
      },
      finalizeFreeSelection: () => {
        const state = get();
        if (
          state.gameMode !== "free-selection" ||
          !state.formationId ||
          state.picks.length !== 11 ||
          state.benchPicks.length !== 3
        ) {
          return;
        }
        const validation = validateDraftPicks({
          picks: state.picks,
          formation: getFormation(state.formationId),
          cards: players,
        });
        const squad = [...state.picks, ...state.benchPicks]
          .map((pick) => playersById.get(pick.cardId))
          .filter(
            (player): player is PlayerTournamentCard => Boolean(player),
          );
        if (
          squad.length !== 14 ||
          squad.some((player) => !player.isDraftEligible) ||
          validation.valid.length !== 11 ||
          validation.issues.length > 0 ||
          new Set(squad.map((player) => player.playerIdentityId)).size !==
            14
        ) {
          return;
        }
        set({ draftPhase: "opponent" });
      },
      editFreeSelection: () => {
        const state = get();
        if (
          state.gameMode !== "free-selection" ||
          state.draftPhase !== "opponent"
        ) {
          return;
        }
        set({
          draftPhase: "review",
          selectedOpponentId: null,
          matchResult: null,
        });
      },
      finalizeBench: () => {
        if (get().benchPicks.length === 3) set({ draftPhase: "opponent" });
      },
      startWorldCupRun: () => {
        const state = get();
        if (
          state.gameMode !== "world-cup-run" ||
          state.worldCupRun ||
          !state.formationId ||
          !state.managerId ||
          !state.eraId ||
          state.picks.length !== 11 ||
          state.benchPicks.length !== 3
        ) {
          return;
        }
        const formation = getFormation(state.formationId);
        const manager = managersById.get(state.managerId);
        if (!manager) return;
        const lineup = lineupFor(state.picks);
        const bench = state.benchPicks
          .map((pick) => playersById.get(pick.cardId))
          .filter(
            (player): player is PlayerTournamentCard => Boolean(player),
          );
        const squadIdentityIds = usedIdentityIdsForState(state);
        const validation = validateDraftPicks({
          picks: state.picks,
          formation,
          cards: players,
        });
        if (
          lineup.length !== 11 ||
          bench.length !== 3 ||
          squadIdentityIds.size !== 14 ||
          validation.valid.length !== 11 ||
          validation.issues.length > 0 ||
          [...lineup, ...bench].some(
            (player) => !player.isDraftEligible,
          )
        ) {
          return;
        }
        const selectedOpponents = createWorldCupRunOpponentField({
          seed: state.draftSeed,
        });
        const userRatings = calculateTeamRatings(lineup, formation, {
          picks: state.picks,
          manager,
          eraId: state.eraId,
          bench,
        });
        const seed =
          state.draftSeed ^
          hashString(
            `world-cup-run:${state.picks
              .map((pick) => pick.cardId)
              .join("|")}`,
          );
        const worldCupRun = createWorldCupRun({
          seed,
          userTeamId: "trophy-xi",
          teams: [
            {
              id: "trophy-xi",
              name: "Trophy XI",
              countryCode: "TXI",
              rating: userRatings.overall,
              attack: userRatings.attack,
              midfield: userRatings.midfield,
              defense: userRatings.defense,
            },
            ...selectedOpponents.map((opponent) => ({
              id: opponent.id,
              name: opponent.nationName,
              countryCode: opponent.nationCode,
              rating: opponent.ratings.overall,
              attack: opponent.ratings.attack,
              midfield: opponent.ratings.midfield,
              defense: opponent.ratings.defense,
              isChampion: isWorldCupRunFinalBoss(opponent),
            })),
          ],
        });
        if (process.env.NODE_ENV !== "production") {
          console.table(
            worldCupRun.teams.map((team) => ({
              team: team.name,
              overall: team.rating,
              attack: team.attack,
              midfield: team.midfield,
              defense: team.defense,
              champion: Boolean(team.isChampion),
            })),
          );
        }
        set({
          worldCupRun,
          worldCupRunOpponents: selectedOpponents,
          draftPhase: "opponent",
          selectedOpponentId: null,
          matchResult: null,
        });
      },
      restartWorldCupRun: () => {
        const state = get();
        if (state.gameMode !== "world-cup-run") return;
        set({
          draftSeed: createDraftSeed(),
          worldCupRun: null,
          worldCupRunOpponents: [],
          selectedOpponentId: null,
          matchResult: null,
        });
        get().startWorldCupRun();
      },
      continueWorldCupRun: () => {
        const state = get();
        if (state.gameMode !== "world-cup-run" || !state.worldCupRun) {
          return;
        }
        set({
          selectedOpponentId:
            state.worldCupRun.currentStage === "final"
              ? pendingOpponentIdForRun(state.worldCupRun)
              : null,
          matchResult: null,
        });
      },
      simulateWorldCupRunMatch: () => {
        const state = get();
        if (state.gameMode !== "world-cup-run" || !state.worldCupRun) return;
        set({
          worldCupRun: simulateNextWorldCupRunUserFixture(state.worldCupRun),
          selectedOpponentId: null,
          matchResult: null,
        });
      },
      simulateWorldCupRunGroup: () => {
        const state = get();
        if (state.gameMode !== "world-cup-run" || !state.worldCupRun) return;
        set({
          worldCupRun: simulateRemainingWorldCupRunGroup(state.worldCupRun),
          selectedOpponentId: null,
          matchResult: null,
        });
      },
      simulateWorldCupRunRound: () => {
        const state = get();
        if (state.gameMode !== "world-cup-run" || !state.worldCupRun) return;
        set({
          worldCupRun: simulateRemainingWorldCupRunRound(state.worldCupRun),
          selectedOpponentId: null,
          matchResult: null,
        });
      },
      enterWorldCupRunKnockouts: () => {
        const state = get();
        if (state.gameMode !== "world-cup-run" || !state.worldCupRun) return;
        set({
          worldCupRun: enterWorldCupRunKnockouts(state.worldCupRun),
          selectedOpponentId: null,
          matchResult: null,
        });
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
        const opponent = opponentForState(selectedOpponentId, state);
        if (!opponent) return;
        set({ selectedOpponentId, matchResult: null });
      },
      resetDraft: () => {
        const state = get();
        if (!state.eraId) {
          set({
            ...cleanState,
            gameMode: state.gameMode,
            ...exposureHistoryFor(state, true),
            saveNotice: null,
          });
          return;
        }
        const draftSeed = createDraftSeed();
        const history = exposureHistoryFor(state, true);
        const managerOptionIds =
          state.gameMode === "free-selection"
            ? draftEligibleManagers.map((manager) => manager.id)
            : managerOptionsFor(state.eraId, draftSeed, [], 0, history);
        const managerVisibility =
          state.gameMode === "free-selection"
            ? {}
            : recordManagerVisibility(history, managerOptionIds);
        set({
          ...cleanState,
          gameMode: state.gameMode,
          eraId: state.eraId,
          draftSeed,
          originalManagerOptionIds: managerOptionIds,
          managerOptionIds,
          managerRespinRemaining:
            state.gameMode === "free-selection" ? 0 : 1,
          formationRespinRemaining:
            state.gameMode === "free-selection" ? 0 : 1,
          ...history,
          ...managerVisibility,
          saveNotice: null,
        });
      },
      restartFromManager: () => {
        const state = get();
        if (!state.eraId) {
          set({
            ...cleanState,
            gameMode: state.gameMode,
            ...exposureHistoryFor(state, true),
            saveNotice: null,
          });
          return;
        }
        const draftSeed = createDraftSeed();
        const history = exposureHistoryFor(state, true);
        const managerOptionIds =
          state.gameMode === "free-selection"
            ? draftEligibleManagers.map((manager) => manager.id)
            : managerOptionsFor(state.eraId, draftSeed, [], 0, history);
        const managerVisibility =
          state.gameMode === "free-selection"
            ? {}
            : recordManagerVisibility(history, managerOptionIds);
        set({
          ...cleanState,
          gameMode: state.gameMode,
          eraId: state.eraId,
          draftSeed,
          originalManagerOptionIds: managerOptionIds,
          managerOptionIds,
          managerRespinRemaining:
            state.gameMode === "free-selection" ? 0 : 1,
          formationRespinRemaining:
            state.gameMode === "free-selection" ? 0 : 1,
          ...history,
          ...managerVisibility,
          saveNotice: null,
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
        const opponent = opponentForState(state.selectedOpponentId, state);
        if (!manager || !opponent) throw new Error("Match context is unavailable");
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
          competitionStage:
            state.gameMode === "world-cup-run" &&
            state.worldCupRun?.currentStage === "group"
              ? "group"
              : "knockout",
        });
        let worldCupRun = state.worldCupRun;
        if (state.gameMode === "world-cup-run" && worldCupRun) {
          const fixture = getPendingWorldCupRunUserFixture(worldCupRun);
          const pendingOpponentId = pendingOpponentIdForRun(worldCupRun);
          if (
            !fixture ||
            pendingOpponentId !== state.selectedOpponentId
          ) {
            throw new Error(
              "World Cup Run fixture and selected opponent are out of sync",
            );
          }
          worldCupRun = recordWorldCupRunUserResult(
            worldCupRun,
            fixture.id,
            {
              userGoals: matchResult.score.user,
              opponentGoals: matchResult.score.opponent,
              afterExtraTime: matchResult.score.afterExtraTime,
              ...(matchResult.score.penalties
                ? { penalties: matchResult.score.penalties }
                : {}),
            },
          );
          worldCupRun =
            resolvePendingWorldCupRunCpuFixtures(worldCupRun);
        }
        set({ matchResult, simulationNonce, worldCupRun });
        return matchResult;
      },
      prepareRematch: () => set({ matchResult: null }),
      clearGame: () => {
        const state = get();
        set({
          ...cleanState,
          ...exposureHistoryFor(state, true),
          saveNotice: null,
        });
      },
      repairHydratedState: () => {
        const state = get();
        if (!state.eraId) return;
        if (state.gameMode === "world-cup-run" && state.worldCupRun) {
          const opponents = state.worldCupRunOpponents ?? [];
          const runOpponentIds = new Set(
            state.worldCupRun.teams
              .filter(
                (team) => team.id !== state.worldCupRun?.userTeamId,
              )
              .map((team) => team.id),
          );
          const persistedOpponentIds = new Set(
            opponents.map((opponent) => opponent.id),
          );
          const invalidSimulationModel =
            state.worldCupRun.version !== 6 ||
            state.worldCupRun.teams.some(
              (team) =>
                !Number.isFinite(team.attack) ||
                !Number.isFinite(team.midfield) ||
                !Number.isFinite(team.defense),
            );
          const invalidField =
            opponents.length !== WORLD_CUP_RUN_OPPONENT_COUNT ||
            persistedOpponentIds.size !==
              WORLD_CUP_RUN_OPPONENT_COUNT ||
            runOpponentIds.size !== WORLD_CUP_RUN_OPPONENT_COUNT ||
            [...runOpponentIds].some(
              (opponentId) => !persistedOpponentIds.has(opponentId),
            ) ||
            opponents.some(
              (opponent) =>
                !runOpponentIds.has(opponent.id) ||
                !isActiveWorldCupRunOpponent(opponent),
            );
          if (invalidSimulationModel || invalidField) {
            set({
              worldCupRun: null,
              worldCupRunOpponents: [],
              selectedOpponentId: null,
              matchResult: null,
              saveNotice: invalidSimulationModel
                ? "World Cup Run now uses completed 2026 tournament performance. Start a new run to use the updated opponent model."
                : "Your tournament field was rebuilt to preserve the active archive boundary. Generate a new World Cup Run to continue.",
            });
            return;
          }
        }
        const manager = state.managerId
          ? managersById.get(state.managerId)
          : undefined;
        if (state.managerId && !manager) {
          const history = exposureHistoryFor(state);
          const managerOptionIds = managerOptionsFor(
            state.eraId,
            state.draftSeed,
            [],
            0,
            history,
          );
          set({
            ...cleanState,
            ...history,
            ...recordManagerVisibility(history, managerOptionIds),
            eraId: state.eraId,
            draftSeed: state.draftSeed,
            originalManagerOptionIds: managerOptionIds,
            managerOptionIds,
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
              safePicks.length < 11 &&
              state.gameMode !== "free-selection"
                ? playerOptionsFor({
                    formationId: state.formationId,
                    picks: safePicks,
                    draftSeed: state.draftSeed,
                    rejectedIdentityIds: state.rejectedIdentityIds,
                    seenIdentityCounts: state.seenIdentityCounts,
                    recentIdentityIds: state.recentIdentityIds,
                    seenCardCounts: state.seenCardCounts,
                    recentCardIds: state.recentCardIds,
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
          ? opponentForState(state.selectedOpponentId, state)
          : undefined;
        if (state.selectedOpponentId && !opponent) {
          set({
            selectedOpponentId: null,
            matchResult: null,
            saveNotice: "The saved opponent was unavailable and has been cleared.",
          });
          return;
        }
        const expectedOptionCount =
          state.gameMode !== "free-selection" &&
          (state.draftPhase === "starters" ||
            state.draftPhase === "bench")
            ? 5
            : 0;
        if (state.optionIds.length !== expectedOptionCount) {
          set({
            selectedPlayerId: null,
            selectedSlotId: null,
            pendingBenchCardId: null,
            projectedPositionFits: [],
            optionIds:
              state.gameMode !== "free-selection" &&
              state.draftPhase === "starters" &&
              state.picks.length < 11
                ? playerOptionsFor({
                    formationId: state.formationId,
                    picks: state.picks,
                    draftSeed: state.draftSeed,
                    rejectedIdentityIds: state.rejectedIdentityIds,
                    seenIdentityCounts: state.seenIdentityCounts,
                    recentIdentityIds: state.recentIdentityIds,
                    seenCardCounts: state.seenCardCounts,
                    recentCardIds: state.recentCardIds,
                    contextKey: `${state.eraId}:${state.managerId}:${state.formationId}:${state.playerRespinsRemaining}`,
                    respinIndex: state.playerRespinIndex,
                  })
                : state.draftPhase === "bench"
                  ? benchOptionsFor({
                      picks: state.picks,
                      benchPicks: state.benchPicks,
                      draftSeed: state.draftSeed,
                      rejectedIdentityIds: state.rejectedIdentityIds,
                      seenIdentityCounts: state.seenIdentityCounts,
                      recentIdentityIds: state.recentIdentityIds,
                      seenCardCounts: state.seenCardCounts,
                      recentCardIds: state.recentCardIds,
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
      migrate: (persisted, persistedVersion) => {
        const previous = (persisted ?? {}) as Partial<GameStore> & {
          eraId?: unknown;
          playMode?: unknown;
          respinUsed?: boolean;
          respinStage?: "manager" | "player" | null;
        };
        const eraId = migratedEra(previous.eraId);
        const gameMode: GameMode =
          previous.gameMode === "free-selection" ||
          previous.gameMode === "world-cup-run"
            ? previous.gameMode
            : "classic-draft";
        const draftSeed = previous.draftSeed ?? 2026;
        const invalidatedLegacyWorldCupRun =
          persistedVersion < WORLD_CUP_RUN_MODEL_SAVE_VERSION &&
          Boolean(previous.worldCupRun);
        const removedPlayableAllStars =
          previous.playMode === "all-stars" ||
          previous.managerId === "world-cup-all-stars-coach";
        if (removedPlayableAllStars && eraId) {
          const managerOptionIds = managerOptionsFor(eraId, draftSeed, [], 0, previous);
          return {
            ...cleanState,
            gameMode: "classic-draft",
            eraId,
            draftSeed,
            originalManagerOptionIds: managerOptionIds,
            managerOptionIds,
            saveNotice:
              "Playable World Cup All-Stars was removed. Your era is preserved; choose one of three tournament managers to begin a normal draft.",
          };
        }
        const migratedManagerId = previous.managerId
          ? canonicalManagerIdFor(previous.managerId)
          : null;
        const managerId =
          migratedManagerId && managersById.has(migratedManagerId)
            ? migratedManagerId
            : null;
        const savedManagerOptionIds = [
          ...new Set(
            (previous.managerOptionIds ?? [])
              .map(canonicalManagerIdFor)
              .filter((id) => managersById.has(id)),
          ),
        ];
        const managerOptionIds =
          eraId && !managerId
            ? gameMode === "free-selection"
              ? draftEligibleManagers.map((manager) => manager.id)
              : managerOptionsFor(eraId, draftSeed, [], 0, previous)
            : savedManagerOptionIds;
        const originalFormationOptionIds =
          previous.originalFormationOptionIds?.length
            ? previous.originalFormationOptionIds
            : eraId && managerId
              ? gameMode === "free-selection"
                ? formations.map((formation) => formation.id)
                : formationOptionsFor(managerId, eraId, draftSeed, previous)
              : [];
        return {
          ...cleanState,
          ...previous,
          gameMode,
          eraId,
          managerId,
          managerLocked: false,
          draftSeed,
          originalManagerOptionIds:
            previous.originalManagerOptionIds?.length
              ? [
                  ...new Set(
                    previous.originalManagerOptionIds
                      .map(canonicalManagerIdFor)
                      .filter((id) => managersById.has(id)),
                  ),
                ]
              : managerOptionIds,
          managerOptionIds,
          managerRespinRemaining:
            gameMode === "free-selection" ||
            previous.managerRespinRemaining === 0
              ? 0
              : 1,
          managerRespinIndex: previous.managerRespinIndex ?? 0,
          seenManagerIdentityCounts: previous.seenManagerIdentityCounts ?? {},
          recentManagerIdentityIds: previous.recentManagerIdentityIds ?? [],
          seenManagerCardCounts: previous.seenManagerCardCounts ?? {},
          recentManagerCardIds: previous.recentManagerCardIds ?? [],
          originalFormationOptionIds,
          formationOptionIds:
            previous.formationOptionIds?.length
              ? previous.formationOptionIds
              : originalFormationOptionIds,
          formationRespinRemaining:
            gameMode === "free-selection" ||
            previous.formationRespinRemaining === 0
              ? 0
              : 1,
          formationRespinIndex: previous.formationRespinIndex ?? 0,
          seenFormationCounts: previous.seenFormationCounts ?? {},
          recentFormationIds: previous.recentFormationIds ?? [],
          selectedPlayerId: null,
          selectedSlotId: null,
          projectedPositionFits: [],
          optionIds: [],
          playerRespinsRemaining:
            gameMode === "free-selection"
              ? 0
              : (previous.playerRespinsRemaining ??
                (previous.respinUsed &&
                previous.respinStage === "player"
                  ? 1
                  : 2)),
          playerRespinIndex:
            previous.playerRespinIndex ??
            (previous.respinUsed && previous.respinStage === "player" ? 1 : 0),
          benchPicks: previous.benchPicks ?? [],
          seenIdentityCounts: previous.seenIdentityCounts ?? {},
          recentIdentityIds: previous.recentIdentityIds ?? [],
          seenCardCounts: previous.seenCardCounts ?? {},
          recentCardIds: previous.recentCardIds ?? [],
          worldCupRun: invalidatedLegacyWorldCupRun
            ? null
            : (previous.worldCupRun ?? null),
          worldCupRunOpponents: invalidatedLegacyWorldCupRun
            ? []
            : (previous.worldCupRunOpponents ?? []),
          opponentFilters: {
            ...defaultOpponentFilters,
            ...(previous.opponentFilters ?? {}),
          },
          selectedOpponentId:
            !invalidatedLegacyWorldCupRun &&
            previous.selectedOpponentId &&
            (historicalOpponentsById.has(previous.selectedOpponentId) ||
              previous.worldCupRunOpponents?.some(
                (opponent) =>
                  opponent.id === previous.selectedOpponentId,
              ))
              ? previous.selectedOpponentId
              : null,
          matchResult:
            !invalidatedLegacyWorldCupRun &&
            previous.matchResult &&
            Array.isArray(previous.matchResult.opponentSubstitutions)
              ? previous.matchResult
              : null,
          saveNotice: invalidatedLegacyWorldCupRun
            ? "World Cup Run v6 now rotates exact historical champion Final bosses and preserves their archive ratings. Your draft is preserved; start a new run."
            : "Trophy XI upgraded your save to the expanded tournament-manager archive and card-specific face system.",
        };
      },
      partialize: (state) => ({
        gameMode: state.gameMode,
        eraId: state.eraId,
        managerId: state.managerId,
        managerLocked: state.managerLocked,
        originalManagerOptionIds: state.originalManagerOptionIds,
        managerOptionIds: state.managerOptionIds,
        managerRespinRemaining: state.managerRespinRemaining,
        managerRespinIndex: state.managerRespinIndex,
        seenManagerIdentityCounts: state.seenManagerIdentityCounts,
        recentManagerIdentityIds: state.recentManagerIdentityIds,
        seenManagerCardCounts: state.seenManagerCardCounts,
        recentManagerCardIds: state.recentManagerCardIds,
        originalFormationOptionIds: state.originalFormationOptionIds,
        formationOptionIds: state.formationOptionIds,
        formationRespinRemaining: state.formationRespinRemaining,
        formationRespinIndex: state.formationRespinIndex,
        seenFormationCounts: state.seenFormationCounts,
        recentFormationIds: state.recentFormationIds,
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
        seenIdentityCounts: state.seenIdentityCounts,
        recentIdentityIds: state.recentIdentityIds,
        seenCardCounts: state.seenCardCounts,
        recentCardIds: state.recentCardIds,
        playerRespinsRemaining: state.playerRespinsRemaining,
        playerRespinIndex: state.playerRespinIndex,
        opponentFilters: state.opponentFilters,
        selectedOpponentId: state.selectedOpponentId,
        simulationNonce: state.simulationNonce,
        matchResult: state.matchResult,
        worldCupRun: state.worldCupRun,
        worldCupRunOpponents: state.worldCupRunOpponents,
        saveNotice: state.saveNotice,
      }),
      onRehydrateStorage: () => (state) => {
        try {
          state?.repairHydratedState();
        } finally {
          // Zustand supplies no state when reading, parsing, or migrating a
          // persisted save fails. Release every hydration gate either way.
          useGameStore.setState({ hasHydrated: true });
        }
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

const opponentForState = (
  opponentId: string,
  state: Pick<
    GameStore,
    "picks" | "benchPicks" | "worldCupRunOpponents"
  >,
) => {
  const opponent =
    state.worldCupRunOpponents.find(
      (candidate) => candidate.id === opponentId,
    ) ?? historicalOpponentsById.get(opponentId);
  return opponent?.kind === "all-stars"
    ? resolveWorldCupAllStars(usedIdentityIdsForState(state))
    : opponent;
};