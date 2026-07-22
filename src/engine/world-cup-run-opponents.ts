import { historicalOpponents } from "@/data/opponents";
import { worldCup2026Participants } from "@/data/opponents/participants-2026";
import { hashString } from "@/engine/random";
import type { DraftEraId, HistoricalWorldCupTeam } from "@/types/game";

export const WORLD_CUP_RUN_OPPONENT_COUNT = 47;

const activeChampionsById = new Map(
  historicalOpponents.map((opponent) => [opponent.id, opponent]),
);
const participantsById = new Map(
  worldCup2026Participants.map((opponent) => [opponent.id, opponent]),
);
const latestChampionByCountry = new Map<string, HistoricalWorldCupTeam>();

for (const champion of [...historicalOpponents].sort(
  (first, second) =>
    (second.tournamentYear ?? 0) - (first.tournamentYear ?? 0),
)) {
  if (!latestChampionByCountry.has(champion.nationCode)) {
    latestChampionByCountry.set(champion.nationCode, champion);
  }
}

export type WorldCupRunOpponentFieldInput = {
  seed: number;
  eraId: DraftEraId;
  excludedIdentityIds: Iterable<string>;
};

/**
 * The quick-simulation field accepts current national-team rows, while a
 * champion nation carries its complete historical squad for the premium Final.
 */
export const isActiveWorldCupRunOpponent = (
  opponent: HistoricalWorldCupTeam,
) => {
  const champion = activeChampionsById.get(opponent.id);
  if (champion) {
    const activeIdentities = [
      ...champion.startingLineup,
      ...champion.substitutes,
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
  const participant = participantsById.get(opponent.id);
  return Boolean(
    participant &&
      opponent.kind === "historical" &&
      opponent.nationCode === participant.nationCode &&
      opponent.nationName === participant.nationName &&
      opponent.tournamentYear === 2026 &&
      opponent.startingLineup.length === 0 &&
      opponent.substitutes.length === 0,
  );
};

export const createWorldCupRunOpponentField = ({
  seed,
}: WorldCupRunOpponentFieldInput): HistoricalWorldCupTeam[] => {
  const removable = worldCup2026Participants
    .filter(
      (participant) =>
        participant.nationCode !== "ESP" &&
        !latestChampionByCountry.has(participant.nationCode),
    )
    .sort(
      (first, second) =>
        hashString(`${seed}:field-cut:${first.id}`) -
          hashString(`${seed}:field-cut:${second.id}`) ||
        first.id.localeCompare(second.id),
    );
  const excludedId = removable[0]?.id;

  return worldCup2026Participants
    .filter((participant) => participant.id !== excludedId)
    .map((participant) => {
      const champion = latestChampionByCountry.get(participant.nationCode);
      return champion
        ? {
            ...champion,
            nationName: participant.nationName,
            nationCode: participant.nationCode,
          }
        : participant;
    });
};
