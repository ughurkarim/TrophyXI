import { formations } from "@/data/formations";
import { draftEligibleManagers } from "@/data/managers";
import { historicalOpponents } from "@/data/opponents";
import { draftEligiblePlayers, playersById } from "@/data/players";
import { generateFreeSelectionSquad } from "@/engine/free-selection";
import { hashString } from "@/engine/random";
import { calculateTeamRatings } from "@/engine/ratings";
import type {
  DraftEraId,
  HistoricalWorldCupTeam,
  PlayerTournamentCard,
} from "@/types/game";

export const WORLD_CUP_RUN_OPPONENT_COUNT = 31;
export const WORLD_CUP_RUN_MODEL_PREFIX = "trophy-xi-model-";
const activeChampionIds = new Set(
  historicalOpponents.map((opponent) => opponent.id),
);
const activeChampionsById = new Map(
  historicalOpponents.map((opponent) => [opponent.id, opponent]),
);
const activeCardIds = new Set(
  draftEligiblePlayers.map((player) => player.id),
);

export type WorldCupRunOpponentFieldInput = {
  seed: number;
  eraId: DraftEraId;
  excludedIdentityIds: Iterable<string>;
};

export const isActiveWorldCupRunOpponent = (
  opponent: HistoricalWorldCupTeam,
) => {
  if (activeChampionIds.has(opponent.id)) {
    const activeChampion = activeChampionsById.get(opponent.id)!;
    const activeIdentities = [
      ...activeChampion.startingLineup,
      ...activeChampion.substitutes,
    ].map((player) => player.playerIdentityId);
    const persistedIdentities = [
      ...opponent.startingLineup,
      ...opponent.substitutes,
    ].map((player) => player.playerIdentityId);
    return (
      opponent.kind === "historical" &&
      opponent.startingLineup.length === 11 &&
      opponent.substitutes.length >= 3 &&
      persistedIdentities.length === activeIdentities.length &&
      persistedIdentities.every(
        (identityId, index) => identityId === activeIdentities[index],
      )
    );
  }
  if (
    opponent.kind !== "model" ||
    !opponent.id.startsWith(WORLD_CUP_RUN_MODEL_PREFIX) ||
    opponent.startingLineup.length !== 11 ||
    opponent.substitutes.length !== 3
  ) {
    return false;
  }
  const players = [
    ...opponent.startingLineup,
    ...opponent.substitutes,
  ];
  return (
    new Set(players.map((player) => player.playerIdentityId)).size ===
      14 &&
    players.every(
      (player) =>
        Boolean(player.sourcePlayerId) &&
        activeCardIds.has(player.sourcePlayerId!),
    )
  );
};

const conflictsWith = (
  opponent: HistoricalWorldCupTeam,
  excludedIdentityIds: Set<string>,
) =>
  [...opponent.startingLineup, ...opponent.substitutes].some((player) =>
    excludedIdentityIds.has(player.playerIdentityId),
  );

const modelIdFor = (index: number) =>
  `${WORLD_CUP_RUN_MODEL_PREFIX}${String(index + 1).padStart(2, "0")}`;

const createModeledOpponent = ({
  index,
  seed,
  eraId,
  excludedIdentityIds,
}: {
  index: number;
  seed: number;
  eraId: DraftEraId;
  excludedIdentityIds: Set<string>;
}): HistoricalWorldCupTeam => {
  const modelId = modelIdFor(index);
  const modelSeed = seed ^ hashString(`${modelId}:squad`);
  const formation =
    formations[
      hashString(`${seed}:${modelId}:formation`) % formations.length
    ];
  const compatibleManagers = draftEligibleManagers.filter((manager) =>
    [
      ...manager.preferredFormations,
      ...manager.acceptableFormations,
    ].includes(formation.id),
  );
  const managerPool = compatibleManagers.length
    ? compatibleManagers
    : draftEligibleManagers;
  const manager =
    managerPool[
      hashString(`${seed}:${modelId}:manager`) % managerPool.length
    ];
  const squad = generateFreeSelectionSquad({
    formation,
    cards: draftEligiblePlayers,
    seed: modelSeed,
    excludedIdentityIds,
  });
  const lineup = squad.picks.map((pick) => {
    const player = playersById.get(pick.cardId);
    const slot = formation.slots.find(
      (candidate) => candidate.id === pick.slotId,
    );
    if (!player || !slot) {
      throw new Error(`Invalid ${modelId} starter ${pick.cardId}`);
    }
    return { player, position: slot.position };
  });
  const bench = squad.benchPicks.map((pick) => {
    const player = playersById.get(pick.cardId);
    if (!player) {
      throw new Error(`Invalid ${modelId} substitute ${pick.cardId}`);
    }
    return player;
  });
  const ratings = calculateTeamRatings(
    lineup.map(({ player }) => player),
    formation,
    {
      picks: squad.picks,
      manager,
      eraId,
      bench,
    },
  );
  const goalkeeper = lineup.find(
    ({ position }) => position === "GK",
  )?.player;
  const modelNumber = String(index + 1).padStart(2, "0");

  return {
    id: modelId,
    kind: "model",
    nationCode: "ALL",
    nationName: `Trophy XI Model ${modelNumber}`,
    tournamentYear: null,
    confederation: null,
    tournamentFinish: null,
    tournamentStatus: "featured",
    dataStatus: "modeled-lineup",
    managerName: manager.managerName,
    managerIdentityId: manager.managerIdentityId,
    managerCardId: manager.id,
    formation: formation.id,
    formationLabel: formation.name,
    alternateFormations: [],
    startingLineup: lineup.map(({ player, position }) => ({
      playerIdentityId: player.playerIdentityId,
      sourcePlayerId: player.id,
      name: `${player.playerName} ${player.tournamentYear}`,
      position,
      rating: player.overall,
    })),
    substitutes: bench.map((player: PlayerTournamentCard) => ({
      playerIdentityId: player.playerIdentityId,
      sourcePlayerId: player.id,
      name: `${player.playerName} ${player.tournamentYear}`,
      position: player.primaryPosition,
      rating: player.overall,
    })),
    tacticalProfile: `Trophy XI model · ${formation.description}`,
    ratings: {
      attack: ratings.attack,
      midfield: ratings.midfield,
      defense: ratings.defense,
      goalkeeper: goalkeeper?.attributes.goalkeeping ?? ratings.defense,
      depth: ratings.benchDepth,
      overall: ratings.overall,
    },
    tournamentStats: {
      matches: null,
      wins: null,
      draws: null,
      losses: null,
      goalsFor: null,
      goalsAgainst: null,
      cleanSheets: null,
    },
    sources: [],
    originalRatings: true,
    formationIsModel: true,
    difficulty:
      ratings.overall >= 92
        ? "Legendary"
        : ratings.overall >= 87
          ? "Elite"
          : "Contender",
  };
};

/**
 * Builds the World Cup Run field only from the active champion pool and
 * explicit Trophy XI models. Research-only archive rows never enter play.
 */
export const createWorldCupRunOpponentField = ({
  seed,
  eraId,
  excludedIdentityIds,
}: WorldCupRunOpponentFieldInput): HistoricalWorldCupTeam[] => {
  const excluded = new Set(excludedIdentityIds);
  const activeChampions = historicalOpponents
    .filter((opponent) => !conflictsWith(opponent, excluded))
    .sort(
      (first, second) =>
        hashString(`${seed}:champion:${first.id}`) -
          hashString(`${seed}:champion:${second.id}`) ||
        first.id.localeCompare(second.id),
    );
  const modelCount =
    WORLD_CUP_RUN_OPPONENT_COUNT - activeChampions.length;
  const models = Array.from({ length: modelCount }, (_, index) =>
    createModeledOpponent({
      index,
      seed,
      eraId,
      excludedIdentityIds: excluded,
    }),
  );
  return [...activeChampions, ...models];
};
