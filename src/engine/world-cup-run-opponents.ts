import { historicalOpponents } from "@/data/opponents";
import { worldCup2026Participants } from "@/data/opponents/participants-2026";
import { hashString } from "@/engine/random";
import type { HistoricalWorldCupTeam } from "@/types/game";

export const WORLD_CUP_RUN_OPPONENT_COUNT = 47;

const participantsById = new Map(
  worldCup2026Participants.map((opponent) => [opponent.id, opponent]),
);

const championPool = historicalOpponents.filter(
  (opponent) =>
    opponent.kind === "historical" &&
    opponent.tournamentFinish === "champion" &&
    opponent.startingLineup.length === 11 &&
    opponent.substitutes.length >= 3,
);

const championsById = new Map(
  championPool.map((opponent) => [opponent.id, opponent]),
);

if (championPool.length === 0) {
  throw new Error("World Cup Run requires at least one full-roster World Cup champion");
}

const sameRatings = (
  first: HistoricalWorldCupTeam["ratings"],
  second: HistoricalWorldCupTeam["ratings"],
) =>
  first.attack === second.attack &&
  first.midfield === second.midfield &&
  first.defense === second.defense &&
  first.goalkeeper === second.goalkeeper &&
  first.depth === second.depth &&
  first.overall === second.overall;

const sameTournamentStats = (
  first: HistoricalWorldCupTeam["tournamentStats"],
  second: HistoricalWorldCupTeam["tournamentStats"],
) =>
  first.matches === second.matches &&
  first.wins === second.wins &&
  first.draws === second.draws &&
  first.losses === second.losses &&
  first.goalsFor === second.goalsFor &&
  first.goalsAgainst === second.goalsAgainst &&
  first.cleanSheets === second.cleanSheets;

const sameRoster = (
  first: HistoricalWorldCupTeam,
  second: HistoricalWorldCupTeam,
) => {
  const firstIdentities = [
    ...first.startingLineup,
    ...first.substitutes,
  ].map((player) => player.playerIdentityId);
  const secondIdentities = [
    ...second.startingLineup,
    ...second.substitutes,
  ].map((player) => player.playerIdentityId);

  return (
    firstIdentities.length === secondIdentities.length &&
    firstIdentities.every(
      (identityId, index) => identityId === secondIdentities[index],
    )
  );
};

export type WorldCupRunOpponentFieldInput = {
  seed: number;
};

/**
 * A World Cup Run contains 46 normal 2026 national teams plus one seeded
 * historical World Cup champion boss. Normal 2026 teams keep the 30/70 blended
 * national-team model. The Final boss is an exact archive champion: original
 * tournament year, roster, manager, tactics, and ratings are never blended or
 * overwritten by the 2026 participant model.
 */
export const isWorldCupRunFinalBoss = (
  opponent: HistoricalWorldCupTeam,
): boolean => {
  const archivedChampion = championsById.get(opponent.id);
  if (!archivedChampion || opponent.startingLineup.length !== 11) return false;

  return (
    opponent.kind === "historical" &&
    opponent.tournamentFinish === "champion" &&
    opponent.nationCode === archivedChampion.nationCode &&
    opponent.nationName === archivedChampion.nationName &&
    opponent.tournamentYear === archivedChampion.tournamentYear &&
    opponent.startingLineup.length === archivedChampion.startingLineup.length &&
    opponent.substitutes.length === archivedChampion.substitutes.length &&
    sameRoster(opponent, archivedChampion) &&
    sameRatings(opponent.ratings, archivedChampion.ratings) &&
    sameTournamentStats(opponent.tournamentStats, archivedChampion.tournamentStats)
  );
};

export const isActiveWorldCupRunOpponent = (
  opponent: HistoricalWorldCupTeam,
) => {
  // A full-roster champion row is the special Final boss and must exactly match
  // its archived champion version, including the original high ratings.
  if (opponent.startingLineup.length > 0) {
    return isWorldCupRunFinalBoss(opponent);
  }

  // All other rows are normal completed-2026 national teams using the 30/70
  // blended rating model. This also allows Spain 2026 to appear as a normal
  // tournament opponent when a different historical champion is the boss.
  const participant = participantsById.get(opponent.id);
  return Boolean(
    participant &&
      opponent.kind === "historical" &&
      opponent.nationCode === participant.nationCode &&
      opponent.nationName === participant.nationName &&
      opponent.tournamentYear === 2026 &&
      opponent.tournamentStatus === "complete" &&
      opponent.startingLineup.length === 0 &&
      opponent.substitutes.length === 0 &&
      sameRatings(opponent.ratings, participant.ratings) &&
      sameTournamentStats(opponent.tournamentStats, participant.tournamentStats),
  );
};

const selectFinalBoss = (seed: number): HistoricalWorldCupTeam =>
  [...championPool].sort(
    (first, second) =>
      hashString(`${seed}:historical-final-boss:${first.id}`) -
        hashString(`${seed}:historical-final-boss:${second.id}`) ||
      first.id.localeCompare(second.id),
  )[0];

export const createWorldCupRunOpponentField = ({
  seed,
}: WorldCupRunOpponentFieldInput): HistoricalWorldCupTeam[] => {
  const finalBoss = selectFinalBoss(seed);

  // Avoid having the boss nation represented twice in the same tournament when
  // that nation also appears in the completed 2026 field.
  const sameNationParticipant = worldCup2026Participants.find(
    (participant) => participant.nationCode === finalBoss.nationCode,
  );

  const candidates = worldCup2026Participants.filter(
    (participant) => participant.id !== sameNationParticipant?.id,
  );

  // We need 46 normal opponents + 1 boss = 47 opponents total. If the boss
  // nation is absent from 2026, two current participants are cut; otherwise one
  // additional participant is cut. Cuts remain seeded and deterministic.
  const normalOpponentCount = WORLD_CUP_RUN_OPPONENT_COUNT - 1;
  const normalOpponents = [...candidates]
    .sort(
      (first, second) =>
        hashString(`${seed}:field-keep:${first.id}`) -
          hashString(`${seed}:field-keep:${second.id}`) ||
        first.id.localeCompare(second.id),
    )
    .slice(0, normalOpponentCount);

  const field = [
    ...normalOpponents,
    {
      ...finalBoss,
      ratings: { ...finalBoss.ratings },
      tournamentStats: { ...finalBoss.tournamentStats },
      startingLineup: [...finalBoss.startingLineup],
      substitutes: [...finalBoss.substitutes],
      sources: [...finalBoss.sources],
    },
  ];

  if (field.length !== WORLD_CUP_RUN_OPPONENT_COUNT) {
    throw new Error(
      `World Cup Run requires ${WORLD_CUP_RUN_OPPONENT_COUNT} opponents, received ${field.length}`,
    );
  }

  if (field.filter(isWorldCupRunFinalBoss).length !== 1) {
    throw new Error("World Cup Run requires exactly one historical champion boss");
  }

  return field;
};
