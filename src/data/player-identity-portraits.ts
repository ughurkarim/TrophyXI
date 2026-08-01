import generatedJson from "@/data/player-identity-portraits.generated.json";

export type PlayerIdentityPortraitRecord = {
  id: string;
  kind: "player";
  playerIdentityId: string;
  tournamentYear: number;
  localPath: string;
  sourceFile: string;
  portraitScope: "card-exact" | "identity-only";
  cacheVersion: string;
  changes: string;
  sourcePage: string | null;
  sourceImageUrl: string | null;
};

export type CanonicalPlayerIdentityPortrait = {
  playerIdentityId: string;
  playerName: string;
  sourceCardId: string;
  sourceTournamentYear: number;
  localPath: string;
  sourceFile: string;
  sourcePage: string | null;
  sourceImageUrl: string | null;
  sourceKind:
    | "existing-local"
    | "sofifa-game-face"
    | "linked-encyclopedia-page"
    | "reviewed-name-search"
    | "reviewed-media-search"
    | "reviewed-override";
  cacheVersion: string;
  changes: string;
};

type GeneratedPlayerIdentityPortraitArchive = {
  version: 1;
  generatedAt: string;
  identityCount: number;
  coveredIdentityCount: number;
  existingIdentityCount: number;
  importedIdentityCount: number;
  identityPortraits: CanonicalPlayerIdentityPortrait[];
  importedPortraits: PlayerIdentityPortraitRecord[];
  unresolvedIdentities: {
    playerIdentityId: string;
    playerName: string;
    countryName: string;
    reason: string;
  }[];
};

const generated = generatedJson as GeneratedPlayerIdentityPortraitArchive;

export const playerIdentityPortraitArchiveGeneratedAt = generated.generatedAt;
export const playerIdentityPortraitIdentityCount = generated.identityCount;
export const coveredPlayerIdentityPortraitCount = generated.coveredIdentityCount;
export const importedPlayerIdentityPortraitRecords = generated.importedPortraits;
export const unresolvedPlayerIdentityPortraits = generated.unresolvedIdentities;
export const canonicalPlayerIdentityPortraits = generated.identityPortraits;
export const canonicalPlayerIdentityPortraitById = new Map(
  canonicalPlayerIdentityPortraits.map((portrait) => [
    portrait.playerIdentityId,
    portrait,
  ]),
);
