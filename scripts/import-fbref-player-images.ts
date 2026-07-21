import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { players, playersById } from "../src/data/players";
import { userSuppliedPlayerImages } from "../src/data/user-player-portraits";
import {
  FBREF_REQUIRED_ATTRIBUTION,
  fbrefPortraitPathForCard,
  parseFbrefPortraitAssetUrl,
  validateFbrefPortraitManifest,
  validateFbrefPortraitMapping,
  waybackRawUrlFor,
  type FbrefPortraitCardRef,
  type FbrefPortraitManifestRecord,
  type FbrefPortraitMapping,
} from "../src/lib/importers/fbref-portrait";

const ROOT = process.cwd();
const MAPPING_FILE = path.join(ROOT, "scripts", "fbref-portrait-map.json");
const CACHE_DIRECTORY = path.join(
  ROOT,
  "scripts",
  "cache",
  "fbref-portraits",
);
const MANIFEST_FILE = path.join(
  ROOT,
  "src",
  "data",
  "fbref-portrait-manifest.generated.json",
);
const REPORT_FILE = path.join(
  ROOT,
  "scripts",
  "reports",
  "fbref-portrait-import-report.json",
);
const RATE_LIMIT_MS = 1_000;
const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_REQUEST_ATTEMPTS = 3;
const force = process.argv.includes("--force");
const cacheOnly = process.argv.includes("--cache-only");

type GeneratedManifest = {
  version: 1;
  generatedAt: string;
  portraits: FbrefPortraitManifestRecord[];
};

type ImportResult = {
  playerIdentityId: string;
  playerName: string;
  cardIds: string[];
  status: "downloaded" | "skipped" | "failed";
  reason?: string;
};

let lastRequestAt = 0;

const wait = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const localFileFor = (runtimePath: string) =>
  path.join(ROOT, runtimePath.replace(/^\//, ""));

const sha256 = (value: Buffer) =>
  createHash("sha256").update(value).digest("hex");

const fetchArchived = async (sourceUrl: string, accept: string) => {
  const retrievalUrl = waybackRawUrlFor(sourceUrl);
  let lastError: unknown;
  let attemptsUsed = 0;
  for (let attempt = 1; attempt <= MAX_REQUEST_ATTEMPTS; attempt += 1) {
    attemptsUsed = attempt;
    const remainingDelay = RATE_LIMIT_MS - (Date.now() - lastRequestAt);
    if (remainingDelay > 0) await wait(remainingDelay);
    lastRequestAt = Date.now();
    try {
      const response = await fetch(retrievalUrl, {
        redirect: "follow",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: {
          "User-Agent":
            "TrophyXI/1.0 (permissioned FBref historical portrait importer; archive retrieval)",
          Accept: accept,
        },
      });
      if (response.ok) return { response, retrievalUrl };
      lastError = new Error(
        `archived source returned HTTP ${response.status}`,
      );
      if (![429, 500, 502, 503, 504].includes(response.status)) break;
    } catch (error) {
      lastError = error;
    }
    if (attempt < MAX_REQUEST_ATTEMPTS) {
      await wait(attempt * 2_000);
    }
  }
  throw new Error(
    lastError instanceof Error
      ? `archived retrieval failed after ${attemptsUsed} attempt${
          attemptsUsed === 1 ? "" : "s"
        }: ${lastError.message}`
      : "archived retrieval failed after bounded retries",
  );
};

const readOrFetchProfile = async (mapping: FbrefPortraitMapping) => {
  const cacheFile = path.join(
    CACHE_DIRECTORY,
    `${mapping.fbrefId}-profile.html`,
  );
  if (!force && existsSync(cacheFile)) {
    return readFile(cacheFile, "utf8");
  }
  if (cacheOnly) {
    throw new Error("profile is not available in the local portrait cache");
  }
  const { response } = await fetchArchived(
    mapping.sourcePage,
    "text/html,application/xhtml+xml",
  );
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLocaleLowerCase().includes("text/html")) {
    throw new Error(`profile returned non-HTML content type ${contentType}`);
  }
  const html = await response.text();
  await mkdir(CACHE_DIRECTORY, { recursive: true });
  await writeFile(cacheFile, html);
  return html;
};

const readOrFetchPortrait = async (sourceAssetUrl: string, fbrefId: string) => {
  const extension = new URL(sourceAssetUrl).pathname
    .split(".")
    .pop()
    ?.toLocaleLowerCase();
  const cacheFile = path.join(
    CACHE_DIRECTORY,
    `${fbrefId}-source.${extension === "png" ? "png" : "jpg"}`,
  );
  if (!force && existsSync(cacheFile)) {
    return {
      bytes: await readFile(cacheFile),
      retrievalUrl: waybackRawUrlFor(sourceAssetUrl),
    };
  }
  if (cacheOnly) {
    throw new Error("portrait is not available in the local portrait cache");
  }
  const { response, retrievalUrl } = await fetchArchived(
    sourceAssetUrl,
    "image/jpeg,image/png",
  );
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLocaleLowerCase().startsWith("image/")) {
    throw new Error(`portrait returned non-image content type ${contentType}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_SOURCE_BYTES) {
    throw new Error(`invalid portrait size ${bytes.byteLength} bytes`);
  }
  const metadata = await sharp(bytes).metadata();
  if (
    !metadata.width ||
    !metadata.height ||
    !["jpeg", "png"].includes(metadata.format ?? "")
  ) {
    throw new Error("archived source is not a supported JPEG or PNG image");
  }
  await mkdir(CACHE_DIRECTORY, { recursive: true });
  await writeFile(cacheFile, bytes);
  return { bytes, retrievalUrl };
};

const runtimePngFor = async (sourceBytes: Buffer) => {
  const metadata = await sharp(sourceBytes).metadata();
  if (metadata.format === "png") return sourceBytes;
  return sharp(sourceBytes).withMetadata().png().toBuffer();
};

const reviewedLegacyHeadshotUrlFor = (fbrefId: string) =>
  `https://fbref.com/req/202302030/images/headshots/${fbrefId}_2022.jpg`;

const main = async () => {
  if (!existsSync(MAPPING_FILE)) {
    throw new Error(
      "Missing scripts/fbref-portrait-map.json; run npm run images:generate:fbref-map first.",
    );
  }
  const historicalCards: FbrefPortraitCardRef[] = players
    .filter((player) => player.tournamentYear <= 2002)
    .map((player) => ({
      id: player.id,
      playerIdentityId: player.playerIdentityId,
      playerName: player.playerName,
      tournamentYear: player.tournamentYear,
    }));
  const targetIdentityIds = new Set(
    historicalCards.map((card) => card.playerIdentityId),
  );
  const userSuppliedIdentityIds = new Set(
    userSuppliedPlayerImages.flatMap((image) => {
      const player = playersById.get(image.id);
      return player ? [player.playerIdentityId] : [];
    }),
  );
  const mappings = JSON.parse(
    await readFile(MAPPING_FILE, "utf8"),
  ) as FbrefPortraitMapping[];
  const previousManifest: GeneratedManifest = existsSync(MANIFEST_FILE)
    ? (JSON.parse(await readFile(MANIFEST_FILE, "utf8")) as GeneratedManifest)
    : {
        version: 1,
        generatedAt: new Date(0).toISOString(),
        portraits: [],
      };
  const previousByIdentity = new Map<string, FbrefPortraitManifestRecord[]>();
  for (const record of previousManifest.portraits) {
    previousByIdentity.set(record.playerIdentityId, [
      ...(previousByIdentity.get(record.playerIdentityId) ?? []),
      record,
    ]);
  }
  const nextManifest: FbrefPortraitManifestRecord[] = [];
  const results: ImportResult[] = [];

  for (const mapping of mappings) {
    const cards = historicalCards.filter(
      (card) => card.playerIdentityId === mapping.playerIdentityId,
    );
    const mappingErrors = validateFbrefPortraitMapping(
      mapping,
      targetIdentityIds,
    );
    if (mappingErrors.length > 0 || cards.length === 0) {
      results.push({
        playerIdentityId: mapping.playerIdentityId,
        playerName: mapping.playerName,
        cardIds: cards.map((card) => card.id),
        status: "failed",
        reason:
          mappingErrors.join("; ") ||
          "mapping has no pre-2003 active tournament card",
      });
      continue;
    }
    if (userSuppliedIdentityIds.has(mapping.playerIdentityId)) {
      results.push({
        playerIdentityId: mapping.playerIdentityId,
        playerName: mapping.playerName,
        cardIds: cards.map((card) => card.id),
        status: "skipped",
        reason:
          "User-supplied identity portrait already covers this player; preserved without overwrite.",
      });
      continue;
    }

    const previous = previousByIdentity.get(mapping.playerIdentityId) ?? [];
    if (
      !force &&
      previous.length === cards.length &&
      previous.every(
        (record) =>
          record.fbrefId === mapping.fbrefId &&
          record.sourcePage === mapping.sourcePage &&
          existsSync(localFileFor(record.localPath)),
      )
    ) {
      nextManifest.push(...previous);
      results.push({
        playerIdentityId: mapping.playerIdentityId,
        playerName: mapping.playerName,
        cardIds: cards.map((card) => card.id),
        status: "skipped",
        reason: "Completed FBref portrait import is cached locally.",
      });
      continue;
    }

    try {
      const html = await readOrFetchProfile(mapping);
      let sourceAssetUrl: string;
      try {
        sourceAssetUrl = parseFbrefPortraitAssetUrl(
          html,
          mapping.fbrefId,
        );
      } catch (error) {
        if (
          !(error instanceof Error) ||
          !error.message.includes("does not expose a headshot")
        ) {
          throw error;
        }
        sourceAssetUrl = reviewedLegacyHeadshotUrlFor(mapping.fbrefId);
      }
      const { bytes: sourceBytes, retrievalUrl } =
        await readOrFetchPortrait(sourceAssetUrl, mapping.fbrefId);
      const runtimeBytes = await runtimePngFor(sourceBytes);
      const sourceDigest = sha256(sourceBytes);
      const runtimeDigest = sha256(runtimeBytes);
      const retrievedOn = new Date().toISOString().slice(0, 10);
      const sourceFormat = (await sharp(sourceBytes).metadata()).format;
      const changes =
        sourceFormat === "png"
          ? "Original PNG bytes retained without crop or visual transformation; photograph date not stated by FBref."
          : "Source JPEG converted to local PNG without crop, resize, or background removal; photograph date not stated by FBref.";

      for (const card of cards) {
        const runtimePath = fbrefPortraitPathForCard(
          card.id,
          card.tournamentYear,
        );
        const outputFile = localFileFor(runtimePath);
        await mkdir(path.dirname(outputFile), { recursive: true });
        await writeFile(outputFile, runtimeBytes);
        nextManifest.push({
          id: card.id,
          kind: "player",
          playerIdentityId: card.playerIdentityId,
          tournamentYear: card.tournamentYear,
          fbrefId: mapping.fbrefId,
          sourceWebsite: "FBref",
          sourcePage: mapping.sourcePage,
          sourceAssetUrl,
          retrievalUrl,
          localPath: runtimePath,
          sourceFile: runtimePath,
          sourcePublisher: "Sports Reference",
          photographer: null,
          license: "Project-specific FBref permission",
          permissionReference: "User-confirmed project-specific permission",
          retrievedOn,
          matchQuality: "identity-only-permissioned",
          requiredAttribution: FBREF_REQUIRED_ATTRIBUTION,
          changes,
          sourceSha256: sourceDigest,
          sourceByteLength: sourceBytes.byteLength,
          runtimeSha256: runtimeDigest,
          runtimeByteLength: runtimeBytes.byteLength,
        });
      }
      results.push({
        playerIdentityId: mapping.playerIdentityId,
        playerName: mapping.playerName,
        cardIds: cards.map((card) => card.id),
        status: "downloaded",
      });
    } catch (error) {
      results.push({
        playerIdentityId: mapping.playerIdentityId,
        playerName: mapping.playerName,
        cardIds: cards.map((card) => card.id),
        status: "failed",
        reason:
          error instanceof Error ? error.message : "unknown import failure",
      });
    }
  }

  nextManifest.sort(
    (first, second) =>
      first.tournamentYear - second.tournamentYear ||
      first.id.localeCompare(second.id),
  );
  const manifestErrors = validateFbrefPortraitManifest(
    nextManifest,
    historicalCards,
  );
  if (manifestErrors.length > 0) {
    throw new Error(
      `Generated FBref manifest is invalid:\n${manifestErrors.join("\n")}`,
    );
  }
  const activePaths = new Set(
    nextManifest.map((record) => record.localPath),
  );
  for (const previous of previousManifest.portraits) {
    const previousFile = localFileFor(previous.localPath);
    if (!activePaths.has(previous.localPath) && existsSync(previousFile)) {
      await unlink(previousFile);
    }
  }

  const generatedAt = new Date().toISOString();
  await writeFile(
    MANIFEST_FILE,
    `${JSON.stringify(
      {
        version: 1,
        generatedAt,
        portraits: nextManifest,
      } satisfies GeneratedManifest,
      null,
      2,
    )}\n`,
  );
  const count = (status: ImportResult["status"]) =>
    results.filter((result) => result.status === status).length;
  const coveredIdentityIds = new Set(
    nextManifest.map((record) => record.playerIdentityId),
  );
  await writeFile(
    REPORT_FILE,
    `${JSON.stringify(
      {
        generatedAt,
        policy:
          "User-confirmed project-specific FBref permission. FBref remains the source; Internet Archive is only the retrieval route because direct automated access returned a Cloudflare challenge. Local cache first; profile headshot markup first, then the reviewed exact-ID legacy headshot path; validated image bytes only; identity-only context; no hotlinks.",
        targetHistoricalCards: historicalCards.length,
        targetHistoricalIdentities: targetIdentityIds.size,
        configuredMappings: mappings.length,
        coveredCards: nextManifest.length,
        coveredIdentities: coveredIdentityIds.size,
        downloadedIdentities: count("downloaded"),
        skippedIdentities: count("skipped"),
        failedIdentities: count("failed"),
        photoPendingCards: historicalCards.length - nextManifest.length,
        results,
      },
      null,
      2,
    )}\n`,
  );
  console.log("FBref historical portrait import summary");
  console.log(`Cards covered: ${nextManifest.length}/${historicalCards.length}`);
  console.log(
    `Identities covered: ${coveredIdentityIds.size}/${targetIdentityIds.size}`,
  );
  console.log(`Downloaded identities: ${count("downloaded")}`);
  console.log(`Skipped identities: ${count("skipped")}`);
  console.log(`Failed identities: ${count("failed")}`);
};

void main();
