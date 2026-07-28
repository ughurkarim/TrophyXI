import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import {
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import fbrefPlayerMapJson from "../data/sources/fbref/player-map.json";
import careerArchiveJson from "../src/data/player-career.generated.json";
import completed2026RosterJson from "../src/data/player-tournaments-2026.generated.json";
import tournamentArchiveJson from "../src/data/player-tournaments.generated.json";
import {
  allPlayersBeforeIdentityPruning,
  players,
} from "../src/data/players";
import type {
  PlayerAccolade,
  PlayerTournamentCard,
} from "../src/types/game";

type CsvRow = Record<string, string>;

type CareerArchive = {
  generatedAt: string;
  players: Record<
    string,
    {
      accolades: PlayerAccolade[];
      top100Player: boolean;
      top100Source?: {
        listName: string;
        year?: number;
        note?: string;
        sourceUrl?: string;
      };
    }
  >;
};

type TournamentArchive = {
  source: { name: string; url: string; accessedOn: string };
  identities: Record<
    string,
    Array<{
      playerId: string;
      tournamentYear: number;
      teamCode: string;
      teamName: string;
    }>
  >;
};

type Completed2026Roster = {
  source: { name: string; url: string; accessedOn: string };
  players: Array<{
    identityId: string;
    birthDate: string;
    club: string;
    teamCode: string;
    teamName: string;
  }>;
};

type FbrefMapping = {
  playerIdentityId: string;
  playerName: string;
  fbrefProfileName?: string;
  fbrefId: string;
  sourceUrl: string;
};

type TransfermarktPlayer = {
  playerId: string;
  name: string;
  alternateNames: string[];
  playerCode: string;
  citizenship: string;
  dateOfBirth: string;
  position: string;
  subPosition: string;
  currentClub: string;
  profileUrl: string;
  fbrefId: string | null;
  mappingSource:
    | "dcaribou-transfermarkt-index"
    | "reep-identity-bridge"
    | "reviewed-card-source-override";
};

type TemporalPeriod = {
  raw: string;
  startYear: number;
  endYear: number;
  kind: "season" | "calendar-year";
};

type TemporalEvidence = {
  periods: TemporalPeriod[];
  explicitYears: number[];
  earnedThroughYear: number | null;
};

type ParsedSourceTitle = {
  title: string;
  normalizedTitle: string;
  seasons: Array<{
    raw: string;
    startYear: number;
    endYear: number;
    kind: "season" | "calendar-year";
    context: string | null;
  }>;
};

type FbrefProfileAudit = {
  cachePath: string;
  cacheSha256: string;
  canonicalIdMatches: boolean;
  profileName: string | null;
  fullName: string | null;
  birthDate: string | null;
  nationalTeamCode: string | null;
  position: string | null;
  nameMatches: boolean;
  birthDateMatches: boolean;
  nationalityMatches: boolean;
  identityVerified: boolean;
  honors: string[];
  transfermarktLink: string | null;
  transfermarktPlayerIdFromLink: string | null;
};

type TransfermarktIdentityMatch = {
  status: "matched" | "unresolved" | "ambiguous";
  confidence: "high" | null;
  player: TransfermarktPlayer | null;
  reason: string;
  candidateCount: number;
  evidence: {
    dateOfBirthMatches: boolean;
    normalizedNameMatches: boolean;
    nationalityMatches: boolean;
    positionUsedAsTieBreak: boolean;
    corroboratedByCachedFbrefLink: boolean;
  };
};

type RemovedAccolade = {
  accolade: PlayerAccolade;
  reason:
    | "earned-after-card-cutoff"
    | "same-year-date-unverified-relative-to-world-cup-cutoff"
    | "undated-aggregate-could-not-be-sliced"
    | "unverifiable-source"
    | "non-winning-result"
    | "normalized-duplicate";
  explicitYears: number[];
  earnedThroughYear: number | null;
  detail: string;
};

type CandidateAccolade = {
  accolade: PlayerAccolade;
  periods: TemporalPeriod[];
  verification:
    | "local-source-archive"
    | "cached-fbref-profile"
    | "cached-transfermarkt-achievements"
    | "stored-source-provenance";
  reconstructed: boolean;
};

const ROOT = process.cwd();
const HISTORICAL_PLAYER_SOURCE = path.join(
  ROOT,
  "data",
  "sources",
  "fjelstul-world-cup",
  "players.csv",
);
const FBREF_PROFILE_CACHE = path.join(
  ROOT,
  "scripts",
  "cache",
  "historical-portraits",
);
const TRANSFERMARKT_CACHE = path.join(
  ROOT,
  "scripts",
  "cache",
  "step1-transfermarkt-accolades",
);
const GENERATED_OUTPUT = path.join(
  ROOT,
  "src",
  "data",
  "player-accolades-by-card.generated.json",
);
const REPORT_OUTPUT = path.join(
  ROOT,
  "reports",
  "step1-player-accolade-audit.json",
);
const DEFAULT_TRANSFERMARKT_INDEX =
  "/tmp/trophyxi-transfermarkt-players.csv.gz";
const DEFAULT_REEP_INDEX = "/tmp/trophyxi-reep-people.csv";
const TRANSFERMARKT_INDEX_SOURCE =
  "https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data/players.csv.gz";
const TRANSFERMARKT_DATASET_SOURCE =
  "https://github.com/dcaribou/transfermarkt-datasets";
const REEP_SOURCE = "https://github.com/withqwerty/reep";
const FIFA_2026_FINAL_REPORT =
  "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/spain-argentina-final-report-highlights";
const FIFA_2026_AWARDS =
  "https://www.fifa.com/fr/tournaments/mens/worldcup/canadamexicousa2026/articles/recompenses-coupe-du-monde-2026-rodri-kylian-mbappe-pau-cubarsi-unai-simon";

const WORLD_CUP_CUTOFF_BY_YEAR: Record<number, string> = {
  1970: "1970-06-21",
  1974: "1974-07-07",
  1978: "1978-06-25",
  1982: "1982-07-11",
  1986: "1986-06-29",
  1990: "1990-07-08",
  1994: "1994-07-17",
  1998: "1998-07-12",
  2002: "2002-06-30",
  2006: "2006-07-09",
  2010: "2010-07-11",
  2014: "2014-07-13",
  2018: "2018-07-15",
  2022: "2022-12-18",
  2026: "2026-07-19",
};

const MONTH_BY_NAME: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

const countryAliasesByCode: Record<string, string[]> = {
  BIH: ["bosnia herzegovina", "bosnia and herzegovina"],
  CIV: ["cote divoire", "ivory coast"],
  COD: ["dr congo", "democratic republic of the congo", "zaire"],
  CPV: ["cape verde", "cabo verde"],
  CSK: ["czech republic", "czechia", "slovakia"],
  CUW: ["curacao"],
  DDR: ["germany", "east germany"],
  ENG: ["england"],
  GER: ["germany", "west germany"],
  HAI: ["haiti"],
  IRL: ["ireland", "republic of ireland"],
  IRN: ["iran"],
  KOR: ["south korea", "korea south", "republic of korea"],
  NED: ["netherlands", "holland"],
  NIR: ["northern ireland"],
  NZL: ["new zealand"],
  SCG: ["serbia", "montenegro", "serbia and montenegro"],
  SCO: ["scotland"],
  SUN: [
    "soviet union",
    "russia",
    "ukraine",
    "belarus",
    "georgia",
    "armenia",
    "azerbaijan",
    "kazakhstan",
    "uzbekistan",
    "kyrgyzstan",
    "tajikistan",
    "turkmenistan",
    "moldova",
    "latvia",
    "lithuania",
    "estonia",
  ],
  UAE: ["united arab emirates"],
  USA: ["united states", "united states of america"],
  WAL: ["wales"],
  YUG: [
    "yugoslavia",
    "serbia",
    "croatia",
    "bosnia and herzegovina",
    "bosnia herzegovina",
    "slovenia",
    "montenegro",
    "north macedonia",
    "macedonia",
    "kosovo",
  ],
};

const careerArchive = careerArchiveJson as unknown as CareerArchive;
const tournamentArchive =
  tournamentArchiveJson as unknown as TournamentArchive;
const completed2026Roster =
  completed2026RosterJson as unknown as Completed2026Roster;
const fbrefMappings = fbrefPlayerMapJson as FbrefMapping[];
const fbrefByIdentity = new Map(
  fbrefMappings.map((mapping) => [mapping.playerIdentityId, mapping]),
);
const playableCardIds = new Set(players.map((player) => player.id));

/**
 * These source rows cannot safely follow the repository's identity key.
 *
 * `jurrien-timber` joins twin brothers across editions: Jurriën in 2022 and
 * Quinten in 2026. Hussein Abdulghani's joined archive rows carry conflicting
 * dates of birth. Accolade evidence for these records must therefore remain
 * card-specific (or be rejected) instead of inheriting an identity-wide ID.
 */
const CARD_SOURCE_OVERRIDES: Record<
  string,
  {
    sourcePlayerName: string;
    dateOfBirth: string;
    fbref: { playerId: string; sourceUrl: string };
    transfermarkt: {
      playerId: string;
      playerCode: string;
      citizenship: string;
      position: string;
    };
    reason: string;
  }
> = {
  "jurrien-timber-2022": {
    sourcePlayerName: "Jurriën Timber",
    dateOfBirth: "2001-06-17",
    fbref: {
      playerId: "41034650",
      sourceUrl:
        "https://fbref.com/en/players/41034650/Jurrien-Timber",
    },
    transfermarkt: {
      playerId: "420243",
      playerCode: "jurrien-timber",
      citizenship: "Netherlands",
      position: "Defender",
    },
    reason:
      "Reviewed card-specific exception: the shared archive identity joins twin brothers; this 2022 card is Jurriën Timber.",
  },
  "jurrien-timber-2026": {
    sourcePlayerName: "Quinten Timber",
    dateOfBirth: "2001-06-17",
    fbref: {
      playerId: "803e7aca",
      sourceUrl:
        "https://fbref.com/en/players/803e7aca/Quinten-Timber",
    },
    transfermarkt: {
      playerId: "420213",
      playerCode: "quinten-timber",
      citizenship: "Netherlands",
      position: "Midfield",
    },
    reason:
      "Reviewed card-specific exception: the shared archive identity joins twin brothers; this 2026 card is Quinten Timber.",
  },
};

const REJECT_IDENTITY_WIDE_SOURCES = new Map<string, string>([
  [
    "hussein-abdulghani",
    "The joined historical source rows disagree on date of birth (1977-01-23 for 1998; 1977-01-21 for 2002/2006), so no global FBref or Transfermarkt identity is assigned.",
  ],
]);

const decodeHtml = (value: string) =>
  value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&rsquo;/gi, "’")
    .replace(/&ndash;|&#8211;/gi, "–")
    .replace(/&mdash;|&#8212;/gi, "—")
    .replace(/&frac12;/gi, "½")
    .replace(/&#(\d+);/g, (_, value: string) =>
      String.fromCodePoint(Number(value)),
    )
    .replace(/&#x([a-f0-9]+);/gi, (_, value: string) =>
      String.fromCodePoint(Number.parseInt(value, 16)),
    );

const stripHtml = (value: string) =>
  decodeHtml(value.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();

const normalizeText = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[’']/g, "")
    .toLocaleLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

const normalizeName = (value: string) => normalizeText(value);
const normalizeManifestName = (value: string) =>
  normalizeText(
    value
      .replace(/[øØ]/g, "o")
      .replace(/[łŁ]/g, "l")
      .replace(/[đĐðÐ]/g, "d")
      .replace(/[þÞ]/g, "th")
      .replace(/ß/g, "ss"),
  );
const nameSignature = (value: string) =>
  normalizeName(value).split(" ").filter(Boolean).sort().join(" ");
const slugify = (value: string) =>
  normalizeText(value).replace(/\s+/g, "-") || "player";

const sha256 = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");

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

const parseBornDate = (html: string) => {
  const match = html.match(
    /<strong>Born:<\/strong>[\s\S]*?<span>\s*([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})\s*<\/span>/i,
  );
  if (!match) return null;
  const month = MONTH_BY_NAME[match[1].toLocaleLowerCase()];
  if (!month) return null;
  return `${match[3]}-${String(month).padStart(2, "0")}-${match[2].padStart(2, "0")}`;
};

const positionFamilyForCard = (position: PlayerTournamentCard["primaryPosition"]) => {
  if (position === "GK") return "goalkeeper";
  if (["LB", "LCB", "CB", "RCB", "RB", "LWB", "RWB"].includes(position)) {
    return "defender";
  }
  if (["DM", "CM", "AM", "LM", "RM"].includes(position)) {
    return "midfield";
  }
  return "attack";
};

const positionFamilyForTransfermarkt = (position: string) => {
  const normalized = normalizeText(position);
  if (normalized.includes("goalkeeper")) return "goalkeeper";
  if (normalized.includes("defender")) return "defender";
  if (normalized.includes("midfield")) return "midfield";
  if (normalized.includes("attack")) return "attack";
  return null;
};

const countryMatches = (
  cards: PlayerTournamentCard[],
  citizenship: string,
) => {
  const normalizedCitizenship = normalizeText(citizenship);
  return cards.some((card) => {
    const aliases = new Set([
      normalizeText(card.countryName),
      ...(countryAliasesByCode[card.countryCode] ?? []).map(normalizeText),
    ]);
    return aliases.has(normalizedCitizenship);
  });
};

const nationalityCodeMatches = (
  cards: PlayerTournamentCard[],
  fbrefCode: string | null,
) => {
  if (!fbrefCode) return false;
  const normalized = fbrefCode.toLocaleUpperCase();
  return cards.some((card) => {
    if (card.countryCode === normalized) return true;
    if (card.countryCode === "GER" && ["FRG", "DDR"].includes(normalized)) {
      return true;
    }
    if (card.countryCode === "CSK" && ["CZE", "SVK"].includes(normalized)) {
      return true;
    }
    if (
      ["YUG", "SCG"].includes(card.countryCode) &&
      ["SRB", "CRO", "BIH", "SVN", "MNE", "MKD", "KOS"].includes(normalized)
    ) {
      return true;
    }
    if (
      card.countryCode === "SUN" &&
      [
        "RUS",
        "UKR",
        "BLR",
        "GEO",
        "ARM",
        "AZE",
        "KAZ",
        "UZB",
        "KGZ",
        "TJK",
        "TKM",
        "MDA",
        "LVA",
        "LTU",
        "EST",
      ].includes(normalized)
    ) {
      return true;
    }
    return false;
  });
};

const parseFbrefProfile = async (
  mapping: FbrefMapping,
  cards: PlayerTournamentCard[],
  dateOfBirth: string | null,
): Promise<FbrefProfileAudit | null> => {
  const cacheFile = path.join(
    FBREF_PROFILE_CACHE,
    `${mapping.fbrefId}-profile.html`,
  );
  if (!existsSync(cacheFile)) return null;
  const html = await readFile(cacheFile, "utf8");
  const canonicalId =
    html.match(
      /<link rel="canonical" href="https:\/\/fbref\.com\/en\/players\/([a-f0-9]{8})\//i,
    )?.[1] ?? null;
  const profileName =
    stripHtml(
      html.match(/<div id="meta">[\s\S]*?<h1>[\s\S]*?<span>([\s\S]*?)<\/span>/i)?.[1] ??
        "",
    ) || null;
  const fullName =
    stripHtml(
      html.match(
        /<div id="meta">[\s\S]*?<\/h1>\s*<p><strong>([\s\S]*?)<\/strong><\/p>/i,
      )?.[1] ?? "",
    ) || null;
  const profileBirthDate = parseBornDate(html);
  const nationalTeamCode =
    html.match(
      /<strong>National Team:<\/strong>[\s\S]*?\/en\/country\/([A-Z]{3})\//i,
    )?.[1] ?? null;
  const position =
    stripHtml(
      html.match(/<p><strong>Position:<\/strong>\s*([\s\S]*?)<\/p>/i)?.[1] ??
        "",
    ) || null;
  const acceptedNames = [
    profileName,
    fullName,
    mapping.fbrefProfileName,
    mapping.playerName,
  ].filter((value): value is string => Boolean(value));
  const localNames = [...new Set(cards.map((card) => card.playerName))];
  const nameMatches = localNames.some((localName) =>
    acceptedNames.some(
      (sourceName) =>
        normalizeName(sourceName) === normalizeName(localName) ||
        nameSignature(sourceName) === nameSignature(localName),
    ),
  );
  const birthDateMatches =
    Boolean(dateOfBirth) && profileBirthDate === dateOfBirth;
  const nationalityMatches = nationalityCodeMatches(cards, nationalTeamCode);
  const bling =
    html.match(/<ul id="bling">([\s\S]*?)<\/ul>/i)?.[1] ?? "";
  const honors = [
    ...bling.matchAll(/data-tip="([^"]+)"/gi),
  ].map((match) => decodeHtml(match[1]).trim());
  const transfermarktLink =
    html.match(
      /href="(https:\/\/www\.transfermarkt\.com\/[^"]+\/profil\/spieler\/(\d+))"/i,
    )?.[1] ?? null;
  const transfermarktPlayerIdFromLink =
    transfermarktLink?.match(/\/spieler\/(\d+)/)?.[1] ?? null;

  return {
    cachePath: path.relative(ROOT, cacheFile),
    cacheSha256: sha256(html),
    canonicalIdMatches:
      canonicalId?.toLocaleLowerCase() === mapping.fbrefId.toLocaleLowerCase(),
    profileName,
    fullName,
    birthDate: profileBirthDate,
    nationalTeamCode,
    position,
    nameMatches,
    birthDateMatches,
    nationalityMatches,
    identityVerified:
      canonicalId?.toLocaleLowerCase() ===
        mapping.fbrefId.toLocaleLowerCase() &&
      nameMatches &&
      birthDateMatches &&
      nationalityMatches,
    honors,
    transfermarktLink,
    transfermarktPlayerIdFromLink,
  };
};

const parseShortSeason = (first: number, second: number) => {
  const startYear = first >= 70 ? 1900 + first : 2000 + first;
  let endYear = second >= 70 ? 1900 + second : 2000 + second;
  if (endYear < startYear) endYear += 100;
  return { startYear, endYear };
};

const parseTemporalValue = (rawValue: string): TemporalPeriod | null => {
  const raw = rawValue.trim();
  let match = raw.match(/\b((?:19|20)\d{2})[-/](\d{4})\b/);
  if (match) {
    return {
      raw,
      startYear: Number(match[1]),
      endYear: Number(match[2]),
      kind: "season",
    };
  }
  match = raw.match(/\b((?:19|20)\d{2})[-/](\d{2})\b/);
  if (match) {
    const startYear = Number(match[1]);
    const century = Math.floor(startYear / 100) * 100;
    let endYear = century + Number(match[2]);
    if (endYear < startYear) endYear += 100;
    return { raw, startYear, endYear, kind: "season" };
  }
  match = raw.match(/\b(\d{2})[-/](\d{2})\b/);
  if (match) {
    const { startYear, endYear } = parseShortSeason(
      Number(match[1]),
      Number(match[2]),
    );
    return { raw, startYear, endYear, kind: "season" };
  }
  match = raw.match(/\b((?:19|20)\d{2})\b/);
  if (match) {
    const year = Number(match[1]);
    return {
      raw,
      startYear: year,
      endYear: year,
      kind: "calendar-year",
    };
  }
  return null;
};

const temporalEvidenceFor = (value: string): TemporalEvidence => {
  const periods: TemporalPeriod[] = [];
  const occupied = new Set<number>();
  const seasonPattern =
    /\b((?:19|20)\d{2})[-/](?:(?:19|20)\d{2}|\d{2})\b/g;
  for (const match of value.matchAll(seasonPattern)) {
    const parsed = parseTemporalValue(match[0]);
    if (parsed) periods.push(parsed);
    for (
      let index = match.index ?? 0;
      index < (match.index ?? 0) + match[0].length;
      index += 1
    ) {
      occupied.add(index);
    }
  }
  const yearPattern = /\b(?:19|20)\d{2}\b/g;
  for (const match of value.matchAll(yearPattern)) {
    const index = match.index ?? 0;
    if (occupied.has(index)) continue;
    const year = Number(match[0]);
    periods.push({
      raw: match[0],
      startYear: year,
      endYear: year,
      kind: "calendar-year",
    });
  }
  const unique = [
    ...new Map(
      periods.map((period) => [
        `${period.raw}:${period.startYear}:${period.endYear}:${period.kind}`,
        period,
      ]),
    ).values(),
  ];
  const explicitYears = [
    ...new Set(
      unique.flatMap((period) => [period.startYear, period.endYear]),
    ),
  ].sort((first, second) => first - second);
  return {
    periods: unique,
    explicitYears,
    earnedThroughYear:
      unique.length > 0
        ? Math.max(...unique.map((period) => period.endYear))
        : null,
  };
};

const isWorldCupTournamentAccolade = (
  accolade: PlayerAccolade,
  year: number,
) => {
  const value = normalizeText(
    `${accolade.label} ${accolade.description ?? ""}`,
  );
  return (
    value.includes("world cup") &&
    value.includes(String(year)) &&
    /winner|champion|runner up|golden|silver|bronze|young player|all star/.test(
      value,
    )
  );
};

const temporalDecision = (
  accolade: PlayerAccolade,
  periods: TemporalPeriod[],
  cardYear: number,
):
  | { result: "include" }
  | {
      result: "exclude";
      reason:
        | "earned-after-card-cutoff"
        | "same-year-date-unverified-relative-to-world-cup-cutoff";
      detail: string;
    } => {
  const after = periods.filter((period) => period.endYear > cardYear);
  if (after.length > 0) {
    return {
      result: "exclude",
      reason: "earned-after-card-cutoff",
      detail: `Temporal evidence ends in ${Math.max(...after.map((period) => period.endYear))}, after the ${cardYear} card cutoff.`,
    };
  }
  const ambiguousSameYear = periods.filter(
    (period) =>
      period.endYear === cardYear &&
      period.kind === "calendar-year" &&
      !isWorldCupTournamentAccolade(accolade, cardYear),
  );
  if (ambiguousSameYear.length > 0) {
    return {
      result: "exclude",
      reason: "same-year-date-unverified-relative-to-world-cup-cutoff",
      detail: `The source supplies only calendar year ${cardYear}, not a date proving the honor preceded the World Cup cutoff.`,
    };
  }
  return { result: "include" };
};

const normalizeHonorTitle = (value: string) =>
  normalizeText(value)
    .replace(/^\d+\s*x\s+/, "")
    .replace(
      /^(?:(?:19|20)\d{2}(?:[-/](?:(?:19|20)\d{2}|\d{2}))?)\s+/,
      "",
    )
    .replace(/\bwinner ballon dor\b/g, "ballon dor")
    .replace(
      /\buefa champions league (?:winner|champion)\b/g,
      "champions league champion",
    )
    .replace(
      /\bchampions league winner\b/g,
      "champions league champion",
    )
    .replace(
      /\b(?:fifa )?world cup winner\b/g,
      "world cup champion",
    )
    .replace(
      /\bgolden boot winner europe\b/g,
      "european golden shoe",
    )
    .replace(/\s+/g, " ")
    .trim();

const honorFamily = (
  value: string,
  category?: PlayerAccolade["category"],
) => {
  const title = normalizeText(value);
  if (title.includes("world cup") && title.includes("golden ball")) {
    return "world-cup-golden-ball";
  }
  if (title.includes("world cup") && title.includes("golden boot")) {
    return "world-cup-golden-boot";
  }
  if (title.includes("world cup") && title.includes("golden glove")) {
    return "world-cup-golden-glove";
  }
  if (title.includes("world cup") && title.includes("silver boot")) {
    return "world-cup-silver-boot";
  }
  if (title.includes("world cup") && title.includes("bronze boot")) {
    return "world-cup-bronze-boot";
  }
  if (title.includes("world cup") && title.includes("silver ball")) {
    return "world-cup-silver-ball";
  }
  if (title.includes("world cup") && title.includes("bronze ball")) {
    return "world-cup-bronze-ball";
  }
  if (title.includes("world cup") && title.includes("young player")) {
    return "world-cup-young-player";
  }
  if (
    title.includes("world cup") &&
    !title.includes("club world cup") &&
    /winner|champion/.test(title)
  ) {
    return "world-cup-winner";
  }
  if (title.includes("champions league")) return "champions-league";
  if (title.includes("ballon dor")) return "ballon-dor";
  if (
    title.includes("european golden shoe") ||
    title.includes("golden boot winner europe")
  ) {
    return "european-golden-shoe";
  }
  if (title.includes("copa america") && /winner|champion/.test(title)) {
    return "copa-america";
  }
  if (
    title.includes("world cup") &&
    title.includes("all star")
  ) {
    return "world-cup-all-star";
  }
  if (title.includes("fifpro") && title.includes("world xi")) {
    return "fifpro-world-xi";
  }
  if (title.includes("uefa") && title.includes("team of the year")) {
    return "uefa-team-of-year";
  }
  if (title.includes("domestic league")) return "domestic-league";
  if (
    category === "domestic-league" &&
    !title.includes("player") &&
    !title.includes("footballer")
  ) {
    return "domestic-league";
  }
  if (
    /english champion|spanish champion|italian champion|german champion|french champion|dutch champion|portuguese champion|turkish champion|russian champion|ukrainian champion|belgian champion|greek champion|croatian champion|swiss champion|saudi arabian champion|mls cup champion/.test(
      title,
    )
  ) {
    return "domestic-league";
  }
  if (title.includes("domestic cup")) return "domestic-cup";
  if (category === "domestic-cup") return "domestic-cup";
  if (
    title.includes("cup winner") &&
    !/super cup|supercup|leagues cup|world cup|club world cup|european cup|uefa cup|champions league|copa america|africa cup|asian cup|gold cup|cup of champions/.test(
      title,
    )
  ) {
    return "domestic-cup";
  }
  return null;
};

const tokenSimilarity = (first: string, second: string) => {
  const firstTokens = new Set(normalizeHonorTitle(first).split(" ").filter(Boolean));
  const secondTokens = new Set(
    normalizeHonorTitle(second).split(" ").filter(Boolean),
  );
  if (firstTokens.size === 0 || secondTokens.size === 0) return 0;
  const intersection = [...firstTokens].filter((token) =>
    secondTokens.has(token),
  ).length;
  return intersection / Math.max(firstTokens.size, secondTokens.size);
};

const specificDomesticLeagueSourceTitles = (
  accolade: PlayerAccolade,
): Set<string> | null => {
  if (accolade.category !== "domestic-league") return null;
  const value = normalizeText(`${accolade.id} ${accolade.label}`);
  if (
    accolade.id === "domestic-league-champion" ||
    normalizeText(accolade.label) === "domestic league champion"
  ) {
    return null;
  }
  const mappings: Array<[RegExp, string[]]> = [
    [/\brussian premier league champion\b/, ["russian champion"]],
    [/\bscottish premier league champion\b/, ["scottish champion"]],
    [/\bpremier league champion\b/, ["english champion"]],
    [/\bbundesliga champion\b/, ["german champion"]],
    [/\bserie a champion\b/, ["italian champion"]],
    [/\bla liga champion\b/, ["spanish champion"]],
    [/\bprimeira liga champion\b/, ["portuguese champion"]],
    [/\bcroatian football league champion\b/, ["croatian champion"]],
    [/\bswiss super league champion\b/, ["swiss champion"]],
    [/\bsuper league greece champion\b/, ["greek champion"]],
    [/\bsaudi pro league champion\b/, ["saudi arabian champion"]],
    [/\bmajor league soccer champion\b/, ["mls cup champion"]],
  ];
  for (const [pattern, titles] of mappings) {
    if (pattern.test(value)) return new Set(titles);
  }
  return null;
};

const parsedTitleMatchesAccolade = (
  title: ParsedSourceTitle,
  accolade: PlayerAccolade,
) => {
  const description = normalizeText(accolade.description ?? "");
  const sourceTitle = normalizeText(title.title);
  if (
    description.includes("copa del rey") &&
    sourceTitle !== "spanish cup winner"
  ) {
    return false;
  }
  if (
    description.includes("spanish league") &&
    sourceTitle !== "spanish champion"
  ) {
    return false;
  }
  const specificDomesticLeagueTitles =
    specificDomesticLeagueSourceTitles(accolade);
  if (specificDomesticLeagueTitles) {
    return specificDomesticLeagueTitles.has(sourceTitle);
  }
  const accoladeFamily = honorFamily(accolade.label, accolade.category);
  const titleFamily = honorFamily(title.title);
  if (accoladeFamily && titleFamily && accoladeFamily === titleFamily) {
    return true;
  }
  const normalizedAccolade = normalizeHonorTitle(accolade.label);
  const normalizedTitle = normalizeHonorTitle(title.title);
  if (
    normalizedAccolade === normalizedTitle
  ) {
    return true;
  }
  return false;
};

const parseTransfermarktTitles = (html: string): ParsedSourceTitle[] => {
  const titles: ParsedSourceTitle[] = [];
  const blockPattern =
    /<div class="box">\s*<h2 class="content-box-headline">([\s\S]*?)<\/h2>[\s\S]*?<div class="erfolg_info_box">[\s\S]*?<table class="auflistung">([\s\S]*?)<\/table>/gi;
  for (const block of html.matchAll(blockPattern)) {
    const title = stripHtml(block[1]).replace(/^\d+x\s+/i, "").trim();
    if (!title) continue;
    const seasons: ParsedSourceTitle["seasons"] = [];
    for (const row of block[2].matchAll(/<tr>([\s\S]*?)<\/tr>/gi)) {
      const rawSeason = stripHtml(
        row[1].match(
          /<td class="erfolg_table_saison[^"]*">([\s\S]*?)<\/td>/i,
        )?.[1] ?? "",
      );
      const parsed = parseTemporalValue(rawSeason);
      if (!parsed) continue;
      const contextCells = [
        ...row[1].matchAll(
          /<td class="no-border-links">([\s\S]*?)<\/td>/gi,
        ),
      ];
      seasons.push({
        ...parsed,
        context:
          contextCells.length > 0
            ? stripHtml(contextCells.at(-1)?.[1] ?? "") || null
            : null,
      });
    }
    titles.push({
      title,
      normalizedTitle: normalizeHonorTitle(title),
      seasons,
    });
  }
  return titles;
};

const buildTransfermarktPlayers = async (indexPath: string) => {
  if (!existsSync(indexPath)) return [];
  const compressed = await readFile(indexPath);
  return parseCsv(gunzipSync(compressed).toString("utf8")).map(
    (row): TransfermarktPlayer => ({
      playerId: row.player_id,
      name: row.name,
      alternateNames: [
        row.name,
        `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim(),
      ].filter(Boolean),
      playerCode: row.player_code,
      citizenship: row.country_of_citizenship,
      dateOfBirth: row.date_of_birth.slice(0, 10),
      position: row.position,
      subPosition: row.sub_position,
      currentClub: row.current_club_name,
      profileUrl: row.url,
      fbrefId: null,
      mappingSource: "dcaribou-transfermarkt-index",
    }),
  );
};

const buildReepTransfermarktPlayers = async (indexPath: string) => {
  if (!existsSync(indexPath)) return [];
  return parseCsv(await readFile(indexPath, "utf8"))
    .filter(
      (row) =>
        row.type === "player" &&
        /^\d+$/.test(row.key_transfermarkt) &&
        /^\d{4}-\d{2}-\d{2}$/.test(row.date_of_birth),
    )
    .map((row): TransfermarktPlayer => {
      const name = row.name || row.full_name;
      const position = normalizeText(row.position);
      const transfermarktPosition = position.includes("goalkeeper")
        ? "Goalkeeper"
        : position.includes("defender")
          ? "Defender"
          : position.includes("midfield")
            ? "Midfield"
            : position.includes("forward") || position.includes("attack")
              ? "Attack"
              : "";
      return {
        playerId: row.key_transfermarkt,
        name,
        alternateNames: [row.name, row.full_name].filter(Boolean),
        playerCode: slugify(name),
        citizenship: row.nationality,
        dateOfBirth: row.date_of_birth,
        position: transfermarktPosition,
        subPosition: row.position_detail,
        currentClub: "",
        profileUrl: `https://www.transfermarkt.com/${slugify(name)}/profil/spieler/${row.key_transfermarkt}`,
        fbrefId: /^[a-f0-9]{8}$/i.test(row.key_fbref)
          ? row.key_fbref.toLocaleLowerCase()
          : null,
        mappingSource: "reep-identity-bridge",
      };
    });
};

const matchTransfermarktIdentity = (
  cards: PlayerTournamentCard[],
  dateOfBirth: string | null,
  candidatesByBirthDate: Map<string, TransfermarktPlayer[]>,
  fbrefAudit: FbrefProfileAudit | null,
): TransfermarktIdentityMatch => {
  if (!dateOfBirth) {
    return {
      status: "unresolved",
      confidence: null,
      player: null,
      reason: "No local date of birth is available for deterministic matching.",
      candidateCount: 0,
      evidence: {
        dateOfBirthMatches: false,
        normalizedNameMatches: false,
        nationalityMatches: false,
        positionUsedAsTieBreak: false,
        corroboratedByCachedFbrefLink: false,
      },
    };
  }
  const localNames = [...new Set(cards.map((card) => card.playerName))];
  const dateCandidates = candidatesByBirthDate.get(dateOfBirth) ?? [];
  const nameCandidates = dateCandidates.filter((candidate) =>
    candidate.alternateNames.some((sourceName) =>
      localNames.some(
        (localName) =>
          normalizeName(sourceName) === normalizeName(localName) ||
          nameSignature(sourceName) === nameSignature(localName),
      ),
    ),
  );
  let nationalityCandidates = nameCandidates.filter((candidate) =>
    countryMatches(cards, candidate.citizenship),
  );
  const fbrefTransfermarktId =
    fbrefAudit?.identityVerified === true
      ? fbrefAudit.transfermarktPlayerIdFromLink
      : null;
  if (
    nationalityCandidates.length === 0 &&
    fbrefTransfermarktId &&
    nameCandidates.some(
      (candidate) => candidate.playerId === fbrefTransfermarktId,
    )
  ) {
    nationalityCandidates = nameCandidates.filter(
      (candidate) => candidate.playerId === fbrefTransfermarktId,
    );
  }
  let finalists = nationalityCandidates;
  let positionUsedAsTieBreak = false;
  if (finalists.length > 1) {
    const cardFamilies = new Set(cards.map((card) =>
      positionFamilyForCard(card.primaryPosition),
    ));
    const positionMatches = finalists.filter((candidate) => {
      const family = positionFamilyForTransfermarkt(candidate.position);
      return family ? cardFamilies.has(family) : false;
    });
    if (positionMatches.length > 0) {
      finalists = positionMatches;
      positionUsedAsTieBreak = true;
    }
  }
  if (finalists.length !== 1) {
    return {
      status: finalists.length > 1 ? "ambiguous" : "unresolved",
      confidence: null,
      player: null,
      reason:
        finalists.length > 1
          ? "Multiple Transfermarkt rows remain after date-of-birth, normalized-name, nationality, and position checks."
          : "No Transfermarkt row passed date-of-birth, normalized-name, and nationality/context checks.",
      candidateCount: finalists.length,
      evidence: {
        dateOfBirthMatches: dateCandidates.length > 0,
        normalizedNameMatches: nameCandidates.length > 0,
        nationalityMatches: nationalityCandidates.length > 0,
        positionUsedAsTieBreak,
        corroboratedByCachedFbrefLink: false,
      },
    };
  }
  const matched = finalists[0];
  const mappedFbrefId = fbrefByIdentity.get(cards[0].playerIdentityId)?.fbrefId
    ?.toLocaleLowerCase();
  const nationalityMatches = countryMatches(cards, matched.citizenship);
  const corroboratedByCachedFbrefLink =
    fbrefTransfermarktId === matched.playerId ||
    (Boolean(mappedFbrefId) && matched.fbrefId === mappedFbrefId);
  return {
    status: "matched",
    confidence: "high",
    player: matched,
    reason:
      nationalityMatches
        ? "Unique match on date of birth, normalized full-name/token signature, and nationality/context."
        : "Unique date-of-birth/name match corroborated by the exact Transfermarkt ID linked from the identity-verified cached FBref profile; the source citizenship differs from the tournament nationality context.",
    candidateCount: 1,
    evidence: {
      dateOfBirthMatches: true,
      normalizedNameMatches: true,
      nationalityMatches,
      positionUsedAsTieBreak,
      corroboratedByCachedFbrefLink,
    },
  };
};

const reviewedCardTransfermarktMatch = (
  override: (typeof CARD_SOURCE_OVERRIDES)[string],
  playersById: Map<string, TransfermarktPlayer>,
): TransfermarktIdentityMatch => {
  const indexed = playersById.get(override.transfermarkt.playerId);
  const player: TransfermarktPlayer =
    indexed ??
    {
      playerId: override.transfermarkt.playerId,
      name: override.sourcePlayerName,
      alternateNames: [override.sourcePlayerName],
      playerCode: override.transfermarkt.playerCode,
      citizenship: override.transfermarkt.citizenship,
      dateOfBirth: override.dateOfBirth,
      position: override.transfermarkt.position,
      subPosition: "",
      currentClub: "",
      profileUrl: `https://www.transfermarkt.com/${override.transfermarkt.playerCode}/profil/spieler/${override.transfermarkt.playerId}`,
      fbrefId: override.fbref.playerId,
      mappingSource: "reviewed-card-source-override",
    };
  if (
    player.playerId !== override.transfermarkt.playerId ||
    player.dateOfBirth !== override.dateOfBirth
  ) {
    throw new Error(
      `Reviewed card override ${override.sourcePlayerName} does not match Transfermarkt index row ${override.transfermarkt.playerId}.`,
    );
  }
  return {
    status: "matched",
    confidence: "high",
    player,
    reason: override.reason,
    candidateCount: 1,
    evidence: {
      dateOfBirthMatches: true,
      normalizedNameMatches: true,
      nationalityMatches: true,
      positionUsedAsTieBreak: false,
      corroboratedByCachedFbrefLink:
        player.fbrefId === override.fbref.playerId,
    },
  };
};

const transfermarktAchievementsUrl = (player: TransfermarktPlayer) =>
  `https://www.transfermarkt.com/${player.playerCode}/erfolge/spieler/${player.playerId}`;

const fetchTransfermarktPage = async (
  player: TransfermarktPlayer,
  requestDelayMs: number,
  requestState: { nextRequestAt: number },
) => {
  const cacheFile = path.join(TRANSFERMARKT_CACHE, `${player.playerId}.html`);
  if (existsSync(cacheFile)) return cacheFile;
  const delay = Math.max(0, requestState.nextRequestAt - Date.now());
  if (delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  requestState.nextRequestAt = Date.now() + requestDelayMs;
  const url = transfermarktAchievementsUrl(player);
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9",
          "User-Agent":
            "Mozilla/5.0 (compatible; TrophyXI/1.0; player accolade data audit)",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) {
        throw new Error(`Transfermarkt returned HTTP ${response.status}`);
      }
      const html = await response.text();
      const canonicalId =
        html.match(
          /<link rel="canonical" href="https:\/\/www\.transfermarkt\.com\/[^"]+\/erfolge\/spieler\/(\d+)"/i,
        )?.[1] ?? null;
      if (canonicalId !== player.playerId) {
        throw new Error(
          `Transfermarkt canonical identity ${canonicalId ?? "missing"} does not match ${player.playerId}`,
        );
      }
      await writeFile(cacheFile, html);
      return cacheFile;
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 750 * 2 ** attempt));
      }
    }
  }
  throw lastError;
};

const sourcePriority = (candidate: CandidateAccolade) => {
  if (candidate.verification === "local-source-archive") return 4;
  if (candidate.verification === "cached-transfermarkt-achievements") return 3;
  if (candidate.verification === "cached-fbref-profile") return 2;
  return 1;
};

const periodKey = (period: TemporalPeriod) =>
  `${period.startYear}-${period.endYear}`;

const accoladeFamilyKey = (accolade: PlayerAccolade) =>
  honorFamily(
    `${accolade.label} ${accolade.description ?? ""}`,
    accolade.category,
  ) ??
  normalizeHonorTitle(accolade.label);

const deduplicateCandidates = (
  candidates: CandidateAccolade[],
  removed: RemovedAccolade[],
) => {
  const sorted = [...candidates].sort(
    (first, second) =>
      sourcePriority(second) - sourcePriority(first) ||
      Number(second.reconstructed) - Number(first.reconstructed) ||
      first.accolade.id.localeCompare(second.accolade.id),
  );
  const retained: CandidateAccolade[] = [];
  for (const candidate of sorted) {
    const family = accoladeFamilyKey(candidate.accolade);
    const candidatePeriods = new Set(candidate.periods.map(periodKey));
    const sameFamily = retained.filter(
      (existing) => accoladeFamilyKey(existing.accolade) === family,
    );
    const coveredPeriods = new Set(
      sameFamily.flatMap((existing) => existing.periods.map(periodKey)),
    );
    const duplicate =
      candidatePeriods.size > 0 &&
      [...candidatePeriods].every((period) => coveredPeriods.has(period))
        ? sameFamily[0]
        : undefined;
    if (!duplicate) {
      retained.push(candidate);
      continue;
    }
    const temporal = temporalEvidenceFor(
      `${candidate.accolade.label} ${candidate.accolade.description ?? ""}`,
    );
    removed.push({
      accolade: candidate.accolade,
      reason: "normalized-duplicate",
      explicitYears: temporal.explicitYears,
      earnedThroughYear: temporal.earnedThroughYear,
      detail: `Duplicates ${duplicate.accolade.id} after competition-name and season normalization.`,
    });
  }
  return retained.sort((first, second) =>
    first.accolade.id.localeCompare(second.accolade.id),
  );
};

const sourceIsLocalArchive = (sourceName: string) =>
  [
    "World Cup archive",
    "The Fjelstul World Cup Database",
    "Completed 2026 archive",
  ].includes(sourceName);

const resourcedCompleted2026Accolade = (
  accolade: PlayerAccolade,
): PlayerAccolade => {
  if (accolade.sourceName !== "Completed 2026 archive") return accolade;
  const value = normalizeText(`${accolade.label} ${accolade.description ?? ""}`);
  if (value.includes("world cup") && /winner|champion/.test(value)) {
    return {
      ...accolade,
      sourceName: "FIFA World Cup 2026 final report",
      sourceUrl: FIFA_2026_FINAL_REPORT,
      verified: true,
    };
  }
  if (
    value.includes("world cup") &&
    /golden|bronze|silver|young player/.test(value)
  ) {
    return {
      ...accolade,
      sourceName: "FIFA World Cup 2026 awards",
      sourceUrl: FIFA_2026_AWARDS,
      verified: true,
    };
  }
  return accolade;
};

const canonicalAccoladeArray = (accolades: PlayerAccolade[]) =>
  JSON.stringify(
    [...accolades]
      .map((accolade) => ({
        id: accolade.id,
        label: accolade.label,
        count: accolade.count ?? null,
        category: accolade.category,
        sourceName: accolade.sourceName,
        sourceUrl: accolade.sourceUrl ?? null,
        verified: accolade.verified,
        description: accolade.description ?? null,
      }))
      .sort((first, second) => first.id.localeCompare(second.id)),
  );

const fbrefHonorForAccolade = (
  accolade: PlayerAccolade,
  fbrefAudit: FbrefProfileAudit | null,
) => {
  if (!fbrefAudit?.identityVerified) return null;
  return (
    fbrefAudit.honors.find((honor) => {
      const honorTitle = normalizeHonorTitle(honor);
      const accoladeTitle = normalizeHonorTitle(accolade.label);
      return (
        honorTitle === accoladeTitle ||
        honorTitle.includes(accoladeTitle) ||
        accoladeTitle.includes(honorTitle) ||
        tokenSimilarity(honor, accolade.label) >= 0.72
      );
    }) ?? null
  );
};

const reconstructFromTransfermarkt = (
  accolade: PlayerAccolade,
  transfermarktTitles: ParsedSourceTitle[],
  transfermarktPage: string,
  cardYear: number,
) => {
  const matches = transfermarktTitles.filter((title) =>
    parsedTitleMatchesAccolade(title, accolade),
  );
  const normalizedAccoladeLabel = normalizeText(accolade.label);
  const minimumEstablishedYear =
    normalizedAccoladeLabel.includes("the best fifa mens player")
      ? 2016
      : normalizedAccoladeLabel.includes("uefa mens player of the year")
        ? 2011
        : normalizedAccoladeLabel.includes("fifa fifpro world xi")
          ? 2005
          : Number.NEGATIVE_INFINITY;
  const allSeasons = [
    ...new Map(
      matches
        .flatMap((title) => title.seasons)
        .filter((season) => season.endYear >= minimumEstablishedYear)
        .map((season) => [
          `${season.startYear}:${season.endYear}:${season.raw}:${season.context ?? ""}`,
          season,
        ]),
    ).values(),
  ];
  const included = allSeasons.filter((season) => {
    if (season.endYear < cardYear) return true;
    if (season.endYear > cardYear) return false;
    if (season.kind === "season") return true;
    const synthetic: PlayerAccolade = {
      ...accolade,
      description: `${accolade.description ?? ""} ${season.raw}`,
    };
    return isWorldCupTournamentAccolade(synthetic, cardYear);
  });
  if (included.length === 0) {
    return {
      candidate: null,
      matchedTitles: matches,
      allSeasons,
      included,
    };
  }
  const evidence = included
    .map((season) => season.raw)
    .sort()
    .join(", ");
  const corrected: PlayerAccolade = {
    ...accolade,
    count: included.length,
    sourceName: "Transfermarkt",
    sourceUrl: transfermarktPage,
    verified: true,
    description: `Verified title rows through the ${cardYear} World Cup cutoff: ${evidence}.`,
  };
  return {
    candidate: {
      accolade: corrected,
      periods: included.map((season) => ({
        raw: season.raw,
        startYear: season.startYear,
        endYear: season.endYear,
        kind: season.kind,
      })),
      verification: "cached-transfermarkt-achievements",
      reconstructed: true,
    } satisfies CandidateAccolade,
    matchedTitles: matches,
    allSeasons,
    included,
  };
};

const processCardAccolades = ({
  card,
  originalAccolades,
  fbrefAudit,
  transfermarktTitles,
  transfermarktPage,
}: {
  card: PlayerTournamentCard;
  originalAccolades: PlayerAccolade[];
  fbrefAudit: FbrefProfileAudit | null;
  transfermarktTitles: ParsedSourceTitle[];
  transfermarktPage: string | null;
}) => {
  const candidates: CandidateAccolade[] = [];
  const removed: RemovedAccolade[] = [];

  for (const storedAccolade of originalAccolades) {
    const combinedText = `${storedAccolade.label} ${storedAccolade.description ?? ""}`;
    if (
      /\brunner[- ]?up\b|\bfinalist\b|\bnomination\b|\bnominated\b|\bshortlist(?:ed)?\b|\bparticipant\b|\bworld cup squad\b/i.test(
        combinedText,
      )
    ) {
      const temporal = temporalEvidenceFor(combinedText);
      removed.push({
        accolade: storedAccolade,
        reason: "non-winning-result",
        explicitYears: temporal.explicitYears,
        earnedThroughYear: temporal.earnedThroughYear,
        detail:
          "Runner-up, finalist, nomination, shortlist, participation, and squad-membership records are not qualifying accolades.",
      });
      continue;
    }
    const accolade = resourcedCompleted2026Accolade(storedAccolade);
    let temporal = temporalEvidenceFor(combinedText);
    const fbrefHonor =
      accolade.sourceName === "FBref"
        ? fbrefHonorForAccolade(accolade, fbrefAudit)
        : null;
    if (temporal.periods.length === 0 && fbrefHonor) {
      temporal = temporalEvidenceFor(fbrefHonor);
    }

    if (
      (accolade.count ?? 1) > 1 &&
      transfermarktPage &&
      transfermarktTitles.length > 0
    ) {
      const rebuilt = reconstructFromTransfermarkt(
        accolade,
        transfermarktTitles,
        transfermarktPage,
        card.tournamentYear,
      );
      if (rebuilt.candidate) {
        candidates.push(rebuilt.candidate);
        continue;
      }
    }

    if (temporal.periods.length === 0) {
      const rebuilt =
        transfermarktPage && transfermarktTitles.length > 0
          ? reconstructFromTransfermarkt(
              accolade,
              transfermarktTitles,
              transfermarktPage,
              card.tournamentYear,
            )
          : null;
      if (rebuilt?.candidate) {
        candidates.push(rebuilt.candidate);
        continue;
      }
      removed.push({
        accolade,
        reason: "undated-aggregate-could-not-be-sliced",
        explicitYears: [],
        earnedThroughYear: null,
        detail:
          rebuilt && rebuilt.matchedTitles.length > 0
            ? "The checked Transfermarkt title group has no dated rows at or before this card cutoff."
            : "No checked source supplied the individual title seasons needed to compute a cutoff-safe count.",
      });
      continue;
    }

    const decision = temporalDecision(
      accolade,
      temporal.periods,
      card.tournamentYear,
    );
    if (decision.result === "exclude") {
      removed.push({
        accolade,
        reason: decision.reason,
        explicitYears: temporal.explicitYears,
        earnedThroughYear: temporal.earnedThroughYear,
        detail: decision.detail,
      });
      continue;
    }

    const localSource = sourceIsLocalArchive(accolade.sourceName);
    const cachedFbref =
      accolade.sourceName === "FBref" && Boolean(fbrefHonor);
    const storedProvenance =
      Boolean(accolade.sourceUrl) &&
      accolade.sourceName !== "Historical archive" &&
      accolade.sourceName !== "FBref";
    if (!localSource && !cachedFbref && !storedProvenance) {
      const rebuilt =
        transfermarktPage && transfermarktTitles.length > 0
          ? reconstructFromTransfermarkt(
              accolade,
              transfermarktTitles,
              transfermarktPage,
              card.tournamentYear,
            )
          : null;
      if (rebuilt?.candidate) {
        candidates.push(rebuilt.candidate);
        continue;
      }
      removed.push({
        accolade,
        reason: "unverifiable-source",
        explicitYears: temporal.explicitYears,
        earnedThroughYear: temporal.earnedThroughYear,
        detail:
          accolade.sourceName === "FBref"
            ? "The stored FBref row was not retained because the cached profile did not pass identity checks and contain a matching honor."
            : "The record has no source URL or matching checked local source row.",
      });
      continue;
    }

    candidates.push({
      accolade,
      periods: temporal.periods,
      verification: localSource
        ? "local-source-archive"
        : cachedFbref
          ? "cached-fbref-profile"
          : "stored-source-provenance",
      reconstructed: false,
    });
  }

  const retained = deduplicateCandidates(candidates, removed);
  return {
    correctedAccolades: retained.map((candidate) => candidate.accolade),
    removedAccolades: removed.sort(
      (first, second) =>
        first.accolade.id.localeCompare(second.accolade.id) ||
        first.reason.localeCompare(second.reason),
    ),
    reconstructedCount: retained.filter((candidate) => candidate.reconstructed)
      .length,
  };
};

const buildLocalBirthDates = async () => {
  const historicalPlayers = new Map(
    parseCsv(await readFile(HISTORICAL_PLAYER_SOURCE, "utf8")).map((row) => [
      row.player_id,
      row.birth_date || null,
    ]),
  );
  const datesByIdentity = new Map<string, Set<string>>();
  const dateByCard = new Map<string, string>();
  for (const [identityId, tournaments] of Object.entries(
    tournamentArchive.identities,
  )) {
    for (const tournament of tournaments) {
      const date = historicalPlayers.get(tournament.playerId);
      if (!date) continue;
      const dates = datesByIdentity.get(identityId) ?? new Set<string>();
      dates.add(date);
      datesByIdentity.set(identityId, dates);
      dateByCard.set(`${identityId}-${tournament.tournamentYear}`, date);
    }
  }
  for (const player of completed2026Roster.players) {
    const dates =
      datesByIdentity.get(player.identityId) ?? new Set<string>();
    dates.add(player.birthDate);
    datesByIdentity.set(player.identityId, dates);
    dateByCard.set(`${player.identityId}-2026`, player.birthDate);
  }
  const dateByIdentity = new Map<string, string>();
  for (const [identityId, dates] of datesByIdentity) {
    if (dates.size === 1) {
      dateByIdentity.set(identityId, [...dates][0]);
    }
  }
  return { dateByIdentity, dateByCard, datesByIdentity };
};

const groupCardsByIdentity = () => {
  const grouped = new Map<string, PlayerTournamentCard[]>();
  for (const card of allPlayersBeforeIdentityPruning) {
    grouped.set(card.playerIdentityId, [
      ...(grouped.get(card.playerIdentityId) ?? []),
      card,
    ]);
  }
  return grouped;
};

const cliValue = (name: string) =>
  process.argv
    .find((argument) => argument.startsWith(`${name}=`))
    ?.slice(name.length + 1);

const main = async () => {
  const transfermarktIndex =
    cliValue("--transfermarkt-index") ?? DEFAULT_TRANSFERMARKT_INDEX;
  const reepIndex = cliValue("--reep-index") ?? DEFAULT_REEP_INDEX;
  const shouldFetchTransfermarkt = process.argv.includes(
    "--fetch-transfermarkt",
  );
  const requestDelayMs = Number(
    cliValue("--request-delay-ms") ?? "1200",
  );
  if (!Number.isFinite(requestDelayMs) || requestDelayMs < 500) {
    throw new Error("--request-delay-ms must be at least 500");
  }

  await mkdir(path.dirname(GENERATED_OUTPUT), { recursive: true });
  await mkdir(path.dirname(REPORT_OUTPUT), { recursive: true });
  await mkdir(TRANSFERMARKT_CACHE, { recursive: true });

  const {
    dateByIdentity: dateOfBirthByIdentity,
    dateByCard: dateOfBirthByCard,
    datesByIdentity,
  } = await buildLocalBirthDates();
  const cardsByIdentity = groupCardsByIdentity();
  const dcaribouTransfermarktPlayers = await buildTransfermarktPlayers(
    transfermarktIndex,
  );
  const reepTransfermarktPlayers =
    await buildReepTransfermarktPlayers(reepIndex);
  const transfermarktPlayers = [
    ...new Map(
      [
        ...reepTransfermarktPlayers,
        ...dcaribouTransfermarktPlayers,
      ].map((player) => [player.playerId, player]),
    ).values(),
  ];
  const transfermarktById = new Map(
    transfermarktPlayers.map((player) => [player.playerId, player]),
  );
  const transfermarktByBirthDate = new Map<string, TransfermarktPlayer[]>();
  for (const player of transfermarktPlayers) {
    if (!player.dateOfBirth) continue;
    transfermarktByBirthDate.set(player.dateOfBirth, [
      ...(transfermarktByBirthDate.get(player.dateOfBirth) ?? []),
      player,
    ]);
  }

  const identitySources = new Map<
    string,
    {
      dateOfBirth: string | null;
      fbrefMapping: FbrefMapping | null;
      fbrefAudit: FbrefProfileAudit | null;
      transfermarktMatch: TransfermarktIdentityMatch;
      transfermarktAchievementsPage: string | null;
      transfermarktCachePath: string | null;
      transfermarktCacheSha256: string | null;
      transfermarktTitles: ParsedSourceTitle[];
      transfermarktFetchError: string | null;
    }
  >();

  for (const [identityId, cards] of [...cardsByIdentity].sort(([first], [second]) =>
    first.localeCompare(second),
  )) {
    const dateOfBirth = dateOfBirthByIdentity.get(identityId) ?? null;
    const fbrefMapping = fbrefByIdentity.get(identityId) ?? null;
    const fbrefAudit = fbrefMapping
      ? await parseFbrefProfile(fbrefMapping, cards, dateOfBirth)
      : null;
    const transfermarktMatch = matchTransfermarktIdentity(
      cards,
      dateOfBirth,
      transfermarktByBirthDate,
      fbrefAudit,
    );
    identitySources.set(identityId, {
      dateOfBirth,
      fbrefMapping,
      fbrefAudit,
      transfermarktMatch,
      transfermarktAchievementsPage: transfermarktMatch.player
        ? transfermarktAchievementsUrl(transfermarktMatch.player)
        : null,
      transfermarktCachePath: null,
      transfermarktCacheSha256: null,
      transfermarktTitles: [],
      transfermarktFetchError: null,
    });
  }

  const identitiesNeedingTransfermarktRows = new Set(
    [...cardsByIdentity.keys()].filter((identityId) => {
      const accolades =
        careerArchive.players[identityId]?.accolades ?? [];
      return accolades.some((accolade) => {
        const temporal = temporalEvidenceFor(
          `${accolade.label} ${accolade.description ?? ""}`,
        );
        return (
          temporal.periods.length === 0 ||
          accolade.sourceName === "Historical archive"
        );
      });
    }),
  );

  const requestState = { nextRequestAt: 0 };
  let fetched = 0;
  for (const identityId of [...identitiesNeedingTransfermarktRows].sort()) {
    const source = identitySources.get(identityId)!;
    const player = source.transfermarktMatch.player;
    if (!player) continue;
    const cacheFile = path.join(TRANSFERMARKT_CACHE, `${player.playerId}.html`);
    try {
      if (!existsSync(cacheFile) && !shouldFetchTransfermarkt) continue;
      const resolvedCache = existsSync(cacheFile)
        ? cacheFile
        : await fetchTransfermarktPage(player, requestDelayMs, requestState);
      const html = await readFile(resolvedCache, "utf8");
      const canonicalId =
        html.match(
          /<link rel="canonical" href="https:\/\/www\.transfermarkt\.com\/[^"]+\/erfolge\/spieler\/(\d+)"/i,
        )?.[1] ?? null;
      if (canonicalId !== player.playerId) {
        throw new Error(
          `Cached Transfermarkt canonical ID ${canonicalId ?? "missing"} does not match ${player.playerId}`,
        );
      }
      source.transfermarktCachePath = path.relative(ROOT, resolvedCache);
      source.transfermarktCacheSha256 = sha256(html);
      source.transfermarktTitles = parseTransfermarktTitles(html);
      fetched += 1;
      if (fetched % 25 === 0) {
        console.log(
          `Checked Transfermarkt achievement pages: ${fetched}/${identitiesNeedingTransfermarktRows.size}.`,
        );
      }
    } catch (error) {
      source.transfermarktFetchError =
        error instanceof Error ? error.message : String(error);
    }
  }

  const generatedCards: Record<
    string,
    { cutoffDate: string; accolades: PlayerAccolade[] }
  > = {};
  const auditCards: Array<Record<string, unknown>> = [];
  const removedReasonCounts = new Map<string, number>();
  let originalAccoladeOccurrences = 0;
  let correctedAccoladeOccurrences = 0;
  let reconstructedAccoladeOccurrences = 0;
  let removedOriginalAccoladeOccurrences = 0;
  let cardsWithAccoladeChanges = 0;
  const identitiesWithAccoladeChanges = new Set<string>();

  for (const card of [...allPlayersBeforeIdentityPruning].sort((first, second) =>
    first.id.localeCompare(second.id),
  )) {
    const source = identitySources.get(card.playerIdentityId)!;
    const cardOverride = CARD_SOURCE_OVERRIDES[card.id];
    const rejectedIdentityReason = REJECT_IDENTITY_WIDE_SOURCES.get(
      card.playerIdentityId,
    );
    const rejectsIdentityWideSources =
      Boolean(cardOverride) || Boolean(rejectedIdentityReason);
    const cardDateOfBirth =
      cardOverride?.dateOfBirth ??
      dateOfBirthByCard.get(card.id) ??
      source.dateOfBirth;
    const cardFbrefMapping: FbrefMapping | null = cardOverride
      ? {
          playerIdentityId: card.playerIdentityId,
          playerName: cardOverride.sourcePlayerName,
          fbrefId: cardOverride.fbref.playerId,
          sourceUrl: cardOverride.fbref.sourceUrl,
        }
      : rejectedIdentityReason
        ? null
        : source.fbrefMapping;
    const cardFbrefAudit =
      rejectsIdentityWideSources ? null : source.fbrefAudit;
    const cardTransfermarktMatch: TransfermarktIdentityMatch = cardOverride
      ? reviewedCardTransfermarktMatch(cardOverride, transfermarktById)
      : rejectedIdentityReason
        ? {
            status: "unresolved",
            confidence: null,
            player: null,
            reason: rejectedIdentityReason,
            candidateCount: 0,
            evidence: {
              dateOfBirthMatches: false,
              normalizedNameMatches: false,
              nationalityMatches: false,
              positionUsedAsTieBreak: false,
              corroboratedByCachedFbrefLink: false,
            },
          }
        : source.transfermarktMatch;
    const cardTransfermarktPage = cardTransfermarktMatch.player
      ? transfermarktAchievementsUrl(cardTransfermarktMatch.player)
      : null;
    const cardTransfermarktCachePath = rejectsIdentityWideSources
      ? null
      : source.transfermarktCachePath;
    const cardTransfermarktCacheSha256 = rejectsIdentityWideSources
      ? null
      : source.transfermarktCacheSha256;
    const cardTransfermarktTitles = rejectsIdentityWideSources
      ? []
      : source.transfermarktTitles;
    const originalAccolades =
      rejectsIdentityWideSources
        ? []
        : (careerArchive.players[card.playerIdentityId]?.accolades ?? []);
    const processed = processCardAccolades({
      card,
      originalAccolades,
      fbrefAudit: cardFbrefAudit,
      transfermarktTitles: cardTransfermarktTitles,
      transfermarktPage: cardTransfermarktPage,
    });
    const cutoffDate = WORLD_CUP_CUTOFF_BY_YEAR[card.tournamentYear];
    if (!cutoffDate) {
      throw new Error(`${card.id} has no World Cup cutoff date`);
    }
    generatedCards[card.id] = {
      cutoffDate,
      accolades: processed.correctedAccolades,
    };
    originalAccoladeOccurrences += originalAccolades.length;
    correctedAccoladeOccurrences += processed.correctedAccolades.length;
    reconstructedAccoladeOccurrences += processed.reconstructedCount;
    removedOriginalAccoladeOccurrences +=
      processed.removedAccolades.length;
    if (
      canonicalAccoladeArray(originalAccolades) !==
      canonicalAccoladeArray(processed.correctedAccolades)
    ) {
      cardsWithAccoladeChanges += 1;
      identitiesWithAccoladeChanges.add(card.playerIdentityId);
    }
    for (const removed of processed.removedAccolades) {
      removedReasonCounts.set(
        removed.reason,
        (removedReasonCounts.get(removed.reason) ?? 0) + 1,
      );
    }

    const hasActualSourceContent =
      Boolean(cardFbrefAudit?.identityVerified) ||
      Boolean(cardTransfermarktCachePath) ||
      originalAccolades.some((accolade) =>
        sourceIsLocalArchive(accolade.sourceName),
      );
    const auditStatus:
      | "verified"
      | "verified-no-accolades"
      | "partially-verified"
      | "unresolved" =
      hasActualSourceContent ? "partially-verified" : "unresolved";
    const unresolvedIssues: string[] = [];
    if (cardOverride) {
      unresolvedIssues.push(cardOverride.reason);
    }
    if (rejectedIdentityReason) {
      unresolvedIssues.push(rejectedIdentityReason);
    }
    if (!cardFbrefMapping) {
      unresolvedIssues.push("No FBref player identifier is mapped.");
    } else if (!cardFbrefAudit) {
      unresolvedIssues.push(
        "FBref identifier is mapped, but no cached profile content was available for this audit.",
      );
    } else if (!cardFbrefAudit.identityVerified) {
      unresolvedIssues.push(
        "Cached FBref profile did not pass every normalized-name, date-of-birth, nationality, and canonical-ID check.",
      );
    }
    if (cardTransfermarktMatch.status !== "matched") {
      unresolvedIssues.push(cardTransfermarktMatch.reason);
    } else if (!cardTransfermarktCachePath) {
      unresolvedIssues.push(
        "Transfermarkt identity is matched, but its titles-and-achievements page was not cached and parsed.",
      );
    }
    if (processed.removedAccolades.length > 0) {
      unresolvedIssues.push(
        `${processed.removedAccolades.length} original accolade record(s) were omitted because they were future-dated, cutoff-ambiguous, duplicate, or insufficiently sourced.`,
      );
    }
    if (originalAccolades.length === 0) {
      unresolvedIssues.push(
        "An empty local accolade array is not evidence that the player had no qualifying honors by this cutoff.",
      );
    }
    unresolvedIssues.push(
      "Transfermarkt/FBref coverage is not complete enough to prove that no qualifying accolade is missing.",
    );

    const storedSourceProvenance = [
      ...new Map(
        [...originalAccolades, ...processed.correctedAccolades].map((accolade) => [
          `${accolade.sourceName}:${accolade.sourceUrl ?? ""}`,
          {
            sourceName: accolade.sourceName,
            sourceUrl: accolade.sourceUrl ?? null,
            reviewStatus: sourceIsLocalArchive(accolade.sourceName)
              ? "checked-local-source-data"
              : accolade.sourceName === "FBref" &&
                  cardFbrefAudit?.identityVerified
                ? "checked-cached-page"
                : accolade.sourceName === "FBref"
                  ? "stored-provenance-rejected-identity-unverified"
                  : "stored-provenance-not-refetched",
          },
        ]),
      ).values(),
    ];
    const sourcesChecked = [
      {
        sourceName: tournamentArchive.source.name,
        sourceUrl: tournamentArchive.source.url,
        sourcePlayerId:
          tournamentArchive.identities[card.playerIdentityId]?.find(
            (tournament) =>
              tournament.tournamentYear === card.tournamentYear,
          )?.playerId ?? null,
        reviewStatus:
          card.tournamentYear === 2026
            ? "not-applicable-to-2026-card"
            : "checked-local-identity-source",
      },
      ...(card.tournamentYear === 2026
        ? [
            {
              sourceName: completed2026Roster.source.name,
              sourceUrl: completed2026Roster.source.url,
              sourcePlayerId: null,
              reviewStatus: "checked-local-identity-source",
            },
          ]
        : []),
      ...(cardFbrefMapping
        ? [
            {
              sourceName: "FBref",
              sourceUrl: cardFbrefMapping.sourceUrl,
              sourcePlayerId: cardFbrefMapping.fbrefId,
              cachePath: cardFbrefAudit?.cachePath ?? null,
              cacheSha256: cardFbrefAudit?.cacheSha256 ?? null,
              reviewStatus: cardFbrefAudit?.identityVerified
                ? "checked-cached-page-identity-verified"
                : cardFbrefAudit
                  ? "checked-cached-page-identity-unresolved"
                  : cardOverride
                    ? "reviewed-card-specific-identifier-only"
                    : "identifier-mapping-only",
            },
          ]
        : []),
      ...(cardTransfermarktMatch.player
        ? [
            {
              sourceName: "Transfermarkt",
              sourceUrl: cardTransfermarktPage,
              sourcePlayerId: cardTransfermarktMatch.player.playerId,
              cachePath: cardTransfermarktCachePath,
              cacheSha256: cardTransfermarktCacheSha256,
              reviewStatus: cardTransfermarktCachePath
                ? "checked-cached-titles-and-achievements-page"
                : cardOverride
                  ? "reviewed-card-specific-identifier-page-not-checked"
                  : "identity-matched-page-not-checked",
            },
          ]
        : []),
      ...storedSourceProvenance,
    ];

    auditCards.push({
      playerCardId: card.id,
      playerIdentityId: card.playerIdentityId,
      playable: playableCardIds.has(card.id),
      displayName: card.playerName,
      normalizedName: normalizeManifestName(card.playerName),
      sourcePlayerName: cardOverride?.sourcePlayerName ?? card.playerName,
      dateOfBirth: cardDateOfBirth,
      nationality: {
        code: card.countryCode,
        name: card.countryName,
      },
      worldCupYear: card.tournamentYear,
      accoladeCutoffDate: cutoffDate,
      fbrefPlayerId: cardFbrefMapping?.fbrefId ?? null,
      fbrefPage: cardFbrefMapping?.sourceUrl ?? null,
      fbrefCachedProfile: cardFbrefAudit?.cachePath ?? null,
      fbrefIdentityChecks: cardFbrefAudit,
      transfermarktPlayerId:
        cardTransfermarktMatch.player?.playerId ?? null,
      transfermarktPage: cardTransfermarktPage,
      transfermarktEvidence: {
        identityMatch: cardTransfermarktMatch,
        cachedTitlesPage: cardTransfermarktCachePath
          ? {
              cachePath: cardTransfermarktCachePath,
              sha256: cardTransfermarktCacheSha256,
              parsedTitleGroups: cardTransfermarktTitles,
            }
          : null,
      },
      transfermarktIdentityMatch: cardTransfermarktMatch,
      transfermarktCachedTitlesPage: cardTransfermarktCachePath
        ? {
            cachePath: cardTransfermarktCachePath,
            sha256: cardTransfermarktCacheSha256,
            parsedTitleGroups: cardTransfermarktTitles,
          }
        : null,
      originalAccolades,
      correctedAccolades: processed.correctedAccolades,
      removedAccolades: processed.removedAccolades,
      accoladeAuditStatus: auditStatus,
      sourcesChecked,
      top100Treatment: careerArchive.players[card.playerIdentityId]
        ?.top100Player
        ? {
            preserved: true,
            reason:
              "Top 100 Player is an identity-level retrospective Trophy XI curation marker, not a dated earned trophy or individual award.",
            source:
              careerArchive.players[card.playerIdentityId]?.top100Source ??
              null,
          }
        : {
            preserved: true,
            reason:
              "Top 100 Player is outside the earned-accolade time-slice.",
            source: null,
          },
      notes: [
        "Only the existing accolade schema is emitted to production.",
        "No new accolade family was inferred from a source page.",
        "Undated whole-career aggregates are omitted unless checked title rows establish a cutoff-safe count.",
        ...(cardOverride ? [cardOverride.reason] : []),
        ...(rejectedIdentityReason ? [rejectedIdentityReason] : []),
        ...(datesByIdentity.get(card.playerIdentityId)?.size &&
        (datesByIdentity.get(card.playerIdentityId)?.size ?? 0) > 1
          ? [
              `Source dates of birth for the shared identity: ${[
                ...(datesByIdentity.get(card.playerIdentityId) ?? []),
              ]
                .sort()
                .join(", ")}.`,
            ]
          : []),
      ],
      unresolvedIssues: [...new Set(unresolvedIssues)],
    });
  }

  const expectedMessiCopaDelReyCounts: Record<string, number> = {
    "lionel-messi-2014": 2,
    "lionel-messi-2018": 6,
    "lionel-messi-2022": 7,
  };
  for (const [cardId, expectedCount] of Object.entries(
    expectedMessiCopaDelReyCounts,
  )) {
    const accolade = generatedCards[cardId]?.accolades.find(
      (candidate) => candidate.id === "domestic-cup-winner",
    );
    if (accolade?.count !== expectedCount) {
      throw new Error(
        `${cardId} must contain ${expectedCount} cutoff-safe Copa del Rey wins, received ${accolade?.count ?? "none"}`,
      );
    }
    if (/super cup|supercup/i.test(accolade.description ?? "")) {
      throw new Error(`${cardId} incorrectly includes a Super Cup`);
    }
  }

  const leagueRegressionCounts: Array<
    [cardId: string, accoladeId: string, expectedCount: number]
  > = [
    ["dennis-bergkamp-1994", "premier-league-champion", 0],
    ["dennis-bergkamp-1998", "premier-league-champion", 1],
    ["didier-deschamps-1998", "serie-a-champion", 3],
    ["edgar-davids-1998", "serie-a-champion", 1],
    ["edwin-van-der-sar-1994", "premier-league-champion", 0],
    ["edwin-van-der-sar-1998", "premier-league-champion", 0],
    ["edwin-van-der-sar-2006", "premier-league-champion", 0],
    ["frank-rijkaard-1990", "serie-a-champion", 0],
    ["frank-rijkaard-1994", "serie-a-champion", 2],
    ["jaap-stam-1998", "premier-league-champion", 0],
    ["michael-laudrup-1986", "la-liga-champion", 0],
    ["michael-laudrup-1998", "la-liga-champion", 5],
  ];
  for (const [cardId, accoladeId, expectedCount] of leagueRegressionCounts) {
    const accolade = generatedCards[cardId]?.accolades.find(
      (candidate) => candidate.id === accoladeId,
    );
    const actualCount = accolade?.count ?? (accolade ? 1 : 0);
    if (actualCount !== expectedCount) {
      throw new Error(
        `${cardId}/${accoladeId} must contain ${expectedCount} competition-specific title rows, received ${actualCount}.`,
      );
    }
  }

  const auditByCardId = new Map(
    auditCards.map((card) => [String(card.playerCardId), card]),
  );
  const reviewedTimberCards = {
    "jurrien-timber-2022": {
      sourcePlayerName: "Jurriën Timber",
      fbrefPlayerId: "41034650",
      transfermarktPlayerId: "420243",
    },
    "jurrien-timber-2026": {
      sourcePlayerName: "Quinten Timber",
      fbrefPlayerId: "803e7aca",
      transfermarktPlayerId: "420213",
    },
  };
  for (const [cardId, expected] of Object.entries(reviewedTimberCards)) {
    const audit = auditByCardId.get(cardId);
    if (
      audit?.sourcePlayerName !== expected.sourcePlayerName ||
      audit?.fbrefPlayerId !== expected.fbrefPlayerId ||
      audit?.transfermarktPlayerId !== expected.transfermarktPlayerId ||
      audit?.accoladeAuditStatus !== "unresolved" ||
      (audit?.correctedAccolades as PlayerAccolade[] | undefined)?.length !== 0
    ) {
      throw new Error(
        `${cardId} must retain its reviewed twin-specific source IDs and emit no cross-player accolades.`,
      );
    }
  }
  for (const cardId of [
    "hussein-abdulghani-1998",
    "hussein-abdulghani-2002",
    "hussein-abdulghani-2006",
  ]) {
    const audit = auditByCardId.get(cardId);
    if (
      typeof audit?.dateOfBirth !== "string" ||
      audit.fbrefPlayerId !== null ||
      audit.transfermarktPlayerId !== null ||
      audit.accoladeAuditStatus !== "unresolved" ||
      (audit.correctedAccolades as PlayerAccolade[] | undefined)?.length !== 0
    ) {
      throw new Error(
        `${cardId} must report its card-specific birth date while rejecting every identity-wide external source assignment.`,
      );
    }
  }
  for (const audit of auditCards) {
    const identityChecks = audit.fbrefIdentityChecks as
      | FbrefProfileAudit
      | null;
    const corrected = audit.correctedAccolades as PlayerAccolade[];
    if (
      corrected.some((accolade) => accolade.sourceName === "FBref") &&
      identityChecks?.identityVerified !== true
    ) {
      throw new Error(
        `${String(audit.playerCardId)} retains an FBref accolade without a fully verified cached FBref identity.`,
      );
    }
    if (
      corrected.some(
        (accolade) =>
          accolade.sourceName === "Completed 2026 archive" ||
          accolade.sourceUrl?.includes("SquadLists-English.pdf"),
      )
    ) {
      throw new Error(
        `${String(audit.playerCardId)} uses a roster PDF as winner/award evidence.`,
      );
    }
    const transfermarktEvidence = audit.transfermarktEvidence as {
      identityMatch?: TransfermarktIdentityMatch;
    };
    if (
      transfermarktEvidence.identityMatch?.status === "matched" &&
      !transfermarktEvidence.identityMatch.evidence.nationalityMatches &&
      !transfermarktEvidence.identityMatch.evidence
        .corroboratedByCachedFbrefLink
    ) {
      throw new Error(
        `${String(audit.playerCardId)} has a Transfermarkt match with neither nationality context nor exact cached-FBref corroboration.`,
      );
    }
  }

  const statusCounts = Object.fromEntries(
    [
      "verified",
      "verified-no-accolades",
      "partially-verified",
      "unresolved",
    ].map((status) => [
      status,
      auditCards.filter(
        (card) => card.accoladeAuditStatus === status,
      ).length,
    ]),
  );
  const transfermarktMatchedIdentities = [
    ...identitySources.values(),
  ].filter((source) => source.transfermarktMatch.status === "matched").length;
  const fbrefMappedIdentities = [
    ...identitySources.values(),
  ].filter((source) => Boolean(source.fbrefMapping)).length;
  const fbrefCachedVerifiedIdentities = [
    ...identitySources.values(),
  ].filter((source) => source.fbrefAudit?.identityVerified).length;
  const transfermarktPagesChecked = [
    ...identitySources.values(),
  ].filter((source) => Boolean(source.transfermarktCachePath)).length;

  const generatedAt = new Date().toISOString();
  await writeFile(
    GENERATED_OUTPUT,
    `${JSON.stringify(
      {
        version: 1,
        generatedAt,
        methodology: {
          scope:
            "Every card in allPlayersBeforeIdentityPruning; playable cards are a reported subset.",
          cutoff:
            "End date of the card's World Cup. A calendar-year-only honor in the same year is omitted unless it is inherently tied to that World Cup.",
          aggregates:
            "Undated identity-wide totals are omitted unless parsed, checked title rows establish the count through the cutoff.",
          additions:
            "No new accolade family is inferred. Checked title rows are used only to time-slice an existing record.",
          top100:
            "Preserved unchanged as a retrospective Trophy XI identity curation marker outside earned accolades.",
        },
        cards: generatedCards,
      },
      null,
      2,
    )}\n`,
  );

  await writeFile(
    REPORT_OUTPUT,
    `${JSON.stringify(
      {
        version: 1,
        generatedAt,
        scope: {
          allArchiveCards: allPlayersBeforeIdentityPruning.length,
          allArchiveIdentities: cardsByIdentity.size,
          playableCards: players.length,
          playableIdentities: new Set(
            players.map((player) => player.playerIdentityId),
          ).size,
          silentlySkippedCards:
            allPlayersBeforeIdentityPruning.length - auditCards.length,
        },
        sourceInventory: {
          localCareerArchive: {
            path: "src/data/player-career.generated.json",
            generatedAt: careerArchive.generatedAt,
          },
          fbrefIdentityMap: {
            path: "data/sources/fbref/player-map.json",
            mappedIdentities: fbrefMappedIdentities,
            checkedCachedProfiles: fbrefCachedVerifiedIdentities,
            warning:
              "An identifier mapping alone is not treated as a reviewed player or accolade page.",
          },
          transfermarktPlayerIndex: {
            inputPath: transfermarktIndex,
            sourceUrl: TRANSFERMARKT_INDEX_SOURCE,
            datasetProjectUrl: TRANSFERMARKT_DATASET_SOURCE,
            rows: dcaribouTransfermarktPlayers.length,
            confidentlyMatchedIdentities: transfermarktMatchedIdentities,
          },
          reepIdentityBridge: {
            inputPath: reepIndex,
            sourceUrl: REEP_SOURCE,
            rowsWithTransfermarktIds: reepTransfermarktPlayers.length,
            addedTransfermarktIdsNotInCurrentPlayerIndex:
              transfermarktPlayers.length -
              dcaribouTransfermarktPlayers.length,
            warning:
              "REEP is used only as an identity-ID bridge. Its presence does not verify any title.",
          },
          transfermarktAchievementPages: {
            cacheDirectory: path.relative(ROOT, TRANSFERMARKT_CACHE),
            identitiesNeedingDatedRows:
              identitiesNeedingTransfermarktRows.size,
            checkedPages: transfermarktPagesChecked,
            warning:
              "A confidently matched Transfermarkt player ID is not treated as an accolade-page review unless the cached achievements page was parsed.",
          },
        },
        summary: {
          auditedCards: auditCards.length,
          silentlySkippedCards:
            allPlayersBeforeIdentityPruning.length - auditCards.length,
          statusCounts,
          originalAccoladeOccurrences,
          correctedAccoladeOccurrences,
          unchangedRetainedAccoladeOccurrences:
            correctedAccoladeOccurrences -
            reconstructedAccoladeOccurrences,
          removedOriginalAccoladeOccurrences,
          reconstructedCutoffSafeOccurrences:
            reconstructedAccoladeOccurrences,
          occurrenceLevelCorrections:
            removedOriginalAccoladeOccurrences +
            reconstructedAccoladeOccurrences,
          cardsWithAccoladeChanges,
          identitiesWithAccoladeChanges:
            identitiesWithAccoladeChanges.size,
          removedReasonCounts: Object.fromEntries(
            [...removedReasonCounts].sort(([first], [second]) =>
              first.localeCompare(second),
            ),
          ),
          verifiedNoAccolades:
            statusCounts["verified-no-accolades"],
          partiallyVerifiedOrUnresolved:
            statusCounts["partially-verified"] + statusCounts.unresolved,
        },
        methodology: {
          identity:
            "Transfermarkt matching requires date of birth, normalized full-name or name-token signature, and nationality/context; position is only a deterministic tie-break. Cached FBref external links can corroborate but do not replace those checks.",
          cutoffDates: WORLD_CUP_CUTOFF_BY_YEAR,
          futureRecords:
            "Records with an explicit season/year after the card year are removed. Same-card-year calendar honors are removed when no exact date proves they preceded the World Cup cutoff. Tournament-tied World Cup honors remain eligible.",
          aggregates:
            "Whole-career counts without dated rows are never copied to a historical card. When a checked Transfermarkt titles page supplies rows for an existing accolade family, the count is recomputed through the cutoff; otherwise the record is omitted.",
          duplicates:
            "Competition aliases and winner/champion variants are normalized only to remove records with the same accolade family and exact season set.",
          noInvention:
            "Source pages do not create new accolade families; they only verify or time-slice records already present in the local career archive.",
          statusRigor:
            "Empty local arrays and mapped source IDs are never treated as proof of no accolades. Incomplete source-page coverage remains partially-verified or unresolved.",
          top100:
            "The existing Top 100 Player badge is preserved as a retrospective Trophy XI curation marker, not treated as a dated earned honor.",
        },
        cards: auditCards,
      },
      null,
      2,
    )}\n`,
  );

  console.log(
    `Accolade audit: ${auditCards.length} cards, ${correctedAccoladeOccurrences} retained occurrences, ${transfermarktPagesChecked} cached Transfermarkt achievement pages checked.`,
  );
  console.log(`Generated ${path.relative(ROOT, GENERATED_OUTPUT)}.`);
  console.log(`Generated ${path.relative(ROOT, REPORT_OUTPUT)}.`);
};

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
