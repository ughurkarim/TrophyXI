import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { players } from "../src/data/players";
import {
  isFbrefAccessChallenge,
  parseFbrefWorldCupCompetitionPages,
  parseFbrefWorldCupProfilePage,
  worldCupSourceFor,
  type FbrefWorldCupStatRecord,
} from "../src/lib/importers/fbref-world-cup";
import type { TournamentStatLine } from "../src/types/game";

const ROOT = process.cwd();
const CACHE_DIRECTORY = path.join(
  ROOT,
  "scripts",
  "cache",
  "fbref-world-cup",
);
const PROFILE_CACHE_DIRECTORY = path.join(
  ROOT,
  "scripts",
  "cache",
  "fbref-portraits",
);
const PORTRAIT_MAPPING_FILE = path.join(
  ROOT,
  "scripts",
  "fbref-portrait-map.json",
);
const CAREER_MAPPING_FILE = path.join(
  ROOT,
  "scripts",
  "fbref-player-map.json",
);
const OUTPUT_FILE = path.join(
  ROOT,
  "src",
  "data",
  "player-world-cup-fbref.generated.json",
);
const REPORT_FILE = path.join(
  ROOT,
  "scripts",
  "reports",
  "fbref-world-cup-import-report.json",
);
const ROBOTS_URL = "https://fbref.com/robots.txt";
const RATE_LIMIT_MS = 10_000;
const MAX_RETRIES = 3;
const SUPPORTED_YEARS = [
  1970, 1974, 1978, 1982, 1986, 1990, 1994, 1998, 2002, 2006, 2010, 2014,
  2018, 2022, 2026,
] as const;

type IdentityMapping = {
  playerIdentityId: string;
  playerName: string;
  fbrefId: string;
  sourcePage?: string;
  sourceUrl?: string;
};

type ImportedCard = {
  tournamentYear: number;
  playerIdentityId: string;
  playerName: string;
  fbrefId: string | null;
  stats: TournamentStatLine;
  sourceUrl: string;
  overviewUrl: string;
  sourceKind: "competition-table" | "cached-player-profile";
};

const readJson = async <T>(file: string, fallback: T): Promise<T> =>
  existsSync(file)
    ? (JSON.parse(await readFile(file, "utf8")) as T)
    : fallback;

const writeJson = async (file: string, value: unknown) => {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
};

const wait = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

let lastRequestAt = 0;

const fetchTextWithBackoff = async (url: string) => {
  let lastFailure = "request failed";
  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    const remainingDelay = RATE_LIMIT_MS - (Date.now() - lastRequestAt);
    if (remainingDelay > 0) await wait(remainingDelay);
    lastRequestAt = Date.now();
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "TrophyXI/1.0 (rate-limited World Cup statistics importer; contact via repository)",
        Accept: "text/html,text/plain;q=0.9",
      },
    });
    const body = await response.text();
    if (response.ok && !isFbrefAccessChallenge(body)) return body;
    lastFailure = isFbrefAccessChallenge(body)
      ? "FBref returned an access challenge"
      : `HTTP ${response.status}`;
    if (![429, 503].includes(response.status)) break;
    await wait(2 ** attempt * 2_000);
  }
  throw new Error(lastFailure);
};

const robotsAllowsCompetitionPages = async () => {
  const body = await fetchTextWithBackoff(ROBOTS_URL);
  const disallowed = body
    .split(/\n/)
    .map((line) => line.trim())
    .some((line) => /^disallow:\s*\/en\/comps\b/i.test(line));
  if (disallowed) {
    throw new Error("FBref robots policy disallows competition-page imports");
  }
};

const cacheFileFor = (
  tournamentYear: number,
  kind: "stats" | "keepers",
) => path.join(CACHE_DIRECTORY, `${tournamentYear}-${kind}.html`);

const readCompetitionRecords = async (
  tournamentYear: number,
  refresh: boolean,
) => {
  const source = worldCupSourceFor(tournamentYear);
  const standardFile = cacheFileFor(tournamentYear, "stats");
  const keeperFile = cacheFileFor(tournamentYear, "keepers");
  let standardHtml = existsSync(standardFile)
    ? await readFile(standardFile, "utf8")
    : null;
  let keeperHtml = existsSync(keeperFile)
    ? await readFile(keeperFile, "utf8")
    : null;
  if (refresh) {
    standardHtml = await fetchTextWithBackoff(source.standardUrl);
    keeperHtml = await fetchTextWithBackoff(source.keeperUrl);
    await mkdir(CACHE_DIRECTORY, { recursive: true });
    await writeFile(standardFile, standardHtml);
    await writeFile(keeperFile, keeperHtml);
  }
  if (!standardHtml && !keeperHtml) return [];
  return parseFbrefWorldCupCompetitionPages({
    standardHtml: standardHtml ?? "",
    keeperHtml: keeperHtml ?? "",
    tournamentYear,
  });
};

const profileRecords = async (mappings: IdentityMapping[]) => {
  const records: Array<
    FbrefWorldCupStatRecord & {
      playerIdentityId: string;
      sourceUrl: string;
    }
  > = [];
  for (const mapping of mappings) {
    const cacheFile = path.join(
      PROFILE_CACHE_DIRECTORY,
      `${mapping.fbrefId}-profile.html`,
    );
    if (!existsSync(cacheFile)) continue;
    const html = await readFile(cacheFile, "utf8");
    for (const record of parseFbrefWorldCupProfilePage({
      html,
      playerName: mapping.playerName,
      fbrefId: mapping.fbrefId,
    })) {
      records.push({
        ...record,
        playerIdentityId: mapping.playerIdentityId,
        sourceUrl:
          mapping.sourcePage ??
          mapping.sourceUrl ??
          `https://fbref.com/en/players/${mapping.fbrefId}/`,
      });
    }
  }
  return records;
};

const main = async () => {
  const refresh = process.argv.includes("--refresh");
  const accessedOn = new Date().toISOString().slice(0, 10);
  const portraitMappings = await readJson<IdentityMapping[]>(
    PORTRAIT_MAPPING_FILE,
    [],
  );
  const careerMappings = await readJson<IdentityMapping[]>(
    CAREER_MAPPING_FILE,
    [],
  );
  const mappings = [
    ...new Map(
      [...portraitMappings, ...careerMappings].map((mapping) => [
        mapping.playerIdentityId,
        mapping,
      ]),
    ).values(),
  ];
  const identityByFbrefId = new Map(
    mappings.map((mapping) => [mapping.fbrefId, mapping.playerIdentityId]),
  );
  const cardsById = new Map(players.map((player) => [player.id, player]));
  const importedByCardId = new Map<string, ImportedCard>();
  const unresolvedRows: Array<{
    tournamentYear: number;
    playerName: string;
    teamName: string | null;
    fbrefId: string | null;
    reason: string;
  }> = [];
  const conflicts: Array<{
    cardId: string;
    field: keyof TournamentStatLine;
    existingValue: number;
    fbrefValue: number;
  }> = [];
  const unavailableYears: Array<{
    tournamentYear: number;
    reason: string;
  }> = [];
  let networkBlockedReason: string | null = null;

  if (refresh) {
    try {
      await robotsAllowsCompetitionPages();
    } catch (error) {
      networkBlockedReason =
        error instanceof Error ? error.message : "FBref policy check failed";
    }
  }

  const cachedProfiles = await profileRecords(mappings);
  for (const record of cachedProfiles) {
    const cardId = `${record.playerIdentityId}-${record.tournamentYear}`;
    if (!cardsById.has(cardId)) continue;
    importedByCardId.set(cardId, {
      tournamentYear: record.tournamentYear,
      playerIdentityId: record.playerIdentityId,
      playerName: record.playerName,
      fbrefId: record.fbrefId,
      stats: record.stats,
      sourceUrl: record.sourceUrl,
      overviewUrl: worldCupSourceFor(record.tournamentYear).overviewUrl,
      sourceKind: "cached-player-profile",
    });
  }

  for (const tournamentYear of SUPPORTED_YEARS) {
    let rows: FbrefWorldCupStatRecord[] = [];
    try {
      rows = await readCompetitionRecords(
        tournamentYear,
        refresh && !networkBlockedReason,
      );
      if (rows.length === 0) {
        unavailableYears.push({
          tournamentYear,
          reason:
            networkBlockedReason ??
            "No cached competition tables are available.",
        });
      }
    } catch (error) {
      unavailableYears.push({
        tournamentYear,
        reason: error instanceof Error ? error.message : "Unknown import error",
      });
    }
    for (const row of rows) {
      const mappedIdentityId = row.fbrefId
        ? identityByFbrefId.get(row.fbrefId)
        : undefined;
      const candidates = players.filter(
        (player) =>
          player.tournamentYear === tournamentYear &&
          (mappedIdentityId
            ? player.playerIdentityId === mappedIdentityId
            : normalize(player.playerName) === normalize(row.playerName)),
      );
      const narrowed =
        candidates.length > 1 && row.teamName
          ? candidates.filter(
              (player) =>
                normalize(player.countryName) === normalize(row.teamName!) ||
                normalize(row.teamName!).includes(
                  normalize(player.countryName),
                ),
            )
          : candidates;
      if (narrowed.length !== 1) {
        unresolvedRows.push({
          tournamentYear,
          playerName: row.playerName,
          teamName: row.teamName,
          fbrefId: row.fbrefId,
          reason:
            narrowed.length === 0
              ? "No Trophy XI card matched the FBref row."
              : "Multiple Trophy XI cards matched the FBref row.",
        });
        continue;
      }
      const card = narrowed[0];
      importedByCardId.set(card.id, {
        tournamentYear,
        playerIdentityId: card.playerIdentityId,
        playerName: card.playerName,
        fbrefId: row.fbrefId,
        stats: row.stats,
        sourceUrl: worldCupSourceFor(tournamentYear).standardUrl,
        overviewUrl: worldCupSourceFor(tournamentYear).overviewUrl,
        sourceKind: "competition-table",
      });
    }
  }

  for (const [cardId, imported] of importedByCardId) {
    const card = cardsById.get(cardId)!;
    for (const field of [
      "appearances",
      "starts",
      "goals",
    ] as const) {
      const existingValue = card.tournamentStats[field];
      const fbrefValue = imported.stats[field];
      if (
        existingValue !== null &&
        fbrefValue !== null &&
        existingValue !== fbrefValue
      ) {
        conflicts.push({
          cardId,
          field,
          existingValue,
          fbrefValue,
        });
        imported.stats[field] = null;
      }
    }
  }

  const records = Object.fromEntries(
    [...importedByCardId.entries()]
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([cardId, record]) => [cardId, record]),
  );
  const generatedAt = new Date().toISOString();
  await writeJson(OUTPUT_FILE, {
    version: 1,
    generatedAt,
    accessedOn,
    competitionSources: SUPPORTED_YEARS.map(worldCupSourceFor),
    records,
  });
  await writeJson(REPORT_FILE, {
    generatedAt,
    mode: refresh ? "refresh" : "cache-only",
    networkBlockedReason,
    requestedCompetitionSources: SUPPORTED_YEARS.map(worldCupSourceFor),
    cachedProfileMappings: mappings.length,
    matchedCards: importedByCardId.size,
    competitionTableCards: [...importedByCardId.values()].filter(
      (record) => record.sourceKind === "competition-table",
    ).length,
    cachedProfileCards: [...importedByCardId.values()].filter(
      (record) => record.sourceKind === "cached-player-profile",
    ).length,
    conflicts,
    unresolvedRows,
    unavailableYears,
  });

  console.log("FBref World Cup statistics import summary");
  console.log(`Mode: ${refresh ? "refresh" : "cache-only"}`);
  console.log(`Matched cards: ${importedByCardId.size}`);
  console.log(`Conflicting sourced fields left unchanged: ${conflicts.length}`);
  console.log(`Unresolved competition rows: ${unresolvedRows.length}`);
  if (networkBlockedReason) {
    console.log(`Network blocked: ${networkBlockedReason}`);
  }
};

void main();
