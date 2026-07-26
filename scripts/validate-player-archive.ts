import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import historicalJson from "../src/data/player-tournaments.generated.json";
import roster2026Json from "../src/data/player-tournaments-2026.generated.json";
import identityPortraitJson from "../src/data/player-identity-portraits.generated.json";
import gameFaceCacheJson from "./cache/game-faces/import-cache.json";
import { imagesById, playerImages } from "../src/data/player-images";
import { players, playersById } from "../src/data/players";
import { PLAYER_WORLD_CUP_YEARS } from "../src/types/game";

type HistoricalArchive = {
  identities: Record<
    string,
    { tournamentYear: number; teamCode: string; playerName: string }[]
  >;
};
type Roster2026Archive = {
  players: Array<{
    identityId: string;
    playerName: string;
    teamCode: string;
  }>;
};
type IdentityPortraitArchive = {
  identityPortraits: Array<{
    sourceCardId: string;
    sourceTournamentYear: number;
    sourceKind: string;
    sourceImageUrl: string | null;
  }>;
};

const historical = historicalJson as unknown as HistoricalArchive;
const roster2026 = roster2026Json as unknown as Roster2026Archive;
const identityPortraits =
  identityPortraitJson as unknown as IdentityPortraitArchive;
const ROOT = process.cwd();
const REPORT_FILE = path.join(
  ROOT,
  "reports",
  "player-archive-validation.json",
);

const groupedCount = <T>(
  values: T[],
  keyFor: (value: T) => string,
) => {
  const counts = new Map<string, number>();
  for (const value of values) {
    const key = keyFor(value);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Object.fromEntries([...counts].sort(([first], [second]) =>
    first.localeCompare(second, "en", { numeric: true }),
  ));
};

const main = async () => {
  const duplicateIds = Object.entries(
    groupedCount(players, (player) => player.id),
  )
    .filter(([, count]) => count > 1)
    .map(([id]) => id);
  const cardsByTournament = groupedCount(players, (player) =>
    String(player.tournamentYear),
  );
  const teamsByTournament = Object.fromEntries(
    PLAYER_WORLD_CUP_YEARS.map((year) => [
      String(year),
      new Set(
        players
          .filter((player) => player.tournamentYear === year)
          .map((player) => player.countryCode),
      ).size,
    ]),
  );
  const realFacesByTournament = Object.fromEntries(
    PLAYER_WORLD_CUP_YEARS.map((year) => [
      String(year),
      players.filter(
        (player) =>
          player.tournamentYear === year && imagesById.has(player.imageId),
      ).length,
    ]),
  );
  const missingFaceIds = players
    .filter((player) => !imagesById.has(player.imageId))
    .map((player) => player.id);
  const missingAccoladeIds = players
    .filter((player) => player.careerAccolades.length === 0)
    .map((player) => player.id);
  const identityRepresentatives = [
    ...new Map(
      players.map((player) => [player.playerIdentityId, player]),
    ).values(),
  ];
  const fbrefCareerIdentities = identityRepresentatives.filter(
    (player) => player.careerStats?.sourceName === "FBref",
  ).length;
  const fbrefAccolades = identityRepresentatives
    .flatMap((player) => player.careerAccolades)
    .filter((accolade) => accolade.sourceName === "FBref").length;
  const yearSpecificAccolades = identityRepresentatives
    .flatMap((player) => player.careerAccolades)
    .filter((accolade) => / — \d{4}(?:-\d{2,4})?$/.test(accolade.label))
    .length;

  const countriesByIdentity = new Map<string, Set<string>>();
  for (const player of players) {
    const countries =
      countriesByIdentity.get(player.playerIdentityId) ?? new Set<string>();
    countries.add(player.countryCode);
    countriesByIdentity.set(player.playerIdentityId, countries);
  }
  const multiCountryIdentities = [...countriesByIdentity]
    .filter(([, countries]) => countries.size > 1)
    .map(([identityId, countries]) => ({
      identityId,
      countryCodes: [...countries].sort(),
    }));
  const legitimateSuccessionGroups = [
    new Set(["SUN", "RUS"]),
    new Set(["YUG", "CRO", "SCG", "SRB"]),
  ];
  const conflictingCountries = multiCountryIdentities.filter(
    ({ countryCodes }) =>
      !legitimateSuccessionGroups.some((group) =>
        countryCodes.every((countryCode) => group.has(countryCode)),
      ),
  );

  const rosterCounts = groupedCount(
    players,
    (player) => `${player.tournamentYear}/${player.countryCode}`,
  );
  const suspiciouslySmallRosters = Object.entries(rosterCounts)
    .filter(([, count]) => count < 18)
    .map(([key, playerCount]) => {
      const [year, teamCode] = key.split("/");
      return { tournamentYear: Number(year), teamCode, playerCount };
    });

  const expectedSourceIds = new Set([
    ...Object.entries(historical.identities).flatMap(
      ([identityId, tournaments]) =>
        tournaments.map(
          (tournament) => `${identityId}-${tournament.tournamentYear}`,
        ),
    ),
    ...roster2026.players.map((player) => `${player.identityId}-2026`),
  ]);
  const actualIds = new Set(players.map((player) => player.id));
  const sourcePlayersMissingFromTrophyXi = [...expectedSourceIds]
    .filter((id) => !actualIds.has(id))
    .sort();
  const trophyXiPlayersMissingFromSources = [...actualIds]
    .filter((id) => !expectedSourceIds.has(id))
    .sort();

  const brokenImagePaths = playerImages
    .filter((image) => {
      const absolutePath = path.join(ROOT, image.file.replace(/^\//, ""));
      return !existsSync(absolutePath);
    })
    .map((image) => ({ id: image.id, file: image.file }));
  const gameFaceCache = gameFaceCacheJson as Record<
    string,
    { status: string; sourceUrl?: string }
  >;
  const prescribedGameEditionByYear = new Map([
    [2010, 10],
    [2014, 14],
    [2018, 18],
    [2022, 23],
    [2026, 26],
  ]);
  const exactImportedPortraitIds = new Set(
    identityPortraits.identityPortraits
      .filter((portrait) => {
        const edition = portrait.sourceImageUrl?.match(
          /\/(\d{2})_120\.png$/,
        )?.[1];
        return (
          portrait.sourceKind === "sofifa-game-face" &&
          Number(edition) ===
            prescribedGameEditionByYear.get(portrait.sourceTournamentYear)
        );
      })
      .map((portrait) => portrait.sourceCardId),
  );
  const exactYearFaceIds = players
    .filter((player) => {
      const cached = gameFaceCache[player.id];
      const edition = cached?.sourceUrl?.match(/\/(\d{2})_120\.png$/)?.[1];
      return (
        imagesById.has(player.imageId) &&
        (((cached?.status === "success" || cached?.status === "skipped") &&
          Number(edition) ===
            prescribedGameEditionByYear.get(player.tournamentYear)) ||
          exactImportedPortraitIds.has(player.id))
      );
    })
    .map((player) => player.id);
  const exactYearFaceIdSet = new Set(exactYearFaceIds);
  const fallbackYearFaceIds = players
    .filter(
      (player) =>
        imagesById.has(player.imageId) && !exactYearFaceIdSet.has(player.id),
    )
    .map((player) => player.id);
  const imageAssignments = new Map<string, Set<string>>();
  for (const image of playerImages) {
    const identityId = playersById.get(image.id)?.playerIdentityId;
    if (!identityId) continue;
    const identities = imageAssignments.get(image.file) ?? new Set<string>();
    identities.add(identityId);
    imageAssignments.set(image.file, identities);
  }
  const duplicateImageAssignmentsForDifferentPeople = [...imageAssignments]
    .filter(([, identityIds]) => identityIds.size > 1)
    .map(([file, identityIds]) => ({
      file,
      identityIds: [...identityIds].sort(),
    }));
  const missingFaceIdSet = new Set(missingFaceIds);
  const fallbackYearFaceIdSet = new Set(fallbackYearFaceIds);
  const missingAccoladeIdSet = new Set(missingAccoladeIds);
  const sourceOmissionIdSet = new Set(sourcePlayersMissingFromTrophyXi);
  const tournamentBreakdown = Object.fromEntries(
    PLAYER_WORLD_CUP_YEARS.map((year) => {
      const tournamentCards = players.filter(
        (player) => player.tournamentYear === year,
      );
      return [
        String(year),
        {
          teams: new Set(tournamentCards.map((player) => player.countryCode))
            .size,
          cards: tournamentCards.length,
          realFaces: tournamentCards.filter(
            (player) => !missingFaceIdSet.has(player.id),
          ).length,
          exactYearFaces: tournamentCards.filter((player) =>
            exactYearFaceIdSet.has(player.id),
          ).length,
          identityFallbackFaces: tournamentCards.filter((player) =>
            fallbackYearFaceIdSet.has(player.id),
          ).length,
          pendingFaces: tournamentCards.filter((player) =>
            missingFaceIdSet.has(player.id),
          ).length,
          cardsWithAccolades: tournamentCards.filter(
            (player) => !missingAccoladeIdSet.has(player.id),
          ).length,
          missingAccolades: tournamentCards.filter((player) =>
            missingAccoladeIdSet.has(player.id),
          ).length,
          suspiciousRosters: suspiciouslySmallRosters.filter(
            (roster) => roster.tournamentYear === year,
          ).length,
          sourceOmissions: [...sourceOmissionIdSet].filter((id) =>
            id.endsWith(`-${year}`),
          ).length,
        },
      ];
    }),
  );
  const expectedSpotCheckYears = new Map<string, number[]>([
    ["lionel-messi", [2006, 2010, 2014, 2018, 2022, 2026]],
    ["cristiano-ronaldo", [2006, 2010, 2014, 2018, 2022, 2026]],
    ["luka-modric", [2006, 2014, 2018, 2022, 2026]],
    ["harry-kane", [2018, 2022, 2026]],
  ]);
  const identityVersionSpotChecks = [...expectedSpotCheckYears].map(
    ([identityId, expectedYears]) => {
      const actualYears = players
        .filter((player) => player.playerIdentityId === identityId)
        .map((player) => player.tournamentYear)
        .sort();
      return {
        identityId,
        expectedYears,
        actualYears,
        passed: actualYears.join("|") === expectedYears.join("|"),
      };
    },
  );
  const rosterSpotChecks = [
    {
      tournamentYear: 2026,
      teamCode: "CRO",
      expectedCards: 26,
      actualCards: players.filter(
        (player) =>
          player.tournamentYear === 2026 && player.countryCode === "CRO",
      ).length,
    },
  ].map((spotCheck) => ({
    ...spotCheck,
    passed: spotCheck.actualCards === spotCheck.expectedCards,
  }));
  const spotCheckFailures = [
    ...identityVersionSpotChecks,
    ...rosterSpotChecks,
  ].filter((spotCheck) => !spotCheck.passed);

  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      cards: players.length,
      identities: countriesByIdentity.size,
      realFaces: players.length - missingFaceIds.length,
      missingFaces: missingFaceIds.length,
      missingAccolades: missingAccoladeIds.length,
      fbrefCareerIdentities,
      fbrefAccolades,
      yearSpecificAccolades,
      exactYearFaces: exactYearFaceIds.length,
      fallbackYearFaces: fallbackYearFaceIds.length,
    },
    cardsByTournament,
    teamsByTournament,
    realFacesByTournament,
    tournamentBreakdown,
    spotChecks: {
      identityVersions: identityVersionSpotChecks,
      rosters: rosterSpotChecks,
      failures: spotCheckFailures,
    },
    duplicateIds,
    multiCountryIdentities,
    conflictingCountries,
    suspiciouslySmallRosters,
    sourcePlayersMissingFromTrophyXi,
    trophyXiPlayersMissingFromSources,
    brokenImagePaths,
    exactYearFaceIds,
    fallbackYearFaceIds,
    duplicateImageAssignmentsForDifferentPeople,
    missingFaceIds,
    missingAccoladeIds,
  };
  await mkdir(path.dirname(REPORT_FILE), { recursive: true });
  await writeFile(REPORT_FILE, `${JSON.stringify(report, null, 2)}\n`);

  console.log("Player archive validation");
  console.log(JSON.stringify(report.summary));
  console.log(`Cards by tournament: ${JSON.stringify(cardsByTournament)}`);
  console.log(`Teams by tournament: ${JSON.stringify(teamsByTournament)}`);
  console.log(
    `Real faces by tournament: ${JSON.stringify(realFacesByTournament)}`,
  );
  console.log(
    `Duplicate ids ${duplicateIds.length}; multi-country identities ${multiCountryIdentities.length} (${conflictingCountries.length} conflicts after succession review); suspicious rosters ${suspiciouslySmallRosters.length}; source omissions ${sourcePlayersMissingFromTrophyXi.length}; broken images ${brokenImagePaths.length}; cross-person image collisions ${duplicateImageAssignmentsForDifferentPeople.length}.`,
  );
  console.log(`Wrote ${path.relative(ROOT, REPORT_FILE)}.`);

  if (
    duplicateIds.length > 0 ||
    conflictingCountries.length > 0 ||
    suspiciouslySmallRosters.length > 0 ||
    sourcePlayersMissingFromTrophyXi.length > 0 ||
    trophyXiPlayersMissingFromSources.length > 0 ||
    brokenImagePaths.length > 0 ||
    duplicateImageAssignmentsForDifferentPeople.length > 0 ||
    spotCheckFailures.length > 0
  ) {
    process.exitCode = 1;
  }
};

void main();
