import { calculateEraFit, getDraftEra } from "@/data/eras";
import { getPositionFit } from "@/engine/draft";
import type {
  DraftEraId,
  DraftPick,
  Formation,
  ManagerTournamentCard,
  PlayerTournamentCard,
} from "@/types/game";

export type ChemistryBreakdown = {
  score: number;
  countryLinks: number;
  yearLinks: number;
  eraLinks: number;
  confederationLinks: number;
  archetypeLinks: number;
  positionFits: number;
  averagePositionFit: number;
  averageEraFit: number;
  managerFit: number;
};

export const calculateManagerFit = (
  manager: ManagerTournamentCard | undefined,
  formation: Formation,
  eraId: DraftEraId,
) => {
  if (!manager) return 75;
  const formationMatch = manager.preferredFormations.includes(formation.id);
  const styleMatch = formation.managerStyles.includes(manager.style);
  const era = getDraftEra(eraId);
  const eraMatch =
    eraId === "all" ||
    Math.abs(manager.tournamentYear - era.midpointYear) <= 8;
  if (formationMatch && styleMatch && eraMatch) return 100;
  if (formationMatch && styleMatch) return 96;
  if (formationMatch || styleMatch) return eraMatch ? 91 : 86;
  return eraMatch ? 82 : 75;
};

export const calculateChemistry = (
  lineup: PlayerTournamentCard[],
  formation: Formation,
  context: {
    picks?: DraftPick[];
    manager?: ManagerTournamentCard;
    eraId?: DraftEraId;
  } = {},
): ChemistryBreakdown => {
  const eraId = context.eraId ?? "all";
  const managerFit = calculateManagerFit(context.manager, formation, eraId);
  if (lineup.length === 0) {
    return {
      score: 0,
      countryLinks: 0,
      yearLinks: 0,
      eraLinks: 0,
      confederationLinks: 0,
      archetypeLinks: 0,
      positionFits: 0,
      averagePositionFit: 0,
      averageEraFit: 0,
      managerFit,
    };
  }

  let countryLinks = 0;
  let yearLinks = 0;
  let eraLinks = 0;
  let confederationLinks = 0;
  let archetypeLinks = 0;

  for (let first = 0; first < lineup.length; first += 1) {
    for (let second = first + 1; second < lineup.length; second += 1) {
      const current = lineup[first];
      const next = lineup[second];
      if (current.countryCode === next.countryCode) countryLinks += 1;
      if (current.tournamentYear === next.tournamentYear) yearLinks += 1;
      if (current.era === next.era) eraLinks += 1;
      if (current.confederation === next.confederation) confederationLinks += 1;
      if (current.archetype === next.archetype) archetypeLinks += 1;
    }
  }

  const fits = lineup.map((player, index) => {
    const pick = context.picks?.find((candidate) => candidate.cardId === player.id);
    const slot = pick
      ? formation.slots.find((candidate) => candidate.id === pick.slotId)
      : formation.slots[index];
    return slot ? getPositionFit(player, slot) : 0;
  });
  const positionFits = fits.filter((fit) => fit >= 88).length;
  const averagePositionFit = Math.round(
    fits.reduce<number>((sum, fit) => sum + fit, 0) / lineup.length,
  );
  const averageEraFit = Math.round(
    lineup.reduce(
      (sum, player) =>
        sum + calculateEraFit(player, eraId, { manager: context.manager, formation }),
      0,
    ) / lineup.length,
  );

  const possibleLinks = Math.max(1, (lineup.length * (lineup.length - 1)) / 2);
  const weightedLinks =
    (countryLinks * 4 +
      yearLinks * 2.5 +
      eraLinks * 1.25 +
      confederationLinks * 0.75 +
      archetypeLinks * 0.5) /
    (possibleLinks * 9);
  const completion = lineup.length / formation.slots.length;
  const score = Math.round(
    Math.min(
      100,
      (34 +
        weightedLinks * 30 +
        averagePositionFit * 0.21 +
        averageEraFit * 0.08 +
        managerFit * 0.07) *
        completion,
    ),
  );

  return {
    score,
    countryLinks,
    yearLinks,
    eraLinks,
    confederationLinks,
    archetypeLinks,
    positionFits,
    averagePositionFit,
    averageEraFit,
    managerFit,
  };
};
