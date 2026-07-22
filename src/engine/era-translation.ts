import { getDraftEra } from "@/data/eras";
import { calculateWorldCupAllStarsEraFit } from "@/engine/all-stars";
import type {
  DraftEraId,
  HistoricalWorldCupTeam,
} from "@/types/game";

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

export const calculateOpponentEraFit = (
  opponent: HistoricalWorldCupTeam,
  eraId: DraftEraId,
) => {
  if (eraId === "all") return 0;
  if (opponent.kind === "all-stars") {
    return calculateWorldCupAllStarsEraFit(eraId, opponent);
  }
  const era = getDraftEra(eraId);
  const decadeDistance =
    Math.abs((opponent.tournamentYear ?? era.midpointYear) - era.midpointYear) /
    10;
  const phaseBalance =
    100 -
    (Math.max(
      opponent.ratings.attack,
      opponent.ratings.midfield,
      opponent.ratings.defense,
    ) -
      Math.min(
        opponent.ratings.attack,
        opponent.ratings.midfield,
        opponent.ratings.defense,
      ));
  const adaptability =
    opponent.ratings.depth * 0.42 +
    opponent.ratings.midfield * 0.34 +
    phaseBalance * 0.24;
  const distancePenalty = decadeDistance * (4.8 - adaptability * 0.022);
  return Math.round(
    clamp(100 - distancePenalty + (adaptability - 82) * 0.08, 68, 100),
  );
};
