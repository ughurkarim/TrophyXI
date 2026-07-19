import generatedJson from "@/data/fbref-portrait-manifest.generated.json";
import type { FbrefPortraitManifestRecord } from "@/lib/importers/fbref-portrait";

type GeneratedFbrefPortraitManifest = {
  version: number;
  generatedAt: string;
  portraits: FbrefPortraitManifestRecord[];
};

const generated =
  generatedJson as unknown as GeneratedFbrefPortraitManifest;

/**
 * Historical FBref portraits are importer-owned, local, and explicitly
 * identity-only. Runtime code never hotlinks or upgrades them to exact-year.
 */
export const fbrefPortraitManifestGeneratedAt = generated.generatedAt;
export const fbrefPortraitRecords = generated.portraits;
