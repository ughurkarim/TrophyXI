import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import historicalJson from "../src/data/player-tournaments.generated.json";
import { players } from "../src/data/players";
import existingMapJson from "../data/sources/fbref/player-map.json";

type CsvRow = Record<string, string>;
type HistoricalArchive = {
  identities: Record<string, Array<{ playerId: string }>>;
};
type FbrefMapping = {
  playerIdentityId: string;
  playerName: string;
  fbrefProfileName?: string;
  fbrefId: string;
  sourceUrl: string;
};
type WikipediaQuery = {
  query?: {
    normalized?: Array<{ from: string; to: string }>;
    redirects?: Array<{ from: string; to: string }>;
    pages?: Array<{
      title: string;
      missing?: boolean;
      pageprops?: { wikibase_item?: string };
    }>;
  };
};
type WikidataQuery = {
  entities?: Record<
    string,
    {
      claims?: {
        P5750?: Array<{
          mainsnak?: { datavalue?: { value?: unknown } };
        }>;
      };
    }
  >;
};

const ROOT = process.cwd();
const SOURCE_FILE = path.join(
  ROOT,
  "data",
  "sources",
  "fjelstul-world-cup",
  "players.csv",
);
const OUTPUT_FILE = path.join(
  ROOT,
  "data",
  "sources",
  "fbref",
  "player-map.json",
);
const REPORT_FILE = path.join(
  ROOT,
  "reports",
  "fbref-player-map-report.json",
);
const CACHE_DIRECTORY = path.join(
  ROOT,
  "scripts",
  "cache",
  "fbref-player-map",
);
const historical = historicalJson as unknown as HistoricalArchive;
const existingMap = existingMapJson as FbrefMapping[];
const REQUEST_DELAY_MS = 3_000;
let nextRequestAt = 0;

const wait = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const parseCsv = (value: string): CsvRow[] => {
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
  const [headers, ...records] = rows;
  return records.map((record) =>
    Object.fromEntries(
      headers.map((header, index) => [header, record[index] ?? ""]),
    ),
  );
};

const chunksOf = <T>(values: T[], size: number) =>
  Array.from({ length: Math.ceil(values.length / size) }, (_, index) =>
    values.slice(index * size, (index + 1) * size),
  );

const sourceSlugFor = (playerName: string) =>
  playerName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const wikipediaTitleFor = (url: string) =>
  URL.canParse(url)
    ? decodeURIComponent(new URL(url).pathname.replace(/^\/wiki\//, ""))
    : undefined;

const resolveAlias = (title: string, aliases: Map<string, string>) => {
  let resolved = title;
  for (let index = 0; index < 6; index += 1) {
    const next = aliases.get(resolved);
    if (!next || next === resolved) break;
    resolved = next;
  }
  return resolved;
};

const fetchJson = async <T>(url: URL): Promise<T> => {
  const cacheFile = path.join(
    CACHE_DIRECTORY,
    `${createHash("sha256").update(url.toString()).digest("hex")}.json`,
  );
  if (existsSync(cacheFile)) {
    return JSON.parse(await readFile(cacheFile, "utf8")) as T;
  }
  const delay = Math.max(0, nextRequestAt - Date.now());
  if (delay > 0) await wait(delay);
  nextRequestAt = Date.now() + REQUEST_DELAY_MS;
  let lastError: unknown;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent":
            "TrophyXI/1.0 (identity-safe FBref mapping through public Wikidata identifiers)",
        },
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "0");
        if (retryAfter > 0) {
          await wait(Math.min(60_000, retryAfter * 1_000));
        }
        throw new Error(`${url.hostname} returned HTTP ${response.status}`);
      }
      const body = await response.text();
      await writeFile(cacheFile, body);
      return JSON.parse(body) as T;
    } catch (error) {
      lastError = error;
      if (attempt < 4) await wait(500 * 2 ** (attempt - 1));
    }
  }
  throw lastError;
};

const main = async () => {
  await mkdir(CACHE_DIRECTORY, { recursive: true });
  await mkdir(path.dirname(REPORT_FILE), { recursive: true });
  const sourceById = new Map(
    parseCsv(await readFile(SOURCE_FILE, "utf8")).map((row) => [
      row.player_id,
      row,
    ]),
  );
  const activePlayers = [
    ...new Map(
      players.map((player) => [
        player.playerIdentityId,
        {
          playerIdentityId: player.playerIdentityId,
          playerName: player.playerName,
        },
      ]),
    ).values(),
  ].sort((first, second) =>
    first.playerIdentityId.localeCompare(second.playerIdentityId),
  );
  const existingByIdentity = new Map(
    existingMap.map((mapping) => [mapping.playerIdentityId, mapping]),
  );
  const wikipediaByIdentity = new Map<string, string>();
  for (const player of activePlayers) {
    const sourceId = historical.identities[player.playerIdentityId]?.[0]?.playerId;
    const url = sourceId
      ? sourceById.get(sourceId)?.player_wikipedia_link
      : undefined;
    if (url && wikipediaTitleFor(url)) {
      wikipediaByIdentity.set(player.playerIdentityId, url);
    }
  }

  const identitiesByTitle = new Map<string, string[]>();
  for (const [identityId, url] of wikipediaByIdentity) {
    if (existingByIdentity.has(identityId)) continue;
    const title = wikipediaTitleFor(url)!;
    identitiesByTitle.set(title, [
      ...(identitiesByTitle.get(title) ?? []),
      identityId,
    ]);
  }
  const wikidataByIdentity = new Map<string, string>();
  let wikipediaChunk = 0;
  for (const titles of chunksOf([...identitiesByTitle.keys()], 40)) {
    const url = new URL("https://en.wikipedia.org/w/api.php");
    url.search = new URLSearchParams({
      action: "query",
      format: "json",
      formatversion: "2",
      prop: "pageprops",
      redirects: "1",
      titles: titles.join("|"),
    }).toString();
    const data = await fetchJson<WikipediaQuery>(url);
    const aliases = new Map<string, string>();
    for (const alias of data.query?.normalized ?? []) {
      aliases.set(alias.from, alias.to);
    }
    for (const alias of data.query?.redirects ?? []) {
      aliases.set(alias.from, alias.to);
    }
    const pageByTitle = new Map(
      (data.query?.pages ?? []).map((page) => [page.title, page]),
    );
    for (const title of titles) {
      const item = pageByTitle.get(resolveAlias(title, aliases))?.pageprops
        ?.wikibase_item;
      if (!item) continue;
      for (const identityId of identitiesByTitle.get(title) ?? []) {
        wikidataByIdentity.set(identityId, item);
      }
    }
    wikipediaChunk += 1;
    if (wikipediaChunk % 25 === 0) {
      console.log(
        `Resolved Wikipedia identities: ${wikipediaChunk * 40}/${identitiesByTitle.size}.`,
      );
    }
  }

  const identitiesByItem = new Map<string, string[]>();
  for (const [identityId, item] of wikidataByIdentity) {
    identitiesByItem.set(item, [
      ...(identitiesByItem.get(item) ?? []),
      identityId,
    ]);
  }
  const generatedFbrefByIdentity = new Map<string, string>();
  for (const items of chunksOf([...identitiesByItem.keys()], 40)) {
    const url = new URL("https://www.wikidata.org/w/api.php");
    url.search = new URLSearchParams({
      action: "wbgetentities",
      format: "json",
      props: "claims",
      ids: items.join("|"),
    }).toString();
    const data = await fetchJson<WikidataQuery>(url);
    for (const item of items) {
      const value =
        data.entities?.[item]?.claims?.P5750?.[0]?.mainsnak?.datavalue?.value;
      if (typeof value !== "string" || !/^[a-f0-9]{8}$/i.test(value)) {
        continue;
      }
      for (const identityId of identitiesByItem.get(item) ?? []) {
        generatedFbrefByIdentity.set(identityId, value);
      }
    }
  }

  const mappings: FbrefMapping[] = [];
  const unresolved: Array<Record<string, string>> = [];
  for (const player of activePlayers) {
    const existing = existingByIdentity.get(player.playerIdentityId);
    const fbrefId =
      existing?.fbrefId ??
      generatedFbrefByIdentity.get(player.playerIdentityId);
    if (!fbrefId) {
      unresolved.push({
        ...player,
        reason: wikipediaByIdentity.has(player.playerIdentityId)
          ? "Reviewed Wikipedia identity has no FBref ID in Wikidata"
          : "No reviewed encyclopedia identity link is available",
      });
      continue;
    }
    mappings.push({
      ...player,
      ...(existing?.fbrefProfileName
        ? { fbrefProfileName: existing.fbrefProfileName }
        : {}),
      fbrefId,
      sourceUrl:
        existing?.sourceUrl ??
        `https://fbref.com/en/players/${fbrefId}/${sourceSlugFor(
          player.playerName,
        )}`,
    });
  }

  const identitiesByFbrefId = new Map<string, string[]>();
  for (const mapping of mappings) {
    identitiesByFbrefId.set(mapping.fbrefId, [
      ...(identitiesByFbrefId.get(mapping.fbrefId) ?? []),
      mapping.playerIdentityId,
    ]);
  }
  const collisions = [...identitiesByFbrefId]
    .filter(([, identityIds]) => identityIds.length > 1)
    .map(([fbrefId, identityIds]) => ({ fbrefId, identityIds }));
  if (collisions.length > 0) {
    throw new Error(
      `FBref ID collision across Trophy XI identities: ${JSON.stringify(collisions)}`,
    );
  }
  await writeFile(OUTPUT_FILE, `${JSON.stringify(mappings, null, 2)}\n`);
  await writeFile(
    REPORT_FILE,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        method:
          "Reviewed Fjelstul Wikipedia link → Wikidata item → FBref ID property P5750; recovered reviewed mappings win.",
        targetIdentities: activePlayers.length,
        mappedIdentities: mappings.length,
        newlyMappedIdentities: mappings.length - existingMap.length,
        unresolvedIdentities: unresolved.length,
        collisions,
        unresolved,
      },
      null,
      2,
    )}\n`,
  );
  console.log(
    `FBref map: ${mappings.length}/${activePlayers.length} identities (${mappings.length - existingMap.length} newly resolved).`,
  );
};

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
