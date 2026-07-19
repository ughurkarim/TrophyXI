import { getDraftEra } from "@/data/eras";
import type { DraftEraId, Formation } from "@/types/game";

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const difficultyScore: Record<Formation["tacticalDifficulty"], number> = {
  Accessible: 72,
  Intermediate: 83,
  Advanced: 92,
};

/**
 * Models how naturally a formation's tactical demands translate into the
 * selected match environment. Ratings remain Trophy XI estimates.
 */
export const calculateFormationEraFit = (
  formation: Formation,
  eraId: DraftEraId,
) => {
  const { environment } = getDraftEra(eraId);
  const targetWidth = clamp(
    62 + environment.pitchSpeed * 0.28 + environment.transitionSpeed * 0.08,
    68,
    94,
  );
  const targetComplexity = clamp(
    50 +
      environment.technicalDemand * 0.24 +
      environment.pressingDemand * 0.2,
    68,
    94,
  );
  const eraStrengthBonus =
    eraId !== "all" && formation.eraStrengths.includes(eraId) ? 3 : 0;
  const neutralBalanceBonus =
    eraId === "all"
      ? Math.max(
          0,
          1.5 -
            Math.abs(
              formation.tendencies.attack - formation.tendencies.defense,
            ) *
              0.03,
        )
      : 0;

  const score =
    99 -
    Math.abs(
      formation.pressingSuitability - environment.pressingDemand,
    ) *
      0.16 -
    Math.abs(
      formation.tendencies.control - environment.technicalDemand,
    ) *
      0.12 -
    Math.abs(
      formation.tendencies.attack - environment.transitionSpeed,
    ) *
      0.1 -
    Math.abs(formation.width - targetWidth) * 0.08 -
    Math.abs(
      formation.tendencies.defense - environment.physicalContact,
    ) *
      0.08 -
    Math.abs(difficultyScore[formation.tacticalDifficulty] - targetComplexity) *
      0.06 +
    eraStrengthBonus +
    neutralBalanceBonus;

  return Math.round(clamp(score, 60, 99));
};

export const calculateFormationRecommendationScore = (
  managerFit: number,
  eraFit: number,
) => managerFit * 0.55 + eraFit * 0.45;
