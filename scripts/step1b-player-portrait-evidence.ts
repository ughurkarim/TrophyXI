import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Evidence-only post-processing for the Step 1 portrait collector:
 *
 *   node --import tsx scripts/step1b-player-portrait-evidence.ts
 *
 * Run this after `step1-player-image-audit.ts`. It upgrades reports only and
 * intentionally never writes production portraits, the runtime registry, or
 * contact sheets.
 */
type JsonRecord = Record<string, unknown>;

type ImageAuditCard = JsonRecord & {
  playerCardId: string;
  playerIdentityId: string;
  displayName: string;
  worldCupYear: number;
  imageValidationStatus: string;
  imageSha256: string | null;
  imageDHash: string | null;
  imageVisualSha256: string | null;
  notes: unknown;
};

type SimilarMatch = JsonRecord & {
  pairId: string;
  cardA: string;
  cardB: string;
  identityA: string;
  identityB: string;
  hammingDistance: number;
};

type ManualReview = {
  reviewer: string;
  reviewedAt: string;
  reviewMethod: "side-by-side-visual-inspection";
  reviewOutcome: "accepted-visually-distinct";
  notes: string;
};

const ROOT = process.cwd();
const STEP1B_EVIDENCE_UPDATED_AT = "2026-07-28T07:04:14.811Z";
const REPORT_DIRECTORY = path.join(ROOT, "reports");
const IMAGE_AUDIT_FILE = path.join(
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
const STEP1B_SUMMARY_FILE = path.join(
  REPORT_DIRECTORY,
  "step1b-player-portrait-summary.json",
);
const PRODUCTION_REGISTRY_FILE = path.join(
  ROOT,
  "src",
  "data",
  "tournament-edition-player-portraits.generated.json",
);
const CONTACT_SHEET_BY_YEAR = new Map([
  [
    2014,
    path.join(
      REPORT_DIRECTORY,
      "contact-sheets",
      "player-images-2014.png",
    ),
  ],
  [
    2018,
    path.join(
      REPORT_DIRECTORY,
      "contact-sheets",
      "player-images-2018.png",
    ),
  ],
  [
    2022,
    path.join(
      REPORT_DIRECTORY,
      "contact-sheets",
      "player-images-2022.png",
    ),
  ],
  [
    2026,
    path.join(
      REPORT_DIRECTORY,
      "contact-sheets",
      "player-images-2026.png",
    ),
  ],
]);

/**
 * These are the six distance-zero dHash pairs inspected side by side during
 * Step 1B. The disposition is deliberately limited to what visual inspection
 * proves: the two bitmaps are visibly different portraits. Identity/source
 * verification remains in the primary portrait audit.
 */
const MANUAL_DISTANCE_ZERO_REVIEWS = new Map<string, ManualReview>([
  [
    "denzel-dumfries-2026::kylian-mbappe-2018",
    {
      reviewer: "Codex Step 1B visual review",
      reviewedAt: "2026-07-28",
      reviewMethod: "side-by-side-visual-inspection",
      reviewOutcome: "accepted-visually-distinct",
      notes:
        "Side-by-side inspection shows visibly different face shape, hairline, skin detail, and kit treatment; the equal coarse dHash is a false similarity signal.",
    },
  ],
  [
    "kylian-mbappe-2018::lutsharel-geertruida-2026",
    {
      reviewer: "Codex Step 1B visual review",
      reviewedAt: "2026-07-28",
      reviewMethod: "side-by-side-visual-inspection",
      reviewOutcome: "accepted-visually-distinct",
      notes:
        "Side-by-side inspection shows visibly different hair, beard, face shape, and kit treatment; the equal coarse dHash is a false similarity signal.",
    },
  ],
  [
    "denzel-dumfries-2026::lutsharel-geertruida-2026",
    {
      reviewer: "Codex Step 1B visual review",
      reviewedAt: "2026-07-28",
      reviewMethod: "side-by-side-visual-inspection",
      reviewOutcome: "accepted-visually-distinct",
      notes:
        "Side-by-side inspection shows visibly different facial hair, facial proportions, hairline, and expression; the equal coarse dHash is a false similarity signal.",
    },
  ],
  [
    "diarra-habib-2026::nicolas-pepe-2026",
    {
      reviewer: "Codex Step 1B visual review",
      reviewedAt: "2026-07-28",
      reviewMethod: "side-by-side-visual-inspection",
      reviewOutcome: "accepted-visually-distinct",
      notes:
        "Side-by-side inspection shows visibly different hair, facial proportions, expression, and kit treatment; the equal coarse dHash is a false similarity signal.",
    },
  ],
  [
    "diarra-habib-2026::wan-bissaka-aaron-2026",
    {
      reviewer: "Codex Step 1B visual review",
      reviewedAt: "2026-07-28",
      reviewMethod: "side-by-side-visual-inspection",
      reviewOutcome: "accepted-visually-distinct",
      notes:
        "Side-by-side inspection shows visibly different hair, face shape, expression, and lighting; the equal coarse dHash is a false similarity signal.",
    },
  ],
  [
    "nicolas-pepe-2026::wan-bissaka-aaron-2026",
    {
      reviewer: "Codex Step 1B visual review",
      reviewedAt: "2026-07-28",
      reviewMethod: "side-by-side-visual-inspection",
      reviewOutcome: "accepted-visually-distinct",
      notes:
        "Side-by-side inspection shows visibly different facial hair, hairline, face shape, and kit treatment; the equal coarse dHash is a false similarity signal.",
    },
  ],
]);

const sha256 = (value: Buffer | string) =>
  createHash("sha256").update(value).digest("hex");

const readJson = async <T>(filename: string): Promise<T> =>
  JSON.parse(await readFile(filename, "utf8")) as T;

const recordAt = (value: unknown, label: string): JsonRecord => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as JsonRecord;
};

const arrayAt = <T>(value: unknown, label: string): T[] => {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }
  return value as T[];
};

const notesArray = (value: unknown) =>
  Array.isArray(value)
    ? value.filter(
        (entry): entry is string =>
          typeof entry === "string" && entry.trim().length > 0,
      )
    : [];

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

const manualReviewFor = (pair: SimilarMatch) => {
  const pairId = [pair.cardA, pair.cardB].sort().join("::");
  return {
    pairId,
    review: MANUAL_DISTANCE_ZERO_REVIEWS.get(pairId),
  };
};

const main = async () => {
  const evidenceUpdatedAt = STEP1B_EVIDENCE_UPDATED_AT;
  const imageAudit = recordAt(
    await readJson<unknown>(IMAGE_AUDIT_FILE),
    "image audit",
  );
  const duplicateAudit = recordAt(
    await readJson<unknown>(DUPLICATES_FILE),
    "duplicate audit",
  );
  const imageCards = arrayAt<ImageAuditCard>(
    imageAudit.cards,
    "image audit cards",
  );
  const similarMatches = arrayAt<SimilarMatch>(
    duplicateAudit.similarMatches,
    "perceptual matches",
  );

  const upgradedCards = imageCards.map((card) => {
    const verified = card.imageValidationStatus === "verified";
    const unresolvedReason = verified ? null : notesArray(card.notes)[0];
    if (!verified && !unresolvedReason) {
      throw new Error(
        `${card.playerCardId}: Photo Pending card lacks a specific unresolved reason`,
      );
    }
    return {
      ...card,
      finalPortraitStatus: verified
        ? "verified-portrait"
        : "photo-pending",
      unresolvedReason,
    };
  });
  const verifiedCards = upgradedCards.filter(
    (card) => card.imageValidationStatus === "verified",
  );
  const unresolvedCards = upgradedCards.filter(
    (card) => card.imageValidationStatus !== "verified",
  );
  const upgradedCardById = new Map(
    upgradedCards.map((card) => [card.playerCardId, card]),
  );

  const canonicalGroupsByHash = new Map<string, typeof verifiedCards>();
  for (const card of verifiedCards) {
    if (!/^[a-f0-9]{64}$/.test(card.imageVisualSha256 ?? "")) {
      throw new Error(
        `${card.playerCardId}: verified portrait lacks a canonical-pixel SHA-256`,
      );
    }
    canonicalGroupsByHash.set(card.imageVisualSha256!, [
      ...(canonicalGroupsByHash.get(card.imageVisualSha256!) ?? []),
      card,
    ]);
  }
  const canonicalPixelDuplicateGroups = [...canonicalGroupsByHash]
    .filter(([, cards]) => cards.length > 1)
    .map(([visualSha256, cards]) => {
      const playerIdentityIds = [
        ...new Set(cards.map((card) => card.playerIdentityId)),
      ].sort();
      const crossIdentity = playerIdentityIds.length > 1;
      return {
        groupId: `canonical-pixels-${visualSha256.slice(0, 16)}`,
        visualSha256,
        playerCardIds: cards
          .map((card) => card.playerCardId)
          .sort(),
        playerIdentityIds,
        resolution: crossIdentity
          ? "error-cross-identity-canonical-pixel-duplicate"
          : "allowed-same-identity-canonical-pixel-match",
        notes: crossIdentity
          ? "Unrelated identities decode to the same normalized RGBA pixels and must not remain verified."
          : "The normalized RGBA pixels match only within one player identity.",
      };
    })
    .sort((first, second) => first.groupId.localeCompare(second.groupId));
  const crossIdentityCanonicalPixelGroups =
    canonicalPixelDuplicateGroups.filter(
      (group) =>
        group.resolution ===
        "error-cross-identity-canonical-pixel-duplicate",
    );
  if (crossIdentityCanonicalPixelGroups.length > 0) {
    throw new Error(
      `Cross-identity canonical-pixel duplicates remain: ${crossIdentityCanonicalPixelGroups
        .map((group) => group.playerCardIds.join("/"))
        .join(", ")}`,
    );
  }

  const upgradedSimilarMatches = similarMatches.map((pair) => {
    const { pairId, review } = manualReviewFor(pair);
    if (review) {
      if (pair.hammingDistance !== 0) {
        throw new Error(
          `${pairId}: persisted manual distance-zero review now has distance ${pair.hammingDistance}`,
        );
      }
      const cardA = upgradedCardById.get(pair.cardA);
      const cardB = upgradedCardById.get(pair.cardB);
      if (
        !cardA?.imageSha256 ||
        !cardA.imageVisualSha256 ||
        !cardB?.imageSha256 ||
        !cardB.imageVisualSha256
      ) {
        throw new Error(
          `${pairId}: manual review lacks immutable asset hashes`,
        );
      }
      return {
        ...pair,
        pairId,
        reviewStatus: "manual-reviewed",
        reviewOutcome: review.reviewOutcome,
        reviewMethod: review.reviewMethod,
        reviewer: review.reviewer,
        reviewedAt: review.reviewedAt,
        reviewedAssetEvidence: {
          cardA: {
            playerCardId: pair.cardA,
            imageSha256: cardA.imageSha256,
            canonicalPixelSha256: cardA.imageVisualSha256,
          },
          cardB: {
            playerCardId: pair.cardB,
            imageSha256: cardB.imageSha256,
            canonicalPixelSha256: cardB.imageVisualSha256,
          },
        },
        notes: review.notes,
      };
    }
    if (pair.hammingDistance === 0) {
      throw new Error(
        `${pairId}: distance-zero pair lacks a genuine manual disposition`,
      );
    }
    return {
      ...pair,
      pairId,
      reviewStatus: "automated-candidate",
      reviewOutcome: null,
      reviewMethod: "dhash-threshold-screen",
      reviewer: null,
      reviewedAt: null,
      reviewedAssetEvidence: null,
      notes:
        "Automatically surfaced by the coarse dHash threshold. Distinct source IDs and nonidentical canonical pixels rule out an exact collision, but no manual visual disposition has been recorded.",
    };
  });
  const manualPairs = upgradedSimilarMatches.filter(
    (pair) => pair.reviewStatus === "manual-reviewed",
  );
  const automatedPairs = upgradedSimilarMatches.filter(
    (pair) => pair.reviewStatus === "automated-candidate",
  );
  if (
    manualPairs.length !== MANUAL_DISTANCE_ZERO_REVIEWS.size ||
    [...MANUAL_DISTANCE_ZERO_REVIEWS.keys()].some(
      (pairId) => !manualPairs.some((pair) => pair.pairId === pairId),
    )
  ) {
    throw new Error("The six persisted manual visual reviews are incomplete");
  }

  const baseSummary = recordAt(imageAudit.summary, "image audit summary");
  const upgradedImageAudit = {
    ...imageAudit,
    version: 2,
    evidenceUpdatedAt,
    summary: {
      ...baseSummary,
      finalPortraitStatuses: {
        "verified-portrait": verifiedCards.length,
        "photo-pending": unresolvedCards.length,
      },
      photoPendingWithSpecificReason: unresolvedCards.length,
      canonicalPixelDuplicateGroups:
        canonicalPixelDuplicateGroups.length,
      crossIdentityCanonicalPixelDuplicateErrors:
        crossIdentityCanonicalPixelGroups.length,
      perceptualCandidates: upgradedSimilarMatches.length,
      suspiciousPerceptualMatchesReviewed: manualPairs.length,
      manuallyReviewedPerceptualPairs: manualPairs.length,
      automatedPerceptualCandidates: automatedPairs.length,
    },
    cards: upgradedCards,
  };
  const upgradedUnresolvedAudit = {
    version: 2,
    generatedAt: imageAudit.generatedAt,
    evidenceUpdatedAt,
    summary: {
      total: unresolvedCards.length,
      finalPortraitStatus: "photo-pending",
      withSpecificUnresolvedReason: unresolvedCards.length,
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
  const baseDuplicateSummary = recordAt(
    duplicateAudit.summary,
    "duplicate audit summary",
  );
  const upgradedDuplicateAudit = {
    ...duplicateAudit,
    version: 2,
    evidenceUpdatedAt,
    canonicalPixelHash: {
      algorithm:
        "SHA-256 of decoded pixels after EXIF rotation, alpha normalization, 120x120 contain resize on a transparent background, sRGB conversion, and raw RGBA serialization",
      enforcement:
        "Cross-identity canonical-pixel matches are validation errors and cannot remain verified.",
    },
    summary: {
      ...baseDuplicateSummary,
      canonicalPixelGroups: canonicalPixelDuplicateGroups.length,
      crossIdentityCanonicalPixelErrors:
        crossIdentityCanonicalPixelGroups.length,
      perceptualCandidatePairs: upgradedSimilarMatches.length,
      reviewedSimilarPairs: manualPairs.length,
      manuallyReviewedSimilarPairs: manualPairs.length,
      automatedSimilarCandidates: automatedPairs.length,
    },
    canonicalPixelDuplicateGroups,
    similarMatches: upgradedSimilarMatches,
  };

  const productionRegistry = await readFile(PRODUCTION_REGISTRY_FILE);
  const contactSheets = await Promise.all(
    [...CONTACT_SHEET_BY_YEAR].map(async ([year, filename]) => {
      const contents = await readFile(filename);
      return {
        tournamentYear: year,
        path: `/${path.relative(ROOT, filename)}`,
        sha256: sha256(contents),
        regenerated: false,
        disposition:
          "Preserved because portrait coverage and labels are unchanged; the existing sheet already shows portrait or PHOTO PENDING, player name, nation, tournament year, card ID, required edition, and verification status.",
      };
    }),
  );
  const verifiedAssetHashSetSha256 = sha256(
    verifiedCards
      .map(
        (card) =>
          `${card.playerCardId}:${card.imageSha256}:${card.imageVisualSha256}`,
      )
      .sort()
      .join("\n"),
  );
  const step1bSummary = {
    version: 1,
    generatedAt: evidenceUpdatedAt,
    scope: {
      tournamentYears: [2014, 2018, 2022, 2026],
      policy:
        "Evidence-only upgrade. No Photo Pending card is promoted without new verified identity and required-edition evidence.",
    },
    summary: {
      totalCards: upgradedCards.length,
      verifiedPortraits: verifiedCards.length,
      photoPending: unresolvedCards.length,
      photoPendingWithSpecificReason: unresolvedCards.length,
      newlyPromotedPortraits: 0,
      verifiedAssetsChanged: 0,
      productionRegistryChanged: false,
      byYear: Object.fromEntries(
        [2014, 2018, 2022, 2026].map((year) => {
          const yearCards = upgradedCards.filter(
            (card) => card.worldCupYear === year,
          );
          return [
            String(year),
            {
              total: yearCards.length,
              verified: yearCards.filter(
                (card) => card.imageValidationStatus === "verified",
              ).length,
              photoPending: yearCards.filter(
                (card) => card.imageValidationStatus !== "verified",
              ).length,
            },
          ];
        }),
      ),
    },
    unresolvedReasons: {
      byValidationStatus: groupedCounts(
        unresolvedCards,
        (card) => card.imageValidationStatus,
      ),
      everyPhotoPendingCardHasSpecificReason:
        unresolvedCards.every(
          (card) =>
            typeof card.unresolvedReason === "string" &&
            card.unresolvedReason.trim().length > 0,
        ),
    },
    duplicateEvidence: {
      exactByteDuplicateGroups:
        Number(baseDuplicateSummary.exactGroups) || 0,
      crossIdentityExactByteErrors:
        Number(baseDuplicateSummary.crossIdentityExactErrors) || 0,
      canonicalPixelDuplicateGroups:
        canonicalPixelDuplicateGroups.length,
      crossIdentityCanonicalPixelErrors:
        crossIdentityCanonicalPixelGroups.length,
      perceptualCandidatePairs: upgradedSimilarMatches.length,
      manuallyReviewedDistanceZeroPairs: manualPairs.length,
      automatedNonzeroCandidates: automatedPairs.length,
      manualPairIds: manualPairs.map((pair) => pair.pairId).sort(),
    },
    preservationEvidence: {
      productionRegistryPath: `/${path.relative(
        ROOT,
        PRODUCTION_REGISTRY_FILE,
      )}`,
      productionRegistrySha256: sha256(productionRegistry),
      verifiedAssetHashSetSha256,
      verifiedAssetCount: verifiedCards.length,
      contactSheets,
    },
    artifacts: [
      "/reports/step1-player-image-audit.json",
      "/reports/step1-player-image-unresolved.json",
      "/reports/step1-player-image-duplicates.json",
      "/reports/step1b-player-portrait-summary.json",
    ],
  };

  await Promise.all([
    writeFile(
      IMAGE_AUDIT_FILE,
      `${JSON.stringify(upgradedImageAudit, null, 2)}\n`,
    ),
    writeFile(
      UNRESOLVED_FILE,
      `${JSON.stringify(upgradedUnresolvedAudit, null, 2)}\n`,
    ),
    writeFile(
      DUPLICATES_FILE,
      `${JSON.stringify(upgradedDuplicateAudit, null, 2)}\n`,
    ),
    writeFile(
      STEP1B_SUMMARY_FILE,
      `${JSON.stringify(step1bSummary, null, 2)}\n`,
    ),
  ]);

  console.log(
    [
      "Step 1B portrait evidence upgraded.",
      `${verifiedCards.length} verified portraits preserved.`,
      `${unresolvedCards.length} Photo Pending cards retain specific reasons.`,
      `${canonicalPixelDuplicateGroups.length} canonical-pixel duplicate groups.`,
      `${manualPairs.length} distance-zero pairs manually disposed.`,
      `${automatedPairs.length} nonzero perceptual candidates remain automated.`,
    ].join(" "),
  );
};

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
