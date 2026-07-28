import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import {
  appendFile,
  mkdir,
  readFile,
  readdir,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import soFifaPlayerMapJson from "../data/sources/sofifa/player-map.json";
import { players } from "../src/data/players";
import tournamentArchiveJson from "../src/data/player-tournaments.generated.json";

type CsvRow = Record<string, string>;

type TournamentArchive = {
  identities: Record<string, { playerId: string }[]>;
};

type PlayerCard = (typeof players)[number];

type PageImage = {
  pageid?: number;
  title: string;
  fullurl?: string;
  missing?: boolean;
  thumbnail?: { source: string; width: number; height: number };
  original?: { source: string; width: number; height: number };
  pageprops?: { disambiguation?: string; wikibase_item?: string };
};

type PageImageQuery = {
  query?: {
    normalized?: { from: string; to: string }[];
    redirects?: { from: string; to: string }[];
    pages?: PageImage[];
  };
};

type SearchQuery = {
  query?: {
    search?: { title: string; snippet: string }[];
  };
};

type CommonsQuery = {
  query?: {
    pages?: {
      title: string;
      fullurl?: string;
      imageinfo?: {
        url: string;
        thumburl?: string;
        mime?: string;
        extmetadata?: Record<string, { value?: string }>;
      }[];
    }[];
  };
};

type ResolvedRemotePortrait = {
  pageTitle: string;
  sourcePage: string;
  imageUrl: string;
  fallbackImageUrls?: string[];
  resolutionMethod:
    | "sofifa-game-face"
    | "linked-encyclopedia-page"
    | "reviewed-name-search"
    | "reviewed-media-search"
    | "reviewed-override";
};

type PortraitCandidate = {
  cardId: string;
  tournamentYear: number;
  localPath: string;
  absolutePath: string;
};

type IdentityCoverage = {
  playerIdentityId: string;
  playerName: string;
  sourceCardId: string;
  sourceTournamentYear: number;
  localPath: string;
  sourceFile: string;
  sourcePage: string | null;
  sourceImageUrl: string | null;
  sourceKind: "existing-local" | ResolvedRemotePortrait["resolutionMethod"];
  cacheVersion: string;
  changes: string;
};

type ImportedPortraitRecord = {
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

type GeneratedPortraitArchive = {
  version: 1;
  generatedAt: string;
  identityCount: number;
  coveredIdentityCount: number;
  existingIdentityCount: number;
  importedIdentityCount: number;
  identityPortraits: IdentityCoverage[];
  importedPortraits: ImportedPortraitRecord[];
  unresolvedIdentities: {
    playerIdentityId: string;
    playerName: string;
    countryName: string;
    reason: string;
  }[];
};

type ImportProgress = {
  version: 1;
  updatedAt: string;
  importedByIdentity: Record<string, IdentityCoverage>;
};

type FailedDownloadCache = Record<
  string,
  { checkedAt: string; imageUrl: string; reason: string }
>;

type SoFifaCacheEntry = {
  status: "success" | "skipped" | "failed";
  sourceUrl?: string;
};

type SoFifaPlayerMap = {
  version: number;
  mappings: Array<{
    playerIdentityId: string;
    sofifaPlayerId: string;
    sourcePage: string;
    canonicalFaceUrl: string;
    canonicalFifaVersion: number;
    tournamentYears: number[];
    versions: Array<{ sourceUrl: string }>;
  }>;
};

const ROOT = process.cwd();
const PLAYER_DIRECTORY = path.join(ROOT, "assets", "players");
const SOURCE_DIRECTORY = path.join(
  ROOT,
  "assets",
  "research",
  "player-identity-sources",
);
const OUTPUT_FILE = path.join(
  ROOT,
  "src",
  "data",
  "player-identity-portraits.generated.json",
);
const PLAYER_SOURCE_FILE = path.join(
  ROOT,
  "data",
  "sources",
  "fjelstul-world-cup",
  "players.csv",
);
const OVERRIDES_FILE = path.join(
  ROOT,
  "scripts",
  "player-identity-portrait-overrides.json",
);
const CACHE_DIRECTORY = path.join(
  ROOT,
  "scripts",
  "cache",
  "player-identity-portraits",
);
const HTTP_CACHE_DIRECTORY = path.join(CACHE_DIRECTORY, "http-json");
const PROGRESS_FILE = path.join(CACHE_DIRECTORY, "progress.json");
const RESOLUTION_CACHE_FILE = path.join(CACHE_DIRECTORY, "resolutions.json");
const REQUEST_LOG_FILE = path.join(CACHE_DIRECTORY, "requests.jsonl");
const FAILED_DOWNLOAD_FILE = path.join(
  CACHE_DIRECTORY,
  "failed-downloads.json",
);
const SOFIFA_CACHE_FILE = path.join(
  ROOT,
  "scripts",
  "cache",
  "game-faces",
  "import-cache.json",
);
const ARCHIVE = tournamentArchiveJson as TournamentArchive;
const SOFIFA_PLAYER_MAP = soFifaPlayerMapJson as SoFifaPlayerMap;
const SOFIFA_MAPPING_BY_IDENTITY = new Map(
  (SOFIFA_PLAYER_MAP.version >= 2 ? SOFIFA_PLAYER_MAP.mappings : []).map(
    (mapping) => [mapping.playerIdentityId, mapping],
  ),
);
const CHECK_ONLY = process.argv.includes("--check");
const ALLOW_PARTIAL = process.argv.includes("--allow-partial");
const SOFIFA_ONLY = process.argv.includes("--source=sofifa");
const ALLOW_MEDIA_SEARCH = process.argv.includes("--media-search");
const CACHE_ONLY_SEARCH = process.argv.includes("--cache-only-search");
const minimumYearArgument = process.argv.find((argument) =>
  argument.startsWith("--min-year="),
);
const MINIMUM_YEAR = minimumYearArgument
  ? Number(minimumYearArgument.slice("--min-year=".length))
  : Number.NEGATIVE_INFINITY;
const limitArgument = process.argv.find((argument) =>
  argument.startsWith("--limit="),
);
const IMPORT_LIMIT = limitArgument
  ? Number(limitArgument.slice("--limit=".length))
  : Number.POSITIVE_INFINITY;
const searchLimitArgument = process.argv.find((argument) =>
  argument.startsWith("--search-limit="),
);
const SEARCH_LIMIT = searchLimitArgument
  ? Number(searchLimitArgument.slice("--search-limit=".length))
  : Number.POSITIVE_INFINITY;
const USER_AGENT =
  "TrophyXI-portrait-archive/1.0 (local educational project; portrait metadata import)";
const IMAGE_EXTENSIONS = ["png", "webp", "jpg", "jpeg", "avif"] as const;
const PRESCRIBED_GAME_EDITION_BY_YEAR = new Map([
  [2010, 10],
  [2014, 14],
  [2018, 18],
  [2022, 23],
  [2026, 26],
]);
const API_CONCURRENCY = 3;
const DOWNLOAD_CONCURRENCY = 1;
const API_REQUEST_INTERVAL_MS = 10_000;
const DOWNLOAD_REQUEST_INTERVAL_MS = 1_100;
const WIKIMEDIA_DOWNLOAD_INTERVAL_MS = 5_000;
const availablePortraitFilesByYear = new Map<number, Promise<Set<string>>>();
const apiRequestSchedule = { nextAt: 0, gate: Promise.resolve() };
const downloadRequestSchedule = { nextAt: 0, gate: Promise.resolve() };
const wikimediaDownloadSchedule = { nextAt: 0, gate: Promise.resolve() };

class CacheMissError extends Error {}

const logRequest = async (entry: Record<string, unknown>) => {
  await appendFile(
    REQUEST_LOG_FILE,
    `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`,
  );
};

const waitForRequestSlot = async (url: string | URL) => {
  const parsedUrl = new URL(String(url));
  const isApiRequest = parsedUrl.pathname.endsWith("/w/api.php");
  const isWikimediaDownload =
    !isApiRequest && parsedUrl.hostname.endsWith("wikimedia.org");
  const schedule = isApiRequest
    ? apiRequestSchedule
    : isWikimediaDownload
      ? wikimediaDownloadSchedule
      : downloadRequestSchedule;
  const interval = isApiRequest
    ? API_REQUEST_INTERVAL_MS
    : isWikimediaDownload
      ? WIKIMEDIA_DOWNLOAD_INTERVAL_MS
      : DOWNLOAD_REQUEST_INTERVAL_MS;
  const previous = schedule.gate;
  let release = () => {};
  schedule.gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  const waitMs = Math.max(0, schedule.nextAt - Date.now());
  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  schedule.nextAt = Date.now() + interval;
  release();
};

const parseCsv = (value: string): CsvRow[] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === '"') {
      if (quoted && value[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && value[index + 1] === "\n") index += 1;
      row.push(cell);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }
  if (cell || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  const [headers, ...records] = rows;
  return records.map((record) =>
    Object.fromEntries(
      headers.map((header, index) => [header, record[index] ?? ""]),
    ),
  );
};

const normalized = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const plainText = (value: string) =>
  value
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ");

const chunksOf = <T>(values: T[], size: number) =>
  Array.from({ length: Math.ceil(values.length / size) }, (_, index) =>
    values.slice(index * size, (index + 1) * size),
  );

const mapLimit = async <T, U>(
  values: T[],
  concurrency: number,
  operation: (value: T, index: number) => Promise<U>,
) => {
  const results = new Array<U>(values.length);
  let cursor = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, values.length) },
    async () => {
      while (cursor < values.length) {
        const index = cursor;
        cursor += 1;
        results[index] = await operation(values[index], index);
      }
    },
  );
  await Promise.all(workers);
  return results;
};

const fetchWithRetry = async (url: string | URL, attempts = 4) => {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await waitForRequestSlot(url);
      const response = await fetch(url, {
        headers: {
          Accept: "application/json,image/*;q=0.9,*/*;q=0.8",
          "User-Agent": USER_AGENT,
        },
        redirect: "follow",
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "0");
        await logRequest({
          url: String(url),
          attempt,
          status: response.status,
          result: "retryable-error",
        });
        if (retryAfter > 0 && attempt < attempts) {
          await new Promise((resolve) =>
            setTimeout(resolve, Math.min(60_000, retryAfter * 1_000)),
          );
        }
        throw new Error(`${response.status} ${response.statusText}`);
      }
      await logRequest({
        url: String(url),
        attempt,
        status: response.status,
        result: "success",
      });
      return response;
    } catch (error) {
      lastError = error;
      await logRequest({
        url: String(url),
        attempt,
        result: "failure",
        error: error instanceof Error ? error.message : String(error),
      });
      if (attempt < attempts) {
        await new Promise((resolve) =>
          setTimeout(resolve, 400 * 2 ** (attempt - 1)),
        );
      }
    }
  }
  throw lastError;
};

const fetchJson = async <T>(url: URL) => {
  const cacheKey = createHash("sha256").update(url.toString()).digest("hex");
  const cacheFile = path.join(HTTP_CACHE_DIRECTORY, `${cacheKey}.json`);
  if (existsSync(cacheFile)) {
    return JSON.parse(await readFile(cacheFile, "utf8")) as T;
  }
  if (CACHE_ONLY_SEARCH) {
    throw new CacheMissError(`No cached API response for ${url.pathname}`);
  }
  const response = await fetchWithRetry(url);
  const body = await response.text();
  const parsed = JSON.parse(body) as T;
  await writeFile(cacheFile, `${JSON.stringify(parsed)}\n`);
  return parsed;
};

const sha256 = (value: Buffer) =>
  createHash("sha256").update(value).digest("hex");

const fileSha256 = async (filename: string) =>
  sha256(await readFile(filename));

const sourceTitleFor = (url: string) => {
  const pathname = URL.canParse(url)
    ? new URL(url).pathname
    : url.replace(/^https?:\/\/[^/]+/i, "");
  return decodeURIComponent(pathname.replace(/^\/?wiki\//, ""));
};

const resolveAliases = (
  title: string,
  aliases: Map<string, string>,
) => {
  let resolved = title;
  for (let index = 0; index < 6; index += 1) {
    const next = aliases.get(resolved);
    if (!next || next === resolved) break;
    resolved = next;
  }
  return resolved;
};

const queryPageImages = async (titles: string[]) => {
  if (titles.length === 0) return new Map<string, PageImage>();
  const url = new URL("https://en.wikipedia.org/w/api.php");
  url.search = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    redirects: "1",
    prop: "pageimages|info|pageprops",
    inprop: "url",
    piprop: "thumbnail|original",
    pithumbsize: "900",
    titles: titles.join("|"),
  }).toString();
  const data = await fetchJson<PageImageQuery>(url);
  const aliases = new Map<string, string>();
  for (const alias of data.query?.normalized ?? []) {
    aliases.set(alias.from, alias.to);
  }
  for (const alias of data.query?.redirects ?? []) {
    aliases.set(alias.from, alias.to);
  }
  const pageByTitle = new Map(
    (data.query?.pages ?? []).map((page) => [page.title, page]),
  );
  return new Map(
    titles.flatMap((title) => {
      const page = pageByTitle.get(resolveAliases(title, aliases));
      return page ? [[title, page] as const] : [];
    }),
  );
};

const remotePortraitFromPage = (
  page: PageImage | undefined,
  resolutionMethod: ResolvedRemotePortrait["resolutionMethod"],
): ResolvedRemotePortrait | undefined => {
  if (
    !page ||
    page.missing ||
    page.pageprops?.disambiguation !== undefined ||
    !page.thumbnail?.source
  ) {
    return undefined;
  }
  return {
    pageTitle: page.title,
    sourcePage:
      page.fullurl ??
      `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}`,
    imageUrl: page.thumbnail.source,
    resolutionMethod,
  };
};

const scoreSearchCandidate = ({
  player,
  title,
  description,
}: {
  player: PlayerCard;
  title: string;
  description: string;
}) => {
  const name = normalized(player.playerName);
  const candidateTitle = normalized(title.replace(/\s*\([^)]*\)\s*$/, ""));
  const haystack = normalized(`${title} ${plainText(description)}`);
  const tokens = name.split("-").filter((token) => token.length > 1);
  let score = 0;
  if (candidateTitle === name) score += 120;
  else if (candidateTitle.startsWith(`${name}-`)) score += 100;
  else if (tokens.every((token) => candidateTitle.includes(token))) score += 78;
  else if (tokens.length > 1 && tokens.slice(-1).every((token) => candidateTitle.includes(token))) {
    score += 24;
  }
  if (/football|soccer|goalkeeper|defender|midfielder|forward/.test(haystack)) {
    score += 30;
  }
  const country = normalized(player.countryName);
  if (country && haystack.includes(country)) score += 8;
  if (/disambiguation|football-club|national-team-squad|logo|stadium/.test(haystack)) {
    score -= 80;
  }
  return score;
};

const searchPageForPlayer = async (
  player: PlayerCard,
): Promise<ResolvedRemotePortrait | undefined> => {
  const searchUrl = new URL("https://en.wikipedia.org/w/api.php");
  searchUrl.search = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    list: "search",
    srnamespace: "0",
    srlimit: "8",
    srprop: "snippet",
    srsearch: `"${player.playerName}" footballer ${player.countryName}`,
  }).toString();
  const search = await fetchJson<SearchQuery>(searchUrl);
  const ranked = (search.query?.search ?? [])
    .map((candidate) => ({
      ...candidate,
      score: scoreSearchCandidate({
        player,
        title: candidate.title,
        description: candidate.snippet,
      }),
    }))
    .sort((first, second) => second.score - first.score)
    .slice(0, 4);
  if (!ranked[0] || ranked[0].score < 75) return undefined;
  const pages = await queryPageImages(ranked.map((candidate) => candidate.title));
  for (const candidate of ranked) {
    if (candidate.score < 75) continue;
    const portrait = remotePortraitFromPage(
      pages.get(candidate.title),
      "reviewed-name-search",
    );
    if (portrait) return portrait;
  }
  return undefined;
};

const searchMediaForPlayer = async (
  player: PlayerCard,
): Promise<ResolvedRemotePortrait | undefined> => {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  url.search = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    generator: "search",
    gsrnamespace: "6",
    gsrlimit: "10",
    gsrsearch: `"${player.playerName}" footballer`,
    prop: "imageinfo|info",
    inprop: "url",
    iiprop: "url|mime|extmetadata",
    iiurlwidth: "900",
  }).toString();
  const response = await fetchJson<CommonsQuery>(url);
  const ranked = (response.query?.pages ?? [])
    .map((page) => {
      const info = page.imageinfo?.[0];
      const metadataText = Object.values(info?.extmetadata ?? {})
        .map((entry) => entry.value ?? "")
        .join(" ");
      return {
        page,
        info,
        score: scoreSearchCandidate({
          player,
          title: page.title.replace(/^File:/, ""),
          description: metadataText,
        }),
      };
    })
    .filter(
      (candidate) =>
        candidate.info &&
        candidate.info.mime?.startsWith("image/") &&
        !/\.svg$/i.test(candidate.page.title),
    )
    .sort((first, second) => second.score - first.score);
  const best = ranked[0];
  if (!best?.info || best.score < 90) return undefined;
  return {
    pageTitle: best.page.title,
    sourcePage:
      best.page.fullurl ??
      `https://commons.wikimedia.org/wiki/${encodeURIComponent(best.page.title.replace(/ /g, "_"))}`,
    imageUrl: best.info.thumburl ?? best.info.url,
    resolutionMethod: "reviewed-media-search",
  };
};

const findExistingCandidates = async (cards: PlayerCard[]) => {
  const candidates: PortraitCandidate[] = [];
  for (const card of cards) {
    const directory = path.join(PLAYER_DIRECTORY, String(card.tournamentYear));
    if (!existsSync(directory)) continue;

    const availablePromise =
      availablePortraitFilesByYear.get(card.tournamentYear) ??
      readdir(directory).then((files) => new Set(files));
    availablePortraitFilesByYear.set(card.tournamentYear, availablePromise);
    const available = await availablePromise;

    const canonicalFilename = `${card.id}.png`;
    const canonicalAbsolutePath = path.join(directory, canonicalFilename);

    // Prefer the canonical card-specific PNG when it already exists.
    if (available.has(canonicalFilename)) {
      candidates.push({
        cardId: card.id,
        tournamentYear: card.tournamentYear,
        localPath: `/assets/players/${card.tournamentYear}/${canonicalFilename}`,
        absolutePath: canonicalAbsolutePath,
      });
      continue;
    }

    // Accept only the SAME card/year under a legacy extension or a
    // diacritic-equivalent filename. Never match a different tournament year.
    let legacyFilename = IMAGE_EXTENSIONS
      .map((extension) => `${card.id}.${extension}`)
      .find((filename) => available.has(filename));

    if (!legacyFilename) {
      legacyFilename = [...available].find((filename) => {
        const extension = path.extname(filename).slice(1).toLocaleLowerCase("en");
        if (!IMAGE_EXTENSIONS.includes(extension as (typeof IMAGE_EXTENSIONS)[number])) {
          return false;
        }
        const stem = filename.slice(0, -path.extname(filename).length);
        return normalized(stem) === card.id;
      });
    }

    if (!legacyFilename) continue;

    const legacyAbsolutePath = path.join(directory, legacyFilename);

    // Normalize legacy .webp/.jpg/accented filenames to the one canonical
    // runtime path expected by gameFacePathFor().
    await sharp(legacyAbsolutePath, { animated: false })
      .rotate()
      .png({ compressionLevel: 9, palette: false })
      .toFile(canonicalAbsolutePath);

    available.add(canonicalFilename);
    candidates.push({
      cardId: card.id,
      tournamentYear: card.tournamentYear,
      localPath: `/assets/players/${card.tournamentYear}/${canonicalFilename}`,
      absolutePath: canonicalAbsolutePath,
    });
  }
  return candidates;
};

const canonicalExistingCandidate = (
  cards: PlayerCard[],
  candidates: PortraitCandidate[],
) => {
  const years = cards
    .map((card) => card.tournamentYear)
    .sort((first, second) => first - second);
  const median = years[Math.floor((years.length - 1) / 2)];
  return [...candidates].sort(
    (first, second) =>
      Math.abs(first.tournamentYear - median) -
        Math.abs(second.tournamentYear - median) ||
      second.tournamentYear - first.tournamentYear ||
      first.cardId.localeCompare(second.cardId),
  )[0];
};

const canonicalCardForImport = (cards: PlayerCard[]) =>
  [...cards].sort(
    (first, second) =>
      second.tournamentYear - first.tournamentYear ||
      first.id.localeCompare(second.id),
  )[0];

const extensionFor = (contentType: string, format?: string) => {
  if (format === "png" || contentType.includes("png")) return "png";
  if (format === "webp" || contentType.includes("webp")) return "webp";
  if (format === "avif" || contentType.includes("avif")) return "avif";
  if (format === "gif" || contentType.includes("gif")) return "gif";
  return "jpg";
};

const importRemotePortrait = async ({
  player,
  remote,
}: {
  player: PlayerCard;
  remote: ResolvedRemotePortrait;
}) => {
  let response: Response | undefined;
  let buffer: Buffer | undefined;
  let metadata: Awaited<ReturnType<typeof sharp.prototype.metadata>> | undefined;
  let sourceImageUrl = remote.imageUrl;
  let lastError: unknown;
  for (const imageUrl of [
    remote.imageUrl,
    ...(remote.fallbackImageUrls ?? []),
  ]) {
    try {
      response = await fetchWithRetry(imageUrl);
      const candidateBuffer = Buffer.from(await response.arrayBuffer());
      const candidateMetadata = await sharp(candidateBuffer, {
        animated: false,
      }).metadata();
      buffer = candidateBuffer;
      metadata = candidateMetadata;
      sourceImageUrl = imageUrl;
      break;
    } catch (error) {
      lastError = error;
      response = undefined;
    }
  }
  if (!response || !buffer || !metadata) throw lastError;
  const contentLength = Number(response.headers.get("content-length") ?? "0");
  if (contentLength > 20_000_000) {
    throw new Error(`remote image is too large (${contentLength} bytes)`);
  }
  if (buffer.byteLength < 4_000 || buffer.byteLength > 20_000_000) {
    throw new Error(`unexpected image size (${buffer.byteLength} bytes)`);
  }
  if (!metadata.width || !metadata.height || metadata.width < 120 || metadata.height < 120) {
    throw new Error(
      `image dimensions are too small (${metadata.width ?? 0}x${metadata.height ?? 0})`,
    );
  }
  const extension = extensionFor(
    response.headers.get("content-type") ?? "",
    metadata.format,
  );
  const sourceFilename = `${player.playerIdentityId}.${extension}`;
  const sourceAbsolutePath = path.join(SOURCE_DIRECTORY, sourceFilename);
  const sourceFile = `/assets/research/player-identity-sources/${sourceFilename}`;
  await writeFile(sourceAbsolutePath, buffer);

  const runtimeFilename = `${player.id}.png`;
  const runtimeDirectory = path.join(
    PLAYER_DIRECTORY,
    String(player.tournamentYear),
  );
  const runtimeAbsolutePath = path.join(runtimeDirectory, runtimeFilename);
  await mkdir(runtimeDirectory, { recursive: true });
  await sharp(buffer, { animated: false })
    .rotate()
    .resize({
      width: 900,
      height: 1000,
      fit: "inside",
      withoutEnlargement: true,
    })
    .png({ compressionLevel: 9, palette: false })
    .toFile(runtimeAbsolutePath);
  return {
    sourceFile,
    runtimeAbsolutePath,
    localPath: `/assets/players/${player.tournamentYear}/${runtimeFilename}`,
    sourceImageUrl,
  };
};

const writeArchive = async (archive: GeneratedPortraitArchive) => {
  await writeFile(OUTPUT_FILE, `${JSON.stringify(archive, null, 2)}\n`);
};

const main = async () => {
  if (!Number.isFinite(IMPORT_LIMIT) && limitArgument) {
    throw new Error("--limit must be a positive integer");
  }
  if (
    searchLimitArgument &&
    (!Number.isInteger(SEARCH_LIMIT) || SEARCH_LIMIT < 0)
  ) {
    throw new Error("--search-limit must be a non-negative integer");
  }
  if (
    minimumYearArgument &&
    (!Number.isInteger(MINIMUM_YEAR) || MINIMUM_YEAR < 1900)
  ) {
    throw new Error("--min-year must be a four-digit tournament year");
  }
  await mkdir(SOURCE_DIRECTORY, { recursive: true });
  await mkdir(HTTP_CACHE_DIRECTORY, { recursive: true });
  const previousArchive = existsSync(OUTPUT_FILE)
    ? (JSON.parse(
        await readFile(OUTPUT_FILE, "utf8"),
      ) as GeneratedPortraitArchive)
    : undefined;
  const progress = existsSync(PROGRESS_FILE)
    ? (JSON.parse(await readFile(PROGRESS_FILE, "utf8")) as ImportProgress)
    : {
        version: 1 as const,
        updatedAt: new Date(0).toISOString(),
        importedByIdentity: {},
      };
  const failedDownloads = existsSync(FAILED_DOWNLOAD_FILE)
    ? (JSON.parse(
        await readFile(FAILED_DOWNLOAD_FILE, "utf8"),
      ) as FailedDownloadCache)
    : {};
  let progressWriteGate = Promise.resolve();
  const writeProgress = async () => {
    progressWriteGate = progressWriteGate.then(() =>
      writeFile(PROGRESS_FILE, `${JSON.stringify(progress, null, 2)}\n`),
    );
    await progressWriteGate;
  };
  let failedDownloadWriteGate = Promise.resolve();
  const writeFailedDownloads = async () => {
    failedDownloadWriteGate = failedDownloadWriteGate.then(() =>
      writeFile(
        FAILED_DOWNLOAD_FILE,
        `${JSON.stringify(failedDownloads, null, 2)}\n`,
      ),
    );
    await failedDownloadWriteGate;
  };
  const previousImportedByIdentity = new Map(
    [
      ...(previousArchive?.identityPortraits ?? []).filter(
        (portrait) => portrait.sourceKind !== "existing-local",
      ),
      ...Object.values(progress.importedByIdentity),
    ].map((portrait) => [portrait.playerIdentityId, portrait]),
  );
  const cardsByIdentity = new Map<string, PlayerCard[]>();
  for (const player of players) {
    cardsByIdentity.set(player.playerIdentityId, [
      ...(cardsByIdentity.get(player.playerIdentityId) ?? []),
      player,
    ]);
  }
  const identities = [...cardsByIdentity.entries()].sort(([first], [second]) =>
    first.localeCompare(second),
  );
  const existingCoverage: IdentityCoverage[] = [];
  const retainedImportedCoverage: IdentityCoverage[] = [];
  const exactLocalCandidatesByIdentity = new Map<string, PortraitCandidate[]>();
  const missing: { identityId: string; cards: PlayerCard[] }[] = [];
  for (const [identityId, cards] of identities) {
    const candidates = await findExistingCandidates(cards);
    exactLocalCandidatesByIdentity.set(identityId, candidates);
    const canonical = canonicalExistingCandidate(cards, candidates);
    const previousImported = previousImportedByIdentity.get(identityId);
    if (!canonical) {
      missing.push({ identityId, cards });
      continue;
    }
    const soFifaMapping = SOFIFA_MAPPING_BY_IDENTITY.get(identityId);
    const latestTournamentYear = Math.max(
      ...cards.map((card) => card.tournamentYear),
    );
    const prescribedEdition =
      PRESCRIBED_GAME_EDITION_BY_YEAR.get(latestTournamentYear);
    const hasExactEditionUpgrade =
      previousImported?.sourceKind === "sofifa-game-face" &&
      soFifaMapping !== undefined &&
      soFifaMapping.canonicalFifaVersion === prescribedEdition &&
      previousImported.sourceImageUrl !== soFifaMapping.canonicalFaceUrl;
    const isForbiddenNonFc26Direct2026 =
      previousImported?.sourceKind === "sofifa-game-face" &&
      previousImported.sourceTournamentYear === 2026 &&
      !previousImported.sourceImageUrl?.endsWith("/26_120.png");
    if (isForbiddenNonFc26Direct2026) {
      missing.push({ identityId, cards });
      continue;
    }
    if (
      soFifaMapping &&
      previousImported &&
      (previousImported.sourceKind !== "sofifa-game-face" ||
        hasExactEditionUpgrade)
    ) {
      retainedImportedCoverage.push(previousImported);
      missing.push({ identityId, cards });
      continue;
    }
    if (
      previousImported?.localPath === canonical.localPath &&
      existsSync(path.join(ROOT, previousImported.sourceFile.replace(/^\//, "")))
    ) {
      retainedImportedCoverage.push({
        ...previousImported,
        cacheVersion: previousImported.cacheVersion,
      });
      continue;
    }
    existingCoverage.push({
      playerIdentityId: identityId,
      playerName: cards[0].playerName,
      sourceCardId: canonical.cardId,
      sourceTournamentYear: canonical.tournamentYear,
      localPath: canonical.localPath,
      sourceFile: canonical.localPath,
      sourcePage: null,
      sourceImageUrl: null,
      sourceKind: "existing-local",
      cacheVersion: (await fileSha256(canonical.absolutePath)).slice(0, 16),
      changes: "Reused an existing local portrait for this player identity.",
    });
  }

  if (CHECK_ONLY) {
    console.log(
      `Player identity portrait coverage: ${existingCoverage.length + retainedImportedCoverage.length}/${identities.length}; ` +
        `${missing.length} unresolved on disk; retained imported count ${retainedImportedCoverage.length}.`,
    );
    if (missing.length > 0) {
      console.log(missing.map(({ identityId }) => identityId).join("\n"));
      process.exitCode = 1;
    }
    return;
  }

  const csvRows = parseCsv(await readFile(PLAYER_SOURCE_FILE, "utf8"));
  const reviewedOverrides = JSON.parse(
    await readFile(OVERRIDES_FILE, "utf8"),
  ) as {
    playerIdentityId: string;
    sourcePage: string;
    imageUrl: string;
  }[];
  const reviewedPortraits = new Map<string, ResolvedRemotePortrait>();
  for (const override of reviewedOverrides) {
    if (!cardsByIdentity.has(override.playerIdentityId)) {
      throw new Error(
        `${override.playerIdentityId}: portrait override does not match an active identity`,
      );
    }
    reviewedPortraits.set(override.playerIdentityId, {
      pageTitle: override.playerIdentityId,
      sourcePage: override.sourcePage,
      imageUrl: override.imageUrl,
      resolutionMethod: "reviewed-override",
    });
  }
  const soFifaCache = existsSync(SOFIFA_CACHE_FILE)
    ? (JSON.parse(
        await readFile(SOFIFA_CACHE_FILE, "utf8"),
      ) as Record<string, SoFifaCacheEntry>)
    : {};
  const soFifaPortraits = new Map<string, ResolvedRemotePortrait>();
  for (const [cardId, cached] of Object.entries(soFifaCache)) {
    if (
      (cached.status !== "success" && cached.status !== "skipped") ||
      !cached.sourceUrl
    ) {
      continue;
    }
    const identityId = cardId.replace(/-\d{4}$/, "");
    if (!cardsByIdentity.has(identityId)) continue;
    const latestTournamentYear = Math.max(
      ...(cardsByIdentity.get(identityId) ?? []).map(
        (card) => card.tournamentYear,
      ),
    );
    if (
      latestTournamentYear === 2026 &&
      !cached.sourceUrl.endsWith("/26_120.png")
    ) {
      continue;
    }
    const playerIdParts =
      new URL(cached.sourceUrl).pathname.match(/\/players\/(\d+)\/(\d+)\//);
    const playerId = playerIdParts
      ? Number(`${playerIdParts[1]}${playerIdParts[2]}`)
      : undefined;
    soFifaPortraits.set(identityId, {
      pageTitle: identityId,
      sourcePage: playerId
        ? `https://sofifa.com/player/${playerId}`
        : "https://sofifa.com/",
      imageUrl: cached.sourceUrl,
      resolutionMethod: "sofifa-game-face",
    });
  }
  for (const mapping of SOFIFA_PLAYER_MAP.mappings) {
    if (!cardsByIdentity.has(mapping.playerIdentityId)) continue;
    soFifaPortraits.set(mapping.playerIdentityId, {
      pageTitle: mapping.playerIdentityId,
      sourcePage: mapping.sourcePage,
      imageUrl: mapping.canonicalFaceUrl,
      fallbackImageUrls:
        Math.max(...mapping.tournamentYears) === 2026
          ? []
          : mapping.versions
              .map((version) => version.sourceUrl)
              .filter((sourceUrl) => sourceUrl !== mapping.canonicalFaceUrl)
              .reverse(),
      resolutionMethod: "sofifa-game-face",
    });
  }
  const hasRecentTerminalSoFifaFailure = (identityId: string) => {
    const portrait = soFifaPortraits.get(identityId);
    const failed = failedDownloads[identityId];
    return Boolean(
      portrait &&
        failed &&
        failed.imageUrl === portrait.imageUrl &&
        Date.now() - Date.parse(failed.checkedAt) <
          7 * 24 * 60 * 60 * 1_000 &&
        !portrait.fallbackImageUrls?.length,
    );
  };
  const usableSoFifaPortraits = new Map(
    [...soFifaPortraits].filter(
      ([identityId]) => !hasRecentTerminalSoFifaFailure(identityId),
    ),
  );
  const sourcePlayerById = new Map(csvRows.map((row) => [row.player_id, row]));
  const cachedResolutions = existsSync(RESOLUTION_CACHE_FILE)
    ? (JSON.parse(
        await readFile(RESOLUTION_CACHE_FILE, "utf8"),
      ) as Record<string, ResolvedRemotePortrait>)
    : {};
  const cachedPortraits = new Map(
    Object.entries(cachedResolutions).filter(([identityId]) =>
      cardsByIdentity.has(identityId),
    ),
  );
  const linkedTitleByIdentity = new Map<string, string>();
  for (const { identityId, cards } of missing) {
    if (!cards.some((card) => card.tournamentYear >= MINIMUM_YEAR)) continue;
    if (SOFIFA_ONLY || usableSoFifaPortraits.has(identityId)) continue;
    if (cachedPortraits.has(identityId)) continue;
    const playerId = ARCHIVE.identities[identityId]?.[0]?.playerId;
    const page = playerId
      ? sourcePlayerById.get(playerId)?.player_wikipedia_link
      : undefined;
    if (page) linkedTitleByIdentity.set(identityId, sourceTitleFor(page));
  }

  const linkedPortraits = new Map<string, ResolvedRemotePortrait>();
  const linkedEntries = [...linkedTitleByIdentity.entries()];
  for (const chunk of chunksOf(linkedEntries, 35)) {
    let pages: Map<string, PageImage>;
    try {
      pages = await queryPageImages(chunk.map(([, title]) => title));
    } catch (error) {
      if (error instanceof CacheMissError) continue;
      throw error;
    }
    for (const [identityId, title] of chunk) {
      const portrait = remotePortraitFromPage(
        pages.get(title),
        "linked-encyclopedia-page",
      );
      if (portrait) linkedPortraits.set(identityId, portrait);
    }
  }
  for (const [identityId, portrait] of linkedPortraits) {
    cachedResolutions[identityId] = portrait;
  }
  await writeFile(
    RESOLUTION_CACHE_FILE,
    `${JSON.stringify(cachedResolutions, null, 2)}\n`,
  );

  const unresolvedAfterLinks = missing.filter(
    ({ identityId, cards }) =>
      cards.some((card) => card.tournamentYear >= MINIMUM_YEAR) &&
      !SOFIFA_ONLY &&
      !cachedPortraits.has(identityId) &&
      !linkedPortraits.has(identityId) &&
      !usableSoFifaPortraits.has(identityId),
  );
  console.log(
    `Existing identities: ${existingCoverage.length}. Missing identities: ${missing.length}. ` +
      `SoFIFA portraits resolved: ${soFifaPortraits.size}. ` +
      `Linked-page portraits resolved: ${linkedPortraits.size}. ` +
      `Careful name searches needed: ${unresolvedAfterLinks.length}.`,
  );
  const searchedPortraitPairs = await mapLimit(
    unresolvedAfterLinks.slice(0, SEARCH_LIMIT),
    API_CONCURRENCY,
    async ({ identityId, cards }) => {
      try {
        const player = canonicalCardForImport(cards);
        const pagePortrait = await searchPageForPlayer(player);
        if (pagePortrait) return [identityId, pagePortrait] as const;
        if (!ALLOW_MEDIA_SEARCH) return undefined;
        const mediaPortrait = await searchMediaForPlayer(player);
        return mediaPortrait ? ([identityId, mediaPortrait] as const) : undefined;
      } catch (error) {
        if (error instanceof CacheMissError) return undefined;
        console.warn(
          `${identityId}: search failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        return undefined;
      }
    },
  );
  const searchedPortraits = new Map(
    searchedPortraitPairs.filter(
      (pair): pair is readonly [string, ResolvedRemotePortrait] => Boolean(pair),
    ),
  );
  for (const [identityId, portrait] of searchedPortraits) {
    cachedResolutions[identityId] = portrait;
  }
  await writeFile(
    RESOLUTION_CACHE_FILE,
    `${JSON.stringify(cachedResolutions, null, 2)}\n`,
  );
  const remoteByIdentity = new Map([
    ...cachedPortraits,
    ...linkedPortraits,
    ...searchedPortraits,
    ...(SOFIFA_ONLY ? soFifaPortraits : usableSoFifaPortraits),
    ...reviewedPortraits,
  ]);
  const targets = missing
    .filter(
      ({ identityId, cards }) => {
        if (!cards.some((card) => card.tournamentYear >= MINIMUM_YEAR)) {
          return false;
        }
        const remote = remoteByIdentity.get(identityId);
        const failed = failedDownloads[identityId];
        const recentFailure =
          failed &&
          failed.imageUrl === remote?.imageUrl &&
          Date.now() - Date.parse(failed.checkedAt) < 7 * 24 * 60 * 60 * 1_000;
        return (
          Boolean(remote) &&
          (!recentFailure || Boolean(remote?.fallbackImageUrls?.length)) &&
          (!SOFIFA_ONLY || soFifaPortraits.has(identityId))
        );
      },
    )
    .slice(0, IMPORT_LIMIT);
  const importedCoveragePairs = await mapLimit<
    (typeof targets)[number],
    IdentityCoverage | undefined
  >(
    targets,
    DOWNLOAD_CONCURRENCY,
    async ({ identityId, cards }, index) => {
      const player = canonicalCardForImport(cards);
      const remote = remoteByIdentity.get(identityId)!;
      try {
        const imported = await importRemotePortrait({ player, remote });
        const cacheVersion = (
          await fileSha256(imported.runtimeAbsolutePath)
        ).slice(0, 16);
        if ((index + 1) % 25 === 0 || index + 1 === targets.length) {
          console.log(`Downloaded ${index + 1}/${targets.length} portraits.`);
        }
        const record = {
          playerIdentityId: identityId,
          playerName: player.playerName,
          sourceCardId: player.id,
          sourceTournamentYear: player.tournamentYear,
          localPath: imported.localPath,
          sourceFile: imported.sourceFile,
          sourcePage: remote.sourcePage,
          sourceImageUrl: imported.sourceImageUrl,
          sourceKind: remote.resolutionMethod,
          cacheVersion,
          changes:
            "Preserved the downloaded source file and created a normalized local PNG for identity fallback.",
        } satisfies IdentityCoverage;
        progress.importedByIdentity[identityId] = record;
        const clearedFailure = Boolean(failedDownloads[identityId]);
        delete failedDownloads[identityId];
        progress.updatedAt = new Date().toISOString();
        await writeProgress();
        if (clearedFailure) await writeFailedDownloads();
        return record;
      } catch (error) {
        const reason =
          error instanceof Error ? error.message : String(error);
        failedDownloads[identityId] = {
          checkedAt: new Date().toISOString(),
          imageUrl: remote.imageUrl,
          reason,
        };
        await writeFailedDownloads();
        console.warn(
          `${identityId}: download failed: ${reason}`,
        );
        return undefined;
      }
    },
  );
  const newlyImportedCoverage = importedCoveragePairs.filter(
    (record): record is IdentityCoverage => Boolean(record),
  );
  const importedCoverage = [
    ...new Map(
      [...retainedImportedCoverage, ...newlyImportedCoverage].map((record) => [
        record.playerIdentityId,
        record,
      ]),
    ).values(),
  ];
  const importedIds = new Set(importedCoverage.map((record) => record.playerIdentityId));
  const unresolved = missing
    .filter(({ identityId }) => !importedIds.has(identityId))
    .map(({ identityId, cards }) => ({
      playerIdentityId: identityId,
      playerName: cards[0].playerName,
      countryName: cards[0].countryName,
      reason: remoteByIdentity.has(identityId)
        ? "The resolved image could not be downloaded or decoded."
        : "No confidently matched portrait was found.",
    }));
  const exactLocalPortraits = (
    await Promise.all(
      [...exactLocalCandidatesByIdentity.entries()].flatMap(
        ([playerIdentityId, candidates]) =>
          candidates.map(async (candidate): Promise<ImportedPortraitRecord> => ({
            id: candidate.cardId,
            kind: "player",
            playerIdentityId,
            tournamentYear: candidate.tournamentYear,
            localPath: candidate.localPath,
            sourceFile: candidate.localPath,
            portraitScope: "card-exact",
            cacheVersion: (await fileSha256(candidate.absolutePath)).slice(0, 16),
            changes:
              "Registered an existing local portrait for this exact tournament card.",
            sourcePage: null,
            sourceImageUrl: null,
          })),
      ),
    )
  ).sort(
    (first, second) =>
      first.tournamentYear - second.tournamentYear ||
      first.id.localeCompare(second.id),
  );

  const identityOnlyImportedPortraits: ImportedPortraitRecord[] =
    importedCoverage.map((record) => ({
      id: record.sourceCardId,
      kind: "player",
      playerIdentityId: record.playerIdentityId,
      tournamentYear: record.sourceTournamentYear,
      localPath: record.localPath,
      sourceFile: record.sourceFile,
      portraitScope: "identity-only",
      cacheVersion: record.cacheVersion,
      changes: record.changes,
      sourcePage: record.sourcePage,
      sourceImageUrl: record.sourceImageUrl,
    }));

  // Card-exact local files win over an identity-only record with the same card id.
  const importedPortraits: ImportedPortraitRecord[] = [
    ...new Map(
      [...identityOnlyImportedPortraits, ...exactLocalPortraits].map((record) => [
        record.id,
        record,
      ]),
    ).values(),
  ].sort(
    (first, second) =>
      first.tournamentYear - second.tournamentYear ||
      first.id.localeCompare(second.id),
  );
  const archive: GeneratedPortraitArchive = {
    version: 1,
    generatedAt: new Date().toISOString(),
    identityCount: identities.length,
    coveredIdentityCount: existingCoverage.length + importedCoverage.length,
    existingIdentityCount: existingCoverage.length,
    importedIdentityCount: importedCoverage.length,
    identityPortraits: [...existingCoverage, ...importedCoverage].sort((first, second) =>
      first.playerIdentityId.localeCompare(second.playerIdentityId),
    ),
    importedPortraits,
    unresolvedIdentities: unresolved,
  };
  await writeArchive(archive);
  console.log(
    `Wrote ${archive.coveredIdentityCount}/${archive.identityCount} identity portraits ` +
      `(${archive.importedIdentityCount} newly imported); ${unresolved.length} unresolved.`,
  );
  if (!ALLOW_PARTIAL && unresolved.length > 0) process.exitCode = 1;
};

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
