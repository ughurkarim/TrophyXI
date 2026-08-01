import generatedJson from "@/data/player-career.generated.json";
import displayAccoladesJson from "@/data/player-career-accolades-by-identity.generated.json";
import type {
  PlayerAccolade,
  PlayerCareerStats,
  Top100Source,
} from "@/types/game";

export type PlayerCareerData = {
  careerStats: PlayerCareerStats | null;
  accolades: PlayerAccolade[];
  top100Player: boolean;
  top100Source?: Top100Source;
};

export type PlayerCareerPrimarySourceReview = {
  playerId: string | null;
  url: string;
  status:
    | "checked-current-titles-and-achievements-page"
    | "checked-current-profile-and-all-competitions"
    | "checked-current-no-player-profile"
    | "checked-cached-titles-and-achievements-page"
    | "checked-cached-profile-identity-verified"
    | "checked-current-profile-access-blocked"
    | "checked-current-search-access-blocked";
};

export type PlayerCareerAlternativeSourceReview = {
  sourceName: string;
  url: string;
  reason: string;
};

export type PlayerDisplayAccoladeRecord = {
  verificationStatus:
    | "verified"
    | "partially-verified"
    | "unresolved"
    | "verified-no-recorded-major-accolades";
  reviewedAt?: string;
  researchStatus?: "complete";
  sourceReview?: {
    transfermarkt: PlayerCareerPrimarySourceReview;
    fbref: PlayerCareerPrimarySourceReview;
    alternatives: PlayerCareerAlternativeSourceReview[];
  };
  accolades: PlayerAccolade[];
};

type GeneratedCareerArchive = {
  version: number;
  generatedAt: string;
  players: Record<string, PlayerCareerData>;
};

const generated = generatedJson as unknown as GeneratedCareerArchive;
const displayAccolades = displayAccoladesJson as unknown as {
  version: number;
  generatedAt: string;
  identities: Record<string, PlayerDisplayAccoladeRecord>;
};

export const playerCareerDataGeneratedAt = generated.generatedAt;
export const playerCareerDataByIdentityId = new Map(
  Object.entries(generated.players),
);
export const playerDisplayAccoladesByIdentityId = new Map(
  Object.entries(displayAccolades.identities),
);
