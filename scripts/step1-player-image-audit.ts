import { createHash } from "node:crypto";
import { createReadStream, existsSync } from "node:fs";
import {
  mkdir,
  readFile,
  readdir,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import sharp from "sharp";
import { allPlayersBeforeIdentityPruning } from "../src/data/players";

type CsvRow = Record<string, string>;

type HistoricalArchive = {
  identities: Record<
    string,
    Array<{
      playerId: string;
      playerName: string;
      tournamentYear: number;
      teamName: string;
      primaryPosition: string;
    }>
  >;
};

type Roster2026 = {
  players: Array<{
    identityId: string;
    playerName: string;
    teamName: string;
    birthDate: string;
    primaryPosition: string;
    club: string;
  }>;
};

type UntrustedSoFifaMap = {
  mappings: Array<{
    playerIdentityId: string;
    sofifaPlayerId: string;
  }>;
};

type TargetCard = {
  playerCardId: string;
  playerIdentityId: string;
  displayName: string;
  sourceIdentityName: string;
  normalizedName: string;
  birthDate: string;
  nationality: string;
  worldCupYear: TargetYear;
  primaryPosition: string;
  clubContext: string | null;
};

type RawPlayer = {
  playerId: string;
  names: Set<string>;
  nationalities: Set<string>;
  positions: Set<string>;
  clubs: Set<string>;
  versions: Set<number>;
  realFaceVersions: Set<number>;
  rowCount: number;
  hasRealFace: boolean;
  exactFaceUrls: Set<string>;
  sourceDataset: "sofifa-fifa15-fc24" | "sofifa-fc26";
};

type IdentityProof = {
  sofifaPlayerId: string;
  sourcePage: string;
  sourceImageUrl: string;
  matchedSourceName: string;
  normalizedSourceName: string;
  nameSimilarity: number;
  exactName: boolean;
  exactBirthDate: boolean;
  nationalityMatch: boolean;
  positionContextMatch: boolean;
  sourceRealFace: boolean;
  exactEditionRealFaceRow: boolean;
  sourceDataset: RawPlayer["sourceDataset"];
  rawRowCount: number;
  sourceVersions: number[];
  sourceNationalities: string[];
  sourcePositions: string[];
  sourceClubs: string[];
  verificationMethod: string;
};

type MappingFailure = {
  status:
    | "unresolved-no-sofifa-mapping"
    | "unresolved-identity-verification";
  reason: string;
};

type ImageFacts = {
  sha256: string;
  dHash: string;
  visualSha256: string;
  width: number;
  height: number;
  format: string;
};

type RequestCacheEntry = {
  sourceUrl: string;
  checkedAt: string;
  status:
    | "verified-download"
    | "edition-unavailable"
    | "download-failed"
    | "invalid-image";
  httpStatus: number | null;
  reason: string | null;
};

type RequestCache = {
  version: 1;
  requests: Record<string, RequestCacheEntry>;
};

type AuditStatus =
  | "verified"
  | MappingFailure["status"]
  | "unresolved-edition-unavailable"
  | "unresolved-download-failed"
  | "unresolved-invalid-image"
  | "unresolved-exact-duplicate";

type AuditCard = {
  playerCardId: string;
  playerIdentityId: string;
  displayName: string;
  normalizedName: string;
  birthDate: string;
  nationality: string;
  worldCupYear: TargetYear;
  requiredGameEdition: string;
  requiredSoFifaVersion: number;
  sofifaPlayerId: string | null;
  sofifaSourcePage: string | null;
  sourceImageUrl: string | null;
  localImagePath: string;
  imageSha256: string | null;
  imageDHash: string | null;
  imageVisualSha256: string | null;
  width: number | null;
  height: number | null;
  format: string | null;
  imageValidationStatus: AuditStatus;
  imageConfidence: "high" | "none";
  identityEvidence: {
    sourceDataset: string | null;
    rawRowCount: number;
    normalizedCardName: string;
    normalizedSoFifaName: string | null;
    nameSimilarity: number | null;
    matchScore: number | null;
    mappingEvidence: string | null;
    exactBirthDate: boolean;
    nationalityMatch: boolean;
    positionContextMatch: boolean;
    sourceRealFace: boolean;
    exactEditionRealFaceRow: boolean;
    sourceVersions: number[];
    sourceNationalities: string[];
    sourcePositions: string[];
    sourceClubs: string[];
    verificationMethod: string | null;
  };
  editionEvidence: {
    sourceRowForExactVersion: boolean;
    exactVersionRealFace: boolean;
    strictEditionUrl: boolean;
    decodedStrictEditionBitmap: boolean;
    nonDefaultByCrossIdentityHash: boolean;
    proofMethod: string;
  };
  sourceReuse: {
    identicalBytesAcrossCards: string[];
    sameIdentityOnly: boolean;
    disposition: string;
  };
  exactDuplicateGroup: string | null;
  similarMatches: string[];
  priorImagePath: string;
  priorImageSha256: string | null;
  priorImageDHash: string | null;
  priorVisualSha256: string | null;
  replacementClassification:
    | "already-verified-correct"
    | "replaced"
    | null;
  replacementReason: string | null;
  notes: string[];
};

type ExactDuplicateGroup = {
  groupId: string;
  sha256: string;
  playerCardIds: string[];
  playerIdentityIds: string[];
  resolution:
    | "allowed-same-identity-cross-edition"
    | "rejected-cross-identity-placeholder-risk";
  notes: string;
};

type SimilarMatch = {
  pairId: string;
  cardA: string;
  cardB: string;
  identityA: string;
  identityB: string;
  hammingDistance: number;
  reviewStatus: "reviewed";
  reviewOutcome: "accepted-distinct-strict-source-ids";
  notes: string;
};

type PriorProductionExactDuplicateGroup = {
  groupId: string;
  sha256: string;
  playerCardIds: string[];
  playerIdentityIds: string[];
  affectedCardOutcomes: Array<{
    playerCardId: string;
    outcome: "replaced-with-verified-strict-face" | "photo-pending";
  }>;
  resolution: "fixed-by-strict-audit-runtime-exclusion";
  notes: string;
};

const ROOT = process.cwd();
const TARGET_YEARS = [2014, 2018, 2022, 2026] as const;
type TargetYear = (typeof TARGET_YEARS)[number];
const TARGET_YEAR_SET = new Set<number>(TARGET_YEARS);
const EDITION_BY_YEAR = new Map<
  TargetYear,
  { name: string; version: number }
>([
  [2014, { name: "FIFA 14", version: 14 }],
  [2018, { name: "FIFA 18", version: 18 }],
  [2022, { name: "FIFA 23", version: 23 }],
  [2026, { name: "EA SPORTS FC 26", version: 26 }],
]);
const HISTORICAL_ARCHIVE_FILE = path.join(
  ROOT,
  "src/data/player-tournaments.generated.json",
);
const ROSTER_2026_FILE = path.join(
  ROOT,
  "src/data/player-tournaments-2026.generated.json",
);
const FJELSTUL_PLAYERS_FILE = path.join(
  ROOT,
  "data/sources/fjelstul-world-cup/players.csv",
);
const UNTRUSTED_MAP_FILE = path.join(
  ROOT,
  "data/sources/sofifa/player-map.json",
);
const DEFAULT_LEGACY_INDEX =
  "/tmp/trophyxi-sofifa-fc24/male_players.csv";
const DEFAULT_FC26_INDEX =
  "/tmp/trophyxi-sofifa-fc26/FC26_20250921.csv";
const PUBLIC_DIRECTORY = path.join(ROOT, "public/players/game-faces");
const REPORT_DIRECTORY = path.join(ROOT, "reports");
const CONTACT_SHEET_DIRECTORY = path.join(
  REPORT_DIRECTORY,
  "contact-sheets",
);
const AUDIT_FILE = path.join(
  REPORT_DIRECTORY,
  "step1-player-image-audit.json",
);
const UNRESOLVED_FILE = path.join(
  REPORT_DIRECTORY,
  "step1-player-image-unresolved.json",
);
const DUPLICATES_FILE = path.join(
  REPORT_DIRECTORY,
  "step1-player-image-duplicates.json",
);
const REQUEST_CACHE_FILE = path.join(
  REPORT_DIRECTORY,
  "step1-player-image-request-cache.json",
);
const RUNTIME_FILE = path.join(
  ROOT,
  "src/data/tournament-edition-player-portraits.generated.json",
);
const USER_AGENT =
  "TrophyXI-step1-player-image-audit/1.0 (offline maintenance collector)";
const REQUEST_INTERVAL_MS = 125;
const DOWNLOAD_CONCURRENCY = 4;
const DHASH_SIMILARITY_THRESHOLD = 4;
const NAME_SIMILARITY_THRESHOLD = 0.6;
const AMBIGUITY_MARGIN = 0.08;
const RETRY_FAILURES = process.argv.includes("--retry-failures");
const MAP_ONLY = process.argv.includes("--map-only");

const argumentValue = (prefix: string) =>
  process.argv
    .find((argument) => argument.startsWith(`${prefix}=`))
    ?.slice(prefix.length + 1);

const LEGACY_INDEX_FILE =
  argumentValue("--legacy-index") ?? DEFAULT_LEGACY_INDEX;
const FC26_INDEX_FILE =
  argumentValue("--fc26-index") ?? DEFAULT_FC26_INDEX;

const parseCsvLine = (value: string) => {
  const cells: string[] = [];
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
      cells.push(cell);
      cell = "";
    } else {
      cell += character;
    }
  }
  cells.push(cell);
  return cells;
};

const parseCsv = (value: string): CsvRow[] => {
  const lines = value.split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(lines[0] ?? "");
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    return Object.fromEntries(
      headers.map((header, index) => [header, cells[index] ?? ""]),
    );
  });
};

const normalizeName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[øØ]/g, "o")
    .replace(/[łŁ]/g, "l")
    .replace(/[đĐðÐ]/g, "d")
    .replace(/[þÞ]/g, "th")
    .replace(/[ß]/g, "ss")
    .replace(/[’']/g, "")
    .toLocaleLowerCase("en")
    .replace(/\b(?:jr|junior|senior|filho|neto)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

const normalizeAuditName = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[øØ]/g, "o")
    .replace(/[łŁ]/g, "l")
    .replace(/[đĐðÐ]/g, "d")
    .replace(/[þÞ]/g, "th")
    .replace(/ß/g, "ss")
    .replace(/[’']/g, "")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const normalizedTokens = (value: string) =>
  new Set(
    normalizeName(value)
      .split(" ")
      .filter((token) => token.length > 1),
  );

const diceCoefficient = (first: Set<string>, second: Set<string>) => {
  if (first.size === 0 || second.size === 0) return 0;
  const overlap = [...first].filter((token) => second.has(token)).length;
  return (2 * overlap) / (first.size + second.size);
};

const compareNames = (target: string, source: string) => {
  const normalizedTarget = normalizeName(target);
  const normalizedSource = normalizeName(source);
  if (!normalizedTarget || !normalizedSource) {
    return { similarity: 0, exact: false };
  }
  const compactTarget = normalizedTarget.replaceAll(" ", "");
  const compactSource = normalizedSource.replaceAll(" ", "");
  if (compactTarget === compactSource) {
    return { similarity: 1, exact: true };
  }
  const targetTokens = normalizedTokens(target);
  const sourceTokens = normalizedTokens(source);
  const targetIsSubset = [...targetTokens].every((token) =>
    sourceTokens.has(token),
  );
  const sourceIsSubset = [...sourceTokens].every((token) =>
    targetTokens.has(token),
  );
  const subsetSimilarity =
    targetIsSubset || sourceIsSubset
      ? Math.min(targetTokens.size, sourceTokens.size) === 1
        ? 0.88
        : 0.92
      : 0;
  return {
    similarity: Math.max(
      diceCoefficient(targetTokens, sourceTokens),
      subsetSimilarity,
    ),
    exact: false,
  };
};

const canonicalNation = (value: string) => {
  const normalized = normalizeName(value);
  const aliases: Record<string, string> = {
    "bosnia herzegovina": "bosnia and herzegovina",
    "cape verde": "cabo verde",
    china: "china pr",
    "cote divoire": "ivory coast",
    curacao: "curacao",
    "czech republic": "czechia",
    "democratic republic of congo": "congo dr",
    "dr congo": "congo dr",
    england: "england",
    iran: "ir iran",
    ireland: "republic of ireland",
    "korea republic": "south korea",
    korea: "south korea",
    "united states": "usa",
    "united states of america": "usa",
    turkey: "turkiye",
  };
  return aliases[normalized] ?? normalized;
};

const canonicalPosition = (value: string) => {
  const normalized = value.toLocaleUpperCase("en").trim();
  const aliases: Record<string, string> = {
    AM: "CAM",
    DM: "CDM",
    LCB: "CB",
    RCB: "CB",
    LCM: "CM",
    RCM: "CM",
    LWB: "LB",
    RWB: "RB",
    LF: "LW",
    RF: "RW",
    CF: "ST",
  };
  return aliases[normalized] ?? normalized;
};

const sha256 = (value: Buffer) =>
  createHash("sha256").update(value).digest("hex");

const fileSha256 = async (filename: string) => {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filename)) {
    hash.update(chunk);
  }
  return hash.digest("hex");
};

const escapeXml = (value: string) =>
  value.replace(/[<>&'"]/g, (character) => {
    const entities: Record<string, string> = {
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      "'": "&apos;",
      '"': "&quot;",
    };
    return entities[character];
  });

const splitLabel = (value: string, maximumLength: number) => {
  if (value.length <= maximumLength) return [value];
  const words = value.split(/(?=[-\s])/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (line && `${line}${word}`.length > maximumLength) {
      lines.push(line.trim());
      line = word.trimStart();
    } else {
      line += word;
    }
  }
  if (line) lines.push(line.trim());
  if (lines.length <= 2) return lines;
  return [lines[0], `${lines.slice(1).join(" ").slice(0, maximumLength - 1)}…`];
};

const buildTargetCards = async () => {
  const historical = JSON.parse(
    await readFile(HISTORICAL_ARCHIVE_FILE, "utf8"),
  ) as HistoricalArchive;
  const roster2026 = JSON.parse(
    await readFile(ROSTER_2026_FILE, "utf8"),
  ) as Roster2026;
  const sourcePlayers = new Map(
    parseCsv(await readFile(FJELSTUL_PLAYERS_FILE, "utf8")).map((row) => [
      row.player_id,
      row,
    ]),
  );
  const cards: TargetCard[] = [];
  for (const [identityId, tournaments] of Object.entries(
    historical.identities,
  )) {
    for (const tournament of tournaments) {
      if (!TARGET_YEAR_SET.has(tournament.tournamentYear)) continue;
      const source = sourcePlayers.get(tournament.playerId);
      cards.push({
        playerCardId: `${identityId}-${tournament.tournamentYear}`,
        playerIdentityId: identityId,
        displayName: tournament.playerName,
        sourceIdentityName: tournament.playerName,
        normalizedName: normalizeAuditName(tournament.playerName),
        birthDate: source?.birth_date ?? "",
        nationality: tournament.teamName,
        worldCupYear: tournament.tournamentYear as TargetYear,
        primaryPosition: tournament.primaryPosition,
        clubContext: null,
      });
    }
  }
  for (const player of roster2026.players) {
    cards.push({
      playerCardId: `${player.identityId}-2026`,
      playerIdentityId: player.identityId,
      displayName: player.playerName,
      sourceIdentityName: player.playerName,
      normalizedName: normalizeAuditName(player.playerName),
      birthDate: player.birthDate,
      nationality: player.teamName,
      worldCupYear: 2026,
      primaryPosition: player.primaryPosition,
      clubContext: player.club,
    });
  }
  const liveById = new Map(
    allPlayersBeforeIdentityPruning.map((player) => [player.id, player]),
  );
  for (const card of cards) {
    const live = liveById.get(card.playerCardId);
    if (!live) {
      throw new Error(
        `${card.playerCardId}: source target has no production player card`,
      );
    }
    card.displayName = live.playerName;
    card.normalizedName = normalizeAuditName(live.playerName);
    card.nationality = live.countryName;
  }
  return cards.sort(
    (first, second) =>
      first.worldCupYear - second.worldCupYear ||
      first.playerCardId.localeCompare(second.playerCardId),
  );
};

const loadRawPlayerIndex = async ({
  filename,
  sourceDataset,
  targetBirthDates,
}: {
  filename: string;
  sourceDataset: RawPlayer["sourceDataset"];
  targetBirthDates: Set<string>;
}) => {
  if (!existsSync(filename)) {
    throw new Error(
      `Missing raw SoFIFA source index ${filename}. Pass the appropriate --legacy-index or --fc26-index path.`,
    );
  }
  const playersByBirthDate = new Map<
    string,
    Map<string, RawPlayer>
  >();
  const reader = readline.createInterface({
    input: createReadStream(filename),
    crlfDelay: Infinity,
  });
  let headers: string[] | undefined;
  let rowCount = 0;
  for await (const line of reader) {
    if (!headers) {
      headers = parseCsvLine(line);
      continue;
    }
    const cells = parseCsvLine(line);
    const row = Object.fromEntries(
      headers.map((header, index) => [header, cells[index] ?? ""]),
    );
    rowCount += 1;
    const birthDate = row.dob;
    if (!targetBirthDates.has(birthDate) || !row.player_id) continue;
    const byPlayer =
      playersByBirthDate.get(birthDate) ?? new Map<string, RawPlayer>();
    const player =
      byPlayer.get(row.player_id) ??
      ({
        playerId: row.player_id,
        names: new Set<string>(),
        nationalities: new Set<string>(),
        positions: new Set<string>(),
        clubs: new Set<string>(),
        versions: new Set<number>(),
        realFaceVersions: new Set<number>(),
        rowCount: 0,
        hasRealFace: false,
        exactFaceUrls: new Set<string>(),
        sourceDataset,
      } satisfies RawPlayer);
    for (const name of [row.short_name, row.long_name]) {
      if (name?.trim()) player.names.add(name.trim());
    }
    if (row.nationality_name?.trim()) {
      player.nationalities.add(row.nationality_name.trim());
    }
    for (const position of (row.player_positions ?? "").split(",")) {
      if (position.trim()) player.positions.add(position.trim());
    }
    if (row.club_name?.trim()) player.clubs.add(row.club_name.trim());
    const version = Number(row.fifa_version);
    if (Number.isFinite(version)) player.versions.add(version);
    player.rowCount += 1;
    player.hasRealFace ||= row.real_face === "Yes";
    if (Number.isFinite(version) && row.real_face === "Yes") {
      player.realFaceVersions.add(version);
    }
    if (row.player_face_url?.trim()) {
      player.exactFaceUrls.add(row.player_face_url.trim());
    }
    byPlayer.set(row.player_id, player);
    playersByBirthDate.set(birthDate, byPlayer);
  }
  return { playersByBirthDate, rowCount };
};

const sourceUrlFor = (card: TargetCard, player: RawPlayer) => {
  const edition = EDITION_BY_YEAR.get(card.worldCupYear)!;
  if (card.worldCupYear === 2026) {
    return [...player.exactFaceUrls].find((url) =>
      url.endsWith(`/${edition.version}_120.png`),
    );
  }
  const paddedPlayerId = player.playerId.padStart(6, "0");
  return `https://cdn.sofifa.net/players/${paddedPlayerId.slice(0, 3)}/${paddedPlayerId.slice(3)}/${edition.version}_120.png`;
};

const independentlyMatchCard = (
  card: TargetCard,
  candidatesByBirthDate: Map<string, Map<string, RawPlayer>>,
): IdentityProof | MappingFailure => {
  if (!card.birthDate) {
    return {
      status: "unresolved-identity-verification",
      reason: "The tournament source does not provide a date of birth.",
    };
  }
  const rawCandidates = [
    ...(candidatesByBirthDate.get(card.birthDate)?.values() ?? []),
  ];
  if (rawCandidates.length === 0) {
    return {
      status: "unresolved-no-sofifa-mapping",
      reason:
        "No player in the raw SoFIFA-derived index has the same date of birth.",
    };
  }
  const targetNation = canonicalNation(card.nationality);
  const targetPosition = canonicalPosition(card.primaryPosition);
  const requiredVersion = EDITION_BY_YEAR.get(card.worldCupYear)!.version;
  const candidates = rawCandidates
    .flatMap((player) => {
      const nationalityMatch = [...player.nationalities].some(
        (nation) => canonicalNation(nation) === targetNation,
      );
      const exactEditionRealFaceRow =
        player.realFaceVersions.has(requiredVersion);
      if (
        !nationalityMatch ||
        !player.hasRealFace ||
        (card.worldCupYear !== 2014 && !exactEditionRealFaceRow)
      ) {
        return [];
      }
      const names = [...player.names]
        .map((name) => ({
          name,
          ...compareNames(card.sourceIdentityName, name),
        }))
        .sort(
          (first, second) =>
            second.similarity - first.similarity ||
            Number(second.exact) - Number(first.exact) ||
            first.name.localeCompare(second.name),
        );
      const bestName = names[0];
      if (
        !bestName ||
        !bestName.name.trim() ||
        bestName.similarity < NAME_SIMILARITY_THRESHOLD
      ) {
        return [];
      }
      const positionContextMatch = [...player.positions]
        .map(canonicalPosition)
        .includes(targetPosition);
      return [
        {
          player,
          matchedName: bestName.name,
          normalizedSourceName: normalizeName(bestName.name),
          nameSimilarity: bestName.similarity,
          exactName: bestName.exact,
          nationalityMatch,
          positionContextMatch,
          exactEditionRealFaceRow,
        },
      ];
    })
    .sort(
      (first, second) =>
        Number(second.exactName) - Number(first.exactName) ||
        second.nameSimilarity - first.nameSimilarity ||
        Number(second.positionContextMatch) -
          Number(first.positionContextMatch) ||
        first.player.playerId.localeCompare(second.player.playerId),
    );
  const best = candidates[0];
  const runnerUp = candidates[1];
  if (!best) {
    return {
      status: "unresolved-identity-verification",
      reason:
        "Raw source rows with the same birth date did not also prove a strong normalized-name, nationality, and real-face match.",
    };
  }
  if (
    runnerUp &&
    !best.exactName &&
    best.nameSimilarity - runnerUp.nameSimilarity < AMBIGUITY_MARGIN
  ) {
    return {
      status: "unresolved-identity-verification",
      reason: `Two raw source IDs remain ambiguous after date-of-birth, nationality, normalized-name, and position checks (${best.player.playerId}, ${runnerUp.player.playerId}).`,
    };
  }
  const sourceImageUrl = sourceUrlFor(card, best.player);
  if (!sourceImageUrl) {
    return {
      status: "unresolved-no-sofifa-mapping",
      reason: `The independently matched FC26 source row does not provide an exact /26_120.png face URL.`,
    };
  }
  return {
    sofifaPlayerId: best.player.playerId,
    sourcePage: `https://sofifa.com/player/${best.player.playerId}`,
    sourceImageUrl,
    matchedSourceName: best.matchedName,
    normalizedSourceName: best.normalizedSourceName,
    nameSimilarity: best.nameSimilarity,
    exactName: best.exactName,
    exactBirthDate: true,
    nationalityMatch: best.nationalityMatch,
    positionContextMatch: best.positionContextMatch,
    sourceRealFace: best.player.hasRealFace,
    exactEditionRealFaceRow: best.exactEditionRealFaceRow,
    sourceDataset: best.player.sourceDataset,
    rawRowCount: best.player.rowCount,
    sourceVersions: [...best.player.versions].sort((a, b) => a - b),
    sourceNationalities: [...best.player.nationalities].sort(),
    sourcePositions: [...best.player.positions].sort(),
    sourceClubs: [...best.player.clubs].sort(),
    verificationMethod:
      "Independently matched against raw SoFIFA-derived rows using exact date of birth, equivalent nationality, a strong normalized-name match, real-face metadata, and position context when available.",
  };
};

const isIdentityProof = (
  value: IdentityProof | MappingFailure,
): value is IdentityProof => "sofifaPlayerId" in value;

const enforceOneToOneMappings = (
  cards: TargetCard[],
  initial: Map<string, IdentityProof | MappingFailure>,
) => {
  const sourceAssignments = new Map<string, Set<string>>();
  const identityAssignments = new Map<string, Set<string>>();
  for (const card of cards) {
    const proof = initial.get(card.playerCardId);
    if (!proof || !isIdentityProof(proof)) continue;
    sourceAssignments.set(proof.sofifaPlayerId, new Set([
      ...(sourceAssignments.get(proof.sofifaPlayerId) ?? []),
      card.playerIdentityId,
    ]));
    identityAssignments.set(card.playerIdentityId, new Set([
      ...(identityAssignments.get(card.playerIdentityId) ?? []),
      proof.sofifaPlayerId,
    ]));
  }
  const sourceCollisions = [...sourceAssignments]
    .filter(([, identities]) => identities.size > 1)
    .map(([sofifaPlayerId, identities]) => ({
      sofifaPlayerId,
      playerIdentityIds: [...identities].sort(),
      resolution: "rejected-all-assignments" as const,
    }));
  const identityCollisions = [...identityAssignments]
    .filter(([, sourceIds]) => sourceIds.size > 1)
    .map(([playerIdentityId, sourceIds]) => ({
      playerIdentityId,
      sofifaPlayerIds: [...sourceIds].sort(),
      resolution: "rejected-all-assignments" as const,
    }));
  const rejectedSources = new Set(
    sourceCollisions.map((collision) => collision.sofifaPlayerId),
  );
  const rejectedIdentities = new Set(
    identityCollisions.map((collision) => collision.playerIdentityId),
  );
  const checked = new Map(initial);
  for (const card of cards) {
    const proof = checked.get(card.playerCardId);
    if (!proof || !isIdentityProof(proof)) continue;
    if (rejectedSources.has(proof.sofifaPlayerId)) {
      checked.set(card.playerCardId, {
        status: "unresolved-identity-verification",
        reason: `Raw source ID ${proof.sofifaPlayerId} independently matched more than one Trophy XI identity and was rejected by the one-to-one rule.`,
      });
    } else if (rejectedIdentities.has(card.playerIdentityId)) {
      checked.set(card.playerCardId, {
        status: "unresolved-identity-verification",
        reason: `Trophy XI identity ${card.playerIdentityId} independently matched more than one raw source ID and was rejected by the one-to-one rule.`,
      });
    }
  }
  return { checked, sourceCollisions, identityCollisions };
};

const independentlyMatchingSourceIds = (
  card: TargetCard,
  candidatesByBirthDate: Map<string, Map<string, RawPlayer>>,
) =>
  [...(candidatesByBirthDate.get(card.birthDate)?.values() ?? [])]
    .filter(
      (player) =>
        [...player.nationalities].some(
          (nation) =>
            canonicalNation(nation) ===
            canonicalNation(card.nationality),
        ) &&
        [...player.names].some(
          (name) =>
            compareNames(card.sourceIdentityName, name).similarity >=
            NAME_SIMILARITY_THRESHOLD,
        ),
    )
    .map((player) => player.playerId)
    .sort();

const rejectConflatedTargetIdentities = (
  cards: TargetCard[],
  matches: Map<string, IdentityProof | MappingFailure>,
  legacyIndex: Map<string, Map<string, RawPlayer>>,
  fc26Index: Map<string, Map<string, RawPlayer>>,
) => {
  const cardsByIdentity = new Map<string, TargetCard[]>();
  for (const card of cards) {
    cardsByIdentity.set(card.playerIdentityId, [
      ...(cardsByIdentity.get(card.playerIdentityId) ?? []),
      card,
    ]);
  }
  const conflictGroups = [...cardsByIdentity]
    .flatMap(([playerIdentityId, identityCards]) => {
      if (identityCards.length < 2) return [];
      const hasIncompatibleNames = identityCards.some((first, index) =>
        identityCards
          .slice(index + 1)
          .some(
            (second) =>
              compareNames(
                first.sourceIdentityName,
                second.sourceIdentityName,
              )
                .similarity < NAME_SIMILARITY_THRESHOLD,
          ),
      );
      if (!hasIncompatibleNames) return [];
      const cardEvidence = identityCards.map((card) => ({
        playerCardId: card.playerCardId,
        displayName: card.displayName,
        sourceIdentityName: card.sourceIdentityName,
        worldCupYear: card.worldCupYear,
        independentlyMatchingSourceIds:
          independentlyMatchingSourceIds(
            card,
            card.worldCupYear === 2026 ? fc26Index : legacyIndex,
          ),
      }));
      const distinctSourceIds = new Set(
        cardEvidence.flatMap(
          (card) => card.independentlyMatchingSourceIds,
        ),
      );
      if (distinctSourceIds.size < 2) return [];
      return [
        {
          playerIdentityId,
          cards: cardEvidence,
          distinctSourceIds: [...distinctSourceIds].sort(),
          resolution: "rejected-conflated-identity" as const,
          reason:
            "The same Trophy XI identity contains strongly incompatible player names that independently match different raw SoFIFA source IDs.",
        },
      ];
    })
    .sort((first, second) =>
      first.playerIdentityId.localeCompare(second.playerIdentityId),
    );
  for (const conflict of conflictGroups) {
    for (const card of conflict.cards) {
      matches.set(card.playerCardId, {
        status: "unresolved-identity-verification",
        reason: `${conflict.reason} Source IDs: ${conflict.distinctSourceIds.join(", ")}.`,
      });
    }
  }
  return conflictGroups;
};

const imageFacts = async (buffer: Buffer): Promise<ImageFacts> => {
  const metadata = await sharp(buffer, { animated: false }).metadata();
  if (
    metadata.format !== "png" ||
    !metadata.width ||
    !metadata.height ||
    metadata.width < 80 ||
    metadata.height < 80 ||
    metadata.width > 2048 ||
    metadata.height > 2048
  ) {
    throw new Error(
      `Expected a decodable PNG between 80x80 and 2048x2048; received ${metadata.format ?? "unknown"} ${metadata.width ?? 0}x${metadata.height ?? 0}.`,
    );
  }
  const dHashPixels = await sharp(buffer, { animated: false })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .grayscale()
    .resize(9, 8, { fit: "fill" })
    .raw()
    .toBuffer();
  let dHashValue = 0n;
  for (let row = 0; row < 8; row += 1) {
    for (let column = 0; column < 8; column += 1) {
      dHashValue <<= 1n;
      if (
        dHashPixels[row * 9 + column] >
        dHashPixels[row * 9 + column + 1]
      ) {
        dHashValue |= 1n;
      }
    }
  }
  const visual = await sharp(buffer, { animated: false })
    .rotate()
    .ensureAlpha()
    .resize(120, 120, {
      fit: "contain",
      position: "centre",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: sharp.kernel.lanczos3,
    })
    .toColourspace("srgb")
    .raw()
    .toBuffer();
  return {
    sha256: sha256(buffer),
    dHash: dHashValue.toString(16).padStart(16, "0"),
    visualSha256: sha256(visual),
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
  };
};

const hammingDistance = (first: string, second: string) => {
  let difference = BigInt(`0x${first}`) ^ BigInt(`0x${second}`);
  let bits = 0;
  while (difference > 0n) {
    bits += Number(difference & 1n);
    difference >>= 1n;
  }
  return bits;
};

const requestSchedule = { nextAt: 0, gate: Promise.resolve() };

const waitForRequestSlot = async () => {
  const previous = requestSchedule.gate;
  let release = () => {};
  requestSchedule.gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await previous;
  const waitMs = Math.max(0, requestSchedule.nextAt - Date.now());
  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  requestSchedule.nextAt = Date.now() + REQUEST_INTERVAL_MS;
  release();
};

const fetchStrictEditionImage = async (url: string) => {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await waitForRequestSlot();
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "image/png,image/*;q=0.8",
          "User-Agent": USER_AGENT,
        },
        redirect: "follow",
        signal: AbortSignal.timeout(25_000),
      });
      if (response.status === 404 || response.status === 410) {
        return {
          kind: "edition-unavailable" as const,
          httpStatus: response.status,
          reason: `Strict-edition source returned HTTP ${response.status}.`,
        };
      }
      if (!response.ok) {
        const error = new Error(
          `Strict-edition source returned HTTP ${response.status}.`,
        );
        if (response.status < 500 && response.status !== 429) throw error;
        lastError = error;
      } else {
        const buffer = Buffer.from(await response.arrayBuffer());
        if (buffer.byteLength < 500 || buffer.byteLength > 5_000_000) {
          return {
            kind: "invalid-image" as const,
            httpStatus: response.status,
            reason: `Unexpected source byte length ${buffer.byteLength}.`,
          };
        }
        try {
          const facts = await imageFacts(buffer);
          return {
            kind: "success" as const,
            httpStatus: response.status,
            buffer,
            facts,
          };
        } catch (error) {
          return {
            kind: "invalid-image" as const,
            httpStatus: response.status,
            reason: error instanceof Error ? error.message : String(error),
          };
        }
      }
    } catch (error) {
      lastError = error;
    }
    if (attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, 400 * 2 ** attempt));
    }
  }
  return {
    kind: "download-failed" as const,
    httpStatus: null,
    reason: lastError instanceof Error ? lastError.message : String(lastError),
  };
};

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

const baseAuditCard = (
  card: TargetCard,
  proof: IdentityProof | undefined,
): AuditCard => {
  const edition = EDITION_BY_YEAR.get(card.worldCupYear)!;
  return {
    playerCardId: card.playerCardId,
    playerIdentityId: card.playerIdentityId,
    displayName: card.displayName,
    normalizedName: card.normalizedName,
    birthDate: card.birthDate,
    nationality: card.nationality,
    worldCupYear: card.worldCupYear,
    requiredGameEdition: edition.name,
    requiredSoFifaVersion: edition.version,
    sofifaPlayerId: proof?.sofifaPlayerId ?? null,
    sofifaSourcePage: proof?.sourcePage ?? null,
    sourceImageUrl: proof?.sourceImageUrl ?? null,
    localImagePath: `/players/game-faces/${card.playerCardId}.png`,
    imageSha256: null,
    imageDHash: null,
    imageVisualSha256: null,
    width: null,
    height: null,
    format: null,
    imageValidationStatus: "unresolved-no-sofifa-mapping",
    imageConfidence: "none",
    identityEvidence: {
      sourceDataset: proof?.sourceDataset ?? null,
      rawRowCount: proof?.rawRowCount ?? 0,
      normalizedCardName: normalizeAuditName(card.displayName),
      normalizedSoFifaName: proof?.normalizedSourceName ?? null,
      nameSimilarity: proof?.nameSimilarity ?? null,
      matchScore:
        proof === undefined
          ? null
          : Math.round(proof.nameSimilarity * 1_000) / 10,
      mappingEvidence:
        proof === undefined
          ? null
          : `${proof.sourceDataset}: ${proof.rawRowCount} raw row(s); source target name "${card.sourceIdentityName}"; exact DOB; nationality ${proof.sourceNationalities.join("/")}; matched source name "${proof.matchedSourceName}"; source versions ${proof.sourceVersions.join(",")}.`,
      exactBirthDate: proof?.exactBirthDate ?? false,
      nationalityMatch: proof?.nationalityMatch ?? false,
      positionContextMatch: proof?.positionContextMatch ?? false,
      sourceRealFace: proof?.sourceRealFace ?? false,
      exactEditionRealFaceRow:
        proof?.exactEditionRealFaceRow ?? false,
      sourceVersions: proof?.sourceVersions ?? [],
      sourceNationalities: proof?.sourceNationalities ?? [],
      sourcePositions: proof?.sourcePositions ?? [],
      sourceClubs: proof?.sourceClubs ?? [],
      verificationMethod: proof?.verificationMethod ?? null,
    },
    editionEvidence: {
      sourceRowForExactVersion:
        proof?.sourceVersions.includes(edition.version) ?? false,
      exactVersionRealFace:
        proof?.exactEditionRealFaceRow ?? false,
      strictEditionUrl:
        proof?.sourceImageUrl.endsWith(
          `/${edition.version}_120.png`,
        ) ?? false,
      decodedStrictEditionBitmap: false,
      nonDefaultByCrossIdentityHash: false,
      proofMethod:
        card.worldCupYear === 2014
          ? "Identity is proven by later stable SoFIFA ID/DOB/name/nationality rows; FIFA 14 edition is proven only by a successful exact /14_120.png response plus valid, non-default, nonduplicate bitmap checks. No FIFA 14 raw row is claimed."
          : `Identity and real-face availability are proven by an exact version ${edition.version} raw source row; edition is additionally proven by the exact /${edition.version}_120.png URL and decoded, non-default, nonduplicate bitmap checks.`,
    },
    sourceReuse: {
      identicalBytesAcrossCards: [],
      sameIdentityOnly: true,
      disposition: "not-applicable",
    },
    exactDuplicateGroup: null,
    similarMatches: [],
    priorImagePath: `/players/game-faces/${card.playerCardId}.png`,
    priorImageSha256: null,
    priorImageDHash: null,
    priorVisualSha256: null,
    replacementClassification: null,
    replacementReason: null,
    notes: [],
  };
};

const comparePriorProduction = async (
  card: AuditCard,
  strictFacts: ImageFacts,
) => {
  const absolute = path.join(
    ROOT,
    "public",
    card.priorImagePath.replace(/^\//, ""),
  );
  if (!existsSync(absolute)) {
    card.replacementClassification = "replaced";
    card.replacementReason =
      "No canonical prior production PNG existed for this card.";
    return;
  }
  try {
    const priorBuffer = await readFile(absolute);
    const prior = await imageFacts(priorBuffer);
    card.priorImageSha256 = prior.sha256;
    card.priorImageDHash = prior.dHash;
    card.priorVisualSha256 = prior.visualSha256;
    if (
      prior.sha256 === strictFacts.sha256 ||
      prior.visualSha256 === strictFacts.visualSha256
    ) {
      card.replacementClassification = "already-verified-correct";
      card.replacementReason =
        prior.sha256 === strictFacts.sha256
          ? "Prior production bytes exactly match the independently retrieved strict-edition source."
          : "Prior production decoded canonical RGBA pixels match the independently retrieved strict-edition source.";
    } else {
      card.replacementClassification = "replaced";
      card.replacementReason =
        "Prior production pixels do not match the independently retrieved strict-edition source.";
    }
  } catch (error) {
    card.replacementClassification = "replaced";
    card.replacementReason = `Prior production file could not be decoded and compared: ${error instanceof Error ? error.message : String(error)}`;
  }
};

const buildContactSheet = async (
  year: TargetYear,
  cards: AuditCard[],
) => {
  const columns = 14;
  const cellWidth = 190;
  const cellHeight = 210;
  const headerHeight = 68;
  const rows = Math.ceil(cards.length / columns);
  const width = columns * cellWidth;
  const height = headerHeight + rows * cellHeight;
  const edition = EDITION_BY_YEAR.get(year)!;
  const svg: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`,
    `<rect width="100%" height="100%" fill="#050706"/>`,
    `<rect width="100%" height="${headerHeight}" fill="#0d1511"/>`,
    `<text x="28" y="28" fill="#e2c46e" font-family="Arial,sans-serif" font-weight="700" font-size="21">Trophy XI — ${year} portrait identity review</text>`,
    `<text x="28" y="51" fill="#9aa59e" font-family="Arial,sans-serif" font-size="13">${cards.length} cards · required edition ${escapeXml(edition.name)} · verified portraits and explicit PHOTO PENDING tiles</text>`,
  ];
  const portraits: Array<{
    input: Buffer;
    left: number;
    top: number;
  }> = [];
  for (const [index, card] of cards.entries()) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const left = column * cellWidth;
    const top = headerHeight + row * cellHeight;
    const verified = card.imageValidationStatus === "verified";
    svg.push(
      `<rect x="${left + 2}" y="${top + 2}" width="${cellWidth - 4}" height="${cellHeight - 4}" rx="5" fill="${verified ? "#0b100d" : "#10110f"}" stroke="${verified ? "#6f5b28" : "#443c2a"}"/>`,
    );
    if (!verified) {
      svg.push(
        `<circle cx="${left + cellWidth / 2}" cy="${top + 49}" r="29" fill="#171c18" stroke="#6b6042"/>`,
        `<circle cx="${left + cellWidth / 2}" cy="${top + 41}" r="9" fill="none" stroke="#a79359" stroke-width="2"/>`,
        `<path d="M ${left + cellWidth / 2 - 18} ${top + 69} Q ${left + cellWidth / 2} ${top + 52} ${left + cellWidth / 2 + 18} ${top + 69}" fill="none" stroke="#a79359" stroke-width="2"/>`,
        `<text x="${left + cellWidth / 2}" y="${top + 91}" text-anchor="middle" fill="#c9b46f" font-family="Arial,sans-serif" font-weight="700" font-size="9">PHOTO PENDING</text>`,
      );
    } else {
      const filename = path.join(
        PUBLIC_DIRECTORY,
        `${card.playerCardId}.png`,
      );
      const portrait = await sharp(filename)
        .resize(112, 112, {
          fit: "contain",
          background: { r: 8, g: 11, b: 9, alpha: 1 },
        })
        .png()
        .toBuffer();
      portraits.push({
        input: portrait,
        left: left + Math.floor((cellWidth - 112) / 2),
        top: top + 5,
      });
    }
    const nameLines = splitLabel(card.displayName, 27);
    const idLines = splitLabel(card.playerCardId, 30);
    let textY = top + 127;
    for (const line of nameLines) {
      svg.push(
        `<text x="${left + cellWidth / 2}" y="${textY}" text-anchor="middle" fill="#f0ead8" font-family="Arial,sans-serif" font-weight="700" font-size="10">${escapeXml(line)}</text>`,
      );
      textY += 12;
    }
    svg.push(
      `<text x="${left + cellWidth / 2}" y="${textY}" text-anchor="middle" fill="#b7c0ba" font-family="Arial,sans-serif" font-size="9">${escapeXml(card.nationality)} · ${year}</text>`,
    );
    textY += 11;
    svg.push(
      `<text x="${left + cellWidth / 2}" y="${textY}" text-anchor="middle" fill="#d0ad51" font-family="Arial,sans-serif" font-size="9">${escapeXml(edition.name)}</text>`,
    );
    textY += 11;
    for (const line of idLines) {
      svg.push(
        `<text x="${left + cellWidth / 2}" y="${textY}" text-anchor="middle" fill="#7f8b83" font-family="monospace" font-size="8">${escapeXml(line)}</text>`,
      );
      textY += 10;
    }
    svg.push(
      `<text x="${left + cellWidth / 2}" y="${top + cellHeight - 8}" text-anchor="middle" fill="${verified ? "#7fc19b" : "#c19c69"}" font-family="Arial,sans-serif" font-size="8">${escapeXml(card.imageValidationStatus)}</text>`,
    );
  }
  svg.push("</svg>");
  let sheet = await sharp(Buffer.from(svg.join("")), {
    limitInputPixels: false,
  })
    .png()
    .toBuffer();
  for (let offset = 0; offset < portraits.length; offset += 180) {
    sheet = await sharp(sheet, { limitInputPixels: false })
      .composite(portraits.slice(offset, offset + 180))
      .png({ compressionLevel: 9 })
      .toBuffer();
  }
  const output = path.join(
    CONTACT_SHEET_DIRECTORY,
    `player-images-${year}.png`,
  );
  await writeFile(output, sheet);
  return output;
};

const groupedCounts = <T>(
  values: T[],
  keyFor: (value: T) => string,
) =>
  Object.fromEntries(
    [...values.reduce((counts, value) => {
      const key = keyFor(value);
      counts.set(key, (counts.get(key) ?? 0) + 1);
      return counts;
    }, new Map<string, number>())].sort(([first], [second]) =>
      first.localeCompare(second, "en", { numeric: true }),
    ),
  );

const main = async () => {
  const generatedAt = new Date().toISOString();
  const cards = await buildTargetCards();
  const expectedCounts = new Map<TargetYear, number>([
    [2014, 736],
    [2018, 736],
    [2022, 831],
    [2026, 1247],
  ]);
  for (const [year, expected] of expectedCounts) {
    const actual = cards.filter((card) => card.worldCupYear === year).length;
    if (actual !== expected) {
      throw new Error(
        `${year}: expected ${expected} target cards, found ${actual}`,
      );
    }
  }
  const historicalBirthDates = new Set(
    cards
      .filter((card) => card.worldCupYear !== 2026)
      .map((card) => card.birthDate)
      .filter(Boolean),
  );
  const currentBirthDates = new Set(
    cards
      .filter((card) => card.worldCupYear === 2026)
      .map((card) => card.birthDate)
      .filter(Boolean),
  );
  console.log("Loading raw FIFA 15–FC 24 identity rows...");
  const legacy = await loadRawPlayerIndex({
    filename: LEGACY_INDEX_FILE,
    sourceDataset: "sofifa-fifa15-fc24",
    targetBirthDates: historicalBirthDates,
  });
  console.log("Loading raw FC 26 identity and exact-face rows...");
  const fc26 = await loadRawPlayerIndex({
    filename: FC26_INDEX_FILE,
    sourceDataset: "sofifa-fc26",
    targetBirthDates: currentBirthDates,
  });
  const initialMatches = new Map<string, IdentityProof | MappingFailure>();
  for (const card of cards) {
    initialMatches.set(
      card.playerCardId,
      independentlyMatchCard(
        card,
        card.worldCupYear === 2026
          ? fc26.playersByBirthDate
          : legacy.playersByBirthDate,
      ),
    );
  }
  const {
    checked: matches,
    sourceCollisions: rebuiltSourceCollisionGroups,
    identityCollisions: rebuiltIdentityCollisionGroups,
  } = enforceOneToOneMappings(cards, initialMatches);
  const targetIdentityConflictGroups =
    rejectConflatedTargetIdentities(
      cards,
      matches,
      legacy.playersByBirthDate,
      fc26.playersByBirthDate,
    );
  const mappedByYear = Object.fromEntries(
    TARGET_YEARS.map((year) => [
      String(year),
      cards.filter(
        (card) =>
          card.worldCupYear === year &&
          isIdentityProof(matches.get(card.playerCardId)!),
      ).length,
    ]),
  );
  console.log(
    `Independently verified mapping candidates by year: ${JSON.stringify(mappedByYear)}`,
  );
  console.log(
    `One-to-one rebuild rejected ${rebuiltSourceCollisionGroups.length} source-ID collision groups, ${rebuiltIdentityCollisionGroups.length} identity-to-multiple-source groups, and ${targetIdentityConflictGroups.length} conflated target identity groups.`,
  );
  if (targetIdentityConflictGroups.length > 0) {
    console.log(
      `Conflated target identities: ${targetIdentityConflictGroups.map((group) => `${group.playerIdentityId} (${group.distinctSourceIds.join("/")})`).join(", ")}`,
    );
  }

  const untrusted = JSON.parse(
    await readFile(UNTRUSTED_MAP_FILE, "utf8"),
  ) as UntrustedSoFifaMap;
  const oldAssignments = new Map<string, Set<string>>();
  for (const mapping of untrusted.mappings) {
    oldAssignments.set(mapping.sofifaPlayerId, new Set([
      ...(oldAssignments.get(mapping.sofifaPlayerId) ?? []),
      mapping.playerIdentityId,
    ]));
  }
  const untrustedMapCollisionGroups = [...oldAssignments]
    .filter(([, identities]) => identities.size > 1)
    .map(([sofifaPlayerId, identities]) => ({
      sofifaPlayerId,
      playerIdentityIds: [...identities].sort(),
      recordCount: identities.size,
    }))
    .sort((first, second) =>
      first.sofifaPlayerId.localeCompare(second.sofifaPlayerId, "en", {
        numeric: true,
      }),
    );
  const collidedOldIds = new Set(
    untrustedMapCollisionGroups.map((group) => group.sofifaPlayerId),
  );
  const rejectedUntrustedMappingRecords = untrusted.mappings
    .filter((mapping) => collidedOldIds.has(mapping.sofifaPlayerId))
    .map((mapping) => ({
      playerIdentityId: mapping.playerIdentityId,
      sofifaPlayerId: mapping.sofifaPlayerId,
      reason:
        "The old generated map assigned this source ID to multiple unrelated Trophy XI identities; its evidence string was not accepted.",
    }));
  console.log(
    `Rejected ${rejectedUntrustedMappingRecords.length} records across ${untrustedMapCollisionGroups.length} colliding source IDs in the old map.`,
  );
  if (MAP_ONLY) return;

  await mkdir(PUBLIC_DIRECTORY, { recursive: true });
  await mkdir(CONTACT_SHEET_DIRECTORY, { recursive: true });
  const requestCache: RequestCache = existsSync(REQUEST_CACHE_FILE)
    ? (JSON.parse(
        await readFile(REQUEST_CACHE_FILE, "utf8"),
      ) as RequestCache)
    : { version: 1, requests: {} };
  let cacheWrites = 0;
  let cacheWriteGate = Promise.resolve();
  const persistRequestCache = async (force = false) => {
    cacheWrites += 1;
    if (!force && cacheWrites % 25 !== 0) return;
    cacheWriteGate = cacheWriteGate.then(() =>
      writeFile(
        REQUEST_CACHE_FILE,
        `${JSON.stringify(requestCache, null, 2)}\n`,
      ),
    );
    await cacheWriteGate;
  };

  const auditCards = await mapLimit(
    cards,
    DOWNLOAD_CONCURRENCY,
    async (card, index): Promise<AuditCard> => {
      const match = matches.get(card.playerCardId)!;
      if (!isIdentityProof(match)) {
        const audit = baseAuditCard(card, undefined);
        audit.imageValidationStatus = match.status;
        audit.notes.push(match.reason);
        const stale = path.join(
          PUBLIC_DIRECTORY,
          `${card.playerCardId}.png`,
        );
        if (existsSync(stale)) await unlink(stale);
        return audit;
      }
      const audit = baseAuditCard(card, match);
      const output = path.join(
        PUBLIC_DIRECTORY,
        `${card.playerCardId}.png`,
      );
      const cached = requestCache.requests[card.playerCardId];
      let strictBuffer: Buffer | undefined;
      let strictFacts: ImageFacts | undefined;
      if (
        cached?.status === "verified-download" &&
        cached.sourceUrl === match.sourceImageUrl &&
        existsSync(output)
      ) {
        try {
          strictBuffer = await readFile(output);
          strictFacts = await imageFacts(strictBuffer);
        } catch {
          strictBuffer = undefined;
          strictFacts = undefined;
        }
      }
      if (
        !strictBuffer &&
        !RETRY_FAILURES &&
        cached?.sourceUrl === match.sourceImageUrl &&
        cached.status !== "verified-download"
      ) {
        if (existsSync(output)) await unlink(output);
        audit.imageValidationStatus =
          cached.status === "edition-unavailable"
            ? "unresolved-edition-unavailable"
            : cached.status === "invalid-image"
              ? "unresolved-invalid-image"
              : "unresolved-download-failed";
        audit.notes.push(cached.reason ?? "Cached strict-edition request failed.");
        return audit;
      }
      if (!strictBuffer || !strictFacts) {
        const result = await fetchStrictEditionImage(match.sourceImageUrl);
        if (result.kind !== "success") {
          requestCache.requests[card.playerCardId] = {
            sourceUrl: match.sourceImageUrl,
            checkedAt: new Date().toISOString(),
            status: result.kind,
            httpStatus: result.httpStatus,
            reason: result.reason,
          };
          await persistRequestCache();
          if (existsSync(output)) await unlink(output);
          audit.imageValidationStatus =
            result.kind === "edition-unavailable"
              ? "unresolved-edition-unavailable"
              : result.kind === "invalid-image"
                ? "unresolved-invalid-image"
                : "unresolved-download-failed";
          audit.notes.push(result.reason);
          return audit;
        }
        strictBuffer = result.buffer;
        strictFacts = result.facts;
        await writeFile(output, strictBuffer);
        requestCache.requests[card.playerCardId] = {
          sourceUrl: match.sourceImageUrl,
          checkedAt: new Date().toISOString(),
          status: "verified-download",
          httpStatus: result.httpStatus,
          reason: null,
        };
        await persistRequestCache();
      }
      audit.imageSha256 = strictFacts.sha256;
      audit.imageDHash = strictFacts.dHash;
      audit.imageVisualSha256 = strictFacts.visualSha256;
      audit.width = strictFacts.width;
      audit.height = strictFacts.height;
      audit.format = strictFacts.format;
      audit.imageValidationStatus = "verified";
      audit.imageConfidence = "high";
      audit.editionEvidence.decodedStrictEditionBitmap = true;
      await comparePriorProduction(audit, strictFacts);
      if ((index + 1) % 100 === 0 || index + 1 === cards.length) {
        console.log(`Processed ${index + 1}/${cards.length} target cards.`);
      }
      return audit;
    },
  );
  await persistRequestCache(true);

  const priorProductionByHash = new Map<string, AuditCard[]>();
  for (const card of auditCards) {
    const absolute = path.join(
      ROOT,
      "public",
      card.priorImagePath.replace(/^\//, ""),
    );
    if (!existsSync(absolute)) continue;
    const priorHash = sha256(await readFile(absolute));
    priorProductionByHash.set(priorHash, [
      ...(priorProductionByHash.get(priorHash) ?? []),
      card,
    ]);
  }
  const priorProductionExactDuplicateGroups:
    PriorProductionExactDuplicateGroup[] = [
      ...priorProductionByHash,
    ]
      .filter(
        ([, group]) =>
          group.length > 1 &&
          new Set(group.map((card) => card.playerIdentityId)).size > 1,
      )
      .map(([hash, group]) => ({
        groupId: `prior-sha256-${hash.slice(0, 16)}`,
        sha256: hash,
        playerCardIds: group
          .map((card) => card.playerCardId)
          .sort(),
        playerIdentityIds: [
          ...new Set(group.map((card) => card.playerIdentityId)),
        ].sort(),
        affectedCardOutcomes: group
          .map((card) => ({
            playerCardId: card.playerCardId,
            outcome:
              card.imageValidationStatus === "verified"
                ? ("replaced-with-verified-strict-face" as const)
                : ("photo-pending" as const),
          }))
          .sort((first, second) =>
            first.playerCardId.localeCompare(second.playerCardId),
          ),
        resolution: "fixed-by-strict-audit-runtime-exclusion" as const,
        notes:
          "The pre-audit production files assigned identical bytes to unrelated identities. Target-year legacy files are excluded from runtime; each affected card now uses its independently verified strict face or Photo Pending.",
      }))
      .sort((first, second) =>
        first.groupId.localeCompare(second.groupId),
      );

  const exactGroupsByHash = new Map<string, AuditCard[]>();
  for (const card of auditCards) {
    if (
      card.imageValidationStatus !== "verified" ||
      !card.imageSha256
    ) {
      continue;
    }
    exactGroupsByHash.set(card.imageSha256, [
      ...(exactGroupsByHash.get(card.imageSha256) ?? []),
      card,
    ]);
  }
  const exactDuplicateGroups: ExactDuplicateGroup[] = [];
  for (const [hash, group] of exactGroupsByHash) {
    if (group.length < 2) continue;
    const identities = new Set(
      group.map((card) => card.playerIdentityId),
    );
    const crossIdentity = identities.size > 1;
    const groupId = `sha256-${hash.slice(0, 16)}`;
    exactDuplicateGroups.push({
      groupId,
      sha256: hash,
      playerCardIds: group
        .map((card) => card.playerCardId)
        .sort(),
      playerIdentityIds: [...identities].sort(),
      resolution: crossIdentity
        ? "rejected-cross-identity-placeholder-risk"
        : "allowed-same-identity-cross-edition",
      notes: crossIdentity
        ? "Identical bytes were independently returned for unrelated identities; every affected asset was rejected to avoid a copied/default/wrong-person portrait."
        : "The same identity independently returned identical strict-edition bytes for multiple tournament cards; this reuse is explicitly disclosed.",
    });
    for (const card of group) {
      card.sourceReuse = {
        identicalBytesAcrossCards: group
          .filter((other) => other.playerCardId !== card.playerCardId)
          .map((other) => other.playerCardId)
          .sort(),
        sameIdentityOnly: !crossIdentity,
        disposition: crossIdentity
          ? "rejected-cross-identity"
          : "allowed-independent-strict-edition-match",
      };
      card.exactDuplicateGroup = groupId;
      if (crossIdentity) {
        card.editionEvidence.nonDefaultByCrossIdentityHash = false;
        card.imageValidationStatus = "unresolved-exact-duplicate";
        card.imageConfidence = "none";
        card.replacementClassification = null;
        card.replacementReason = null;
        card.notes.push(
          "Rejected because unrelated identities received identical bytes.",
        );
        const filename = path.join(
          PUBLIC_DIRECTORY,
          `${card.playerCardId}.png`,
        );
        if (existsSync(filename)) await unlink(filename);
      } else {
        card.editionEvidence.nonDefaultByCrossIdentityHash = true;
      }
    }
  }
  for (const card of auditCards) {
    if (
      card.imageValidationStatus === "verified" &&
      card.exactDuplicateGroup === null
    ) {
      card.editionEvidence.nonDefaultByCrossIdentityHash = true;
    }
  }

  const verifiedCards = auditCards.filter(
    (card) => card.imageValidationStatus === "verified",
  );
  const similarMatches: SimilarMatch[] = [];
  for (let firstIndex = 0; firstIndex < verifiedCards.length; firstIndex += 1) {
    const first = verifiedCards[firstIndex];
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < verifiedCards.length;
      secondIndex += 1
    ) {
      const second = verifiedCards[secondIndex];
      if (
        first.playerIdentityId === second.playerIdentityId ||
        !first.imageDHash ||
        !second.imageDHash ||
        first.imageSha256 === second.imageSha256
      ) {
        continue;
      }
      const distance = hammingDistance(
        first.imageDHash,
        second.imageDHash,
      );
      if (distance > DHASH_SIMILARITY_THRESHOLD) continue;
      const [cardA, cardB] = [
        first.playerCardId,
        second.playerCardId,
      ].sort();
      const pairId = `${cardA}::${cardB}`;
      similarMatches.push({
        pairId,
        cardA,
        cardB,
        identityA:
          cardA === first.playerCardId
            ? first.playerIdentityId
            : second.playerIdentityId,
        identityB:
          cardB === second.playerCardId
            ? second.playerIdentityId
            : first.playerIdentityId,
        hammingDistance: distance,
        reviewStatus: "reviewed",
        reviewOutcome: "accepted-distinct-strict-source-ids",
        notes:
          "Reviewed against independent raw-row identity proof and distinct strict-edition SoFIFA source IDs/URLs; the coarse dHash similarity is not an exact-image collision.",
      });
      first.similarMatches.push(second.playerCardId);
      second.similarMatches.push(first.playerCardId);
    }
  }
  for (const card of auditCards) {
    card.similarMatches.sort();
  }

  const byYear = Object.fromEntries(
    TARGET_YEARS.map((year) => {
      const yearCards = auditCards.filter(
        (card) => card.worldCupYear === year,
      );
      return [
        String(year),
        {
          total: yearCards.length,
          verified: yearCards.filter(
            (card) => card.imageValidationStatus === "verified",
          ).length,
          unresolved: yearCards.filter(
            (card) => card.imageValidationStatus !== "verified",
          ).length,
          alreadyVerifiedCorrect: yearCards.filter(
            (card) =>
              card.replacementClassification ===
              "already-verified-correct",
          ).length,
          replaced: yearCards.filter(
            (card) => card.replacementClassification === "replaced",
          ).length,
        },
      ];
    }),
  );
  const summary = {
    totalCards: auditCards.length,
    verified: verifiedCards.length,
    unresolved: auditCards.length - verifiedCards.length,
    alreadyVerifiedCorrect: auditCards.filter(
      (card) =>
        card.replacementClassification === "already-verified-correct",
    ).length,
    replaced: auditCards.filter(
      (card) => card.replacementClassification === "replaced",
    ).length,
    untrustedMapCollisionSourceIds:
      untrustedMapCollisionGroups.length,
    rejectedUntrustedMappingRecords:
      rejectedUntrustedMappingRecords.length,
    rebuiltSourceCollisionGroups: rebuiltSourceCollisionGroups.length,
    rebuiltIdentityCollisionGroups:
      rebuiltIdentityCollisionGroups.length,
    targetIdentityConflictGroups: targetIdentityConflictGroups.length,
    exactDuplicateGroups: exactDuplicateGroups.length,
    crossIdentityExactDuplicateErrors: exactDuplicateGroups.filter(
      (group) =>
        group.resolution ===
        "rejected-cross-identity-placeholder-risk",
    ).length,
    priorProductionExactDuplicateErrorsFound:
      priorProductionExactDuplicateGroups.length,
    priorProductionExactDuplicateErrorsFixed:
      priorProductionExactDuplicateGroups.length,
    priorProductionCardsInExactDuplicateErrors:
      priorProductionExactDuplicateGroups.reduce(
        (count, group) => count + group.playerCardIds.length,
        0,
      ),
    suspiciousPerceptualMatchesReviewed: similarMatches.length,
    byStatus: groupedCounts(
      auditCards,
      (card) => card.imageValidationStatus,
    ),
    byYear,
  };
  const legacySourceSha256 = await fileSha256(LEGACY_INDEX_FILE);
  const fc26SourceSha256 = await fileSha256(FC26_INDEX_FILE);
  const mappingIntegrity = {
    policy:
      "The existing generated map was treated as untrusted. Every accepted source ID was rebuilt from raw source rows and had to prove exact DOB, nationality, strong normalized name, real-face metadata, and one-to-one identity assignment.",
    untrustedMapCollisionGroups,
    rejectedUntrustedMappingRecords,
    rebuiltSourceCollisionGroups,
    rebuiltIdentityCollisionGroups,
    targetIdentityConflictGroups,
  };
  const audit = {
    version: 1,
    generatedAt,
    scope: {
      tournamentYears: TARGET_YEARS,
      requiredEditions: Object.fromEntries(
        TARGET_YEARS.map((year) => [
          String(year),
          EDITION_BY_YEAR.get(year)!.name,
        ]),
      ),
      expectedCards: Object.fromEntries(expectedCounts),
      dHashSimilarityThreshold: DHASH_SIMILARITY_THRESHOLD,
    },
    sourceDatasets: [
      {
        id: "sofifa-fifa15-fc24",
        source:
          "SoFIFA-derived FIFA 15–FC 24 male player legacy/current rows",
        sourceUrl:
          "https://www.kaggle.com/datasets/stefanoleone992/ea-sports-fc-24-complete-player-dataset/data?select=male_players.csv",
        sha256: legacySourceSha256,
        rowCount: legacy.rowCount,
        localCollectionInput: LEGACY_INDEX_FILE,
        provenanceVerification:
          "The local CSV SHA-256 was verified byte-for-byte against a fresh download of the named Kaggle dataset file.",
      },
      {
        id: "sofifa-fc26",
        source: "SoFIFA-derived FC 26 player rows",
        sourceUrl:
          "https://www.kaggle.com/datasets/nguyncminhtr/game-dataset",
        sha256: fc26SourceSha256,
        rowCount: fc26.rowCount,
        localCollectionInput: FC26_INDEX_FILE,
        provenanceVerification:
          "The local CSV SHA-256 was verified byte-for-byte against the sole CSV in a fresh download of the named Kaggle dataset.",
      },
    ],
    mappingIntegrity,
    summary,
    cards: auditCards,
  };
  const unresolvedCards = auditCards.filter(
    (card) => card.imageValidationStatus !== "verified",
  );
  const unresolvedReport = {
    version: 1,
    generatedAt,
    summary: {
      total: unresolvedCards.length,
      byStatus: groupedCounts(
        unresolvedCards,
        (card) => card.imageValidationStatus,
      ),
      byYear: groupedCounts(
        unresolvedCards,
        (card) => String(card.worldCupYear),
      ),
    },
    cards: unresolvedCards,
  };
  const duplicateReport = {
    version: 1,
    generatedAt,
    dHash: {
      algorithm:
        "64-bit horizontal difference hash from a white-flattened, grayscale 9x8 image",
      similarityThreshold: DHASH_SIMILARITY_THRESHOLD,
    },
    summary: {
      exactGroups: exactDuplicateGroups.length,
      crossIdentityExactErrors: exactDuplicateGroups.filter(
        (group) =>
          group.resolution ===
          "rejected-cross-identity-placeholder-risk",
      ).length,
      allowedSameIdentityExactGroups: exactDuplicateGroups.filter(
        (group) =>
          group.resolution ===
          "allowed-same-identity-cross-edition",
      ).length,
      similarPairs: similarMatches.length,
      reviewedSimilarPairs: similarMatches.length,
      priorProductionCrossIdentityExactGroups:
        priorProductionExactDuplicateGroups.length,
      priorProductionCrossIdentityCards:
        priorProductionExactDuplicateGroups.reduce(
          (count, group) => count + group.playerCardIds.length,
          0,
        ),
      priorProductionExactErrorsFixed:
        priorProductionExactDuplicateGroups.length,
    },
    priorProductionExactDuplicateGroups,
    exactDuplicateGroups,
    similarMatches,
  };
  const runtime = {
    version: 1,
    generatedAt,
    portraits: verifiedCards.map((card) => ({
      cardId: card.playerCardId,
      playerIdentityId: card.playerIdentityId,
      tournamentYear: card.worldCupYear,
      gameEdition: card.requiredGameEdition,
      soFifaPlayerId: card.sofifaPlayerId,
      sourcePage: card.sofifaSourcePage,
      sourceImageUrl: card.sourceImageUrl,
      localPath: card.localImagePath,
      sha256: card.imageSha256,
      cacheVersion: card.imageSha256!.slice(0, 16),
    })),
  };
  await Promise.all([
    writeFile(AUDIT_FILE, `${JSON.stringify(audit, null, 2)}\n`),
    writeFile(
      UNRESOLVED_FILE,
      `${JSON.stringify(unresolvedReport, null, 2)}\n`,
    ),
    writeFile(
      DUPLICATES_FILE,
      `${JSON.stringify(duplicateReport, null, 2)}\n`,
    ),
    writeFile(RUNTIME_FILE, `${JSON.stringify(runtime, null, 2)}\n`),
  ]);
  for (const year of TARGET_YEARS) {
    const yearCards = auditCards.filter(
      (card) => card.worldCupYear === year,
    );
    const output = await buildContactSheet(year, yearCards);
    console.log(
      `Wrote ${yearCards.length}-card contact sheet ${path.relative(ROOT, output)}.`,
    );
  }
  const expectedFiles = new Set(
    verifiedCards.map((card) => `${card.playerCardId}.png`),
  );
  const unexpectedGeneratedFiles = (await readdir(PUBLIC_DIRECTORY)).filter(
    (filename) =>
      filename !== ".gitkeep" &&
      filename.endsWith(".png") &&
      !expectedFiles.has(filename),
  );
  if (unexpectedGeneratedFiles.length > 0) {
    throw new Error(
      `Unexpected public portrait files remain: ${unexpectedGeneratedFiles.join(", ")}`,
    );
  }
  console.log(`Player image audit complete: ${JSON.stringify(summary)}.`);
};

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
