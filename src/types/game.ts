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
export type TournamentEra = "1990s" | "2000s" | "2010s" | "2020s";
export type DraftEraId =
  | "all"
  | "turn-of-century"
  | "modern-masters"
  | "new-generation";
export type QualityBand =
  | "iconic"
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

export type TournamentStatLine = {
  appearances: number | null;
  starts: number | null;
  minutes: number | null;
  goals: number | null;
  assists: number | null;
  cleanSheets: number | null;
  saves: number | null;
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
  tournamentStats: TournamentStatLine;
  statSources: DataCitation[];
  achievements: TournamentAchievement[];
  imageId: string;
};

export type DraftEra = {
  id: DraftEraId;
  label: string;
  years: string;
  yearRange: readonly [number, number];
  description: string;
  accent: string;
  themeClass: string;
};

export type FormationId = "4-3-3" | "4-2-3-1" | "4-4-2" | "3-5-2";

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
  imageId: string;
  achievements: TournamentAchievement[];
};

export type DraftPick = {
  slotId: string;
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
  ratings: Omit<TeamRatings, "positionFit" | "eraFit" | "managerFit"> & {
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
  generatedAt: string;
};

export type ImageAttribution = {
  id: string;
  kind: "player" | "manager";
  subjectName: string;
  tournamentYear: number;
  file: string;
  sourceFile: string | null;
  sourcePage: string | null;
  author: string;
  license: string;
  licenseUrl: string | null;
  changes: string;
  fallback: boolean;
};
