import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
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
  resolutionMethod:
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
  portraitScope: "identity-only";
  cacheVersion: string;
  changes: string;
  sourcePage: string;
  sourceImageUrl: string;
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
const ARCHIVE = tournamentArchiveJson as TournamentArchive;
const CHECK_ONLY = process.argv.includes("--check");
const ALLOW_PARTIAL = process.argv.includes("--allow-partial");
const limitArgument = process.argv.find((argument) =>
  argument.startsWith("--limit="),
);
const IMPORT_LIMIT = limitArgument
  ? Number(limitArgument.slice("--limit=".length))
  : Number.POSITIVE_INFINITY;
const USER_AGENT =
  "TrophyXI-portrait-archive/1.0 (local educational project; portrait metadata import)";
const IMAGE_EXTENSIONS = ["png", "webp", "jpg", "jpeg", "avif"] as const;
const API_CONCURRENCY = 4;
const DOWNLOAD_CONCURRENCY = 6;

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
      const response = await fetch(url, {
        headers: {
          Accept: "application/json,image/*;q=0.9,*/*;q=0.8",
          "User-Agent": USER_AGENT,
        },
        redirect: "follow",
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) =>
          setTimeout(resolve, 400 * 2 ** (attempt - 1)),
        );
      }
    }
  }
  throw lastError;
};

const fetchJson = async <T>(url: URL) =>
  (await (await fetchWithRetry(url)).json()) as T;

const sha256 = (value: Buffer) =>
  createHash("sha256").update(value).digest("hex");

const fileSha256 = async (filename: string) =>
  sha256(await readFile(filename));

const sourceTitleFor = (url: string) => {
  const parsed = new URL(url);
  return decodeURIComponent(parsed.pathname.replace(/^\/wiki\//, ""));
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
    const available = new Set(await readdir(directory));
    for (const extension of IMAGE_EXTENSIONS) {
      const filename = `${card.id}.${extension}`;
      if (!available.has(filename)) continue;
      const absolutePath = path.join(directory, filename);
      const metadata = await sharp(absolutePath, { animated: false }).metadata();
      if (!metadata.width || !metadata.height || metadata.width < 80 || metadata.height < 80) {
        continue;
      }
      candidates.push({
        cardId: card.id,
        tournamentYear: card.tournamentYear,
        localPath: `/assets/players/${card.tournamentYear}/${filename}`,
        absolutePath,
      });
      break;
    }
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
  const response = await fetchWithRetry(remote.imageUrl);
  const contentLength = Number(response.headers.get("content-length") ?? "0");
  if (contentLength > 20_000_000) {
    throw new Error(`remote image is too large (${contentLength} bytes)`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength < 4_000 || buffer.byteLength > 20_000_000) {
    throw new Error(`unexpected image size (${buffer.byteLength} bytes)`);
  }
  const metadata = await sharp(buffer, { animated: false }).metadata();
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
  };
};

const writeArchive = async (archive: GeneratedPortraitArchive) => {
  await writeFile(OUTPUT_FILE, `${JSON.stringify(archive, null, 2)}\n`);
};

const main = async () => {
  if (!Number.isFinite(IMPORT_LIMIT) && limitArgument) {
    throw new Error("--limit must be a positive integer");
  }
  await mkdir(SOURCE_DIRECTORY, { recursive: true });
  const previousArchive = existsSync(OUTPUT_FILE)
    ? (JSON.parse(
        await readFile(OUTPUT_FILE, "utf8"),
      ) as GeneratedPortraitArchive)
    : undefined;
  const previousImportedByIdentity = new Map(
    (previousArchive?.identityPortraits ?? [])
      .filter((portrait) => portrait.sourceKind !== "existing-local")
      .map((portrait) => [portrait.playerIdentityId, portrait]),
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
  const missing: { identityId: string; cards: PlayerCard[] }[] = [];
  for (const [identityId, cards] of identities) {
    const candidates = await findExistingCandidates(cards);
    const canonical = canonicalExistingCandidate(cards, candidates);
    if (!canonical) {
      missing.push({ identityId, cards });
      continue;
    }
    const previousImported = previousImportedByIdentity.get(identityId);
    if (
      previousImported?.localPath === canonical.localPath &&
      existsSync(path.join(ROOT, previousImported.sourceFile.replace(/^\//, "")))
    ) {
      retainedImportedCoverage.push({
        ...previousImported,
        cacheVersion: (await fileSha256(canonical.absolutePath)).slice(0, 16),
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
  const sourcePlayerById = new Map(csvRows.map((row) => [row.player_id, row]));
  const linkedTitleByIdentity = new Map<string, string>();
  for (const { identityId } of missing) {
    const playerId = ARCHIVE.identities[identityId]?.[0]?.playerId;
    const page = playerId
      ? sourcePlayerById.get(playerId)?.player_wikipedia_link
      : undefined;
    if (page) linkedTitleByIdentity.set(identityId, sourceTitleFor(page));
  }

  const linkedPortraits = new Map<string, ResolvedRemotePortrait>();
  const linkedEntries = [...linkedTitleByIdentity.entries()];
  for (const chunk of chunksOf(linkedEntries, 35)) {
    const pages = await queryPageImages(chunk.map(([, title]) => title));
    for (const [identityId, title] of chunk) {
      const portrait = remotePortraitFromPage(
        pages.get(title),
        "linked-encyclopedia-page",
      );
      if (portrait) linkedPortraits.set(identityId, portrait);
    }
  }

  const unresolvedAfterLinks = missing.filter(
    ({ identityId }) => !linkedPortraits.has(identityId),
  );
  console.log(
    `Existing identities: ${existingCoverage.length}. Missing identities: ${missing.length}. ` +
      `Linked-page portraits resolved: ${linkedPortraits.size}. ` +
      `Careful name searches needed: ${unresolvedAfterLinks.length}.`,
  );
  const searchedPortraitPairs = await mapLimit(
    unresolvedAfterLinks,
    API_CONCURRENCY,
    async ({ identityId, cards }) => {
      try {
        const player = canonicalCardForImport(cards);
        const pagePortrait = await searchPageForPlayer(player);
        if (pagePortrait) return [identityId, pagePortrait] as const;
        const mediaPortrait = await searchMediaForPlayer(player);
        return mediaPortrait ? ([identityId, mediaPortrait] as const) : undefined;
      } catch (error) {
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
  const remoteByIdentity = new Map([
    ...linkedPortraits,
    ...searchedPortraits,
    ...reviewedPortraits,
  ]);
  const targets = missing
    .filter(({ identityId }) => remoteByIdentity.has(identityId))
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
        return {
          playerIdentityId: identityId,
          playerName: player.playerName,
          sourceCardId: player.id,
          sourceTournamentYear: player.tournamentYear,
          localPath: imported.localPath,
          sourceFile: imported.sourceFile,
          sourcePage: remote.sourcePage,
          sourceImageUrl: remote.imageUrl,
          sourceKind: remote.resolutionMethod,
          cacheVersion,
          changes:
            "Preserved the downloaded source file and created a normalized local PNG for identity fallback.",
        } satisfies IdentityCoverage;
      } catch (error) {
        console.warn(
          `${identityId}: download failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        return undefined;
      }
    },
  );
  const newlyImportedCoverage = importedCoveragePairs.filter(
    (record): record is IdentityCoverage => Boolean(record),
  );
  const importedCoverage = [
    ...retainedImportedCoverage,
    ...newlyImportedCoverage,
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
  const importedPortraits: ImportedPortraitRecord[] = importedCoverage.map(
    (record) => ({
      id: record.sourceCardId,
      kind: "player",
      playerIdentityId: record.playerIdentityId,
      tournamentYear: record.sourceTournamentYear,
      localPath: record.localPath,
      sourceFile: record.sourceFile,
      portraitScope: "identity-only",
      cacheVersion: record.cacheVersion,
      changes: record.changes,
      sourcePage: record.sourcePage!,
      sourceImageUrl: record.sourceImageUrl!,
    }),
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

await main();
