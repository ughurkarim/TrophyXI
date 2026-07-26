import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import requestedIdentityJson from "../src/data/requested-player-identities.generated.json";
import type { Position } from "../src/types/game";

const ROOT = process.cwd();
const SOURCE_DIRECTORY = path.join(
  ROOT,
  "data",
  "sources",
  "fjelstul-world-cup",
);
const OUTPUT_FILE = path.join(
  ROOT,
  "src",
  "data",
  "player-tournaments.generated.json",
);
const SUPPORTED_YEARS = new Set([
  1970, 1974, 1978, 1982, 1986, 1990, 1994, 1998, 2002, 2006, 2010, 2014,
  2018, 2022,
]);

type CsvRow = Record<string, string>;

type GeneratedTournament = {
  playerId: string;
  playerName: string;
  tournamentYear: number;
  teamCode: string;
  teamName: string;
  teamPerformance: string;
  appearances: number;
  starts: number;
  goals: number;
  primaryPosition: Position;
  eligiblePositions: Position[];
  awards: {
    id: string;
    label: string;
    shared: boolean;
  }[];
};

type GeneratedArchive = {
  version: 2;
  generatedAt: string;
  source: {
    name: string;
    version: string;
    url: string;
    license: string;
    licenseUrl: string;
    accessedOn: string;
    modifications: string;
  };
  identities: Record<string, GeneratedTournament[]>;
  unresolvedIdentityIds: string[];
};

type RequestedIdentityArchive = {
  identities: {
    identityId: string;
    playerId: string;
    playerName: string;
    countryCode: string;
    referenceYear: number;
    primaryPosition: Position;
  }[];
};

const requestedIdentities = (
  requestedIdentityJson as unknown as RequestedIdentityArchive
).identities;

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

const normalizeName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const playerNameFor = (row: CsvRow) =>
  row.given_name === "not applicable"
    ? row.family_name
    : `${row.given_name} ${row.family_name}`;

const projectCodeFor = (code: string) =>
  (
    {
      BGR: "BUL",
      CHL: "CHI",
      CRI: "CRC",
      DEU: "GER",
      DNK: "DEN",
      DZA: "ALG",
      HRV: "CRO",
      HTI: "HAI",
      NLD: "NED",
      PRY: "PAR",
      PRT: "POR",
      SAU: "KSA",
      URY: "URU",
      CHE: "SUI",
      ZAF: "RSA",
      CIV: "CIV",
      KOR: "KOR",
    } as Record<string, string>
  )[code] ?? code;

const mappedPosition = (
  rawCode: string,
  fallback: Position = "CM",
): Position => {
  const position = (
    {
      GK: "GK",
      LB: "LB",
      LWB: "LWB",
      RB: "RB",
      RWB: "RWB",
      CB: "CB",
      SW: "CB",
      DM: "DM",
      CM: "CM",
      AM: "AM",
      LM: "LM",
      RM: "RM",
      LW: "LW",
      LF: "LW",
      RW: "RW",
      RF: "RW",
      CF: "CF",
      SS: "CF",
      ST: "ST",
    } as Record<string, Position>
  )[rawCode];
  if (position) return position;
  if (rawCode === "DF" && ["GK", "DM", "CM", "AM", "LM", "RM", "LW", "RW", "CF", "ST"].includes(fallback)) {
    return "CB";
  }
  if (rawCode === "MF" && ["GK", "LB", "LCB", "CB", "RCB", "RB", "LWB", "RWB", "LW", "RW", "CF", "ST"].includes(fallback)) {
    return "CM";
  }
  if (rawCode === "FW" && !["LW", "RW", "CF", "ST"].includes(fallback)) {
    return "ST";
  }
  return fallback;
};

const readRows = async (name: string) =>
  parseCsv(
    await readFile(path.join(SOURCE_DIRECTORY, `${name}.csv`), "utf8"),
  );

// Reviewed source-row aliases where Fjelstul split one real player across
// different player IDs/name forms. The FBref identifier independently confirms
// each pair as one person; keeping the preferred public identity prevents
// duplicate draft identities without merging name-only collisions.
const reviewedIdentityAliases = new Map([
  ["P-73110", "hussein-abdulghani"],
  ["P-77199", "hussein-abdulghani"],
  ["P-71995", "nelson-haedo-valdez"],
  ["P-50699", "nelson-haedo-valdez"],
]);

const main = async () => {
  const [squads, appearances, goals, awards, qualifiedTeams] = await Promise.all([
    readRows("squads"),
    readRows("player_appearances"),
    readRows("goals"),
    readRows("award_winners"),
    readRows("qualified_teams"),
  ]);
  const appearancesByPlayer = new Map<string, CsvRow[]>();
  for (const row of appearances) {
    const year = Number(row.tournament_id.replace("WC-", ""));
    if (!SUPPORTED_YEARS.has(year)) continue;
    const existing = appearancesByPlayer.get(row.player_id) ?? [];
    existing.push(row);
    appearancesByPlayer.set(row.player_id, existing);
  }
  const supportedSquads = squads.filter((row) =>
    SUPPORTED_YEARS.has(Number(row.tournament_id.replace("WC-", ""))),
  );
  const existingArchive = existsSync(OUTPUT_FILE)
    ? (JSON.parse(await readFile(OUTPUT_FILE, "utf8")) as GeneratedArchive)
    : undefined;
  const identityByPlayerId = new Map<string, string>();
  for (const [identityId, tournaments] of Object.entries(
    existingArchive?.identities ?? {},
  )) {
    for (const tournament of tournaments) {
      identityByPlayerId.set(tournament.playerId, identityId);
    }
  }
  for (const requested of requestedIdentities) {
    identityByPlayerId.set(requested.playerId, requested.identityId);
  }
  for (const [playerId, identityId] of reviewedIdentityAliases) {
    identityByPlayerId.set(playerId, identityId);
  }
  const squadRowsByPlayerId = new Map<string, CsvRow[]>();
  for (const row of supportedSquads) {
    squadRowsByPlayerId.set(row.player_id, [
      ...(squadRowsByPlayerId.get(row.player_id) ?? []),
      row,
    ]);
  }
  const claimedIdentityIds = new Map(
    [...identityByPlayerId].map(([playerId, identityId]) => [
      identityId,
      playerId,
    ]),
  );
  for (const [playerId, playerSquads] of [...squadRowsByPlayerId].sort(
    ([first], [second]) => first.localeCompare(second),
  )) {
    if (identityByPlayerId.has(playerId)) continue;
    const baseIdentityId = normalizeName(playerNameFor(playerSquads[0]));
    const claimedBy = claimedIdentityIds.get(baseIdentityId);
    const identityId =
      claimedBy && claimedBy !== playerId
        ? `${baseIdentityId}-${playerId.toLocaleLowerCase()}`
        : baseIdentityId;
    identityByPlayerId.set(playerId, identityId);
    claimedIdentityIds.set(identityId, playerId);
  }
  const output: GeneratedArchive["identities"] = {};
  for (const [playerId, playerSquads] of [...squadRowsByPlayerId].sort(
    ([first], [second]) => first.localeCompare(second),
  )) {
    const identityId = identityByPlayerId.get(playerId);
    if (!identityId) throw new Error(`${playerId}: identity was not assigned`);
    const playerAppearances = appearancesByPlayer.get(playerId) ?? [];
    const years = [
      ...new Set(
        playerSquads.map((row) =>
          Number(row.tournament_id.replace("WC-", "")),
        ),
      ),
    ]
      .filter((year) => SUPPORTED_YEARS.has(year))
      .sort((first, second) => first - second);
    const tournamentRecords = years.map((tournamentYear) => {
      const rows = playerAppearances.filter(
        (row) =>
          Number(row.tournament_id.replace("WC-", "")) === tournamentYear,
      );
      const squadRow = playerSquads.find(
        (row) =>
          Number(row.tournament_id.replace("WC-", "")) === tournamentYear,
      );
      if (!squadRow) {
        throw new Error(`${identityId}: missing ${tournamentYear} squad row`);
      }
      const fallbackPosition = mappedPosition(squadRow.position_code);
      const positionCounts = new Map<Position, number>();
      for (const row of rows) {
        const position = mappedPosition(
          row.position_code,
          fallbackPosition,
        );
        positionCounts.set(position, (positionCounts.get(position) ?? 0) + 1);
      }
      const rankedPositions = [...positionCounts.entries()].sort(
        (first, second) => second[1] - first[1],
      );
      const primaryPosition =
        rankedPositions[0]?.[0] ??
        fallbackPosition;
      const eligiblePositions = [
        primaryPosition,
        ...rankedPositions.slice(1).map(([position]) => position),
      ].filter(
        (position, index, all) =>
          all.indexOf(position) === index &&
          (primaryPosition === "GK"
            ? position === "GK"
            : position !== "GK"),
      );
      return {
        playerId,
        playerName: playerNameFor(squadRow),
        tournamentYear,
        teamCode: projectCodeFor(squadRow.team_code),
        teamName: squadRow.team_name,
        teamPerformance:
          qualifiedTeams.find(
            (row) =>
              Number(row.tournament_id.replace("WC-", "")) ===
                tournamentYear && row.team_id === squadRow.team_id,
          )?.performance ?? "not sourced",
        appearances: new Set(rows.map((row) => row.match_id)).size,
        starts: rows.filter((row) => row.starter === "1").length,
        goals: goals.filter(
          (row) =>
            row.player_id === playerId &&
            Number(row.tournament_id.replace("WC-", "")) === tournamentYear &&
            row.own_goal !== "1",
        ).length,
        primaryPosition,
        eligiblePositions,
        awards: awards
          .filter(
            (row) =>
              row.player_id === playerId &&
              Number(row.tournament_id.replace("WC-", "")) ===
                tournamentYear,
          )
          .map((row) => ({
            id: row.award_id,
            label: row.award_name,
            shared: row.shared === "1",
          })),
      };
    });
    output[identityId] = [
      ...(output[identityId] ?? []),
      ...tournamentRecords,
    ].sort(
      (first, second) =>
        first.tournamentYear - second.tournamentYear ||
        first.playerId.localeCompare(second.playerId),
    );
  }

  const generated: GeneratedArchive = {
    version: 2,
    generatedAt: new Date().toISOString(),
    source: {
      name: "The Fjelstul World Cup Database",
      version: "1.2.0",
      url: "https://github.com/jfjelstul/worldcup",
      license: "CC BY-SA 4.0",
      licenseUrl:
        "https://creativecommons.org/licenses/by-sa/4.0/legalcode",
      accessedOn: "2026-07-18",
      modifications:
        "Filtered to every men's World Cup squad from 1970–2022; preserved stable player identities across editions and aggregated match appearances, starts, non-own goals, tactical position codes, and published tournament awards.",
    },
    identities: Object.fromEntries(
      Object.entries(output).sort(([first], [second]) =>
        first.localeCompare(second),
      ),
    ),
    unresolvedIdentityIds: [],
  };

  if (process.argv.includes("--check")) {
    if (!existsSync(OUTPUT_FILE)) {
      throw new Error("Generated player tournament archive is missing.");
    }
    const current = JSON.parse(await readFile(OUTPUT_FILE, "utf8")) as GeneratedArchive;
    const comparable = {
      ...generated,
      generatedAt: current.generatedAt,
    };
    if (JSON.stringify(current) !== JSON.stringify(comparable)) {
      throw new Error(
        "Generated player tournament archive is stale. Run npm run players:generate:tournaments.",
      );
    }
  } else {
    await writeFile(OUTPUT_FILE, `${JSON.stringify(generated, null, 2)}\n`);
  }

  const cardCount = Object.values(output).reduce(
    (total, tournaments) => total + tournaments.length,
    0,
  );
  console.log(
    `Tournament appearance archive: ${cardCount} cards across ${Object.keys(output).length} identities.`,
  );
  console.log("All sourced squad players resolved to one stable identity.");
};

void main();
