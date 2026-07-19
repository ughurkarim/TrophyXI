import { worldCupAllStars } from "@/data/opponents/all-stars";
import {
  historicalOpponents as completedHistoricalOpponents,
  historicalOpponentSource,
} from "@/data/opponents/generated";
import { championOpponents } from "@/data/opponents/champions";
import { worldCup2026Participants } from "@/data/opponents/participants-2026";
import type { HistoricalWorldCupTeam } from "@/types/game";
import { flagForCountry } from "@/lib/utils";

export { historicalOpponentSource, worldCupAllStars };

/** Full research archive. It is intentionally not the normal match pool. */
export const historicalOpponentArchive: HistoricalWorldCupTeam[] = [
  ...worldCup2026Participants,
  ...completedHistoricalOpponents,
].sort(
  (first, second) =>
    (second.tournamentYear ?? 0) - (first.tournamentYear ?? 0) ||
    first.nationName.localeCompare(second.nationName),
);

/** The normal historical match pool: one complete roster per champion. */
export const historicalOpponents: HistoricalWorldCupTeam[] = championOpponents;

export const matchOpponents: HistoricalWorldCupTeam[] = [
  worldCupAllStars,
  ...historicalOpponents,
];

export const historicalOpponentArchiveById = new Map(
  historicalOpponentArchive.map((opponent) => [opponent.id, opponent]),
);

export const historicalOpponentsById = new Map(
  [
    ...historicalOpponentArchive,
    ...matchOpponents,
  ].map((opponent) => [opponent.id, opponent]),
);

export const getOpponentLabel = (opponent: HistoricalWorldCupTeam) =>
  `${flagForCountry(opponent.nationCode)} ${
    opponent.kind === "all-stars" ||
    opponent.kind === "model" ||
    opponent.tournamentYear === null
      ? opponent.nationName
      : `${opponent.nationName} ${opponent.tournamentYear}`
  }`;
