import { calculateEraFitDetails } from "@/data/eras";
import { calculateSquadAccoladeEffect } from "@/engine/accolade-effects";
import { calculateChemistry } from "@/engine/chemistry";
import {
  getPlacementPenaltyPercent,
  getPositionFit,
} from "@/engine/draft";
import { managerEraEffectiveness } from "@/engine/manager-era-fit";
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
  bench?: PlayerTournamentCard[];
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
      benchDepth: 0,
      benchVersatility: 0,
      tacticalBalance: 0,
      timelessness: 0,
      managerOffense: context.manager?.grades.offense ?? 0,
      managerDefense: context.manager?.grades.defense ?? 0,
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
  const managerEffectiveness = managerEraEffectiveness(
    manager,
    context.eraId ?? "all",
  );
  const placementMultiplier = new Map(
    lineup.map((player, index) => {
      const pick = context.picks?.find(
        (candidate) => candidate.cardId === player.id,
      );
      const slot = pick
        ? formation.slots.find((candidate) => candidate.id === pick.slotId)
        : formation.slots[index];
      const fit = slot ? getPositionFit(player, slot) : 0;
      const penalty = getPlacementPenaltyPercent(fit);
      return [player.id, Math.max(0, (100 - penalty) / 100)] as const;
    }),
  );
  const eraMultiplier = new Map(
    lineup.map((player) => {
      if ((context.eraId ?? "all") === "all") {
        return [player.id, 1] as const;
      }
      const details = calculateEraFitDetails(player, context.eraId!, {
        manager,
        formation,
      });
      return [
        player.id,
        Math.max(0, (100 - details.impactPercent) / 100),
      ] as const;
    }),
  );
  const adjusted = (player: PlayerTournamentCard, value: number) =>
    value *
    (placementMultiplier.get(player.id) ?? 1) *
    (eraMultiplier.get(player.id) ?? 1);
  const bench = context.bench ?? [];
  const accoladeEffect = calculateSquadAccoladeEffect([
    ...lineup,
    ...bench,
  ]);
  const attack =
    topAverage(
      outfield.map(
        (player) =>
          adjusted(player, player.attributes.attack * 0.6) +
          adjusted(player, player.attributes.creativity * 0.22) +
          adjusted(player, player.attributes.clutch * 0.18),
      ),
      4,
    ) +
    formation.modifiers.attack +
    (manager?.simulationModifier.attack ?? 0) * managerEffectiveness +
    ((manager?.grades.offense ?? 78) - 78) *
      0.045 *
      managerEffectiveness +
    accoladeEffect.attack;
  const midfield =
    topAverage(
      outfield.map(
        (player) =>
          adjusted(player, player.attributes.control * 0.44) +
          adjusted(player, player.attributes.creativity * 0.36) +
          adjusted(player, player.attributes.physical * 0.2),
      ),
      5,
    ) +
    formation.modifiers.midfield +
    (manager?.simulationModifier.midfield ?? 0) * managerEffectiveness +
    accoladeEffect.midfield;
  const outfieldDefense = topAverage(
    outfield.map(
      (player) =>
        adjusted(player, player.attributes.defense * 0.58) +
        adjusted(player, player.attributes.physical * 0.3) +
        adjusted(player, player.attributes.control * 0.12),
    ),
    4,
  );
  const keeperDefense = average(
    goalkeeper.map((player) =>
      adjusted(player, player.attributes.goalkeeping),
    ),
  );
  const defense =
    outfieldDefense * 0.76 +
    (keeperDefense || outfieldDefense) * 0.24 +
    formation.modifiers.defense +
    (manager?.simulationModifier.defense ?? 0) * managerEffectiveness +
    ((manager?.grades.defense ?? 78) - 78) *
      0.045 *
      managerEffectiveness +
    accoladeEffect.defense;
  const chemistry = calculateChemistry(lineup, formation, context);
  const quality =
    attack * 0.34 +
    midfield * 0.33 +
    defense * 0.33 +
    accoladeEffect.quality * 0.35;
  const chemistryAdjustment = ((chemistry.score - 75) / 25) * 2;
  const fitAdjustment =
    ((chemistry.averagePositionFit - 88) / 12) * 1.4 +
    ((chemistry.managerFit - 82) / 18) * 0.8;
  const benchWeights = [0.4, 0.25, 0.15];
  const benchDepth = bench.length
    ? roundRating(
        bench.reduce(
          (sum, player, index) =>
            sum + player.overall * (benchWeights[index] ?? 0.1),
          0,
        ) / benchWeights.slice(0, bench.length).reduce((sum, value) => sum + value, 0),
      )
    : 0;
  const benchVersatility = bench.length
    ? roundRating(
        average(
          bench.map((player) =>
            Math.min(99, 68 + player.eligiblePositions.length * 6),
          ),
        ),
      )
    : 0;
  const phaseRatings = [attack, midfield, defense];
  const tacticalBalance = roundRating(
    100 - (Math.max(...phaseRatings) - Math.min(...phaseRatings)) * 1.8,
  );
  const timelessness = roundRating(
    average(lineup.map((player) => player.eraTranslation.timelessness)),
  );
  const benchAdjustment = bench.length
    ? ((benchDepth - 82) / 17) * 0.8 + ((benchVersatility - 82) / 17) * 0.35
    : 0;

  return {
    attack: roundRating(attack),
    midfield: roundRating(midfield),
    defense: roundRating(defense),
    chemistry: chemistry.score,
    positionFit: chemistry.averagePositionFit,
    eraFit: chemistry.averageEraFit,
    managerFit: chemistry.managerFit,
    benchDepth,
    benchVersatility,
    tacticalBalance,
    timelessness,
    managerOffense: manager?.grades.offense ?? 0,
    managerDefense: manager?.grades.defense ?? 0,
    overall: roundRating(
      quality + chemistryAdjustment + fitAdjustment + benchAdjustment,
    ),
  };
};
