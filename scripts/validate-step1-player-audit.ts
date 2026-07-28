import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import fbrefMapJson from "../data/sources/fbref/player-map.json";
import historicalPlayersJson from "../src/data/player-tournaments.generated.json";
import roster2026Json from "../src/data/player-tournaments-2026.generated.json";
import identityCareerAccoladesJson from "../src/data/player-career-accolades-by-identity.generated.json";
import { imagesById } from "../src/data/player-images";
import {
  allPlayersBeforeIdentityPruning,
  players as playablePlayers,
} from "../src/data/players";
import { playerCardSchema, playerSeedSchema } from "../src/lib/validation";
import type { PlayerAccolade } from "../src/types/game";

/**
 * Read-only validation:
 *   node --import tsx scripts/validate-step1-player-audit.ts
 *
 * After the two source audits pass, create the required merged report once:
 *   node --import tsx scripts/validate-step1-player-audit.ts --write-merged
 *
 * `top100Player` is deliberately outside the earned-accolade cutoff check. It
 * is a retrospective identity-level curation marker, not a trophy or award.
 */
const ROOT = process.cwd();
const WRITE_MERGED = process.argv.includes("--write-merged");
const identityCareerAccolades =
  identityCareerAccoladesJson as unknown as {
    identities: Record<string, { accolades: PlayerAccolade[] }>;
  };
const TARGET_YEARS = [2014, 2018, 2022, 2026] as const;
type TargetYear = (typeof TARGET_YEARS)[number];

const IMAGE_AUDIT_FILE = path.join(
  ROOT,
  "reports",
  "step1-player-image-audit.json",
);
const IMAGE_UNRESOLVED_FILE = path.join(
  ROOT,
  "reports",
  "step1-player-image-unresolved.json",
);
const IMAGE_DUPLICATES_FILE = path.join(
  ROOT,
  "reports",
  "step1-player-image-duplicates.json",
);
const STEP1B_PORTRAIT_SUMMARY_FILE = path.join(
  ROOT,
  "reports",
  "step1b-player-portrait-summary.json",
);
const ACCOLADE_AUDIT_FILE = path.join(
  ROOT,
  "reports",
  "step1-player-accolade-audit.json",
);
const GENERATED_ACCOLADES_FILE = path.join(
  ROOT,
  "src",
  "data",
  "player-accolades-by-card.generated.json",
);
const GENERATED_PORTRAITS_FILE = path.join(
  ROOT,
  "src",
  "data",
  "tournament-edition-player-portraits.generated.json",
);
const MERGED_AUDIT_FILE = path.join(
  ROOT,
  "reports",
  "step1-player-images-accolades-audit.json",
);
const PUBLIC_FACE_DIRECTORY = path.join(
  ROOT,
  "public",
  "players",
  "game-faces",
);
const CONTACT_SHEET_BY_YEAR = new Map(
  TARGET_YEARS.map((year) => [
    year,
    path.join(
      ROOT,
      "reports",
      "contact-sheets",
      `player-images-${year}.png`,
    ),
  ]),
);

const EDITION_BY_YEAR: Record<
  TargetYear,
  { label: string; aliases: string[]; version: number }
> = {
  2014: { label: "FIFA 14", aliases: ["FIFA 14"], version: 14 },
  2018: { label: "FIFA 18", aliases: ["FIFA 18"], version: 18 },
  2022: { label: "FIFA 23", aliases: ["FIFA 23"], version: 23 },
  2026: {
    label: "FC 26",
    aliases: ["FC 26", "EA SPORTS FC 26"],
    version: 26,
  },
};
const TOURNAMENT_END_DATE_BY_YEAR = new Map<number, string>([
  [1930, "1930-07-30"],
  [1934, "1934-06-10"],
  [1938, "1938-06-19"],
  [1950, "1950-07-16"],
  [1954, "1954-07-04"],
  [1958, "1958-06-29"],
  [1962, "1962-06-17"],
  [1966, "1966-07-30"],
  [1970, "1970-06-21"],
  [1974, "1974-07-07"],
  [1978, "1978-06-25"],
  [1982, "1982-07-11"],
  [1986, "1986-06-29"],
  [1990, "1990-07-08"],
  [1994, "1994-07-17"],
  [1998, "1998-07-12"],
  [2002, "2002-06-30"],
  [2006, "2006-07-09"],
  [2010, "2010-07-11"],
  [2014, "2014-07-13"],
  [2018, "2018-07-15"],
  [2022, "2022-12-18"],
  [2026, "2026-07-19"],
]);

const IMAGE_STATUS = new Set([
  "verified",
  "unresolved-no-sofifa-mapping",
  "unresolved-identity-verification",
  "unresolved-edition-unavailable",
  "unresolved-download-failed",
  "unresolved-invalid-image",
  "unresolved-exact-duplicate",
]);
const ACCOLADE_STATUS = new Set([
  "verified",
  "verified-no-accolades",
  "partially-verified",
  "unresolved",
]);
const REVIEWED_CARD_SOURCE_OVERRIDES = new Map<
  string,
  {
    sourcePlayerName: string;
    fbrefPlayerId: string;
    fbrefPage: string;
    transfermarktPlayerId: string;
  }
>([
  [
    "jurrien-timber-2022",
    {
      sourcePlayerName: "Jurriën Timber",
      fbrefPlayerId: "41034650",
      fbrefPage:
        "https://fbref.com/en/players/41034650/Jurrien-Timber",
      transfermarktPlayerId: "420243",
    },
  ],
  [
    "jurrien-timber-2026",
    {
      sourcePlayerName: "Quinten Timber",
      fbrefPlayerId: "803e7aca",
      fbrefPage:
        "https://fbref.com/en/players/803e7aca/Quinten-Timber",
      transfermarktPlayerId: "420213",
    },
  ],
]);
const REJECT_IDENTITY_WIDE_SOURCE_IDS = new Set([
  "hussein-abdulghani",
]);
const DOMESTIC_LEAGUE_REGRESSIONS: Array<
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
const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const SIMILAR_DHASH_DISTANCE = 4;
const MANUALLY_REVIEWED_ZERO_DHASH_PAIR_IDS = new Set([
  "denzel-dumfries-2026::kylian-mbappe-2018",
  "kylian-mbappe-2018::lutsharel-geertruida-2026",
  "denzel-dumfries-2026::lutsharel-geertruida-2026",
  "diarra-habib-2026::nicolas-pepe-2026",
  "diarra-habib-2026::wan-bissaka-aaron-2026",
  "nicolas-pepe-2026::wan-bissaka-aaron-2026",
]);

type JsonRecord = Record<string, unknown>;

type ImageAuditCard = {
  playerCardId: string;
  playerIdentityId: string;
  displayName: string;
  normalizedName: string;
  birthDate: string;
  nationality: string;
  worldCupYear: number;
  requiredGameEdition: string;
  requiredSoFifaVersion: number;
  sofifaPlayerId: string | number | null;
  sofifaSourcePage: string | null;
  sourceImageUrl: string | null;
  localImagePath: string;
  imageSha256: string | null;
  imageDHash: string | null;
  imageVisualSha256: string | null;
  width: number | null;
  height: number | null;
  format: string | null;
  imageValidationStatus: string;
  imageConfidence: string;
  finalPortraitStatus: string;
  unresolvedReason: string | null;
  identityEvidence: unknown;
  editionEvidence: unknown;
  sourceReuse: unknown;
  exactDuplicateGroup: unknown;
  similarMatches: unknown;
  notes: unknown;
};

type AccoladeAuditCard = {
  playerCardId: string;
  playerIdentityId: string;
  displayName: string;
  sourcePlayerName?: string;
  normalizedName: string;
  dateOfBirth: string | null;
  nationality: {
    code: string;
    name: string;
  };
  worldCupYear: number;
  accoladeCutoffDate: string;
  fbrefPlayerId: string | null;
  fbrefPage: string | null;
  fbrefCachedProfile: string | null;
  fbrefIdentityChecks: unknown;
  transfermarktPlayerId: string | null;
  transfermarktPage: string | null;
  transfermarktEvidence: unknown;
  originalAccolades: PlayerAccolade[];
  correctedAccolades: PlayerAccolade[];
  removedAccolades: Array<{
    accolade: PlayerAccolade;
    reason: string;
    explicitYears: number[];
    earnedThroughYear: number | null;
  }>;
  accoladeAuditStatus: string;
  sourcesChecked: unknown[];
  notes: unknown;
  unresolvedIssues: unknown[];
};

type ActualImage = {
  card: ImageAuditCard;
  absolutePath: string;
  sha256: string;
  dHash: string;
  visualSha256: string;
  width: number;
  height: number;
};

const failures: string[] = [];

const addFailure = (message: string) => {
  failures.push(message);
};

const check = (condition: unknown, message: string) => {
  if (!condition) addFailure(message);
};

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const arrayAt = <T>(value: unknown, label: string): T[] => {
  if (!Array.isArray(value)) {
    addFailure(`${label} must be an array`);
    return [];
  }
  return value as T[];
};

const recordAt = (value: unknown, label: string): JsonRecord => {
  if (!isRecord(value)) {
    addFailure(`${label} must be an object`);
    return {};
  }
  return value;
};

const readJson = <T>(filename: string): T =>
  JSON.parse(readFileSync(filename, "utf8")) as T;

const normalizeName = (value: string) =>
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

const sha256 = (value: Buffer | string) =>
  createHash("sha256").update(value).digest("hex");

const perceptualDHash = async (value: Buffer) => {
  const pixels = await sharp(value, { animated: false })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .grayscale()
    .resize(9, 8, { fit: "fill" })
    .raw()
    .toBuffer();
  let hash = 0n;
  for (let row = 0; row < 8; row += 1) {
    for (let column = 0; column < 8; column += 1) {
      hash <<= 1n;
      if (pixels[row * 9 + column] > pixels[row * 9 + column + 1]) {
        hash |= 1n;
      }
    }
  }
  return hash.toString(16).padStart(16, "0");
};

const canonicalPixelSha256 = async (value: Buffer) => {
  const pixels = await sharp(value, { animated: false })
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
  return sha256(pixels);
};

const hammingDistance = (first: string, second: string) => {
  let value = BigInt(`0x${first}`) ^ BigInt(`0x${second}`);
  let distance = 0;
  while (value > 0n) {
    value &= value - 1n;
    distance += 1;
  }
  return distance;
};

const parseCsv = (value: string): Array<Record<string, string>> => {
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
  const [headers = [], ...records] = rows;
  return records.map((record) =>
    Object.fromEntries(
      headers.map((header, index) => [header, record[index] ?? ""]),
    ),
  );
};

const birthDateByCardId = () => {
  const historical = historicalPlayersJson as unknown as {
    identities: Record<
      string,
      Array<{ playerId: string; tournamentYear: number }>
    >;
  };
  const roster2026 = roster2026Json as unknown as {
    players: Array<{ identityId: string; birthDate: string }>;
  };
  const sourcePlayers = new Map(
    parseCsv(
      readFileSync(
        path.join(
          ROOT,
          "data",
          "sources",
          "fjelstul-world-cup",
          "players.csv",
        ),
        "utf8",
      ),
    ).map((row) => [row.player_id, row]),
  );
  const values = new Map<string, string>();
  for (const [identityId, cards] of Object.entries(historical.identities)) {
    for (const card of cards) {
      const birthDate = sourcePlayers.get(card.playerId)?.birth_date;
      if (birthDate) {
        values.set(`${identityId}-${card.tournamentYear}`, birthDate);
      }
    }
  }
  for (const player of roster2026.players) {
    values.set(`${player.identityId}-2026`, player.birthDate);
  }
  return values;
};

const exactCoverage = (
  label: string,
  actualIds: string[],
  expectedIds: string[],
) => {
  const actual = new Set(actualIds);
  const expected = new Set(expectedIds);
  const counts = new Map<string, number>();
  for (const id of actualIds) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const duplicates = [...counts]
    .filter(([, count]) => count > 1)
    .map(([id]) => id);
  const missing = expectedIds.filter((id) => !actual.has(id));
  const extra = actualIds.filter((id) => !expected.has(id));
  check(
    duplicates.length === 0,
    `${label} contains duplicate card ids: ${duplicates.slice(0, 12).join(", ")}`,
  );
  check(
    missing.length === 0,
    `${label} is missing ${missing.length} cards: ${missing
      .slice(0, 12)
      .join(", ")}`,
  );
  check(
    extra.length === 0,
    `${label} contains ${extra.length} unexpected cards: ${extra
      .slice(0, 12)
      .join(", ")}`,
  );
};

const canonicalJson = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
};

const explicitYears = (accolade: PlayerAccolade) => {
  const text = `${accolade.label} ${accolade.description ?? ""}`;
  const years = new Set<number>();
  for (const match of text.matchAll(/(?:^|\D)((?:19|20)\d{2})(?!\d)/g)) {
    years.add(Number(match[1]));
  }
  for (const match of text.matchAll(
    /((?:19|20)\d{2})\s*[-–/]\s*(\d{2})(?!\d)/g,
  )) {
    const start = Number(match[1]);
    const shortEnd = Number(match[2]);
    const end = Math.floor(start / 100) * 100 + shortEnd;
    years.add(end < start ? end + 100 : end);
  }
  return [...years].sort((first, second) => first - second);
};

const explicitDates = (accolade: PlayerAccolade) => {
  const text = `${accolade.label} ${accolade.description ?? ""}`;
  return [
    ...new Set(
      [...text.matchAll(/\b((?:19|20)\d{2}-\d{2}-\d{2})\b/g)].map(
        (match) => match[1],
      ),
    ),
  ].sort();
};

const normalizedAccoladeKey = (accolade: PlayerAccolade) => {
  let label = normalizeName(accolade.label)
    .replace(/\b(?:19|20)\d{2}(?:\s+\d{2,4})?\b/g, " ")
    .replace(/\beuropean cup\b/g, "uefa champions league")
    .replace(/\bchampions league\b/g, "uefa champions league")
    .replace(/\buefa uefa\b/g, "uefa")
    .replace(/\buefa cup\b/g, "uefa europa league")
    .replace(/\bworld cup (?:winner|champion)\b/g, "world cup title")
    .replace(/\b(?:winner|champion|championship)\b/g, "title")
    .replace(/\s+/g, " ")
    .trim();
  if (label === "uefa champions league title") {
    label = "uefa champions league";
  }
  return `${accolade.category}:${label}:${explicitYears(accolade).join(",")}`;
};

const notesArray = (...values: unknown[]) =>
  values.flatMap((value) => {
    if (Array.isArray(value)) {
      return value
        .map((item) =>
          typeof item === "string" ? item.trim() : JSON.stringify(item),
        )
        .filter(Boolean);
    }
    if (typeof value === "string" && value.trim()) return [value.trim()];
    if (isRecord(value) && Object.keys(value).length > 0) {
      return [JSON.stringify(value)];
    }
    return [];
  });

const requiredArtifacts = [
  IMAGE_AUDIT_FILE,
  IMAGE_UNRESOLVED_FILE,
  IMAGE_DUPLICATES_FILE,
  STEP1B_PORTRAIT_SUMMARY_FILE,
  ACCOLADE_AUDIT_FILE,
  GENERATED_ACCOLADES_FILE,
  GENERATED_PORTRAITS_FILE,
  ...CONTACT_SHEET_BY_YEAR.values(),
  ...(!WRITE_MERGED ? [MERGED_AUDIT_FILE] : []),
];

const missingArtifacts = requiredArtifacts.filter(
  (filename) => !existsSync(filename),
);
if (missingArtifacts.length > 0) {
  console.error("Step 1 audit validation is waiting for generated artifacts:");
  for (const filename of missingArtifacts) {
    console.error(`- ${path.relative(ROOT, filename)}`);
  }
  console.error(
    "Generate the image/accolade artifacts, then rerun this validator" +
      (WRITE_MERGED
        ? "."
        : " (use --write-merged once to create the merged manifest)."),
  );
  process.exitCode = 1;
} else {
  const main = async () => {
    const schemaResult = playerSeedSchema.safeParse(
      allPlayersBeforeIdentityPruning,
    );
    check(
      schemaResult.success,
      `Live player-card schema is invalid: ${
        schemaResult.success
          ? ""
          : schemaResult.error.issues
              .slice(0, 8)
              .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
              .join("; ")
      }`,
    );

    const liveCards = allPlayersBeforeIdentityPruning;
    const liveById = new Map(liveCards.map((card) => [card.id, card]));
    const playableIds = new Set(playablePlayers.map((card) => card.id));
    const targetCards = liveCards.filter((card) =>
      TARGET_YEARS.includes(card.tournamentYear as TargetYear),
    );
    const targetById = new Map(targetCards.map((card) => [card.id, card]));
    const sourceBirthDates = birthDateByCardId();
    check(
      liveCards.length === 9_626,
      `Archive card count changed outside Step 1 scope: expected 9626, found ${liveCards.length}`,
    );
    check(
      new Set(liveCards.map((card) => card.playerIdentityId)).size === 7_254,
      "Archive identity count changed outside Step 1 scope",
    );
    const expectedTargetCountByYear: Record<TargetYear, number> = {
      2014: 736,
      2018: 736,
      2022: 831,
      2026: 1_247,
    };
    for (const year of TARGET_YEARS) {
      check(
        targetCards.filter((card) => card.tournamentYear === year).length ===
          expectedTargetCountByYear[year],
        `${year}: archive card count changed outside Step 1 scope`,
      );
    }
    check(
      targetCards.length === 3_550,
      `Portrait audit scope changed: expected 3550 cards, found ${targetCards.length}`,
    );

    const imageAudit = recordAt(
      readJson<unknown>(IMAGE_AUDIT_FILE),
      "image audit",
    );
    const imageCards = arrayAt<ImageAuditCard>(
      imageAudit.cards,
      "image audit cards",
    );
    exactCoverage(
      "Image audit",
      imageCards.map((card) => card.playerCardId),
      targetCards.map((card) => card.id),
    );
    check(
      Array.isArray(imageAudit.sourceDatasets) &&
        imageAudit.sourceDatasets.length > 0,
      "Image audit must record its source datasets",
    );

    const imageByCardId = new Map(
      imageCards.map((card) => [card.playerCardId, card]),
    );
    const actualImages: ActualImage[] = [];
    const verifiedIdentitiesBySoFifaId = new Map<string, Set<string>>();

    for (const image of imageCards) {
      const live = targetById.get(image.playerCardId);
      if (!live) continue;
      const edition = EDITION_BY_YEAR[live.tournamentYear as TargetYear];
      const expectedLocalPath = `/assets/players/game-faces/${live.id}.png`;
      const expectedBirthDate = sourceBirthDates.get(live.id);
      check(
        image.playerIdentityId === live.playerIdentityId,
        `${live.id}: image audit identity mismatch`,
      );
      check(
        image.displayName === live.playerName,
        `${live.id}: image audit display name mismatch`,
      );
      check(
        normalizeName(image.normalizedName) === normalizeName(live.playerName),
        `${live.id}: image audit normalized name mismatch`,
      );
      check(
        image.nationality === live.countryName,
        `${live.id}: image audit nationality mismatch`,
      );
      check(
        image.worldCupYear === live.tournamentYear,
        `${live.id}: image audit tournament year mismatch`,
      );
      check(Boolean(expectedBirthDate), `${live.id}: no source birth date found`);
      check(
        image.birthDate === expectedBirthDate,
        `${live.id}: image audit birth date mismatch`,
      );
      check(
        edition.aliases.includes(image.requiredGameEdition),
        `${live.id}: required edition must be ${edition.label}`,
      );
      check(
        image.requiredSoFifaVersion === edition.version,
        `${live.id}: required SoFIFA version must be ${edition.version}`,
      );
      check(
        image.localImagePath === expectedLocalPath,
        `${live.id}: local image path must be ${expectedLocalPath}`,
      );
      check(
        IMAGE_STATUS.has(image.imageValidationStatus),
        `${live.id}: unknown image status ${image.imageValidationStatus}`,
      );
      const verified = image.imageValidationStatus === "verified";
      check(
        image.finalPortraitStatus ===
          (verified ? "verified-portrait" : "photo-pending"),
        `${live.id}: final portrait status does not match validation status`,
      );
      if (verified) {
        check(
          image.unresolvedReason === null,
          `${live.id}: verified portrait must not retain an unresolved reason`,
        );
      } else {
        check(
          typeof image.unresolvedReason === "string" &&
            image.unresolvedReason.trim().length > 0,
          `${live.id}: Photo Pending portrait lacks a specific unresolved reason`,
        );
        check(
          notesArray(image.notes).includes(image.unresolvedReason ?? ""),
          `${live.id}: Photo Pending reason is not supported by its audit notes`,
        );
      }

      const absolutePath = path.join(
        ROOT,
        "public",
        expectedLocalPath.replace(/^\//, ""),
      );
      if (!verified) {
        check(
          !existsSync(absolutePath),
          `${live.id}: unresolved portrait must use Photo Pending, but ${expectedLocalPath} exists`,
        );
        check(
          notesArray(image.notes).length > 0,
          `${live.id}: unresolved portrait must record a reason`,
        );
        continue;
      }

      check(
        image.imageConfidence === "high",
        `${live.id}: a verified portrait must have high confidence`,
      );
      check(existsSync(absolutePath), `${live.id}: verified PNG is missing`);
      if (!existsSync(absolutePath)) continue;
      check(
        lstatSync(absolutePath).isFile(),
        `${live.id}: portrait must be a regular file, not a symlink`,
      );
      const buffer = await readFile(absolutePath);
      check(buffer.length > 8, `${live.id}: portrait is empty`);
      check(
        buffer.subarray(0, 8).equals(PNG_SIGNATURE),
        `${live.id}: .png file does not have a PNG signature`,
      );
      let metadata: Awaited<ReturnType<typeof sharp.prototype.metadata>>;
      try {
        metadata = await sharp(buffer, { animated: false }).metadata();
      } catch (error) {
        addFailure(
          `${live.id}: Sharp cannot decode the portrait: ${String(error)}`,
        );
        continue;
      }
      const width = metadata.width ?? 0;
      const height = metadata.height ?? 0;
      check(metadata.format === "png", `${live.id}: decoded format is not PNG`);
      check(
        width >= 32 && height >= 32 && width <= 4096 && height <= 4096,
        `${live.id}: invalid portrait dimensions ${width}x${height}`,
      );
      check(
        width / Math.max(1, height) >= 0.5 &&
          width / Math.max(1, height) <= 2,
        `${live.id}: implausible portrait aspect ratio ${width}x${height}`,
      );

      const actualSha256 = sha256(buffer);
      const actualDHash = await perceptualDHash(buffer);
      const actualVisualSha256 = await canonicalPixelSha256(buffer);
      check(
        /^[a-f0-9]{64}$/.test(image.imageSha256 ?? ""),
        `${live.id}: invalid SHA-256 field`,
      );
      check(
        image.imageSha256 === actualSha256,
        `${live.id}: SHA-256 does not match the PNG bytes`,
      );
      check(
        /^[a-f0-9]{16}$/.test(image.imageDHash ?? ""),
        `${live.id}: invalid 64-bit dHash field`,
      );
      check(
        image.imageDHash === actualDHash,
        `${live.id}: perceptual dHash does not match decoded pixels`,
      );
      check(
        /^[a-f0-9]{64}$/.test(image.imageVisualSha256 ?? ""),
        `${live.id}: invalid canonical-pixel SHA-256 field`,
      );
      check(
        image.imageVisualSha256 === actualVisualSha256,
        `${live.id}: canonical-pixel SHA-256 does not match decoded pixels`,
      );
      check(image.width === width, `${live.id}: recorded width is incorrect`);
      check(image.height === height, `${live.id}: recorded height is incorrect`);
      check(image.format === "png", `${live.id}: recorded format is not png`);

      const playerId = String(image.sofifaPlayerId ?? "");
      check(/^\d+$/.test(playerId), `${live.id}: missing numeric SoFIFA id`);
      if (/^\d+$/.test(playerId)) {
        const identities =
          verifiedIdentitiesBySoFifaId.get(playerId) ?? new Set<string>();
        identities.add(live.playerIdentityId);
        verifiedIdentitiesBySoFifaId.set(playerId, identities);
      }
      check(
        typeof image.sofifaSourcePage === "string" &&
          new RegExp(`/player/${playerId}(?:/|$|\\?)`).test(
            image.sofifaSourcePage,
          ),
        `${live.id}: SoFIFA source page does not match source player id`,
      );
      check(
        typeof image.sourceImageUrl === "string" &&
          new RegExp(`/${edition.version}_120\\.png(?:\\?|$)`).test(
            image.sourceImageUrl,
          ),
        `${live.id}: source image URL is not from ${edition.label}`,
      );
      if (/^\d+$/.test(playerId) && image.sourceImageUrl) {
        const padded = playerId.padStart(6, "0");
        const expectedPlayerPath = `/players/${padded.slice(
          0,
          3,
        )}/${padded.slice(3)}/`;
        check(
          image.sourceImageUrl.includes(expectedPlayerPath),
          `${live.id}: source image URL path does not match SoFIFA player id`,
        );
      }

      const evidence = recordAt(
        image.identityEvidence,
        `${live.id} identity evidence`,
      );
      check(
        normalizeName(String(evidence.normalizedCardName ?? "")) ===
          normalizeName(live.playerName),
        `${live.id}: identity evidence card name mismatch`,
      );
      check(
        typeof evidence.normalizedSoFifaName === "string" &&
          evidence.normalizedSoFifaName.trim().length > 0,
        `${live.id}: identity evidence lacks a normalized SoFIFA name`,
      );
      check(
        evidence.exactBirthDate === true,
        `${live.id}: identity evidence lacks exact DOB verification`,
      );
      check(
        evidence.nationalityMatch === true,
        `${live.id}: identity evidence lacks nationality verification`,
      );
      check(
        typeof evidence.nameSimilarity === "number" &&
          Number.isFinite(evidence.nameSimilarity) &&
          evidence.nameSimilarity > 0,
        `${live.id}: identity evidence lacks name similarity`,
      );
      check(
        typeof evidence.matchScore === "number" &&
          Number.isFinite(evidence.matchScore),
        `${live.id}: identity evidence lacks a match score`,
      );
      check(
        typeof evidence.mappingEvidence === "string" &&
          evidence.mappingEvidence.trim().length > 0 &&
          typeof evidence.verificationMethod === "string" &&
          evidence.verificationMethod.trim().length > 0,
        `${live.id}: identity evidence lacks its method/provenance`,
      );

      const editionEvidence = recordAt(
        image.editionEvidence,
        `${live.id} edition evidence`,
      );
      check(
        editionEvidence.strictEditionUrl === true &&
          editionEvidence.decodedStrictEditionBitmap === true &&
          editionEvidence.nonDefaultByCrossIdentityHash === true &&
          typeof editionEvidence.proofMethod === "string" &&
          editionEvidence.proofMethod.trim().length > 0,
        `${live.id}: strict-edition bitmap proof is incomplete`,
      );
      if (live.tournamentYear === 2014) {
        check(
          editionEvidence.sourceRowForExactVersion === false &&
            editionEvidence.exactVersionRealFace === false &&
            /cdn-only|no fifa 14 raw row|no fifa 14 .*row/i.test(
              String(editionEvidence.proofMethod),
            ),
          `${live.id}: FIFA 14 must disclose CDN-only edition proof and must not claim an exact raw row`,
        );
      } else {
        check(
          editionEvidence.sourceRowForExactVersion === true &&
            editionEvidence.exactVersionRealFace === true,
          `${live.id}: ${edition.label} lacks an exact-version real-face source row`,
        );
      }

      const reuse = recordAt(image.sourceReuse, `${live.id} source reuse`);
      check(
        Array.isArray(reuse.identicalBytesAcrossCards),
        `${live.id}: source reuse must list identical-byte cards`,
      );
      check(
        reuse.sameIdentityOnly === true,
        `${live.id}: verified source reuse must be limited to one identity`,
      );
      check(
        typeof reuse.disposition === "string" &&
          reuse.disposition.trim().length > 0,
        `${live.id}: source reuse must record a disposition`,
      );
      actualImages.push({
        card: image,
        absolutePath,
        sha256: actualSha256,
        dHash: actualDHash,
        visualSha256: actualVisualSha256,
        width,
        height,
      });
    }
    for (const [playerId, identityIds] of verifiedIdentitiesBySoFifaId) {
      check(
        identityIds.size === 1,
        `SoFIFA player id ${playerId} is assigned to multiple Trophy XI identities: ${[
          ...identityIds,
        ].join(", ")}`,
      );
    }

    const verifiedIds = new Set(
      imageCards
        .filter((card) => card.imageValidationStatus === "verified")
        .map((card) => card.playerCardId),
    );
    const publicFiles = existsSync(PUBLIC_FACE_DIRECTORY)
      ? readdirSync(PUBLIC_FACE_DIRECTORY)
      : [];
    const unexpectedPublicFiles = publicFiles.filter(
      (filename) =>
        filename !== ".gitkeep" &&
        (!filename.endsWith(".png") ||
          !verifiedIds.has(filename.replace(/\.png$/, ""))),
    );
    const missingPublicFiles = [...verifiedIds].filter(
      (id) => !publicFiles.includes(`${id}.png`),
    );
    check(
      unexpectedPublicFiles.length === 0,
      `Public face directory has unexpected files: ${unexpectedPublicFiles
        .slice(0, 12)
        .join(", ")}`,
    );
    check(
      missingPublicFiles.length === 0,
      `Public face directory is missing verified files: ${missingPublicFiles
        .slice(0, 12)
        .join(", ")}`,
    );

    const unresolvedAudit = recordAt(
      readJson<unknown>(IMAGE_UNRESOLVED_FILE),
      "unresolved image audit",
    );
    const unresolvedCards = arrayAt<ImageAuditCard>(
      unresolvedAudit.cards,
      "unresolved image cards",
    );
    const expectedUnresolvedIds = imageCards
      .filter((card) => card.imageValidationStatus !== "verified")
      .map((card) => card.playerCardId);
    exactCoverage(
      "Unresolved image report",
      unresolvedCards.map((card) => card.playerCardId),
      expectedUnresolvedIds,
    );
    for (const card of unresolvedCards) {
      check(
        card.imageValidationStatus !== "verified",
        `${card.playerCardId}: verified image leaked into unresolved report`,
      );
      check(
        canonicalJson(card) === canonicalJson(imageByCardId.get(card.playerCardId)),
        `${card.playerCardId}: unresolved report row differs from primary image audit`,
      );
    }
    const imageSummary = recordAt(
      imageAudit.summary,
      "image audit summary",
    );
    const finalPortraitStatuses = recordAt(
      imageSummary.finalPortraitStatuses,
      "image audit final portrait statuses",
    );
    check(
      finalPortraitStatuses["verified-portrait"] === verifiedIds.size &&
        finalPortraitStatuses["photo-pending"] ===
          expectedUnresolvedIds.length &&
        imageSummary.photoPendingWithSpecificReason ===
          expectedUnresolvedIds.length,
      "Image audit final portrait status summary is stale",
    );
    const unresolvedSummary = recordAt(
      unresolvedAudit.summary,
      "unresolved image audit summary",
    );
    check(
      unresolvedSummary.finalPortraitStatus === "photo-pending" &&
        unresolvedSummary.withSpecificUnresolvedReason ===
          expectedUnresolvedIds.length,
      "Unresolved image report does not prove a specific reason for every Photo Pending card",
    );

    const exactImagesByHash = new Map<string, ActualImage[]>();
    for (const image of actualImages) {
      exactImagesByHash.set(image.sha256, [
        ...(exactImagesByHash.get(image.sha256) ?? []),
        image,
      ]);
    }
    const actualExactGroups = [...exactImagesByHash].filter(
      ([, images]) => images.length > 1,
    );
    for (const [hash, images] of actualExactGroups) {
      const identities = new Set(
        images.map((image) => image.card.playerIdentityId),
      );
      check(
        identities.size === 1,
        `Unrelated players share exact portrait hash ${hash}: ${images
          .map((image) => image.card.playerCardId)
          .join(", ")}`,
      );
    }

    const canonicalImagesByHash = new Map<string, ActualImage[]>();
    for (const image of actualImages) {
      canonicalImagesByHash.set(image.visualSha256, [
        ...(canonicalImagesByHash.get(image.visualSha256) ?? []),
        image,
      ]);
    }
    const actualCanonicalPixelGroups = [...canonicalImagesByHash].filter(
      ([, images]) => images.length > 1,
    );
    for (const [hash, images] of actualCanonicalPixelGroups) {
      const identities = new Set(
        images.map((image) => image.card.playerIdentityId),
      );
      check(
        identities.size === 1,
        `Unrelated players share canonical portrait pixels ${hash}: ${images
          .map((image) => image.card.playerCardId)
          .join(", ")}`,
      );
    }

    const duplicateAudit = recordAt(
      readJson<unknown>(IMAGE_DUPLICATES_FILE),
      "duplicate image audit",
    );
    const duplicateSummary = recordAt(
      duplicateAudit.summary,
      "duplicate image audit summary",
    );
    const exactGroupRows = arrayAt<JsonRecord>(
      duplicateAudit.exactDuplicateGroups,
      "exact duplicate groups",
    );
    const canonicalPixelGroupRows = arrayAt<JsonRecord>(
      duplicateAudit.canonicalPixelDuplicateGroups,
      "canonical-pixel duplicate groups",
    );
    const rejectedCrossIdentityGroups = exactGroupRows.filter(
      (group) =>
        group.resolution === "rejected-cross-identity-placeholder-risk",
    );
    check(
      duplicateSummary.crossIdentityExactErrors ===
        rejectedCrossIdentityGroups.length,
      "Duplicate report cross-identity error summary is stale",
    );
    const exactGroupByHash = new Map(
      exactGroupRows.map((group) => [String(group.sha256), group]),
    );
    for (const [hash, images] of actualExactGroups) {
      const group = exactGroupByHash.get(hash);
      check(Boolean(group), `Exact duplicate hash ${hash} is not reported`);
      if (!group) continue;
      const recordedIds = arrayAt<string>(
        group.playerCardIds,
        `Exact duplicate ${hash} card ids`,
      ).sort();
      const actualIds = images
        .map((image) => image.card.playerCardId)
        .sort();
      check(
        canonicalJson(recordedIds) === canonicalJson(actualIds),
        `Exact duplicate ${hash} card list is incorrect`,
      );
      check(
        typeof group.resolution === "string" &&
          group.resolution.trim().length > 0 &&
          typeof group.notes === "string" &&
          group.notes.trim().length > 0,
        `Exact duplicate ${hash} lacks a recorded review/disposition`,
      );
    }
    check(
      duplicateSummary.canonicalPixelGroups ===
        actualCanonicalPixelGroups.length,
      "Duplicate report canonical-pixel group summary is stale",
    );
    const canonicalPixelGroupByHash = new Map(
      canonicalPixelGroupRows.map((group) => [
        String(group.visualSha256),
        group,
      ]),
    );
    for (const [hash, images] of actualCanonicalPixelGroups) {
      const group = canonicalPixelGroupByHash.get(hash);
      check(
        Boolean(group),
        `Canonical-pixel duplicate hash ${hash} is not reported`,
      );
      if (!group) continue;
      const recordedIds = arrayAt<string>(
        group.playerCardIds,
        `Canonical-pixel duplicate ${hash} card ids`,
      ).sort();
      const actualIds = images
        .map((image) => image.card.playerCardId)
        .sort();
      check(
        canonicalJson(recordedIds) === canonicalJson(actualIds),
        `Canonical-pixel duplicate ${hash} card list is incorrect`,
      );
      check(
        typeof group.resolution === "string" &&
          group.resolution.trim().length > 0 &&
          typeof group.notes === "string" &&
          group.notes.trim().length > 0,
        `Canonical-pixel duplicate ${hash} lacks a disposition`,
      );
    }
    check(
      canonicalPixelGroupRows.length === actualCanonicalPixelGroups.length,
      "Duplicate report contains stale canonical-pixel groups",
    );
    check(
      duplicateSummary.crossIdentityCanonicalPixelErrors === 0,
      "Cross-identity canonical-pixel errors remain",
    );

    const computedSimilarPairs = new Map<
      string,
      { first: ActualImage; second: ActualImage; distance: number }
    >();
    for (let firstIndex = 0; firstIndex < actualImages.length; firstIndex += 1) {
      const first = actualImages[firstIndex];
      for (
        let secondIndex = firstIndex + 1;
        secondIndex < actualImages.length;
        secondIndex += 1
      ) {
        const second = actualImages[secondIndex];
        if (
          first.card.playerIdentityId === second.card.playerIdentityId ||
          first.sha256 === second.sha256
        ) {
          continue;
        }
        const distance = hammingDistance(first.dHash, second.dHash);
        if (distance > SIMILAR_DHASH_DISTANCE) continue;
        const ids = [
          first.card.playerCardId,
          second.card.playerCardId,
        ].sort();
        computedSimilarPairs.set(ids.join("::"), {
          first,
          second,
          distance,
        });
      }
    }
    const similarRows = arrayAt<JsonRecord>(
      duplicateAudit.similarMatches,
      "similar image matches",
    );
    const similarByPair = new Map(
      similarRows.map((row) => {
        const ids = [String(row.cardA), String(row.cardB)].sort();
        return [ids.join("::"), row];
      }),
    );
    const actualImageByCardId = new Map(
      actualImages.map((image) => [image.card.playerCardId, image]),
    );
    for (const [pairId, pair] of computedSimilarPairs) {
      const row = similarByPair.get(pairId);
      check(Boolean(row), `Suspicious perceptual pair is unreported: ${pairId}`);
      if (!row) continue;
      check(
        row.hammingDistance === pair.distance,
        `${pairId}: recorded dHash distance is incorrect`,
      );
    }
    for (const row of similarRows) {
      const pairId = [String(row.cardA), String(row.cardB)].sort().join("::");
      const computed = computedSimilarPairs.get(pairId);
      check(
        Boolean(computed),
        `${pairId}: stale perceptual candidate is still reported`,
      );
      check(
        typeof row.notes === "string" && row.notes.trim().length > 0,
        `${pairId}: perceptual candidate lacks notes`,
      );
      if (MANUALLY_REVIEWED_ZERO_DHASH_PAIR_IDS.has(pairId)) {
        const reviewedAssetEvidence = recordAt(
          row.reviewedAssetEvidence,
          `${pairId} reviewed asset evidence`,
        );
        const reviewedCardA = recordAt(
          reviewedAssetEvidence.cardA,
          `${pairId} reviewed card A`,
        );
        const reviewedCardB = recordAt(
          reviewedAssetEvidence.cardB,
          `${pairId} reviewed card B`,
        );
        const actualCardA = actualImageByCardId.get(String(row.cardA));
        const actualCardB = actualImageByCardId.get(String(row.cardB));
        check(
          computed?.distance === 0,
          `${pairId}: persisted distance-zero review no longer has distance zero`,
        );
        check(
          row.reviewStatus === "manual-reviewed" &&
            row.reviewOutcome === "accepted-visually-distinct" &&
            row.reviewMethod === "side-by-side-visual-inspection" &&
            typeof row.reviewer === "string" &&
            row.reviewer.trim().length > 0 &&
            typeof row.reviewedAt === "string" &&
            /^\d{4}-\d{2}-\d{2}$/.test(row.reviewedAt),
          `${pairId}: manual visual disposition is incomplete`,
        );
        check(
          reviewedCardA.playerCardId === row.cardA &&
            reviewedCardA.imageSha256 === actualCardA?.sha256 &&
            reviewedCardA.canonicalPixelSha256 ===
              actualCardA?.visualSha256 &&
            reviewedCardB.playerCardId === row.cardB &&
            reviewedCardB.imageSha256 === actualCardB?.sha256 &&
            reviewedCardB.canonicalPixelSha256 ===
              actualCardB?.visualSha256,
          `${pairId}: manual review is not tied to the current asset hashes`,
        );
      } else {
        check(
          (computed?.distance ?? 0) > 0,
          `${pairId}: unreviewed distance-zero pair remains`,
        );
        check(
          row.reviewStatus === "automated-candidate" &&
            row.reviewOutcome === null &&
            row.reviewMethod === "dhash-threshold-screen" &&
            row.reviewer === null &&
            row.reviewedAt === null &&
            row.reviewedAssetEvidence === null,
          `${pairId}: automated perceptual candidate is mislabeled as manually reviewed`,
        );
      }
    }
    const manuallyReviewedRows = similarRows.filter(
      (row) => row.reviewStatus === "manual-reviewed",
    );
    const automatedCandidateRows = similarRows.filter(
      (row) => row.reviewStatus === "automated-candidate",
    );
    check(
      similarRows.length === computedSimilarPairs.size,
      "Duplicate report perceptual candidate coverage is stale",
    );
    check(
      manuallyReviewedRows.length ===
        MANUALLY_REVIEWED_ZERO_DHASH_PAIR_IDS.size &&
        [...MANUALLY_REVIEWED_ZERO_DHASH_PAIR_IDS].every((pairId) =>
          manuallyReviewedRows.some(
            (row) =>
              [String(row.cardA), String(row.cardB)]
                .sort()
                .join("::") === pairId,
          ),
        ),
      "The six genuine distance-zero manual reviews are incomplete",
    );
    check(
      duplicateSummary.perceptualCandidatePairs === similarRows.length &&
        duplicateSummary.reviewedSimilarPairs ===
          manuallyReviewedRows.length &&
        duplicateSummary.manuallyReviewedSimilarPairs ===
          manuallyReviewedRows.length &&
        duplicateSummary.automatedSimilarCandidates ===
          automatedCandidateRows.length,
      "Duplicate report perceptual review summary is stale",
    );
    check(
      imageSummary.canonicalPixelDuplicateGroups ===
        actualCanonicalPixelGroups.length &&
        imageSummary.crossIdentityCanonicalPixelDuplicateErrors === 0 &&
        imageSummary.perceptualCandidates === similarRows.length &&
        imageSummary.suspiciousPerceptualMatchesReviewed ===
          manuallyReviewedRows.length &&
        imageSummary.manuallyReviewedPerceptualPairs ===
          manuallyReviewedRows.length &&
        imageSummary.automatedPerceptualCandidates ===
          automatedCandidateRows.length,
      "Primary image audit Step 1B evidence summary is stale",
    );

    const generatedPortraits = recordAt(
      readJson<unknown>(GENERATED_PORTRAITS_FILE),
      "generated portrait registry",
    );
    const portraitRows = arrayAt<JsonRecord>(
      generatedPortraits.portraits,
      "generated portrait rows",
    );
    exactCoverage(
      "Generated portrait registry",
      portraitRows.map((row) => String(row.cardId)),
      [...verifiedIds],
    );
    const portraitById = new Map(
      portraitRows.map((row) => [String(row.cardId), row]),
    );
    for (const id of verifiedIds) {
      const image = imageByCardId.get(id)!;
      const row = portraitById.get(id);
      if (!row) continue;
      check(
        row.playerIdentityId === image.playerIdentityId &&
          row.tournamentYear === image.worldCupYear &&
          EDITION_BY_YEAR[image.worldCupYear as TargetYear].aliases.includes(
            String(row.gameEdition),
          ) &&
          String(row.soFifaPlayerId) === String(image.sofifaPlayerId) &&
          row.sourcePage === image.sofifaSourcePage &&
          row.sourceImageUrl === image.sourceImageUrl &&
          row.localPath === image.localImagePath &&
          row.sha256 === image.imageSha256,
        `${id}: generated portrait registry differs from audited image`,
      );
      check(
        typeof row.cacheVersion === "string" &&
          row.cacheVersion.trim().length > 0,
        `${id}: generated portrait lacks cache version`,
      );
    }

    for (const image of imageCards) {
      const runtime = imagesById.get(image.playerCardId);
      if (image.imageValidationStatus !== "verified") {
        check(
          runtime === undefined,
          `${image.playerCardId}: unresolved target card must render Photo Pending`,
        );
        continue;
      }
      const edition = EDITION_BY_YEAR[image.worldCupYear as TargetYear];
      check(Boolean(runtime), `${image.playerCardId}: runtime portrait is absent`);
      if (!runtime) continue;
      check(
        runtime.file === image.localImagePath &&
          runtime.exactTournamentImage === true &&
          runtime.fallback === false &&
          runtime.matchQuality === "edition-verified" &&
          edition.aliases.includes(runtime.gameEdition ?? ""),
        `${image.playerCardId}: runtime is not wired to its verified tournament-edition portrait`,
      );
    }

    for (const [year, filename] of CONTACT_SHEET_BY_YEAR) {
      const buffer = await readFile(filename);
      check(
        buffer.subarray(0, 8).equals(PNG_SIGNATURE),
        `${year} contact sheet is not a PNG`,
      );
      try {
        const metadata = await sharp(buffer, { animated: false }).metadata();
        check(
          metadata.format === "png" &&
            (metadata.width ?? 0) >= 800 &&
            (metadata.height ?? 0) >= 800,
          `${year} contact sheet has invalid format/dimensions`,
        );
      } catch (error) {
        addFailure(`${year} contact sheet cannot be decoded: ${String(error)}`);
      }
      check(
        statSync(filename).size > 10_000,
        `${year} contact sheet is unexpectedly small`,
      );
    }

    const step1bPortraitAudit = recordAt(
      readJson<unknown>(STEP1B_PORTRAIT_SUMMARY_FILE),
      "Step 1B portrait summary",
    );
    const step1bSummary = recordAt(
      step1bPortraitAudit.summary,
      "Step 1B portrait coverage summary",
    );
    check(
      step1bSummary.totalCards === imageCards.length &&
        step1bSummary.verifiedPortraits === verifiedIds.size &&
        step1bSummary.photoPending === expectedUnresolvedIds.length &&
        step1bSummary.photoPendingWithSpecificReason ===
          expectedUnresolvedIds.length &&
        step1bSummary.newlyPromotedPortraits === 0 &&
        step1bSummary.verifiedAssetsChanged === 0 &&
        step1bSummary.productionRegistryChanged === false,
      "Step 1B portrait coverage/preservation summary is stale",
    );
    const step1bUnresolvedReasons = recordAt(
      step1bPortraitAudit.unresolvedReasons,
      "Step 1B unresolved reasons",
    );
    check(
      step1bUnresolvedReasons.everyPhotoPendingCardHasSpecificReason === true,
      "Step 1B summary does not prove specific Photo Pending reasons",
    );
    const step1bDuplicateEvidence = recordAt(
      step1bPortraitAudit.duplicateEvidence,
      "Step 1B duplicate evidence",
    );
    const recordedManualPairIds = arrayAt<string>(
      step1bDuplicateEvidence.manualPairIds,
      "Step 1B manual perceptual pair ids",
    ).sort();
    check(
      step1bDuplicateEvidence.canonicalPixelDuplicateGroups ===
        actualCanonicalPixelGroups.length &&
        step1bDuplicateEvidence.crossIdentityCanonicalPixelErrors === 0 &&
        step1bDuplicateEvidence.perceptualCandidatePairs ===
          similarRows.length &&
        step1bDuplicateEvidence.manuallyReviewedDistanceZeroPairs ===
          manuallyReviewedRows.length &&
        step1bDuplicateEvidence.automatedNonzeroCandidates ===
          automatedCandidateRows.length &&
        canonicalJson(recordedManualPairIds) ===
          canonicalJson([...MANUALLY_REVIEWED_ZERO_DHASH_PAIR_IDS].sort()),
      "Step 1B duplicate evidence summary is stale",
    );
    const preservationEvidence = recordAt(
      step1bPortraitAudit.preservationEvidence,
      "Step 1B preservation evidence",
    );
    const expectedVerifiedAssetHashSet = sha256(
      actualImages
        .map(
          (image) =>
            `${image.card.playerCardId}:${image.sha256}:${image.visualSha256}`,
        )
        .sort()
        .join("\n"),
    );
    check(
      preservationEvidence.productionRegistryPath ===
        "/src/data/tournament-edition-player-portraits.generated.json" &&
        preservationEvidence.productionRegistrySha256 ===
          sha256(readFileSync(GENERATED_PORTRAITS_FILE)) &&
        preservationEvidence.verifiedAssetHashSetSha256 ===
          expectedVerifiedAssetHashSet &&
        preservationEvidence.verifiedAssetCount === actualImages.length,
      "Step 1B production portrait preservation evidence is stale",
    );
    const recordedContactSheets = arrayAt<JsonRecord>(
      preservationEvidence.contactSheets,
      "Step 1B contact-sheet preservation evidence",
    );
    for (const [year, filename] of CONTACT_SHEET_BY_YEAR) {
      const recorded = recordedContactSheets.find(
        (row) => row.tournamentYear === year,
      );
      check(
        Boolean(recorded) &&
          recorded?.path === `/${path.relative(ROOT, filename)}` &&
          recorded?.sha256 === sha256(readFileSync(filename)) &&
          recorded?.regenerated === false &&
          typeof recorded?.disposition === "string" &&
          recorded.disposition.includes("PHOTO PENDING"),
        `${year}: Step 1B contact-sheet preservation evidence is stale`,
      );
    }

    const accoladeAudit = recordAt(
      readJson<unknown>(ACCOLADE_AUDIT_FILE),
      "accolade audit",
    );
    const accoladeCards = arrayAt<AccoladeAuditCard>(
      accoladeAudit.cards,
      "accolade audit cards",
    );
    exactCoverage(
      "Accolade audit",
      accoladeCards.map((card) => card.playerCardId),
      liveCards.map((card) => card.id),
    );
    const accoladeByCardId = new Map(
      accoladeCards.map((card) => [card.playerCardId, card]),
    );

    const generatedAccolades = recordAt(
      readJson<unknown>(GENERATED_ACCOLADES_FILE),
      "generated card accolades",
    );
    const generatedAccoladeCards = recordAt(
      generatedAccolades.cards,
      "generated card accolade map",
    );
    exactCoverage(
      "Generated card accolade map",
      Object.keys(generatedAccoladeCards),
      liveCards.map((card) => card.id),
    );
    const fbrefMap = new Map(
      (
        fbrefMapJson as Array<{
          playerIdentityId: string;
          fbrefId: string;
          sourceUrl: string;
        }>
      ).map((row) => [row.playerIdentityId, row]),
    );
    const identitiesByFbrefId = new Map<string, Set<string>>();
    const identitiesByTransfermarktId = new Map<string, Set<string>>();

    for (const audit of accoladeCards) {
      const live = liveById.get(audit.playerCardId);
      if (!live) continue;
      const expectedBirthDate = sourceBirthDates.get(live.id);
      const cutoffDate = TOURNAMENT_END_DATE_BY_YEAR.get(live.tournamentYear);
      check(
        Boolean(cutoffDate),
        `${live.id}: tournament end date is not configured`,
      );
      if (!cutoffDate) continue;
      check(
        audit.playerIdentityId === live.playerIdentityId,
        `${live.id}: accolade audit identity mismatch`,
      );
      check(
        audit.displayName === live.playerName,
        `${live.id}: accolade audit display name mismatch`,
      );
      check(
        normalizeName(audit.normalizedName) === normalizeName(live.playerName),
        `${live.id}: accolade audit normalized name mismatch`,
      );
      check(
        audit.dateOfBirth === expectedBirthDate,
        `${live.id}: accolade audit birth date mismatch`,
      );
      check(
        audit.nationality?.code === live.countryCode &&
          audit.nationality?.name === live.countryName,
        `${live.id}: accolade audit nationality mismatch`,
      );
      check(
        audit.worldCupYear === live.tournamentYear,
        `${live.id}: accolade audit tournament year mismatch`,
      );
      check(
        audit.accoladeCutoffDate === cutoffDate,
        `${live.id}: accolade cutoff must be ${cutoffDate}`,
      );
      check(
        ACCOLADE_STATUS.has(audit.accoladeAuditStatus),
        `${live.id}: unknown accolade status ${audit.accoladeAuditStatus}`,
      );
      check(
        Array.isArray(audit.originalAccolades),
        `${live.id}: original accolades must be recorded`,
      );
      check(
        Array.isArray(audit.correctedAccolades),
        `${live.id}: corrected accolades must be recorded`,
      );
      check(
        Array.isArray(audit.sourcesChecked),
        `${live.id}: checked sources must be recorded`,
      );
      check(
        Array.isArray(audit.unresolvedIssues),
        `${live.id}: unresolved issues must be recorded`,
      );

      const generated = recordAt(
        generatedAccoladeCards[live.id],
        `${live.id} generated accolades`,
      );
      const generatedList = arrayAt<PlayerAccolade>(
        generated.accolades,
        `${live.id} generated accolade list`,
      );
      check(
        generated.cutoffDate === cutoffDate,
        `${live.id}: generated accolade cutoff is incorrect`,
      );
      check(
        canonicalJson(generatedList) === canonicalJson(audit.correctedAccolades),
        `${live.id}: generated accolades differ from the audit`,
      );
      const identityAccolades =
        identityCareerAccolades.identities[live.playerIdentityId]?.accolades;
      check(
        Boolean(identityAccolades) &&
          canonicalJson(live.careerAccolades) ===
            canonicalJson(identityAccolades),
        `${live.id}: runtime accolades differ from identity-level full-career data`,
      );
      const cardSchemaResult = playerCardSchema.safeParse({
        ...live,
        careerAccolades: generatedList,
      });
      check(
        cardSchemaResult.success,
        `${live.id}: corrected accolades are incompatible with PlayerAccolade schema`,
      );

      const ids = new Set<string>();
      const normalizedKeys = new Set<string>();
      for (const accolade of generatedList) {
        check(
          !ids.has(accolade.id),
          `${live.id}: duplicate corrected accolade id ${accolade.id}`,
        );
        ids.add(accolade.id);
        const normalizedKey = normalizedAccoladeKey(accolade);
        check(
          !normalizedKeys.has(normalizedKey),
          `${live.id}: duplicate/alias accolade remains: ${accolade.label}`,
        );
        normalizedKeys.add(normalizedKey);
        check(
          accolade.verified === true &&
            typeof accolade.sourceName === "string" &&
            accolade.sourceName.trim().length > 0,
          `${live.id}/${accolade.id}: corrected accolade is not verified/sourced`,
        );
        const fbrefIdentityChecks = isRecord(audit.fbrefIdentityChecks)
          ? audit.fbrefIdentityChecks
          : {};
        check(
          accolade.sourceName !== "FBref" ||
            fbrefIdentityChecks.identityVerified === true,
          `${live.id}/${accolade.id}: FBref accolade lacks a fully verified cached FBref identity`,
        );
        check(
          accolade.sourceName !== "Completed 2026 archive" &&
            !accolade.sourceUrl?.includes("SquadLists-English.pdf"),
          `${live.id}/${accolade.id}: roster PDF is not valid evidence for a 2026 winner/award`,
        );
        const futureYears = explicitYears(accolade).filter(
          (year) => year > live.tournamentYear,
        );
        check(
          futureYears.length === 0,
          `${live.id}/${accolade.id}: future accolade leaks past cutoff (${futureYears.join(
            ", ",
          )})`,
        );
        const postCutoffDates = explicitDates(accolade).filter(
          (date) => date > cutoffDate,
        );
        check(
          postCutoffDates.length === 0,
          `${live.id}/${accolade.id}: accolade date is after tournament end (${postCutoffDates.join(
            ", ",
          )})`,
        );
        check(
          !/(runner[- ]?up|finalist|second place|nominee|nomination|shortlist|participant|participation|world cup squad)/i.test(
            `${accolade.label} ${accolade.description ?? ""}`,
          ),
          `${live.id}/${accolade.id}: non-winning participation/result is stored as an accolade`,
        );
      }

      for (const removed of arrayAt<AccoladeAuditCard["removedAccolades"][number]>(
        audit.removedAccolades,
        `${live.id} removed accolades`,
      )) {
        check(
          typeof removed.reason === "string" && removed.reason.trim().length > 0,
          `${live.id}: removed accolade lacks a reason`,
        );
        check(
          Array.isArray(removed.explicitYears),
          `${live.id}: removed accolade lacks explicit-year evidence`,
        );
        if (/future/i.test(removed.reason)) {
          check(
            removed.explicitYears.some((year) => year > live.tournamentYear) ||
              (removed.earnedThroughYear ?? 0) > live.tournamentYear,
            `${live.id}: future-accolade removal lacks a post-cutoff year`,
          );
        } else if (/same-year.*cutoff/i.test(removed.reason)) {
          check(
            removed.explicitYears.includes(live.tournamentYear) ||
              removed.earnedThroughYear === live.tournamentYear,
            `${live.id}: same-year cutoff removal lacks the cutoff year`,
          );
        }
      }

      const mappedFbref = fbrefMap.get(live.playerIdentityId);
      const reviewedCardOverride = REVIEWED_CARD_SOURCE_OVERRIDES.get(
        live.id,
      );
      if (reviewedCardOverride) {
        check(
          audit.sourcePlayerName ===
            reviewedCardOverride.sourcePlayerName &&
            audit.fbrefPlayerId ===
              reviewedCardOverride.fbrefPlayerId &&
            audit.fbrefPage === reviewedCardOverride.fbrefPage &&
            audit.transfermarktPlayerId ===
              reviewedCardOverride.transfermarktPlayerId &&
            generatedList.length === 0 &&
            audit.accoladeAuditStatus === "unresolved",
          `${live.id}: reviewed twin-specific source assignment is incorrect or leaked cross-player accolades`,
        );
      }
      if (REJECT_IDENTITY_WIDE_SOURCE_IDS.has(live.playerIdentityId)) {
        check(
          audit.fbrefPlayerId === null &&
            audit.fbrefPage === null &&
            audit.transfermarktPlayerId === null &&
            audit.transfermarktPage === null &&
            generatedList.length === 0 &&
            audit.accoladeAuditStatus === "unresolved",
          `${live.id}: conflicting per-card birth dates must reject every identity-wide external source assignment`,
        );
      }
      if (audit.fbrefPlayerId || audit.fbrefPage) {
        if (audit.fbrefPlayerId) {
          const identities =
            identitiesByFbrefId.get(audit.fbrefPlayerId) ?? new Set<string>();
          identities.add(live.playerIdentityId);
          identitiesByFbrefId.set(audit.fbrefPlayerId, identities);
        }
        check(
          Boolean(
            reviewedCardOverride
              ? audit.fbrefPlayerId ===
                  reviewedCardOverride.fbrefPlayerId &&
                audit.fbrefPage === reviewedCardOverride.fbrefPage
              : mappedFbref &&
                audit.fbrefPlayerId === mappedFbref.fbrefId &&
                audit.fbrefPage === mappedFbref.sourceUrl,
          ),
          `${live.id}: FBref identity/page differs from reviewed map`,
        );
      }
      if (audit.transfermarktPlayerId) {
        const identities =
          identitiesByTransfermarktId.get(audit.transfermarktPlayerId) ??
          new Set<string>();
        identities.add(live.playerIdentityId);
        identitiesByTransfermarktId.set(
          audit.transfermarktPlayerId,
          identities,
        );
      }
      if (audit.transfermarktPage) {
        check(
          URL.canParse(audit.transfermarktPage) &&
            new URL(audit.transfermarktPage).hostname.endsWith(
              "transfermarkt.com",
            ),
          `${live.id}: invalid Transfermarkt source page`,
        );
      }
      const transfermarktEvidence = isRecord(audit.transfermarktEvidence)
        ? audit.transfermarktEvidence
        : {};
      const transfermarktIdentityMatch = isRecord(
        transfermarktEvidence.identityMatch,
      )
        ? transfermarktEvidence.identityMatch
        : {};
      const transfermarktIdentityEvidence = isRecord(
        transfermarktIdentityMatch.evidence,
      )
        ? transfermarktIdentityMatch.evidence
        : {};
      if (
        transfermarktIdentityMatch.status === "matched" &&
        transfermarktIdentityEvidence.nationalityMatches !== true
      ) {
        check(
          transfermarktIdentityEvidence.corroboratedByCachedFbrefLink ===
            true,
          `${live.id}: Transfermarkt match lacks both nationality context and exact cached-FBref corroboration`,
        );
      }

      if (audit.accoladeAuditStatus === "verified") {
        check(
          audit.sourcesChecked.length >= 2 &&
            audit.unresolvedIssues.length === 0,
          `${live.id}: verified status requires complete cross-checked sources`,
        );
        check(
          generatedList.every((accolade) => Boolean(accolade.sourceUrl)),
          `${live.id}: verified accolade record has a source URL gap`,
        );
      } else if (audit.accoladeAuditStatus === "verified-no-accolades") {
        check(
          generatedList.length === 0 &&
            Boolean(audit.fbrefPage) &&
            Boolean(audit.transfermarktPage) &&
            audit.sourcesChecked.length >= 2 &&
            audit.unresolvedIssues.length === 0,
          `${live.id}: verified-no-accolades requires negative evidence from both primary sources`,
        );
      } else if (audit.accoladeAuditStatus === "partially-verified") {
        check(
          audit.sourcesChecked.length > 0 && audit.unresolvedIssues.length > 0,
          `${live.id}: partially-verified status must state checked evidence and remaining uncertainty`,
        );
      } else if (audit.accoladeAuditStatus === "unresolved") {
        check(
          audit.unresolvedIssues.length > 0,
          `${live.id}: unresolved status must explain what remains unresolved`,
        );
      }

      const ambiguousCutoffYearAccolades = generatedList.filter((accolade) => {
        const years = explicitYears(accolade);
        return (
          years.includes(live.tournamentYear) &&
          !/world cup/i.test(
            `${accolade.label} ${accolade.description ?? ""}`,
          ) &&
          !/\b(?:19|20)\d{2}-\d{2}-\d{2}\b/.test(
            `${accolade.label} ${accolade.description ?? ""}`,
          )
        );
      });
      if (ambiguousCutoffYearAccolades.length > 0) {
        check(
          audit.accoladeAuditStatus === "partially-verified" ||
            audit.accoladeAuditStatus === "unresolved",
          `${live.id}: same-year season/accolade timing is ambiguous relative to ${cutoffDate}, so status cannot be fully verified`,
        );
      }
    }
    for (const [
      cardId,
      accoladeId,
      expectedCount,
    ] of DOMESTIC_LEAGUE_REGRESSIONS) {
      const cardAccolades = isRecord(generatedAccoladeCards[cardId])
        ? arrayAt<PlayerAccolade>(
            generatedAccoladeCards[cardId].accolades,
            `${cardId} generated legacy accolades`,
          )
        : [];
      const accolade = cardAccolades.find(
        (candidate) => candidate.id === accoladeId,
      );
      const actualCount = accolade?.count ?? (accolade ? 1 : 0);
      check(
        actualCount === expectedCount,
        `${cardId}/${accoladeId}: competition-specific title count is ${actualCount}; expected ${expectedCount}`,
      );
    }
    for (const [fbrefId, identityIds] of identitiesByFbrefId) {
      check(
        identityIds.size === 1,
        `FBref player id ${fbrefId} is assigned to multiple Trophy XI identities: ${[
          ...identityIds,
        ].join(", ")}`,
      );
    }
    for (const [transfermarktId, identityIds] of identitiesByTransfermarktId) {
      check(
        identityIds.size === 1,
        `Transfermarkt player id ${transfermarktId} is assigned to multiple Trophy XI identities: ${[
          ...identityIds,
        ].join(", ")}`,
      );
    }

    const runtimeSourceFiles = (() => {
      const found: string[] = [];
      const visit = (directory: string) => {
        for (const entry of readdirSync(directory, { withFileTypes: true })) {
          const filename = path.join(directory, entry.name);
          if (entry.isDirectory()) {
            visit(filename);
          } else if (
            /\.(?:ts|tsx|js|jsx)$/.test(entry.name) &&
            !/\.test\.[^.]+$/.test(entry.name)
          ) {
            found.push(filename);
          }
        }
      };
      visit(path.join(ROOT, "src"));
      return found;
    })();
    const remoteRuntimeRequests: string[] = [];
    for (const filename of runtimeSourceFiles) {
      const source = readFileSync(filename, "utf8");
      const directFetchPattern =
        /fetch\s*\([\s\S]{0,800}?(?:sofifa\.com|cdn\.sofifa\.net|fbref\.com|transfermarkt\.[a-z.]+)/gi;
      if (directFetchPattern.test(source)) {
        remoteRuntimeRequests.push(path.relative(ROOT, filename));
      }
    }
    check(
      remoteRuntimeRequests.length === 0,
      `Production source makes runtime audit-source requests: ${remoteRuntimeRequests.join(
        ", ",
      )}`,
    );

    const mergedCards = liveCards.map((live) => {
      const image = imageByCardId.get(live.id);
      const accolade = accoladeByCardId.get(live.id)!;
      return {
        playerCardId: live.id,
        playerIdentityId: live.playerIdentityId,
        displayName: live.playerName,
        normalizedName: normalizeName(live.playerName),
        dateOfBirth: sourceBirthDates.get(live.id) ?? null,
        nationality: live.countryName,
        worldCupYear: live.tournamentYear,
        requiredGameEdition: image?.requiredGameEdition ?? null,
        sofifaPlayerId: image?.sofifaPlayerId ?? null,
        sofifaSourcePage: image?.sofifaSourcePage ?? null,
        localImagePath: image?.localImagePath ?? null,
        imageSha256: image?.imageSha256 ?? null,
        perceptualImageHash: image?.imageDHash ?? null,
        imageValidationStatus:
          image?.imageValidationStatus ?? "not-in-step1-portrait-scope",
        imageConfidence: image?.imageConfidence ?? "not-applicable",
        transfermarktPlayerId: accolade.transfermarktPlayerId,
        transfermarktPage: accolade.transfermarktPage,
        fbrefPlayerId: accolade.fbrefPlayerId,
        fbrefPage: accolade.fbrefPage,
        originalAccolades: accolade.originalAccolades,
        correctedAccolades: accolade.correctedAccolades,
        accoladeCutoffDate: accolade.accoladeCutoffDate,
        accoladeAuditStatus: accolade.accoladeAuditStatus,
        notesOrUnresolvedIssues: notesArray(
          image?.notes,
          accolade.notes,
          accolade.unresolvedIssues,
        ),
      };
    });
    const mergedSummary = {
      playerCards: liveCards.length,
      playablePlayerCards: playableIds.size,
      portraitScopeCards: targetCards.length,
      verifiedPortraits: imageCards.filter(
        (card) => card.imageValidationStatus === "verified",
      ).length,
      unresolvedPortraits: imageCards.filter(
        (card) => card.imageValidationStatus !== "verified",
      ).length,
      accoladeStatuses: Object.fromEntries(
        [...ACCOLADE_STATUS].map((status) => [
          status,
          accoladeCards.filter(
            (card) => card.accoladeAuditStatus === status,
          ).length,
        ]),
      ),
      top100CutoffPolicy:
        "top100Player is intentionally excluded from the earned-accolade cutoff invariant: it is an identity-level retrospective curation marker, not a trophy or award.",
    };
    if (WRITE_MERGED) {
      if (failures.length === 0) {
        await writeFile(
          MERGED_AUDIT_FILE,
          `${JSON.stringify(
            {
              version: 1,
              generatedAt: new Date().toISOString(),
              scope:
                "All Trophy XI archive player cards; portrait replacement is limited to 2014, 2018, 2022, and 2026, while accolades are audited for every card.",
              summary: mergedSummary,
              cards: mergedCards,
            },
            null,
            2,
          )}\n`,
        );
        console.log(
          `Wrote ${path.relative(ROOT, MERGED_AUDIT_FILE)} (${mergedCards.length} cards).`,
        );
      }
    } else {
      const mergedAudit = recordAt(
        readJson<unknown>(MERGED_AUDIT_FILE),
        "merged Step 1 audit",
      );
      const recordedMergedCards = arrayAt<JsonRecord>(
        mergedAudit.cards,
        "merged Step 1 cards",
      );
      exactCoverage(
        "Merged Step 1 audit",
        recordedMergedCards.map((card) => String(card.playerCardId)),
        liveCards.map((card) => card.id),
      );
      check(
        canonicalJson(recordedMergedCards) === canonicalJson(mergedCards),
        "Merged Step 1 audit is stale or differs from the image/accolade source audits",
      );
      check(
        canonicalJson(mergedAudit.summary) === canonicalJson(mergedSummary),
        "Merged Step 1 audit summary is stale",
      );
    }

    if (failures.length > 0) {
      console.error(`Step 1 player audit failed (${failures.length} issues):`);
      for (const failure of failures.slice(0, 200)) {
        console.error(`- ${failure}`);
      }
      if (failures.length > 200) {
        console.error(`- …and ${failures.length - 200} more`);
      }
      process.exitCode = 1;
      return;
    }

    console.log(
      [
        "Step 1 player audit passed.",
        `${liveCards.length} archive cards represented.`,
        `${targetCards.length} portrait-scope cards (${actualImages.length} verified, ${expectedUnresolvedIds.length} Photo Pending).`,
        `${accoladeCards.length} card-specific accolade audits.`,
        `${manuallyReviewedRows.length} distance-zero perceptual pairs manually reviewed; ${automatedCandidateRows.length} nonzero pairs retained as automated candidates.`,
        "No runtime SoFIFA/FBref/Transfermarkt requests detected.",
      ].join(" "),
    );
  };

  void main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
