import generatedJson from "@/data/game-face-manifest.generated.json";
import type { GameFaceManifestRecord } from "@/lib/importers/game-face";

type GeneratedGameFaceManifest = {
  version: number;
  generatedAt: string;
  faces: GameFaceManifestRecord[];
};

const generated = generatedJson as unknown as GeneratedGameFaceManifest;

/**
 * Exact-year faces are generated only by the license-gated importer. Runtime
 * code never discovers files by URL or filename and never hotlinks a source.
 */
export const gameFaceManifestGeneratedAt = generated.generatedAt;
export const gameFaceRecords = generated.faces;
export const playerGameFaceRecords = gameFaceRecords.filter(
  (record) => record.kind === "player",
);
export const managerGameFaceRecords = gameFaceRecords.filter(
  (record) => record.kind === "manager",
);
export const playerGameFaceCardIds = playerGameFaceRecords.map(
  (record) => record.id,
);
export const managerGameFaceCardIds = managerGameFaceRecords.map(
  (record) => record.id,
);
