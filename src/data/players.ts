import { playerSeedSchema } from "@/lib/validation";
import { playerCareerDataByIdentityId } from "@/data/player-career-data";
import tournamentArchiveJson from "@/data/player-tournaments.generated.json";
import type {
  Confederation,
  DataCitation,
  PlayerAttributes,
  PlayerTournamentCard,
  PlayerStatusTier,
  Position,
  QualityBand,
  EraLegacy,
  EraTranslationProfile,
  TournamentAchievement,
  TournamentStatLine,
} from "@/types/game";
import { tournamentEraFor } from "@/data/eras";

// Every number below is an original Trophy XI simulation value. These are not
// official ratings and should not be interpreted as career or historical claims.

type Nation = {
  code: string;
  name: string;
  confederation: Confederation;
};

const nations: Record<string, Nation> = {
  ARG: { code: "ARG", name: "Argentina", confederation: "CONMEBOL" },
  ALG: { code: "ALG", name: "Algeria", confederation: "CAF" },
  AUS: { code: "AUS", name: "Australia", confederation: "AFC" },
  BEL: { code: "BEL", name: "Belgium", confederation: "UEFA" },
  BRA: { code: "BRA", name: "Brazil", confederation: "CONMEBOL" },
  BUL: { code: "BUL", name: "Bulgaria", confederation: "UEFA" },
  CHI: { code: "CHI", name: "Chile", confederation: "CONMEBOL" },
  CMR: { code: "CMR", name: "Cameroon", confederation: "CAF" },
  COL: { code: "COL", name: "Colombia", confederation: "CONMEBOL" },
  CRC: { code: "CRC", name: "Costa Rica", confederation: "CONCACAF" },
  CRO: { code: "CRO", name: "Croatia", confederation: "UEFA" },
  CZE: { code: "CZE", name: "Czech Republic", confederation: "UEFA" },
  CSK: { code: "CSK", name: "Czechoslovakia", confederation: "UEFA" },
  DEN: { code: "DEN", name: "Denmark", confederation: "UEFA" },
  ECU: { code: "ECU", name: "Ecuador", confederation: "CONMEBOL" },
  ENG: { code: "ENG", name: "England", confederation: "UEFA" },
  ESP: { code: "ESP", name: "Spain", confederation: "UEFA" },
  FRA: { code: "FRA", name: "France", confederation: "UEFA" },
  GER: { code: "GER", name: "Germany", confederation: "UEFA" },
  GHA: { code: "GHA", name: "Ghana", confederation: "CAF" },
  ITA: { code: "ITA", name: "Italy", confederation: "UEFA" },
  CIV: { code: "CIV", name: "Côte d’Ivoire", confederation: "CAF" },
  JPN: { code: "JPN", name: "Japan", confederation: "AFC" },
  KOR: { code: "KOR", name: "South Korea", confederation: "AFC" },
  MAR: { code: "MAR", name: "Morocco", confederation: "CAF" },
  MEX: { code: "MEX", name: "Mexico", confederation: "CONCACAF" },
  NED: { code: "NED", name: "Netherlands", confederation: "UEFA" },
  NGA: { code: "NGA", name: "Nigeria", confederation: "CAF" },
  NOR: { code: "NOR", name: "Norway", confederation: "UEFA" },
  NZL: { code: "NZL", name: "New Zealand", confederation: "OFC" },
  PAR: { code: "PAR", name: "Paraguay", confederation: "CONMEBOL" },
  PER: { code: "PER", name: "Peru", confederation: "CONMEBOL" },
  POL: { code: "POL", name: "Poland", confederation: "UEFA" },
  POR: { code: "POR", name: "Portugal", confederation: "UEFA" },
  IRN: { code: "IRN", name: "Iran", confederation: "AFC" },
  ROU: { code: "ROU", name: "Romania", confederation: "UEFA" },
  RUS: { code: "RUS", name: "Russia", confederation: "UEFA" },
  RSA: { code: "RSA", name: "South Africa", confederation: "CAF" },
  KSA: { code: "KSA", name: "Saudi Arabia", confederation: "AFC" },
  SEN: { code: "SEN", name: "Senegal", confederation: "CAF" },
  SRB: { code: "SRB", name: "Serbia", confederation: "UEFA" },
  SUI: { code: "SUI", name: "Switzerland", confederation: "UEFA" },
  SWE: { code: "SWE", name: "Sweden", confederation: "UEFA" },
  SUN: { code: "SUN", name: "Soviet Union", confederation: "UEFA" },
  TUN: { code: "TUN", name: "Tunisia", confederation: "CAF" },
  TUR: { code: "TUR", name: "Türkiye", confederation: "UEFA" },
  UKR: { code: "UKR", name: "Ukraine", confederation: "UEFA" },
  USA: { code: "USA", name: "United States", confederation: "CONCACAF" },
  URU: { code: "URU", name: "Uruguay", confederation: "CONMEBOL" },
};

const defaultsFor = (position: Position, overall: number): PlayerAttributes => {
  if (position === "GK") {
    return {
      attack: 28,
      creativity: Math.max(42, overall - 32),
      control: Math.max(52, overall - 24),
      defense: Math.max(72, overall - 11),
      physical: Math.max(70, overall - 9),
      goalkeeping: overall,
      clutch: Math.max(76, overall - 5),
    };
  }
  if (["LB", "LCB", "CB", "RCB", "RB", "LWB", "RWB"].includes(position)) {
    return {
      attack: Math.max(48, overall - 28),
      creativity: Math.max(55, overall - 23),
      control: Math.max(64, overall - 16),
      defense: Math.min(96, overall + 1),
      physical: Math.max(76, overall - 5),
      goalkeeping: 12,
      clutch: Math.max(75, overall - 8),
    };
  }
  if (["DM", "CM", "AM", "LM", "RM"].includes(position)) {
    return {
      attack: Math.max(68, overall - 13),
      creativity: Math.min(97, overall + 1),
      control: Math.min(97, overall + 2),
      defense: position === "DM" ? overall - 3 : Math.max(58, overall - 21),
      physical: Math.max(68, overall - 14),
      goalkeeping: 10,
      clutch: Math.max(78, overall - 5),
    };
  }
  return {
    attack: Math.min(98, overall + 2),
    creativity: Math.max(72, overall - 9),
    control: Math.max(76, overall - 7),
    defense: Math.max(30, overall - 50),
    physical: Math.max(73, overall - 10),
    goalkeeping: 9,
    clutch: Math.min(98, overall + 1),
  };
};

type CardSeed = {
  id: string;
  playerName: string;
  nation: keyof typeof nations;
  tournamentYear: number;
  primaryPosition: Position;
  eligiblePositions: Position[];
  overall: number;
  archetype: string;
  rarity?: "iconic" | "legendary" | "classic";
  qualityBand?: QualityBand;
  attributes?: Partial<PlayerAttributes>;
  wikipediaTitle?: string;
  finalOverall?: number;
};

const rebalanceRating = (value: number) => {
  if (value >= 99) return 97;
  if (value >= 98) return 94;
  if (value >= 97) return 93;
  if (value >= 96) return 92;
  if (value >= 95) return 90;
  if (value >= 94) return 88;
  if (value >= 93) return 87;
  if (value >= 92) return 85;
  if (value >= 91) return 83;
  if (value >= 90) return 81;
  if (value >= 89) return 79;
  if (value >= 88) return 77;
  if (value >= 87) return 75;
  if (value >= 86) return 73;
  if (value >= 85) return 70;
  if (value >= 84) return 68;
  if (value >= 83) return 66;
  return 65;
};

const tournamentRatingOverrides: Record<string, number> = {
  "pele-1970": 99,
  "diego-maradona-1986": 99,
  "lionel-messi-2022": 99,
  "lionel-messi-2006": 80,
  "lionel-messi-2010": 89,
  "lionel-messi-2018": 86,
  "cristiano-ronaldo-2006": 88,
  "cristiano-ronaldo-2010": 84,
  "cristiano-ronaldo-2014": 78,
  "cristiano-ronaldo-2018": 93,
  "cristiano-ronaldo-2022": 77,
  "ronaldo-2002": 98,
  "franz-beckenbauer-1974": 97,
  "johan-cruyff-1974": 97,
  "kylian-mbappe-2022": 97,
  "lothar-matthaus-1990": 94,
  "mario-kempes-1978": 96,
  "paolo-rossi-1982": 96,
  "salvatore-schillaci-1990": 96,
  "romario-1994": 96,
  "ronaldo-1998": 96,
  "oliver-kahn-2002": 96,
  "zinedine-zidane-2006": 96,
  "diego-forlan-2010": 96,
  "lionel-messi-2014": 96,
  "luka-modric-2018": 96,
  "cafu-2002": 92,
  "dele-alli-2018": 80,
  "neymar-2014": 90,
  "harry-kane-2018": 92,
  "romelu-lukaku-2018": 88,
};

export const playerStatusFor = (overall: number): PlayerStatusTier => {
  if (overall >= 98) return "legend";
  if (overall >= 94) return "icon";
  if (overall >= 90) return "elite";
  if (overall >= 85) return "standout";
  if (overall >= 80) return "reliable";
  if (overall >= 74) return "role-player";
  return "limited";
};

const qualityBandFor = (overall: number): QualityBand => {
  if (overall >= 94) return "iconic";
  if (overall >= 90) return "elite";
  if (overall >= 85) return "standout";
  if (overall >= 80) return "reliable";
  if (overall >= 74) return "role-player";
  return "limited";
};

const modeledTagsFor = (
  seed: CardSeed,
  attributes: PlayerAttributes,
): string[] => {
  const strengths = [
    ["attack", attributes.attack, "Final-third threat"],
    ["creativity", attributes.creativity, "Chance creator"],
    ["control", attributes.control, "Press resistant"],
    ["defense", attributes.defense, "Ball winner"],
    ["physical", attributes.physical, "Duel strength"],
    ["goalkeeping", attributes.goalkeeping, "Goalkeeper craft"],
    ["clutch", attributes.clutch, "High-leverage model"],
  ] as const;
  return [
    ...new Set([
      seed.archetype,
      ...strengths
        .filter(
          ([key]) => key !== "goalkeeping" || seed.primaryPosition === "GK",
        )
        .sort((first, second) => second[1] - first[1])
        .slice(0, 2)
        .map(([, , label]) => label),
    ]),
  ].slice(0, 3);
};

const fifa2018AwardsSource: DataCitation = {
  label: "Golden consolation for magical Modric",
  url: "https://inside.fifa.com/en/tournaments/mens/worldcup/2018russia/news/157-awards-piece-2986294",
  publisher: "FIFA",
  accessedOn: "2026-07-18",
};

const fifa2018StatsSource: DataCitation = {
  label: "Will World Cup stars shine at The Best?",
  url: "https://inside.fifa.com/en/tournaments/mens/worldcup/2018russia/news/will-world-cup-stars-shine-at-the-best",
  publisher: "FIFA",
  accessedOn: "2026-07-18",
};

const fifa2022AwardsSource: DataCitation = {
  label: "FIFA World Cup Qatar 2022 summary",
  url: "https://publications.fifa.com/en/annual-report-2022/2022-at-a-glance/fifa-world-cup-qatar-2022-summary/",
  publisher: "FIFA",
  accessedOn: "2026-07-18",
};

const achievement = (
  id: string,
  label: string,
  description: string,
  ratingEffect: number,
  source: DataCitation,
): TournamentAchievement => ({
  id,
  label,
  description,
  ratingEffect,
  source,
});

type Evidence = {
  stats?: Partial<TournamentStatLine>;
  sources?: DataCitation[];
  achievements?: TournamentAchievement[];
};

type GeneratedTournamentAppearance = {
  playerId: string;
  tournamentYear: number;
  teamCode: string;
  teamName: string;
  teamPerformance: string;
  appearances: number;
  starts: number;
  goals: number;
  primaryPosition: Position;
  eligiblePositions: Position[];
  awards: {
    id: string;
    label: string;
    shared: boolean;
  }[];
};

type GeneratedTournamentArchive = {
  source: {
    name: string;
    version: string;
    url: string;
    accessedOn: string;
  };
  identities: Record<string, GeneratedTournamentAppearance[]>;
  unresolvedIdentityIds: string[];
};

const tournamentArchive =
  tournamentArchiveJson as unknown as GeneratedTournamentArchive;

const fjelstulTournamentSource: DataCitation = {
  label: `${tournamentArchive.source.name} v${tournamentArchive.source.version} — player appearances, goals, and awards`,
  url: tournamentArchive.source.url,
  publisher: "Joshua C. Fjelstul, Ph.D.",
  accessedOn: tournamentArchive.source.accessedOn,
};

const generatedEvidenceByCardId = new Map<string, Evidence>();
for (const [identityId, tournaments] of Object.entries(
  tournamentArchive.identities,
)) {
  for (const tournament of tournaments) {
    generatedEvidenceByCardId.set(
      `${identityId}-${tournament.tournamentYear}`,
      {
        stats: {
          appearances: tournament.appearances,
          starts: tournament.starts,
          goals: tournament.goals,
        },
        sources: [fjelstulTournamentSource],
        achievements: tournament.awards.map((award) =>
          achievement(
            `fjelstul-${award.id.toLocaleLowerCase()}-${tournament.tournamentYear}`,
            award.label,
            `${award.shared ? "Shared " : ""}${award.label} recorded for the ${tournament.tournamentYear} tournament.`,
            award.label === "Golden Ball" ? 0.45 : 0.25,
            fjelstulTournamentSource,
          ),
        ),
      },
    );
  }
}

const curatedEvidenceByCardId: Record<string, Evidence> = {
  "luka-modric-2018": {
    stats: { appearances: 7, minutes: 694, goals: 2, assists: 1 },
    sources: [fifa2018StatsSource],
    achievements: [
      achievement(
        "golden-ball-2018",
        "Golden Ball",
        "Named the tournament’s best player by the FIFA Technical Study Group.",
        0.45,
        fifa2018AwardsSource,
      ),
    ],
  },
  "thibaut-courtois-2018": {
    stats: { cleanSheets: 3 },
    sources: [fifa2018StatsSource],
    achievements: [
      achievement(
        "golden-glove-2018",
        "Golden Glove",
        "Named the tournament’s outstanding goalkeeper.",
        0.35,
        fifa2018AwardsSource,
      ),
    ],
  },
  "kylian-mbappe-2018": {
    stats: { goals: 4 },
    sources: [fifa2018StatsSource],
    achievements: [
      achievement(
        "young-player-2018",
        "Young Player Award",
        "Received FIFA’s Young Player Award at Russia 2018.",
        0.3,
        fifa2018AwardsSource,
      ),
    ],
  },
  "antoine-griezmann-2018": {
    stats: { goals: 4, assists: 2 },
    sources: [fifa2018AwardsSource],
    achievements: [
      achievement(
        "bronze-ball-2018",
        "Bronze Ball",
        "Placed third in the tournament’s best-player voting.",
        0.25,
        fifa2018AwardsSource,
      ),
    ],
  },
  "harry-kane-2018": {
    stats: { goals: 6 },
    sources: [fifa2018AwardsSource],
    achievements: [
      achievement(
        "golden-boot-2018",
        "Golden Boot",
        "Finished as the tournament’s top scorer with six goals.",
        0.35,
        fifa2018AwardsSource,
      ),
    ],
  },
  "lionel-messi-2022": {
    achievements: [
      achievement(
        "golden-ball-2022",
        "Golden Ball",
        "Named the best player of the 2022 tournament.",
        0.45,
        fifa2022AwardsSource,
      ),
    ],
  },
  "kylian-mbappe-2022": {
    achievements: [
      achievement(
        "golden-boot-2022",
        "Golden Boot",
        "Named the 2022 tournament’s top scorer.",
        0.35,
        fifa2022AwardsSource,
      ),
    ],
  },
  "emiliano-martinez-2022": {
    achievements: [
      achievement(
        "golden-glove-2022",
        "Golden Glove",
        "Named the outstanding goalkeeper of the 2022 tournament.",
        0.35,
        fifa2022AwardsSource,
      ),
    ],
  },
  "enzo-fernandez-2022": {
    achievements: [
      achievement(
        "young-player-2022",
        "Young Player Award",
        "Received FIFA’s Young Player Award at Qatar 2022.",
        0.3,
        fifa2022AwardsSource,
      ),
    ],
  },
};

const makeCard = (seed: CardSeed): PlayerTournamentCard => {
  const nation = nations[seed.nation];
  const playerIdentityId = seed.id.replace(/-\d{4}$/, "");
  const careerData = playerCareerDataByIdentityId.get(playerIdentityId);
  const overall =
    seed.finalOverall ??
    tournamentRatingOverrides[seed.id] ??
    rebalanceRating(seed.overall);
  const base = defaultsFor(seed.primaryPosition, overall);
  const generatedEvidence = generatedEvidenceByCardId.get(seed.id) ?? {};
  const curatedEvidence = curatedEvidenceByCardId[seed.id] ?? {};
  const evidence: Evidence = {
    stats: {
      ...generatedEvidence.stats,
      ...curatedEvidence.stats,
    },
    sources: [
      ...new Map(
        [
          ...(generatedEvidence.sources ?? []),
          ...(curatedEvidence.sources ?? []),
        ].map((source) => [source.url, source]),
      ).values(),
    ],
    achievements: [
      ...new Map(
        [
          ...(generatedEvidence.achievements ?? []),
          ...(curatedEvidence.achievements ?? []),
        ].map((item) => [item.label, item]),
      ).values(),
    ],
  };
  const rebalancedOverrides = Object.fromEntries(
    Object.entries(seed.attributes ?? {}).map(([key, value]) => [
      key,
      rebalanceRating(value),
    ]),
  ) as Partial<PlayerAttributes>;
  const attributes = { ...base, ...rebalancedOverrides };
  const eraLegacy: EraLegacy =
    /pel[eé]|lionel-messi|diego-maradona|franz-beckenbauer|johan-cruyff/i.test(
      seed.id,
    )
      ? "timeless"
      : overall >= 94
        ? "cross-era"
        : overall >= 88
          ? "adaptable"
          : "era-specialist";
  const legacyBoost = {
    "era-specialist": 0,
    adaptable: 5,
    "cross-era": 10,
    timeless: 16,
  }[eraLegacy];
  const eraTranslation: EraTranslationProfile = {
    timelessness: Math.min(99, 64 + legacyBoost + Math.round(overall * 0.18)),
    physicalAdaptability: Math.min(
      99,
      Math.round(attributes.physical * 0.72 + overall * 0.18 + legacyBoost),
    ),
    technicalAdaptability: Math.min(
      99,
      Math.round(
        (attributes.control + attributes.creativity) * 0.38 +
          overall * 0.12 +
          legacyBoost,
      ),
    ),
    tacticalAdaptability: Math.min(
      99,
      Math.round(
        (attributes.control + attributes.defense + attributes.creativity) *
          0.23 +
          overall * 0.12 +
          legacyBoost,
      ),
    ),
    pressingAdaptability: Math.min(
      99,
      Math.round(
        (attributes.physical + attributes.defense + attributes.control) * 0.22 +
          overall * 0.14 +
          legacyBoost,
      ),
    ),
    tempoAdaptability: Math.min(
      99,
      Math.round(
        (attributes.physical + attributes.control + attributes.creativity) *
          0.22 +
          overall * 0.14 +
          legacyBoost,
      ),
    ),
    equipmentAdaptability: Math.min(
      99,
      Math.round(
        (attributes.physical + attributes.control) * 0.34 +
          overall * 0.14 +
          legacyBoost,
      ),
    ),
    refereeingAdaptability: Math.min(
      99,
      Math.round(
        (attributes.physical + attributes.clutch) * 0.32 +
          overall * 0.16 +
          legacyBoost,
      ),
    ),
  };
  return {
    id: seed.id,
    playerIdentityId,
    playerName: seed.playerName,
    countryCode: nation.code,
    countryName: nation.name,
    confederation: nation.confederation,
    tournamentYear: seed.tournamentYear,
    primaryPosition: seed.primaryPosition,
    eligiblePositions: seed.eligiblePositions,
    overall,
    attributes,
    era: tournamentEraFor(seed.tournamentYear),
    archetype: seed.archetype,
    qualityBand: qualityBandFor(overall),
    statusTier: playerStatusFor(overall),
    modeledTags: [
      ...modeledTagsFor(seed, attributes),
      ...(eraLegacy === "timeless" ? ["Timeless"] : []),
    ].slice(0, 4),
    isDraftEligible: true,
    draftIneligibilityReason: null,
    tournamentStats: {
      appearances: null,
      starts: null,
      minutes: null,
      goals: null,
      assists: null,
      cleanSheets: null,
      saves: null,
      ...evidence.stats,
    },
    statSources: evidence.sources ?? [],
    achievements: evidence.achievements ?? [],
    careerStats: careerData?.careerStats ?? null,
    careerAccolades: careerData?.accolades ?? [],
    top100Player: careerData?.top100Player ?? false,
    ...(careerData?.top100Source
      ? { top100Source: careerData.top100Source }
      : {}),
    imageId: seed.id,
    eraLegacy,
    eraTranslation,
  };
};

const curatedSeeds: CardSeed[] = [
  // Goalkeepers (7)
  { id: "fabien-barthez-1998", playerName: "Fabien Barthez", nation: "FRA", tournamentYear: 1998, primaryPosition: "GK", eligiblePositions: ["GK"], overall: 88, archetype: "Fearless sweeper", rarity: "classic" },
  { id: "oliver-kahn-2002", playerName: "Oliver Kahn", nation: "GER", tournamentYear: 2002, primaryPosition: "GK", eligiblePositions: ["GK"], overall: 94, archetype: "Iron wall", rarity: "iconic", attributes: { clutch: 96, physical: 91 } },
  { id: "gianluigi-buffon-2006", playerName: "Gianluigi Buffon", nation: "ITA", tournamentYear: 2006, primaryPosition: "GK", eligiblePositions: ["GK"], overall: 95, archetype: "Commanding keeper", rarity: "iconic", attributes: { clutch: 96 } },
  { id: "iker-casillas-2010", playerName: "Iker Casillas", nation: "ESP", tournamentYear: 2010, primaryPosition: "GK", eligiblePositions: ["GK"], overall: 94, archetype: "Reflex captain", rarity: "iconic", attributes: { clutch: 97 } },
  { id: "manuel-neuer-2014", playerName: "Manuel Neuer", nation: "GER", tournamentYear: 2014, primaryPosition: "GK", eligiblePositions: ["GK"], overall: 96, archetype: "Eleventh outfielder", rarity: "iconic", attributes: { creativity: 76, control: 82, physical: 91 } },
  { id: "thibaut-courtois-2018", playerName: "Thibaut Courtois", nation: "BEL", tournamentYear: 2018, primaryPosition: "GK", eligiblePositions: ["GK"], overall: 92, archetype: "Long-reach stopper", rarity: "legendary" },
  { id: "emiliano-martinez-2022", playerName: "Emiliano Martínez", nation: "ARG", tournamentYear: 2022, primaryPosition: "GK", eligiblePositions: ["GK"], overall: 92, archetype: "Shootout specialist", rarity: "legendary", attributes: { clutch: 98 } },

  // Defenders (16)
  { id: "lilian-thuram-1998", playerName: "Lilian Thuram", nation: "FRA", tournamentYear: 1998, primaryPosition: "RB", eligiblePositions: ["RB", "RCB", "CB"], overall: 93, archetype: "Lockdown runner", rarity: "iconic", attributes: { attack: 75, clutch: 96 } },
  { id: "marcel-desailly-1998", playerName: "Marcel Desailly", nation: "FRA", tournamentYear: 1998, primaryPosition: "CB", eligiblePositions: ["CB", "LCB", "RCB", "DM"], overall: 92, archetype: "Power stopper", rarity: "legendary" },
  { id: "roberto-carlos-2002", playerName: "Roberto Carlos", nation: "BRA", tournamentYear: 2002, primaryPosition: "LB", eligiblePositions: ["LB", "LWB", "LM"], overall: 93, archetype: "Explosive wing-back", rarity: "iconic", attributes: { attack: 88, creativity: 83, physical: 94 } },
  { id: "cafu-2002", playerName: "Cafu", nation: "BRA", tournamentYear: 2002, primaryPosition: "RB", eligiblePositions: ["RB", "RWB", "RM"], overall: 92, archetype: "Endless overlap", rarity: "iconic", attributes: { attack: 82, control: 86, physical: 92 } },
  { id: "lucio-2002", playerName: "Lúcio", nation: "BRA", tournamentYear: 2002, primaryPosition: "CB", eligiblePositions: ["CB", "LCB", "RCB"], overall: 90, archetype: "Front-foot defender", rarity: "legendary", attributes: { physical: 94 } },
  { id: "fabio-cannavaro-2006", playerName: "Fabio Cannavaro", nation: "ITA", tournamentYear: 2006, primaryPosition: "CB", eligiblePositions: ["CB", "LCB", "RCB"], overall: 96, archetype: "Perfect reader", rarity: "iconic", attributes: { defense: 98, clutch: 97 } },
  { id: "gianluca-zambrotta-2006", playerName: "Gianluca Zambrotta", nation: "ITA", tournamentYear: 2006, primaryPosition: "LB", eligiblePositions: ["LB", "RB", "LWB", "RWB"], overall: 90, archetype: "Two-sided fullback", rarity: "legendary", attributes: { attack: 77, control: 84 } },
  { id: "marco-materazzi-2006", playerName: "Marco Materazzi", nation: "ITA", tournamentYear: 2006, primaryPosition: "LCB", eligiblePositions: ["LCB", "CB"], overall: 88, archetype: "Aerial enforcer", rarity: "classic", attributes: { physical: 94, clutch: 92 } },
  { id: "sergio-ramos-2010", playerName: "Sergio Ramos", nation: "ESP", tournamentYear: 2010, primaryPosition: "RB", eligiblePositions: ["RB", "RCB", "CB"], overall: 91, archetype: "Aggressive marker", rarity: "legendary", attributes: { physical: 92 } },
  { id: "carles-puyol-2010", playerName: "Carles Puyol", nation: "ESP", tournamentYear: 2010, primaryPosition: "CB", eligiblePositions: ["CB", "LCB", "RCB"], overall: 94, archetype: "Last-line leader", rarity: "iconic", attributes: { defense: 96, clutch: 96 } },
  { id: "philipp-lahm-2014", playerName: "Philipp Lahm", nation: "GER", tournamentYear: 2014, primaryPosition: "RB", eligiblePositions: ["RB", "LB", "DM", "CM"], overall: 94, archetype: "Tactical compass", rarity: "iconic", attributes: { creativity: 91, control: 94, defense: 93 } },
  { id: "mats-hummels-2014", playerName: "Mats Hummels", nation: "GER", tournamentYear: 2014, primaryPosition: "LCB", eligiblePositions: ["LCB", "CB", "RCB"], overall: 91, archetype: "Progressive stopper", rarity: "legendary", attributes: { control: 86, clutch: 92 } },
  { id: "raphael-varane-2018", playerName: "Raphaël Varane", nation: "FRA", tournamentYear: 2018, primaryPosition: "RCB", eligiblePositions: ["RCB", "CB", "LCB"], overall: 92, archetype: "Recovery defender", rarity: "legendary", attributes: { physical: 93 } },
  { id: "lucas-hernandez-2018", playerName: "Lucas Hernández", nation: "FRA", tournamentYear: 2018, primaryPosition: "LB", eligiblePositions: ["LB", "LCB", "CB"], overall: 87, archetype: "Hard-edge fullback", rarity: "classic" },
  { id: "cristian-romero-2022", playerName: "Cristian Romero", nation: "ARG", tournamentYear: 2022, primaryPosition: "RCB", eligiblePositions: ["RCB", "CB", "LCB"], overall: 90, archetype: "Duel hunter", rarity: "legendary", attributes: { physical: 92 } },
  { id: "achraf-hakimi-2022", playerName: "Achraf Hakimi", nation: "MAR", tournamentYear: 2022, primaryPosition: "RWB", eligiblePositions: ["RWB", "RB", "RM"], overall: 90, archetype: "Transition sprinter", rarity: "legendary", attributes: { attack: 83, physical: 92 } },

  // Midfielders (17)
  { id: "zinedine-zidane-1998", playerName: "Zinedine Zidane", nation: "FRA", tournamentYear: 1998, primaryPosition: "AM", eligiblePositions: ["AM", "CM", "CF"], overall: 96, archetype: "Grand conductor", rarity: "iconic", attributes: { attack: 91, creativity: 98, control: 98, clutch: 98 } },
  { id: "didier-deschamps-1998", playerName: "Didier Deschamps", nation: "FRA", tournamentYear: 1998, primaryPosition: "DM", eligiblePositions: ["DM", "CM"], overall: 87, archetype: "Midfield anchor", rarity: "classic", attributes: { defense: 90, physical: 88 } },
  { id: "rivaldo-2002", playerName: "Rivaldo", nation: "BRA", tournamentYear: 2002, primaryPosition: "AM", eligiblePositions: ["AM", "CF", "LW", "ST"], overall: 94, archetype: "Left-foot creator", rarity: "iconic", attributes: { attack: 95, clutch: 96 } },
  { id: "ronaldinho-2002", playerName: "Ronaldinho", nation: "BRA", tournamentYear: 2002, primaryPosition: "AM", eligiblePositions: ["AM", "LW", "LM", "CF"], overall: 91, archetype: "Improvisational ten", rarity: "legendary", attributes: { creativity: 97, control: 96 } },
  { id: "andrea-pirlo-2006", playerName: "Andrea Pirlo", nation: "ITA", tournamentYear: 2006, primaryPosition: "CM", eligiblePositions: ["CM", "DM", "AM"], overall: 94, archetype: "Deep architect", rarity: "iconic", attributes: { creativity: 98, control: 97, clutch: 95 } },
  { id: "gennaro-gattuso-2006", playerName: "Gennaro Gattuso", nation: "ITA", tournamentYear: 2006, primaryPosition: "DM", eligiblePositions: ["DM", "CM"], overall: 87, archetype: "Ball-winning engine", rarity: "classic", attributes: { defense: 93, physical: 94 } },
  { id: "xavi-2010", playerName: "Xavi", nation: "ESP", tournamentYear: 2010, primaryPosition: "CM", eligiblePositions: ["CM", "AM", "DM"], overall: 96, archetype: "Tempo master", rarity: "iconic", attributes: { creativity: 98, control: 99 } },
  { id: "andres-iniesta-2010", playerName: "Andrés Iniesta", nation: "ESP", tournamentYear: 2010, primaryPosition: "AM", eligiblePositions: ["AM", "CM", "LW", "LM"], overall: 96, archetype: "Pressure escape artist", rarity: "iconic", attributes: { attack: 89, creativity: 98, control: 99, clutch: 99 } },
  { id: "sergio-busquets-2010", playerName: "Sergio Busquets", nation: "ESP", tournamentYear: 2010, primaryPosition: "DM", eligiblePositions: ["DM", "CM"], overall: 91, archetype: "Positional pivot", rarity: "legendary", attributes: { defense: 92, control: 95 } },
  { id: "toni-kroos-2014", playerName: "Toni Kroos", nation: "GER", tournamentYear: 2014, primaryPosition: "CM", eligiblePositions: ["CM", "DM", "AM"], overall: 94, archetype: "Precision passer", rarity: "iconic", attributes: { creativity: 97, control: 97, clutch: 95 } },
  { id: "bastian-schweinsteiger-2014", playerName: "Bastian Schweinsteiger", nation: "GER", tournamentYear: 2014, primaryPosition: "DM", eligiblePositions: ["DM", "CM"], overall: 92, archetype: "Finals warrior", rarity: "legendary", attributes: { defense: 91, physical: 94, clutch: 97 } },
  { id: "paul-pogba-2018", playerName: "Paul Pogba", nation: "FRA", tournamentYear: 2018, primaryPosition: "CM", eligiblePositions: ["CM", "DM", "AM"], overall: 91, archetype: "Vertical playmaker", rarity: "legendary", attributes: { attack: 85, creativity: 93, physical: 92 } },
  { id: "ngolo-kante-2018", playerName: "N’Golo Kanté", nation: "FRA", tournamentYear: 2018, primaryPosition: "DM", eligiblePositions: ["DM", "CM"], overall: 94, archetype: "Omnipresent ball-winner", rarity: "iconic", attributes: { defense: 97, physical: 94 } },
  { id: "luka-modric-2018", playerName: "Luka Modrić", nation: "CRO", tournamentYear: 2018, primaryPosition: "CM", eligiblePositions: ["CM", "AM", "DM"], overall: 96, archetype: "Elastic conductor", rarity: "iconic", attributes: { creativity: 98, control: 98, clutch: 97 } },
  { id: "kevin-de-bruyne-2018", playerName: "Kevin De Bruyne", nation: "BEL", tournamentYear: 2018, primaryPosition: "AM", eligiblePositions: ["AM", "CM", "RM"], overall: 92, archetype: "Chance engineer", rarity: "legendary", attributes: { attack: 88, creativity: 97 } },
  { id: "enzo-fernandez-2022", playerName: "Enzo Fernández", nation: "ARG", tournamentYear: 2022, primaryPosition: "CM", eligiblePositions: ["CM", "DM"], overall: 88, archetype: "Progressive controller", rarity: "classic", attributes: { control: 91 } },
  { id: "mohammed-kudus-2022", playerName: "Mohammed Kudus", nation: "GHA", tournamentYear: 2022, primaryPosition: "AM", eligiblePositions: ["AM", "CM", "RW", "CF"], overall: 86, archetype: "Driving creator", rarity: "classic", attributes: { attack: 86, physical: 88 } },

  // Forwards (18)
  { id: "thierry-henry-1998", playerName: "Thierry Henry", nation: "FRA", tournamentYear: 1998, primaryPosition: "LW", eligiblePositions: ["LW", "LM", "ST", "CF"], overall: 88, archetype: "Breakaway threat", rarity: "classic", attributes: { attack: 91, physical: 88 } },
  { id: "davor-suker-1998", playerName: "Davor Šuker", nation: "CRO", tournamentYear: 1998, primaryPosition: "ST", eligiblePositions: ["ST", "CF"], overall: 91, archetype: "Golden finisher", rarity: "legendary", attributes: { clutch: 95 } },
  { id: "ronaldo-2002", playerName: "Ronaldo", nation: "BRA", tournamentYear: 2002, primaryPosition: "ST", eligiblePositions: ["ST", "CF"], overall: 98, archetype: "Phenomenal nine", rarity: "iconic", attributes: { attack: 99, control: 96, physical: 95, clutch: 99 }, wikipediaTitle: "Ronaldo (Brazilian footballer)" },
  { id: "miroslav-klose-2002", playerName: "Miroslav Klose", nation: "GER", tournamentYear: 2002, primaryPosition: "ST", eligiblePositions: ["ST"], overall: 88, archetype: "Aerial poacher", rarity: "classic", attributes: { physical: 91, clutch: 91 } },
  { id: "francesco-totti-2006", playerName: "Francesco Totti", nation: "ITA", tournamentYear: 2006, primaryPosition: "CF", eligiblePositions: ["CF", "ST", "AM"], overall: 90, archetype: "False-nine creator", rarity: "legendary", attributes: { creativity: 94, clutch: 94 } },
  { id: "fernando-torres-2010", playerName: "Fernando Torres", nation: "ESP", tournamentYear: 2010, primaryPosition: "ST", eligiblePositions: ["ST", "CF"], overall: 86, archetype: "Channel runner", rarity: "classic", attributes: { physical: 88 } },
  { id: "david-villa-2010", playerName: "David Villa", nation: "ESP", tournamentYear: 2010, primaryPosition: "LW", eligiblePositions: ["LW", "ST", "CF"], overall: 94, archetype: "Diagonal finisher", rarity: "iconic", attributes: { attack: 97, clutch: 97 } },
  { id: "diego-forlan-2010", playerName: "Diego Forlán", nation: "URU", tournamentYear: 2010, primaryPosition: "CF", eligiblePositions: ["CF", "ST", "AM"], overall: 95, archetype: "Long-range talisman", rarity: "iconic", attributes: { attack: 96, creativity: 94, clutch: 97 } },
  { id: "lionel-messi-2014", playerName: "Lionel Messi", nation: "ARG", tournamentYear: 2014, primaryPosition: "RW", eligiblePositions: ["RW", "CF", "AM", "ST"], overall: 95, archetype: "Gravity creator", rarity: "iconic", attributes: { attack: 97, creativity: 99, control: 99, clutch: 96 } },
  { id: "thomas-muller-2014", playerName: "Thomas Müller", nation: "GER", tournamentYear: 2014, primaryPosition: "RW", eligiblePositions: ["RW", "RM", "CF", "ST"], overall: 93, archetype: "Space interpreter", rarity: "iconic", attributes: { attack: 95, clutch: 96 } },
  { id: "arjen-robben-2014", playerName: "Arjen Robben", nation: "NED", tournamentYear: 2014, primaryPosition: "RW", eligiblePositions: ["RW", "RM", "CF"], overall: 95, archetype: "Inside-cut winger", rarity: "iconic", attributes: { attack: 96, control: 96, physical: 90 } },
  { id: "neymar-2014", playerName: "Neymar", nation: "BRA", tournamentYear: 2014, primaryPosition: "LW", eligiblePositions: ["LW", "LM", "AM", "CF"], overall: 93, archetype: "Electric playmaker", rarity: "legendary", attributes: { attack: 95, creativity: 96, control: 97 } },
  { id: "antoine-griezmann-2018", playerName: "Antoine Griezmann", nation: "FRA", tournamentYear: 2018, primaryPosition: "CF", eligiblePositions: ["CF", "ST", "AM", "RW"], overall: 94, archetype: "Linking forward", rarity: "iconic", attributes: { creativity: 93, clutch: 97 } },
  { id: "kylian-mbappe-2018", playerName: "Kylian Mbappé", nation: "FRA", tournamentYear: 2018, primaryPosition: "RW", eligiblePositions: ["RW", "LW", "ST", "CF"], overall: 94, archetype: "Transition phenomenon", rarity: "iconic", attributes: { attack: 97, physical: 95, clutch: 96 } },
  { id: "kylian-mbappe-2022", playerName: "Kylian Mbappé", nation: "FRA", tournamentYear: 2022, primaryPosition: "LW", eligiblePositions: ["LW", "RW", "ST", "CF"], overall: 98, archetype: "Finals force", rarity: "iconic", attributes: { attack: 99, physical: 96, clutch: 99 } },
  { id: "lionel-messi-2022", playerName: "Lionel Messi", nation: "ARG", tournamentYear: 2022, primaryPosition: "CF", eligiblePositions: ["CF", "ST", "AM", "RW"], overall: 99, archetype: "Complete talisman", rarity: "iconic", attributes: { attack: 99, creativity: 99, control: 99, clutch: 99 } },
  { id: "julian-alvarez-2022", playerName: "Julián Álvarez", nation: "ARG", tournamentYear: 2022, primaryPosition: "ST", eligiblePositions: ["ST", "CF", "RW"], overall: 90, archetype: "Pressing finisher", rarity: "legendary", attributes: { physical: 91, clutch: 93 } },
  { id: "ismaila-sarr-2022", playerName: "Ismaïla Sarr", nation: "SEN", tournamentYear: 2022, primaryPosition: "LW", eligiblePositions: ["LW", "LM", "RW", "ST"], overall: 86, archetype: "Direct attacker", rarity: "classic", attributes: { physical: 90 } },

  // Archive expansion — 1998
  { id: "claudio-taffarel-1998", playerName: "Cláudio Taffarel", nation: "BRA", tournamentYear: 1998, primaryPosition: "GK", eligiblePositions: ["GK"], overall: 90, archetype: "Shootout guardian", rarity: "legendary", attributes: { clutch: 94 } },
  { id: "jose-luis-chilavert-1998", playerName: "José Luis Chilavert", nation: "PAR", tournamentYear: 1998, primaryPosition: "GK", eligiblePositions: ["GK"], overall: 88, archetype: "Commanding showman", rarity: "classic", attributes: { attack: 48, creativity: 68, clutch: 92 } },
  { id: "peter-schmeichel-1998", playerName: "Peter Schmeichel", nation: "DEN", tournamentYear: 1998, primaryPosition: "GK", eligiblePositions: ["GK"], overall: 91, archetype: "Penalty-area giant", rarity: "legendary", attributes: { physical: 95 } },
  { id: "bixente-lizarazu-1998", playerName: "Bixente Lizarazu", nation: "FRA", tournamentYear: 1998, primaryPosition: "LB", eligiblePositions: ["LB", "LWB"], overall: 89, archetype: "Relentless flank guard", rarity: "legendary", attributes: { physical: 90 } },
  { id: "laurent-blanc-1998", playerName: "Laurent Blanc", nation: "FRA", tournamentYear: 1998, primaryPosition: "LCB", eligiblePositions: ["LCB", "CB", "RCB"], overall: 92, archetype: "Elegant organizer", rarity: "legendary", attributes: { control: 87, clutch: 94 } },
  { id: "frank-de-boer-1998", playerName: "Frank de Boer", nation: "NED", tournamentYear: 1998, primaryPosition: "LCB", eligiblePositions: ["LCB", "CB", "LB"], overall: 90, archetype: "Passing defender", rarity: "legendary", attributes: { creativity: 84, control: 88 } },
  { id: "paolo-maldini-1998", playerName: "Paolo Maldini", nation: "ITA", tournamentYear: 1998, primaryPosition: "LB", eligiblePositions: ["LB", "LCB", "CB"], overall: 95, archetype: "Defensive aristocrat", rarity: "iconic", attributes: { defense: 98, control: 92, clutch: 96 } },
  { id: "cafu-1998", playerName: "Cafu", nation: "BRA", tournamentYear: 1998, primaryPosition: "RWB", eligiblePositions: ["RWB", "RB", "RM"], overall: 89, archetype: "High-motor captain", rarity: "legendary", attributes: { attack: 80, physical: 92 } },
  { id: "javier-zanetti-1998", playerName: "Javier Zanetti", nation: "ARG", tournamentYear: 1998, primaryPosition: "RB", eligiblePositions: ["RB", "RWB", "DM"], overall: 91, archetype: "Unbreakable runner", rarity: "legendary", attributes: { control: 89, physical: 95 } },
  { id: "christian-panucci-1998", playerName: "Christian Panucci", nation: "ITA", tournamentYear: 1998, primaryPosition: "RB", eligiblePositions: ["RB", "RWB", "RCB"], overall: 87, archetype: "Hard-line fullback", rarity: "classic", attributes: { defense: 90 } },
  { id: "gary-neville-1998", playerName: "Gary Neville", nation: "ENG", tournamentYear: 1998, primaryPosition: "RB", eligiblePositions: ["RB", "RWB", "RCB"], overall: 85, archetype: "Disciplined wide guard", rarity: "classic", attributes: { defense: 88 } },
  { id: "roberto-carlos-1998", playerName: "Roberto Carlos", nation: "BRA", tournamentYear: 1998, primaryPosition: "LWB", eligiblePositions: ["LWB", "LB", "LM"], overall: 91, archetype: "Power flank", rarity: "legendary", attributes: { attack: 86, physical: 95 } },
  { id: "edgar-davids-1998", playerName: "Edgar Davids", nation: "NED", tournamentYear: 1998, primaryPosition: "CM", eligiblePositions: ["CM", "DM", "LM"], overall: 92, archetype: "Midfield pitbull", rarity: "legendary", attributes: { defense: 92, physical: 95 } },
  { id: "dunga-1998", playerName: "Dunga", nation: "BRA", tournamentYear: 1998, primaryPosition: "DM", eligiblePositions: ["DM", "CM"], overall: 89, archetype: "Tournament marshal", rarity: "classic", attributes: { defense: 92, clutch: 92 } },
  { id: "david-beckham-1998", playerName: "David Beckham", nation: "ENG", tournamentYear: 1998, primaryPosition: "RM", eligiblePositions: ["RM", "RW", "CM"], overall: 88, archetype: "Precision crosser", rarity: "classic", attributes: { creativity: 94, clutch: 78 } },
  { id: "rivaldo-1998", playerName: "Rivaldo", nation: "BRA", tournamentYear: 1998, primaryPosition: "AM", eligiblePositions: ["AM", "LW", "CF"], overall: 91, archetype: "Angular creator", rarity: "legendary", attributes: { attack: 92, creativity: 94 } },
  { id: "dennis-bergkamp-1998", playerName: "Dennis Bergkamp", nation: "NED", tournamentYear: 1998, primaryPosition: "AM", eligiblePositions: ["AM", "CF", "ST"], overall: 95, archetype: "Velvet technician", rarity: "iconic", attributes: { attack: 94, creativity: 97, control: 98, clutch: 97 } },
  { id: "ronaldo-1998", playerName: "Ronaldo", nation: "BRA", tournamentYear: 1998, primaryPosition: "ST", eligiblePositions: ["ST", "CF"], overall: 95, archetype: "Unstoppable phenomenon", rarity: "iconic", attributes: { attack: 98, control: 96, physical: 96 }, wikipediaTitle: "Ronaldo (Brazilian footballer)" },
  { id: "michael-owen-1998", playerName: "Michael Owen", nation: "ENG", tournamentYear: 1998, primaryPosition: "ST", eligiblePositions: ["ST", "CF", "RW"], overall: 89, archetype: "Teenage lightning", rarity: "legendary", attributes: { attack: 92, physical: 88 } },
  { id: "marc-overmars-1998", playerName: "Marc Overmars", nation: "NED", tournamentYear: 1998, primaryPosition: "LW", eligiblePositions: ["LW", "LM", "RW"], overall: 88, archetype: "Touchline sprinter", rarity: "classic", attributes: { attack: 89, physical: 90 } },
  { id: "gabriel-batistuta-1998", playerName: "Gabriel Batistuta", nation: "ARG", tournamentYear: 1998, primaryPosition: "ST", eligiblePositions: ["ST", "CF"], overall: 93, archetype: "Thunderous finisher", rarity: "iconic", attributes: { attack: 96, physical: 94, clutch: 94 } },

  // Archive expansion — 2002 and 2006
  { id: "dida-2006", playerName: "Dida", nation: "BRA", tournamentYear: 2006, primaryPosition: "GK", eligiblePositions: ["GK"], overall: 88, archetype: "Calm shot-stopper", rarity: "classic", wikipediaTitle: "Dida (footballer, born 1973)" },
  { id: "philipp-lahm-2006", playerName: "Philipp Lahm", nation: "GER", tournamentYear: 2006, primaryPosition: "LB", eligiblePositions: ["LB", "RB", "LWB"], overall: 91, archetype: "Two-footed problem solver", rarity: "legendary", attributes: { attack: 81, control: 90 } },
  { id: "ashley-cole-2006", playerName: "Ashley Cole", nation: "ENG", tournamentYear: 2006, primaryPosition: "LB", eligiblePositions: ["LB", "LWB"], overall: 91, archetype: "Elite isolation defender", rarity: "legendary", attributes: { defense: 94, physical: 92 } },
  { id: "willy-sagnol-2006", playerName: "Willy Sagnol", nation: "FRA", tournamentYear: 2006, primaryPosition: "RB", eligiblePositions: ["RB", "RWB", "RM"], overall: 87, archetype: "Crossing fullback", rarity: "classic", attributes: { creativity: 84 } },
  { id: "rio-ferdinand-2002", playerName: "Rio Ferdinand", nation: "ENG", tournamentYear: 2002, primaryPosition: "RCB", eligiblePositions: ["RCB", "CB", "LCB"], overall: 90, archetype: "Composed cover defender", rarity: "legendary", attributes: { control: 87, physical: 92 } },
  { id: "zinedine-zidane-2006", playerName: "Zinedine Zidane", nation: "FRA", tournamentYear: 2006, primaryPosition: "AM", eligiblePositions: ["AM", "CM", "CF"], overall: 97, archetype: "Final grand performance", rarity: "iconic", attributes: { attack: 94, creativity: 99, control: 99, clutch: 98 } },
  { id: "michael-ballack-2002", playerName: "Michael Ballack", nation: "GER", tournamentYear: 2002, primaryPosition: "CM", eligiblePositions: ["CM", "AM", "DM"], overall: 93, archetype: "Box-to-box leader", rarity: "iconic", attributes: { attack: 91, physical: 94, clutch: 96 } },
  { id: "claude-makelele-2006", playerName: "Claude Makélélé", nation: "FRA", tournamentYear: 2006, primaryPosition: "DM", eligiblePositions: ["DM", "CM"], overall: 92, archetype: "Space eraser", rarity: "legendary", attributes: { defense: 96, control: 92 } },
  { id: "kaka-2006", playerName: "Kaká", nation: "BRA", tournamentYear: 2006, primaryPosition: "AM", eligiblePositions: ["AM", "CM", "CF"], overall: 90, archetype: "Gliding playmaker", rarity: "legendary", attributes: { attack: 90, creativity: 94, control: 94 } },
  { id: "david-beckham-2002", playerName: "David Beckham", nation: "ENG", tournamentYear: 2002, primaryPosition: "RM", eligiblePositions: ["RM", "RW", "CM"], overall: 91, archetype: "Dead-ball commander", rarity: "legendary", attributes: { creativity: 97, clutch: 94 } },
  { id: "thierry-henry-2006", playerName: "Thierry Henry", nation: "FRA", tournamentYear: 2006, primaryPosition: "LW", eligiblePositions: ["LW", "ST", "CF"], overall: 93, archetype: "Elegant accelerator", rarity: "iconic", attributes: { attack: 96, control: 94 } },
  { id: "cristiano-ronaldo-2006", playerName: "Cristiano Ronaldo", nation: "POR", tournamentYear: 2006, primaryPosition: "LW", eligiblePositions: ["LW", "RW", "LM", "RM"], overall: 90, archetype: "Electric wide threat", rarity: "legendary", attributes: { attack: 92, creativity: 91, physical: 93 } },
  { id: "luis-figo-2006", playerName: "Luís Figo", nation: "POR", tournamentYear: 2006, primaryPosition: "RW", eligiblePositions: ["RW", "RM", "AM"], overall: 91, archetype: "Veteran wing artist", rarity: "legendary", attributes: { creativity: 95, control: 94, clutch: 93 } },

  // Archive expansion — 2010 to 2018
  { id: "marcelo-2014", playerName: "Marcelo", nation: "BRA", tournamentYear: 2014, primaryPosition: "LWB", eligiblePositions: ["LWB", "LB", "LM"], overall: 88, archetype: "Creative overlap", rarity: "classic", attributes: { attack: 84, creativity: 88 } },
  { id: "jordi-alba-2018", playerName: "Jordi Alba", nation: "ESP", tournamentYear: 2018, primaryPosition: "LB", eligiblePositions: ["LB", "LWB", "LM"], overall: 88, archetype: "Blindside runner", rarity: "classic", attributes: { attack: 82, physical: 89 } },
  { id: "maicon-2010", playerName: "Maicon", nation: "BRA", tournamentYear: 2010, primaryPosition: "RWB", eligiblePositions: ["RWB", "RB", "RM"], overall: 91, archetype: "Power overlap", rarity: "legendary", attributes: { attack: 87, physical: 95 } },

  // Archive expansion — 2022
  { id: "yassine-bounou-2022", playerName: "Yassine Bounou", nation: "MAR", tournamentYear: 2022, primaryPosition: "GK", eligiblePositions: ["GK"], overall: 92, archetype: "Knockout guardian", rarity: "legendary", attributes: { clutch: 96 }, wikipediaTitle: "Yassine Bounou" },
  { id: "dominik-livakovic-2022", playerName: "Dominik Livaković", nation: "CRO", tournamentYear: 2022, primaryPosition: "GK", eligiblePositions: ["GK"], overall: 91, archetype: "Shootout wall", rarity: "legendary", attributes: { clutch: 97 } },
  { id: "theo-hernandez-2022", playerName: "Theo Hernández", nation: "FRA", tournamentYear: 2022, primaryPosition: "LWB", eligiblePositions: ["LWB", "LB", "LM"], overall: 91, archetype: "Explosive carrier", rarity: "legendary", attributes: { attack: 86, physical: 94 } },
  { id: "josko-gvardiol-2022", playerName: "Joško Gvardiol", nation: "CRO", tournamentYear: 2022, primaryPosition: "LCB", eligiblePositions: ["LCB", "CB", "LB"], overall: 92, archetype: "Progressive sentinel", rarity: "legendary", attributes: { control: 89, physical: 93 } },
  { id: "nicolas-otamendi-2022", playerName: "Nicolás Otamendi", nation: "ARG", tournamentYear: 2022, primaryPosition: "CB", eligiblePositions: ["CB", "LCB", "RCB"], overall: 91, archetype: "Veteran enforcer", rarity: "legendary", attributes: { defense: 94, physical: 94 } },
  { id: "nahuel-molina-2022", playerName: "Nahuel Molina", nation: "ARG", tournamentYear: 2022, primaryPosition: "RWB", eligiblePositions: ["RWB", "RB", "RM"], overall: 89, archetype: "Final-third runner", rarity: "classic", attributes: { attack: 82, clutch: 92 } },
  { id: "marcos-acuna-2022", playerName: "Marcos Acuña", nation: "ARG", tournamentYear: 2022, primaryPosition: "LWB", eligiblePositions: ["LWB", "LB", "LM"], overall: 87, archetype: "Combative wide outlet", rarity: "classic", attributes: { physical: 92 } },
  { id: "denzel-dumfries-2022", playerName: "Denzel Dumfries", nation: "NED", tournamentYear: 2022, primaryPosition: "RWB", eligiblePositions: ["RWB", "RB", "RM"], overall: 90, archetype: "Back-post force", rarity: "legendary", attributes: { attack: 86, physical: 96 } },
  { id: "marquinhos-2022", playerName: "Marquinhos", nation: "BRA", tournamentYear: 2022, primaryPosition: "RCB", eligiblePositions: ["RCB", "CB", "LCB"], overall: 89, archetype: "Mobile organizer", rarity: "classic", attributes: { control: 88 } },
  { id: "dayot-upamecano-2022", playerName: "Dayot Upamecano", nation: "FRA", tournamentYear: 2022, primaryPosition: "RCB", eligiblePositions: ["RCB", "CB", "LCB"], overall: 90, archetype: "Recovery powerhouse", rarity: "legendary", attributes: { physical: 95 } },
  { id: "luka-modric-2022", playerName: "Luka Modrić", nation: "CRO", tournamentYear: 2022, primaryPosition: "CM", eligiblePositions: ["CM", "AM", "DM"], overall: 93, archetype: "Timeless conductor", rarity: "iconic", attributes: { creativity: 96, control: 97, clutch: 96 } },
  { id: "antoine-griezmann-2022", playerName: "Antoine Griezmann", nation: "FRA", tournamentYear: 2022, primaryPosition: "AM", eligiblePositions: ["AM", "CM", "CF"], overall: 95, archetype: "Total tournament creator", rarity: "iconic", attributes: { creativity: 98, control: 95, defense: 76, clutch: 97 } },
  { id: "alexis-mac-allister-2022", playerName: "Alexis Mac Allister", nation: "ARG", tournamentYear: 2022, primaryPosition: "CM", eligiblePositions: ["CM", "AM", "DM"], overall: 90, archetype: "Balanced connector", rarity: "legendary", attributes: { control: 93, creativity: 92 } },
  { id: "sofyan-amrabat-2022", playerName: "Sofyan Amrabat", nation: "MAR", tournamentYear: 2022, primaryPosition: "DM", eligiblePositions: ["DM", "CM"], overall: 91, archetype: "Midfield shield", rarity: "legendary", attributes: { defense: 94, physical: 95 } },
  { id: "jude-bellingham-2022", playerName: "Jude Bellingham", nation: "ENG", tournamentYear: 2022, primaryPosition: "CM", eligiblePositions: ["CM", "AM", "DM"], overall: 90, archetype: "Driving all-rounder", rarity: "legendary", attributes: { attack: 87, physical: 93 } },
  { id: "frenkie-de-jong-2022", playerName: "Frenkie de Jong", nation: "NED", tournamentYear: 2022, primaryPosition: "CM", eligiblePositions: ["CM", "DM"], overall: 90, archetype: "Press-resistant carrier", rarity: "legendary", attributes: { creativity: 94, control: 96 } },
  { id: "joshua-kimmich-2022", playerName: "Joshua Kimmich", nation: "GER", tournamentYear: 2022, primaryPosition: "DM", eligiblePositions: ["DM", "CM", "RB"], overall: 89, archetype: "Tactical distributor", rarity: "classic", attributes: { creativity: 92, control: 92 } },
  { id: "olivier-giroud-2022", playerName: "Olivier Giroud", nation: "FRA", tournamentYear: 2022, primaryPosition: "ST", eligiblePositions: ["ST", "CF"], overall: 92, archetype: "Reference-point finisher", rarity: "legendary", attributes: { physical: 95, clutch: 95 } },
  { id: "bukayo-saka-2022", playerName: "Bukayo Saka", nation: "ENG", tournamentYear: 2022, primaryPosition: "RW", eligiblePositions: ["RW", "RM", "LW"], overall: 89, archetype: "Brave wide creator", rarity: "legendary", attributes: { attack: 90, creativity: 91 } },
  { id: "richarlison-2022", playerName: "Richarlison", nation: "BRA", tournamentYear: 2022, primaryPosition: "ST", eligiblePositions: ["ST", "CF", "LW"], overall: 90, archetype: "Acrobatic finisher", rarity: "legendary", attributes: { attack: 93, physical: 92 } },
  { id: "cody-gakpo-2022", playerName: "Cody Gakpo", nation: "NED", tournamentYear: 2022, primaryPosition: "LW", eligiblePositions: ["LW", "CF", "ST"], overall: 89, archetype: "Inside-channel scorer", rarity: "legendary", attributes: { attack: 91, physical: 91 } },
  { id: "goncalo-ramos-2022", playerName: "Gonçalo Ramos", nation: "POR", tournamentYear: 2022, primaryPosition: "ST", eligiblePositions: ["ST", "CF"], overall: 88, archetype: "Hat-trick poacher", rarity: "classic", attributes: { attack: 91, clutch: 93 } },
  { id: "ritsu-doan-2022", playerName: "Ritsu Dōan", nation: "JPN", tournamentYear: 2022, primaryPosition: "RW", eligiblePositions: ["RW", "RM", "AM"], overall: 86, archetype: "Fearless match-turner", rarity: "classic", attributes: { clutch: 92 } },
  { id: "son-heung-min-2022", playerName: "Son Heung-min", nation: "KOR", tournamentYear: 2022, primaryPosition: "LW", eligiblePositions: ["LW", "CF", "ST"], overall: 89, archetype: "Masked transition threat", rarity: "legendary", attributes: { attack: 91, physical: 90 } },
];

type SupplementalSeed = readonly [
  playerName: string,
  nation: keyof typeof nations,
  tournamentYear: number,
  primaryPosition: Position,
];

// The expansion deliberately includes more tournament contributors beyond the
// usual all-star lists. Ratings remain original Trophy XI game estimates; no
// nullable tournament statistic below is inferred or silently treated as zero.
const supplementalSeeds: SupplementalSeed[] = [
  // Goalkeepers (15)
  ["Jorge Campos", "MEX", 1998, "GK"],
  ["Edwin van der Sar", "NED", 1998, "GK"],
  ["David Seaman", "ENG", 1998, "GK"],
  ["Rüştü Reçber", "TUR", 2002, "GK"],
  ["Marcos", "BRA", 2002, "GK"],
  ["Lee Woon-jae", "KOR", 2002, "GK"],
  ["Jens Lehmann", "GER", 2006, "GK"],
  ["Ricardo", "POR", 2006, "GK"],
  ["Mark Paston", "NZL", 2010, "GK"],
  ["Tim Howard", "USA", 2014, "GK"],
  ["Keylor Navas", "CRC", 2014, "GK"],
  ["Guillermo Ochoa", "MEX", 2014, "GK"],
  ["Hugo Lloris", "FRA", 2018, "GK"],
  ["Danijel Subašić", "CRO", 2018, "GK"],
  ["Mathew Ryan", "AUS", 2018, "GK"],

  // Defenders (30)
  ["Jaap Stam", "NED", 1998, "CB"],
  ["Sol Campbell", "ENG", 2002, "CB"],
  ["Alpay Özalan", "TUR", 2002, "RCB"],
  ["Hong Myung-bo", "KOR", 2002, "CB"],
  ["Alessandro Nesta", "ITA", 2006, "LCB"],
  ["Ricardo Carvalho", "POR", 2006, "RCB"],
  ["Éric Abidal", "FRA", 2006, "LB"],
  ["Juan", "BRA", 2006, "LCB"],
  ["Diego Godín", "URU", 2010, "CB"],
  ["Ryan Nelsen", "NZL", 2010, "CB"],
  ["Winston Reid", "NZL", 2010, "RCB"],
  ["Yuji Nakazawa", "JPN", 2010, "CB"],
  ["Rafael Márquez", "MEX", 2010, "CB"],
  ["John Mensah", "GHA", 2010, "RCB"],
  ["Thiago Silva", "BRA", 2014, "CB"],
  ["David Luiz", "BRA", 2014, "LCB"],
  ["Pablo Zabaleta", "ARG", 2014, "RB"],
  ["Ezequiel Garay", "ARG", 2014, "RCB"],
  ["Stefan de Vrij", "NED", 2014, "CB"],
  ["Daley Blind", "NED", 2014, "LWB"],
  ["Matt Besler", "USA", 2014, "LCB"],
  ["Kieran Trippier", "ENG", 2018, "RWB"],
  ["Diego Laxalt", "URU", 2018, "LWB"],
  ["Yerry Mina", "COL", 2018, "CB"],
  ["Mário Fernandes", "RUS", 2018, "RWB"],
  ["Šime Vrsaljko", "CRO", 2018, "RB"],
  ["Toby Alderweireld", "BEL", 2018, "RCB"],
  ["Kalidou Koulibaly", "SEN", 2022, "CB"],
  ["Kim Min-jae", "KOR", 2022, "CB"],
  ["Piero Hincapié", "ECU", 2022, "LCB"],

  // Midfielders (41)
  ["Gheorghe Hagi", "ROU", 1998, "AM"],
  ["Michael Laudrup", "DEN", 1998, "AM"],
  ["Emmanuel Petit", "FRA", 1998, "CM"],
  ["Nicky Butt", "ENG", 1998, "DM"],
  ["Ariel Ortega", "ARG", 1998, "AM"],
  ["Cuauhtémoc Blanco", "MEX", 1998, "AM"],
  ["Sunday Oliseh", "NGA", 1998, "DM"],
  ["Juninho Paulista", "BRA", 2002, "AM"],
  ["Kléberson", "BRA", 2002, "CM"],
  ["Hasan Şaş", "TUR", 2002, "LM"],
  ["Yoo Sang-chul", "KOR", 2002, "CM"],
  ["Landon Donovan", "USA", 2002, "AM"],
  ["Pavel Nedvěd", "CZE", 2006, "LM"],
  ["Maniche", "POR", 2006, "CM"],
  ["Deco", "POR", 2006, "AM"],
  ["Juan Román Riquelme", "ARG", 2006, "AM"],
  ["Torsten Frings", "GER", 2006, "DM"],
  ["Maxi Rodríguez", "ARG", 2006, "RM"],
  ["Stephen Appiah", "GHA", 2006, "CM"],
  ["Shunsuke Nakamura", "JPN", 2006, "AM"],
  ["Mesut Özil", "GER", 2010, "AM"],
  ["Wesley Sneijder", "NED", 2010, "AM"],
  ["Mark van Bommel", "NED", 2010, "DM"],
  ["Keisuke Honda", "JPN", 2010, "AM"],
  ["Park Ji-sung", "KOR", 2010, "CM"],
  ["Kevin-Prince Boateng", "GHA", 2010, "CM"],
  ["Simon Elliott", "NZL", 2010, "CM"],
  ["James Rodríguez", "COL", 2014, "AM"],
  ["Javier Mascherano", "ARG", 2014, "DM"],
  ["Ángel Di María", "ARG", 2014, "LM"],
  ["Yaya Touré", "CIV", 2014, "CM"],
  ["Bryan Ruiz", "CRC", 2014, "AM"],
  ["Jermaine Jones", "USA", 2014, "CM"],
  ["Ivan Rakitić", "CRO", 2018, "CM"],
  ["Eden Hazard", "BEL", 2018, "AM"],
  ["Dele Alli", "ENG", 2018, "AM"],
  ["Aleksandr Golovin", "RUS", 2018, "CM"],
  ["Wahbi Khazri", "TUN", 2018, "AM"],
  ["Azzedine Ounahi", "MAR", 2022, "CM"],
  ["Tyler Adams", "USA", 2022, "DM"],
  ["Salem Al-Dawsari", "KSA", 2022, "LM"],

  // Forwards (35)
  ["Christian Vieri", "ITA", 1998, "ST"],
  ["Brian Laudrup", "DEN", 1998, "RW"],
  ["Bebeto", "BRA", 1998, "CF"],
  ["Luis Hernández", "MEX", 1998, "ST"],
  ["Victor Ikpeba", "NGA", 1998, "ST"],
  ["Hakan Şükür", "TUR", 2002, "ST"],
  ["İlhan Mansız", "TUR", 2002, "CF"],
  ["El Hadji Diouf", "SEN", 2002, "LW"],
  ["Ahn Jung-hwan", "KOR", 2002, "ST"],
  ["Jared Borgetti", "MEX", 2002, "ST"],
  ["Andriy Shevchenko", "UKR", 2006, "ST"],
  ["Lukas Podolski", "GER", 2006, "LW"],
  ["David Trezeguet", "FRA", 2006, "ST"],
  ["Didier Drogba", "CIV", 2006, "ST"],
  ["Zlatan Ibrahimović", "SWE", 2006, "CF"],
  ["Luis Suárez", "URU", 2010, "ST"],
  ["Asamoah Gyan", "GHA", 2010, "ST"],
  ["Siphiwe Tshabalala", "RSA", 2010, "LW"],
  ["Chris Wood", "NZL", 2010, "ST"],
  ["Tim Cahill", "AUS", 2010, "CF"],
  ["Samuel Eto’o", "CMR", 2010, "ST"],
  ["Alexis Sánchez", "CHI", 2014, "LW"],
  ["Robin van Persie", "NED", 2014, "ST"],
  ["Joel Campbell", "CRC", 2014, "CF"],
  ["Ahmed Musa", "NGA", 2014, "LW"],
  ["Enner Valencia", "ECU", 2014, "ST"],
  ["Harry Kane", "ENG", 2018, "ST"],
  ["Romelu Lukaku", "BEL", 2018, "ST"],
  ["Ivan Perišić", "CRO", 2018, "LW"],
  ["Denis Cheryshev", "RUS", 2018, "LW"],
  ["Takashi Inui", "JPN", 2018, "LW"],
  ["Randal Kolo Muani", "FRA", 2022, "CF"],
  ["Mehdi Taremi", "IRN", 2022, "ST"],
  ["Vincent Aboubakar", "CMR", 2022, "ST"],
  ["Breel Embolo", "SUI", 2022, "CF"],
];

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const eligibleFor = (position: Position): Position[] => {
  if (position === "GK") return ["GK"];
  if (["LB", "LWB"].includes(position)) return [position, "LB", "LWB", "LCB"];
  if (["RB", "RWB"].includes(position)) return [position, "RB", "RWB", "RCB"];
  if (["LCB", "CB", "RCB"].includes(position)) return [position, "CB", "LCB", "RCB"];
  if (position === "DM") return ["DM", "CM"];
  if (position === "CM") return ["CM", "DM", "AM"];
  if (position === "AM") return ["AM", "CM", "CF"];
  if (position === "LM") return ["LM", "LW", "CM"];
  if (position === "RM") return ["RM", "RW", "CM"];
  if (position === "LW") return ["LW", "LM", "CF", "ST"];
  if (position === "RW") return ["RW", "RM", "CF", "ST"];
  if (position === "CF") return ["CF", "ST", "AM"];
  return ["ST", "CF"];
};

type HistoricalSeed = readonly [
  playerName: string,
  nation: keyof typeof nations,
  tournamentYear: number,
  primaryPosition: Position,
  overall: number,
  archetype: string,
];

// Older editions deliberately mix icons with strong starters and specialists.
// Ratings are original tournament-card estimates; factual statistics remain null.
const historicalSeedRows: HistoricalSeed[] = [
  ["Pelé", "BRA", 1970, "CF", 99, "Timeless complete forward"],
  ["Jairzinho", "BRA", 1970, "RW", 97, "Every-round scorer"],
  ["Gerd Müller", "GER", 1970, "ST", 96, "Penalty-box certainty"],
  ["Rivelino", "BRA", 1970, "AM", 94, "Left-foot orchestrator"],
  ["Tostão", "BRA", 1970, "CF", 93, "Fluid attacking connector"],
  ["Bobby Moore", "ENG", 1970, "CB", 94, "Anticipating captain"],
  ["Gordon Banks", "ENG", 1970, "GK", 94, "Reflex standard"],
  ["Teófilo Cubillas", "PER", 1970, "AM", 92, "Explosive tournament ten"],
  ["Giacinto Facchetti", "ITA", 1970, "LB", 91, "Commanding wide defender"],
  ["Murtaz Khurtsilava", "SUN", 1970, "CB", 86, "Physical stopper"],
  ["Johan Cruyff", "NED", 1974, "CF", 98, "Total-football catalyst"],
  ["Franz Beckenbauer", "GER", 1974, "CB", 98, "Libero architect"],
  ["Johan Neeskens", "NED", 1974, "CM", 95, "Pressing midfield spear"],
  ["Gerd Müller", "GER", 1974, "ST", 94, "Finals poacher"],
  ["Sepp Maier", "GER", 1974, "GK", 93, "Agile organizer"],
  ["Kazimierz Deyna", "POL", 1974, "AM", 93, "Elegant central creator"],
  ["Grzegorz Lato", "POL", 1974, "RW", 94, "Golden Boot runner"],
  ["Paul Breitner", "GER", 1974, "LB", 92, "Inverted power fullback"],
  ["Wolfgang Overath", "GER", 1974, "CM", 91, "Measured distributor"],
  ["René Houseman", "ARG", 1974, "RW", 85, "Elusive wide dribbler"],
  ["Mario Kempes", "ARG", 1978, "ST", 97, "Driving Golden Boot"],
  ["Daniel Passarella", "ARG", 1978, "CB", 94, "Front-foot captain"],
  ["Ubaldo Fillol", "ARG", 1978, "GK", 94, "Explosive shot-stopper"],
  ["Rob Rensenbrink", "NED", 1978, "LW", 95, "Silky inside forward"],
  ["Zico", "BRA", 1978, "AM", 90, "Early-stage playmaker"],
  ["Teófilo Cubillas", "PER", 1978, "AM", 94, "Long-range specialist"],
  ["Claudio Gentile", "ITA", 1978, "RB", 90, "Relentless marker"],
  ["Paolo Rossi", "ITA", 1978, "ST", 91, "Mobile penalty-box threat"],
  ["Arie Haan", "NED", 1978, "CM", 92, "Long-range controller"],
  ["Ruud Krol", "NED", 1978, "LB", 94, "Progressive defensive leader"],
  ["Paolo Rossi", "ITA", 1982, "ST", 98, "Knockout finisher"],
  ["Zico", "BRA", 1982, "AM", 96, "Technical master ten"],
  ["Sócrates", "BRA", 1982, "CM", 95, "Imperious playmaker"],
  ["Falcão", "BRA", 1982, "CM", 95, "Complete midfield regista"],
  ["Zbigniew Boniek", "POL", 1982, "AM", 94, "Vertical transition star"],
  ["Dino Zoff", "ITA", 1982, "GK", 96, "Veteran command"],
  ["Claudio Gentile", "ITA", 1982, "RB", 94, "Elite man-marker"],
  ["Gaetano Scirea", "ITA", 1982, "CB", 95, "Calm libero"],
  ["Pierre Littbarski", "GER", 1982, "RW", 91, "Low-center creator"],
  ["Jean Tigana", "FRA", 1982, "CM", 90, "Midfield runner"],
  ["Diego Maradona", "ARG", 1986, "AM", 99, "Tournament-defining creator"],
  ["Jorge Burruchaga", "ARG", 1986, "CM", 93, "Finals transition runner"],
  ["Jorge Valdano", "ARG", 1986, "ST", 92, "Intelligent channel forward"],
  ["Harald Schumacher", "GER", 1986, "GK", 92, "Commanding keeper"],
  ["Lothar Matthäus", "GER", 1986, "CM", 94, "Two-way midfield force"],
  ["Michel Platini", "FRA", 1986, "AM", 94, "Veteran creative authority"],
  ["Gary Lineker", "ENG", 1986, "ST", 96, "Golden Boot poacher"],
  ["Emilio Butragueño", "ESP", 1986, "ST", 94, "Slippery combination forward"],
  ["Preben Elkjær", "DEN", 1986, "ST", 92, "Powerful roaming striker"],
  ["Igor Belanov", "SUN", 1986, "RW", 92, "Direct Ballon d’Or winger"],
  ["Salvatore Schillaci", "ITA", 1990, "ST", 97, "Golden Boot revelation"],
  ["Lothar Matthäus", "GER", 1990, "CM", 98, "Complete champion captain"],
  ["Andreas Brehme", "GER", 1990, "LB", 95, "Two-footed finals fullback"],
  ["Jürgen Klinsmann", "GER", 1990, "ST", 93, "Aerial transition striker"],
  ["Sergio Goycochea", "ARG", 1990, "GK", 95, "Shootout specialist"],
  ["Paul Gascoigne", "ENG", 1990, "AM", 94, "Fearless midfield creator"],
  ["Roger Milla", "CMR", 1990, "ST", 94, "Veteran impact forward"],
  ["Franco Baresi", "ITA", 1990, "CB", 96, "Defensive line conductor"],
  ["Frank Rijkaard", "NED", 1990, "DM", 89, "Physical tactical pivot"],
  ["Tomáš Skuhravý", "CSK", 1990, "ST", 91, "Aerial tournament striker"],
  ["Romário", "BRA", 1994, "CF", 98, "Decisive close-range genius"],
  ["Roberto Baggio", "ITA", 1994, "AM", 97, "Knockout carrying force"],
  ["Bebeto", "BRA", 1994, "ST", 94, "Movement-first finisher"],
  ["Gheorghe Hagi", "ROU", 1994, "AM", 96, "Long-range creative leader"],
  ["Hristo Stoichkov", "BUL", 1994, "LW", 96, "Golden Boot left-foot force"],
  ["Dunga", "BRA", 1994, "DM", 92, "Disciplined midfield captain"],
  ["Cláudio Taffarel", "BRA", 1994, "GK", 93, "Calm knockout keeper"],
  ["Paolo Maldini", "ITA", 1994, "LB", 96, "Complete defensive reference"],
  ["Tomas Brolin", "SWE", 1994, "AM", 93, "Compact attacking connector"],
  ["Oleg Salenko", "RUS", 1994, "ST", 91, "Single-match scoring specialist"],
];

const historicalCards = historicalSeedRows.map(
  ([
    playerName,
    nation,
    tournamentYear,
    primaryPosition,
    overall,
    archetype,
  ]): CardSeed => ({
    id: `${slugify(playerName)}-${tournamentYear}`,
    playerName,
    nation,
    tournamentYear,
    primaryPosition,
    eligiblePositions: eligibleFor(primaryPosition),
    overall,
    archetype,
    rarity: overall >= 96 ? "iconic" : overall >= 92 ? "legendary" : "classic",
  }),
);

const supplementalCards = supplementalSeeds.map(
  ([playerName, nation, tournamentYear, primaryPosition], index): CardSeed => {
    const ratingCycle = [89, 86, 83, 80, 88, 85];
    const overall = ratingCycle[index % ratingCycle.length];
    const archetypes =
      primaryPosition === "GK"
        ? ["Reflex keeper", "Area commander", "Sweeper keeper"]
        : ["Tournament specialist", "Transition force", "Tactical connector"];
    return {
      id: `${slugify(playerName)}-${tournamentYear}`,
      playerName,
      nation,
      tournamentYear,
      primaryPosition,
      eligiblePositions: eligibleFor(primaryPosition),
      overall,
      archetype: archetypes[index % archetypes.length],
      qualityBand:
        overall >= 89
          ? "standout"
          : overall >= 86
            ? "reliable"
            : overall >= 83
              ? "role-player"
              : "limited",
    };
  },
);

const archiveSeeds = [...historicalCards, ...curatedSeeds, ...supplementalCards];

const performanceRatingBonus: Record<string, number> = {
  "group stage": 0,
  "round of 16": 2,
  "second group stage": 3,
  "quarter-final": 4,
  "quarter-finals": 4,
  "semi-finals": 6,
  "third-place match": 6,
  final: 7,
  "final round": 7,
};

const estimatedTournamentRating = (
  tournament: GeneratedTournamentAppearance,
) => {
  const awardFloor = tournament.awards.reduce((floor, award) => {
    if (award.label === "Golden Ball") return Math.max(floor, 96);
    if (award.label === "Silver Ball") return Math.max(floor, 94);
    if (award.label === "Bronze Ball") return Math.max(floor, 92);
    if (award.label === "Golden Boot") return Math.max(floor, 93);
    return floor;
  }, 65);
  const performanceRating =
    65 +
    Math.min(14, tournament.appearances * 2) +
    Math.min(6, tournament.starts) +
    Math.min(10, tournament.goals * 2) +
    (performanceRatingBonus[tournament.teamPerformance] ?? 0);
  return Math.min(97, Math.max(65, awardFloor, performanceRating));
};

const distinctRating = (desired: number, used: Set<number>) => {
  if (!used.has(desired)) return desired;
  for (let distance = 1; distance <= 34; distance += 1) {
    const lower = desired - distance;
    if (lower >= 65 && !used.has(lower)) return lower;
    const higher = desired + distance;
    if (higher <= 99 && !used.has(higher)) return higher;
  }
  throw new Error("No distinct 65–99 tournament rating remains for identity");
};

const seedsByIdentityId = new Map<string, CardSeed[]>();
for (const seed of archiveSeeds) {
  const identityId = seed.id.replace(/-\d{4}$/, "");
  const identitySeeds = seedsByIdentityId.get(identityId) ?? [];
  identitySeeds.push(seed);
  seedsByIdentityId.set(identityId, identitySeeds);
}

const seeds: CardSeed[] = Object.entries(tournamentArchive.identities).flatMap(
  ([identityId, tournaments]) => {
    const identitySeeds = seedsByIdentityId.get(identityId);
    if (!identitySeeds?.length) {
      throw new Error(`${identityId}: tournament archive has no card seed`);
    }
    const seedById = new Map(identitySeeds.map((seed) => [seed.id, seed]));
    const usedRatings = new Set<number>();
    return [...tournaments]
      .sort(
        (first, second) => first.tournamentYear - second.tournamentYear,
      )
      .map((tournament) => {
        const id = `${identityId}-${tournament.tournamentYear}`;
        const exactSeed = seedById.get(id);
        const reference =
          exactSeed ??
          [...identitySeeds].sort(
            (first, second) =>
              Math.abs(first.tournamentYear - tournament.tournamentYear) -
              Math.abs(second.tournamentYear - tournament.tournamentYear),
          )[0];
        const desiredRating =
          tournamentRatingOverrides[id] ??
          (exactSeed
            ? rebalanceRating(exactSeed.overall)
            : estimatedTournamentRating(tournament));
        const finalOverall = distinctRating(desiredRating, usedRatings);
        usedRatings.add(finalOverall);
        const nation =
          tournament.teamCode in nations
            ? (tournament.teamCode as keyof typeof nations)
            : reference.nation;
        return {
          ...reference,
          id,
          nation,
          tournamentYear: tournament.tournamentYear,
          primaryPosition: tournament.primaryPosition,
          eligiblePositions: tournament.eligiblePositions,
          overall: exactSeed?.overall ?? finalOverall,
          finalOverall,
          archetype:
            exactSeed?.archetype ??
            `${tournament.tournamentYear} ${reference.archetype.toLocaleLowerCase()}`,
          attributes: exactSeed?.attributes,
        };
      });
  },
);

export const players: PlayerTournamentCard[] = playerSeedSchema.parse(
  seeds.map(makeCard),
);

export const playersById = new Map(players.map((player) => [player.id, player]));
export const draftEligiblePlayers = players.filter(
  (player) => player.isDraftEligible,
);
export const playersByIdentity = new Map(
  players.map((player) => [player.playerIdentityId, player]),
);
