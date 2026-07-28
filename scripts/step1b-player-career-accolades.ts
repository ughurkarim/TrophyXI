import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import legacyCardAccoladesJson from "../src/data/player-accolades-by-card.generated.json";
import careerArchiveJson from "../src/data/player-career.generated.json";
import type {
  PlayerAccolade,
  PlayerAccoladeCategory,
  PlayerCareerStats,
} from "../src/types/game";

type JsonRecord = Record<string, unknown>;

type CareerArchive = {
  generatedAt: string;
  players: Record<
    string,
    {
      careerStats: PlayerCareerStats | null;
      accolades: PlayerAccolade[];
      top100Player: boolean;
    }
  >;
};

type LegacyCardAccoladeArchive = {
  generatedAt: string;
  cards: Record<
    string,
    {
      cutoffDate: string;
      accolades: PlayerAccolade[];
    }
  >;
};

type SourceSeason = {
  raw: string;
  startYear: number;
  endYear: number;
  kind: "season" | "calendar-year";
  context: string | null;
};

type SourceTitleGroup = {
  title: string;
  normalizedTitle: string;
  seasons: SourceSeason[];
};

type AuditedCard = {
  id: string;
  playerIdentityId: string;
  playerName: string;
  countryName: string;
  tournamentYear: number;
  primaryPosition: string | null;
};

type NormalizedAchievement = {
  normalizedKey: string;
  normalizedLabel: string;
  displayLabel: string;
  count: number;
  seasonsOrYears: string[];
  clubsOrNationalTeams: string[];
  category: PlayerAccoladeCategory;
  transfermarktSource: {
    playerId: string;
    url: string;
  } | null;
  fbrefSource: {
    playerId: string;
    url: string;
  } | null;
  verificationStatus: "verified-source-page" | "verified-stored-source";
};

type CanonicalCandidate = {
  accolade: PlayerAccolade;
  normalized: NormalizedAchievement;
  family: string;
  sourcePriority: number;
};

const ROOT = process.cwd();
const LEGACY_AUDIT_FILE = path.join(
  ROOT,
  "reports",
  "step1-player-accolade-audit.json",
);
const DISPLAY_OUTPUT_FILE = path.join(
  ROOT,
  "src",
  "data",
  "player-career-accolades-by-identity.generated.json",
);
const IDENTITY_AUDIT_FILE = path.join(
  ROOT,
  "reports",
  "step1b-career-accolade-audit.json",
);
const MULTI_CARD_FILE = path.join(
  ROOT,
  "reports",
  "step1b-multi-card-accolade-consistency.json",
);
const SUMMARY_FILE = path.join(
  ROOT,
  "reports",
  "step1b-career-accolade-summary.json",
);
const PORTRAIT_SUMMARY_FILE = path.join(
  ROOT,
  "reports",
  "step1b-player-portrait-summary.json",
);
const COMBINED_SUMMARY_FILE = path.join(
  ROOT,
  "reports",
  "step1b-summary.json",
);

const careerArchive = careerArchiveJson as unknown as CareerArchive;
const legacyCardAccolades =
  legacyCardAccoladesJson as unknown as LegacyCardAccoladeArchive;

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const recordAt = (value: unknown, label: string): JsonRecord => {
  if (!isRecord(value)) throw new Error(`${label} must be an object`);
  return value;
};

const arrayAt = <T>(value: unknown, label: string): T[] => {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  return value as T[];
};

const stringAt = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;

const normalizeText = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

const slugify = (value: string) =>
  normalizeText(value).replace(/\s+/g, "-") || "career-accolade";

const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex");

const canonicalJson = (value: unknown) => JSON.stringify(value);

const explicitYears = (value: string) => {
  const years = new Set<number>();
  for (const match of value.matchAll(/\b(19|20)\d{2}\b/g)) {
    years.add(Number(match[0]));
  }
  for (const match of value.matchAll(/\b(\d{2})[/-](\d{2})\b/g)) {
    const start = Number(match[1]);
    const end = Number(match[2]);
    const startYear = start >= 70 ? 1900 + start : 2000 + start;
    const endYear = end >= 70 ? 1900 + end : 2000 + end;
    years.add(startYear);
    years.add(endYear);
  }
  for (const match of value.matchAll(/\b((?:19|20)\d{2})[/-](\d{2})\b/g)) {
    const startYear = Number(match[1]);
    const end = Number(match[2]);
    const century = Math.floor(startYear / 100) * 100;
    const endYear =
      century + end < startYear ? century + 100 + end : century + end;
    years.add(startYear);
    years.add(endYear);
  }
  return [...years].sort((first, second) => first - second);
};

const disallowedAccolade = (accolade: PlayerAccolade) => {
  const identityText = normalizeText(`${accolade.id} ${accolade.label}`);
  const allText = normalizeText(
    `${accolade.id} ${accolade.label} ${accolade.description ?? ""}`,
  );
  return (
    /\b(runner up|runners up|finalist|semi finalist|semifinalist|third place|fourth place|nominee|nomination|shortlist|participation|participant)\b/.test(
      allText,
    ) ||
    /\b(squad|world cup squad)\b/.test(identityText) ||
    /\b(youth|(?:under|u) ?(?:15|16|17|18|19|20|21|22|23)|friendly|super cup|supercup|supercopa|recopa|coupe gambardella|intertoto|ui cup)\b/.test(
      allText,
    ) ||
    /\b(2nd tier|second tier|second league|ligue 2|serie b|segunda division|2 bundesliga|bavarian cup|middle rhine cup|saxony cup)\b/.test(
      allText,
    )
  );
};

const normalizedFamily = (label: string, description = "") => {
  const normalizedLabel = normalizeText(label);
  const text = normalizeText(`${label} ${description}`);
  if (/\b(top goalscorer|top goal scorer|top scorer)\b/.test(normalizedLabel)) {
    return normalizedLabel.replace(/\s+/g, "-");
  }
  if (/club world cup/.test(text)) {
    return "fifa-club-world-cup-winner";
  }
  if (
    /\bworld cup\b/.test(text) &&
    /\b(champion|winner)\b/.test(text)
  ) {
    return "fifa-world-cup-champion";
  }
  for (const award of [
    "golden ball",
    "silver ball",
    "bronze ball",
    "golden boot",
    "silver boot",
    "bronze boot",
    "golden glove",
  ]) {
    if (text.includes(award)) {
      return `${text.includes("world cup") ? "fifa-world-cup-" : ""}${award.replace(/\s+/g, "-")}`;
    }
  }
  if (/champions league|european champion clubs cup/.test(text)) {
    return "uefa-champions-league-champion";
  }
  if (/conmebol uefa cup of champions/.test(text)) {
    return "conmebol-uefa-cup-of-champions-winner";
  }
  if (/\b(europa league|uefa cup)\b/.test(text)) {
    return "uefa-europa-league-champion";
  }
  if (/conference league/.test(text)) {
    return "uefa-conference-league-champion";
  }
  if (/concacaf champions cup/.test(text)) {
    return "concacaf-champions-cup-champion";
  }
  if (/\bgold cup\b/.test(text)) {
    return "concacaf-gold-cup-champion";
  }
  if (
    /\b(uefa european championship|european championship|european champion)\b/.test(
      text,
    )
  ) {
    return "uefa-european-championship-champion";
  }
  if (/copa libertadores/.test(text)) {
    return "copa-libertadores-champion";
  }
  if (/domestic league champion/.test(text)) {
    return "domestic-league-champion";
  }
  if (/domestic cup (winner|champion)/.test(text)) {
    return "domestic-cup-winner";
  }
  if (
    /\b(la liga best player|laliga player of the year)\b/.test(text)
  ) {
    return "la-liga-player-of-the-year";
  }
  if (
    /\b(uefa best player in europe|uefa men s player of the year)\b/.test(
      text,
    )
  ) {
    return "uefa-mens-player-of-the-year";
  }
  if (
    /\b(belgian footballer of the year|jupiler pro league player of the year)\b/.test(
      text,
    )
  ) {
    return "belgian-pro-league-player-of-the-year";
  }
  return normalizeText(label)
    .replace(/\b(winner|champion)\b/g, "champion")
    .replace(/\b(19|20)\d{2}\b/g, "")
    .replace(/\b\d{2}[/-]\d{2}\b/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s+/g, "-");
};

const normalizedKeyFor = (
  category: PlayerAccoladeCategory,
  family: string,
  years: number[],
) => `${category}:${family}:${years.join(",")}`;

const sourcePriorityFor = (sourceName: string) => {
  if (sourceName === "Transfermarkt") return 4;
  if (sourceName === "FBref") return 3;
  if (/FIFA|World Cup|Fjelstul/i.test(sourceName)) return 2;
  return 1;
};

const normalizedStoredCandidate = (
  accolade: PlayerAccolade,
  fbrefSource: NormalizedAchievement["fbrefSource"],
): CanonicalCandidate | null => {
  if (
    disallowedAccolade(accolade) ||
    accolade.verified !== true ||
    !accolade.sourceName.trim()
  ) {
    return null;
  }
  const years = explicitYears(
    `${accolade.id} ${accolade.label} ${accolade.description ?? ""}`,
  );
  const inferredCategory = sourceTitleCategory(
    normalizeText(`${accolade.label} ${accolade.description ?? ""}`),
  );
  const category = inferredCategory ?? accolade.category;
  const family = normalizedFamily(
    accolade.label,
    accolade.description,
  );
  const count = accolade.count ?? 1;
  const normalizedKey = normalizedKeyFor(
    category,
    family,
    years,
  );
  return {
    accolade: {
      ...accolade,
      category,
      count: count > 1 ? count : accolade.count,
    },
    family,
    sourcePriority: sourcePriorityFor(accolade.sourceName),
    normalized: {
      normalizedKey,
      normalizedLabel: family,
      displayLabel: accolade.label,
      count,
      seasonsOrYears: years.map(String),
      clubsOrNationalTeams: [],
      category,
      transfermarktSource: null,
      fbrefSource:
        accolade.sourceName === "FBref" ? fbrefSource : null,
      verificationStatus: "verified-stored-source",
    },
  };
};

const titleCase = (value: string) =>
  value
    .split(/\s+/)
    .map((part) => {
      const normalized = part.toLowerCase();
      if (["uefa", "fifa", "afc", "caf", "dfb"].includes(normalized)) {
        return normalized.toUpperCase();
      }
      if (["mls", "mvp", "us"].includes(normalized)) {
        return normalized.toUpperCase();
      }
      return `${normalized.slice(0, 1).toUpperCase()}${normalized.slice(1)}`;
    })
    .join(" ");

const countryAdjective = (value: string) => {
  const adjective = ({
    argentina: "Argentine",
    belgium: "Belgian",
    brazil: "Brazilian",
    croatia: "Croatian",
    england: "English",
    france: "French",
    germany: "German",
    italy: "Italian",
    netherlands: "Dutch",
    portugal: "Portuguese",
    spain: "Spanish",
  })[normalizeText(value)];
  return adjective ?? null;
};

const leagueDisplayByTitle: Array<[RegExp, string]> = [
  [/\bgerman champion\b/, "Bundesliga Champion"],
  [/\bitalian champion\b/, "Serie A Champion"],
  [/\bdutch champion\b/, "Eredivisie Champion"],
  [/\benglish champion\b/, "Premier League Champion"],
  [/\bspanish champion\b/, "La Liga Champion"],
  [/\bfrench champion\b/, "Ligue 1 Champion"],
  [/\bportuguese champion\b/, "Primeira Liga Champion"],
  [/\bbelgian champion\b/, "Belgian Pro League Champion"],
  [/\bscottish champion\b/, "Scottish League Champion"],
  [/\bturkish champion\b/, "Süper Lig Champion"],
];

const cupDisplayByTitle: Array<[RegExp, string]> = [
  [/\bgerman cup winner\b/, "DFB-Pokal Winner"],
  [/\bitalian cup winner\b/, "Coppa Italia Winner"],
  [/\benglish fa cup winner\b/, "FA Cup Winner"],
  [/\benglish cup winner\b/, "FA Cup Winner"],
  [/\bspanish cup winner\b/, "Copa del Rey Winner"],
  [/\bfrench cup winner\b/, "Coupe de France Winner"],
  [/\bdutch cup winner\b/, "KNVB Cup Winner"],
  [/\bportuguese cup winner\b/, "Taça de Portugal Winner"],
  [/\bbelgian cup winner\b/, "Belgian Cup Winner"],
  [/\bscottish cup winner\b/, "Scottish Cup Winner"],
];

const sourceTitleCategory = (
  normalizedTitle: string,
): PlayerAccoladeCategory | null => {
  if (
    /\b(footballer of the year|player of the year|player of the season|top goal scorer|top scorer|best player|the best fifa|ballon d or|balon de oro|golden boot|golden shoe|golden ball|golden glove|golden boy|mvp|puskas award|footballer of the season|goalkeeper of the year|marston medal|athlete of the year|world xi|team of the year|all star team|best young player|young player award)\b/.test(
      normalizedTitle,
    )
  ) {
    return "individual";
  }
  if (/conmebol uefa cup of champions/.test(normalizedTitle)) {
    return "international";
  }
  if (
    /\b(european champion clubs cup|champions league|europa league|uefa cup|conference league|concacaf champions cup|cup winners cup|libertadores|sudamericana|intercontinental cup|club world cup|leagues cup)\b/.test(
      normalizedTitle,
    )
  ) {
    return "continental";
  }
  if (
    /\b(world cup|european champion|european championship|gold cup|copa america|africa cup|afcon|asian cup|nations league|nations cup|confederations cup)\b/.test(
      normalizedTitle,
    )
  ) {
    return "international";
  }
  if (/\bmls cup champion\b/.test(normalizedTitle)) {
    return "domestic-league";
  }
  if (/\bcup (winner|champion)\b/.test(normalizedTitle)) {
    return "domestic-cup";
  }
  if (/\b(champion|league winner)\b/.test(normalizedTitle)) {
    return "domestic-league";
  }
  return null;
};

const sourceTitleAllowed = (title: SourceTitleGroup) => {
  const normalized = normalizeText(
    `${title.title} ${title.normalizedTitle}`,
  );
  if (
    !title.seasons.length ||
    /\b(super cup|supercup|supercopa|recopa|youth|reserve|olympic|coupe gambardella|intertoto|ui cup|(?:under|u) ?(?:15|16|17|18|19|20|21|22|23)|runner up|finalist|participant|participation|promotion|relegation|2nd tier|second tier|second league|ligue 2|serie b|segunda division|2 bundesliga|bavarian cup|middle rhine cup|saxony cup)\b/.test(
      normalized,
    ) ||
    /\btm player\b/.test(normalized)
  ) {
    return false;
  }
  return sourceTitleCategory(normalized) !== null;
};

const displayLabelForSourceTitle = (
  title: SourceTitleGroup,
  category: PlayerAccoladeCategory,
) => {
  const normalized = normalizeText(
    title.normalizedTitle || title.title,
  );
  if (/champions league|european champion clubs cup/.test(normalized)) {
    return "UEFA Champions League Champion";
  }
  if (/conmebol uefa cup of champions/.test(normalized)) {
    return "CONMEBOL–UEFA Cup of Champions Winner";
  }
  if (/\b(europa league|uefa cup)\b/.test(normalized)) {
    return "UEFA Europa League Champion";
  }
  if (/conference league/.test(normalized)) {
    return "UEFA Conference League Champion";
  }
  if (/concacaf champions cup/.test(normalized)) {
    return "CONCACAF Champions Cup Champion";
  }
  if (/copa libertadores/.test(normalized)) {
    return "Copa Libertadores Champion";
  }
  if (/club world cup/.test(normalized)) {
    return "FIFA Club World Cup Winner";
  }
  if (/world cup/.test(normalized) && /\b(winner|champion)\b/.test(normalized)) {
    return "FIFA World Cup Champion";
  }
  if (/nations league/.test(normalized)) {
    return "UEFA Nations League Champion";
  }
  if (/gold cup/.test(normalized)) {
    return "CONCACAF Gold Cup Champion";
  }
  if (/\beuropean champion(?:ship)?\b/.test(normalized)) {
    return "UEFA European Championship Winner";
  }
  if (/copa america/.test(normalized)) {
    return "Copa América Champion";
  }
  for (const [pattern, label] of leagueDisplayByTitle) {
    if (pattern.test(normalized)) return label;
  }
  for (const [pattern, label] of cupDisplayByTitle) {
    if (pattern.test(normalized)) return label;
  }
  if (/european golden shoe|golden boot winner europe/.test(normalized)) {
    return "European Golden Shoe";
  }
  if (/mls mvp/.test(normalized)) {
    return "MLS MVP";
  }
  if (
    /uefa best player in europe|uefa men s player of the year/.test(
      normalized,
    )
  ) {
    return "UEFA Men's Player of the Year";
  }
  if (/jupiler pro league player of the year/.test(normalized)) {
    return "Jupiler Pro League Player of the Year";
  }
  if (/footballer of the year/.test(normalized)) {
    const context = title.seasons
      .map((season) => season.context)
      .find((value): value is string => Boolean(value));
    const adjective = context ? countryAdjective(context) : null;
    return adjective
      ? `${adjective} Footballer of the Year`
      : "Footballer of the Year";
  }
  if (/player of the year|player of the season/.test(normalized)) {
    const context = title.seasons
      .map((season) => season.context)
      .find((value): value is string => Boolean(value));
    return context
      ? `${context} Player of the Year`
      : "Player of the Year";
  }
  const base = titleCase(title.title)
    .replace(/\bWinner\b/g, category === "domestic-cup" ? "Winner" : "Champion")
    .replace(/\bChampion Champion\b/g, "Champion");
  return base;
};

const competitionDisplayName = (context: string | null) => {
  if (!context) return "Career";
  const cleaned = context
    .replace(/\s+-\s*\d+\s+Goals?\b.*$/i, "")
    .replace(/\s*\(\s*-\s*[^)]*\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const normalized = normalizeText(cleaned);
  const fixed: Array<[RegExp, string]> = [
    [
      /^(uefa champions league|european champion clubs cup)$/,
      "UEFA Champions League",
    ],
    [/^uefa cup$/, "UEFA Europa League"],
    [/^(uefa euro|euro 2020)$/, "UEFA European Championship"],
    [/^world cup$/, "FIFA World Cup"],
    [/^fifa club world cup$/, "FIFA Club World Cup"],
    [/^copa america$/, "Copa América"],
    [/^italy cup$/, "Coppa Italia"],
    [/^(knvb beker|amstel cup)$/, "KNVB Cup"],
    [/^laliga$/, "La Liga"],
    [/^dfb pokal$/, "DFB-Pokal"],
  ];
  return (
    fixed.find(([pattern]) => pattern.test(normalized))?.[1] ??
    cleaned
  );
};

const seasonContextAllowed = (season: SourceSeason) => {
  const context = normalizeText(season.context ?? "");
  return !/\b((?:under|u) ?(?:15|16|17|18|19|20|21|22|23)|youth|reserve|friendly|olympic|super cup|supercup|supercopa|recopa|coupe gambardella|intertoto|ui cup|ligue 2|serie b|segunda division|second division|2 bundesliga)\b/.test(
    context,
  );
};

const correctedSourceSeason = (season: SourceSeason): SourceSeason => ({
  ...season,
  startYear:
    season.startYear > 2026 ? season.startYear - 100 : season.startYear,
  endYear: season.endYear > 2026 ? season.endYear - 100 : season.endYear,
});

const buildSourceTitleCandidate = ({
  title,
  transfermarktPlayerId,
  transfermarktUrl,
  displayLabelOverride,
}: {
  title: SourceTitleGroup;
  transfermarktPlayerId: string;
  transfermarktUrl: string;
  displayLabelOverride?: string;
}): CanonicalCandidate | null => {
  if (title.seasons.length === 0) return null;
  const normalizedTitle = normalizeText(
    title.normalizedTitle || title.title,
  );
  const category = sourceTitleCategory(normalizedTitle);
  if (!category) return null;
  const displayLabel =
    displayLabelOverride ??
    displayLabelForSourceTitle(title, category);
  const years = [
    ...new Set(
      title.seasons.flatMap((season) => [
        season.startYear,
        ...(season.endYear === season.startYear
          ? []
          : [season.endYear]),
      ]),
    ),
  ].sort((first, second) => first - second);
  const family = normalizedFamily(displayLabel);
  const normalizedKey = normalizedKeyFor(category, family, years);
  const seasonsOrYears = [
    ...new Set(title.seasons.map((season) => season.raw)),
  ].sort((first, second) =>
    first.localeCompare(second, "en", { numeric: true }),
  );
  const contexts = [
    ...new Set(
      title.seasons
        .map((season) => season.context)
        .filter((value): value is string => Boolean(value)),
    ),
  ].sort();
  const count = title.seasons.length;
  const descriptionParts = [
    `Verified full-career Transfermarkt record: ${seasonsOrYears.join(", ")}.`,
    ...(contexts.length > 0
      ? [`Competition/team context: ${contexts.join("; ")}.`]
      : []),
  ];
  return {
    family,
    sourcePriority: 4,
    accolade: {
      id: slugify(displayLabel),
      label: displayLabel,
      ...(count > 1 ? { count } : {}),
      category,
      sourceName: "Transfermarkt",
      sourceUrl: transfermarktUrl,
      verified: true,
      description: descriptionParts.join(" "),
    },
    normalized: {
      normalizedKey,
      normalizedLabel: family,
      displayLabel,
      count,
      seasonsOrYears,
      clubsOrNationalTeams: contexts,
      category,
      transfermarktSource: {
        playerId: transfermarktPlayerId,
        url: transfermarktUrl,
      },
      fbrefSource: null,
      verificationStatus: "verified-source-page",
    },
  };
};

const sourceTitleCandidates = ({
  title,
  transfermarktPlayerId,
  transfermarktUrl,
}: {
  title: SourceTitleGroup;
  transfermarktPlayerId: string;
  transfermarktUrl: string;
}): CanonicalCandidate[] => {
  if (!sourceTitleAllowed(title)) return [];
  const uniqueEligibleSeasons = [
    ...new Map(
      title.seasons
        .filter(seasonContextAllowed)
        .map(correctedSourceSeason)
        .map((season) => [
          `${season.raw}|${season.context ?? ""}`,
          season,
        ]),
    ).values(),
  ];
  if (uniqueEligibleSeasons.length === 0) return [];

  const normalizedTitle = normalizeText(
    title.normalizedTitle || title.title,
  );
  if (!/top goal scorer|top scorer/.test(normalizedTitle)) {
    const candidate = buildSourceTitleCandidate({
      title: { ...title, seasons: uniqueEligibleSeasons },
      transfermarktPlayerId,
      transfermarktUrl,
    });
    return candidate ? [candidate] : [];
  }

  const seasonsByCompetition = new Map<
    string,
    { displayName: string; seasons: SourceSeason[] }
  >();
  for (const season of uniqueEligibleSeasons) {
    const displayName = competitionDisplayName(season.context);
    const key = normalizeText(displayName);
    const group = seasonsByCompetition.get(key) ?? {
      displayName,
      seasons: [],
    };
    group.seasons.push(season);
    seasonsByCompetition.set(key, group);
  }
  return [...seasonsByCompetition.values()]
    .sort((first, second) =>
      first.displayName.localeCompare(second.displayName),
    )
    .map(({ displayName, seasons }) =>
      buildSourceTitleCandidate({
        title: { ...title, seasons },
        transfermarktPlayerId,
        transfermarktUrl,
        displayLabelOverride:
          displayName === "Career"
            ? "Top Goalscorer"
            : `${displayName} Top Goalscorer`,
      }),
    )
    .filter(
      (candidate): candidate is CanonicalCandidate =>
        candidate !== null,
    );
};

const monthByName: Record<string, number> = {
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

const parseBornDate = (value: unknown) => {
  const text = stringAt(value);
  if (!text) return null;
  const match = text.match(
    /\bBorn:\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+((?:19|20)\d{2})\b/i,
  );
  if (!match) return null;
  return `${match[3]}-${String(monthByName[match[1].toLowerCase()]).padStart(2, "0")}-${String(Number(match[2])).padStart(2, "0")}`;
};

const transfermarktTitlesEvidenceFrom = (row: JsonRecord) =>
  isRecord(row.transfermarktCachedTitlesPage)
    ? row.transfermarktCachedTitlesPage
    : isRecord(row.transfermarktEvidence) &&
        isRecord(row.transfermarktEvidence.cachedTitlesPage)
      ? row.transfermarktEvidence.cachedTitlesPage
      : null;

const transfermarktTitlesPageParsed = (row: JsonRecord) => {
  const evidence = transfermarktTitlesEvidenceFrom(row);
  return Boolean(evidence && Array.isArray(evidence.parsedTitleGroups));
};

const sourceTitleGroupsFrom = (row: JsonRecord) => {
  const evidence = transfermarktTitlesEvidenceFrom(row);
  if (!evidence || !Array.isArray(evidence.parsedTitleGroups)) return [];
  return evidence.parsedTitleGroups.filter(
    (value): value is SourceTitleGroup => {
      if (!isRecord(value) || !Array.isArray(value.seasons)) return false;
      return (
        typeof value.title === "string" &&
        typeof value.normalizedTitle === "string" &&
        value.seasons.every(
          (season) =>
            isRecord(season) &&
            typeof season.raw === "string" &&
            typeof season.startYear === "number" &&
            typeof season.endYear === "number",
        )
      );
    },
  );
};

const fbrefIdentityVerified = (
  row: JsonRecord,
  expectedBirthDate: string | null,
) => {
  if (!isRecord(row.fbrefIdentityChecks)) return false;
  const checks = row.fbrefIdentityChecks;
  if (checks.identityVerified === true) return true;
  const recoveredBirthDate =
    stringAt(checks.birthDate) ?? parseBornDate(checks.fullName);
  return (
    checks.canonicalIdMatches === true &&
    checks.nameMatches === true &&
    checks.nationalityMatches === true &&
    Boolean(expectedBirthDate) &&
    recoveredBirthDate === expectedBirthDate
  );
};

const sourceConflictFor = (
  values: Array<string | null>,
  label: string,
) => {
  const unique = [...new Set(values.filter((value): value is string => Boolean(value)))];
  return unique.length > 1
    ? `${label} conflict: ${unique.sort().join(", ")}`
    : null;
};

const positionFromSourceRow = (row: JsonRecord) => {
  const transfermarktMatch = isRecord(row.transfermarktIdentityMatch)
    ? row.transfermarktIdentityMatch
    : null;
  const transfermarktPlayer =
    transfermarktMatch && isRecord(transfermarktMatch.player)
      ? transfermarktMatch.player
      : null;
  const fbrefChecks = isRecord(row.fbrefIdentityChecks)
    ? row.fbrefIdentityChecks
    : null;
  return (
    (transfermarktPlayer
      ? stringAt(transfermarktPlayer.subPosition) ??
        stringAt(transfermarktPlayer.position)
      : null) ??
    (fbrefChecks ? stringAt(fbrefChecks.position) : null)
  );
};

const mergeCandidates = (candidates: CanonicalCandidate[]) => {
  const byFamily = new Map<string, CanonicalCandidate[]>();
  for (const candidate of candidates) {
    const familyKey = `${candidate.accolade.category}:${candidate.family}`;
    byFamily.set(familyKey, [
      ...(byFamily.get(familyKey) ?? []),
      candidate,
    ]);
  }

  const values = [...byFamily.values()].map((familyCandidates) => {
    const transfermarktCandidate = familyCandidates
      .filter(
        (candidate) =>
          candidate.accolade.sourceName === "Transfermarkt",
      )
      .sort(
        (first, second) =>
          second.normalized.count - first.normalized.count ||
          second.sourcePriority - first.sourcePriority,
      )[0];
    const preferred =
      transfermarktCandidate ??
      [...familyCandidates].sort(
        (first, second) =>
          second.normalized.count - first.normalized.count ||
          second.sourcePriority - first.sourcePriority ||
          first.normalized.normalizedKey.localeCompare(
            second.normalized.normalizedKey,
          ),
      )[0];
    const uniqueKeys = new Set(
      familyCandidates.map(
        (candidate) => candidate.normalized.normalizedKey,
      ),
    );
    const maximumRecordedCount = Math.max(
      ...familyCandidates.map(
        (candidate) => candidate.normalized.count,
      ),
    );
    const count = transfermarktCandidate
      ? transfermarktCandidate.normalized.count
      : maximumRecordedCount > 1
        ? maximumRecordedCount
        : uniqueKeys.size;
    const seasonsOrYears = [
      ...new Set(
        familyCandidates.flatMap(
          (candidate) => candidate.normalized.seasonsOrYears,
        ),
      ),
    ].sort((first, second) =>
      first.localeCompare(second, "en", { numeric: true }),
    );
    const clubsOrNationalTeams = [
      ...new Set(
        familyCandidates.flatMap(
          (candidate) =>
            candidate.normalized.clubsOrNationalTeams,
        ),
      ),
    ].sort();
    const displayLabel =
      count > 1
        ? preferred.accolade.label
            .replace(
              /\s*[—–-]\s*(?:19|20)\d{2}(?:[/-]\d{2,4})?\s*$/,
              "",
            )
            .trim()
        : preferred.accolade.label;
    return {
      ...preferred,
      accolade: {
        ...preferred.accolade,
        label: displayLabel,
        ...(count > 1 ? { count } : { count: undefined }),
      },
      normalized: {
        ...preferred.normalized,
        normalizedKey: `${preferred.accolade.category}:${preferred.family}:${seasonsOrYears.join(",")}`,
        displayLabel,
        count,
        seasonsOrYears,
        clubsOrNationalTeams,
        transfermarktSource:
          familyCandidates
            .map(
              (candidate) =>
                candidate.normalized.transfermarktSource,
            )
            .find(
              (
                source,
              ): source is NonNullable<
                NormalizedAchievement["transfermarktSource"]
              > => Boolean(source),
            ) ?? null,
        fbrefSource:
          familyCandidates
            .map((candidate) => candidate.normalized.fbrefSource)
            .find(
              (
                source,
              ): source is NonNullable<
                NormalizedAchievement["fbrefSource"]
              > => Boolean(source),
            ) ?? null,
      },
    };
  });

  const transfermarktLeagueCount = values
    .filter(
      (candidate) =>
        candidate.accolade.sourceName === "Transfermarkt" &&
        candidate.accolade.category === "domestic-league",
    )
    .reduce((sum, candidate) => sum + candidate.normalized.count, 0);
  const transfermarktCupCount = values
    .filter(
      (candidate) =>
        candidate.accolade.sourceName === "Transfermarkt" &&
        candidate.accolade.category === "domestic-cup",
    )
    .reduce((sum, candidate) => sum + candidate.normalized.count, 0);
  const filtered = values.filter((candidate) => {
    if (
      candidate.family === "domestic-league-champion" &&
      candidate.accolade.sourceName !== "Transfermarkt" &&
      transfermarktLeagueCount >= candidate.normalized.count
    ) {
      return false;
    }
    if (
      candidate.family === "domestic-cup-winner" &&
      candidate.accolade.sourceName !== "Transfermarkt" &&
      transfermarktCupCount >= candidate.normalized.count
    ) {
      return false;
    }
    return true;
  });

  const ids = new Set<string>();
  return filtered
    .sort(
      (first, second) =>
        first.accolade.category.localeCompare(second.accolade.category) ||
        first.accolade.label.localeCompare(second.accolade.label) ||
        first.normalized.normalizedKey.localeCompare(
          second.normalized.normalizedKey,
        ),
    )
    .map((candidate) => {
      let id = candidate.accolade.id || slugify(candidate.accolade.label);
      if (ids.has(id)) {
        id = `${id}-${sha256(candidate.normalized.normalizedKey).slice(0, 8)}`;
      }
      ids.add(id);
      return {
        ...candidate,
        accolade: {
          ...candidate.accolade,
          id,
        },
      };
    });
};

const main = async () => {
  const legacyAudit = recordAt(
    JSON.parse(await readFile(LEGACY_AUDIT_FILE, "utf8")) as unknown,
    "legacy accolade audit",
  );
  const portraitAudit = recordAt(
    JSON.parse(await readFile(PORTRAIT_SUMMARY_FILE, "utf8")) as unknown,
    "Step 1B portrait summary",
  );
  const generatedAt = stringAt(legacyAudit.generatedAt);
  if (!generatedAt) {
    throw new Error("legacy accolade audit generatedAt is required");
  }
  const sourceRows = arrayAt<JsonRecord>(
    legacyAudit.cards,
    "legacy accolade audit cards",
  );
  const sourceRowsByIdentity = new Map<string, JsonRecord[]>();
  const cardsByIdentity = new Map<string, AuditedCard[]>();
  for (const row of sourceRows) {
    const identityId = stringAt(row.playerIdentityId);
    const cardId = stringAt(row.playerCardId);
    const playerName =
      stringAt(row.displayName) ?? stringAt(row.sourcePlayerName);
    const tournamentYear =
      typeof row.worldCupYear === "number" ? row.worldCupYear : null;
    const nationality = isRecord(row.nationality)
      ? stringAt(row.nationality.name)
      : null;
    if (
      !identityId ||
      !cardId ||
      !playerName ||
      !tournamentYear ||
      !nationality
    ) {
      throw new Error("legacy accolade audit has incomplete card identity data");
    }
    sourceRowsByIdentity.set(identityId, [
      ...(sourceRowsByIdentity.get(identityId) ?? []),
      row,
    ]);
    cardsByIdentity.set(identityId, [
      ...(cardsByIdentity.get(identityId) ?? []),
      {
        id: cardId,
        playerIdentityId: identityId,
        playerName,
        countryName: nationality,
        tournamentYear,
        primaryPosition: positionFromSourceRow(row),
      },
    ]);
  }
  const identities = [...cardsByIdentity.keys()].sort();
  if (identities.length !== 7_254 || sourceRows.length !== 9_626) {
    throw new Error(
      `Expected 7,254 identities / 9,626 cards, received ${identities.length} / ${sourceRows.length}`,
    );
  }

  const displayIdentities: Record<
    string,
    {
      verificationStatus:
        | "verified"
        | "partially-verified"
        | "unresolved"
        | "verified-no-recorded-major-accolades";
      accolades: PlayerAccolade[];
    }
  > = {};
  const identityAuditRows: JsonRecord[] = [];
  const multiCardRows: JsonRecord[] = [];

  for (const identityId of identities) {
    const cards = [...(cardsByIdentity.get(identityId) ?? [])].sort(
      (first, second) =>
        first.tournamentYear - second.tournamentYear ||
        first.id.localeCompare(second.id),
    );
    const sourceEvidence = sourceRowsByIdentity.get(identityId) ?? [];
    const archive = careerArchive.players[identityId];
    if (!archive) {
      throw new Error(`${identityId}: missing legacy identity career record`);
    }
    const playerNames = [...new Set(cards.map((card) => card.playerName))];
    const sourceNames = [
      ...new Set(
        sourceEvidence
          .map((row) => stringAt(row.sourcePlayerName))
          .filter((value): value is string => Boolean(value)),
      ),
    ];
    const birthDates = [
      ...new Set(
        sourceEvidence
          .map((row) => stringAt(row.dateOfBirth))
          .filter((value): value is string => Boolean(value)),
      ),
    ];
    const nationalities = [
      ...new Set(cards.map((card) => card.countryName)),
    ].sort();
    const positions = [
      ...new Set(
        cards
          .map((card) => card.primaryPosition)
          .filter((value): value is string => Boolean(value)),
      ),
    ].sort();
    const transfermarktIds = sourceEvidence.map((row) =>
      stringAt(row.transfermarktPlayerId),
    );
    const transfermarktPages = sourceEvidence.map((row) =>
      stringAt(row.transfermarktPage),
    );
    const fbrefIds = sourceEvidence.map((row) =>
      stringAt(row.fbrefPlayerId),
    );
    const fbrefPages = sourceEvidence.map((row) =>
      stringAt(row.fbrefPage),
    );
    const sourceConflicts = [
      sourceConflictFor(
        sourceNames.map((name) => normalizeText(name)),
        "source player name",
      ),
      sourceConflictFor(birthDates, "date of birth"),
      sourceConflictFor(transfermarktIds, "Transfermarkt player ID"),
      sourceConflictFor(fbrefIds, "FBref player ID"),
    ].filter((value): value is string => Boolean(value));

    const birthDate = birthDates.length === 1 ? birthDates[0] : null;
    const transfermarktPlayerId =
      [...new Set(transfermarktIds.filter((value): value is string => Boolean(value)))][0] ??
      null;
    const transfermarktUrl =
      [...new Set(transfermarktPages.filter((value): value is string => Boolean(value)))][0] ??
      null;
    const fbrefPlayerId =
      [...new Set(fbrefIds.filter((value): value is string => Boolean(value)))][0] ??
      null;
    const fbrefUrl =
      [...new Set(fbrefPages.filter((value): value is string => Boolean(value)))][0] ??
      null;

    const checkedTransfermarktRow = sourceEvidence.find(
      (row) =>
        transfermarktTitlesPageParsed(row) &&
        isRecord(row.transfermarktIdentityMatch) &&
        row.transfermarktIdentityMatch.status === "matched",
    );
    const checkedFbrefRow = sourceEvidence.find((row) =>
      fbrefIdentityVerified(row, birthDate),
    );
    const transfermarktPageChecked =
      Boolean(checkedTransfermarktRow) &&
      Boolean(transfermarktPlayerId) &&
      Boolean(transfermarktUrl) &&
      sourceConflicts.length === 0;
    const fbrefPageChecked =
      Boolean(checkedFbrefRow) &&
      Boolean(fbrefPlayerId) &&
      Boolean(fbrefUrl) &&
      sourceConflicts.length === 0;

    const candidates: CanonicalCandidate[] = [];
    if (sourceConflicts.length === 0) {
      for (const accolade of archive.accolades) {
        const candidate = normalizedStoredCandidate(
          accolade,
          fbrefPlayerId && fbrefUrl
            ? { playerId: fbrefPlayerId, url: fbrefUrl }
            : null,
        );
        if (candidate) candidates.push(candidate);
      }
      if (
        transfermarktPageChecked &&
        checkedTransfermarktRow &&
        transfermarktPlayerId &&
        transfermarktUrl
      ) {
        for (const title of sourceTitleGroupsFrom(
          checkedTransfermarktRow,
        )) {
          const titleCandidates = sourceTitleCandidates({
            title,
            transfermarktPlayerId,
            transfermarktUrl,
          });
          candidates.push(...titleCandidates);
        }
      }
    }

    const merged = mergeCandidates(candidates);
    const canonicalAccolades = merged.map(
      (candidate) => candidate.accolade,
    );
    const normalizedAchievements = merged.map(
      (candidate) => candidate.normalized,
    );
    const hasUnsupportedStoredEvidence = canonicalAccolades.some(
      (accolade) =>
        !accolade.sourceUrl ||
        accolade.sourceName === "Historical archive",
    );
    const verificationStatus =
      transfermarktPageChecked && fbrefPageChecked
        ? canonicalAccolades.length > 0 && !hasUnsupportedStoredEvidence
          ? ("verified" as const)
          : canonicalAccolades.length === 0
            ? ("verified-no-recorded-major-accolades" as const)
            : ("partially-verified" as const)
        : transfermarktPageChecked ||
            fbrefPageChecked ||
            canonicalAccolades.length > 0
          ? ("partially-verified" as const)
          : ("unresolved" as const);

    displayIdentities[identityId] = {
      verificationStatus,
      accolades: canonicalAccolades,
    };

    const careerClubs = [
      ...new Set(
        (archive.careerStats?.competitionStats ?? [])
          .map((stat) => stat.squad)
          .filter((value): value is string => Boolean(value)),
      ),
    ].sort();
    const removedOriginalAccolades = archive.accolades
      .filter(
        (accolade) =>
          !canonicalAccolades.some(
            (candidate) =>
              normalizedKeyFor(
                candidate.category,
                normalizedFamily(
                  candidate.label,
                  candidate.description,
                ),
                explicitYears(
                  `${candidate.id} ${candidate.label} ${candidate.description ?? ""}`,
                ),
              ) ===
              normalizedKeyFor(
                accolade.category,
                normalizedFamily(accolade.label, accolade.description),
                explicitYears(
                  `${accolade.id} ${accolade.label} ${accolade.description ?? ""}`,
                ),
              ),
          ),
      )
      .map((accolade) => ({
        accolade,
        reason: disallowedAccolade(accolade)
          ? "non-qualifying-runner-up-participation-or-youth-record"
          : "normalized-or-replaced-by-stronger-source-page-record",
      }));
    const previousAccoladesByCard = Object.fromEntries(
      cards.map((card) => [
        card.id,
        legacyCardAccolades.cards[card.id]?.accolades ?? [],
      ]),
    );
    const previousHashes = Object.fromEntries(
      Object.entries(previousAccoladesByCard).map(([cardId, accolades]) => [
        cardId,
        sha256(canonicalJson(accolades)),
      ]),
    );
    const distinctPreviousHashes = [...new Set(Object.values(previousHashes))];
    const finalSharedHash = sha256(canonicalJson(canonicalAccolades));

    identityAuditRows.push({
      playerIdentityId: identityId,
      playerName: playerNames[0] ?? identityId,
      playerNames,
      sourcePlayerNames: sourceNames,
      dateOfBirth: birthDate,
      nationalities,
      positions,
      careerClubs,
      relatedCardIds: cards.map((card) => card.id),
      transfermarktPlayerId,
      transfermarktUrl,
      transfermarktPageChecked,
      fbrefPlayerId,
      fbrefUrl,
      fbrefPageChecked,
      originalAccolades: archive.accolades,
      correctedCanonicalCareerAccolades: canonicalAccolades,
      normalizedAchievements,
      normalizedAchievementKeys: normalizedAchievements.map(
        (achievement) => achievement.normalizedKey,
      ),
      removedOriginalAccolades,
      verificationStatus,
      sourceConflicts,
      notes: [
        "Career Accolades are resolved once by playerIdentityId and are never filtered by a tournament card year.",
        ...(transfermarktPageChecked
          ? [
              "The cached Transfermarkt titles-and-achievements page was parsed for the complete career.",
            ]
          : [
              "A Transfermarkt identifier or profile URL alone is not treated as a checked achievements page.",
            ]),
        ...(fbrefPageChecked
          ? [
              "The cached FBref profile passed canonical ID, normalized name, nationality, and date-of-birth checks.",
            ]
          : [
              "An FBref identifier or blocked/unchecked page is not proof of complete honors or of no honors.",
            ]),
        ...(sourceConflicts.length > 0
          ? [
              "No accolade was assigned because the repository identity joins conflicting source records.",
            ]
          : []),
        ...(hasUnsupportedStoredEvidence
          ? [
              "Preserved historical archive evidence without a checked source URL keeps this identity partially verified.",
            ]
          : []),
      ],
    });

    if (cards.length > 1) {
      multiCardRows.push({
        playerIdentityId: identityId,
        playerName: playerNames[0] ?? identityId,
        cardIds: cards.map((card) => card.id),
        previousAccoladesByCard,
        previousHashesByCard: previousHashes,
        previousDifferences:
          distinctPreviousHashes.length > 1
            ? "different-card-level-career-accolade-lists"
            : "none",
        previouslyConsistent: distinctPreviousHashes.length === 1,
        finalSharedCareerAccoladeHash: finalSharedHash,
        finalConsistencyStatus: "consistent",
      });
    }
  }

  const previouslyInconsistent = multiCardRows.filter(
    (row) => row.previouslyConsistent === false,
  ).length;
  if (multiCardRows.length !== 1_818 || previouslyInconsistent !== 252) {
    throw new Error(
      `Expected 1,818 multi-card identities / 252 prior inconsistencies, received ${multiCardRows.length} / ${previouslyInconsistent}`,
    );
  }

  const perisic = displayIdentities["ivan-perisic"];
  const perisicCards =
    cardsByIdentity.get("ivan-perisic")?.map((card) => card.id).sort() ?? [];
  const requiredPerisicCards = [
    "ivan-perisic-2014",
    "ivan-perisic-2018",
    "ivan-perisic-2022",
    "ivan-perisic-2026",
  ];
  if (
    canonicalJson(perisicCards) !== canonicalJson(requiredPerisicCards) ||
    !perisic ||
    perisic.accolades.length < 8 ||
    perisic.accolades.some((accolade) =>
      /runner.?up/i.test(
        `${accolade.id} ${accolade.label} ${accolade.description ?? ""}`,
      ),
    ) ||
    !perisic.accolades.some(
      (accolade) =>
        accolade.label === "UEFA Champions League Champion",
    ) ||
    !perisic.accolades.some(
      (accolade) =>
        accolade.label === "DFB-Pokal Winner" && accolade.count === 3,
    )
  ) {
    throw new Error(
      "Ivan Perišić must resolve four cards to one complete, qualifying full-career list",
    );
  }

  const statusCounts = Object.fromEntries(
    [
      "verified",
      "partially-verified",
      "unresolved",
      "verified-no-recorded-major-accolades",
    ].map((status) => [
      status,
      Object.values(displayIdentities).filter(
        (identity) => identity.verificationStatus === status,
      ).length,
    ]),
  );
  const verifiedAchievementRecords = Object.values(displayIdentities)
    .flatMap((identity) => identity.accolades).length;
  const verifiedAchievementOccurrences = Object.values(displayIdentities)
    .flatMap((identity) => identity.accolades)
    .reduce((sum, accolade) => sum + (accolade.count ?? 1), 0);

  const displayOutput = {
    version: 1,
    generatedAt,
    sourceGameplayArchive:
      "/src/data/player-career.generated.json",
    sourceLegacyCardAudit:
      "/src/data/player-accolades-by-card.generated.json",
    methodology:
      "One canonical, full-career display list per playerIdentityId. This projection is not consumed by gameplay legacy scoring.",
    identities: displayIdentities,
  };
  const identityAudit = {
    version: 1,
    generatedAt,
    scope: {
      uniqueIdentities: identities.length,
      coveredPlayerCards: sourceRows.length,
      sourceYears: [1970, 2026],
    },
    methodology: {
      identity:
        "Source IDs are accepted only when the prior source audit matched identity evidence; known shared-ID conflicts remain unresolved.",
      career:
        "No tournament-year cutoff is applied. Parsed Transfermarkt achievement rows cover the full career; checked FBref profiles verify or supplement stored honors.",
      exclusions:
        "Runner-up/placement records, participation/squad records, nominations, youth honors, friendlies, Transfermarkt editorial awards, and super cups are excluded.",
      status:
        "verified requires successful checked Transfermarkt and FBref pages with no unsupported stored evidence. verified-no-recorded-major-accolades requires both checked pages and an empty qualifying list. Missing or blocked pages never prove that no honor exists.",
      gameplay:
        "The original player-career.generated.json remains the frozen gameplay input. This artifact controls displayed Career Accolades only.",
    },
    summary: {
      statusCounts,
      verifiedAchievementRecords,
      verifiedAchievementOccurrences,
    },
    identities: identityAuditRows,
  };
  const multiCardReport = {
    version: 1,
    generatedAt,
    summary: {
      multiCardIdentities: multiCardRows.length,
      cardsCovered: multiCardRows.reduce(
        (sum, row) =>
          sum + arrayAt<string>(row.cardIds, "multi-card ids").length,
        0,
      ),
      previouslyInconsistent,
      corrected: previouslyInconsistent,
      finalInconsistent: 0,
    },
    identities: multiCardRows,
  };
  const portraitCoverage = recordAt(
    portraitAudit.summary,
    "Step 1B portrait coverage",
  );
  const portraitByYear = recordAt(
    portraitCoverage.byYear,
    "Step 1B portrait coverage by year",
  );
  const portraitDuplicateEvidence = recordAt(
    portraitAudit.duplicateEvidence,
    "Step 1B portrait duplicate evidence",
  );
  const portraitPreservationEvidence = recordAt(
    portraitAudit.preservationEvidence,
    "Step 1B portrait preservation evidence",
  );
  const summary = {
    version: 1,
    generatedAt,
    branch: "fix/player-images-accolades-step-1",
    preservedCommit: "a043cf97b214b7aa751071dc95787edef8c81b7d",
    careerAccolades: {
      uniqueIdentitiesAudited: identities.length,
      playerCardsCovered: sourceRows.length,
      statusCounts,
      verifiedAchievementRecords,
      verifiedAchievementOccurrences,
      multiCardIdentities: multiCardRows.length,
      multiCardIdentitiesPreviouslyInconsistent:
        previouslyInconsistent,
      multiCardIdentitiesCorrected: previouslyInconsistent,
      perisic: {
        cardIds: requiredPerisicCards,
        canonicalCareerAccoladeHash: sha256(
          canonicalJson(perisic.accolades),
        ),
        canonicalCareerAccoladeRecords: perisic.accolades.length,
        finalConsistencyStatus: "consistent",
      },
    },
    gameplayProtection: {
      displayArtifact:
        "/src/data/player-career-accolades-by-identity.generated.json",
      frozenGameplayArtifact: "/src/data/player-career.generated.json",
      gameplayArtifactChanged: false,
    },
    artifacts: [
      "/src/data/player-career-accolades-by-identity.generated.json",
      "/reports/step1b-career-accolade-audit.json",
      "/reports/step1b-multi-card-accolade-consistency.json",
      "/reports/step1b-career-accolade-summary.json",
      "/reports/step1b-summary.json",
    ],
  };
  const combinedSummary = {
    version: 1,
    generatedAt: stringAt(portraitAudit.generatedAt) ?? generatedAt,
    branch: summary.branch,
    preservedCommit: summary.preservedCommit,
    careerAccolades: summary.careerAccolades,
    portraits: {
      tournamentYears: [2014, 2018, 2022, 2026],
      totalCards: portraitCoverage.totalCards,
      totalsByYear: portraitByYear,
      newlyVerifiedPortraits:
        portraitCoverage.newlyPromotedPortraits,
      replacedPortraits: portraitCoverage.verifiedAssetsChanged,
      preservedVerifiedPortraits:
        portraitCoverage.verifiedPortraits,
      photoPendingTotal: portraitCoverage.photoPending,
      photoPendingByYear: Object.fromEntries(
        Object.entries(portraitByYear).map(([year, value]) => [
          year,
          recordAt(
            value,
            `Step 1B portrait coverage ${year}`,
          ).photoPending,
        ]),
      ),
      productionRegistryChanged:
        portraitCoverage.productionRegistryChanged,
      duplicateImageProblemsFixed: 0,
      exactByteDuplicateGroups:
        portraitDuplicateEvidence.exactByteDuplicateGroups,
      canonicalPixelDuplicateGroups:
        portraitDuplicateEvidence.canonicalPixelDuplicateGroups,
      unresolvedCrossIdentityDuplicateErrors:
        portraitDuplicateEvidence.crossIdentityCanonicalPixelErrors,
      perceptualCandidatePairs:
        portraitDuplicateEvidence.perceptualCandidatePairs,
      manuallyReviewedDistanceZeroPairs:
        portraitDuplicateEvidence.manuallyReviewedDistanceZeroPairs,
      automatedNonzeroCandidates:
        portraitDuplicateEvidence.automatedNonzeroCandidates,
      contactSheets: portraitPreservationEvidence.contactSheets,
    },
    gameplayProtection: summary.gameplayProtection,
    reports: {
      careerAccoladeAudit:
        "/reports/step1b-career-accolade-audit.json",
      multiCardConsistency:
        "/reports/step1b-multi-card-accolade-consistency.json",
      portraitAudit: "/reports/step1-player-image-audit.json",
      portraitUnresolved:
        "/reports/step1-player-image-unresolved.json",
      portraitDuplicates:
        "/reports/step1-player-image-duplicates.json",
      careerSummary:
        "/reports/step1b-career-accolade-summary.json",
      portraitSummary:
        "/reports/step1b-player-portrait-summary.json",
      combinedSummary: "/reports/step1b-summary.json",
    },
  };

  await Promise.all([
    writeFile(
      DISPLAY_OUTPUT_FILE,
      `${JSON.stringify(displayOutput, null, 2)}\n`,
    ),
    writeFile(
      IDENTITY_AUDIT_FILE,
      `${JSON.stringify(identityAudit, null, 2)}\n`,
    ),
    writeFile(
      MULTI_CARD_FILE,
      `${JSON.stringify(multiCardReport, null, 2)}\n`,
    ),
    writeFile(
      SUMMARY_FILE,
      `${JSON.stringify(summary, null, 2)}\n`,
    ),
    writeFile(
      COMBINED_SUMMARY_FILE,
      `${JSON.stringify(combinedSummary, null, 2)}\n`,
    ),
  ]);

  console.log(
    `Step 1B career accolades: ${identities.length} identities / ${sourceRows.length} cards; ${verifiedAchievementRecords} records / ${verifiedAchievementOccurrences} occurrences; ${previouslyInconsistent} multi-card inconsistencies corrected.`,
  );
  console.log(
    `Statuses: ${JSON.stringify(statusCounts)}. Perišić: ${perisic.accolades.length} shared records.`,
  );
};

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
