import { getDraftEra } from "@/data/eras";
import type {
  DraftEraId,
  ManagerEraFitProfile,
  ManagerTournamentCard,
} from "@/types/game";

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const average = (values: number[]) =>
  values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);

const targetProfileFor = (eraId: DraftEraId): ManagerEraFitProfile => {
  const era = getDraftEra(eraId);
  const environment = era.environment;
  return {
    pressingIntensity: environment.pressingDemand,
    defensiveStructure: Math.round(
      environment.physicalContact * 0.48 +
        environment.aerialDemand * 0.3 +
        environment.protectiveRefereeing * 0.22,
    ),
    tempo: environment.transitionSpeed,
    positionalFlexibility: Math.round(
      environment.technicalDemand * 0.55 +
        environment.goalkeeperDistribution * 0.25 +
        environment.pressingDemand * 0.2,
    ),
    substitutionApproach: Math.round(
      54 +
        environment.transitionSpeed * 0.2 +
        environment.pressingDemand * 0.16,
    ),
    physicalDemand: environment.physicalContact,
    technicalDemand: environment.technicalDemand,
    adaptability: 88,
  };
};

export type ManagerEraFitBreakdown = {
  score: number;
  tacticalTranslation: number;
  yearTranslation: number;
  adaptability: number;
  formationBreadth: number;
};

export const calculateManagerEraFit = (
  manager: ManagerTournamentCard,
  eraId: DraftEraId,
): ManagerEraFitBreakdown => {
  const profile = manager.eraFitProfile;
  const formationBreadth = clamp(
    68 + manager.acceptableFormations.length * 4.5,
    68,
    99,
  );

  if (eraId === "all") {
    const score = Math.round(
      clamp(
        profile.adaptability * 0.42 +
          average([manager.leadership, manager.gameManagement]) * 0.28 +
          formationBreadth * 0.15 +
          average([
            profile.positionalFlexibility,
            profile.substitutionApproach,
          ]) *
            0.15,
        50,
        99,
      ),
    );
    return {
      score,
      tacticalTranslation: Math.round(
        average(Object.values(profile).slice(0, 7)),
      ),
      yearTranslation: 96,
      adaptability: profile.adaptability,
      formationBreadth: Math.round(formationBreadth),
    };
  }

  const era = getDraftEra(eraId);
  const target = targetProfileFor(eraId);
  const translationMetrics: Array<keyof ManagerEraFitProfile> = [
    "pressingIntensity",
    "defensiveStructure",
    "tempo",
    "positionalFlexibility",
    "substitutionApproach",
    "physicalDemand",
    "technicalDemand",
  ];
  const tacticalTranslation = average(
    translationMetrics.map((metric) =>
      clamp(100 - Math.abs(profile[metric] - target[metric]) * 0.62, 40, 100),
    ),
  );
  const distanceInDecades =
    Math.abs(manager.tournamentYear - era.midpointYear) / 10;
  const distancePenalty =
    distanceInDecades * (1 - profile.adaptability / 100) * 12;
  const yearTranslation = clamp(100 - distancePenalty, 50, 100);
  const score = Math.round(
    clamp(
      tacticalTranslation * 0.48 +
        profile.adaptability * 0.24 +
        manager.gameManagement * 0.1 +
        manager.leadership * 0.08 +
        formationBreadth * 0.1 -
        distancePenalty * 0.35,
      40,
      99,
    ),
  );

  return {
    score,
    tacticalTranslation: Math.round(tacticalTranslation),
    yearTranslation: Math.round(yearTranslation),
    adaptability: profile.adaptability,
    formationBreadth: Math.round(formationBreadth),
  };
};

export const managerEraEffectiveness = (
  manager: ManagerTournamentCard | undefined,
  eraId: DraftEraId,
) => {
  if (!manager) return 0;
  const fit = calculateManagerEraFit(manager, eraId).score;
  return clamp(0.82 + (fit - 75) * 0.006, 0.64, 0.98);
};
