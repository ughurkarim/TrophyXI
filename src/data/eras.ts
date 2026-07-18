import type {
  DraftEra,
  DraftEraId,
  Formation,
  ManagerTournamentCard,
  PlayerTournamentCard,
  TournamentEra,
} from "@/types/game";

const neutralEnvironment: DraftEra["environment"] = {
  physicalContact: 70,
  pitchSpeed: 70,
  protectiveRefereeing: 70,
  pressingDemand: 70,
  transitionSpeed: 70,
  technicalDemand: 74,
  aerialDemand: 68,
  goalkeeperDistribution: 68,
};

export const draftEras: DraftEra[] = [
  {
    id: "1970s",
    label: "1970s",
    years: "1970—1978",
    yearRange: [1970, 1979],
    midpointYear: 1975,
    description:
      "Heavy contact, slower surfaces, direct buildup, aerial duels, and individual invention.",
    accent: "The Heavy Crown",
    themeClass: "era-theme--century",
    environment: {
      physicalContact: 96,
      pitchSpeed: 45,
      protectiveRefereeing: 38,
      pressingDemand: 48,
      transitionSpeed: 57,
      technicalDemand: 74,
      aerialDemand: 91,
      goalkeeperDistribution: 42,
    },
  },
  {
    id: "1980s",
    label: "1980s",
    years: "1982—1986",
    yearRange: [1980, 1989],
    midpointYear: 1985,
    description:
      "Compact marking, specialist roles, creative tens, physical systems, and direct transitions.",
    accent: "Specialist Theatre",
    themeClass: "era-theme--century",
    environment: {
      physicalContact: 91,
      pitchSpeed: 55,
      protectiveRefereeing: 45,
      pressingDemand: 58,
      transitionSpeed: 66,
      technicalDemand: 78,
      aerialDemand: 84,
      goalkeeperDistribution: 48,
    },
  },
  {
    id: "1990s",
    label: "1990s",
    years: "1990—1998",
    yearRange: [1990, 1999],
    midpointYear: 1995,
    description:
      "Defensive organization, athletic duels, faster transitions, and mixed technical-direct systems.",
    accent: "Iron Organization",
    themeClass: "era-theme--century",
    environment: {
      physicalContact: 86,
      pitchSpeed: 64,
      protectiveRefereeing: 56,
      pressingDemand: 66,
      transitionSpeed: 75,
      technicalDemand: 78,
      aerialDemand: 79,
      goalkeeperDistribution: 56,
    },
  },
  {
    id: "2000s",
    label: "2000s",
    years: "2002—2006",
    yearRange: [2000, 2009],
    midpointYear: 2005,
    description:
      "Greater speed, powerful specialists, growing flexibility, and balanced possession-transition play.",
    accent: "Gilded Acceleration",
    themeClass: "era-theme--all",
    environment: {
      physicalContact: 82,
      pitchSpeed: 73,
      protectiveRefereeing: 65,
      pressingDemand: 72,
      transitionSpeed: 81,
      technicalDemand: 82,
      aerialDemand: 73,
      goalkeeperDistribution: 63,
    },
  },
  {
    id: "2010s",
    label: "2010s",
    years: "2010—2018",
    yearRange: [2010, 2019],
    midpointYear: 2015,
    description:
      "Structured pressing, positional play, technical midfields, buildup, and flexible attacks.",
    accent: "Midnight Masters",
    themeClass: "era-theme--modern",
    environment: {
      physicalContact: 74,
      pitchSpeed: 84,
      protectiveRefereeing: 78,
      pressingDemand: 88,
      transitionSpeed: 87,
      technicalDemand: 91,
      aerialDemand: 65,
      goalkeeperDistribution: 85,
    },
  },
  {
    id: "2020s",
    label: "2020s",
    years: "2022",
    yearRange: [2020, 2029],
    midpointYear: 2022,
    description:
      "Aggressive pressing, rapid transitions, hybrid roles, high lines, and distributor goalkeepers.",
    accent: "Crown of Tomorrow",
    themeClass: "era-theme--new",
    environment: {
      physicalContact: 72,
      pitchSpeed: 92,
      protectiveRefereeing: 84,
      pressingDemand: 96,
      transitionSpeed: 95,
      technicalDemand: 93,
      aerialDemand: 62,
      goalkeeperDistribution: 96,
    },
  },
  {
    id: "all",
    label: "All Eras / Neutral",
    years: "Balanced environment",
    yearRange: [1970, 2022],
    midpointYear: 1998,
    description:
      "Minimal year penalty, balanced assumptions, and greater emphasis on adaptability.",
    accent: "The Grand Archive",
    themeClass: "era-theme--all",
    environment: neutralEnvironment,
  },
];

export const getDraftEra = (id: DraftEraId) =>
  draftEras.find((era) => era.id === id) ?? draftEras.at(-1)!;

// Match era is an environment, never a card-pool filter.
export const isPlayerInDraftEra: (
  player: PlayerTournamentCard,
  eraId: DraftEraId,
) => boolean = () => true;

export const tournamentEraFor = (year: number): TournamentEra => {
  if (year < 1980) return "1970s";
  if (year < 1990) return "1980s";
  if (year < 2000) return "1990s";
  if (year < 2010) return "2000s";
  if (year < 2020) return "2010s";
  return "2020s";
};

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const average = (values: number[]) =>
  values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);

export type EraTranslationContext = {
  manager?: ManagerTournamentCard;
  formation?: Formation;
};

export const calculateEraFit = (
  player: PlayerTournamentCard,
  eraId: DraftEraId,
  context: EraTranslationContext = {},
) => {
  const profile = player.eraTranslation;
  if (eraId === "all") {
    return Math.round(
      clamp(
        96 +
          (profile.timelessness - 70) * 0.025 +
          (average(Object.values(profile)) - 75) * 0.02,
        94,
        100,
      ),
    );
  }

  const era = getDraftEra(eraId);
  const distance = Math.abs(player.tournamentYear - era.midpointYear) / 10;
  const legacyMultiplier = {
    "era-specialist": 1,
    adaptable: 0.72,
    "cross-era": 0.44,
    timeless: 0.18,
  }[player.eraLegacy];

  const modernIntoOld = player.tournamentYear > era.midpointYear;
  const oldIntoModern = player.tournamentYear < era.midpointYear;
  const directionalAdaptability = modernIntoOld
    ? average([
        profile.physicalAdaptability,
        profile.equipmentAdaptability,
        profile.refereeingAdaptability,
        profile.technicalAdaptability,
      ])
    : oldIntoModern
      ? average([
          profile.pressingAdaptability,
          profile.tacticalAdaptability,
          profile.tempoAdaptability,
          profile.technicalAdaptability,
        ])
      : average(Object.values(profile));

  const environmentalAdaptability =
    profile.physicalAdaptability * (era.environment.physicalContact / 100) * 0.18 +
    profile.technicalAdaptability * (era.environment.technicalDemand / 100) * 0.2 +
    profile.tacticalAdaptability * 0.18 +
    profile.pressingAdaptability * (era.environment.pressingDemand / 100) * 0.16 +
    profile.tempoAdaptability * (era.environment.transitionSpeed / 100) * 0.12 +
    profile.equipmentAdaptability * (1 - era.environment.pitchSpeed / 130) * 0.08 +
    profile.refereeingAdaptability *
      (1 - era.environment.protectiveRefereeing / 130) *
      0.08;

  let fit =
    100 -
    distance * 5.2 * legacyMultiplier +
    (directionalAdaptability - 78) * 0.1 +
    (environmentalAdaptability - 58) * 0.08 +
    (profile.timelessness - 75) * 0.06;

  if (
    player.primaryPosition === "GK" &&
    era.environment.goalkeeperDistribution >= 85
  ) {
    fit += (profile.technicalAdaptability - 78) * 0.05;
  }
  if (/press|positional|connector|conductor|reader|versatile/i.test(player.archetype)) {
    fit += 1.2;
  }
  if (context.manager) {
    fit +=
      context.manager.style === "pressing"
        ? (profile.pressingAdaptability - 78) * 0.025
        : (profile.tacticalAdaptability - 78) * 0.02;
  }
  if (context.formation) {
    fit +=
      ((profile.pressingAdaptability - 78) / 22) *
      ((context.formation.pressingSuitability - 70) / 30);
  }

  const minimum = {
    "era-specialist": 58,
    adaptable: 68,
    "cross-era": 80,
    timeless: 90,
  }[player.eraLegacy];
  return Math.round(clamp(fit, minimum, 100));
};
