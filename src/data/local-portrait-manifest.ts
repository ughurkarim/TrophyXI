import generatedJson from "@/data/local-portrait-manifest.generated.json";

export type LocalPortraitManifestRecord = {
  id: string;
  kind: "player" | "manager";
  playerIdentityId?: string;
  tournamentYear: number;
  localPath: string;
  sourceFile: string;
  portraitScope: "card-specific" | "identity-only";
  cacheVersion: string;
  changes: string;
};

type GeneratedLocalPortraitManifest = {
  version: number;
  generatedAt: string;
  portraits: LocalPortraitManifestRecord[];
};

const generated = generatedJson as GeneratedLocalPortraitManifest;

export const localPortraitManifestGeneratedAt = generated.generatedAt;
export const localPortraitRecords = generated.portraits;
export const playerLocalPortraitRecords = localPortraitRecords.filter(
  (record) => record.kind === "player",
);
export const managerLocalPortraitRecords = localPortraitRecords.filter(
  (record) => record.kind === "manager",
);
