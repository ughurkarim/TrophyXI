import { calculateChemistry } from "@/engine/chemistry";
import type {
  DraftEraId,
  DraftPick,
  Formation,
  ManagerTournamentCard,
  PlayerTournamentCard,
  TeamRatings,
} from "@/types/game";

const average = (values: number[]) =>
  values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;

const topAverage = (values: number[], count: number) =>
  average([...values].sort((a, b) => b - a).slice(0, count));

const roundRating = (value: number) =>
  Math.round(Math.max(0, Math.min(99, value)));

export type RatingContext = {
  picks?: DraftPick[];
  manager?: ManagerTournamentCard;
  eraId?: DraftEraId;
};

export const calculateTeamRatings = (
  lineup: PlayerTournamentCard[],
  formation: Formation,
  context: RatingContext = {},
): TeamRatings => {
  if (lineup.length === 0) {
    return {
      attack: 0,
      midfield: 0,
      defense: 0,
      chemistry: 0,
      positionFit: 0,
      eraFit: 0,
      managerFit: 0,
      overall: 0,
    };
  }

  const goalkeeper = lineup.filter(
    (player) => player.primaryPosition === "GK",
  );
  const outfield = lineup.filter(
    (player) => player.primaryPosition !== "GK",
  );
  const manager = context.manager;
  const achievementBoost = Math.min(
    1.5,
    lineup.reduce(
      (sum, player) =>
        sum +
        player.achievements.reduce(
          (total, achievement) => total + achievement.ratingEffect,
          0,
        ),
      0,
    ),
  );
  const attack =
    topAverage(
      outfield.map(
        (player) =>
          player.attributes.attack * 0.6 +
          player.attributes.creativity * 0.22 +
          player.attributes.clutch * 0.18,
      ),
      4,
    ) +
    formation.modifiers.attack +
    (manager?.simulationModifier.attack ?? 0) +
    achievementBoost * 0.35;
  const midfield =
    topAverage(
      outfield.map(
        (player) =>
          player.attributes.control * 0.44 +
          player.attributes.creativity * 0.36 +
          player.attributes.physical * 0.2,
      ),
      5,
    ) +
    formation.modifiers.midfield +
    (manager?.simulationModifier.midfield ?? 0) +
    achievementBoost * 0.35;
  const outfieldDefense = topAverage(
    outfield.map(
      (player) =>
        player.attributes.defense * 0.58 +
        player.attributes.physical * 0.3 +
        player.attributes.control * 0.12,
    ),
    4,
  );
  const keeperDefense = average(
    goalkeeper.map((player) => player.attributes.goalkeeping),
  );
  const defense =
    outfieldDefense * 0.76 +
    (keeperDefense || outfieldDefense) * 0.24 +
    formation.modifiers.defense +
    (manager?.simulationModifier.defense ?? 0) +
    achievementBoost * 0.3;
  const chemistry = calculateChemistry(lineup, formation, context);
  const quality = attack * 0.34 + midfield * 0.33 + defense * 0.33;
  const chemistryAdjustment = ((chemistry.score - 75) / 25) * 2;
  const fitAdjustment =
    ((chemistry.averagePositionFit - 88) / 12) * 1.4 +
    ((chemistry.managerFit - 82) / 18) * 0.8;

  return {
    attack: roundRating(attack),
    midfield: roundRating(midfield),
    defense: roundRating(defense),
    chemistry: chemistry.score,
    positionFit: chemistry.averagePositionFit,
    eraFit: chemistry.averageEraFit,
    managerFit: chemistry.managerFit,
    overall: roundRating(quality + chemistryAdjustment + fitAdjustment),
  };
};
