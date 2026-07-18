import { worldCupAllStars } from "@/data/opponents/all-stars";
import {
  historicalOpponents as completedHistoricalOpponents,
  historicalOpponentSource,
} from "@/data/opponents/generated";
import { worldCup2026Participants } from "@/data/opponents/participants-2026";
import type { HistoricalWorldCupTeam } from "@/types/game";

export { historicalOpponentSource, worldCupAllStars };

export const historicalOpponents: HistoricalWorldCupTeam[] = [
  ...worldCup2026Participants,
  ...completedHistoricalOpponents,
].sort(
  (first, second) =>
    (second.tournamentYear ?? 0) - (first.tournamentYear ?? 0) ||
    first.nationName.localeCompare(second.nationName),
);

export const matchOpponents: HistoricalWorldCupTeam[] = [
  worldCupAllStars,
  ...historicalOpponents,
];

export const historicalOpponentsById = new Map(
  matchOpponents.map((opponent) => [opponent.id, opponent]),
);

export const getOpponentLabel = (opponent: HistoricalWorldCupTeam) =>
  opponent.kind === "all-stars"
    ? opponent.nationName
    : `${opponent.nationName} ${opponent.tournamentYear}`;
