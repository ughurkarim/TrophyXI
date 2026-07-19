import { existsSync } from "node:fs";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import { managers } from "../src/data/managers";
import { players } from "../src/data/players";
import {
  gameFacePathForCard,
  isPermittedGameAssetHost,
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
const REQUEST_LEDGER_FILE = path.join(
  ROOT,
  "scripts",
  "cache",
  "game-faces",
  "request-ledger.json",
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
const RATE_LIMIT_MS = 2_000;
const MAX_DAILY_DOWNLOADS = 5_000;
const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const force = process.argv.includes("--force");

type ImportCache = Record<
  string,
  {
    status: GameFaceImportResult["status"];
    checkedAt: string;
    sourceUrl?: string;
    reason?: string;
    etag?: string;
    lastModified?: string;
    sha256?: string;
    byteLength?: number;
  }
>;

type RequestLedger = {
  version: 1;
  utcDayCounts: Record<string, number>;
  lastRequestAt: string | null;
};

type GeneratedManifest = {
  version: 1;
  generatedAt: string;
  faces: GameFaceManifestRecord[];
};

type ImportedFace = {
  record: GameFaceManifestRecord;
  etag?: string;
  lastModified?: string;
  sha256: string;
  byteLength: number;
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
  path.join(ROOT, runtimePath.replace(/^\//, ""));

const utcDateKey = (date = new Date()) => date.toISOString().slice(0, 10);

const normalizeRequestLedger = (value: unknown): RequestLedger => {
  if (
    value &&
    typeof value === "object" &&
    "version" in value &&
    value.version === 1 &&
    "utcDayCounts" in value &&
    value.utcDayCounts &&
    typeof value.utcDayCounts === "object"
  ) {
    const ledger = value as RequestLedger;
    return {
      version: 1,
      utcDayCounts: Object.fromEntries(
        Object.entries(ledger.utcDayCounts).filter(
          ([key, count]) =>
            /^\d{4}-\d{2}-\d{2}$/.test(key) &&
            Number.isInteger(count) &&
            count >= 0,
        ),
      ),
      lastRequestAt:
        typeof ledger.lastRequestAt === "string"
          ? ledger.lastRequestAt
          : null,
    };
  }
  const legacyCounts =
    value && typeof value === "object"
      ? Object.fromEntries(
          Object.entries(value).filter(
            ([key, count]) =>
              /^\d{4}-\d{2}-\d{2}$/.test(key) &&
              Number.isInteger(count) &&
              Number(count) >= 0,
          ),
        )
      : {};
  return {
    version: 1,
    utcDayCounts: legacyCounts as Record<string, number>,
    lastRequestAt: null,
  };
};

const importCandidate = async (
  candidate: GameFaceImportCandidate,
  card: GameFaceCardRef,
  cached: ImportCache[string] | undefined,
  requestLedger: RequestLedger,
): Promise<ImportedFace> => {
  const runtimePath = gameFacePathForCard(
    card.kind,
    card.id,
    card.tournamentYear,
  );
  const outputFile = localFileFor(runtimePath);
  const manifestRecord: GameFaceManifestRecord = {
    ...candidate,
    localPath: runtimePath,
    sourceFile: runtimePath,
    changes:
      "No image transformation. Original PNG bytes, embedded metadata, and any watermark are preserved exactly as downloaded.",
  };
  const previousRequestAt = requestLedger.lastRequestAt
    ? Date.parse(requestLedger.lastRequestAt)
    : 0;
  const remainingDelay = RATE_LIMIT_MS - (Date.now() - previousRequestAt);
  if (remainingDelay > 0) await wait(remainingDelay);
  const requestTime = new Date();
  const dateKey = utcDateKey(requestTime);
  const requestsToday = requestLedger.utcDayCounts[dateKey] ?? 0;
  if (requestsToday >= MAX_DAILY_DOWNLOADS) {
    throw new Error("daily EA/SoFIFA download limit of 5,000 reached");
  }
  requestLedger.utcDayCounts[dateKey] = requestsToday + 1;
  requestLedger.lastRequestAt = requestTime.toISOString();
  await writeJson(REQUEST_LEDGER_FILE, requestLedger);
  const response = await fetch(candidate.sourceUrl, {
    redirect: "manual",
    headers: {
      "User-Agent":
        "TrophyXI/1.0 (permissioned tournament-edition face importer; attribution preserved)",
      Accept: "image/png",
      ...(cached?.etag ? { "If-None-Match": cached.etag } : {}),
      ...(cached?.lastModified
        ? { "If-Modified-Since": cached.lastModified }
        : {}),
    },
  });
  if (response.status === 304) {
    if (!existsSync(outputFile)) {
      throw new Error("conditional cache hit requires an existing local asset");
    }
    const buffer = await readFile(outputFile);
    const metadata = await sharp(buffer).metadata();
    if (!metadata.width || !metadata.height || metadata.format !== "png") {
      throw new Error("cached conditional response is not a PNG image");
    }
    return {
      record: manifestRecord,
      ...(cached?.etag ? { etag: cached.etag } : {}),
      ...(cached?.lastModified
        ? { lastModified: cached.lastModified }
        : {}),
      sha256: createHash("sha256").update(buffer).digest("hex"),
      byteLength: buffer.byteLength,
    };
  }
  if (response.status >= 300 && response.status < 400) {
    const redirectTarget = response.headers.get("location");
    throw new Error(
      `source redirected${
        redirectTarget ? ` to ${redirectTarget}` : ""
      }; review and configure the direct permitted asset URL`,
    );
  }
  if (!isPermittedGameAssetHost(response.url)) {
    throw new Error("response host is outside the permitted EA/SoFIFA scope");
  }
  if (!response.ok) {
    throw new Error(`download failed with HTTP ${response.status}`);
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("image/png")) {
    throw new Error(`source returned non-image content type ${contentType}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength === 0 || buffer.byteLength > MAX_SOURCE_BYTES) {
    throw new Error(`invalid source size ${buffer.byteLength} bytes`);
  }
  const sourceMetadata = await sharp(buffer).metadata();
  if (
    !sourceMetadata.width ||
    !sourceMetadata.height ||
    sourceMetadata.format !== "png"
  ) {
    throw new Error("downloaded bytes are not a PNG image");
  }

  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(outputFile, buffer);

  return {
    record: manifestRecord,
    ...(response.headers.get("etag")
      ? { etag: response.headers.get("etag")! }
      : {}),
    ...(response.headers.get("last-modified")
      ? { lastModified: response.headers.get("last-modified")! }
      : {}),
    sha256: createHash("sha256").update(buffer).digest("hex"),
    byteLength: buffer.byteLength,
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
  const requestLedger = normalizeRequestLedger(
    await readJson<unknown>(REQUEST_LEDGER_FILE, {}),
  );
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
  const refreshFailures: Array<{ id: string; reason: string }> = [];
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
    if (
      !force &&
      previous &&
      previous.sourceUrl === candidate.sourceUrl &&
      existsSync(localFileFor(previous.localPath))
    ) {
      nextManifest.push({
        ...previous,
        ...candidate,
        localPath: gameFacePathForCard(
          card.kind,
          card.id,
          card.tournamentYear,
        ),
        sourceFile: previous.localPath,
      });
      results.push({
        id: candidate.id,
        kind: candidate.kind,
        status: "skipped",
        reason: "Completed tournament-edition import is already cached locally.",
      });
      cache[candidate.id] = {
        ...cache[candidate.id],
        status: "skipped",
        checkedAt: new Date().toISOString(),
        sourceUrl: candidate.sourceUrl,
      };
      continue;
    }

    try {
      const imported = await importCandidate(
        candidate,
        card,
        !force && cache[candidate.id]?.sourceUrl === candidate.sourceUrl
          ? cache[candidate.id]
          : undefined,
        requestLedger,
      );
      nextManifest.push(imported.record);
      results.push({
        id: candidate.id,
        kind: candidate.kind,
        status: "downloaded",
      });
      cache[candidate.id] = {
        status: "downloaded",
        checkedAt: new Date().toISOString(),
        sourceUrl: candidate.sourceUrl,
        ...(imported.etag ? { etag: imported.etag } : {}),
        ...(imported.lastModified
          ? { lastModified: imported.lastModified }
          : {}),
        sha256: imported.sha256,
        byteLength: imported.byteLength,
      };
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : "unknown import failure";
      if (
        previous &&
        previous.sourceUrl === candidate.sourceUrl &&
        existsSync(localFileFor(previous.localPath))
      ) {
        nextManifest.push({
          ...previous,
          ...candidate,
          localPath: gameFacePathForCard(
            card.kind,
            card.id,
            card.tournamentYear,
          ),
          sourceFile: previous.localPath,
        });
        results.push({
          id: candidate.id,
          kind: candidate.kind,
          status: "skipped",
          reason: `Refresh failed; retained existing local asset. ${reason}`,
        });
        refreshFailures.push({ id: candidate.id, reason });
        cache[candidate.id] = {
          ...cache[candidate.id],
          status: "failed",
          checkedAt: new Date().toISOString(),
          sourceUrl: candidate.sourceUrl,
          reason,
        };
        continue;
      }
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
  const activePaths = new Set(
    nextManifest.map((record) => record.localPath),
  );
  for (const previous of previousManifest.faces) {
    const expectedPreviousPath = gameFacePathForCard(
      previous.kind,
      previous.id,
      previous.tournamentYear,
    );
    const previousFile = localFileFor(previous.localPath);
    if (
      previous.localPath === expectedPreviousPath &&
      !activePaths.has(previous.localPath) &&
      existsSync(previousFile)
    ) {
      await unlink(previousFile);
    }
  }
  const generatedAt = new Date().toISOString();
  const summary = summarizeGameFaceImport(cards, results);
  await writeJson(CACHE_FILE, cache);
  await writeJson(REQUEST_LEDGER_FILE, requestLedger);
  await writeJson(MANIFEST_FILE, {
    version: 1,
    generatedAt,
    faces: nextManifest,
  } satisfies GeneratedManifest);
  await writeJson(REPORT_FILE, {
    generatedAt,
    policy:
      "Project-specific EA/SoFIFA permission only: local cache first; at least two seconds between requests; maximum 5,000 per UTC day; original PNG metadata and watermarks preserved; required attribution retained. The former UTC download window no longer applies.",
    configuredCandidates: candidates.length,
    activeTournamentEditionFaces: nextManifest.length,
    refreshFailures: refreshFailures.length,
    refreshFailureResults: refreshFailures,
    ...summary,
  });

  console.log("Tournament-edition face import summary");
  console.log(`Downloaded: ${summary.downloaded}`);
  console.log(`Skipped: ${summary.skipped}`);
  console.log(`Failed: ${summary.failed}`);
  console.log(`Photo Pending: ${summary.photoPending}`);
};

void main();
