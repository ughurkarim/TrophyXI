import type {
  Confederation,
  DataCitation,
  FormationId,
  HistoricalWorldCupTeam,
} from "@/types/game";
import {
  historicalOpponentSource,
  historicalOpponents as historicalArchive,
} from "@/data/opponents/generated";

export const worldCup2026ParticipantSource: DataCitation = {
  label: "FIFA World Cup 2026 qualified teams",
  url: "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/world-cup-2026-who-has-qualified",
  publisher: "FIFA",
  accessedOn: "2026-07-25",
};

export const worldCup2026ResultsSource: DataCitation = {
  label: "FIFA World Cup 2026 match schedule and results",
  url: "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/match-schedule-fixtures-results-teams-stadiums",
  publisher: "FIFA",
  accessedOn: "2026-07-25",
};

export const worldCup2026FinalStandingsSource: DataCitation = {
  label: "FIFA World Cup 2026 final tournament standings",
  url: "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/final-tournament-standings",
  publisher: "FIFA",
  accessedOn: "2026-07-25",
};

const participants = [
  ["Algeria", "ALG", "CAF"],
  ["Argentina", "ARG", "CONMEBOL"],
  ["Australia", "AUS", "AFC"],
  ["Austria", "AUT", "UEFA"],
  ["Belgium", "BEL", "UEFA"],
  ["Bosnia and Herzegovina", "BIH", "UEFA"],
  ["Brazil", "BRA", "CONMEBOL"],
  ["Cabo Verde", "CPV", "CAF"],
  ["Canada", "CAN", "CONCACAF"],
  ["Colombia", "COL", "CONMEBOL"],
  ["Congo DR", "COD", "CAF"],
  ["Côte d'Ivoire", "CIV", "CAF"],
  ["Curaçao", "CUW", "CONCACAF"],
  ["Croatia", "CRO", "UEFA"],
  ["Czechia", "CZE", "UEFA"],
  ["Ecuador", "ECU", "CONMEBOL"],
  ["Egypt", "EGY", "CAF"],
  ["England", "ENG", "UEFA"],
  ["France", "FRA", "UEFA"],
  ["Germany", "GER", "UEFA"],
  ["Ghana", "GHA", "CAF"],
  ["Haiti", "HAI", "CONCACAF"],
  ["IR Iran", "IRN", "AFC"],
  ["Iraq", "IRQ", "AFC"],
  ["Japan", "JPN", "AFC"],
  ["Jordan", "JOR", "AFC"],
  ["Korea Republic", "KOR", "AFC"],
  ["Mexico", "MEX", "CONCACAF"],
  ["Morocco", "MAR", "CAF"],
  ["Netherlands", "NED", "UEFA"],
  ["New Zealand", "NZL", "OFC"],
  ["Norway", "NOR", "UEFA"],
  ["Panama", "PAN", "CONCACAF"],
  ["Paraguay", "PAR", "CONMEBOL"],
  ["Portugal", "POR", "UEFA"],
  ["Qatar", "QAT", "AFC"],
  ["Saudi Arabia", "KSA", "AFC"],
  ["Scotland", "SCO", "UEFA"],
  ["Senegal", "SEN", "CAF"],
  ["South Africa", "RSA", "CAF"],
  ["Spain", "ESP", "UEFA"],
  ["Sweden", "SWE", "UEFA"],
  ["Switzerland", "SUI", "UEFA"],
  ["Tunisia", "TUN", "CAF"],
  ["Türkiye", "TUR", "UEFA"],
  ["USA", "USA", "CONCACAF"],
  ["Uruguay", "URU", "CONMEBOL"],
  ["Uzbekistan", "UZB", "AFC"],
] as const satisfies ReadonlyArray<
  readonly [string, string, Confederation]
>;

export const worldCup2026ParticipantNations = participants;

const formations: FormationId[] = [
  "4-3-3",
  "4-2-3-1",
  "4-4-2",
  "3-5-2",
  "4-1-4-1",
  "4-3-1-2",
  "4-2-2-2",
  "4-5-1",
  "3-4-3",
  "3-4-2-1",
  "5-3-2",
  "5-2-3",
];

type Completed2026Finish =
  | "champion"
  | "runner-up"
  | "third place"
  | "fourth place"
  | "quarter-finals"
  | "round of 16"
  | "round of 32"
  | "group stage";

type Completed2026Performance = {
  matches: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  cleanSheets: number;
  finish: Completed2026Finish;
};

// Sourced match outcomes from the completed 2026 tournament. Penalty-shootout
// matches count as draws here, matching FIFA's final-standings methodology.
const completed2026PerformanceByNationCode = {
  ALG: {
    matches: 4, wins: 1, draws: 1, losses: 2,
    goalsFor: 5, goalsAgainst: 9, cleanSheets: 0,
    finish: "round of 32",
  },
  ARG: {
    matches: 8, wins: 7, draws: 0, losses: 1,
    goalsFor: 19, goalsAgainst: 8, cleanSheets: 2,
    finish: "runner-up",
  },
  AUS: {
    matches: 4, wins: 1, draws: 2, losses: 1,
    goalsFor: 3, goalsAgainst: 3, cleanSheets: 2,
    finish: "round of 32",
  },
  AUT: {
    matches: 4, wins: 1, draws: 1, losses: 2,
    goalsFor: 6, goalsAgainst: 9, cleanSheets: 0,
    finish: "round of 32",
  },
  BEL: {
    matches: 6, wins: 3, draws: 2, losses: 1,
    goalsFor: 14, goalsAgainst: 7, cleanSheets: 1,
    finish: "quarter-finals",
  },
  BIH: {
    matches: 4, wins: 1, draws: 1, losses: 2,
    goalsFor: 5, goalsAgainst: 8, cleanSheets: 0,
    finish: "round of 32",
  },
  BRA: {
    matches: 5, wins: 3, draws: 1, losses: 1,
    goalsFor: 10, goalsAgainst: 4, cleanSheets: 2,
    finish: "round of 16",
  },
  CPV: {
    matches: 4, wins: 0, draws: 3, losses: 1,
    goalsFor: 4, goalsAgainst: 5, cleanSheets: 2,
    finish: "round of 32",
  },
  CAN: {
    matches: 5, wins: 2, draws: 1, losses: 2,
    goalsFor: 9, goalsAgainst: 6, cleanSheets: 2,
    finish: "round of 16",
  },
  COL: {
    matches: 5, wins: 3, draws: 2, losses: 0,
    goalsFor: 5, goalsAgainst: 1, cleanSheets: 4,
    finish: "round of 16",
  },
  COD: {
    matches: 4, wins: 1, draws: 1, losses: 2,
    goalsFor: 5, goalsAgainst: 5, cleanSheets: 0,
    finish: "round of 32",
  },
  CIV: {
    matches: 4, wins: 2, draws: 0, losses: 2,
    goalsFor: 5, goalsAgainst: 4, cleanSheets: 2,
    finish: "round of 32",
  },
  CUW: {
    matches: 3, wins: 0, draws: 1, losses: 2,
    goalsFor: 1, goalsAgainst: 9, cleanSheets: 1,
    finish: "group stage",
  },
  CRO: {
    matches: 4, wins: 2, draws: 0, losses: 2,
    goalsFor: 6, goalsAgainst: 7, cleanSheets: 1,
    finish: "round of 32",
  },
  CZE: {
    matches: 3, wins: 0, draws: 1, losses: 2,
    goalsFor: 2, goalsAgainst: 6, cleanSheets: 0,
    finish: "group stage",
  },
  ECU: {
    matches: 4, wins: 1, draws: 1, losses: 2,
    goalsFor: 2, goalsAgainst: 4, cleanSheets: 1,
    finish: "round of 32",
  },
  EGY: {
    matches: 5, wins: 1, draws: 3, losses: 1,
    goalsFor: 8, goalsAgainst: 7, cleanSheets: 0,
    finish: "round of 16",
  },
  ENG: {
    matches: 8, wins: 6, draws: 1, losses: 1,
    goalsFor: 20, goalsAgainst: 12, cleanSheets: 2,
    finish: "third place",
  },
  FRA: {
    matches: 8, wins: 6, draws: 0, losses: 2,
    goalsFor: 20, goalsAgainst: 10, cleanSheets: 4,
    finish: "fourth place",
  },
  GER: {
    matches: 4, wins: 2, draws: 1, losses: 1,
    goalsFor: 11, goalsAgainst: 5, cleanSheets: 0,
    finish: "round of 32",
  },
  GHA: {
    matches: 4, wins: 1, draws: 1, losses: 2,
    goalsFor: 2, goalsAgainst: 3, cleanSheets: 2,
    finish: "round of 32",
  },
  HAI: {
    matches: 3, wins: 0, draws: 0, losses: 3,
    goalsFor: 2, goalsAgainst: 8, cleanSheets: 0,
    finish: "group stage",
  },
  IRN: {
    matches: 3, wins: 0, draws: 3, losses: 0,
    goalsFor: 3, goalsAgainst: 3, cleanSheets: 1,
    finish: "group stage",
  },
  IRQ: {
    matches: 3, wins: 0, draws: 0, losses: 3,
    goalsFor: 1, goalsAgainst: 12, cleanSheets: 0,
    finish: "group stage",
  },
  JPN: {
    matches: 4, wins: 1, draws: 2, losses: 1,
    goalsFor: 8, goalsAgainst: 5, cleanSheets: 1,
    finish: "round of 32",
  },
  JOR: {
    matches: 3, wins: 0, draws: 0, losses: 3,
    goalsFor: 3, goalsAgainst: 8, cleanSheets: 0,
    finish: "group stage",
  },
  KOR: {
    matches: 3, wins: 1, draws: 0, losses: 2,
    goalsFor: 2, goalsAgainst: 3, cleanSheets: 0,
    finish: "group stage",
  },
  MEX: {
    matches: 5, wins: 4, draws: 0, losses: 1,
    goalsFor: 10, goalsAgainst: 3, cleanSheets: 4,
    finish: "round of 16",
  },
  MAR: {
    matches: 6, wins: 3, draws: 2, losses: 1,
    goalsFor: 10, goalsAgainst: 6, cleanSheets: 2,
    finish: "quarter-finals",
  },
  NED: {
    matches: 4, wins: 2, draws: 2, losses: 0,
    goalsFor: 11, goalsAgainst: 5, cleanSheets: 0,
    finish: "round of 32",
  },
  NZL: {
    matches: 3, wins: 0, draws: 1, losses: 2,
    goalsFor: 4, goalsAgainst: 10, cleanSheets: 0,
    finish: "group stage",
  },
  NOR: {
    matches: 6, wins: 4, draws: 0, losses: 2,
    goalsFor: 13, goalsAgainst: 11, cleanSheets: 0,
    finish: "quarter-finals",
  },
  PAN: {
    matches: 3, wins: 0, draws: 0, losses: 3,
    goalsFor: 0, goalsAgainst: 4, cleanSheets: 0,
    finish: "group stage",
  },
  PAR: {
    matches: 5, wins: 1, draws: 2, losses: 2,
    goalsFor: 3, goalsAgainst: 6, cleanSheets: 2,
    finish: "round of 16",
  },
  POR: {
    matches: 5, wins: 2, draws: 2, losses: 1,
    goalsFor: 8, goalsAgainst: 3, cleanSheets: 2,
    finish: "round of 16",
  },
  QAT: {
    matches: 3, wins: 0, draws: 1, losses: 2,
    goalsFor: 2, goalsAgainst: 10, cleanSheets: 0,
    finish: "group stage",
  },
  KSA: {
    matches: 3, wins: 0, draws: 2, losses: 1,
    goalsFor: 1, goalsAgainst: 5, cleanSheets: 1,
    finish: "group stage",
  },
  SCO: {
    matches: 3, wins: 1, draws: 0, losses: 2,
    goalsFor: 1, goalsAgainst: 4, cleanSheets: 1,
    finish: "group stage",
  },
  SEN: {
    matches: 4, wins: 1, draws: 0, losses: 3,
    goalsFor: 10, goalsAgainst: 9, cleanSheets: 1,
    finish: "round of 32",
  },
  RSA: {
    matches: 4, wins: 1, draws: 1, losses: 2,
    goalsFor: 2, goalsAgainst: 4, cleanSheets: 1,
    finish: "round of 32",
  },
  ESP: {
    matches: 8, wins: 7, draws: 1, losses: 0,
    goalsFor: 14, goalsAgainst: 1, cleanSheets: 7,
    finish: "champion",
  },
  SWE: {
    matches: 4, wins: 1, draws: 1, losses: 2,
    goalsFor: 7, goalsAgainst: 10, cleanSheets: 0,
    finish: "round of 32",
  },
  SUI: {
    matches: 6, wins: 3, draws: 2, losses: 1,
    goalsFor: 10, goalsAgainst: 6, cleanSheets: 2,
    finish: "quarter-finals",
  },
  TUN: {
    matches: 3, wins: 0, draws: 0, losses: 3,
    goalsFor: 2, goalsAgainst: 12, cleanSheets: 0,
    finish: "group stage",
  },
  TUR: {
    matches: 3, wins: 1, draws: 0, losses: 2,
    goalsFor: 3, goalsAgainst: 5, cleanSheets: 0,
    finish: "group stage",
  },
  USA: {
    matches: 5, wins: 3, draws: 0, losses: 2,
    goalsFor: 11, goalsAgainst: 8, cleanSheets: 2,
    finish: "round of 16",
  },
  URU: {
    matches: 3, wins: 0, draws: 2, losses: 1,
    goalsFor: 3, goalsAgainst: 4, cleanSheets: 0,
    finish: "group stage",
  },
  UZB: {
    matches: 3, wins: 0, draws: 0, losses: 3,
    goalsFor: 2, goalsAgainst: 11, cleanSheets: 0,
    finish: "group stage",
  },
} as const satisfies Record<string, Completed2026Performance>;

const finishBonus: Record<Completed2026Finish, number> = {
  "champion": 8,
  "runner-up": 7,
  "third place": 6,
  "fourth place": 6,
  "quarter-finals": 5,
  "round of 16": 3,
  "round of 32": 1,
  "group stage": 0,
};

/**
 * World Cup Run opponent strength model.
 *
 * 30% = what the nation actually did at the completed 2026 World Cup.
 * 70% = historical World Cup strength:
 *   45% past tournament results / modeled nation-year strength
 *   15% qualification / appearance consistency
 *   10% pedigree / reputation from titles and deep runs
 *
 * "Reputation" is deliberately data-driven rather than a hand-authored brand
 * tier. Brazil, Germany, Argentina, etc. stay strong because their World Cup
 * record is strong, not because their names receive an arbitrary bonus.
 */
export const WORLD_CUP_2026_RATING_WEIGHTS = {
  completed2026: 0.3,
  historicalResults: 0.45,
  historicalAppearances: 0.15,
  historicalPedigree: 0.1,
} as const;

const clampRating = (value: number) =>
  Math.round(Math.max(68, Math.min(97, value)));

const completed2026RatingsFor = (performance: Completed2026Performance) => {
  const pointsPerGame =
    (performance.wins * 3 + performance.draws) / performance.matches;
  const goalsPerGame = performance.goalsFor / performance.matches;
  const goalsAgainstPerGame =
    performance.goalsAgainst / performance.matches;
  const goalDifferencePerGame =
    (performance.goalsFor - performance.goalsAgainst) /
    performance.matches;
  const cleanSheetRate =
    performance.cleanSheets / performance.matches;
  const stageBonus = finishBonus[performance.finish];

  const attack = clampRating(
    72 + goalsPerGame * 6 + pointsPerGame * 1.5 + stageBonus,
  );
  const midfield = clampRating(
    72 +
      pointsPerGame * 5 +
      goalDifferencePerGame * 2 +
      stageBonus,
  );
  const defense = clampRating(
    72 +
      (1.8 - goalsAgainstPerGame) * 8 +
      cleanSheetRate * 5 +
      stageBonus,
  );
  const goalkeeper = clampRating(defense + cleanSheetRate * 3 - 1);
  const depth = clampRating(74 + pointsPerGame * 3 + stageBonus * 1.4);
  const overall = Math.round(
    attack * 0.31 +
      midfield * 0.34 +
      defense * 0.27 +
      goalkeeper * 0.05 +
      depth * 0.03,
  );

  return { attack, midfield, defense, goalkeeper, depth, overall };
};

// The active historical opponent archive uses several source-era country codes.
// Keep modern 2026 identity in the UI while resolving the matching archive row.
const historicalNationCodeAliases: Record<string, string> = {
  ALG: "DZA",
  CRO: "HRV",
  GER: "DEU",
  HAI: "HTI",
  NED: "NLD",
  PAR: "PRY",
  POR: "PRT",
  KSA: "SAU",
  RSA: "ZAF",
  SUI: "CHE",
  URU: "URY",
};

/**
 * The gameplay archive starts at 1970 because that is the active card boundary.
 * Fjelstul's complete qualified-teams table goes back to 1930. These compact
 * values restore pre-1970 World Cup appearances and deep-run pedigree so teams
 * such as USA (1930 semi-final), Uruguay, Brazil, England and Germany are not
 * historically understated.
 *
 * pedigreePoints uses the same scale as historicalPedigreePointsFor below:
 * champion 12, runner-up 8, third/fourth/semi-final 5, quarter-final 2.5,
 * round of 16 0.75.
 */
const pre1970HistoryByArchiveCode: Record<
  string,
  { appearances: number; pedigreePoints: number }
> = {
  ARG: { appearances: 5, pedigreePoints: 10.5 },
  AUT: { appearances: 3, pedigreePoints: 10 },
  BEL: { appearances: 4, pedigreePoints: 1.5 },
  BRA: { appearances: 8, pedigreePoints: 39.5 },
  COL: { appearances: 1, pedigreePoints: 0 },
  EGY: { appearances: 1, pedigreePoints: 0.75 },
  ENG: { appearances: 5, pedigreePoints: 17 },
  FRA: { appearances: 6, pedigreePoints: 8.25 },
  DEU: { appearances: 6, pedigreePoints: 33.25 },
  KOR: { appearances: 1, pedigreePoints: 0 },
  MEX: { appearances: 6, pedigreePoints: 0 },
  NLD: { appearances: 2, pedigreePoints: 1.5 },
  NOR: { appearances: 1, pedigreePoints: 0.75 },
  PRY: { appearances: 3, pedigreePoints: 0 },
  PRT: { appearances: 1, pedigreePoints: 5 },
  SCO: { appearances: 2, pedigreePoints: 0 },
  ESP: { appearances: 4, pedigreePoints: 7.5 },
  SWE: { appearances: 4, pedigreePoints: 20.5 },
  CHE: { appearances: 6, pedigreePoints: 7.5 },
  TUR: { appearances: 1, pedigreePoints: 0 },
  URY: { appearances: 5, pedigreePoints: 31.5 },
  USA: { appearances: 3, pedigreePoints: 5.75 },
};

const historicalTeamsByNationCode = new Map<string, HistoricalWorldCupTeam[]>();
for (const team of historicalArchive) {
  const existing = historicalTeamsByNationCode.get(team.nationCode) ?? [];
  existing.push(team);
  historicalTeamsByNationCode.set(team.nationCode, existing);
}

// Brazil had 22 pre-2026 World Cup appearances, the maximum in this field.
const MAX_HISTORICAL_WORLD_CUP_APPEARANCES = 22;

const historicalPedigreePointsFor = (
  finish: HistoricalWorldCupTeam["tournamentFinish"],
) => {
  switch (finish) {
    case "champion":
      return 12;
    case "runner-up":
      return 8;
    case "third place":
    case "fourth place":
    case "semi-finals":
      return 5;
    case "quarter-finals":
      return 2.5;
    case "round of 16":
      return 0.75;
    case "second group stage":
      return 0.5;
    default:
      return 0;
  }
};

type RatingKey = keyof HistoricalWorldCupTeam["ratings"];

const historicalResultRatingFor = (
  teams: HistoricalWorldCupTeam[],
  key: RatingKey,
) => {
  if (!teams.length) return 70;

  // Recent editions matter slightly more, but the weighting remains deliberately
  // mild so a great old World Cup is still part of the nation's identity.
  const weighted = teams.map((team) => ({
    value: team.ratings[key],
    weight:
      0.8 +
      0.2 *
        Math.max(
          0,
          Math.min(1, ((team.tournamentYear ?? 1970) - 1970) / (2022 - 1970)),
        ),
  }));
  const weightedMean =
    weighted.reduce((sum, item) => sum + item.value * item.weight, 0) /
    weighted.reduce((sum, item) => sum + item.weight, 0);
  const peakValues = teams
    .map((team) => team.ratings[key])
    .sort((a, b) => b - a)
    .slice(0, 3);
  const peakMean =
    peakValues.reduce((sum, value) => sum + value, 0) / peakValues.length;

  return weightedMean * 0.78 + peakMean * 0.22;
};

const historicalProfileFor = (nationCode: string) => {
  const archiveCode = historicalNationCodeAliases[nationCode] ?? nationCode;
  const teams = historicalTeamsByNationCode.get(archiveCode) ?? [];
  const pre1970 = pre1970HistoryByArchiveCode[archiveCode] ?? {
    appearances: 0,
    pedigreePoints: 0,
  };
  const appearances = teams.length + pre1970.appearances;
  const appearanceScore =
    appearances === 0
      ? 68
      : 68 +
        18 *
          Math.sqrt(
            Math.min(1, appearances / MAX_HISTORICAL_WORLD_CUP_APPEARANCES),
          );
  const pedigreePoints =
    pre1970.pedigreePoints +
    teams.reduce(
      (sum, team) => sum + historicalPedigreePointsFor(team.tournamentFinish),
      0,
    );
  const pedigreeScore =
    68 + 29 * (1 - Math.exp(-pedigreePoints / 30));

  return {
    appearances,
    appearanceScore,
    pedigreeScore,
    historicalResults: {
      attack: historicalResultRatingFor(teams, "attack"),
      midfield: historicalResultRatingFor(teams, "midfield"),
      defense: historicalResultRatingFor(teams, "defense"),
      goalkeeper: historicalResultRatingFor(teams, "goalkeeper"),
      depth: historicalResultRatingFor(teams, "depth"),
      overall: historicalResultRatingFor(teams, "overall"),
    },
  };
};

const blendedRating = (
  completed2026: number,
  historicalResults: number,
  appearanceScore: number,
  pedigreeScore: number,
) =>
  clampRating(
    completed2026 * WORLD_CUP_2026_RATING_WEIGHTS.completed2026 +
      historicalResults * WORLD_CUP_2026_RATING_WEIGHTS.historicalResults +
      appearanceScore * WORLD_CUP_2026_RATING_WEIGHTS.historicalAppearances +
      pedigreeScore * WORLD_CUP_2026_RATING_WEIGHTS.historicalPedigree,
  );

export const worldCup2026RatingBreakdownByNationCode = new Map<
  string,
  {
    completed2026: HistoricalWorldCupTeam["ratings"];
    historicalResults: HistoricalWorldCupTeam["ratings"];
    historicalAppearances: number;
    appearanceScore: number;
    pedigreeScore: number;
    final: HistoricalWorldCupTeam["ratings"];
  }
>();

const ratingsFor = (
  nationCode: string,
  performance: Completed2026Performance,
) => {
  const completed2026 = completed2026RatingsFor(performance);
  const history = historicalProfileFor(nationCode);
  const final = {
    attack: blendedRating(
      completed2026.attack,
      history.historicalResults.attack,
      history.appearanceScore,
      history.pedigreeScore,
    ),
    midfield: blendedRating(
      completed2026.midfield,
      history.historicalResults.midfield,
      history.appearanceScore,
      history.pedigreeScore,
    ),
    defense: blendedRating(
      completed2026.defense,
      history.historicalResults.defense,
      history.appearanceScore,
      history.pedigreeScore,
    ),
    goalkeeper: blendedRating(
      completed2026.goalkeeper,
      history.historicalResults.goalkeeper,
      history.appearanceScore,
      history.pedigreeScore,
    ),
    depth: blendedRating(
      completed2026.depth,
      history.historicalResults.depth,
      history.appearanceScore,
      history.pedigreeScore,
    ),
    overall: blendedRating(
      completed2026.overall,
      history.historicalResults.overall,
      history.appearanceScore,
      history.pedigreeScore,
    ),
  };

  worldCup2026RatingBreakdownByNationCode.set(nationCode, {
    completed2026,
    historicalResults: {
      attack: Math.round(history.historicalResults.attack),
      midfield: Math.round(history.historicalResults.midfield),
      defense: Math.round(history.historicalResults.defense),
      goalkeeper: Math.round(history.historicalResults.goalkeeper),
      depth: Math.round(history.historicalResults.depth),
      overall: Math.round(history.historicalResults.overall),
    },
    historicalAppearances: history.appearances,
    appearanceScore: Math.round(history.appearanceScore),
    pedigreeScore: Math.round(history.pedigreeScore),
    final,
  });

  return final;
};

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const historicalFinishFor = (finish: Completed2026Finish) => {
  // HistoricalWorldCupTeam predates the 48-team Round of 32. Keep the
  // sourced R32 finish in the profile text while leaving that legacy field null.
  switch (finish) {
    case "champion":
      return "champion" as const;
    case "runner-up":
      return "runner-up" as const;
    case "third place":
      return "third place" as const;
    case "fourth place":
      return "fourth place" as const;
    case "quarter-finals":
      return "quarter-finals" as const;
    case "round of 16":
      return "round of 16" as const;
    case "group stage":
      return "group stage" as const;
    case "round of 32":
      return null;
  }
};

export const worldCup2026Participants: HistoricalWorldCupTeam[] =
  participants.map(([nationName, nationCode, confederation], index) => {
    const performance = completed2026PerformanceByNationCode[nationCode];
    const ratings = ratingsFor(nationCode, performance);
    return {
      id: `${slugify(nationName)}-2026`,
      kind: "historical",
      nationCode,
      nationName,
      tournamentYear: 2026,
      confederation,
      tournamentFinish: historicalFinishFor(performance.finish),
      tournamentStatus: "complete",
      dataStatus: "modeled-lineup",
      managerName: null,
      formation: formations[index % formations.length],
      alternateFormations: [],
      startingLineup: [],
      substitutes: [],
      tacticalProfile: `30% completed 2026 ${performance.finish} performance + 70% historical World Cup strength`,
      ratings,
      tournamentStats: {
        matches: performance.matches,
        wins: performance.wins,
        draws: performance.draws,
        losses: performance.losses,
        goalsFor: performance.goalsFor,
        goalsAgainst: performance.goalsAgainst,
        cleanSheets: performance.cleanSheets,
      },
      sources: [
        worldCup2026ParticipantSource,
        worldCup2026ResultsSource,
        worldCup2026FinalStandingsSource,
        historicalOpponentSource,
      ],
      originalRatings: true,
      formationIsModel: true,
      difficulty:
        ratings.overall >= 92
          ? "Legendary"
          : ratings.overall >= 86
            ? "Elite"
            : ratings.overall >= 80
              ? "Contender"
              : "Underdog",
    };
  });
