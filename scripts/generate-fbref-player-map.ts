import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { players } from "../src/data/players";
import type { FbrefPlayerMapping } from "../src/lib/importers/fbref";
import type { FbrefPortraitMapping } from "../src/lib/importers/fbref-portrait";

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
const PORTRAIT_MAPPING_FILE = path.join(
  ROOT,
  "scripts",
  "fbref-portrait-map.json",
);
const EXISTING_MAPPING_FILE = path.join(
  ROOT,
  "scripts",
  "fbref-player-map.json",
);
const OVERRIDES_FILE = path.join(
  ROOT,
  "scripts",
  "fbref-player-overrides.json",
);
const OUTPUT_FILE = EXISTING_MAPPING_FILE;
const REPORT_FILE = path.join(
  ROOT,
  "scripts",
  "reports",
  "fbref-player-map-report.json",
);
const REQUEST_DELAY_MS = 250;

type CsvRow = Record<string, string>;
type TournamentArchive = {
  identities: Record<string, { playerId: string; tournamentYear: number }[]>;
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
        "TrophyXI/1.0 (reviewed identity mapping for permissioned FBref player records)",
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
  const [csv, archiveText, portraitText, existingText, overridesText] =
    await Promise.all([
    readFile(FJELSTUL_PLAYERS_FILE, "utf8"),
    readFile(TOURNAMENT_ARCHIVE_FILE, "utf8"),
    readFile(PORTRAIT_MAPPING_FILE, "utf8"),
    readFile(EXISTING_MAPPING_FILE, "utf8"),
    readFile(OVERRIDES_FILE, "utf8"),
  ]);
  const archive = JSON.parse(archiveText) as TournamentArchive;
  const portraitMappings = JSON.parse(
    portraitText,
  ) as FbrefPortraitMapping[];
  const existingMappings = JSON.parse(existingText) as FbrefPlayerMapping[];
  const overrides = JSON.parse(overridesText) as FbrefPlayerMapping[];
  const existingByIdentity = new Map<string, FbrefPlayerMapping>();
  for (const mapping of portraitMappings) {
    existingByIdentity.set(mapping.playerIdentityId, {
      playerIdentityId: mapping.playerIdentityId,
      playerName: mapping.playerName,
      fbrefId: mapping.fbrefId,
      sourceUrl: mapping.sourcePage,
    });
  }
  for (const mapping of existingMappings) {
    existingByIdentity.set(mapping.playerIdentityId, mapping);
  }
  for (const mapping of overrides) {
    existingByIdentity.set(mapping.playerIdentityId, mapping);
  }

  const fjelstulById = new Map(
    parseCsv(csv).map((row) => [row.player_id, row]),
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
  const wikipediaByIdentity = new Map<string, string>();
  for (const player of activePlayers) {
    const playerId =
      archive.identities[player.playerIdentityId]?.[0]?.playerId;
    const row = playerId ? fjelstulById.get(playerId) : undefined;
    if (row?.player_wikipedia_link) {
      wikipediaByIdentity.set(
        player.playerIdentityId,
        row.player_wikipedia_link,
      );
    }
  }

  const identitiesByTitle = new Map<string, string[]>();
  for (const [identityId, wikipediaPage] of wikipediaByIdentity) {
    if (existingByIdentity.has(identityId)) continue;
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

  const mappings: FbrefPlayerMapping[] = [];
  const unresolved: Array<{
    playerIdentityId: string;
    playerName: string;
    reason: string;
  }> = [];
  for (const player of activePlayers) {
    const existing = existingByIdentity.get(player.playerIdentityId);
    const fbrefId =
      existing?.fbrefId ?? fbrefByIdentity.get(player.playerIdentityId);
    if (!fbrefId) {
      unresolved.push({
        ...player,
        reason: wikipediaByIdentity.has(player.playerIdentityId)
          ? "Wikidata item has no FBref ID (P5750)"
          : "Tournament source has no reviewed Wikipedia identity link",
      });
      continue;
    }
    mappings.push({
      playerIdentityId: player.playerIdentityId,
      playerName: player.playerName,
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

  const generatedAt = new Date().toISOString();
  await writeFile(OUTPUT_FILE, `${JSON.stringify(mappings, null, 2)}\n`);
  await writeFile(
    REPORT_FILE,
    `${JSON.stringify(
      {
        generatedAt,
        method:
          "Active tournament identity → Fjelstul reviewed Wikipedia link → Wikidata item → FBref ID property P5750; existing reviewed career and portrait mappings win.",
        targetIdentities: activePlayers.length,
        mappedIdentities: mappings.length,
        unresolvedIdentities: unresolved.length,
        unresolved,
      },
      null,
      2,
    )}\n`,
  );
  console.log(
    `Mapped ${mappings.length}/${activePlayers.length} active identities to FBref.`,
  );
};

void main();
