import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { managers } from "../src/data/managers";
import { players } from "../src/data/players";
import {
  gameFacePathForCard,
  summarizeGameFaceImport,
  validateGameFaceCandidate,
  validateGameFaceManifest,
  type GameFaceCardRef,
  type GameFaceImportCandidate,
  type GameFaceImportResult,
  type GameFaceManifestRecord,
} from "../src/lib/importers/game-face";

const ROOT = process.cwd();
const SOURCE_FILE = path.join(ROOT, "scripts", "game-face-import-sources.json");
const CACHE_FILE = path.join(
  ROOT,
  "scripts",
  "cache",
  "game-faces",
  "import-cache.json",
);
const REPORT_FILE = path.join(
  ROOT,
  "scripts",
  "reports",
  "game-face-import-report.json",
);
const MANIFEST_FILE = path.join(
  ROOT,
  "src",
  "data",
  "game-face-manifest.generated.json",
);
const RATE_LIMIT_MS = 1_500;
const MAX_SOURCE_BYTES = 10 * 1024 * 1024;

type ImportCache = Record<
  string,
  {
    status: GameFaceImportResult["status"];
    checkedAt: string;
    sourceUrl?: string;
    reason?: string;
  }
>;

type GeneratedManifest = {
  version: 1;
  generatedAt: string;
  faces: GameFaceManifestRecord[];
};

const readJson = async <T>(file: string, fallback: T): Promise<T> =>
  existsSync(file)
    ? (JSON.parse(await readFile(file, "utf8")) as T)
    : fallback;

const writeJson = async (file: string, value: unknown) => {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
};

const wait = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const localFileFor = (runtimePath: string) =>
  path.join(ROOT, "public", runtimePath.replace(/^\//, ""));

const sourceFileFor = (card: GameFaceCardRef) =>
  `/${card.kind === "player" ? "players" : "managers"}/game-face-sources/${card.id}.source`;

const importCandidate = async (
  candidate: GameFaceImportCandidate,
  card: GameFaceCardRef,
): Promise<GameFaceManifestRecord> => {
  const response = await fetch(candidate.sourceUrl, {
    headers: {
      "User-Agent":
        "TrophyXI/1.0 (exact-year reusable-media importer; contact via repository)",
      Accept: "image/avif,image/webp,image/png,image/jpeg",
    },
  });
  if (!response.ok) {
    throw new Error(`download failed with HTTP ${response.status}`);
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("image/")) {
    throw new Error(`source returned non-image content type ${contentType}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength === 0 || buffer.byteLength > MAX_SOURCE_BYTES) {
    throw new Error(`invalid source size ${buffer.byteLength} bytes`);
  }
  const sourceMetadata = await sharp(buffer).metadata();
  if (!sourceMetadata.width || !sourceMetadata.height || !sourceMetadata.format) {
    throw new Error("downloaded bytes are not a supported image");
  }

  const runtimePath = gameFacePathForCard(card.kind, card.id);
  const outputFile = localFileFor(runtimePath);
  const sourceFile = sourceFileFor(card);
  await mkdir(path.dirname(outputFile), { recursive: true });
  await mkdir(path.dirname(localFileFor(sourceFile)), { recursive: true });
  await writeFile(localFileFor(sourceFile), buffer);
  await sharp(buffer)
    .rotate()
    .resize(512, 512, {
      fit: "cover",
      position: "north",
      withoutEnlargement: false,
    })
    .ensureAlpha()
    .png({ compressionLevel: 9 })
    .toFile(outputFile);

  const outputMetadata = await sharp(outputFile).metadata();
  if (
    outputMetadata.format !== "png" ||
    outputMetadata.width !== 512 ||
    outputMetadata.height !== 512
  ) {
    throw new Error("PNG conversion did not produce a valid 512×512 image");
  }

  return {
    ...candidate,
    localPath: runtimePath,
    sourceFile,
    changes:
      "Validated as an image, rotated from metadata, center-top cropped, converted to a 512×512 PNG, and alpha-enabled.",
  };
};

const main = async () => {
  const cards: GameFaceCardRef[] = [
    ...players.map((player) => ({
      id: player.id,
      kind: "player" as const,
      tournamentYear: player.tournamentYear,
    })),
    ...managers.map((manager) => ({
      id: manager.id,
      kind: "manager" as const,
      tournamentYear: manager.tournamentYear,
    })),
  ];
  const cardsById = new Map(cards.map((card) => [card.id, card]));
  const candidates = await readJson<GameFaceImportCandidate[]>(SOURCE_FILE, []);
  const cache = await readJson<ImportCache>(CACHE_FILE, {});
  const previousManifest = await readJson<GeneratedManifest>(MANIFEST_FILE, {
    version: 1,
    generatedAt: new Date(0).toISOString(),
    faces: [],
  });
  const previousById = new Map(
    previousManifest.faces.map((record) => [record.id, record]),
  );
  const nextManifest: GameFaceManifestRecord[] = [];
  const results: GameFaceImportResult[] = [];
  let lastRequestAt = 0;

  for (const candidate of candidates) {
    const card = cardsById.get(candidate.id);
    const errors = validateGameFaceCandidate(candidate, card);
    if (errors.length > 0 || !card) {
      const reason = errors.join("; ");
      results.push({
        id: candidate.id,
        kind: candidate.kind,
        status: "failed",
        reason,
      });
      cache[candidate.id] = {
        status: "failed",
        checkedAt: new Date().toISOString(),
        sourceUrl: candidate.sourceUrl,
        reason,
      };
      continue;
    }

    const previous = previousById.get(candidate.id);
    if (previous && existsSync(localFileFor(previous.localPath))) {
      nextManifest.push(previous);
      results.push({
        id: candidate.id,
        kind: candidate.kind,
        status: "skipped",
        reason: "Completed exact-year import is already cached locally.",
      });
      cache[candidate.id] = {
        status: "skipped",
        checkedAt: new Date().toISOString(),
        sourceUrl: candidate.sourceUrl,
      };
      continue;
    }

    try {
      const remainingDelay =
        RATE_LIMIT_MS - (Date.now() - lastRequestAt);
      if (remainingDelay > 0) await wait(remainingDelay);
      lastRequestAt = Date.now();
      const record = await importCandidate(candidate, card);
      nextManifest.push(record);
      results.push({
        id: candidate.id,
        kind: candidate.kind,
        status: "downloaded",
      });
      cache[candidate.id] = {
        status: "downloaded",
        checkedAt: new Date().toISOString(),
        sourceUrl: candidate.sourceUrl,
      };
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : "unknown import failure";
      results.push({
        id: candidate.id,
        kind: candidate.kind,
        status: "failed",
        reason,
      });
      cache[candidate.id] = {
        status: "failed",
        checkedAt: new Date().toISOString(),
        sourceUrl: candidate.sourceUrl,
        reason,
      };
    }
  }

  const manifestErrors = validateGameFaceManifest(nextManifest, cards);
  if (manifestErrors.length > 0) {
    throw new Error(`Generated manifest is invalid:\n${manifestErrors.join("\n")}`);
  }
  const generatedAt = new Date().toISOString();
  const summary = summarizeGameFaceImport(cards, results);
  await writeJson(CACHE_FILE, cache);
  await writeJson(MANIFEST_FILE, {
    version: 1,
    generatedAt,
    faces: nextManifest,
  } satisfies GeneratedManifest);
  await writeJson(REPORT_FILE, {
    generatedAt,
    policy:
      "Only explicitly approved, reusable, exact-year sources are importable. Protected football-game asset hosts are rejected.",
    configuredCandidates: candidates.length,
    activeExactYearFaces: nextManifest.length,
    ...summary,
  });

  console.log("Exact-year face import summary");
  console.log(`Downloaded: ${summary.downloaded}`);
  console.log(`Skipped: ${summary.skipped}`);
  console.log(`Failed: ${summary.failed}`);
  console.log(`Photo Pending: ${summary.photoPending}`);
};

void main();
