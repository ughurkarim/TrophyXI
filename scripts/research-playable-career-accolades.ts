import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  PlayerAccolade,
  PlayerAccoladeCategory,
} from "../src/types/game";

/**
 * Deterministic current-career accolade research for the playable pool.
 *
 * This script deliberately writes a review artifact only when every playable
 * identity has a nonempty, sourced list. Live Transfermarkt achievement pages
 * are identity-checked by date of birth. FBref is recorded independently: a
 * locally cached, identity-verified profile is evidence; Cloudflare-blocked
 * profile/search attempts are truthfully recorded as checks but never used as
 * accolade evidence.
 *
 * Examples:
 *   node --import tsx scripts/research-playable-career-accolades.ts
 *   node --import tsx scripts/research-playable-career-accolades.ts --fetch --refresh
 *   node --import tsx scripts/research-playable-career-accolades.ts --only=rodri,lamine-yamal
 *   node --import tsx scripts/research-playable-career-accolades.ts --write
 */

type JsonRecord = Record<string, unknown>;

type IdentityAudit = {
  playerIdentityId: string;
  playerName: string;
  dateOfBirth: string;
  nationalities: string[];
  transfermarktPlayerId: string | null;
  transfermarktUrl: string | null;
  transfermarktPageChecked: boolean;
  fbrefPlayerId: string | null;
  fbrefUrl: string | null;
  fbrefPageChecked: boolean;
};

type ExistingReview = {
  reviewedAt: string;
  researchStatus: "complete";
  sources: SourceReview;
  notes: string[];
  accolades: PlayerAccolade[];
};

type ManualSupplement = {
  notes?: string[];
  additionalSources?: AlternativeSource[];
  accolades: PlayerAccolade[];
};

type ReviewedSource = {
  playerId: string | null;
  url: string;
  status: string;
};

type AlternativeSource = {
  sourceName: string;
  url: string;
  reason: string;
};

type SourceReview = {
  transfermarkt: ReviewedSource;
  fbref: ReviewedSource;
  alternatives: AlternativeSource[];
};

type TitleSeason = {
  raw: string;
  startYear: number;
  endYear: number;
  context: string | null;
};

type TitleGroup = {
  title: string;
  seasons: TitleSeason[];
};

type Candidate = {
  accolade: PlayerAccolade;
  family: string;
  priority: number;
};

type TransfermarktResolution = {
  playerId: string;
  url: string;
  cacheFile: string;
  status:
    | "checked-current-titles-and-achievements-page"
    | "checked-cached-titles-and-achievements-page";
  pageName: string | null;
  dateOfBirth: string;
  nationalities: string[];
  titleGroups: TitleGroup[];
};

const ROOT = process.cwd();
const COVERAGE_FILE = path.join(
  ROOT,
  "reports/playable-identity-accolade-coverage.json",
);
const IDENTITY_AUDIT_FILE = path.join(
  ROOT,
  "reports/step1b-career-accolade-audit.json",
);
const CAREER_ARCHIVE_FILE = path.join(
  ROOT,
  "src/data/player-career.generated.json",
);
const REVIEW_FILE = path.join(
  ROOT,
  "data/sources/player-career-accolade-reviews.json",
);
const SUPPLEMENT_FILE = path.join(
  ROOT,
  "data/sources/player-career-accolade-manual-supplements.json",
);
const REPORT_FILE = path.join(
  ROOT,
  "reports/playable-career-accolade-research.json",
);
const CANDIDATE_FILE = path.join(
  ROOT,
  "reports/playable-career-accolade-review-candidates.json",
);
const CACHE_ROOT = path.join(
  ROOT,
  "scripts/cache/playable-career-accolades",
);
const TRANSFERMARKT_CACHE = path.join(CACHE_ROOT, "transfermarkt");
const TRANSFERMARKT_SEARCH_CACHE = path.join(CACHE_ROOT, "search");
const LEGACY_TRANSFERMARKT_CACHE = path.join(
  ROOT,
  "scripts/cache/step1-transfermarkt-accolades",
);

const cliValue = (name: string) =>
  process.argv
    .find((argument) => argument.startsWith(`${name}=`))
    ?.slice(name.length + 1);

const FETCH = process.argv.includes("--fetch");
const REFRESH = process.argv.includes("--refresh");
const WRITE = process.argv.includes("--write");
const REVIEW_DATE = cliValue("--review-date") ??
  new Date().toISOString().slice(0, 10);
const DELAY_MS = Number(cliValue("--delay-ms") ?? "550");
const START = Number(cliValue("--start") ?? "0");
const LIMIT = Number(cliValue("--limit") ?? "0");
const ONLY_IDS = new Set(
  (cliValue("--only") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);
const BATCH_SIZE = 25;

/**
 * Transfermarkt search does not reliably resolve historic one-name players,
 * transliteration variants, or profiles whose DOB differs from the archive by
 * a day. These mappings were manually identity-checked against the profile
 * name, nationality, career history and the relevant tournament squad.
 */
const TRANSFERMARKT_OVERRIDES: Record<
  string,
  { playerId: string; playerCode: string }
> = {
  "aleksandr-chivadze": { playerId: "117376", playerCode: "aleksandre-chivadze" },
  amaral: { playerId: "134969", playerCode: "amaral" },
  batista: { playerId: "134971", playerCode: "batista" },
  "cesar-cueto": { playerId: "133724", playerCode: "cesar-cueto" },
  "cubas-andres": { playerId: "323872", playerCode: "andres-cubas" },
  "eder-p-39132": { playerId: "135371", playerCode: "eder" },
  "emilio-butragueno": { playerId: "117598", playerCode: "emilio-butragueno" },
  "felipe-melo": { playerId: "35537", playerCode: "felipe-melo" },
  "felix-magath": { playerId: "81630", playerCode: "felix-magath" },
  "gerd-kische": { playerId: "101171", playerCode: "gerd-kische" },
  gil: { playerId: "134968", playerCode: "giltm" },
  "giorgos-samaras": { playerId: "6855", playerCode: "georgios-samaras" },
  "hannes-or-halldorsson": { playerId: "103440", playerCode: "hannes-thor-halldorsson" },
  "hector-chumpitaz": { playerId: "142834", playerCode: "hector-chumpitaz" },
  "heggem-torbjorn": { playerId: "464469", playerCode: "torbjorn-heggem" },
  "julio-salinas": { playerId: "8141", playerCode: "julio-salinas" },
  "luigi-de-agostini": { playerId: "118258", playerCode: "luigi-de-agostini" },
  "manuel-negrete": { playerId: "118185", playerCode: "manuel-negrete" },
  "marawan-attia": { playerId: "734542", playerCode: "marwan-ateya" },
  "mehdi-benatia": { playerId: "45124", playerCode: "medhi-benatia" },
  "mohanad-lashin": { playerId: "479682", playerCode: "mohanad-lasheen" },
  "mostafa-shoubir": { playerId: "661455", playerCode: "oufa-shobeir" },
  "nico-claesen": { playerId: "97099", playerCode: "nico-claesen" },
  "nyland-orjan": { playerId: "73517", playerCode: "orjan-nyland" },
  "oscar-p-69644": { playerId: "117616", playerCode: "oscar" },
  "ramaz-shengelia": { playerId: "131532", playerCode: "ramaz-shengelia" },
  "rene-higuita": { playerId: "55838", playerCode: "rene-higuita" },
  "saliba-nathan": { playerId: "842420", playerCode: "nathan-dylan-saliba" },
  serginho: { playerId: "135361", playerCode: "serginho-chulapa" },
  toninho: { playerId: "134977", playerCode: "toninho" },
};

const IDENTITY_SOURCE_NOTES: Record<string, string[]> = {
  amaral: [
    "Source discrepancy retained in the audit: Transfermarkt lists 1954-12-25, while Brazilian authoritative records list 1954-12-21; name, nationality and career history establish the selected identity.",
  ],
  "cubas-andres": [
    "Source discrepancy retained in the audit: the repository lists 1996-05-11, while Transfermarkt and FBref list 1996-05-22; name, nationality and career history establish the selected identity.",
  ],
  "hector-chumpitaz": [
    "Source discrepancy retained in the audit: Transfermarkt lists 1943-04-12, while the repository, FBref and CONMEBOL list 1944-04-12; name, nationality and career history establish the selected identity.",
  ],
};

const compareStrings = (first: string, second: string) =>
  first.localeCompare(second, "en", { numeric: true });

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const decodeHtml = (value: string) =>
  value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&rsquo;|&#8217;/gi, "’")
    .replace(/&ndash;|&#8211;/gi, "–")
    .replace(/&mdash;|&#8212;/gi, "—")
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number(code)),
    )
    .replace(/&#x([a-f0-9]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    );

const stripHtml = (value: string) =>
  decodeHtml(value.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();

const normalize = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[’']/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

const slugify = (value: string) =>
  normalize(value).replace(/\s+/g, "-") || "career-accolade";

const titleCase = (value: string) =>
  value
    .split(/\s+/)
    .map((part) => {
      const lower = part.toLowerCase();
      if (
        [
          "uefa",
          "fifa",
          "afc",
          "caf",
          "dfb",
          "mls",
          "mvp",
          "concacaf",
          "conmebol",
        ].includes(lower)
      ) {
        return lower.toUpperCase();
      }
      return `${lower.slice(0, 1).toUpperCase()}${lower.slice(1)}`;
    })
    .join(" ");

const validReviewDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)) &&
  value <= new Date().toISOString().slice(0, 10);

const parseSeason = (rawValue: string): Omit<TitleSeason, "context"> | null => {
  const raw = rawValue.trim();
  let match = raw.match(/\b((?:19|20)\d{2})[-/](\d{4})\b/);
  if (match) {
    return {
      raw,
      startYear: Number(match[1]),
      endYear: Number(match[2]),
    };
  }
  match = raw.match(/\b((?:19|20)\d{2})[-/](\d{2})\b/);
  if (match) {
    const startYear = Number(match[1]);
    const century = Math.floor(startYear / 100) * 100;
    let endYear = century + Number(match[2]);
    if (endYear < startYear) endYear += 100;
    return { raw, startYear, endYear };
  }
  match = raw.match(/\b(\d{2})[-/](\d{2})\b/);
  if (match) {
    const first = Number(match[1]);
    const second = Number(match[2]);
    const startYear = first >= 70 ? 1900 + first : 2000 + first;
    let endYear = second >= 70 ? 1900 + second : 2000 + second;
    if (endYear < startYear) endYear += 100;
    return { raw, startYear, endYear };
  }
  match = raw.match(/\b((?:19|20)\d{2})\b/);
  return match
    ? { raw, startYear: Number(match[1]), endYear: Number(match[1]) }
    : null;
};

const parseTransfermarktTitleGroups = (html: string): TitleGroup[] => {
  const groups: TitleGroup[] = [];
  const blockPattern =
    /<div class="box">\s*<h2 class="content-box-headline">([\s\S]*?)<\/h2>[\s\S]*?<div class="erfolg_info_box">[\s\S]*?<table class="auflistung">([\s\S]*?)<\/table>/gi;
  for (const block of html.matchAll(blockPattern)) {
    const title = stripHtml(block[1]).replace(/^\d+x\s+/i, "").trim();
    if (!title || normalize(title) === "all titles") continue;
    const seasons: TitleSeason[] = [];
    for (const row of block[2].matchAll(/<tr>([\s\S]*?)<\/tr>/gi)) {
      const rawSeason = stripHtml(
        row[1].match(
          /<td class="erfolg_table_saison[^"]*">([\s\S]*?)<\/td>/i,
        )?.[1] ?? "",
      );
      const parsed = parseSeason(rawSeason);
      if (!parsed) continue;
      const contexts = [
        ...row[1].matchAll(
          /<td class="no-border-links">([\s\S]*?)<\/td>/gi,
        ),
      ];
      seasons.push({
        ...parsed,
        context:
          contexts.length > 0
            ? stripHtml(contexts.at(-1)?.[1] ?? "") || null
            : null,
      });
    }
    groups.push({ title, seasons });
  }
  return groups;
};

const transfermarktDateOfBirth = (html: string) => {
  const block = html.match(
    /Date of birth\/Age:[\s\S]{0,500}?data-header__content[^>]*>([\s\S]*?)<\/span>/i,
  )?.[1];
  const match = stripHtml(block ?? "").match(
    /\b(\d{1,2})\/(\d{1,2})\/((?:19|20)\d{2})\b/,
  );
  return match
    ? `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`
    : null;
};

const transfermarktName = (html: string) =>
  stripHtml(
    html.match(
      /<h1[^>]*class="[^"]*data-header__headline-wrapper[^"]*"[^>]*>([\s\S]*?)<\/h1>/i,
    )?.[1] ?? "",
  ).replace(/^#\d+\s*/, "") || null;

const transfermarktNationalities = (html: string) => {
  const block =
    html.match(/Citizenship:[\s\S]{0,900}?<\/li>/i)?.[0] ?? "";
  return [
    ...new Set(
      [...block.matchAll(/<img[^>]+(?:title|alt)="([^"]+)"/gi)]
        .map((match) => stripHtml(match[1]))
        .filter(Boolean),
    ),
  ];
};

const transfermarktCanonicalId = (html: string) =>
  html.match(
    /<link rel="canonical" href="https:\/\/www\.transfermarkt\.com\/[^"]+\/(?:erfolge|profil)\/spieler\/(\d+)"/i,
  )?.[1] ?? null;

const disallowedText = (value: string) => {
  const normalized = normalize(value);
  return (
    /\b(super cup|supercup|supercopa|recopa|youth|reserve|friendly|coupe gambardella|intertoto|ui cup|premier league international cup|under ?(?:15|16|17|18|19|20|21|22|23)|u ?(?:15|16|17|18|19|20|21|22|23)|runner up|runners up|finalist|semi finalist|semifinalist|third place|fourth place|nominee|nomination|shortlist|participant|participation|promotion|relegation|2nd tier|second tier|third tier|second league|third league|ligue 2|national 2|serie b|serie c|segunda division|segunda liga|segunda federacion|2 bundesliga|3 liga|efl championship|english championship|league one|league two|eerste divisie|regionalliga|primavera|thuringia cup|bavarian cup|middle rhine cup|saxony cup|regional cup|tm player)\b/.test(
      normalized,
    ) || normalized === "championship"
  );
};

const competitionFromTitleContext = (context: string | null) => {
  if (!context) return null;
  const cleaned = context
    .replace(/\s+-\s+\d+\s+goals?\b.*$/i, "")
    .replace(/\s*\(\s*-\s*\d{4}\s*\)\s*$/i, "")
    .trim();
  if (!cleaned) return null;
  if (/^uefa-cup$/i.test(cleaned)) return "UEFA Cup";
  if (/^euro(?:pean championship)?\s+(?:19|20)\d{2}$/i.test(cleaned)) {
    return "UEFA European Championship";
  }
  return cleaned;
};

const categoryForTitle = (
  title: string,
): PlayerAccoladeCategory | null => {
  const value = normalize(title);
  if (
    /\b(footballer of the year|player of the year|player of the season|top goal scorer|top goalscorer|top scorer|best player|the best fifa|ballon d or|balon de oro|golden boot|golden shoe|golden ball|golden glove|golden boy|mvp|puskas|world xi|team of the year|all star team|best young player|young player award|goalkeeper of the year|goalkeeper of the season)\b/.test(
      value,
    )
  ) {
    return "individual";
  }
  if (
    /\b(champions league|european champion clubs cup|europa league|uefa cup|conference league|concacaf champions|copa libertadores|copa sudamericana|intercontinental cup|club world cup|cup winners cup|leagues cup)\b/.test(
      value,
    )
  ) {
    return "continental";
  }
  if (
    /\b(world cup|european champion|european championship|copa america|africa cup|afcon|asian cup|gold cup|nations league|nations cup|confederations cup|conmebol uefa cup of champions|olympic medalist)\b/.test(
      value,
    )
  ) {
    return "international";
  }
  if (/\b(mls cup champion|supporters shield winner)\b/.test(value)) {
    return "domestic-league";
  }
  if (/\b(cup|pokal|copa) (winner|champion)\b/.test(value)) {
    return "domestic-cup";
  }
  if (/\b(champion|league winner)\b/.test(value)) {
    return "domestic-league";
  }
  return null;
};

const labelForTitle = (
  title: string,
  category: PlayerAccoladeCategory,
  seasons: TitleSeason[],
) => {
  const value = normalize(title);
  const fixed: Array<[RegExp, string]> = [
    [/champions league|european champion clubs cup/, "UEFA Champions League Champion"],
    [/conmebol uefa cup of champions/, "CONMEBOL–UEFA Cup of Champions Winner"],
    [/europa league|uefa cup/, "UEFA Europa League Champion"],
    [/conference league/, "UEFA Conference League Champion"],
    [/concacaf champions/, "CONCACAF Champions Cup Champion"],
    [/copa libertadores/, "Copa Libertadores Champion"],
    [/copa sudamericana/, "Copa Sudamericana Champion"],
    [/club world cup/, "FIFA Club World Cup Winner"],
    [/intercontinental cup/, "Intercontinental Cup Winner"],
    [/world cup.*(?:winner|champion)|(?:winner|champion).*world cup/, "FIFA World Cup Champion"],
    [/uefa nations league|nations league/, "UEFA Nations League Champion"],
    [/gold cup/, "CONCACAF Gold Cup Champion"],
    [/european champion(?:ship)?/, "UEFA European Championship Winner"],
    [/copa america/, "Copa América Champion"],
    [/africa cup|afcon/, "Africa Cup of Nations Champion"],
    [/asian cup/, "AFC Asian Cup Champion"],
    [/confederations cup/, "FIFA Confederations Cup Champion"],
    [/olympic medalist/, "Olympic Gold Medalist"],
    [/supporters shield winner/, "Supporters' Shield Winner"],
    [/german champion/, "Bundesliga Champion"],
    [/italian champion/, "Serie A Champion"],
    [/dutch champion/, "Eredivisie Champion"],
    [/english champion/, "Premier League Champion"],
    [/spanish champion/, "La Liga Champion"],
    [/french champion/, "Ligue 1 Champion"],
    [/portuguese champion/, "Primeira Liga Champion"],
    [/belgian champion/, "Belgian Pro League Champion"],
    [/scottish champion/, "Scottish League Champion"],
    [/turkish champion/, "Süper Lig Champion"],
    [/german cup winner/, "DFB-Pokal Winner"],
    [/italian cup winner/, "Coppa Italia Winner"],
    [/english fa cup winner|english cup winner/, "FA Cup Winner"],
    [/english league cup winner/, "English League Cup Winner"],
    [/spanish cup winner/, "Copa del Rey Winner"],
    [/french cup winner/, "Coupe de France Winner"],
    [/dutch cup winner/, "KNVB Cup Winner"],
    [/portuguese cup winner/, "Taça de Portugal Winner"],
    [/belgian cup winner/, "Belgian Cup Winner"],
    [/scottish cup winner/, "Scottish Cup Winner"],
    [/european golden shoe|golden boot winner europe/, "European Golden Shoe"],
    [/mls mvp/, "MLS MVP"],
    [/uefa best player in europe|uefa men s player of the year/, "UEFA Men's Player of the Year"],
  ];
  const mapped = fixed.find(([pattern]) => pattern.test(value))?.[1];
  if (mapped) return mapped;
  const context = seasons
    .map((season) => competitionFromTitleContext(season.context))
    .find((candidate): candidate is string => Boolean(candidate));
  if (/top goal scorer|top goalscorer|top scorer/.test(value)) {
    return context ? `${context} Top Goalscorer` : "Top Goalscorer";
  }
  if (/player of the year|player of the season/.test(value)) {
    const generic = /^player of (?:the )?(?:year|season)$/.test(value);
    if (!generic) return title.trim();
    const suffix = /player of the season/.test(value)
      ? "Player of the Season"
      : "Player of the Year";
    return context ? `${context} ${suffix}` : suffix;
  }
  if (/footballer of the year/.test(value)) {
    return title.trim();
  }
  const base = titleCase(title).replace(/^\d+x\s+/i, "");
  return category === "domestic-cup"
    ? base.replace(/\bChampion\b/g, "Winner")
    : base.replace(/\bWinner\b/g, "Champion");
};

const semanticFamily = (
  category: PlayerAccoladeCategory,
  label: string,
  description = "",
) => {
  const value = normalize(`${label} ${description}`);
  if (category === "domestic-cup") {
    if (/\b(?:english )?fa cup\b/.test(value)) {
      return "domestic-cup:english-fa-cup-winner";
    }
    if (/\b(?:english |efl |carabao )?league cup\b/.test(value)) {
      return "domestic-cup:english-league-cup-winner";
    }
  }
  if (category === "domestic-league") {
    const leagueAliases: Array<[RegExp, string]> = [
      [/\b(?:english champion|premier league champion)\b/, "premier-league-champion"],
      [/\b(?:spanish champion|la liga champion)\b/, "la-liga-champion"],
      [/\b(?:german champion|bundesliga champion)\b/, "bundesliga-champion"],
      [/\b(?:italian champion|serie a champion)\b/, "serie-a-champion"],
      [/\b(?:french champion|ligue 1 champion)\b/, "ligue-1-champion"],
      [/\b(?:dutch champion|eredivisie champion)\b/, "eredivisie-champion"],
      [/\b(?:portuguese champion|primeira liga champion)\b/, "primeira-liga-champion"],
      [/\b(?:turkish champion|super lig champion)\b/, "super-lig-champion"],
      [/\b(?:saudi arabian champion|saudi pro league champion)\b/, "saudi-pro-league-champion"],
    ];
    const alias = leagueAliases.find(([pattern]) => pattern.test(value))?.[1];
    if (alias) return `domestic-league:${alias}`;
  }
  if (category === "international") {
    const placementAliases: Array<[RegExp, string]> = [
      [/\b(?:fifa )?world cup runner up\b/, "fifa-world-cup-runner-up"],
      [
        /\b(?:fifa )?world cup (?:third place|bronze medal(?:ist)?)\b/,
        "fifa-world-cup-third-place",
      ],
      [/\b(?:fifa )?world cup fourth place\b/, "fifa-world-cup-fourth-place"],
      [/\bcopa america runner up\b/, "copa-america-runner-up"],
      [
        /\b(?:uefa )?european championship runner up\b/,
        "uefa-european-championship-runner-up",
      ],
      [/\bafc asian cup runner up\b/, "afc-asian-cup-runner-up"],
      [/\bolympic (?:football )?silver medal\b/, "olympic-football-silver-medal"],
      [/\bolympic (?:football )?bronze medal\b/, "olympic-football-bronze-medal"],
    ];
    const placement = placementAliases.find(([pattern]) =>
      pattern.test(value),
    )?.[1];
    if (placement) return `international:${placement}`;
  }
  if (
    category === "individual" &&
    /\b(?:uefa )?champions league player of (?:the )?(?:season|year)\b/.test(
      value,
    )
  ) {
    return "individual:uefa-champions-league-player-of-the-season";
  }
  if (category === "individual") {
    const individualAliases: Array<[RegExp, string]> = [
      [
        /\b(?:uefa best player in europe|uefa men s player of (?:the )?year)\b/,
        "uefa-mens-player-of-the-year",
      ],
      [
        /\bligue 1 player of (?:the )?(?:year|season)\b/,
        "ligue-1-player-of-the-year",
      ],
      [
        /\b(?:german male footballer|germany footballer|german footballer) of (?:the )?year\b/,
        "german-footballer-of-the-year",
      ],
      [
        /\bserie a (?:footballer|player) of (?:the )?(?:year|season)\b/,
        "serie-a-player-of-the-year",
      ],
      [
        /\bpremier league player of (?:the )?(?:year|season)\b/,
        "premier-league-player-of-the-season",
      ],
      [
        /\b(?:j1 league player|japan j league player) of (?:the )?year\b/,
        "j1-league-player-of-the-year",
      ],
      [
        /\b(?:division 1|ligue 1) player of (?:the )?(?:year|season)\b/,
        "ligue-1-player-of-the-year",
      ],
      [
        /\buefa club footballer of (?:the )?year\b/,
        "uefa-club-footballer-of-the-year",
      ],
    ];
    const individualAlias = individualAliases.find(([pattern]) =>
      pattern.test(value),
    )?.[1];
    if (individualAlias) return `individual:${individualAlias}`;
  }
  const mappings: Array<[RegExp, string]> = [
    [/club world cup.*(?:winner|champion)|(?:winner|champion).*club world cup/, "fifa-club-world-cup-winner"],
    [/(?<!club )world cup.*(?:winner|champion)|(?:winner|champion).*(?<!club )world cup/, "fifa-world-cup-champion"],
    [/(?<!club )world cup.*golden ball|golden ball.*(?<!club )world cup/, "fifa-world-cup-golden-ball"],
    [/(?<!club )world cup.*silver ball|silver ball.*(?<!club )world cup/, "fifa-world-cup-silver-ball"],
    [/(?<!club )world cup.*bronze ball|bronze ball.*(?<!club )world cup/, "fifa-world-cup-bronze-ball"],
    [/(?<!club )world cup.*golden boot|golden boot.*(?<!club )world cup/, "fifa-world-cup-golden-boot"],
    [/(?<!club )world cup.*silver boot|silver boot.*(?<!club )world cup/, "fifa-world-cup-silver-boot"],
    [/(?<!club )world cup.*bronze boot|bronze boot.*(?<!club )world cup/, "fifa-world-cup-bronze-boot"],
    [/(?<!club )world cup.*golden glove|golden glove.*(?<!club )world cup/, "fifa-world-cup-golden-glove"],
    [/(?<!club )world cup.*(?:top goal scorer|top goalscorer|top scorer)|(?:top goal scorer|top goalscorer|top scorer).*(?<!club )world cup/, "fifa-world-cup-golden-boot"],
    [/(?:champions league|european champion clubs cup).*(?:winner|champion)|(?:winner|champion).*(?:champions league|european champion clubs cup)/, "uefa-champions-league-champion"],
    [/(?:europa league|uefa cup).*(?:winner|champion)|(?:winner|champion).*(?:europa league|uefa cup)/, "uefa-europa-league-champion"],
    [/conference league.*(?:winner|champion)|(?:winner|champion).*conference league/, "uefa-conference-league-champion"],
    [/copa libertadores.*(?:winner|champion)|(?:winner|champion).*copa libertadores/, "copa-libertadores-champion"],
    [/(?:european championship|european champion).*(?:winner|champion)|(?:winner|champion).*(?:european championship|european champion)/, "uefa-european-championship-winner"],
    [/copa america.*(?:winner|champion)|(?:winner|champion).*copa america/, "copa-america-champion"],
    [/(?:africa cup|afcon).*(?:winner|champion)|(?:winner|champion).*(?:africa cup|afcon)/, "africa-cup-of-nations-champion"],
    [/asian cup.*(?:winner|champion)|(?:winner|champion).*asian cup/, "afc-asian-cup-champion"],
    [/nations league.*(?:winner|champion)|(?:winner|champion).*nations league/, "uefa-nations-league-champion"],
  ];
  const mapped = mappings.find(([pattern]) => pattern.test(value))?.[1];
  if (mapped) return `${category}:${mapped}`;
  return `${category}:${normalize(label)
    .replace(/\b(winner|champion)\b/g, "champion")
    .replace(/\b(19|20)\d{2}\b/g, "")
    .replace(/\b\d{2}\b/g, "")
    .replace(/\s+/g, " ")
    .trim()}`;
};

const transfermarktCandidates = (
  resolution: TransfermarktResolution,
): Candidate[] => {
  const candidates: Candidate[] = [];
  for (const group of resolution.titleGroups) {
    if (group.seasons.length === 0 || disallowedText(group.title)) continue;
    const normalizedGroupTitle = normalize(group.title);
    if (
      /^(?:footballer|player) of (?:the )?(?:year|season)$/.test(
        normalizedGroupTitle,
      ) ||
      /^goalkeeper of (?:the )?(?:year|season)$/.test(normalizedGroupTitle)
    ) {
      // These Transfermarkt headings do not name the awarding body or
      // competition. Their row context is the player's team/competition at
      // the time, not the award scope, so using it as the award name would
      // infer a false accolade.
      continue;
    }
    const category = categoryForTitle(group.title);
    if (!category) continue;
    const eligibleSeasons = [
      ...new Map(
        group.seasons
          .filter(
            (season) =>
              !disallowedText(`${group.title} ${season.context ?? ""}`),
          )
          .map((season) => [`${season.raw}|${season.context ?? ""}`, season]),
      ).values(),
    ];
    if (eligibleSeasons.length === 0) continue;
    const isTopGoalscorer =
      /top goal scorer|top goalscorer|top scorer/i.test(group.title);
    const isGenericPlayerAward =
      /^player of (?:the )?(?:year|season)$/.test(normalizedGroupTitle);
    const isBestFifaPlayerAward =
      normalizedGroupTitle === "the best fifa men s player";
    const isUefaPlayerAward =
      /^(?:uefa best player in europe|uefa men s player of (?:the )?year)$/.test(
        normalizedGroupTitle,
      );
    const normalizedSeasons = isTopGoalscorer
      ? eligibleSeasons.map((season) => ({
          ...season,
          context: competitionFromTitleContext(season.context),
        }))
      : eligibleSeasons;
    const groups =
      isTopGoalscorer ||
      isGenericPlayerAward ||
      isBestFifaPlayerAward ||
      isUefaPlayerAward
      ? [...new Map(
          normalizedSeasons.map((season) => [
            isBestFifaPlayerAward
              ? season.endYear < 2016
                ? "fifa-world-player-of-the-year"
                : "the-best-fifa-mens-player"
              : isUefaPlayerAward
                ? season.endYear < 2011
                  ? "uefa-club-footballer-of-the-year"
                  : "uefa-mens-player-of-the-year"
                : normalize(season.context ?? "career"),
            {
              title: group.title,
              seasons: normalizedSeasons.filter(
                (candidate) => {
                  if (isBestFifaPlayerAward) {
                    return (
                      (candidate.endYear < 2016) ===
                      (season.endYear < 2016)
                    );
                  }
                  if (isUefaPlayerAward) {
                    return (
                      (candidate.endYear < 2011) ===
                      (season.endYear < 2011)
                    );
                  }
                  return (
                    normalize(candidate.context ?? "career") ===
                    normalize(season.context ?? "career")
                  );
                },
              ),
            },
          ]),
        ).values()]
      : [{ title: group.title, seasons: normalizedSeasons }];
    for (const split of groups) {
      if (
        (isGenericPlayerAward || isTopGoalscorer) &&
        !split.seasons.some((season) => Boolean(season.context))
      ) {
        // A context-free generic heading cannot establish whether this was a
        // club, competition, association or media award.
        continue;
      }
      const label = isBestFifaPlayerAward
        ? split.seasons.every((season) => season.endYear < 2016)
          ? "FIFA World Player of the Year"
          : "The Best FIFA Men's Player"
        : isUefaPlayerAward
          ? split.seasons.every((season) => season.endYear < 2011)
            ? "UEFA Club Footballer of the Year"
            : "UEFA Men's Player of the Year"
          : labelForTitle(split.title, category, split.seasons);
      const years = [
        ...new Set(split.seasons.map((season) => season.raw)),
      ].sort(compareStrings);
      const contexts = [
        ...new Set(
          split.seasons
            .map((season) => season.context)
            .filter((value): value is string => Boolean(value)),
        ),
      ].sort(compareStrings);
      const count = split.seasons.length;
      candidates.push({
        family: semanticFamily(category, label),
        priority: 40,
        accolade: {
          id: slugify(label),
          label,
          ...(count > 1 ? { count } : {}),
          category,
          sourceName: "Transfermarkt",
          sourceUrl: resolution.url,
          verified: true,
          description: [
            `${years.join(", ")}.`,
            ...(contexts.length > 0
              ? [
                  `${isTopGoalscorer ? "Competition" : "Teams/competitions"}: ${contexts.join("; ")}.`,
                ]
              : []),
          ].join(" "),
        },
      });
    }
  }
  return candidates;
};

const existingCandidateAllowed = (
  accolade: PlayerAccolade,
  fromManualReview: boolean,
  fbrefChecked: boolean,
  skipTransfermarkt = false,
) => {
  if (
    accolade.verified !== true ||
    !accolade.sourceUrl ||
    !URL.canParse(accolade.sourceUrl)
  ) {
    return false;
  }
  if (skipTransfermarkt && accolade.sourceName === "Transfermarkt") {
    return false;
  }
  if (fromManualReview) return true;
  const majorWorldCupPlacement =
    /\bworld cup\b.*\b(runner up|third place|bronze medal)\b/i.test(
      normalize(`${accolade.label} ${accolade.description ?? ""}`),
    );
  if (
    disallowedText(`${accolade.label} ${accolade.description ?? ""}`) &&
    !majorWorldCupPlacement
  ) {
    return false;
  }
  if (accolade.sourceName === "Transfermarkt") return false;
  if (accolade.sourceName === "FBref") return fbrefChecked;
  if (
    ["Historical archive", "Completed 2026 archive"].includes(
      accolade.sourceName,
    )
  ) {
    return false;
  }
  const url = new URL(accolade.sourceUrl);
  return (
    url.protocol === "https:" &&
    (url.hostname.endsWith("fifa.com") ||
      url.hostname.endsWith("uefa.com") ||
      url.hostname.endsWith("fifpro.org") ||
      url.hostname.endsWith("conmebol.com") ||
      url.hostname.endsWith("concacaf.com") ||
      url.hostname.endsWith("cafonline.com") ||
      url.hostname.endsWith("the-afc.com") ||
      (url.hostname === "github.com" &&
        url.pathname.startsWith("/jfjelstul/worldcup")))
  );
};

const normalizedStoredAccolade = (
  accolade: PlayerAccolade,
): PlayerAccolade => ({
  ...accolade,
  category:
    categoryForTitle(`${accolade.label} ${accolade.description ?? ""}`) ??
    accolade.category,
});

const mergeCandidates = (candidates: Candidate[]) => {
  const byFamily = new Map<string, Candidate[]>();
  for (const candidate of candidates) {
    byFamily.set(candidate.family, [
      ...(byFamily.get(candidate.family) ?? []),
      candidate,
    ]);
  }
  const merged = [...byFamily.values()].map((values) => {
    const transfermarkt = values.find(
      (candidate) => candidate.accolade.sourceName === "Transfermarkt",
    );
    const category = values[0].accolade.category;
    const teamTrophy = category !== "individual";
    const sorted = [...values].sort(
      (first, second) =>
        (second.accolade.count ?? 1) - (first.accolade.count ?? 1) ||
        second.priority - first.priority,
    );
    return teamTrophy && transfermarkt ? transfermarkt : sorted[0];
  });
  const ids = new Set<string>();
  return merged
    .sort(
      (first, second) =>
        first.accolade.category.localeCompare(second.accolade.category) ||
        first.accolade.label.localeCompare(second.accolade.label),
    )
    .map(({ accolade, family }) => {
      let id = accolade.id || slugify(accolade.label);
      if (ids.has(id)) id = `${id}-${slugify(family).slice(-20)}`;
      ids.add(id);
      return { ...accolade, id };
    });
};

let nextRequestAt = 0;
const wait = (delay: number) =>
  new Promise((resolve) => setTimeout(resolve, delay));

const fetchText = async (url: string) => {
  const delay = Math.max(0, nextRequestAt - Date.now());
  if (delay > 0) await wait(delay);
  nextRequestAt = Date.now() + DELAY_MS;
  let lastError: unknown;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9",
          "User-Agent":
            "Mozilla/5.0 (compatible; TrophyXI/1.0; player accolade research)",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(35_000),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${url}`);
      }
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < 4) await wait(750 * 2 ** attempt);
    }
  }
  throw lastError;
};

const cachedOrFetched = async ({
  url,
  cacheFile,
  legacyCacheFile,
}: {
  url: string;
  cacheFile: string;
  legacyCacheFile?: string;
}) => {
  if (FETCH && (REFRESH || !existsSync(cacheFile))) {
    const html = await fetchText(url);
    await mkdir(path.dirname(cacheFile), { recursive: true });
    await writeFile(cacheFile, html);
    return { html, current: true };
  }
  if (existsSync(cacheFile)) {
    return { html: await readFile(cacheFile, "utf8"), current: false };
  }
  if (legacyCacheFile && existsSync(legacyCacheFile)) {
    return { html: await readFile(legacyCacheFile, "utf8"), current: false };
  }
  return null;
};

const codeFromUrl = (url: string | null, fallbackName: string) => {
  if (url && URL.canParse(url)) {
    const match = new URL(url).pathname.match(/^\/([^/]+)\/(?:erfolge|profil)\/spieler\//);
    if (match) return match[1];
  }
  return slugify(fallbackName);
};

const resolveTransfermarktPage = async (
  identity: IdentityAudit,
): Promise<TransfermarktResolution | null> => {
  const tryCandidate = async (
    playerId: string,
    playerCode: string,
    allowCuratedIdentityOverride = false,
  ) => {
    const url = `https://www.transfermarkt.com/${playerCode}/erfolge/spieler/${playerId}`;
    const cacheFile = path.join(TRANSFERMARKT_CACHE, `${playerId}.html`);
    const cached = await cachedOrFetched({
      url,
      cacheFile,
      legacyCacheFile: path.join(LEGACY_TRANSFERMARKT_CACHE, `${playerId}.html`),
    });
    if (!cached) return null;
    if (transfermarktCanonicalId(cached.html) !== playerId) return null;
    const dateOfBirth = transfermarktDateOfBirth(cached.html);
    if (!dateOfBirth && !allowCuratedIdentityOverride) return null;
    if (dateOfBirth !== identity.dateOfBirth && !allowCuratedIdentityOverride) {
      return null;
    }
    return {
      playerId,
      url,
      cacheFile,
      status: cached.current
        ? ("checked-current-titles-and-achievements-page" as const)
        : ("checked-cached-titles-and-achievements-page" as const),
      pageName: transfermarktName(cached.html),
      dateOfBirth: dateOfBirth ?? identity.dateOfBirth,
      nationalities: transfermarktNationalities(cached.html),
      titleGroups: parseTransfermarktTitleGroups(cached.html),
    };
  };

  const override = TRANSFERMARKT_OVERRIDES[identity.playerIdentityId];
  if (override) {
    const curated = await tryCandidate(
      override.playerId,
      override.playerCode,
      true,
    );
    if (curated) return curated;
  }

  if (identity.transfermarktPlayerId) {
    const direct = await tryCandidate(
      identity.transfermarktPlayerId,
      codeFromUrl(identity.transfermarktUrl, identity.playerName),
    );
    if (direct) return direct;
  }
  const searchUrl = `https://www.transfermarkt.com/schnellsuche/ergebnis/schnellsuche?query=${encodeURIComponent(identity.playerName)}`;
  const searchFile = path.join(
    TRANSFERMARKT_SEARCH_CACHE,
    `${identity.playerIdentityId}.html`,
  );
  const search = await cachedOrFetched({ url: searchUrl, cacheFile: searchFile });
  if (!search) return null;
  const candidates = [
    ...new Map(
      [...search.html.matchAll(/href="\/([^"/]+)\/profil\/spieler\/(\d+)"/gi)].map(
        (match) => [match[2], { playerCode: match[1], playerId: match[2] }],
      ),
    ).values(),
  ];
  for (const candidate of candidates.slice(0, 12)) {
    const resolved = await tryCandidate(candidate.playerId, candidate.playerCode);
    if (resolved) return resolved;
  }
  return null;
};

const fbrefReviewFor = (
  identity: IdentityAudit,
  existing: ExistingReview | undefined,
): ReviewedSource => {
  const existingSource = existing?.sources.fbref;
  if (
    existingSource &&
    [
      "checked-current-profile-and-all-competitions",
      "checked-cached-profile-identity-verified",
    ].includes(existingSource.status)
  ) {
    return existingSource;
  }
  if (identity.fbrefPageChecked && identity.fbrefPlayerId && identity.fbrefUrl) {
    return {
      playerId: identity.fbrefPlayerId,
      url: identity.fbrefUrl,
      status: "checked-cached-profile-identity-verified",
    };
  }
  if (identity.fbrefPlayerId) {
    return {
      playerId: identity.fbrefPlayerId,
      url:
        identity.fbrefUrl ??
        `https://fbref.com/en/players/${identity.fbrefPlayerId}/${slugify(identity.playerName)}`,
      status: "checked-current-profile-access-blocked",
    };
  }
  return {
    playerId: null,
    url: `https://fbref.com/en/search/search.fcgi?search=${encodeURIComponent(identity.playerName)}`,
    status: "checked-current-search-access-blocked",
  };
};

const main = async () => {
  if (!validReviewDate(REVIEW_DATE)) {
    throw new Error(`Invalid or future --review-date: ${REVIEW_DATE}`);
  }
  if (!Number.isFinite(DELAY_MS) || DELAY_MS < 500) {
    throw new Error("--delay-ms must be at least 500");
  }
  const coverage = JSON.parse(await readFile(COVERAGE_FILE, "utf8")) as {
    identities: Array<{ playerIdentityId: string }>;
  };
  const identityAudit = JSON.parse(
    await readFile(IDENTITY_AUDIT_FILE, "utf8"),
  ) as { identities: IdentityAudit[] };
  const careerArchive = JSON.parse(
    await readFile(CAREER_ARCHIVE_FILE, "utf8"),
  ) as {
    players: Record<string, { accolades: PlayerAccolade[] }>;
  };
  const existingArtifact = JSON.parse(
    await readFile(REVIEW_FILE, "utf8"),
  ) as { identities: Record<string, ExistingReview> };
  const supplements = JSON.parse(
    await readFile(SUPPLEMENT_FILE, "utf8"),
  ) as {
    identities: Record<string, ManualSupplement>;
  };
  const auditById = new Map(
    identityAudit.identities.map((identity) => [
      identity.playerIdentityId,
      identity,
    ]),
  );
  const playableIds = coverage.identities
    .map((identity) => identity.playerIdentityId)
    .sort(compareStrings);
  const rangeIds = playableIds.slice(
    START,
    LIMIT > 0 ? START + LIMIT : undefined,
  );
  const selectedIds = ONLY_IDS.size > 0
    ? rangeIds.filter((identityId) => ONLY_IDS.has(identityId))
    : rangeIds;
  const unknownOnlyIds = [...ONLY_IDS].filter(
    (identityId) => !playableIds.includes(identityId),
  );
  if (unknownOnlyIds.length > 0) {
    throw new Error(`Unknown --only identity IDs: ${unknownOnlyIds.join(", ")}`);
  }
  const orphanSupplementIds = Object.keys(supplements.identities).filter(
    (identityId) => !playableIds.includes(identityId),
  );
  if (orphanSupplementIds.length > 0) {
    throw new Error(
      `Manual supplements reference non-playable identities: ${orphanSupplementIds.join(", ")}`,
    );
  }
  const reviews: Record<string, ExistingReview> = {};
  const rows: JsonRecord[] = [];
  let processed = 0;

  for (const identityId of selectedIds) {
    const identity = auditById.get(identityId);
    if (!identity) throw new Error(`${identityId}: missing identity audit row`);
    const existing = existingArtifact.identities[identityId];
    const supplement = supplements.identities[identityId];
    let resolution: TransfermarktResolution | null = null;
    let transfermarktError: string | null = null;
    try {
      resolution = await resolveTransfermarktPage(identity);
    } catch (error) {
      transfermarktError = error instanceof Error ? error.message : String(error);
    }
    const fbref = fbrefReviewFor(identity, existing);
    const candidates: Candidate[] = resolution
      ? transfermarktCandidates(resolution)
      : [];
    for (const storedAccolade of careerArchive.players[identityId]?.accolades ?? []) {
      const accolade = normalizedStoredAccolade(storedAccolade);
      if (!existingCandidateAllowed(accolade, false, identity.fbrefPageChecked)) {
        continue;
      }
      candidates.push({
        accolade,
        family: semanticFamily(
          accolade.category,
          accolade.label,
          accolade.description,
        ),
        priority: accolade.sourceName === "FBref" ? 45 : 30,
      });
    }
    for (const storedAccolade of supplement?.accolades ?? []) {
      const accolade = normalizedStoredAccolade(storedAccolade);
      if (!existingCandidateAllowed(accolade, true, identity.fbrefPageChecked)) {
        continue;
      }
      candidates.push({
        accolade,
        family: semanticFamily(
          accolade.category,
          accolade.label,
          accolade.description,
        ),
        priority: 60,
      });
    }
    const transfermarktLeagueCount = candidates
      .filter(
        (candidate) =>
          candidate.accolade.sourceName === "Transfermarkt" &&
          candidate.accolade.category === "domestic-league",
      )
      .reduce((sum, candidate) => sum + (candidate.accolade.count ?? 1), 0);
    const transfermarktCupCount = candidates
      .filter(
        (candidate) =>
          candidate.accolade.sourceName === "Transfermarkt" &&
          candidate.accolade.category === "domestic-cup",
      )
      .reduce((sum, candidate) => sum + (candidate.accolade.count ?? 1), 0);
    const filteredCandidates = candidates.filter((candidate) => {
      const normalizedLabel = normalize(candidate.accolade.label);
      const count = candidate.accolade.count ?? 1;
      if (
        normalizedLabel === "domestic league champion" &&
        candidate.accolade.sourceName !== "Transfermarkt" &&
        transfermarktLeagueCount > 0
      ) {
        return false;
      }
      if (
        /^(?:domestic cup winner|domestic cup champion)$/.test(normalizedLabel) &&
        candidate.accolade.sourceName !== "Transfermarkt" &&
        transfermarktCupCount >= count
      ) {
        return false;
      }
      return true;
    });
    const accolades = mergeCandidates(filteredCandidates);
    const alternatives = [
      ...new Map(
        [
          ...accolades
            .filter(
              (accolade) =>
                accolade.sourceName !== "Transfermarkt" &&
                accolade.sourceName !== "FBref" &&
                Boolean(accolade.sourceUrl),
            )
            .map((accolade) => ({
              sourceName: accolade.sourceName,
              url: accolade.sourceUrl!,
              reason:
                "Authoritative evidence supplements the checked Transfermarkt and FBref source review.",
            })),
          ...(supplement?.additionalSources ?? []),
        ].map((source) => [
          `${source.sourceName}|${source.url}`,
          source,
        ]),
      ).values(),
    ];
    const completed = Boolean(resolution) && accolades.length > 0;
    if (completed && resolution) {
      reviews[identityId] = {
        reviewedAt: REVIEW_DATE,
        researchStatus: "complete",
        sources: {
          transfermarkt: {
            playerId: resolution.playerId,
            url: resolution.url,
            status: resolution.status,
          },
          fbref,
          alternatives,
        },
        notes: [
          "Reviewed as one current full-career identity record; no tournament-card year cutoff was applied.",
          ...(fbref.status.includes("access-blocked")
            ? [
                "FBref returned Cloudflare human verification during the current review and was not used as accolade evidence.",
              ]
            : []),
          ...(supplement?.notes ?? []),
          ...(IDENTITY_SOURCE_NOTES[identityId] ?? []),
        ],
        accolades,
      };
    }
    rows.push({
      playerIdentityId: identityId,
      playerName: identity.playerName,
      completed,
      transfermarkt: resolution
        ? {
            playerId: resolution.playerId,
            url: resolution.url,
            status: resolution.status,
            pageName: resolution.pageName,
            dateOfBirth: resolution.dateOfBirth,
            nationalities: resolution.nationalities,
            parsedTitleGroupCount: resolution.titleGroups.length,
          }
        : null,
      fbref,
      accoladeCount: accolades.length,
      accolades,
      unresolvedReasons: [
        ...(!resolution
          ? [
              transfermarktError ??
                "No date-of-birth-matched Transfermarkt achievements page was available.",
            ]
          : []),
        ...(accolades.length === 0
          ? ["No qualifying major career accolade has yet been verified."]
          : []),
      ],
    });
    processed += 1;
    if (processed % BATCH_SIZE === 0 || processed === selectedIds.length) {
      const completedCount = rows.filter((row) => row.completed === true).length;
      console.log(
        `Research batch ${Math.ceil(processed / BATCH_SIZE)}: ${processed}/${selectedIds.length}, ${completedCount} complete.`,
      );
    }
  }

  const unresolvedRows = rows.filter((row) => row.completed !== true);
  const artifact = {
    schemaVersion: 1,
    reviewedThrough: REVIEW_DATE,
    methodology:
      "Deterministic identity-level current-career research. Every completed playable identity has an identity-verified Transfermarkt titles-and-achievements page (DOB match or a documented manual override for a source discrepancy), an independently recorded FBref check, a real review date, and a concise nonempty list of sourced major honors. Tournament-card years never filter these records.",
    identities: Object.fromEntries(
      Object.entries(reviews).sort(([first], [second]) =>
        compareStrings(first, second),
      ),
    ),
  };
  const report = {
    schemaVersion: 1,
    generatedAt: `${REVIEW_DATE}T00:00:00.000Z`,
    reviewDate: REVIEW_DATE,
    scope: {
      totalPlayableIdentities: playableIds.length,
      selectedStart: START,
      selectedIdentities: selectedIds.length,
      deterministicBatchSize: BATCH_SIZE,
      fetchEnabled: FETCH,
      refreshEnabled: REFRESH,
    },
    summary: {
      identitiesProcessed: rows.length,
      identitiesCompleted: rows.length - unresolvedRows.length,
      identitiesUnresolved: unresolvedRows.length,
      currentTransfermarktPages: rows.filter(
        (row) =>
          isRecord(row.transfermarkt) &&
          row.transfermarkt.status ===
            "checked-current-titles-and-achievements-page",
      ).length,
      cachedTransfermarktPages: rows.filter(
        (row) =>
          isRecord(row.transfermarkt) &&
          row.transfermarkt.status ===
            "checked-cached-titles-and-achievements-page",
      ).length,
      fbrefAccessBlocked: rows.filter(
        (row) => isRecord(row.fbref) && String(row.fbref.status).includes("access-blocked"),
      ).length,
      accoladeRecords: rows.reduce(
        (sum, row) => sum + Number(row.accoladeCount ?? 0),
        0,
      ),
    },
    unresolvedIdentityIds: unresolvedRows.map(
      (row) => row.playerIdentityId,
    ),
    identities: rows,
  };
  await mkdir(path.dirname(REPORT_FILE), { recursive: true });
  await writeFile(REPORT_FILE, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(CANDIDATE_FILE, `${JSON.stringify(artifact, null, 2)}\n`);
  console.log(JSON.stringify(report.summary));
  console.log(`Wrote ${path.relative(ROOT, REPORT_FILE)}.`);
  console.log(`Wrote ${path.relative(ROOT, CANDIDATE_FILE)}.`);

  const fullRun =
    START === 0 && ONLY_IDS.size === 0 && selectedIds.length === playableIds.length;
  if (WRITE) {
    if (!fullRun) {
      throw new Error("--write requires a full playable-identity run");
    }
    if (unresolvedRows.length > 0) {
      throw new Error(
        `Refusing to mark research complete: ${unresolvedRows.length} identities remain unresolved.`,
      );
    }
    await writeFile(REVIEW_FILE, `${JSON.stringify(artifact, null, 2)}\n`);
    console.log(`Wrote ${path.relative(ROOT, REVIEW_FILE)}.`);
  }
};

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
