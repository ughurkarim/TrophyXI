import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { playerImages } from "../src/data/player-images";
import { getPlayablePlayers } from "../src/data/players";
import { playerCardSchema } from "../src/lib/validation";
import type {
  PlayerAttributes,
  PlayerTournamentCard,
  TournamentStatLine,
} from "../src/types/game";

const ROOT = process.cwd();
const REPORT_FILE = path.join(
  ROOT,
  "reports",
  "playable-player-validation.json",
);

const GAMEPLAY_ATTRIBUTE_FIELDS = [
  "attack",
  "creativity",
  "control",
  "defense",
  "physical",
  "goalkeeping",
  "clutch",
] as const satisfies readonly (keyof PlayerAttributes)[];

const TOURNAMENT_STAT_FIELDS = [
  "appearances",
  "starts",
  "minutes",
  "goals",
  "assists",
  "cleanSheets",
  "saves",
  "goalsConceded",
  "penaltiesSaved",
] as const satisfies readonly (keyof TournamentStatLine)[];

const TSHABALALA_ID = "siphiwe-tshabalala-2010";

const compareStrings = (first: string, second: string) =>
  first.localeCompare(second, "en", { numeric: true });

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

const exactImagePaths = (cardId: string) => ({
  publicPath: `public/players/game-faces/${cardId}.png`,
  runtimePath: `/players/game-faces/${cardId}.png`,
});

const schemaIssuesFor = (player: PlayerTournamentCard) => {
  const result = playerCardSchema.safeParse(player);
  if (result.success) return [];
  return result.error.issues
    .map((issue) => ({
      code: issue.code,
      path: issue.path.join("."),
      message: issue.message,
    }))
    .sort((first, second) => {
      const pathOrder = compareStrings(first.path, second.path);
      return pathOrder === 0
        ? compareStrings(first.message, second.message)
        : pathOrder;
    });
};

const tshabalalaContract = (player: PlayerTournamentCard | undefined) => {
  const failures: string[] = [];
  if (!player) {
    failures.push(`${TSHABALALA_ID} is absent from getPlayablePlayers().`);
    return {
      cardId: TSHABALALA_ID,
      passed: false,
      failures,
      actual: null,
    };
  }

  const expectedAttributes: PlayerAttributes = {
    attack: 75,
    creativity: 72,
    control: 76,
    defense: 30,
    physical: 73,
    goalkeeping: 9,
    clutch: 74,
  };
  const expectedFields = {
    playerIdentityId: "siphiwe-tshabalala",
    playerName: "Siphiwe Tshabalala",
    countryCode: "RSA",
    countryName: "South Africa",
    confederation: "CAF",
    tournamentYear: 2010,
    primaryPosition: "LW",
    overall: 73,
    isDraftEligible: true,
    draftIneligibilityReason: null,
    imageId: TSHABALALA_ID,
  } as const;

  for (const [field, expected] of Object.entries(expectedFields)) {
    const actual = player[field as keyof PlayerTournamentCard];
    if (actual !== expected) {
      failures.push(
        `${field} must be ${JSON.stringify(expected)}; received ${JSON.stringify(actual)}.`,
      );
    }
  }

  const expectedPositions = ["LW", "RM"];
  if (
    [...player.eligiblePositions].sort(compareStrings).join("|") !==
    [...expectedPositions].sort(compareStrings).join("|")
  ) {
    failures.push(
      `eligiblePositions must be ${expectedPositions.join(", ")}; received ${player.eligiblePositions.join(", ")}.`,
    );
  }

  for (const field of GAMEPLAY_ATTRIBUTE_FIELDS) {
    if (player.attributes[field] !== expectedAttributes[field]) {
      failures.push(
        `attributes.${field} must be ${expectedAttributes[field]}; received ${player.attributes[field]}.`,
      );
    }
  }

  const expectedTournamentStats = {
    appearances: 3,
    starts: 3,
    goals: 1,
  } as const;
  for (const [field, expected] of Object.entries(expectedTournamentStats)) {
    const actual =
      player.tournamentStats[field as keyof TournamentStatLine];
    if (actual !== expected) {
      failures.push(
        `tournamentStats.${field} must be ${expected}; received ${JSON.stringify(actual)}.`,
      );
    }
  }

  return {
    cardId: TSHABALALA_ID,
    passed: failures.length === 0,
    failures,
    actual: {
      playerIdentityId: player.playerIdentityId,
      playerName: player.playerName,
      countryCode: player.countryCode,
      countryName: player.countryName,
      confederation: player.confederation,
      tournamentYear: player.tournamentYear,
      primaryPosition: player.primaryPosition,
      eligiblePositions: player.eligiblePositions,
      overall: player.overall,
      attributes: player.attributes,
      isDraftEligible: player.isDraftEligible,
      draftIneligibilityReason: player.draftIneligibilityReason,
      tournamentStats: {
        appearances: player.tournamentStats.appearances,
        starts: player.tournamentStats.starts,
        goals: player.tournamentStats.goals,
      },
      imageId: player.imageId,
    },
  };
};

const main = async () => {
  // This is intentionally the only player-card collection traversed here.
  // Existing archive construction stays owned by the player module; this
  // validator does not iterate or create records for the historical archive.
  const playablePlayers = getPlayablePlayers();
  const playablePlayersById = new Map(
    playablePlayers.map((player) => [player.id, player]),
  );
  const playableCardIds = new Set(playablePlayersById.keys());

  const duplicatePlayableCardIds = duplicateValues(
    playablePlayers.map((player) => player.id),
  );
  const invalidPlayerCards = playablePlayers
    .map((player) => ({
      cardId: player.id,
      issues: schemaIssuesFor(player),
    }))
    .filter((record) => record.issues.length > 0)
    .sort((first, second) => compareStrings(first.cardId, second.cardId));

  const missingGameplayStatistics = playablePlayers
    .map((player) => {
      const attributes = player.attributes as Partial<PlayerAttributes> | null;
      return {
        cardId: player.id,
        missingFields: GAMEPLAY_ATTRIBUTE_FIELDS.filter(
          (field) => attributes?.[field] === undefined,
        ),
      };
    })
    .filter((record) => record.missingFields.length > 0)
    .sort((first, second) => compareStrings(first.cardId, second.cardId));

  const invalidGameplayStatistics = playablePlayers
    .flatMap((player) =>
      GAMEPLAY_ATTRIBUTE_FIELDS.flatMap((field) => {
        const value = player.attributes?.[field];
        return typeof value !== "number" ||
          !Number.isInteger(value) ||
          value < 1 ||
          value > 99
          ? [{ cardId: player.id, field, value }]
          : [];
      }),
    )
    .sort((first, second) => {
      const cardOrder = compareStrings(first.cardId, second.cardId);
      return cardOrder === 0
        ? compareStrings(first.field, second.field)
        : cardOrder;
    });

  const missingTournamentStatisticRecords = playablePlayers
    .filter(
      (player) =>
        !player.tournamentStats ||
        typeof player.tournamentStats !== "object",
    )
    .map((player) => player.id)
    .sort(compareStrings);

  const invalidTournamentStatistics = playablePlayers
    .flatMap((player) =>
      TOURNAMENT_STAT_FIELDS.flatMap((field) => {
        const value = player.tournamentStats?.[field];
        return value !== null &&
          value !== undefined &&
          (typeof value !== "number" ||
            !Number.isInteger(value) ||
            value < 0)
          ? [{ cardId: player.id, field, value }]
          : [];
      }),
    )
    .sort((first, second) => {
      const cardOrder = compareStrings(first.cardId, second.cardId);
      return cardOrder === 0
        ? compareStrings(first.field, second.field)
        : cardOrder;
    });

  const incompleteTournamentStatistics = playablePlayers
    .map((player) => {
      const missingFields = TOURNAMENT_STAT_FIELDS.filter(
        (field) => player.tournamentStats?.[field] == null,
      );
      const knownFieldCount =
        TOURNAMENT_STAT_FIELDS.length - missingFields.length;
      return {
        cardId: player.id,
        coverage: knownFieldCount === 0 ? "unknown" : "partial",
        knownFieldCount,
        missingFields,
      };
    })
    .filter((record) => record.missingFields.length > 0)
    .sort((first, second) => compareStrings(first.cardId, second.cardId));

  const activeImageRecordIds = playerImages.map((image) => image.id);
  const duplicateActiveImageRecordIds = duplicateValues(activeImageRecordIds);
  const orphanActiveImageRecordIds = [
    ...new Set(
      activeImageRecordIds.filter((cardId) => !playableCardIds.has(cardId)),
    ),
  ].sort(compareStrings);
  const activeImageRecordsById = new Map(
    playerImages.map((image) => [image.id, image]),
  );
  const invalidActiveImageRecords = playerImages
    .flatMap((image) => {
      const player = playablePlayersById.get(image.id);
      if (!player) return [];
      const expected = exactImagePaths(image.id);
      const localFileExists = existsSync(path.join(ROOT, expected.publicPath));
      const reasons = [
        ...(image.kind === "player" ? [] : [`kind is ${image.kind}`]),
        ...(image.file === expected.runtimePath
          ? []
          : [`runtime path is ${image.file}`]),
        ...(image.tournamentYear === player.tournamentYear
          ? []
          : [
              `tournament year is ${image.tournamentYear}; expected ${player.tournamentYear}`,
            ]),
        ...(image.fallback ? ["fallback is enabled"] : []),
        ...(image.exactTournamentImage
          ? []
          : ["exactTournamentImage is not true"]),
        ...(localFileExists
          ? []
          : [`local file is missing at ${expected.publicPath}`]),
      ];
      return reasons.length > 0
        ? [
            {
              cardId: image.id,
              expectedPublicPath: expected.publicPath,
              expectedRuntimePath: expected.runtimePath,
              reasons,
            },
          ]
        : [];
    })
    .sort((first, second) => compareStrings(first.cardId, second.cardId));

  const missingExactYearImages = playablePlayers
    .flatMap((player) => {
      const expected = exactImagePaths(player.id);
      const activeImage = activeImageRecordsById.get(player.id);
      if (activeImage) return [];
      const localFileExists = existsSync(path.join(ROOT, expected.publicPath));
      return [
        {
          cardId: player.id,
          playerName: player.playerName,
          countryCode: player.countryCode,
          tournamentYear: player.tournamentYear,
          expectedPublicPath: expected.publicPath,
          expectedRuntimePath: expected.runtimePath,
          localFileExists,
          activeImageRecordExists: false,
          displayStatus: "PHOTO PENDING",
        },
      ];
    })
    .sort((first, second) => compareStrings(first.cardId, second.cardId));

  // Tournament statistics are embedded in active PlayerTournamentCard records,
  // so these IDs represent the complete active runtime stat-record collection.
  const activeStatRecordIds = playablePlayers
    .filter((player) => player.tournamentStats !== undefined)
    .map((player) => player.id);
  const orphanActiveStatRecordIds = [
    ...new Set(
      activeStatRecordIds.filter((cardId) => !playableCardIds.has(cardId)),
    ),
  ].sort(compareStrings);

  const tshabalala = tshabalalaContract(
    playablePlayers.find((player) => player.id === TSHABALALA_ID),
  );
  const cardsWithUnknownTournamentEvidence =
    incompleteTournamentStatistics.filter(
      (record) => record.coverage === "unknown",
    ).length;
  const cardsWithPartialTournamentEvidence =
    incompleteTournamentStatistics.length -
    cardsWithUnknownTournamentEvidence;
  const invalidActiveImageRecordIds = new Set(
    invalidActiveImageRecords.map((record) => record.cardId),
  );
  const exactLocalImages = new Set(
    playerImages
      .filter(
        (image) =>
          playableCardIds.has(image.id) &&
          !invalidActiveImageRecordIds.has(image.id),
      )
      .map((image) => image.id),
  ).size;

  const report = {
    schemaVersion: 1,
    scope: {
      playerSource: "getPlayablePlayers()",
      iteratedPlayableCards: playablePlayers.length,
      historicalArchiveTraversedByValidator: false,
      activeImageRecordSource: "playerImages",
      activeStatRecordSource:
        "getPlayablePlayers()[].tournamentStats (embedded runtime records)",
    },
    policy: {
      exactImagePublicPath: "public/players/game-faces/{card-id}.png",
      exactImageRuntimePath: "/players/game-faces/{card-id}.png",
      missingImageBehavior: "PHOTO PENDING (report only; card stays playable)",
      tournamentEvidenceBehavior:
        "Nullable fields are reported as partial or unknown evidence and are not errors when the existing player schema is valid.",
    },
    summary: {
      playableCards: playablePlayers.length,
      playableIdentities: new Set(
        playablePlayers.map((player) => player.playerIdentityId),
      ).size,
      schemaValidCards: playablePlayers.length - invalidPlayerCards.length,
      completeGameplayStatisticCards:
        playablePlayers.length - missingGameplayStatistics.length,
      invalidGameplayStatisticValues: invalidGameplayStatistics.length,
      completeTournamentStatisticRecordCards:
        playablePlayers.length - missingTournamentStatisticRecords.length,
      invalidTournamentStatisticValues:
        invalidTournamentStatistics.length,
      cardsWithCompleteTournamentEvidence:
        playablePlayers.length - incompleteTournamentStatistics.length,
      cardsWithPartialTournamentEvidence,
      cardsWithUnknownTournamentEvidence,
      exactLocalImages,
      photoPending: missingExactYearImages.length,
      activeImageRecords: playerImages.length,
      invalidActiveImageRecords: invalidActiveImageRecords.length,
      activeStatRecords: activeStatRecordIds.length,
      duplicatePlayableCardIds: duplicatePlayableCardIds.length,
      orphanActiveImageRecords: orphanActiveImageRecordIds.length,
      orphanActiveStatRecords: orphanActiveStatRecordIds.length,
      tshabalalaContractPassed: tshabalala.passed,
    },
    issues: {
      duplicatePlayableCardIds,
      invalidPlayerCards,
      missingGameplayStatistics,
      invalidGameplayStatistics,
      missingTournamentStatisticRecords,
      invalidTournamentStatistics,
      incompleteTournamentStatistics,
      missingExactYearImages,
      duplicateActiveImageRecordIds,
      orphanActiveImageRecordIds,
      invalidActiveImageRecords,
      orphanActiveStatRecordIds,
      tshabalalaContractFailures: tshabalala.failures,
    },
    tshabalala,
  };

  await mkdir(path.dirname(REPORT_FILE), { recursive: true });
  await writeFile(REPORT_FILE, `${JSON.stringify(report, null, 2)}\n`);

  console.log("Playable player validation");
  console.log(JSON.stringify(report.summary));
  console.log(`Wrote ${path.relative(ROOT, REPORT_FILE)}.`);

  const blockingIssueCount =
    duplicatePlayableCardIds.length +
    invalidPlayerCards.length +
    missingGameplayStatistics.length +
    invalidGameplayStatistics.length +
    missingTournamentStatisticRecords.length +
    invalidTournamentStatistics.length +
    duplicateActiveImageRecordIds.length +
    orphanActiveImageRecordIds.length +
    invalidActiveImageRecords.length +
    orphanActiveStatRecordIds.length +
    tshabalala.failures.length;
  if (blockingIssueCount > 0) {
    process.exitCode = 1;
  }
};

void main();
