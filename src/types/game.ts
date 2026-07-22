export const POSITIONS = [
  "GK",
  "LB",
  "LCB",
  "CB",
  "RCB",
  "RB",
  "LWB",
  "RWB",
  "DM",
  "CM",
  "AM",
  "LM",
  "RM",
  "LW",
  "RW",
  "CF",
  "ST",
] as const;

export type Position = (typeof POSITIONS)[number];
export const WORLD_CUP_YEARS = [
  2026, 2022, 2018, 2014, 2010, 2006, 2002, 1998, 1994, 1990, 1986, 1982,
  1978, 1974, 1970,
] as const;
export type WorldCupYear = (typeof WORLD_CUP_YEARS)[number];
export const PLAYER_WORLD_CUP_YEARS = WORLD_CUP_YEARS;
export type TournamentEra =
  | "1970s"
  | "1980s"
  | "1990s"
  | "2000s"
  | "2010s"
  | "2020s";
export type MatchEraId =
  | "all"
  | "1970s"
  | "1980s"
  | "1990s"
  | "2000s"
  | "2010s"
  | "2020s";
export type DraftEraId = MatchEraId;
export type GameMode =
  | "classic-draft"
  | "free-selection"
  | "world-cup-run";
export type QualityBand =
  | "iconic"
  | "elite"
  | "standout"
  | "reliable"
  | "role-player"
  | "limited";
export type PlayerStatusTier =
  | "legend"
  | "icon"
  | "elite"
  | "standout"
  | "reliable"
  | "role-player"
  | "limited";
export type Confederation =
  | "UEFA"
  | "CONMEBOL"
  | "CONCACAF"
  | "CAF"
  | "AFC"
  | "OFC";

export type PlayerAttributes = {
  attack: number;
  creativity: number;
  control: number;
  defense: number;
  physical: number;
  goalkeeping: number;
  clutch: number;
};

export type EraLegacy =
  | "era-specialist"
  | "adaptable"
  | "cross-era"
  | "timeless";

export type EraTranslationProfile = {
  timelessness: number;
  physicalAdaptability: number;
  technicalAdaptability: number;
  tacticalAdaptability: number;
  pressingAdaptability: number;
  tempoAdaptability: number;
  equipmentAdaptability: number;
  refereeingAdaptability: number;
};

export type TournamentStatLine = {
  appearances: number | null;
  starts: number | null;
  minutes: number | null;
  goals: number | null;
  assists: number | null;
  cleanSheets: number | null;
  saves: number | null;
  goalsConceded: number | null;
  penaltiesSaved: number | null;
};

export type DataCitation = {
  label: string;
  url: string;
  publisher: string;
  accessedOn: string;
};

export type TournamentAchievement = {
  id: string;
  label: string;
  description: string;
  ratingEffect: number;
  source: DataCitation;
};

export type PlayerAccoladeCategory =
  | "international"
  | "continental"
  | "domestic-league"
  | "domestic-cup"
  | "individual"
  | "curated";

export type PlayerAccolade = {
  id: string;
  label: string;
  count?: number;
  category: PlayerAccoladeCategory;
  sourceName: string;
  sourceUrl?: string;
  verified: boolean;
  description?: string;
};

export type PlayerCareerStats = {
  clubAppearances: number | null;
  clubGoals: number | null;
  clubAssists: number | null;
  nationalTeamAppearances: number | null;
  nationalTeamGoals: number | null;
  sourceName: string;
  sourceUrl?: string;
  retrievedOn: string;
  coverageNote: string;
  competitionStats: PlayerCompetitionStat[];
};

export type PlayerCompetitionStat = {
  id: string;
  season: string;
  competition: string;
  scope:
    | "domestic-league"
    | "domestic-cup"
    | "continental"
    | "international";
  squad: string | null;
  appearances: number | null;
  goals: number | null;
  assists: number | null;
};

export type Top100Source = {
  listName: string;
  publisher?: string;
  sourceUrl?: string;
  year?: number;
  note?: string;
};

/** @deprecated Use PlayerAccolade. */
export type CareerAccolade = PlayerAccolade;

export type PlayerTournamentCard = {
  id: string;
  playerIdentityId: string;
  playerName: string;
  countryCode: string;
  countryName: string;
  confederation: Confederation;
  tournamentYear: number;
  primaryPosition: Position;
  eligiblePositions: Position[];
  overall: number;
  attributes: PlayerAttributes;
  era: TournamentEra;
  archetype: string;
  qualityBand: QualityBand;
  statusTier: PlayerStatusTier;
  modeledTags: string[];
  isDraftEligible: boolean;
  draftIneligibilityReason: string | null;
  tournamentStats: TournamentStatLine;
  statSources: DataCitation[];
  statSourcesByField: Partial<
    Record<keyof TournamentStatLine, DataCitation>
  >;
  tournamentFinish: TournamentFinish | null;
  tournamentFinishSource: DataCitation | null;
  achievements: TournamentAchievement[];
  careerStats: PlayerCareerStats | null;
  careerAccolades: PlayerAccolade[];
  top100Player: boolean;
  top100Source?: Top100Source;
  imageId: string;
  eraLegacy: EraLegacy;
  eraTranslation: EraTranslationProfile;
};

export type DraftEra = {
  id: DraftEraId;
  label: string;
  years: string;
  yearRange: readonly [number, number];
  description: string;
  accent: string;
  themeClass: string;
  midpointYear: number;
  environment: {
    physicalContact: number;
    pitchSpeed: number;
    protectiveRefereeing: number;
    pressingDemand: number;
    transitionSpeed: number;
    technicalDemand: number;
    aerialDemand: number;
    goalkeeperDistribution: number;
  };
};

export type FormationId =
  | "4-3-3"
  | "4-2-3-1"
  | "4-4-2"
  | "3-5-2"
  | "4-1-4-1"
  | "4-3-1-2"
  | "4-2-2-2"
  | "4-5-1"
  | "3-4-3"
  | "3-4-2-1"
  | "5-3-2"
  | "5-2-3";

export type FormationSlot = {
  id: string;
  label: string;
  position: Position;
  accepts: Position[];
  x: number;
  y: number;
};

export type Formation = {
  id: FormationId;
  name: string;
  description: string;
  tendencies: {
    attack: number;
    control: number;
    defense: number;
  };
  modifiers: {
    attack: number;
    midfield: number;
    defense: number;
  };
  managerStyles: ManagerStyle[];
  eraStrengths: DraftEraId[];
  preferredArchetypes: string[];
  width: number;
  pressingSuitability: number;
  tacticalDifficulty: "Accessible" | "Intermediate" | "Advanced";
  slots: FormationSlot[];
};

export type ManagerStyle =
  | "possession"
  | "pressing"
  | "counter"
  | "defensive"
  | "balanced"
  | "direct"
  | "fluid";

export type ManagerEraFitProfile = {
  pressingIntensity: number;
  defensiveStructure: number;
  tempo: number;
  positionalFlexibility: number;
  substitutionApproach: number;
  physicalDemand: number;
  technicalDemand: number;
  adaptability: number;
};

export type ManagerTournamentCard = {
  id: string;
  managerIdentityId: string;
  managerName: string;
  countryCode: string;
  countryName: string;
  tournamentYear: number;
  teamName: string;
  style: ManagerStyle;
  preferredFormations: FormationId[];
  acceptableFormations: FormationId[];
  era: TournamentEra;
  qualityBand: QualityBand;
  tacticalIdentity: string;
  description: string;
  simulationModifier: {
    attack: number;
    midfield: number;
    defense: number;
    clutch: number;
  };
  grades: {
    offense: number;
    defense: number;
  };
  leadership: number;
  gameManagement: number;
  eraFitProfile: ManagerEraFitProfile;
  imageId: string;
  achievements: TournamentAchievement[];
  isDraftEligible: boolean;
  draftIneligibilityReason: string | null;
};

export type DraftPick = {
  slotId: string;
  cardId: string;
};

export type PositionFitState = "green" | "yellow" | "red" | "incompatible";

export type PositionFitPreview = {
  slotId: string;
  fit: number;
  state: PositionFitState;
  label: string;
  penaltyPercent: number;
  canPlace: boolean;
  feasibilityBlocked: boolean;
};

export type PlacementFeedback = {
  cardId: string;
  slotId: string;
  slotLabel: string;
  fit: number;
  penaltyPercent: number;
  eraFit: number;
  managerFit: number;
  chemistryChange: number;
  overallChange: number;
};

export type BenchSlotId = "bench-1" | "bench-2" | "bench-3";
export type BenchPick = {
  slotId: BenchSlotId;
  cardId: string;
};

export type FitBreakdown = {
  positionFit: number;
  eraFit: number;
  managerFit: number;
};

export type TeamRatings = {
  attack: number;
  midfield: number;
  defense: number;
  chemistry: number;
  positionFit: number;
  eraFit: number;
  managerFit: number;
  benchDepth: number;
  benchVersatility: number;
  tacticalBalance: number;
  timelessness: number;
  managerOffense: number;
  managerDefense: number;
  overall: number;
};

export type ChampionLineupPlayer = {
  playerIdentityId: string;
  name: string;
  position: Position;
  rating: number;
};

export type Champion = {
  id: string;
  countryName: string;
  countryCode: string;
  flag: string;
  year: number;
  playable: boolean;
  formation: string;
  ratings: Pick<
    TeamRatings,
    "attack" | "midfield" | "defense" | "chemistry" | "overall"
  > & {
    positionFit?: number;
    eraFit?: number;
    managerFit?: number;
  };
  tacticalIdentity: string;
  difficulty: string;
  description: string;
  lineup: ChampionLineupPlayer[];
};

export type MatchEventType =
  | "kickoff"
  | "commentary"
  | "manager"
  | "goal"
  | "yellow"
  | "substitution"
  | "halftime"
  | "extra-time"
  | "penalties"
  | "fulltime";

export type MatchEvent = {
  id: string;
  minute: number;
  minuteLabel: string;
  type: MatchEventType;
  team: "user" | "opponent" | "neutral";
  title: string;
  detail: string;
  userScore: number;
  opponentScore: number;
};

export type PlayerMinutes = {
  cardId: string;
  playerName: string;
  tournamentYear: number;
  started: boolean;
  minutes: number;
  enteredAt: number | null;
  leftAt: number | null;
  goals: number;
  assists: number;
};

export type SubstitutionRecord = {
  minute: number;
  playerInId: string;
  playerOutId: string;
  position: Position;
  benchSlot: BenchSlotId;
  reason: string;
  managerInfluence: number;
};

export type MatchStats = {
  possession: [number, number];
  shots: [number, number];
  shotsOnTarget: [number, number];
  expectedGoals: [number, number];
  yellowCards: [number, number];
  tacticalImpact: [number, number];
};

export type Score = {
  user: number;
  opponent: number;
  afterExtraTime: boolean;
  penalties?: [number, number];
};

export type MatchResult = {
  seed: number;
  opponentId: string;
  score: Score;
  stats: MatchStats;
  events: MatchEvent[];
  playerOfTheMatch: string;
  userRatings: TeamRatings;
  managerImpact: string;
  opponentEraFit: number;
  playerMinutes: PlayerMinutes[];
  substitutions: SubstitutionRecord[];
  opponentSubstitutions: SubstitutionRecord[];
  generatedAt: string;
};

export type ImageAttribution = {
  id: string;
  kind: "player" | "manager";
  subjectName: string;
  tournamentYear: number;
  file: string;
  cacheVersion: string;
  sourceFile: string | null;
  sourcePage: string | null;
  author: string;
  license: string;
  licenseUrl: string | null;
  changes: string;
  fallback: boolean;
  representedTeam: string | null;
  photographedYear: number | null;
  exactTournamentImage: boolean;
  isNationalTeamKit: boolean;
  photoContext:
    | "exact-tournament"
    | "same-year-national-team"
    | "nearby-year-national-team"
    | "tournament-edition-game-face"
    | "other-licensed-face"
    | "original-project-mark";
  cropFocus: { x: number; y: number };
  gameEdition: string | null;
  gameEditionLaunchYear: number | null;
  sourceWebsite: string;
  retrievedOn: string;
  matchQuality:
    | "edition-verified"
    | "manually-reviewed-edition"
    | "identity-only-permissioned"
    | "user-supplied-permissioned";
  requiredAttribution: string;
};

export type TournamentFinish =
  | "champion"
  | "runner-up"
  | "third place"
  | "fourth place"
  | "semi-finals"
  | "quarter-finals"
  | "round of 16"
  | "second group stage"
  | "group stage";

export type HistoricalDataStatus =
  | "verified-lineup"
  | "partial"
  | "modeled-lineup";

export type HistoricalTeamTournamentStats = {
  matches: number | null;
  wins: number | null;
  draws: number | null;
  losses: number | null;
  goalsFor: number | null;
  goalsAgainst: number | null;
  cleanSheets: number | null;
};

export type HistoricalLineupPlayer = {
  playerIdentityId: string;
  sourcePlayerId?: string;
  name: string;
  position: Position;
  rating?: number;
};

export type HistoricalWorldCupTeam = {
  id: string;
  kind?: "historical" | "all-stars" | "model";
  nationCode: string;
  nationName: string;
  tournamentYear: WorldCupYear | null;
  confederation: Confederation | null;
  tournamentFinish: TournamentFinish | null;
  tournamentStatus: "complete" | "in-progress" | "featured";
  dataStatus: HistoricalDataStatus;
  managerName: string | null;
  managerIdentityId?: string;
  managerCardId?: string;
  formation: FormationId;
  /** Source-faithful historical shape; `formation` remains engine-compatible. */
  formationLabel?: string;
  engineFormationIsApproximation?: boolean;
  alternateFormations: FormationId[];
  startingLineup: HistoricalLineupPlayer[];
  substitutes: HistoricalLineupPlayer[];
  tacticalProfile: string;
  ratings: {
    attack: number;
    midfield: number;
    defense: number;
    goalkeeper: number;
    depth: number;
    overall: number;
  };
  tournamentStats: HistoricalTeamTournamentStats;
  sources: DataCitation[];
  finalLineupSource?: DataCitation;
  rosterSource?: DataCitation;
  championFact?: string;
  championFactSource?: DataCitation;
  era?: TournamentEra;
  originalRatings: true;
  formationIsModel: boolean;
  difficulty: "Contender" | "Elite" | "Legendary" | "Underdog" | "Mythic";
  allStars?: {
    subtitle: string;
    starterPicks: DraftPick[];
    substituteCardIds: readonly [string, string, string];
    manager: ManagerTournamentCard & {
      compositeLabel: "Trophy XI original composite manager.";
      eraAdaptability: number;
      substitutionBehavior: string;
    };
    chemistry: number;
    mythicModifier: {
      attack: number;
      midfield: number;
      defense: number;
      maximum: number;
    };
    rationales: Record<string, string>;
  };
};
