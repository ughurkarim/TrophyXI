import { calculateEraFit } from "@/data/eras";
import { formations } from "@/data/formations";
import { getPositionFit } from "@/engine/draft";
import {
  calculatePlayerLeadership,
  calculateSquadAccoladeEffect,
} from "@/engine/accolade-effects";
import type {
  DraftEraId,
  DraftPick,
  Formation,
  ManagerTournamentCard,
  PlayerTournamentCard,
} from "@/types/game";

export type ChemistryBreakdown = {
  score: number;
  lineupSize: number;
  countryLinks: number;
  yearLinks: number;
  eraLinks: number;
  confederationLinks: number;
  archetypeLinks: number;
  positionFits: number;
  averagePositionFit: number;
  averageEraFit: number;
  managerFit: number;
  leadership: number;
  accoladeBoost: number;
  benchCoverage: number;
  contributions: {
    position: number;
    era: number;
    manager: number;
    links: number;
    leadership: number;
    accolades: number;
    bench: number;
    weakLinks: number;
  };
};

export type ChemistryReason = {
  key:
    | "position"
    | "manager"
    | "era"
    | "leadership"
    | "accolades"
    | "links"
    | "bench"
    | "weak-links";
  label: string;
  value: number;
};

export const chemistryLabel = (score: number) => {
  if (score >= 90) return "ELITE";
  if (score >= 75) return "STRONG";
  if (score >= 60) return "BALANCED";
  if (score >= 40) return "DEVELOPING";
  return "DISCONNECTED";
};

const emptyContributions = (): ChemistryBreakdown["contributions"] => ({
  position: 0,
  era: 0,
  manager: 0,
  links: 0,
  leadership: 0,
  accolades: 0,
  bench: 0,
  weakLinks: 0,
});

const formationsForFit = new Map(
  formations.map((formation) => [formation.id, formation]),
);

export const calculateManagerFit = (
  manager: ManagerTournamentCard | undefined,
  formation: Formation,
  _eraId: DraftEraId,
) => {
  void _eraId;
  if (!manager) return 75;
  const formationMatch = manager.preferredFormations.includes(formation.id);
  if (formationMatch) return 100;
  const acceptableMatch = manager.acceptableFormations.includes(formation.id);
  const styleMatch = formation.managerStyles.includes(manager.style);
  const preferred = manager.preferredFormations
    .map((id) => formationsForFit.get(id))
    .filter((item): item is Formation => Boolean(item));
  const relatedShape = preferred.some((candidate) => {
    const defenderDelta = Math.abs(
      candidate.slots.filter((slot) =>
        ["LB", "LCB", "CB", "RCB", "RB", "LWB", "RWB"].includes(
          slot.position,
        ),
      ).length -
        formation.slots.filter((slot) =>
          ["LB", "LCB", "CB", "RCB", "RB", "LWB", "RWB"].includes(
            slot.position,
          ),
        ).length,
    );
    return defenderDelta <= 1 && Math.abs(candidate.width - formation.width) <= 18;
  });

  if (acceptableMatch && styleMatch) return 94;
  if (acceptableMatch) return 91;
  if (styleMatch && relatedShape) return 87;
  if (styleMatch) return 83;
  if (relatedShape) return 78;
  return 68;
};

export const calculateChemistry = (
  lineup: PlayerTournamentCard[],
  formation: Formation,
  context: {
    picks?: DraftPick[];
    manager?: ManagerTournamentCard;
    eraId?: DraftEraId;
    bench?: PlayerTournamentCard[];
  } = {},
): ChemistryBreakdown => {
  const eraId = context.eraId ?? "all";
  const managerFit = calculateManagerFit(context.manager, formation, eraId);
  if (lineup.length === 0) {
    return {
      score: 0,
      lineupSize: 0,
      countryLinks: 0,
      yearLinks: 0,
      eraLinks: 0,
      confederationLinks: 0,
      archetypeLinks: 0,
      positionFits: 0,
      averagePositionFit: 0,
      averageEraFit: 0,
      managerFit,
      leadership: 0,
      accoladeBoost: 0,
      benchCoverage: 0,
      contributions: emptyContributions(),
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
  const averageEraFit =
    eraId === "all"
      ? 0
      : Math.round(
          lineup.reduce(
            (sum, player) =>
              sum +
              calculateEraFit(player, eraId, {
                manager: context.manager,
                formation,
              }),
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
  const leadership = Math.round(
    lineup.reduce(
      (sum, player) => sum + calculatePlayerLeadership(player),
      0,
    ) / lineup.length,
  );
  const bench = context.bench ?? [];
  const accoladeBoost = calculateSquadAccoladeEffect([
    ...lineup,
    ...bench,
  ]).chemistry;
  const benchCoverage = bench.length
    ? Math.min(
        2,
        bench.length * 0.4 +
          bench.reduce(
            (sum, player) => sum + Math.min(0.24, player.eligiblePositions.length * 0.04),
            0,
          ),
      )
    : 0;
  const weakLinkPenalty =
    lineup.length > 1
      ? (1 - weightedLinks) * Math.min(4, lineup.length * 0.35)
      : 0;
  const rawContributions = {
    position: averagePositionFit * 0.21,
    era: eraId === "all" ? 0 : averageEraFit * 0.08,
    manager: managerFit * 0.11,
    links: weightedLinks * 30,
    leadership: Math.max(0, Math.min(2.4, (leadership - 70) * 0.08)),
    accolades: accoladeBoost,
    bench: benchCoverage,
    weakLinks: -weakLinkPenalty,
  };
  const contributions = Object.fromEntries(
    Object.entries(rawContributions).map(([key, value]) => [
      key,
      Math.round(value * completion),
    ]),
  ) as ChemistryBreakdown["contributions"];
  const score = Math.round(
    Math.min(
      100,
      (27 +
        Object.values(rawContributions).reduce(
          (sum, contribution) => sum + contribution,
          0,
        )) *
        completion,
    ),
  );

  return {
    score,
    lineupSize: lineup.length,
    countryLinks,
    yearLinks,
    eraLinks,
    confederationLinks,
    archetypeLinks,
    positionFits,
    averagePositionFit,
    averageEraFit,
    managerFit,
    leadership,
    accoladeBoost,
    benchCoverage,
    contributions,
  };
};

export const explainChemistryChange = (
  current: ChemistryBreakdown,
  projected: ChemistryBreakdown,
  context: {
    positionFit: number;
    managerFit: number;
    eraFit: number;
  },
): ChemistryReason[] => {
  const difference = (
    key: keyof ChemistryBreakdown["contributions"],
  ) => projected.contributions[key] - current.contributions[key];
  const reasons: ChemistryReason[] = [];
  const position = difference("position");
  if (position !== 0) {
    reasons.push({
      key: "position",
      label:
        context.positionFit >= 96
          ? "Perfect position"
          : context.positionFit >= 88
            ? "Strong position"
            : context.positionFit >= 72
              ? "Adaptable position"
              : "Awkward position",
      value: position,
    });
  }
  const manager = difference("manager");
  if (manager !== 0) {
    reasons.push({
      key: "manager",
      label:
        context.managerFit >= 90
          ? "Strong manager fit"
          : "Manager compatibility",
      value: manager,
    });
  }
  const era = difference("era");
  if (era !== 0) {
    reasons.push({
      key: "era",
      label:
        context.eraFit >= 92 ? "Excellent era fit" : "Era adaptability",
      value: era,
    });
  }
  const leadership = difference("leadership");
  if (leadership !== 0) {
    reasons.push({ key: "leadership", label: "Leadership", value: leadership });
  }
  const accolades = difference("accolades");
  if (accolades !== 0) {
    reasons.push({
      key: "accolades",
      label: "Accolade boost",
      value: accolades,
    });
  }
  const links = difference("links");
  if (links !== 0) {
    reasons.push({ key: "links", label: "Squad connections", value: links });
  }
  const weakLinks = difference("weakLinks");
  if (weakLinks !== 0) {
    reasons.push({
      key: "weak-links",
      label: "Weak squad links",
      value: weakLinks,
    });
  }
  const bench = difference("bench");
  if (bench !== 0) {
    reasons.push({ key: "bench", label: "Bench coverage", value: bench });
  }
  return reasons
    .filter((reason) => reason.value !== 0)
    .sort(
      (first, second) =>
        Math.abs(second.value) - Math.abs(first.value),
    )
    .slice(0, 5);
};
