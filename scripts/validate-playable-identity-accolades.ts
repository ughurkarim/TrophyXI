import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import identityAccoladesJson from "../src/data/player-career-accolades-by-identity.generated.json";
import {
  allPlayersBeforeIdentityPruning,
  getPlayablePlayers,
} from "../src/data/players";
import {
  calculatePlayerLegacyScore,
  getPlayerAccoladeItems,
} from "../src/engine/accolade-effects";
import { playerCardSchema } from "../src/lib/validation";
import type {
  PlayerAccolade,
  PlayerTournamentCard,
} from "../src/types/game";

/**
 * Playable identity-level career-accolade coverage.
 *
 * Tournament card years intentionally do not participate in accolade
 * validation. Every playable card resolves the one current-career list stored
 * for its playerIdentityId.
 */

const ROOT = process.cwd();
const AUDIT_FILE = path.join(
  ROOT,
  "reports",
  "step1b-career-accolade-audit.json",
);
const CANONICAL_FILE = path.join(
  ROOT,
  "src",
  "data",
  "player-career-accolades-by-identity.generated.json",
);
const REPORT_FILE = path.join(
  ROOT,
  "reports",
  "playable-identity-accolade-coverage.json",
);
const REPORT_ONLY = process.argv.includes("--report-only");
const TODAY = new Date().toISOString().slice(0, 10);

type SourceReview = {
  playerId: string | null;
  url: string;
  status: string;
};

type AlternativeSourceReview = {
  sourceName: string;
  url: string;
  reason: string;
};

type IdentityAccoladeRecord = {
  verificationStatus:
    | "verified"
    | "partially-verified"
    | "unresolved"
    | "verified-no-recorded-major-accolades";
  reviewedAt?: string;
  researchStatus?: "complete";
  sourceReview?: {
    transfermarkt: SourceReview;
    fbref: SourceReview;
    alternatives: AlternativeSourceReview[];
  };
  accolades: PlayerAccolade[];
};

type IdentityAccoladeArtifact = {
  version: number;
  generatedAt: string;
  methodology: string;
  identities: Record<string, IdentityAccoladeRecord>;
};

type IdentityAuditArtifact = {
  scope?: {
    uniqueIdentities?: number;
    coveredPlayerCards?: number;
  };
  identities: Array<{
    playerIdentityId: string;
    relatedCardIds: string[];
    correctedCanonicalCareerAccolades: PlayerAccolade[];
  }>;
};

type SourceValidation = {
  checked: boolean;
  usableAccoladeEvidence: boolean;
  noProfile: boolean;
  accessBlocked: boolean;
  issues: string[];
};

const identityAccolades =
  identityAccoladesJson as unknown as IdentityAccoladeArtifact;

const compareStrings = (first: string, second: string) =>
  first.localeCompare(second, "en", { numeric: true });

const canonicalJson = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort(compareStrings)
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
};

const sha256 = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");

const duplicateValues = (values: readonly string[]) => {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts]
    .filter(([, count]) => count > 1)
    .map(([value]) => value)
    .sort(compareStrings);
};

const normalizeAccolade = (accolade: PlayerAccolade) =>
  `${accolade.category}:${accolade.label
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()}`;

const normalizeSemanticTrophyFamily = (accolade: PlayerAccolade) =>
  `${accolade.category}:${accolade.label
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b\d+ goals? (?=top goalscorer\b)/g, "")
    .replace(/\b(?:19|20)\d{2}\b/g, "")
    .replace(/\b\d{2}\b/g, "")
    .replace(/\b(?:fifa|uefa) (?=world cup|european championship)/g, "")
    .replace(
      /\bworld cup (?:top goalscorer|golden boot)\b/g,
      "world cup golden boot",
    )
    .replace(
      /\b(?:uefa best player in europe|uefa men s player of (?:the )?year)\b/g,
      "uefa men s player of year",
    )
    .replace(
      /\buefa club footballer of (?:the )?year\b/g,
      "uefa club footballer of year",
    )
    .replace(
      /\b(?:uefa )?champions league player of (?:the )?(?:season|year)\b/g,
      "champions league player of season",
    )
    .replace(
      /\bligue 1 player of (?:the )?(?:season|year)\b/g,
      "ligue 1 player of year",
    )
    .replace(
      /\bdivision 1 player of (?:the )?(?:season|year)\b/g,
      "ligue 1 player of year",
    )
    .replace(
      /\b(?:german male footballer|germany footballer|german footballer) of (?:the )?year\b/g,
      "german footballer of year",
    )
    .replace(
      /\bserie a (?:footballer|player) of (?:the )?(?:season|year)\b/g,
      "serie a player of year",
    )
    .replace(
      /\bpremier league player of (?:the )?(?:season|year)\b/g,
      "premier league player of season",
    )
    .replace(
      /\b(?:j1 league player|japan j league player) of (?:the )?year\b/g,
      "j1 league player of year",
    )
    .replace(/\b(?:winners?|champions?)\b/g, "title")
    .replace(/\b(?:third place|bronze medal(?:ist)?)\b/g, "bronze")
    .replace(/\benglish fa cup\b/g, "fa cup")
    .replace(/\b(?:spanish cup|copa del rey)\b/g, "copa del rey")
    .replace(/\b(?:english league cup|efl cup|carabao cup)\b/g, "english league cup")
    .replace(/\b(?:english title|premier league title)\b/g, "premier league title")
    .replace(/\b(?:spanish title|la liga title)\b/g, "la liga title")
    .replace(/\b(?:german title|bundesliga title)\b/g, "bundesliga title")
    .replace(/\b(?:italian title|serie a title)\b/g, "serie a title")
    .replace(/\b(?:dutch title|eredivisie title)\b/g, "eredivisie title")
    .replace(
      /\b(?:saudi arabian title|saudi pro league title)\b/g,
      "saudi pro league title",
    )
    .trim()}`;

const isCalendarDate = (value: string | undefined): value is string => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
};

const validReviewDate = (value: string | undefined) =>
  isCalendarDate(value) && value <= TODAY;

const parseHttpsUrl = (value: string | undefined) => {
  if (!value || value.trim() !== value) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" &&
      !parsed.username &&
      !parsed.password &&
      !parsed.port
      ? parsed
      : null;
  } catch {
    return null;
  }
};

const alternativeSourceIssues = (
  source: AlternativeSourceReview,
  index: number,
) => {
  const prefix = `alternatives[${index}]`;
  return [
    ...(source.sourceName && source.sourceName.trim() === source.sourceName
      ? []
      : [`${prefix}.sourceName must be nonempty and exactly trimmed.`]),
    ...(source.sourceName === "Transfermarkt" || source.sourceName === "FBref"
      ? [`${prefix}.sourceName must not duplicate a primary provider.`]
      : []),
    ...(source.reason && source.reason.trim() === source.reason
      ? []
      : [`${prefix}.reason must be nonempty and exactly trimmed.`]),
    ...(parseHttpsUrl(source.url)
      ? []
      : [`${prefix}.url must be a valid HTTPS URL.`]),
  ];
};

const hasOnlySearchParameter = (url: URL) => {
  const entries = [...url.searchParams.entries()];
  return (
    entries.length === 1 &&
    entries[0]?.[0] === "search" &&
    Boolean(entries[0]?.[1].trim()) &&
    !url.hash
  );
};

const hasOnlyQueryParameter = (url: URL) => {
  const entries = [...url.searchParams.entries()];
  return (
    entries.length === 1 &&
    entries[0]?.[0] === "query" &&
    Boolean(entries[0]?.[1].trim()) &&
    !url.hash
  );
};

const validateTransfermarktSource = (
  source: SourceReview | undefined,
): SourceValidation => {
  const issues: string[] = [];
  if (!source) {
    return {
      checked: false,
      usableAccoladeEvidence: false,
      noProfile: false,
      accessBlocked: false,
      issues: ["Transfermarkt source review is missing."],
    };
  }

  const url = parseHttpsUrl(source.url);
  const directStatuses = new Set([
    "checked-current-titles-and-achievements-page",
    "checked-cached-titles-and-achievements-page",
  ]);
  const direct = directStatuses.has(source.status);
  const noProfile = source.status === "checked-current-no-player-profile";

  if (!direct && !noProfile) {
    issues.push(`Unsupported Transfermarkt status: ${source.status}.`);
  } else if (!url || url.hostname !== "www.transfermarkt.com") {
    issues.push("Transfermarkt URL must be an exact HTTPS www.transfermarkt.com URL.");
  } else if (direct) {
    const match = url.pathname.match(
      /^\/[^/]+\/erfolge\/spieler\/([1-9]\d*)\/?$/,
    );
    if (!source.playerId || !/^[1-9]\d*$/.test(source.playerId)) {
      issues.push("A checked Transfermarkt achievements page requires a numeric playerId.");
    }
    if (!match || match[1] !== source.playerId || url.search || url.hash) {
      issues.push(
        "Transfermarkt achievements URL path/playerId/status do not match exactly.",
      );
    }
  } else {
    if (source.playerId !== null) {
      issues.push("A Transfermarkt no-profile search must have a null playerId.");
    }
    if (
      url.pathname !== "/schnellsuche/ergebnis/schnellsuche" ||
      !hasOnlyQueryParameter(url)
    ) {
      issues.push(
        "Transfermarkt no-profile evidence must use its exact search URL with one nonempty query parameter.",
      );
    }
  }

  return {
    checked: issues.length === 0,
    usableAccoladeEvidence: issues.length === 0 && direct,
    noProfile,
    accessBlocked: false,
    issues,
  };
};

const validateFbrefSource = (
  source: SourceReview | undefined,
): SourceValidation => {
  const issues: string[] = [];
  if (!source) {
    return {
      checked: false,
      usableAccoladeEvidence: false,
      noProfile: false,
      accessBlocked: false,
      issues: ["FBref source review is missing."],
    };
  }

  const url = parseHttpsUrl(source.url);
  const directStatuses = new Set([
    "checked-current-profile-and-all-competitions",
    "checked-cached-profile-identity-verified",
  ]);
  const blockedDirect =
    source.status === "checked-current-profile-access-blocked";
  const blockedSearch =
    source.status === "checked-current-search-access-blocked";
  const noProfile = source.status === "checked-current-no-player-profile";
  const direct = directStatuses.has(source.status) || blockedDirect;
  const search = blockedSearch || noProfile;

  if (!direct && !search) {
    issues.push(`Unsupported FBref status: ${source.status}.`);
  } else if (!url || url.hostname !== "fbref.com") {
    issues.push("FBref URL must be an exact HTTPS fbref.com URL.");
  } else if (direct) {
    const match = url.pathname.match(
      /^\/en\/players\/([0-9a-f]{8})\/[^/]+\/?$/,
    );
    if (!source.playerId || !/^[0-9a-f]{8}$/.test(source.playerId)) {
      issues.push("A checked FBref profile requires an eight-character playerId.");
    }
    if (!match || match[1] !== source.playerId || url.search || url.hash) {
      issues.push("FBref profile URL path/playerId/status do not match exactly.");
    }
  } else {
    if (source.playerId !== null) {
      issues.push("An FBref search review must have a null playerId.");
    }
    if (
      url.pathname !== "/en/search/search.fcgi" ||
      !hasOnlySearchParameter(url)
    ) {
      issues.push(
        "FBref search evidence must use its exact search URL with one nonempty search parameter.",
      );
    }
  }

  return {
    checked: issues.length === 0,
    usableAccoladeEvidence:
      issues.length === 0 && directStatuses.has(source.status),
    noProfile,
    accessBlocked: blockedDirect || blockedSearch,
    issues,
  };
};

const jsonPointerToken = (value: string) =>
  value.replace(/~/g, "~0").replace(/\//g, "~1");

/** JSON.parse silently keeps the last duplicate object key. Scan raw JSON so
 * duplicate identity/accolade/source fields cannot disappear before checks. */
const duplicateJsonKeyPaths = (source: string) => {
  let cursor = 0;
  const duplicates = new Set<string>();
  const whitespace = () => {
    while (/\s/.test(source[cursor] ?? "")) cursor += 1;
  };
  const stringValue = () => {
    const start = cursor;
    cursor += 1;
    while (cursor < source.length) {
      if (source[cursor] === "\\") {
        cursor += 2;
      } else if (source[cursor] === '"') {
        cursor += 1;
        return JSON.parse(source.slice(start, cursor)) as string;
      } else {
        cursor += 1;
      }
    }
    throw new Error("Unterminated JSON string.");
  };
  const value = (pathTokens: string[]): void => {
    whitespace();
    if (source[cursor] === "{") {
      object(pathTokens);
      return;
    }
    if (source[cursor] === "[") {
      array(pathTokens);
      return;
    }
    if (source[cursor] === '"') {
      stringValue();
      return;
    }
    while (
      cursor < source.length &&
      !/[\s,\]}]/.test(source[cursor] ?? "")
    ) {
      cursor += 1;
    }
  };
  const object = (pathTokens: string[]): void => {
    cursor += 1;
    whitespace();
    const keys = new Set<string>();
    while (source[cursor] !== "}") {
      const key = stringValue();
      if (keys.has(key)) {
        duplicates.add(
          `/${[...pathTokens, key].map(jsonPointerToken).join("/")}`,
        );
      }
      keys.add(key);
      whitespace();
      cursor += 1; // colon; JSON.parse has already established valid syntax.
      value([...pathTokens, key]);
      whitespace();
      if (source[cursor] === ",") {
        cursor += 1;
        whitespace();
      }
    }
    cursor += 1;
  };
  const array = (pathTokens: string[]): void => {
    cursor += 1;
    whitespace();
    let index = 0;
    while (source[cursor] !== "]") {
      value([...pathTokens, String(index)]);
      index += 1;
      whitespace();
      if (source[cursor] === ",") {
        cursor += 1;
        whitespace();
      }
    }
    cursor += 1;
  };

  value([]);
  return [...duplicates].sort(compareStrings);
};

const gameplayProjection = (player: PlayerTournamentCard) => {
  const { careerAccolades: displayOnlyCareerAccolades, ...gameplay } =
    player;
  void displayOnlyCareerAccolades;
  return gameplay;
};

const schemaIssues = (
  player: PlayerTournamentCard,
  accolades: PlayerAccolade[],
) => {
  const result = playerCardSchema.safeParse({
    ...player,
    careerAccolades: accolades,
  });
  return result.success
    ? []
    : result.error.issues.map((issue) => ({
        code: issue.code,
        path: issue.path.join("."),
        message: issue.message,
      }));
};

const fileHashes = async () => {
  const filenames = [
    "src/data/player-tournaments.generated.json",
    "src/data/player-tournaments-2026.generated.json",
    "src/data/player-career.generated.json",
  ];
  return Object.fromEntries(
    await Promise.all(
      filenames.map(async (filename) => [
        filename,
        sha256(await readFile(path.join(ROOT, filename))),
      ]),
    ),
  );
};

const main = async () => {
  const [auditRaw, canonicalRaw] = await Promise.all([
    readFile(AUDIT_FILE, "utf8"),
    readFile(CANONICAL_FILE, "utf8"),
  ]);
  const audit = JSON.parse(auditRaw) as IdentityAuditArtifact;
  const rawDuplicateJsonKeys = [
    ...duplicateJsonKeyPaths(auditRaw).map(
      (jsonPath) => `${path.relative(ROOT, AUDIT_FILE)}#${jsonPath}`,
    ),
    ...duplicateJsonKeyPaths(canonicalRaw).map(
      (jsonPath) => `${path.relative(ROOT, CANONICAL_FILE)}#${jsonPath}`,
    ),
  ].sort(compareStrings);
  const archiveCards = [...allPlayersBeforeIdentityPruning].sort(
    (first, second) => compareStrings(first.id, second.id),
  );
  const archiveCardIds = archiveCards.map((card) => card.id);
  const archiveCardIdSet = new Set(archiveCardIds);
  const duplicateArchiveCardIds = duplicateValues(archiveCardIds);
  const playableCards = getPlayablePlayers().sort((first, second) =>
    compareStrings(first.id, second.id),
  );
  const playableCardIds = playableCards.map((card) => card.id);
  const duplicatePlayableCardIds = duplicateValues(playableCardIds);
  const cardsByIdentity = new Map<string, PlayerTournamentCard[]>();
  for (const card of playableCards) {
    cardsByIdentity.set(card.playerIdentityId, [
      ...(cardsByIdentity.get(card.playerIdentityId) ?? []),
      card,
    ]);
  }
  const playableIdentityIds = [...cardsByIdentity.keys()].sort(compareStrings);
  const archiveIdentityIds = [
    ...new Set(
      archiveCards.map((player) => player.playerIdentityId),
    ),
  ].sort(compareStrings);
  const archiveIdentityIdSet = new Set(archiveIdentityIds);
  const canonicalIdentityIds = Object.keys(
    identityAccolades.identities,
  ).sort(compareStrings);
  const auditIdentityIds = audit.identities.map(
    (identity) => identity.playerIdentityId,
  );
  const auditIdentityIdSet = new Set(auditIdentityIds);
  const auditByIdentity = new Map(
    audit.identities.map((identity) => [identity.playerIdentityId, identity]),
  );
  const auditCardIds = audit.identities.flatMap(
    (identity) => identity.relatedCardIds,
  );
  const auditCardIdSet = new Set(auditCardIds);
  const duplicateAuditIdentityIds = duplicateValues(auditIdentityIds);
  const duplicateAuditCardIds = duplicateValues(auditCardIds);
  const archiveIdentityIdsMissingFromCanonical = archiveIdentityIds.filter(
    (identityId) => !identityAccolades.identities[identityId],
  );
  const canonicalIdentityIdsMissingFromArchive = canonicalIdentityIds.filter(
    (identityId) => !archiveIdentityIdSet.has(identityId),
  );
  const archiveIdentityIdsMissingFromAudit = archiveIdentityIds.filter(
    (identityId) => !auditIdentityIdSet.has(identityId),
  );
  const auditIdentityIdsMissingFromArchive = auditIdentityIds.filter(
    (identityId) => !archiveIdentityIdSet.has(identityId),
  );
  const canonicalIdentityIdSet = new Set(canonicalIdentityIds);
  const auditIdentityIdsMissingFromCanonical = auditIdentityIds.filter(
    (identityId) => !canonicalIdentityIdSet.has(identityId),
  );
  const canonicalIdentityIdsMissingFromAudit = canonicalIdentityIds.filter(
    (identityId) => !auditIdentityIdSet.has(identityId),
  );
  const archiveCardIdsMissingFromAudit = archiveCardIds.filter(
    (cardId) => !auditCardIdSet.has(cardId),
  );
  const auditCardIdsMissingFromArchive = auditCardIds.filter(
    (cardId) => !archiveCardIdSet.has(cardId),
  );
  const archiveCardIdsByIdentity = new Map<string, string[]>();
  for (const card of archiveCards) {
    archiveCardIdsByIdentity.set(card.playerIdentityId, [
      ...(archiveCardIdsByIdentity.get(card.playerIdentityId) ?? []),
      card.id,
    ]);
  }
  const auditCardIdentityMismatchIds = archiveIdentityIds.filter(
    (identityId) =>
      canonicalJson(
        [...(archiveCardIdsByIdentity.get(identityId) ?? [])].sort(
          compareStrings,
        ),
      ) !==
      canonicalJson(
        [...(auditByIdentity.get(identityId)?.relatedCardIds ?? [])].sort(
          compareStrings,
        ),
      ),
  );
  const auditCanonicalAccoladeMismatchIdentityIds = archiveIdentityIds.filter(
    (identityId) =>
      canonicalJson(identityAccolades.identities[identityId]?.accolades ?? []) !==
      canonicalJson(
        auditByIdentity.get(identityId)?.correctedCanonicalCareerAccolades ?? [],
      ),
  );
  const invalidAuditScopeCounts = [
    ...(audit.scope?.uniqueIdentities === auditIdentityIds.length
      ? []
      : [
          `scope.uniqueIdentities=${audit.scope?.uniqueIdentities ?? "missing"}; actual=${auditIdentityIds.length}`,
        ]),
    ...(audit.scope?.coveredPlayerCards === auditCardIds.length
      ? []
      : [
          `scope.coveredPlayerCards=${audit.scope?.coveredPlayerCards ?? "missing"}; actual=${auditCardIds.length}`,
        ]),
  ];
  const playableIdentityIdsMissingFromCanonical = playableIdentityIds.filter(
    (identityId) => !identityAccolades.identities[identityId],
  );
  const invalidCardIdentityIds = playableCards
    .filter(
      (card) =>
        !archiveIdentityIdSet.has(card.playerIdentityId) ||
        !identityAccolades.identities[card.playerIdentityId],
    )
    .map((card) => card.id);

  const identities = playableIdentityIds.map((identityId) => {
    const cards = [...(cardsByIdentity.get(identityId) ?? [])].sort(
      (first, second) => compareStrings(first.id, second.id),
    );
    const record = identityAccolades.identities[identityId];
    const accolades = record?.accolades ?? [];
    const duplicateAccoladeIds = duplicateValues(
      accolades.map((accolade) => accolade.id),
    );
    const duplicateNormalizedAccolades = duplicateValues(
      accolades.map(normalizeAccolade),
    );
    const duplicateSemanticAccoladeFamilies = duplicateValues(
      accolades.map(normalizeSemanticTrophyFamily),
    );
    const cardSchemaIssues =
      cards.length > 0 ? schemaIssues(cards[0], accolades) : [];
    const runtimeMismatchCardIds = cards
      .filter(
        (card) =>
          canonicalJson(card.careerAccolades) !==
          canonicalJson(accolades),
      )
      .map((card) => card.id);
    const transfermarktValidation = validateTransfermarktSource(
      record?.sourceReview?.transfermarkt,
    );
    const fbrefValidation = validateFbrefSource(
      record?.sourceReview?.fbref,
    );
    const sourceReviewIssues = [
      ...transfermarktValidation.issues,
      ...fbrefValidation.issues,
    ];
    const reviewDateInFuture =
      isCalendarDate(record?.reviewedAt) && record.reviewedAt > TODAY;
    const reviewed =
      Boolean(record) &&
      validReviewDate(record.reviewedAt) &&
      transfermarktValidation.checked &&
      fbrefValidation.checked;
    const alternativeSources = record?.sourceReview?.alternatives ?? [];
    const invalidAlternativeSourceIssues = alternativeSources.flatMap(
      alternativeSourceIssues,
    );
    const validAlternativeSources = alternativeSources.filter(
      (source, index) => alternativeSourceIssues(source, index).length === 0,
    );
    const alternativeSourceKeys = validAlternativeSources.map(
      (source) => `${source.sourceName}\u0000${source.url}`,
    );
    const exactAlternativeSourceKeys = new Set(alternativeSourceKeys);
    const duplicateAlternativeSourceKeys = duplicateValues(
      alternativeSourceKeys,
    );
    const undocumentedAlternativeAccoladeIds = accolades
      .filter(
        (accolade) =>
          accolade.sourceName !== "Transfermarkt" &&
          accolade.sourceName !== "FBref" &&
          !exactAlternativeSourceKeys.has(
            `${accolade.sourceName}\u0000${accolade.sourceUrl ?? ""}`,
          ),
      )
      .map((accolade) => accolade.id);
    const missingSourceUrlAccoladeIds = accolades
      .filter((accolade) => !accolade.sourceUrl)
      .map((accolade) => accolade.id);
    const invalidSourceUrlAccoladeIds = accolades
      .filter(
        (accolade) =>
          Boolean(accolade.sourceUrl) &&
          !parseHttpsUrl(accolade.sourceUrl),
      )
      .map((accolade) => accolade.id);
    const invalidTransfermarktSourceAccoladeIds = accolades
      .filter(
        (accolade) =>
          accolade.sourceName === "Transfermarkt" &&
          (!transfermarktValidation.usableAccoladeEvidence ||
            accolade.sourceUrl !==
              record?.sourceReview?.transfermarkt.url),
      )
      .map((accolade) => accolade.id);
    const invalidFbrefSourceAccoladeIds = accolades
      .filter(
        (accolade) =>
          accolade.sourceName === "FBref" &&
          (!fbrefValidation.usableAccoladeEvidence ||
            accolade.sourceUrl !== record?.sourceReview?.fbref.url),
      )
      .map((accolade) => accolade.id);
    const unverifiedAccoladeIds = accolades
      .filter((accolade) => accolade.verified !== true)
      .map((accolade) => accolade.id);
    const exactAlternativeEvidenceAccoladeIds = accolades
      .filter(
        (accolade) =>
          accolade.sourceName !== "Transfermarkt" &&
          accolade.sourceName !== "FBref" &&
          exactAlternativeSourceKeys.has(
            `${accolade.sourceName}\u0000${accolade.sourceUrl ?? ""}`,
          ),
      )
      .map((accolade) => accolade.id);
    const unsupportedFbrefFallbackAccoladeIds =
      fbrefValidation.accessBlocked || fbrefValidation.noProfile
        ? accolades
            .filter((accolade) => {
              const checkedTransfermarktEvidence =
                accolade.sourceName === "Transfermarkt" &&
                transfermarktValidation.usableAccoladeEvidence &&
                accolade.sourceUrl ===
                  record?.sourceReview?.transfermarkt.url;
              const exactAlternativeEvidence =
                accolade.sourceName !== "Transfermarkt" &&
                accolade.sourceName !== "FBref" &&
                exactAlternativeSourceKeys.has(
                  `${accolade.sourceName}\u0000${accolade.sourceUrl ?? ""}`,
                );
              return !checkedTransfermarktEvidence && !exactAlternativeEvidence;
            })
            .map((accolade) => accolade.id)
        : [];
    const missingNoProfileAlternativeEvidence =
      (transfermarktValidation.noProfile || fbrefValidation.noProfile) &&
      exactAlternativeEvidenceAccoladeIds.length === 0;
    const sourceLinkageIssueAccoladeIds = [
      ...new Set([
        ...missingSourceUrlAccoladeIds,
        ...invalidSourceUrlAccoladeIds,
        ...invalidTransfermarktSourceAccoladeIds,
        ...invalidFbrefSourceAccoladeIds,
        ...undocumentedAlternativeAccoladeIds,
        ...unsupportedFbrefFallbackAccoladeIds,
      ]),
    ].sort(compareStrings);
    const invalidAlternativeSources = alternativeSources.filter(
      (source, index) => alternativeSourceIssues(source, index).length > 0,
    );
    const unresolvedReasons = [
      ...(!record ? ["No canonical identity accolade record exists."] : []),
      ...(record && accolades.length === 0
        ? ["The canonical accolade list is empty."]
        : []),
      ...(record?.verificationStatus !== "verified"
        ? [
            `Verification status is ${record?.verificationStatus ?? "missing"}, not verified.`,
          ]
        : []),
      ...(record?.researchStatus !== "complete"
        ? ["The identity research status is not complete."]
        : []),
      ...(reviewDateInFuture
        ? [`The identity review date ${record?.reviewedAt} is in the future.`]
        : !validReviewDate(record?.reviewedAt)
          ? ["No valid identity review date is recorded."]
        : []),
      ...(sourceReviewIssues.length > 0
        ? ["Transfermarkt or FBref source review is missing or invalid."]
        : []),
      ...(duplicateAccoladeIds.length > 0 ||
      duplicateNormalizedAccolades.length > 0 ||
      duplicateSemanticAccoladeFamilies.length > 0
        ? ["Duplicate identity-level accolade records exist."]
        : []),
      ...(cardSchemaIssues.length > 0
        ? ["The canonical accolades fail the existing player-card schema."]
        : []),
      ...(runtimeMismatchCardIds.length > 0
        ? ["One or more playable cards do not resolve the canonical list."]
        : []),
      ...(missingSourceUrlAccoladeIds.length > 0
        ? ["Every accolade must record its exact sourceUrl."]
        : []),
      ...(sourceLinkageIssueAccoladeIds.length > 0
        ? ["One or more accolade sources do not link to exact checked evidence."]
        : []),
      ...(invalidAlternativeSourceIssues.length > 0 ||
      duplicateAlternativeSourceKeys.length > 0 ||
      missingNoProfileAlternativeEvidence
        ? ["Alternative-source evidence is missing, duplicated, or invalid."]
        : []),
      ...(unverifiedAccoladeIds.length > 0
        ? ["One or more accolades are not explicitly verified."]
        : []),
    ];
    const completed =
      reviewed &&
      record?.researchStatus === "complete" &&
      record.verificationStatus === "verified" &&
      accolades.length > 0 &&
      duplicateAccoladeIds.length === 0 &&
      duplicateNormalizedAccolades.length === 0 &&
      duplicateSemanticAccoladeFamilies.length === 0 &&
      cardSchemaIssues.length === 0 &&
      runtimeMismatchCardIds.length === 0 &&
      sourceReviewIssues.length === 0 &&
      sourceLinkageIssueAccoladeIds.length === 0 &&
      missingSourceUrlAccoladeIds.length === 0 &&
      invalidSourceUrlAccoladeIds.length === 0 &&
      unverifiedAccoladeIds.length === 0 &&
      invalidAlternativeSources.length === 0 &&
      duplicateAlternativeSourceKeys.length === 0 &&
      !missingNoProfileAlternativeEvidence;

    return {
      playerIdentityId: identityId,
      playableCardIds: cards.map((card) => card.id),
      reviewedAt: record?.reviewedAt ?? null,
      verificationStatus: record?.verificationStatus ?? null,
      researchStatus: record?.researchStatus ?? null,
      reviewed,
      completed,
      accoladeCount: accolades.length,
      accolades,
      sourceReview: record?.sourceReview ?? null,
      validation: {
        duplicateAccoladeIds,
        duplicateNormalizedAccolades,
        duplicateSemanticAccoladeFamilies,
        schemaIssues: cardSchemaIssues,
        runtimeMismatchCardIds,
        reviewDateInFuture,
        sourceReviewIssues,
        missingSourceUrlAccoladeIds,
        invalidSourceUrlAccoladeIds,
        invalidTransfermarktSourceAccoladeIds,
        invalidFbrefSourceAccoladeIds,
        sourceLinkageIssueAccoladeIds,
        unverifiedAccoladeIds,
        undocumentedAlternativeAccoladeIds,
        invalidAlternativeSources,
        invalidAlternativeSourceIssues,
        duplicateAlternativeSourceKeys,
        exactAlternativeEvidenceAccoladeIds,
        unsupportedFbrefFallbackAccoladeIds,
        missingNoProfileAlternativeEvidence,
      },
      unresolvedReasons: [...new Set(unresolvedReasons)],
    };
  });

  const reviewedIdentityIds = identities
    .filter((identity) => identity.reviewed)
    .map((identity) => identity.playerIdentityId);
  const completedIdentityIds = identities
    .filter((identity) => identity.completed)
    .map((identity) => identity.playerIdentityId);
  const unresolvedIdentityIds = identities
    .filter((identity) => !identity.completed)
    .map((identity) => identity.playerIdentityId);
  const emptyIdentityIds = identities
    .filter((identity) => identity.accoladeCount === 0)
    .map((identity) => identity.playerIdentityId);
  const runtimeMismatchCardIds = identities.flatMap(
    (identity) => identity.validation.runtimeMismatchCardIds,
  );
  const duplicateAccoladeIdentityIds = identities
    .filter(
      (identity) =>
        identity.validation.duplicateAccoladeIds.length > 0 ||
        identity.validation.duplicateNormalizedAccolades.length > 0 ||
        identity.validation.duplicateSemanticAccoladeFamilies.length > 0,
    )
    .map((identity) => identity.playerIdentityId);
  const schemaInvalidIdentityIds = identities
    .filter((identity) => identity.validation.schemaIssues.length > 0)
    .map((identity) => identity.playerIdentityId);
  const alternativeSourceIdentityIds = identities
    .filter(
      (identity) =>
        (identity.sourceReview?.alternatives.length ?? 0) > 0,
    )
    .map((identity) => identity.playerIdentityId);

  const displaySelectorMutationCardIds: string[] = [];
  const legacyScoreDisplayDependencyCardIds: string[] = [];
  for (const card of playableCards) {
    const before = canonicalJson(gameplayProjection(card));
    getPlayerAccoladeItems(card);
    const after = canonicalJson(gameplayProjection(card));
    if (before !== after) displaySelectorMutationCardIds.push(card.id);
    const score = calculatePlayerLegacyScore(card);
    const scoreWithoutDisplayAccolades = calculatePlayerLegacyScore({
      ...card,
      careerAccolades: [],
    });
    if (score !== scoreWithoutDisplayAccolades) {
      legacyScoreDisplayDependencyCardIds.push(card.id);
    }
  }

  const priority = ["rodri", "lamine-yamal"].map((identityId) => {
    const identity = identities.find(
      (candidate) => candidate.playerIdentityId === identityId,
    );
    const cards = cardsByIdentity.get(identityId) ?? [];
    return {
      playerIdentityId: identityId,
      playableCardIds: identity?.playableCardIds ?? [],
      completed: identity?.completed ?? false,
      reviewedAt: identity?.reviewedAt ?? null,
      transfermarkt: identity?.sourceReview?.transfermarkt ?? null,
      fbref: identity?.sourceReview?.fbref ?? null,
      alternatives: identity?.sourceReview?.alternatives ?? [],
      accolades: identity?.accolades ?? [],
      allCardsResolveSameAccolades:
        (identity?.validation.runtimeMismatchCardIds.length ?? 1) === 0,
      gameplayBaseline: cards.map((card) => ({
        cardId: card.id,
        overall: card.overall,
        primaryPosition: card.primaryPosition,
        eligiblePositions: card.eligiblePositions,
        attributes: card.attributes,
        tournamentStats: card.tournamentStats,
        legacyScore: calculatePlayerLegacyScore(card),
      })),
    };
  });

  const structuralIssueCount =
    rawDuplicateJsonKeys.length +
    duplicateArchiveCardIds.length +
    duplicatePlayableCardIds.length +
    duplicateAuditIdentityIds.length +
    duplicateAuditCardIds.length +
    archiveIdentityIdsMissingFromCanonical.length +
    canonicalIdentityIdsMissingFromArchive.length +
    archiveIdentityIdsMissingFromAudit.length +
    auditIdentityIdsMissingFromArchive.length +
    auditIdentityIdsMissingFromCanonical.length +
    canonicalIdentityIdsMissingFromAudit.length +
    archiveCardIdsMissingFromAudit.length +
    auditCardIdsMissingFromArchive.length +
    auditCardIdentityMismatchIds.length +
    auditCanonicalAccoladeMismatchIdentityIds.length +
    invalidAuditScopeCounts.length +
    playableIdentityIdsMissingFromCanonical.length +
    invalidCardIdentityIds.length +
    duplicateAccoladeIdentityIds.length +
    schemaInvalidIdentityIds.length +
    runtimeMismatchCardIds.length +
    displaySelectorMutationCardIds.length +
    legacyScoreDisplayDependencyCardIds.length;
  const researchIssueCount = unresolvedIdentityIds.length;

  const report = {
    schemaVersion: 1,
    generatedAt: `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`,
    scope: {
      cardSource: "getPlayablePlayers()",
      derivation:
        "Map-deduplicated card IDs from draftEligiblePlayers, then grouped by playerIdentityId across all enabled gameplay pools.",
      totalArchiveCards: archiveCards.length,
      totalArchiveIdentityRecords: archiveIdentityIds.length,
      totalAuditCoveredCards: auditCardIds.length,
      totalAuditIdentityRecords: auditIdentityIds.length,
      totalCanonicalIdentityRecords: canonicalIdentityIds.length,
      totalArchiveCardsLinkedToCanonicalRecords: archiveCards.filter((card) =>
        canonicalIdentityIdSet.has(card.playerIdentityId),
      ).length,
      totalPlayableCards: playableCards.length,
      totalPlayableIdentityRecords: playableIdentityIds.length,
      totalPlayableIdentities: playableIdentityIds.length,
      totalPlayableCardsLinkedToCanonicalRecords: playableCards.filter(
        (card) => canonicalIdentityIdSet.has(card.playerIdentityId),
      ).length,
      multiCardPlayableIdentities: identities.filter(
        (identity) => identity.playableCardIds.length > 1,
      ).length,
      canonicalArtifact:
        "src/data/player-career-accolades-by-identity.generated.json",
      tournamentYearFilteringApplied: false,
      postTournamentYearCareerAccoladesAllowed: true,
    },
    definitions: {
      reviewed:
        "A playable identity has a real, nonfuture review date plus provider-specific checked Transfermarkt and FBref records whose HTTPS host, path, player ID, and status agree.",
      completed:
        "A reviewed identity is verified, explicitly complete, nonempty, schema-valid, semantically duplicate-free, exactly source-traceable, and identical across all playable tournament cards. FBref access-blocked/no-profile checks require usable Transfermarkt or exact authoritative alternative evidence and cannot themselves support an accolade.",
      unresolved:
        "Any playable identity that does not meet the completed definition. Existing queued, empty, inferred, partial, or undated records are not counted as complete.",
      reportOnly:
        "--report-only permits unresolved research during deterministic batching; structural corruption still exits nonzero.",
    },
    batching: {
      order: "playerIdentityId ascending",
      batchSize: 25,
      priorityBatch: ["rodri", "lamine-yamal"],
      nextBatchIdentityIds: unresolvedIdentityIds.slice(0, 25),
    },
    summary: {
      totalArchiveCards: archiveCards.length,
      totalArchiveIdentityRecords: archiveIdentityIds.length,
      totalAuditCoveredCards: auditCardIds.length,
      totalAuditIdentityRecords: auditIdentityIds.length,
      totalPlayableCards: playableCards.length,
      totalPlayableIdentityRecords: playableIdentityIds.length,
      totalPlayableIdentities: playableIdentityIds.length,
      canonicalAccoladeRecords: canonicalIdentityIds.length,
      playableCardsLinkedToCanonicalRecords: playableCards.filter(
        (card) => canonicalIdentityIdSet.has(card.playerIdentityId),
      ).length,
      identitiesReviewed: reviewedIdentityIds.length,
      identitiesCompleted: completedIdentityIds.length,
      identitiesUnresolved: unresolvedIdentityIds.length,
      identitiesWithEmptyAccolades: emptyIdentityIds.length,
      identitiesUsingAlternativeSources:
        alternativeSourceIdentityIds.length,
      structuralIssueCount,
      researchIssueCount,
      researchComplete: researchIssueCount === 0,
    },
    exactIds: {
      reviewedIdentityIds,
      completedIdentityIds,
      unresolvedIdentityIds,
      emptyIdentityIds,
      alternativeSourceIdentityIds,
    },
    structuralIssues: {
      rawDuplicateJsonKeys,
      duplicateArchiveCardIds,
      duplicatePlayableCardIds,
      duplicateAuditIdentityIds,
      duplicateAuditCardIds,
      archiveIdentityIdsMissingFromCanonical,
      canonicalIdentityIdsMissingFromArchive,
      archiveIdentityIdsMissingFromAudit,
      auditIdentityIdsMissingFromArchive,
      auditIdentityIdsMissingFromCanonical,
      canonicalIdentityIdsMissingFromAudit,
      archiveCardIdsMissingFromAudit,
      auditCardIdsMissingFromArchive,
      auditCardIdentityMismatchIds,
      auditCanonicalAccoladeMismatchIdentityIds,
      invalidAuditScopeCounts,
      playableIdentityIdsMissingFromCanonical,
      invalidCardIdentityIds,
      duplicateAccoladeIdentityIds,
      schemaInvalidIdentityIds,
      runtimeMismatchCardIds,
    },
    gameplayProtection: {
      projectionSha256: sha256(
        canonicalJson(playableCards.map(gameplayProjection)),
      ),
      sourceFileSha256: await fileHashes(),
      displaySelectorMutationCardIds,
      legacyScoreDisplayDependencyCardIds,
      assertion:
        "Displayed identity accolades are excluded from the gameplay projection, and frozen legacy scoring returns the same result when a card's display accolade array is empty.",
    },
    priority,
    identities,
  };

  await mkdir(path.dirname(REPORT_FILE), { recursive: true });
  await writeFile(REPORT_FILE, `${JSON.stringify(report, null, 2)}\n`);

  console.log("Playable identity accolade coverage");
  console.log(JSON.stringify(report.summary));
  console.log(`Wrote ${path.relative(ROOT, REPORT_FILE)}.`);

  if (
    structuralIssueCount > 0 ||
    (!REPORT_ONLY && researchIssueCount > 0)
  ) {
    process.exitCode = 1;
  }
};

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
