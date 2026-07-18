import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { players } from "../src/data/players";
import {
  dedupeAccolades,
  isFbrefChallengePage,
  parseFbrefPlayerPage,
  type FbrefPlayerMapping,
  type ParsedFbrefPlayer,
} from "../src/lib/importers/fbref";
import type {
  PlayerAccolade,
  Top100Source,
} from "../src/types/game";

const ROOT = process.cwd();
const MAPPING_FILE = path.join(ROOT, "scripts", "fbref-player-map.json");
const CURATION_FILE = path.join(
  ROOT,
  "scripts",
  "player-career-curation.json",
);
const CACHE_DIRECTORY = path.join(ROOT, "scripts", "cache", "fbref");
const REPORT_FILE = path.join(
  ROOT,
  "scripts",
  "reports",
  "fbref-import-report.json",
);
const OUTPUT_FILE = path.join(
  ROOT,
  "src",
  "data",
  "player-career.generated.json",
);
const ROBOTS_URL = "https://fbref.com/robots.txt";
const RATE_LIMIT_MS = 10_000;
const MAX_RETRIES = 3;

type CareerCuration = {
  top100: {
    identityIds: string[];
    source: Top100Source;
  };
  supplementaryAccolades: Record<string, PlayerAccolade[]>;
};

const readJson = async <T>(file: string): Promise<T> =>
  JSON.parse(await readFile(file, "utf8")) as T;

const writeJson = async (file: string, value: unknown) => {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
};

const wait = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const fetchTextWithBackoff = async (url: string) => {
  let lastFailure = "request failed";
  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "TrophyXI/1.0 (rate-limited historical-statistics importer; contact via repository)",
        Accept: "text/html,text/plain;q=0.9",
      },
    });
    if (response.ok) return response;
    lastFailure = `HTTP ${response.status}`;
    if (![429, 503].includes(response.status)) break;
    await wait(2 ** attempt * 2_000);
  }
  throw new Error(lastFailure);
};

const robotsAllowsPlayerPages = async () => {
  const response = await fetchTextWithBackoff(ROBOTS_URL);
  const contentType = response.headers.get("content-type") ?? "";
  const body = await response.text();
  if (
    !contentType.toLowerCase().includes("text/plain") ||
    isFbrefChallengePage(body)
  ) {
    throw new Error(
      "FBref robots policy could not be read without an access challenge",
    );
  }
  const globalBlock = body
    .split(/\n/)
    .map((line) => line.trim())
    .some((line) => /^disallow:\s*\/en\/players\b/i.test(line));
  if (globalBlock) {
    throw new Error("FBref robots policy disallows player profile imports");
  }
};

const main = async () => {
  const refresh = process.argv.includes("--refresh");
  const accessedOn = new Date().toISOString().slice(0, 10);
  const mappings = await readJson<FbrefPlayerMapping[]>(MAPPING_FILE);
  const curation = await readJson<CareerCuration>(CURATION_FILE);
  const uniquePlayers = [
    ...new Map(
      players.map((player) => [
        player.playerIdentityId,
        {
          playerIdentityId: player.playerIdentityId,
          playerName: player.playerName,
        },
      ]),
    ).values(),
  ];
  const knownIdentityIds = new Set(
    uniquePlayers.map((player) => player.playerIdentityId),
  );
  const mappingByIdentityId = new Map(
    mappings.map((mapping) => [mapping.playerIdentityId, mapping]),
  );
  const parsedByIdentityId = new Map<string, ParsedFbrefPlayer>();
  const unresolved: Array<{
    playerIdentityId: string;
    playerName: string;
    sourceUrl?: string;
    reason: string;
  }> = [];
  let networkBlockedReason: string | null = null;
  let lastRequestAt = 0;

  if (refresh) {
    try {
      await robotsAllowsPlayerPages();
    } catch (error) {
      networkBlockedReason =
        error instanceof Error ? error.message : "FBref policy check failed";
    }
  }

  for (const player of uniquePlayers) {
    const mapping = mappingByIdentityId.get(player.playerIdentityId);
    if (!mapping) {
      unresolved.push({
        ...player,
        reason: "No reviewed FBref identity mapping is stored.",
      });
      continue;
    }
    const cacheFile = path.join(
      CACHE_DIRECTORY,
      `${mapping.playerIdentityId}.html`,
    );
    try {
      let html = existsSync(cacheFile)
        ? await readFile(cacheFile, "utf8")
        : null;
      if (!html && refresh && !networkBlockedReason) {
        const remainingDelay =
          RATE_LIMIT_MS - (Date.now() - lastRequestAt);
        if (remainingDelay > 0) await wait(remainingDelay);
        lastRequestAt = Date.now();
        const response = await fetchTextWithBackoff(mapping.sourceUrl);
        html = await response.text();
        if (isFbrefChallengePage(html)) {
          throw new Error("FBref returned an access challenge");
        }
        await mkdir(CACHE_DIRECTORY, { recursive: true });
        await writeFile(cacheFile, html);
      }
      if (!html) {
        throw new Error(
          networkBlockedReason ??
            "No cached page is available; rerun with --refresh when permitted",
        );
      }
      parsedByIdentityId.set(
        player.playerIdentityId,
        parseFbrefPlayerPage(html, mapping, accessedOn),
      );
    } catch (error) {
      unresolved.push({
        ...player,
        sourceUrl: mapping.sourceUrl,
        reason: error instanceof Error ? error.message : "Unknown import error",
      });
    }
  }

  const top100Ids = new Set(curation.top100.identityIds);
  const outputIdentityIds = new Set([
    ...top100Ids,
    ...Object.keys(curation.supplementaryAccolades),
    ...parsedByIdentityId.keys(),
  ]);
  const outputPlayers = Object.fromEntries(
    [...outputIdentityIds]
      .sort()
      .filter((identityId) => knownIdentityIds.has(identityId))
      .map((identityId) => {
        const imported = parsedByIdentityId.get(identityId);
        const supplementary =
          curation.supplementaryAccolades[identityId] ?? [];
        const top100Player = top100Ids.has(identityId);
        return [
          identityId,
          {
            careerStats: imported?.careerStats ?? null,
            accolades: dedupeAccolades([
              ...supplementary,
              ...(imported?.accolades ?? []),
            ]).filter(
              (accolade) =>
                accolade.verified &&
                Boolean(accolade.label.trim()) &&
                (accolade.count === undefined || accolade.count > 0),
            ),
            top100Player,
            ...(top100Player
              ? { top100Source: curation.top100.source }
              : {}),
          },
        ];
      }),
  );
  const duplicateMappingIds =
    mappings.length - new Set(mappings.map((mapping) => mapping.playerIdentityId)).size;
  const importedAccoladeCount = [...parsedByIdentityId.values()].reduce(
    (total, record) => total + record.accolades.length,
    0,
  );
  const generatedAt = new Date().toISOString();

  await writeJson(OUTPUT_FILE, {
    version: 1,
    generatedAt,
    players: outputPlayers,
  });
  await writeJson(REPORT_FILE, {
    generatedAt,
    mode: refresh ? "refresh" : "cache-only",
    networkBlockedReason,
    totalPlayerIdentities: uniquePlayers.length,
    reviewedMappings: mappings.length,
    matchedPlayers: parsedByIdentityId.size,
    manualReviewPlayers: unresolved.length,
    importedAccolades: importedAccoladeCount,
    supplementaryAccolades: Object.values(
      curation.supplementaryAccolades,
    ).flat().length,
    curatedTop100Players: top100Ids.size,
    validation: {
      duplicateMappingIds,
      duplicateOutputIdentityIds:
        Object.keys(outputPlayers).length -
        new Set(Object.keys(outputPlayers)).size,
    },
    matched: [...parsedByIdentityId.values()].map((record) => ({
      playerIdentityId: record.playerIdentityId,
      sourceUrl: record.careerStats.sourceUrl,
      accoladeCount: record.accolades.length,
    })),
    unresolved,
  });

  console.log("FBref player-data import summary");
  console.log(`Mode: ${refresh ? "refresh" : "cache-only"}`);
  console.log(`Matched: ${parsedByIdentityId.size}`);
  console.log(`Manual review: ${unresolved.length}`);
  console.log(`Imported accolades: ${importedAccoladeCount}`);
  console.log(
    `Supplementary verified accolades: ${Object.values(
      curation.supplementaryAccolades,
    ).flat().length}`,
  );
  if (networkBlockedReason) console.log(`Network blocked: ${networkBlockedReason}`);
};

void main();
