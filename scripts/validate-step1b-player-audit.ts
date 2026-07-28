import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { allPlayersBeforeIdentityPruning } from "../src/data/players";
import type {
  PlayerAccolade,
  PlayerAccoladeCategory,
} from "../src/types/game";

/**
 * Read-only validation for the final Step 1B portrait evidence and
 * identity-level Career Accolades projection.
 *
 * Run with:
 *   node --import tsx scripts/validate-step1b-player-audit.ts
 */

type VerificationStatus =
  | "verified"
  | "partially-verified"
  | "unresolved"
  | "verified-no-recorded-major-accolades";

type DisplayIdentity = {
  verificationStatus: VerificationStatus;
  accolades: PlayerAccolade[];
};

type DisplayArchive = {
  version: number;
  generatedAt: string;
  sourceGameplayArchive: string;
  sourceLegacyCardAudit: string;
  identities: Record<string, DisplayIdentity>;
};

type SourceReference = {
  playerId: string;
  url: string;
};

type NormalizedAchievement = {
  normalizedKey: string;
  normalizedLabel: string;
  displayLabel: string;
  count: number;
  seasonsOrYears: string[];
  clubsOrNationalTeams: string[];
  category: PlayerAccoladeCategory;
  transfermarktSource: SourceReference | null;
  fbrefSource: SourceReference | null;
  verificationStatus:
    | "verified-source-page"
    | "verified-stored-source";
};

type IdentityAuditRow = {
  playerIdentityId: string;
  relatedCardIds: string[];
  transfermarktPlayerId: string | null;
  transfermarktUrl: string | null;
  transfermarktPageChecked: boolean;
  fbrefPlayerId: string | null;
  fbrefUrl: string | null;
  fbrefPageChecked: boolean;
  correctedCanonicalCareerAccolades: PlayerAccolade[];
  normalizedAchievements: NormalizedAchievement[];
  normalizedAchievementKeys: string[];
  verificationStatus: VerificationStatus;
  sourceConflicts: string[];
};

type StatusCounts = Record<VerificationStatus, number>;

type IdentityAudit = {
  version: number;
  generatedAt: string;
  scope: {
    uniqueIdentities: number;
    coveredPlayerCards: number;
    sourceYears: number[];
  };
  summary: {
    statusCounts: StatusCounts;
    verifiedAchievementRecords: number;
    verifiedAchievementOccurrences: number;
  };
  identities: IdentityAuditRow[];
};

type MultiCardAuditRow = {
  playerIdentityId: string;
  cardIds: string[];
  previousAccoladesByCard: Record<string, PlayerAccolade[]>;
  previousHashesByCard: Record<string, string>;
  previousDifferences: string;
  previouslyConsistent: boolean;
  finalSharedCareerAccoladeHash: string;
  finalConsistencyStatus: string;
};

type MultiCardAudit = {
  version: number;
  generatedAt: string;
  summary: {
    multiCardIdentities: number;
    cardsCovered: number;
    previouslyInconsistent: number;
    corrected: number;
    finalInconsistent: number;
  };
  identities: MultiCardAuditRow[];
};

type CareerSummary = {
  version: number;
  generatedAt: string;
  branch: string;
  preservedCommit: string;
  careerAccolades: {
    uniqueIdentitiesAudited: number;
    playerCardsCovered: number;
    statusCounts: StatusCounts;
    verifiedAchievementRecords: number;
    verifiedAchievementOccurrences: number;
    multiCardIdentities: number;
    multiCardIdentitiesPreviouslyInconsistent: number;
    multiCardIdentitiesCorrected: number;
    perisic: {
      cardIds: string[];
      canonicalCareerAccoladeHash: string;
      canonicalCareerAccoladeRecords: number;
      finalConsistencyStatus: string;
    };
  };
  gameplayProtection: {
    displayArtifact: string;
    frozenGameplayArtifact: string;
    gameplayArtifactChanged: boolean;
  };
  artifacts: string[];
};

type PortraitAuditCard = {
  playerCardId: string;
  playerIdentityId: string;
  worldCupYear: number;
  localImagePath: string;
  imageSha256: string | null;
  imageVisualSha256: string | null;
  imageValidationStatus: string;
  finalPortraitStatus: string;
  unresolvedReason: string | null;
};

type PortraitAudit = {
  version: number;
  cards: PortraitAuditCard[];
  summary: {
    totalCards: number;
    verified: number;
    unresolved: number;
    byStatus: Record<string, number>;
    byYear: Record<
      string,
      {
        total: number;
        verified: number;
        unresolved: number;
      }
    >;
    finalPortraitStatuses: Record<string, number>;
    photoPendingWithSpecificReason: number;
    canonicalPixelDuplicateGroups: number;
    crossIdentityCanonicalPixelDuplicateErrors: number;
    perceptualCandidates: number;
    manuallyReviewedPerceptualPairs: number;
    automatedPerceptualCandidates: number;
  };
};

type UnresolvedPortraitAudit = {
  version: number;
  summary: {
    total: number;
    finalPortraitStatus: string;
    withSpecificUnresolvedReason: number;
    byStatus: Record<string, number>;
    byYear: Record<string, number>;
  };
  cards: PortraitAuditCard[];
};

type ReviewedAsset = {
  playerCardId: string;
  imageSha256: string;
  canonicalPixelSha256: string;
};

type PerceptualPair = {
  pairId: string;
  cardA: string;
  cardB: string;
  identityA: string;
  identityB: string;
  hammingDistance: number;
  reviewStatus: string;
  reviewOutcome: string | null;
  reviewer: string | null;
  reviewedAt: string | null;
  reviewedAssetEvidence: {
    cardA: ReviewedAsset;
    cardB: ReviewedAsset;
  } | null;
};

type PortraitDuplicateAudit = {
  version: number;
  summary: {
    exactGroups: number;
    crossIdentityExactErrors: number;
    canonicalPixelGroups: number;
    crossIdentityCanonicalPixelErrors: number;
    perceptualCandidatePairs: number;
    manuallyReviewedSimilarPairs: number;
    automatedSimilarCandidates: number;
  };
  exactDuplicateGroups: unknown[];
  canonicalPixelDuplicateGroups: unknown[];
  similarMatches: PerceptualPair[];
};

type PortraitSummary = {
  version: number;
  generatedAt: string;
  scope: {
    tournamentYears: number[];
  };
  summary: {
    totalCards: number;
    verifiedPortraits: number;
    photoPending: number;
    photoPendingWithSpecificReason: number;
    newlyPromotedPortraits: number;
    verifiedAssetsChanged: number;
    productionRegistryChanged: boolean;
    byYear: Record<
      string,
      {
        total: number;
        verified: number;
        photoPending: number;
      }
    >;
  };
  unresolvedReasons: {
    byValidationStatus: Record<string, number>;
    everyPhotoPendingCardHasSpecificReason: boolean;
  };
  duplicateEvidence: {
    exactByteDuplicateGroups: number;
    crossIdentityExactByteErrors: number;
    canonicalPixelDuplicateGroups: number;
    crossIdentityCanonicalPixelErrors: number;
    perceptualCandidatePairs: number;
    manuallyReviewedDistanceZeroPairs: number;
    automatedNonzeroCandidates: number;
    manualPairIds: string[];
  };
  preservationEvidence: {
    productionRegistryPath: string;
    productionRegistrySha256: string;
    verifiedAssetHashSetSha256: string;
    verifiedAssetCount: number;
    contactSheets: Array<{
      tournamentYear: number;
      path: string;
      sha256: string;
      regenerated: boolean;
    }>;
  };
};

type CombinedSummary = {
  version: number;
  generatedAt: string;
  branch: string;
  preservedCommit: string;
  careerAccolades: CareerSummary["careerAccolades"];
  portraits: {
    tournamentYears: number[];
    totalCards: number;
    totalsByYear: PortraitSummary["summary"]["byYear"];
    newlyVerifiedPortraits: number;
    replacedPortraits: number;
    preservedVerifiedPortraits: number;
    photoPendingTotal: number;
    photoPendingByYear: Record<string, number>;
    productionRegistryChanged: boolean;
    duplicateImageProblemsFixed: number;
    exactByteDuplicateGroups: number;
    canonicalPixelDuplicateGroups: number;
    unresolvedCrossIdentityDuplicateErrors: number;
    perceptualCandidatePairs: number;
    manuallyReviewedDistanceZeroPairs: number;
    automatedNonzeroCandidates: number;
    contactSheets: PortraitSummary["preservationEvidence"]["contactSheets"];
  };
  gameplayProtection: CareerSummary["gameplayProtection"];
  reports: {
    careerAccoladeAudit: string;
    multiCardConsistency: string;
    portraitAudit: string;
    portraitUnresolved: string;
    portraitDuplicates: string;
    careerSummary: string;
    portraitSummary: string;
    combinedSummary: string;
  };
};

type PortraitRegistryEntry = {
  cardId: string;
  playerIdentityId: string;
  tournamentYear: number;
  localPath: string;
  sha256: string;
  cacheVersion: string;
};

type PortraitRegistry = {
  version: number;
  portraits: PortraitRegistryEntry[];
};

const ROOT = process.cwd();
const files = {
  displayAccolades: path.join(
    ROOT,
    "src",
    "data",
    "player-career-accolades-by-identity.generated.json",
  ),
  identityAudit: path.join(
    ROOT,
    "reports",
    "step1b-career-accolade-audit.json",
  ),
  multiCardAudit: path.join(
    ROOT,
    "reports",
    "step1b-multi-card-accolade-consistency.json",
  ),
  careerSummary: path.join(
    ROOT,
    "reports",
    "step1b-career-accolade-summary.json",
  ),
  combinedSummary: path.join(
    ROOT,
    "reports",
    "step1b-summary.json",
  ),
  portraitAudit: path.join(
    ROOT,
    "reports",
    "step1-player-image-audit.json",
  ),
  unresolvedPortraitAudit: path.join(
    ROOT,
    "reports",
    "step1-player-image-unresolved.json",
  ),
  portraitDuplicateAudit: path.join(
    ROOT,
    "reports",
    "step1-player-image-duplicates.json",
  ),
  portraitSummary: path.join(
    ROOT,
    "reports",
    "step1b-player-portrait-summary.json",
  ),
  portraitRegistry: path.join(
    ROOT,
    "src",
    "data",
    "tournament-edition-player-portraits.generated.json",
  ),
  publicPortraits: path.join(ROOT, "public", "assets", "players", "game-faces"),
};

const EXPECTED = {
  identities: 7_254,
  playerCards: 9_626,
  multiCardIdentities: 1_818,
  targetPortraitCards: 3_550,
  verifiedPortraits: 1_441,
  photoPending: 2_109,
  perceptualPairs: 3_321,
  manualPerceptualPairs: 6,
  automatedPerceptualPairs: 3_315,
  portraitRegistrySha256:
    "62ac39aa10fdd4b601a82a9c740abb384fc8ad4681c66cda6ec4223b23681054",
  verifiedAssetHashSetSha256:
    "0cff2418db897158c6f7cd1953c367c4408410e004c1141ab95a8dcedb2fb595",
} as const;

const EXPECTED_PORTRAITS_BY_YEAR = {
  2014: { total: 736, verified: 374, photoPending: 362 },
  2018: { total: 736, verified: 219, photoPending: 517 },
  2022: { total: 831, verified: 364, photoPending: 467 },
  2026: { total: 1_247, verified: 484, photoPending: 763 },
} as const;

const EXPECTED_PENDING_BY_STATUS = {
  "unresolved-edition-unavailable": 11,
  "unresolved-identity-verification": 2_045,
  "unresolved-no-sofifa-mapping": 53,
} as const;

const EXPECTED_CONTACT_SHEET_HASHES = new Map<number, string>([
  [
    2014,
    "6e9077f04889a15871c1dfbeb6eda401794fcdde8e62ad1234ded7a9e76c1e44",
  ],
  [
    2018,
    "d04876264ddd037dc1830b108e11c7256c876adcc001f0ea6b9cfd094fc9186e",
  ],
  [
    2022,
    "27c837ed098302401716c627ea859ca90ba1bde2a9849677b1e17abe1ce1a59f",
  ],
  [
    2026,
    "c092e60756d96d3b21d59495596410edc02cc00203bf142cda57d2b2fed55a03",
  ],
]);

const MANUAL_PAIR_IDS = [
  "denzel-dumfries-2026::kylian-mbappe-2018",
  "denzel-dumfries-2026::lutsharel-geertruida-2026",
  "diarra-habib-2026::nicolas-pepe-2026",
  "diarra-habib-2026::wan-bissaka-aaron-2026",
  "kylian-mbappe-2018::lutsharel-geertruida-2026",
  "nicolas-pepe-2026::wan-bissaka-aaron-2026",
] as const;

const STATUSES: VerificationStatus[] = [
  "verified",
  "partially-verified",
  "unresolved",
  "verified-no-recorded-major-accolades",
];

const ACCOLADE_CATEGORIES = new Set<PlayerAccoladeCategory>([
  "international",
  "continental",
  "domestic-league",
  "domestic-cup",
  "individual",
  "curated",
]);

const DISALLOWED_FINAL_ACCOLADE =
  /\b(?:runners? up|runner up|finalists?|semi finalists?|semifinalists?|third place|fourth place|youth|reserves?|(?:under|u) ?(?:15|16|17|18|19|20|21|22|23)|super cup|supercup|super copa|supercopa|super coppa|supercoppa|super coupe|supercoupe|super taca|supertaca|superpokal|community shield|trophee des champions|recopa|coupe gambardella|intertoto|ui cup|2nd tier|second tier|second league|ligue 2|serie b|segunda division|2 bundesliga|bavarian cup|middle rhine cup|saxony cup)\b/;

const MAX_REPORTED_ERRORS = 100;
const errors: string[] = [];
let errorCount = 0;

const check = (condition: unknown, message: string) => {
  if (condition) return;
  errorCount += 1;
  if (errors.length < MAX_REPORTED_ERRORS) errors.push(message);
};

const readJson = async <T>(filename: string): Promise<T> =>
  JSON.parse(await readFile(filename, "utf8")) as T;

const sha256 = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([key, nested]) => [key, canonicalize(nested)]),
  );
};

const canonicalJson = (value: unknown) =>
  JSON.stringify(canonicalize(value));

// Generated multi-card hashes intentionally use the emitted property order.
const emittedJson = (value: unknown) => JSON.stringify(value);

const sorted = (values: Iterable<string>) =>
  [...values].sort((first, second) => first.localeCompare(second));

const sameStrings = (
  first: Iterable<string>,
  second: Iterable<string>,
) => canonicalJson(sorted(first)) === canonicalJson(sorted(second));

const normalizedText = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

const isNonemptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const expectedStatus = (
  row: IdentityAuditRow,
): VerificationStatus => {
  const hasAccolades =
    row.correctedCanonicalCareerAccolades.length > 0;
  const hasUnsupportedStoredEvidence =
    row.correctedCanonicalCareerAccolades.some(
      (accolade) =>
        !accolade.sourceUrl ||
        accolade.sourceName === "Historical archive",
    );
  if (row.transfermarktPageChecked && row.fbrefPageChecked) {
    if (!hasAccolades) {
      return "verified-no-recorded-major-accolades";
    }
    return hasUnsupportedStoredEvidence
      ? "partially-verified"
      : "verified";
  }
  if (
    row.transfermarktPageChecked ||
    row.fbrefPageChecked ||
    hasAccolades
  ) {
    return "partially-verified";
  }
  return "unresolved";
};

const statusCountsFor = (
  identities: Record<string, DisplayIdentity>,
): StatusCounts =>
  Object.fromEntries(
    STATUSES.map((status) => [
      status,
      Object.values(identities).filter(
        (identity) => identity.verificationStatus === status,
      ).length,
    ]),
  ) as StatusCounts;

const validateSourceReference = ({
  identityId,
  label,
  reference,
  expectedId,
  expectedUrl,
}: {
  identityId: string;
  label: "Transfermarkt" | "FBref";
  reference: SourceReference;
  expectedId: string | null;
  expectedUrl: string | null;
}) => {
  check(
    reference.playerId === expectedId,
    `${identityId}: ${label} achievement source ID disagrees with the identity audit`,
  );
  check(
    reference.url === expectedUrl,
    `${identityId}: ${label} achievement source URL disagrees with the identity audit`,
  );
};

const validateCareerAccolades = async () => {
  const [display, audit, multiCard, summary] = await Promise.all([
    readJson<DisplayArchive>(files.displayAccolades),
    readJson<IdentityAudit>(files.identityAudit),
    readJson<MultiCardAudit>(files.multiCardAudit),
    readJson<CareerSummary>(files.careerSummary),
  ]);

  check(display.version === 1, "Career display archive version must be 1");
  check(audit.version === 1, "Career identity audit version must be 1");
  check(multiCard.version === 1, "Multi-card audit version must be 1");
  check(summary.version === 1, "Career summary version must be 1");
  check(
    display.generatedAt === audit.generatedAt &&
      display.generatedAt === multiCard.generatedAt &&
      display.generatedAt === summary.generatedAt,
    "Career display, audit, multi-card report, and summary generatedAt values must agree",
  );
  check(
    display.sourceGameplayArchive ===
      "/src/data/player-career.generated.json",
    "Career display archive must identify the frozen gameplay archive",
  );
  check(
    display.sourceLegacyCardAudit ===
      "/src/data/player-accolades-by-card.generated.json",
    "Career display archive must identify the legacy card audit",
  );

  const cards = allPlayersBeforeIdentityPruning;
  const cardIds = cards.map((card) => card.id);
  check(
    cards.length === EXPECTED.playerCards,
    `Expected ${EXPECTED.playerCards} player cards, received ${cards.length}`,
  );
  check(
    new Set(cardIds).size === cards.length,
    "Runtime player card IDs must be unique",
  );

  const cardsByIdentity = new Map<
    string,
    typeof allPlayersBeforeIdentityPruning
  >();
  for (const card of cards) {
    cardsByIdentity.set(card.playerIdentityId, [
      ...(cardsByIdentity.get(card.playerIdentityId) ?? []),
      card,
    ]);
  }
  const identityIds = sorted(cardsByIdentity.keys());
  const displayIds = Object.keys(display.identities);
  check(
    identityIds.length === EXPECTED.identities,
    `Expected ${EXPECTED.identities} runtime identities, received ${identityIds.length}`,
  );
  check(
    displayIds.length === EXPECTED.identities,
    `Expected ${EXPECTED.identities} display identities, received ${displayIds.length}`,
  );
  check(
    canonicalJson(displayIds) === canonicalJson(sorted(displayIds)),
    "Career display identities must be emitted in deterministic sorted order",
  );
  check(
    sameStrings(identityIds, displayIds),
    "Runtime and display identity sets disagree",
  );

  const auditIds = audit.identities.map((row) => row.playerIdentityId);
  const auditByIdentity = new Map(
    audit.identities.map((row) => [row.playerIdentityId, row]),
  );
  check(
    audit.identities.length === EXPECTED.identities,
    `Expected ${EXPECTED.identities} identity audit rows, received ${audit.identities.length}`,
  );
  check(
    auditByIdentity.size === audit.identities.length,
    "Identity audit playerIdentityId values must be unique",
  );
  check(
    canonicalJson(auditIds) === canonicalJson(sorted(auditIds)),
    "Identity audit rows must be emitted in deterministic sorted order",
  );
  check(
    sameStrings(identityIds, auditIds),
    "Runtime and identity audit identity sets disagree",
  );

  const statusCounts = statusCountsFor(display.identities);
  let achievementRecords = 0;
  let achievementOccurrences = 0;

  for (const identityId of identityIds) {
    const identity = display.identities[identityId];
    const auditRow = auditByIdentity.get(identityId);
    const identityCards = cardsByIdentity.get(identityId) ?? [];
    check(Boolean(identity), `${identityId}: missing display identity`);
    check(Boolean(auditRow), `${identityId}: missing identity audit row`);
    if (!identity || !auditRow) continue;

    const expectedCardIds = identityCards.map((card) => card.id);
    check(
      sameStrings(auditRow.relatedCardIds, expectedCardIds),
      `${identityId}: relatedCardIds disagree with the runtime roster`,
    );
    check(
      identity.verificationStatus === auditRow.verificationStatus,
      `${identityId}: display and audit verification statuses disagree`,
    );
    check(
      auditRow.verificationStatus === expectedStatus(auditRow),
      `${identityId}: ${auditRow.verificationStatus} is incoherent with checked sources and final accolades`,
    );
    check(
      canonicalJson(identity.accolades) ===
        canonicalJson(
          auditRow.correctedCanonicalCareerAccolades,
        ),
      `${identityId}: display and audit canonical accolades disagree`,
    );

    for (const card of identityCards) {
      check(
        canonicalJson(card.careerAccolades) ===
          canonicalJson(identity.accolades),
        `${card.id}: runtime Career Accolades disagree with ${identityId}'s shared identity list`,
      );
    }

    const conflictStrings =
      Array.isArray(auditRow.sourceConflicts) &&
      auditRow.sourceConflicts.every(isNonemptyString);
    check(
      conflictStrings,
      `${identityId}: sourceConflicts must contain only nonempty strings`,
    );
    if (auditRow.sourceConflicts.length > 0) {
      check(
        auditRow.verificationStatus === "unresolved",
        `${identityId}: a source conflict must force unresolved status`,
      );
      check(
        !auditRow.transfermarktPageChecked &&
          !auditRow.fbrefPageChecked,
        `${identityId}: conflicted sources cannot be marked checked`,
      );
      check(
        identity.accolades.length === 0,
        `${identityId}: a source conflict must emit an empty accolade list`,
      );
    }

    check(
      Boolean(auditRow.transfermarktPlayerId) ===
        Boolean(auditRow.transfermarktUrl),
      `${identityId}: Transfermarkt ID and URL must be present together`,
    );
    check(
      Boolean(auditRow.fbrefPlayerId) ===
        Boolean(auditRow.fbrefUrl),
      `${identityId}: FBref ID and URL must be present together`,
    );
    if (
      auditRow.transfermarktPlayerId &&
      auditRow.transfermarktUrl
    ) {
      check(
        auditRow.transfermarktUrl.includes(
          `/spieler/${auditRow.transfermarktPlayerId}`,
        ),
        `${identityId}: Transfermarkt URL does not contain its audited player ID`,
      );
    }
    if (auditRow.fbrefPlayerId && auditRow.fbrefUrl) {
      check(
        auditRow.fbrefUrl.includes(
          `/players/${auditRow.fbrefPlayerId}/`,
        ),
        `${identityId}: FBref URL does not contain its audited player ID`,
      );
    }
    if (auditRow.transfermarktPageChecked) {
      check(
        Boolean(
          auditRow.transfermarktPlayerId &&
            auditRow.transfermarktUrl,
        ),
        `${identityId}: checked Transfermarkt page lacks ID/URL evidence`,
      );
      check(
        auditRow.sourceConflicts.length === 0,
        `${identityId}: checked Transfermarkt page conflicts with identity evidence`,
      );
    }
    if (auditRow.fbrefPageChecked) {
      check(
        Boolean(auditRow.fbrefPlayerId && auditRow.fbrefUrl),
        `${identityId}: checked FBref page lacks ID/URL evidence`,
      );
      check(
        auditRow.sourceConflicts.length === 0,
        `${identityId}: checked FBref page conflicts with identity evidence`,
      );
    }

    check(
      identity.accolades.length ===
        auditRow.normalizedAchievements.length,
      `${identityId}: canonical and normalized achievement counts disagree`,
    );
    check(
      canonicalJson(auditRow.normalizedAchievementKeys) ===
        canonicalJson(
          auditRow.normalizedAchievements.map(
            (achievement) => achievement.normalizedKey,
          ),
        ),
      `${identityId}: normalizedAchievementKeys disagree with normalized achievements`,
    );
    check(
      new Set(auditRow.normalizedAchievementKeys).size ===
        auditRow.normalizedAchievementKeys.length,
      `${identityId}: normalized achievement keys must be unique`,
    );
    check(
      new Set(identity.accolades.map((accolade) => accolade.id))
        .size === identity.accolades.length,
      `${identityId}: final accolade IDs must be unique`,
    );

    achievementRecords += identity.accolades.length;
    for (let index = 0; index < identity.accolades.length; index += 1) {
      const accolade = identity.accolades[index];
      const normalized = auditRow.normalizedAchievements[index];
      const itemLabel = `${identityId}/${accolade.id || index}`;
      const occurrenceCount = accolade.count ?? 1;
      achievementOccurrences += occurrenceCount;

      check(
        isNonemptyString(accolade.id),
        `${itemLabel}: accolade ID must be nonempty`,
      );
      check(
        isNonemptyString(accolade.label),
        `${itemLabel}: accolade label must be nonempty`,
      );
      check(
        isNonemptyString(accolade.sourceName),
        `${itemLabel}: accolade sourceName must be nonempty`,
      );
      check(
        ACCOLADE_CATEGORIES.has(accolade.category),
        `${itemLabel}: unsupported accolade category ${String(accolade.category)}`,
      );
      check(
        accolade.verified === true,
        `${itemLabel}: every emitted accolade must be verified`,
      );
      check(
        Number.isInteger(occurrenceCount) && occurrenceCount > 0,
        `${itemLabel}: accolade count must be a positive integer`,
      );
      if (accolade.sourceUrl !== undefined) {
        check(
          /^https?:\/\//.test(accolade.sourceUrl),
          `${itemLabel}: sourceUrl must be an absolute HTTP(S) URL`,
        );
      }
      const exclusionText = normalizedText(
        `${accolade.id} ${accolade.label} ${accolade.description ?? ""}`,
      );
      check(
        !DISALLOWED_FINAL_ACCOLADE.test(exclusionText),
        `${itemLabel}: final accolade contains a disallowed runner-up, youth, or super-cup record`,
      );

      check(
        Boolean(normalized),
        `${itemLabel}: missing normalized achievement`,
      );
      if (!normalized) continue;
      check(
        isNonemptyString(normalized.normalizedKey),
        `${itemLabel}: normalizedKey must be nonempty`,
      );
      check(
        isNonemptyString(normalized.normalizedLabel),
        `${itemLabel}: normalizedLabel must be nonempty`,
      );
      check(
        normalized.displayLabel === accolade.label,
        `${itemLabel}: normalized display label disagrees with the accolade`,
      );
      check(
        normalized.category === accolade.category,
        `${itemLabel}: normalized category disagrees with the accolade`,
      );
      check(
        normalized.count === occurrenceCount,
        `${itemLabel}: normalized count disagrees with the accolade`,
      );
      check(
        Number.isInteger(normalized.count) &&
          normalized.count > 0,
        `${itemLabel}: normalized count must be a positive integer`,
      );

      if (normalized.transfermarktSource) {
        validateSourceReference({
          identityId,
          label: "Transfermarkt",
          reference: normalized.transfermarktSource,
          expectedId: auditRow.transfermarktPlayerId,
          expectedUrl: auditRow.transfermarktUrl,
        });
        check(
          auditRow.transfermarktPageChecked,
          `${itemLabel}: Transfermarkt page achievement lacks a checked source page`,
        );
      }
      if (normalized.fbrefSource) {
        validateSourceReference({
          identityId,
          label: "FBref",
          reference: normalized.fbrefSource,
          expectedId: auditRow.fbrefPlayerId,
          expectedUrl: auditRow.fbrefUrl,
        });
      }
      if (
        normalized.verificationStatus ===
        "verified-source-page"
      ) {
        check(
          Boolean(normalized.transfermarktSource),
          `${itemLabel}: source-page verification lacks Transfermarkt source evidence`,
        );
      } else {
        check(
          normalized.verificationStatus ===
            "verified-stored-source",
          `${itemLabel}: unsupported normalized verification status`,
        );
        check(
          !normalized.transfermarktSource,
          `${itemLabel}: stored-source verification unexpectedly claims a Transfermarkt page`,
        );
      }
      if (accolade.sourceName === "Transfermarkt") {
        check(
          Boolean(
            normalized.transfermarktSource &&
              accolade.sourceUrl ===
                normalized.transfermarktSource.url,
          ),
          `${itemLabel}: Transfermarkt accolade lacks matching normalized source evidence`,
        );
      }
      if (accolade.sourceName === "FBref") {
        check(
          Boolean(
            normalized.fbrefSource &&
              accolade.sourceUrl === normalized.fbrefSource.url,
          ),
          `${itemLabel}: FBref accolade lacks matching normalized source evidence`,
        );
      }
    }
  }

  check(
    audit.scope.uniqueIdentities === EXPECTED.identities,
    "Identity audit scope must report exactly 7,254 identities",
  );
  check(
    audit.scope.coveredPlayerCards === EXPECTED.playerCards,
    "Identity audit scope must report exactly 9,626 cards",
  );
  check(
    canonicalJson(audit.scope.sourceYears) ===
      canonicalJson([1970, 2026]),
    "Identity audit scope must cover 1970 through 2026",
  );
  check(
    canonicalJson(audit.summary.statusCounts) ===
      canonicalJson(statusCounts),
    "Identity audit status counts disagree with display data",
  );
  check(
    audit.summary.verifiedAchievementRecords ===
      achievementRecords,
    "Identity audit achievement record count disagrees with display data",
  );
  check(
    audit.summary.verifiedAchievementOccurrences ===
      achievementOccurrences,
    "Identity audit achievement occurrence count disagrees with display data",
  );

  const expectedMultiIds = identityIds.filter(
    (identityId) =>
      (cardsByIdentity.get(identityId)?.length ?? 0) > 1,
  );
  const multiIds = multiCard.identities.map(
    (row) => row.playerIdentityId,
  );
  const multiByIdentity = new Map(
    multiCard.identities.map((row) => [
      row.playerIdentityId,
      row,
    ]),
  );
  check(
    expectedMultiIds.length === EXPECTED.multiCardIdentities,
    `Expected ${EXPECTED.multiCardIdentities} runtime multi-card identities, received ${expectedMultiIds.length}`,
  );
  check(
    multiCard.identities.length ===
      EXPECTED.multiCardIdentities,
    `Expected ${EXPECTED.multiCardIdentities} multi-card audit rows, received ${multiCard.identities.length}`,
  );
  check(
    multiByIdentity.size === multiCard.identities.length,
    "Multi-card audit identity IDs must be unique",
  );
  check(
    canonicalJson(multiIds) === canonicalJson(sorted(multiIds)),
    "Multi-card audit rows must be emitted in deterministic sorted order",
  );
  check(
    sameStrings(expectedMultiIds, multiIds),
    "Runtime and multi-card audit identity sets disagree",
  );

  let cardsCovered = 0;
  let previouslyInconsistent = 0;
  let finalInconsistent = 0;
  for (const identityId of expectedMultiIds) {
    const row = multiByIdentity.get(identityId);
    const identity = display.identities[identityId];
    const expectedCardIds = (
      cardsByIdentity.get(identityId) ?? []
    ).map((card) => card.id);
    check(Boolean(row), `${identityId}: missing multi-card audit row`);
    if (!row || !identity) continue;
    cardsCovered += row.cardIds.length;
    check(
      sameStrings(row.cardIds, expectedCardIds),
      `${identityId}: multi-card report card IDs disagree with the runtime roster`,
    );
    check(
      sameStrings(
        Object.keys(row.previousAccoladesByCard),
        expectedCardIds,
      ),
      `${identityId}: previousAccoladesByCard keys disagree with card IDs`,
    );
    check(
      sameStrings(
        Object.keys(row.previousHashesByCard),
        expectedCardIds,
      ),
      `${identityId}: previousHashesByCard keys disagree with card IDs`,
    );
    const calculatedPreviousHashes = expectedCardIds.map((cardId) =>
      sha256(
        emittedJson(row.previousAccoladesByCard[cardId] ?? []),
      ),
    );
    for (const [index, cardId] of expectedCardIds.entries()) {
      check(
        row.previousHashesByCard[cardId] ===
          calculatedPreviousHashes[index],
        `${identityId}/${cardId}: previous accolade hash disagrees with report data`,
      );
    }
    const isPreviouslyConsistent =
      new Set(calculatedPreviousHashes).size === 1;
    check(
      row.previouslyConsistent === isPreviouslyConsistent,
      `${identityId}: previouslyConsistent disagrees with previous hashes`,
    );
    check(
      row.previousDifferences ===
        (isPreviouslyConsistent
          ? "none"
          : "different-card-level-career-accolade-lists"),
      `${identityId}: previousDifferences disagrees with previous hashes`,
    );
    if (!row.previouslyConsistent) previouslyInconsistent += 1;

    const finalHash = sha256(emittedJson(identity.accolades));
    check(
      row.finalSharedCareerAccoladeHash === finalHash,
      `${identityId}: final shared accolade hash disagrees with display data`,
    );
    check(
      row.finalConsistencyStatus === "consistent",
      `${identityId}: final multi-card status must be consistent`,
    );
    if (row.finalConsistencyStatus !== "consistent") {
      finalInconsistent += 1;
    }
  }

  check(
    multiCard.summary.multiCardIdentities ===
      EXPECTED.multiCardIdentities,
    "Multi-card summary must report exactly 1,818 identities",
  );
  check(
    multiCard.summary.cardsCovered === cardsCovered,
    "Multi-card summary cardsCovered disagrees with report rows",
  );
  check(
    multiCard.summary.previouslyInconsistent ===
      previouslyInconsistent,
    "Multi-card summary prior inconsistency count disagrees with report rows",
  );
  check(
    multiCard.summary.corrected === previouslyInconsistent,
    "Multi-card summary corrected count must equal prior inconsistencies",
  );
  check(
    multiCard.summary.finalInconsistent === finalInconsistent &&
      finalInconsistent === 0,
    "Multi-card report must end with zero inconsistent identities",
  );

  const careerSummary = summary.careerAccolades;
  check(
    careerSummary.uniqueIdentitiesAudited === EXPECTED.identities,
    "Career summary must report exactly 7,254 identities",
  );
  check(
    careerSummary.playerCardsCovered === EXPECTED.playerCards,
    "Career summary must report exactly 9,626 cards",
  );
  check(
    canonicalJson(careerSummary.statusCounts) ===
      canonicalJson(statusCounts),
    "Career summary status counts disagree with display data",
  );
  check(
    careerSummary.verifiedAchievementRecords ===
      achievementRecords,
    "Career summary record count disagrees with display data",
  );
  check(
    careerSummary.verifiedAchievementOccurrences ===
      achievementOccurrences,
    "Career summary occurrence count disagrees with display data",
  );
  check(
    careerSummary.multiCardIdentities ===
      EXPECTED.multiCardIdentities,
    "Career summary must report exactly 1,818 multi-card identities",
  );
  check(
    careerSummary.multiCardIdentitiesPreviouslyInconsistent ===
      previouslyInconsistent,
    "Career summary prior inconsistency count disagrees with the multi-card report",
  );
  check(
    careerSummary.multiCardIdentitiesCorrected ===
      previouslyInconsistent,
    "Career summary corrected count disagrees with the multi-card report",
  );

  const perisicIdentity = display.identities["ivan-perisic"];
  const perisicCards =
    cardsByIdentity.get("ivan-perisic")?.map((card) => card.id) ??
    [];
  check(Boolean(perisicIdentity), "Ivan Perišić display identity is missing");
  if (perisicIdentity) {
    check(
      sameStrings(
        careerSummary.perisic.cardIds,
        perisicCards,
      ),
      "Career summary Ivan Perišić card IDs disagree with the roster",
    );
    check(
      careerSummary.perisic.canonicalCareerAccoladeHash ===
        sha256(emittedJson(perisicIdentity.accolades)),
      "Career summary Ivan Perišić hash disagrees with display data",
    );
    check(
      careerSummary.perisic.canonicalCareerAccoladeRecords ===
        perisicIdentity.accolades.length,
      "Career summary Ivan Perišić record count disagrees with display data",
    );
    check(
      careerSummary.perisic.finalConsistencyStatus ===
        "consistent",
      "Career summary Ivan Perišić status must be consistent",
    );
  }

  check(
    summary.gameplayProtection.displayArtifact ===
      "/src/data/player-career-accolades-by-identity.generated.json",
    "Career summary display artifact path is incorrect",
  );
  check(
    summary.gameplayProtection.frozenGameplayArtifact ===
      "/src/data/player-career.generated.json",
    "Career summary frozen gameplay artifact path is incorrect",
  );
  check(
    summary.gameplayProtection.gameplayArtifactChanged === false,
    "Career summary must report the gameplay artifact as unchanged",
  );

  return {
    identities: identityIds.length,
    cards: cards.length,
    multiCardIdentities: expectedMultiIds.length,
    achievementRecords,
    achievementOccurrences,
    careerSummary: summary,
  };
};

const validatePortraits = async () => {
  const [
    portraitAudit,
    unresolvedAudit,
    duplicateAudit,
    summary,
    registry,
    registryContents,
  ] = await Promise.all([
    readJson<PortraitAudit>(files.portraitAudit),
    readJson<UnresolvedPortraitAudit>(
      files.unresolvedPortraitAudit,
    ),
    readJson<PortraitDuplicateAudit>(
      files.portraitDuplicateAudit,
    ),
    readJson<PortraitSummary>(files.portraitSummary),
    readJson<PortraitRegistry>(files.portraitRegistry),
    readFile(files.portraitRegistry),
  ]);

  const cards = portraitAudit.cards;
  const cardById = new Map(
    cards.map((card) => [card.playerCardId, card]),
  );
  check(
    cards.length === EXPECTED.targetPortraitCards,
    `Expected ${EXPECTED.targetPortraitCards} target portrait cards, received ${cards.length}`,
  );
  check(
    cardById.size === cards.length,
    "Portrait audit card IDs must be unique",
  );

  const verified = cards.filter(
    (card) => card.finalPortraitStatus === "verified-portrait",
  );
  const pending = cards.filter(
    (card) => card.finalPortraitStatus === "photo-pending",
  );
  const unexpectedStatuses = cards.filter(
    (card) =>
      card.finalPortraitStatus !== "verified-portrait" &&
      card.finalPortraitStatus !== "photo-pending",
  );
  check(
    unexpectedStatuses.length === 0,
    "Every target card must end as verified-portrait or photo-pending",
  );
  check(
    verified.length === EXPECTED.verifiedPortraits,
    `Expected ${EXPECTED.verifiedPortraits} verified portraits, received ${verified.length}`,
  );
  check(
    pending.length === EXPECTED.photoPending,
    `Expected ${EXPECTED.photoPending} Photo Pending cards, received ${pending.length}`,
  );

  for (const card of verified) {
    check(
      card.imageValidationStatus === "verified",
      `${card.playerCardId}: verified portrait lacks verified image status`,
    );
    check(
      isNonemptyString(card.imageSha256) &&
        isNonemptyString(card.imageVisualSha256),
      `${card.playerCardId}: verified portrait lacks immutable image hashes`,
    );
    check(
      card.unresolvedReason === null,
      `${card.playerCardId}: verified portrait must not retain an unresolved reason`,
    );
  }
  for (const card of pending) {
    check(
      card.imageValidationStatus !== "verified",
      `${card.playerCardId}: Photo Pending card cannot have verified image status`,
    );
    check(
      isNonemptyString(card.unresolvedReason),
      `${card.playerCardId}: Photo Pending card lacks a specific unresolved reason`,
    );
    check(
      card.imageSha256 === null &&
        card.imageVisualSha256 === null,
      `${card.playerCardId}: Photo Pending card unexpectedly retains verified hashes`,
    );
  }

  const countsByYear = Object.fromEntries(
    Object.keys(EXPECTED_PORTRAITS_BY_YEAR).map((yearText) => {
      const year = Number(yearText);
      const yearCards = cards.filter(
        (card) => card.worldCupYear === year,
      );
      return [
        yearText,
        {
          total: yearCards.length,
          verified: yearCards.filter(
            (card) =>
              card.finalPortraitStatus === "verified-portrait",
          ).length,
          photoPending: yearCards.filter(
            (card) =>
              card.finalPortraitStatus === "photo-pending",
          ).length,
        },
      ];
    }),
  );
  check(
    canonicalJson(countsByYear) ===
      canonicalJson(EXPECTED_PORTRAITS_BY_YEAR),
    "Frozen portrait counts by tournament year changed",
  );

  const pendingByStatus = Object.fromEntries(
    Object.keys(EXPECTED_PENDING_BY_STATUS).map((status) => [
      status,
      pending.filter(
        (card) => card.imageValidationStatus === status,
      ).length,
    ]),
  );
  check(
    canonicalJson(pendingByStatus) ===
      canonicalJson(EXPECTED_PENDING_BY_STATUS),
    "Frozen Photo Pending reason counts changed",
  );

  check(
    unresolvedAudit.cards.length === pending.length,
    "Unresolved portrait report card count disagrees with portrait audit",
  );
  const unresolvedById = new Map(
    unresolvedAudit.cards.map((card) => [
      card.playerCardId,
      card,
    ]),
  );
  check(
    unresolvedById.size === unresolvedAudit.cards.length,
    "Unresolved portrait report card IDs must be unique",
  );
  check(
    sameStrings(unresolvedById.keys(), pending.map((card) => card.playerCardId)),
    "Unresolved portrait report and Photo Pending card sets disagree",
  );
  for (const card of pending) {
    const unresolvedCard = unresolvedById.get(card.playerCardId);
    check(
      canonicalJson(unresolvedCard) === canonicalJson(card),
      `${card.playerCardId}: unresolved portrait report disagrees with the main audit`,
    );
  }

  check(
    portraitAudit.summary.totalCards ===
      EXPECTED.targetPortraitCards,
    "Portrait audit summary total changed",
  );
  check(
    portraitAudit.summary.verified ===
      EXPECTED.verifiedPortraits,
    "Portrait audit summary verified count changed",
  );
  check(
    portraitAudit.summary.unresolved === EXPECTED.photoPending,
    "Portrait audit summary unresolved count changed",
  );
  check(
    portraitAudit.summary.finalPortraitStatuses[
      "verified-portrait"
    ] === EXPECTED.verifiedPortraits &&
      portraitAudit.summary.finalPortraitStatuses[
        "photo-pending"
      ] === EXPECTED.photoPending,
    "Portrait audit final status counts disagree with card data",
  );
  check(
    portraitAudit.summary.photoPendingWithSpecificReason ===
      EXPECTED.photoPending,
    "Portrait audit must report a specific reason for every Photo Pending card",
  );
  check(
    portraitAudit.summary.canonicalPixelDuplicateGroups === 0 &&
      portraitAudit.summary
        .crossIdentityCanonicalPixelDuplicateErrors === 0,
    "Portrait audit must have zero canonical-pixel duplicate groups",
  );

  check(
    unresolvedAudit.summary.total === EXPECTED.photoPending &&
      unresolvedAudit.summary.withSpecificUnresolvedReason ===
        EXPECTED.photoPending &&
      unresolvedAudit.summary.finalPortraitStatus ===
        "photo-pending",
    "Unresolved portrait summary disagrees with frozen counts",
  );
  check(
    canonicalJson(unresolvedAudit.summary.byStatus) ===
      canonicalJson(EXPECTED_PENDING_BY_STATUS),
    "Unresolved portrait summary status counts changed",
  );
  for (const [
    year,
    expected,
  ] of Object.entries(EXPECTED_PORTRAITS_BY_YEAR)) {
    check(
      unresolvedAudit.summary.byYear[year] ===
        expected.photoPending,
      `Unresolved portrait summary ${year} count changed`,
    );
  }

  check(
    duplicateAudit.exactDuplicateGroups.length === 0 &&
      duplicateAudit.summary.exactGroups === 0 &&
      duplicateAudit.summary.crossIdentityExactErrors === 0,
    "Exact portrait duplicate groups must remain zero",
  );
  check(
    duplicateAudit.canonicalPixelDuplicateGroups.length === 0 &&
      duplicateAudit.summary.canonicalPixelGroups === 0 &&
      duplicateAudit.summary.crossIdentityCanonicalPixelErrors ===
        0,
    "Canonical-pixel portrait duplicate groups must remain zero",
  );
  check(
    duplicateAudit.similarMatches.length ===
      EXPECTED.perceptualPairs,
    "Perceptual candidate pair count changed",
  );
  const manualPairs = duplicateAudit.similarMatches.filter(
    (pair) => pair.reviewStatus === "manual-reviewed",
  );
  const automatedPairs = duplicateAudit.similarMatches.filter(
    (pair) => pair.reviewStatus === "automated-candidate",
  );
  check(
    manualPairs.length === EXPECTED.manualPerceptualPairs,
    "Exactly six distance-zero portrait pairs must retain manual review",
  );
  check(
    automatedPairs.length === EXPECTED.automatedPerceptualPairs,
    "Automated nonzero portrait candidate count changed",
  );
  check(
    sameStrings(
      manualPairs.map((pair) => pair.pairId),
      MANUAL_PAIR_IDS,
    ),
    "Manual portrait review pair IDs changed",
  );

  for (const pair of duplicateAudit.similarMatches) {
    check(
      pair.pairId === sorted([pair.cardA, pair.cardB]).join("::"),
      `${pair.pairId}: perceptual pair ID is not canonical`,
    );
    check(
      pair.identityA !== pair.identityB,
      `${pair.pairId}: perceptual report should contain only cross-identity pairs`,
    );
    if (pair.reviewStatus === "manual-reviewed") {
      check(
        pair.hammingDistance === 0,
        `${pair.pairId}: manual review must remain tied to a distance-zero pair`,
      );
      check(
        pair.reviewOutcome === "accepted-visually-distinct" &&
          isNonemptyString(pair.reviewer) &&
          isNonemptyString(pair.reviewedAt),
        `${pair.pairId}: manual review lacks a genuine visual disposition`,
      );
      const evidence = pair.reviewedAssetEvidence;
      const cardA = cardById.get(pair.cardA);
      const cardB = cardById.get(pair.cardB);
      check(
        Boolean(evidence),
        `${pair.pairId}: manual review lacks immutable asset evidence`,
      );
      if (evidence && cardA && cardB) {
        check(
          evidence.cardA.playerCardId === pair.cardA &&
            evidence.cardA.imageSha256 === cardA.imageSha256 &&
            evidence.cardA.canonicalPixelSha256 ===
              cardA.imageVisualSha256,
          `${pair.pairId}: card A review hashes disagree with the portrait audit`,
        );
        check(
          evidence.cardB.playerCardId === pair.cardB &&
            evidence.cardB.imageSha256 === cardB.imageSha256 &&
            evidence.cardB.canonicalPixelSha256 ===
              cardB.imageVisualSha256,
          `${pair.pairId}: card B review hashes disagree with the portrait audit`,
        );
      }
    } else if (pair.reviewStatus === "automated-candidate") {
      check(
        pair.hammingDistance > 0,
        `${pair.pairId}: an unreviewed distance-zero pair is not allowed`,
      );
      check(
        pair.reviewOutcome === null &&
          pair.reviewer === null &&
          pair.reviewedAt === null &&
          pair.reviewedAssetEvidence === null,
        `${pair.pairId}: automated candidate contains misleading manual-review evidence`,
      );
    } else {
      check(
        false,
        `${pair.pairId}: unsupported perceptual review status`,
      );
    }
  }

  check(
    duplicateAudit.summary.perceptualCandidatePairs ===
      EXPECTED.perceptualPairs &&
      duplicateAudit.summary.manuallyReviewedSimilarPairs ===
        EXPECTED.manualPerceptualPairs &&
      duplicateAudit.summary.automatedSimilarCandidates ===
        EXPECTED.automatedPerceptualPairs,
    "Portrait duplicate summary disagrees with perceptual pair data",
  );

  check(summary.version === 1, "Portrait summary version must be 1");
  check(
    canonicalJson(summary.scope.tournamentYears) ===
      canonicalJson([2014, 2018, 2022, 2026]),
    "Portrait summary scope changed",
  );
  check(
    summary.summary.totalCards === EXPECTED.targetPortraitCards &&
      summary.summary.verifiedPortraits ===
        EXPECTED.verifiedPortraits &&
      summary.summary.photoPending === EXPECTED.photoPending &&
      summary.summary.photoPendingWithSpecificReason ===
        EXPECTED.photoPending,
    "Portrait summary frozen totals changed",
  );
  check(
    summary.summary.newlyPromotedPortraits === 0 &&
      summary.summary.verifiedAssetsChanged === 0 &&
      summary.summary.productionRegistryChanged === false,
    "Portrait summary must preserve the verified registry and assets",
  );
  check(
    canonicalJson(summary.summary.byYear) ===
      canonicalJson(EXPECTED_PORTRAITS_BY_YEAR),
    "Portrait summary year counts changed",
  );
  check(
    canonicalJson(
      summary.unresolvedReasons.byValidationStatus,
    ) === canonicalJson(EXPECTED_PENDING_BY_STATUS) &&
      summary.unresolvedReasons
        .everyPhotoPendingCardHasSpecificReason === true,
    "Portrait summary unresolved reasons disagree with card data",
  );
  check(
    summary.duplicateEvidence.exactByteDuplicateGroups === 0 &&
      summary.duplicateEvidence.crossIdentityExactByteErrors === 0 &&
      summary.duplicateEvidence.canonicalPixelDuplicateGroups ===
        0 &&
      summary.duplicateEvidence
        .crossIdentityCanonicalPixelErrors === 0,
    "Portrait summary must retain zero exact and canonical-pixel duplicate groups",
  );
  check(
    summary.duplicateEvidence.perceptualCandidatePairs ===
      EXPECTED.perceptualPairs &&
      summary.duplicateEvidence
        .manuallyReviewedDistanceZeroPairs ===
        EXPECTED.manualPerceptualPairs &&
      summary.duplicateEvidence.automatedNonzeroCandidates ===
        EXPECTED.automatedPerceptualPairs &&
      sameStrings(
        summary.duplicateEvidence.manualPairIds,
        MANUAL_PAIR_IDS,
      ),
    "Portrait summary perceptual evidence changed",
  );

  const registryHash = sha256(registryContents);
  check(
    registryHash === EXPECTED.portraitRegistrySha256,
    "Frozen production portrait registry hash changed",
  );
  check(
    summary.preservationEvidence.productionRegistryPath ===
      "/src/data/tournament-edition-player-portraits.generated.json",
    "Portrait summary production registry path is incorrect",
  );
  check(
    summary.preservationEvidence.productionRegistrySha256 ===
      registryHash &&
      registryHash === EXPECTED.portraitRegistrySha256,
    "Portrait summary production registry hash disagrees with the frozen file",
  );
  check(
    summary.preservationEvidence.verifiedAssetCount ===
      EXPECTED.verifiedPortraits,
    "Portrait summary verified asset count changed",
  );

  check(
    registry.portraits.length === EXPECTED.verifiedPortraits,
    "Production portrait registry count changed",
  );
  const registryByCard = new Map(
    registry.portraits.map((portrait) => [
      portrait.cardId,
      portrait,
    ]),
  );
  check(
    registryByCard.size === registry.portraits.length,
    "Production portrait registry card IDs must be unique",
  );
  check(
    sameStrings(
      registryByCard.keys(),
      verified.map((card) => card.playerCardId),
    ),
    "Production registry and verified portrait card sets disagree",
  );

  const registryHashes = new Map<string, string>();
  for (const portrait of registry.portraits) {
    const auditCard = cardById.get(portrait.cardId);
    check(
      Boolean(auditCard),
      `${portrait.cardId}: registry entry is missing from the portrait audit`,
    );
    if (!auditCard) continue;
    check(
      portrait.playerIdentityId === auditCard.playerIdentityId &&
        portrait.tournamentYear === auditCard.worldCupYear,
      `${portrait.cardId}: registry identity/year disagree with the portrait audit`,
    );
    check(
      portrait.localPath === auditCard.localImagePath &&
        portrait.localPath ===
          `/assets/players/game-faces/${portrait.cardId}.png`,
      `${portrait.cardId}: registry local path is not canonical`,
    );
    check(
      portrait.sha256 === auditCard.imageSha256,
      `${portrait.cardId}: registry hash disagrees with the portrait audit`,
    );
    check(
      portrait.cacheVersion === portrait.sha256.slice(0, 16),
      `${portrait.cardId}: registry cache version disagrees with its hash`,
    );

    const filename = path.join(
      ROOT,
      "public",
      portrait.localPath.replace(/^\/+/, ""),
    );
    const actualHash = sha256(await readFile(filename));
    check(
      actualHash === portrait.sha256,
      `${portrait.cardId}: public portrait bytes changed`,
    );
    const priorCard = registryHashes.get(actualHash);
    check(
      !priorCard,
      `${portrait.cardId}: exact portrait bytes duplicate ${priorCard ?? "another card"}`,
    );
    registryHashes.set(actualHash, portrait.cardId);
  }

  const publicFiles = await readdir(files.publicPortraits);
  const publicPngs = publicFiles.filter((filename) =>
    filename.endsWith(".png"),
  );
  check(
    sameStrings(
      publicPngs,
      registry.portraits.map(
        (portrait) => `${portrait.cardId}.png`,
      ),
    ),
    "Public portrait files and production registry entries disagree",
  );
  check(
    publicFiles
      .filter((filename) => !filename.endsWith(".png"))
      .every((filename) => filename === ".gitkeep"),
    "Unexpected non-PNG file exists in the production portrait directory",
  );

  const verifiedAssetHashSet = sha256(
    verified
      .map(
        (card) =>
          `${card.playerCardId}:${card.imageSha256}:${card.imageVisualSha256}`,
      )
      .sort()
      .join("\n"),
  );
  check(
    verifiedAssetHashSet === EXPECTED.verifiedAssetHashSetSha256,
    "Frozen verified portrait asset hash set changed",
  );
  check(
    summary.preservationEvidence.verifiedAssetHashSetSha256 ===
      verifiedAssetHashSet,
    "Portrait summary verified asset hash set disagrees with audit data",
  );

  const contactSheetByYear = new Map(
    summary.preservationEvidence.contactSheets.map((sheet) => [
      sheet.tournamentYear,
      sheet,
    ]),
  );
  check(
    contactSheetByYear.size ===
      EXPECTED_CONTACT_SHEET_HASHES.size,
    "Portrait summary contact sheet count changed",
  );
  for (const [
    year,
    expectedHash,
  ] of EXPECTED_CONTACT_SHEET_HASHES) {
    const sheet = contactSheetByYear.get(year);
    check(Boolean(sheet), `${year}: contact sheet summary is missing`);
    if (!sheet) continue;
    const expectedPath = `/reports/contact-sheets/player-images-${year}.png`;
    check(
      sheet.path === expectedPath && sheet.regenerated === false,
      `${year}: contact sheet preservation metadata changed`,
    );
    const actualHash = sha256(
      await readFile(path.join(ROOT, expectedPath.replace(/^\/+/, ""))),
    );
    check(
      sheet.sha256 === expectedHash && actualHash === expectedHash,
      `${year}: frozen contact sheet hash changed`,
    );
  }

  return {
    totalCards: cards.length,
    verifiedPortraits: verified.length,
    photoPending: pending.length,
    portraitSummary: summary,
  };
};

const validateCombinedSummary = async ({
  careerSummary,
  portraitSummary,
}: {
  careerSummary: CareerSummary;
  portraitSummary: PortraitSummary;
}) => {
  const combined = await readJson<CombinedSummary>(
    files.combinedSummary,
  );

  check(combined.version === 1, "Combined summary version must be 1");
  check(
    combined.generatedAt === portraitSummary.generatedAt,
    "Combined summary generatedAt must match the portrait summary evidence timestamp",
  );
  check(
    combined.branch === careerSummary.branch &&
      combined.branch ===
        "fix/player-images-accolades-step-1",
    "Combined summary branch disagrees with the career summary",
  );
  check(
    combined.preservedCommit === careerSummary.preservedCommit &&
      combined.preservedCommit ===
        "a043cf97b214b7aa751071dc95787edef8c81b7d",
    "Combined summary preserved commit disagrees with the career summary",
  );

  const combinedCareer = combined.careerAccolades;
  const focusedCareer = careerSummary.careerAccolades;
  check(
    canonicalJson(combinedCareer) ===
      canonicalJson(focusedCareer),
    "Combined summary Career Accolades section disagrees with the focused career summary",
  );
  check(
    combinedCareer.uniqueIdentitiesAudited ===
      EXPECTED.identities &&
      combinedCareer.playerCardsCovered ===
        EXPECTED.playerCards &&
      combinedCareer.multiCardIdentities ===
        EXPECTED.multiCardIdentities,
    "Combined summary career identity/card counts changed",
  );
  check(
    canonicalJson(combinedCareer.statusCounts) ===
      canonicalJson(focusedCareer.statusCounts),
    "Combined summary career status counts disagree with the focused summary",
  );
  check(
    combinedCareer.verifiedAchievementRecords ===
      focusedCareer.verifiedAchievementRecords &&
      combinedCareer.verifiedAchievementOccurrences ===
        focusedCareer.verifiedAchievementOccurrences,
    "Combined summary career record/occurrence counts disagree with the focused summary",
  );
  check(
    combinedCareer.multiCardIdentitiesPreviouslyInconsistent ===
      focusedCareer.multiCardIdentitiesPreviouslyInconsistent &&
      combinedCareer.multiCardIdentitiesCorrected ===
        focusedCareer.multiCardIdentitiesCorrected,
    "Combined summary multi-card correction counts disagree with the focused summary",
  );

  const combinedPortraits = combined.portraits;
  const focusedPortraits = portraitSummary.summary;
  check(
    canonicalJson(combinedPortraits.tournamentYears) ===
      canonicalJson(portraitSummary.scope.tournamentYears),
    "Combined summary portrait tournament years disagree with the focused portrait summary",
  );
  check(
    combinedPortraits.totalCards === focusedPortraits.totalCards,
    "Combined summary portrait total disagrees with the focused portrait summary",
  );
  check(
    canonicalJson(combinedPortraits.totalsByYear) ===
      canonicalJson(focusedPortraits.byYear),
    "Combined summary per-year portrait totals disagree with the focused portrait summary",
  );
  const expectedPhotoPendingByYear = Object.fromEntries(
    Object.entries(focusedPortraits.byYear).map(
      ([year, counts]) => [year, counts.photoPending],
    ),
  );
  check(
    combinedPortraits.photoPendingTotal ===
      focusedPortraits.photoPending &&
      canonicalJson(combinedPortraits.photoPendingByYear) ===
        canonicalJson(expectedPhotoPendingByYear),
    "Combined summary Photo Pending totals disagree with the focused portrait summary",
  );
  check(
    combinedPortraits.newlyVerifiedPortraits ===
      focusedPortraits.newlyPromotedPortraits &&
      combinedPortraits.replacedPortraits ===
        focusedPortraits.verifiedAssetsChanged &&
      combinedPortraits.preservedVerifiedPortraits ===
        focusedPortraits.verifiedPortraits,
    "Combined summary preserved/new/replaced portrait counts disagree with the focused portrait summary",
  );
  check(
    combinedPortraits.newlyVerifiedPortraits === 0 &&
      combinedPortraits.replacedPortraits === 0 &&
      combinedPortraits.preservedVerifiedPortraits ===
        EXPECTED.verifiedPortraits,
    "Combined summary must preserve all previously verified portraits without replacement",
  );
  check(
    combinedPortraits.productionRegistryChanged ===
      focusedPortraits.productionRegistryChanged,
    "Combined summary production registry status disagrees with the focused portrait summary",
  );

  const focusedDuplicates = portraitSummary.duplicateEvidence;
  check(
    combinedPortraits.duplicateImageProblemsFixed === 0,
    "Combined summary must report zero newly fixed Step 1B duplicate-image problems",
  );
  check(
    combinedPortraits.exactByteDuplicateGroups ===
      focusedDuplicates.exactByteDuplicateGroups &&
      combinedPortraits.canonicalPixelDuplicateGroups ===
        focusedDuplicates.canonicalPixelDuplicateGroups &&
      combinedPortraits.unresolvedCrossIdentityDuplicateErrors ===
        focusedDuplicates.crossIdentityCanonicalPixelErrors,
    "Combined summary duplicate-image fields disagree with the focused portrait summary",
  );
  check(
    combinedPortraits.perceptualCandidatePairs ===
      focusedDuplicates.perceptualCandidatePairs &&
      combinedPortraits.manuallyReviewedDistanceZeroPairs ===
        focusedDuplicates.manuallyReviewedDistanceZeroPairs &&
      combinedPortraits.automatedNonzeroCandidates ===
        focusedDuplicates.automatedNonzeroCandidates,
    "Combined summary perceptual-review fields disagree with the focused portrait summary",
  );
  check(
    canonicalJson(combinedPortraits.contactSheets) ===
      canonicalJson(
        portraitSummary.preservationEvidence.contactSheets,
      ),
    "Combined summary contact sheet evidence disagrees with the focused portrait summary",
  );

  check(
    canonicalJson(combined.gameplayProtection) ===
      canonicalJson(careerSummary.gameplayProtection),
    "Combined summary gameplay protection disagrees with the focused career summary",
  );
  check(
    combined.gameplayProtection.displayArtifact ===
      "/src/data/player-career-accolades-by-identity.generated.json" &&
      combined.gameplayProtection.frozenGameplayArtifact ===
        "/src/data/player-career.generated.json" &&
      combined.gameplayProtection.gameplayArtifactChanged === false,
    "Combined summary gameplay artifact paths or unchanged status are incorrect",
  );

  const expectedReports: CombinedSummary["reports"] = {
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
  };
  check(
    canonicalJson(combined.reports) ===
      canonicalJson(expectedReports),
    "Combined summary report paths are incomplete or incorrect",
  );
};

const main = async () => {
  const [career, portraits] = await Promise.all([
    validateCareerAccolades(),
    validatePortraits(),
  ]);
  await validateCombinedSummary({
    careerSummary: career.careerSummary,
    portraitSummary: portraits.portraitSummary,
  });

  if (errorCount > 0) {
    const omitted = errorCount - errors.length;
    const suffix =
      omitted > 0
        ? `\n...and ${omitted} additional validation error${omitted === 1 ? "" : "s"}.`
        : "";
    throw new Error(
      `Step 1B validation failed with ${errorCount} error${errorCount === 1 ? "" : "s"}:\n- ${errors.join("\n- ")}${suffix}`,
    );
  }

  console.log(
    [
      "Step 1B validation passed.",
      `${career.identities} identities / ${career.cards} cards / ${career.multiCardIdentities} multi-card identities.`,
      `${career.achievementRecords} accolade records / ${career.achievementOccurrences} occurrences.`,
      `${portraits.verifiedPortraits} verified portraits / ${portraits.photoPending} Photo Pending (${portraits.totalCards} target cards).`,
      "Frozen portrait hashes and counts are unchanged.",
    ].join(" "),
  );
};

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
