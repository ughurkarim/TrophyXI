import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { players } from "../src/data/players";
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
  version: 1;
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

type IdentityVersion = {
  playerName: string;
  tournamentYear: number;
  countryCode: string;
  primaryPosition: Position;
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

const nameTokenSignature = (value: string) =>
  normalizeName(value).split("-").filter(Boolean).sort().join("-");

const reviewedPlayerIdByIdentityId: Record<string, string> = {
  "igor-belanov": "P-10855",
  rivelino: "P-85778",
};

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
  fallback: Position,
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
  const identities = new Map<string, IdentityVersion[]>(
    [
      ...new Set(
        players
          .filter((player) => SUPPORTED_YEARS.has(player.tournamentYear))
          .map((player) => player.playerIdentityId),
      ),
    ].map((identityId) => [
      identityId,
      players.filter(
        (player) =>
          player.playerIdentityId === identityId &&
          SUPPORTED_YEARS.has(player.tournamentYear),
      ),
    ]),
  );
  for (const requested of requestedIdentities) {
    const versions = identities.get(requested.identityId) ?? [];
    if (
      !versions.some(
        (version) => version.tournamentYear === requested.referenceYear,
      )
    ) {
      versions.push({
        playerName: requested.playerName,
        tournamentYear: requested.referenceYear,
        countryCode: requested.countryCode,
        primaryPosition: requested.primaryPosition,
      });
    }
    identities.set(requested.identityId, versions);
  }
  const requestedPlayerIdByIdentityId = new Map(
    requestedIdentities.map((identity) => [
      identity.identityId,
      identity.playerId,
    ]),
  );
  const output: GeneratedArchive["identities"] = {};
  const unresolvedIdentityIds: string[] = [];

  for (const [identityId, versions] of identities) {
    const candidatePlayerIds = new Map<string, number>();
    for (const version of versions) {
      const matches = squads.filter(
        (row) =>
          Number(row.tournament_id.replace("WC-", "")) ===
            version.tournamentYear &&
          (
            normalizeName(playerNameFor(row)) ===
              normalizeName(version.playerName) ||
            normalizeName(row.family_name) ===
              normalizeName(version.playerName) ||
            nameTokenSignature(playerNameFor(row)) ===
              nameTokenSignature(version.playerName)
          ) &&
          projectCodeFor(row.team_code) === version.countryCode,
      );
      for (const match of matches) {
        candidatePlayerIds.set(
          match.player_id,
          (candidatePlayerIds.get(match.player_id) ?? 0) + 1,
        );
      }
    }
    if (candidatePlayerIds.size === 0) {
      for (const version of versions) {
        const matches = squads.filter(
          (row) =>
            (
              normalizeName(playerNameFor(row)) ===
                normalizeName(version.playerName) ||
              normalizeName(row.family_name) ===
                normalizeName(version.playerName) ||
              nameTokenSignature(playerNameFor(row)) ===
                nameTokenSignature(version.playerName)
            ) &&
            projectCodeFor(row.team_code) === version.countryCode,
        );
        for (const match of matches) {
          candidatePlayerIds.set(
            match.player_id,
            (candidatePlayerIds.get(match.player_id) ?? 0) + 1,
          );
        }
      }
    }
    const reviewedPlayerId =
      requestedPlayerIdByIdentityId.get(identityId) ??
      reviewedPlayerIdByIdentityId[identityId];
    if (reviewedPlayerId) {
      candidatePlayerIds.clear();
      candidatePlayerIds.set(reviewedPlayerId, 1);
    }
    const rankedPlayerIds = [...candidatePlayerIds.entries()].sort(
      (first, second) => second[1] - first[1],
    );
    const playerId = rankedPlayerIds[0]?.[0];
    if (!playerId || rankedPlayerIds.length > 1 && rankedPlayerIds[0][1] === rankedPlayerIds[1][1]) {
      unresolvedIdentityIds.push(identityId);
      continue;
    }

    const playerAppearances = appearancesByPlayer.get(playerId) ?? [];
    const playerSquads = squads.filter((row) => row.player_id === playerId);
    const years = [
      ...new Set(
        playerSquads.map((row) =>
          Number(row.tournament_id.replace("WC-", "")),
        ),
      ),
    ]
      .filter((year) => SUPPORTED_YEARS.has(year))
      .sort((first, second) => first - second);
    output[identityId] = years.map((tournamentYear) => {
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
      const reference =
        versions.find((version) => version.tournamentYear === tournamentYear) ??
        [...versions].sort(
          (first, second) =>
            Math.abs(first.tournamentYear - tournamentYear) -
            Math.abs(second.tournamentYear - tournamentYear),
        )[0];
      const positionCounts = new Map<Position, number>();
      for (const row of rows) {
        const position = mappedPosition(
          row.position_code,
          reference.primaryPosition,
        );
        positionCounts.set(position, (positionCounts.get(position) ?? 0) + 1);
      }
      const rankedPositions = [...positionCounts.entries()].sort(
        (first, second) => second[1] - first[1],
      );
      const primaryPosition =
        rankedPositions[0]?.[0] ??
        mappedPosition(squadRow.position_code, reference.primaryPosition);
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
  }

  const generated: GeneratedArchive = {
    version: 1,
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
        "Filtered to men's tournaments from 1970–2022 and Trophy XI identities; aggregated match appearances, starts, non-own goals, tactical position codes, and published tournament awards.",
    },
    identities: Object.fromEntries(
      Object.entries(output).sort(([first], [second]) =>
        first.localeCompare(second),
      ),
    ),
    unresolvedIdentityIds: unresolvedIdentityIds.sort(),
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
  console.log(
    unresolvedIdentityIds.length > 0
      ? `Unresolved identities: ${unresolvedIdentityIds.join(", ")}`
      : "All Trophy XI identities resolved to a unique Fjelstul player id.",
  );
};

void main();
