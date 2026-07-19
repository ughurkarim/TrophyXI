import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { players } from "../src/data/players";
import {
  validateFbrefPortraitMapping,
  type FbrefPortraitMapping,
} from "../src/lib/importers/fbref-portrait";

const ROOT = process.cwd();
const FJELSTUL_PLAYERS_FILE = path.join(
  ROOT,
  "data",
  "sources",
  "fjelstul-world-cup",
  "players.csv",
);
const TOURNAMENT_ARCHIVE_FILE = path.join(
  ROOT,
  "src",
  "data",
  "player-tournaments.generated.json",
);
const OVERRIDES_FILE = path.join(
  ROOT,
  "scripts",
  "fbref-portrait-overrides.json",
);
const OUTPUT_FILE = path.join(ROOT, "scripts", "fbref-portrait-map.json");
const REPORT_FILE = path.join(
  ROOT,
  "scripts",
  "reports",
  "fbref-portrait-map-report.json",
);
const REQUEST_DELAY_MS = 250;

type CsvRow = Record<string, string>;
type TournamentArchive = {
  identities: Record<string, { playerId: string; tournamentYear: number }[]>;
};
type Override = {
  playerIdentityId: string;
  fbrefId: string;
  sourcePage: string;
};
type WikipediaQuery = {
  query?: {
    normalized?: { from: string; to: string }[];
    redirects?: { from: string; to: string }[];
    pages?: {
      title: string;
      missing?: boolean;
      pageprops?: { wikibase_item?: string };
    }[];
  };
};
type WikidataQuery = {
  entities?: Record<
    string,
    {
      claims?: {
        P5750?: {
          mainsnak?: { datavalue?: { value?: unknown } };
        }[];
      };
    }
  >;
};

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

const fetchJson = async <T>(url: URL): Promise<T> => {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "TrophyXI/1.0 (identity mapping for permissioned FBref portrait archive)",
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    throw new Error(`${url.hostname} returned HTTP ${response.status}`);
  }
  return (await response.json()) as T;
};

const chunksOf = <T>(values: readonly T[], size: number) =>
  Array.from({ length: Math.ceil(values.length / size) }, (_, index) =>
    values.slice(index * size, (index + 1) * size),
  );

const wikipediaTitleFor = (url: string) => {
  const parsed = new URL(url);
  return decodeURIComponent(parsed.pathname.replace(/^\/wiki\//, ""));
};

const sourceSlugFor = (playerName: string) =>
  playerName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const main = async () => {
  const [csv, archiveText, overrideText] = await Promise.all([
    readFile(FJELSTUL_PLAYERS_FILE, "utf8"),
    readFile(TOURNAMENT_ARCHIVE_FILE, "utf8"),
    existsSync(OVERRIDES_FILE)
      ? readFile(OVERRIDES_FILE, "utf8")
      : Promise.resolve("[]"),
  ]);
  const archive = JSON.parse(archiveText) as TournamentArchive;
  const overrides = JSON.parse(overrideText) as Override[];
  const overrideByIdentity = new Map(
    overrides.map((override) => [override.playerIdentityId, override]),
  );
  const fjelstulById = new Map(
    parseCsv(csv).map((row) => [row.player_id, row]),
  );
  const historicalPlayers = players.filter(
    (player) => player.tournamentYear <= 2002,
  );
  const targetIdentityIds = [
    ...new Set(historicalPlayers.map((player) => player.playerIdentityId)),
  ].sort();
  const playerNameByIdentity = new Map(
    historicalPlayers.map((player) => [
      player.playerIdentityId,
      player.playerName,
    ]),
  );
  const wikipediaByIdentity = new Map<string, string>();
  for (const identityId of targetIdentityIds) {
    const playerId = archive.identities[identityId]?.[0]?.playerId;
    const row = playerId ? fjelstulById.get(playerId) : undefined;
    if (row?.player_wikipedia_link) {
      wikipediaByIdentity.set(identityId, row.player_wikipedia_link);
    }
  }

  const identitiesByTitle = new Map<string, string[]>();
  for (const [identityId, wikipediaPage] of wikipediaByIdentity) {
    const title = wikipediaTitleFor(wikipediaPage);
    identitiesByTitle.set(title, [
      ...(identitiesByTitle.get(title) ?? []),
      identityId,
    ]);
  }
  const wikidataByIdentity = new Map<string, string>();
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
    for (const normalized of data.query?.normalized ?? []) {
      aliases.set(normalized.from, normalized.to);
    }
    for (const redirect of data.query?.redirects ?? []) {
      aliases.set(redirect.from, redirect.to);
    }
    const pageByTitle = new Map(
      (data.query?.pages ?? []).map((page) => [page.title, page]),
    );
    const resolveTitle = (title: string) => {
      let resolved = title;
      for (let index = 0; index < 4; index += 1) {
        const next = aliases.get(resolved);
        if (!next || next === resolved) break;
        resolved = next;
      }
      return resolved;
    };
    for (const title of titles) {
      const item = pageByTitle.get(resolveTitle(title))?.pageprops
        ?.wikibase_item;
      if (!item) continue;
      for (const identityId of identitiesByTitle.get(title) ?? []) {
        wikidataByIdentity.set(identityId, item);
      }
    }
    await wait(REQUEST_DELAY_MS);
  }

  const identitiesByWikidata = new Map<string, string[]>();
  for (const [identityId, item] of wikidataByIdentity) {
    identitiesByWikidata.set(item, [
      ...(identitiesByWikidata.get(item) ?? []),
      identityId,
    ]);
  }
  const fbrefByIdentity = new Map<string, string>();
  for (const items of chunksOf([...identitiesByWikidata.keys()], 40)) {
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
        data.entities?.[item]?.claims?.P5750?.[0]?.mainsnak?.datavalue
          ?.value;
      if (typeof value !== "string" || !/^[a-f0-9]{8}$/i.test(value)) {
        continue;
      }
      for (const identityId of identitiesByWikidata.get(item) ?? []) {
        fbrefByIdentity.set(identityId, value);
      }
    }
    await wait(REQUEST_DELAY_MS);
  }

  const mappings: FbrefPortraitMapping[] = [];
  const unresolved: {
    playerIdentityId: string;
    playerName: string;
    reason: string;
  }[] = [];
  for (const identityId of targetIdentityIds) {
    const playerName = playerNameByIdentity.get(identityId)!;
    const wikipediaPage = wikipediaByIdentity.get(identityId);
    const wikidataItem = wikidataByIdentity.get(identityId);
    const override = overrideByIdentity.get(identityId);
    const fbrefId = override?.fbrefId ?? fbrefByIdentity.get(identityId);
    if (!wikipediaPage || !wikidataItem || !fbrefId) {
      unresolved.push({
        playerIdentityId: identityId,
        playerName,
        reason: !wikipediaPage
          ? "Fjelstul identity has no Wikipedia link"
          : !wikidataItem
            ? "Wikipedia page has no Wikidata item"
            : "Wikidata item has no FBref ID (P5750)",
      });
      continue;
    }
    const mapping: FbrefPortraitMapping = {
      playerIdentityId: identityId,
      playerName,
      fbrefId,
      sourcePage:
        override?.sourcePage ??
        `https://fbref.com/en/players/${fbrefId}/${sourceSlugFor(playerName)}`,
      wikipediaPage,
      wikidataItem,
    };
    const errors = validateFbrefPortraitMapping(
      mapping,
      new Set(targetIdentityIds),
    );
    if (errors.length > 0) {
      unresolved.push({
        playerIdentityId: identityId,
        playerName,
        reason: errors.join("; "),
      });
      continue;
    }
    mappings.push(mapping);
  }
  mappings.sort((first, second) =>
    first.playerIdentityId.localeCompare(second.playerIdentityId),
  );
  const generatedAt = new Date().toISOString();
  await writeFile(OUTPUT_FILE, `${JSON.stringify(mappings, null, 2)}\n`);
  await writeFile(
    REPORT_FILE,
    `${JSON.stringify(
      {
        generatedAt,
        method:
          "Fjelstul player ID → reviewed Wikipedia link → Wikidata item → FBref ID property P5750; explicit overrides win.",
        targetHistoricalIdentities: targetIdentityIds.length,
        mappedIdentities: mappings.length,
        unresolvedIdentities: unresolved.length,
        unresolved,
      },
      null,
      2,
    )}\n`,
  );
  console.log(
    `Mapped ${mappings.length}/${targetIdentityIds.length} pre-2003 identities to FBref.`,
  );
};

void main();
