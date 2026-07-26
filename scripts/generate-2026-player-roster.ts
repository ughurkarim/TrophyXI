import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import tournamentArchiveJson from "../src/data/player-tournaments.generated.json";
import type { Position } from "../src/types/game";

type CsvRow = Record<string, string>;
type HistoricalArchive = {
  identities: Record<
    string,
    { playerId: string; playerName: string; teamCode: string }[]
  >;
};
type GeneratedPlayer = {
  identityId: string;
  playerName: string;
  teamCode: string;
  teamName: string;
  shirtNumber: number;
  primaryPosition: Position;
  eligiblePositions: Position[];
  birthDate: string;
  club: string;
  sourcePlayerName: string;
};
type GeneratedArchive = {
  version: 1;
  generatedAt: string;
  source: {
    name: string;
    url: string;
    transcriptionUrl: string;
    license: string;
    accessedOn: string;
    modifications: string;
  };
  players: GeneratedPlayer[];
  teams: { teamCode: string; teamName: string; playerCount: number }[];
  unresolvedHistoricalMatches: string[];
};

const ROOT = process.cwd();
const SOURCE_DIRECTORY = path.join(ROOT, "data", "sources");
const TSV_FILE = path.join(
  SOURCE_DIRECTORY,
  "fifa-world-cup-2026",
  "players.tsv",
);
const HISTORICAL_PLAYERS_FILE = path.join(
  SOURCE_DIRECTORY,
  "fjelstul-world-cup",
  "players.csv",
);
const OUTPUT_FILE = path.join(
  ROOT,
  "src",
  "data",
  "player-tournaments-2026.generated.json",
);

const parseDelimited = (value: string, delimiter: string): CsvRow[] => {
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
    } else if (character === delimiter && !quoted) {
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

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const isoDate = (value: string) => {
  const [day, month, year] = value.split("/");
  return `${year}-${month}-${day}`;
};

const playerNameFor = (row: CsvRow) => {
  const common = row["PLAYER NAME"].trim();
  const commonTokens = common.split(/\s+/);
  const preferredGiven = row["FIRST NAME(S)"].trim().split(/\s+/)[0];
  const officialFamily = row["LAST NAME(S)"].trim();
  const normalizedGiven = normalize(preferredGiven);
  const displayToken = (token: string) =>
    token
      .split("-")
      .map((part) =>
        /^[A-ZÀ-ÖØ-Þ'’]+$/u.test(part)
          ? `${part.slice(0, 1)}${part.slice(1).toLocaleLowerCase("en")}`
          : part,
      )
      .join("-");
  if (normalize(commonTokens[0]) === normalizedGiven) {
    const commonFamily = commonTokens.slice(1).join(" ");
    return [
      preferredGiven,
      normalize(commonFamily) === normalize(officialFamily)
        ? officialFamily
        : commonTokens.slice(1).map(displayToken).join(" "),
    ].join(" ");
  }
  if (normalize(commonTokens.at(-1) ?? "") === normalizedGiven) {
    const commonFamily = commonTokens.slice(0, -1).join(" ");
    return [
      preferredGiven,
      normalize(commonFamily) === normalize(officialFamily)
        ? officialFamily
        : commonTokens.slice(0, -1).map(displayToken).join(" "),
    ].join(" ");
  }
  return commonTokens.map(displayToken).join(" ");
};

const positionsFor = (code: string): Position[] => {
  if (code === "GK") return ["GK"];
  if (code === "DF") return ["CB", "LB", "RB"];
  if (code === "MF") return ["CM", "DM", "AM"];
  return ["ST", "CF", "LW", "RW"];
};

const reviewedHistoricalIdentityByPlayer: Record<string, string> = {
  "QAT/pedro-miguel": "ro-ro",
  "KSA/feras-albrikan": "firas-al-buraikan",
};

const main = async () => {
  const [tsv, historicalPlayersCsv] = await Promise.all([
    readFile(TSV_FILE, "utf8"),
    readFile(HISTORICAL_PLAYERS_FILE, "utf8"),
  ]);
  const rows = parseDelimited(tsv, "\t");
  const historicalPlayers = parseDelimited(historicalPlayersCsv, ",");
  const historicalPlayerById = new Map(
    historicalPlayers.map((player) => [player.player_id, player]),
  );
  const historical = tournamentArchiveJson as unknown as HistoricalArchive;
  const historicalCandidatesByBirthDate = new Map<
    string,
    { identityId: string; playerName: string; teamCodes: Set<string> }[]
  >();
  for (const [identityId, tournaments] of Object.entries(
    historical.identities,
  )) {
    const first = tournaments[0];
    const birthDate = historicalPlayerById.get(first.playerId)?.birth_date;
    if (!birthDate) continue;
    historicalCandidatesByBirthDate.set(birthDate, [
      ...(historicalCandidatesByBirthDate.get(birthDate) ?? []),
      {
        identityId,
        playerName: first.playerName,
        teamCodes: new Set(tournaments.map((tournament) => tournament.teamCode)),
      },
    ]);
  }

  const unresolvedHistoricalMatches: string[] = [];
  const provisional = rows.map((row) => {
    const teamMatch = row.Team.match(/^(.*) \(([A-Z]{3})\)$/);
    if (!teamMatch) throw new Error(`Invalid team field: ${row.Team}`);
    const [, teamName, teamCode] = teamMatch;
    const playerName = playerNameFor(row);
    const birthDate = isoDate(row.DOB);
    const candidates = (
      historicalCandidatesByBirthDate.get(birthDate) ?? []
    ).filter((candidate) => candidate.teamCodes.has(teamCode));
    const directIdentityId = normalize(playerName);
    const reviewedIdentityId =
      reviewedHistoricalIdentityByPlayer[
        `${teamCode}/${normalize(row["PLAYER NAME"])}`
      ];
    const reviewedIdentity = reviewedIdentityId
      ? historical.identities[reviewedIdentityId]
      : undefined;
    const directIdentity = historical.identities[directIdentityId];
    const directIdentityBirthDate = directIdentity
      ? historicalPlayerById.get(directIdentity[0].playerId)?.birth_date
      : undefined;
    const exactNameMatches = candidates.filter(
      (candidate) => normalize(candidate.playerName) === normalize(playerName),
    );
    const nameTokens = new Set(normalize(playerName).split("-"));
    const tokenMatches = candidates.filter((candidate) =>
      normalize(candidate.playerName)
        .split("-")
        .some((token) => token.length >= 3 && nameTokens.has(token)),
    );
    const historicalMatch =
      reviewedIdentity
        ? {
            identityId: reviewedIdentityId,
            playerName: reviewedIdentity[0].playerName,
            teamCodes: new Set(
              reviewedIdentity.map((tournament) => tournament.teamCode),
            ),
          }
        : directIdentityBirthDate === birthDate
        ? {
            identityId: directIdentityId,
            playerName: directIdentity[0].playerName,
            teamCodes: new Set(
              directIdentity.map((tournament) => tournament.teamCode),
            ),
          }
        : exactNameMatches.length === 1
        ? exactNameMatches[0]
        : tokenMatches.length === 1
          ? tokenMatches[0]
          : undefined;
    if (candidates.length > 0 && !historicalMatch) {
      unresolvedHistoricalMatches.push(
        `${teamCode}/${playerName}/${birthDate}: ${candidates.map((candidate) => candidate.identityId).join(", ")}`,
      );
    }
    const normalizedIdentityId = normalize(playerName);
    return {
      identityId:
        historicalMatch?.identityId ??
        (historical.identities[normalizedIdentityId]
          ? `${normalizedIdentityId}-${teamCode.toLocaleLowerCase()}`
          : normalizedIdentityId),
      playerName,
      teamCode,
      teamName,
      shirtNumber: Number(row["#"]),
      primaryPosition: positionsFor(row.POS)[0],
      eligiblePositions: positionsFor(row.POS),
      birthDate,
      club: row.CLUB,
      sourcePlayerName: row["PLAYER NAME"],
    } satisfies GeneratedPlayer;
  });

  const identityCounts = new Map<string, number>();
  for (const player of provisional) {
    identityCounts.set(
      player.identityId,
      (identityCounts.get(player.identityId) ?? 0) + 1,
    );
  }
  const players = provisional.map((player) =>
    identityCounts.get(player.identityId) === 1
      ? player
      : {
          ...player,
          identityId: `${player.identityId}-${player.teamCode.toLocaleLowerCase()}-${player.shirtNumber}`,
        },
  );
  const teams = [...new Set(players.map((player) => player.teamCode))]
    .sort()
    .map((teamCode) => {
      const teamPlayers = players.filter(
        (player) => player.teamCode === teamCode,
      );
      return {
        teamCode,
        teamName: teamPlayers[0].teamName,
        playerCount: teamPlayers.length,
      };
    });
  if (
    players.length !== 1_248 ||
    teams.length !== 48 ||
    teams.some((team) => team.playerCount !== 26)
  ) {
    throw new Error(
      `Expected 1,248 players across 48 complete teams; found ${players.length} across ${teams.length}.`,
    );
  }

  const generated: GeneratedArchive = {
    version: 1,
    generatedAt: new Date().toISOString(),
    source: {
      name: "FIFA World Cup 2026 official squad lists",
      url: "https://fdp.fifa.org/assetspublic/ce281/pdf/SquadLists-English.pdf",
      transcriptionUrl:
        "https://github.com/matyuschenko/fifa-wc2026-players/blob/main/data/players.tsv",
      license: "CC BY 4.0",
      accessedOn: "2026-07-26",
      modifications:
        "Normalized official display names, positions, country codes, dates, and stable cross-tournament identities; retained the source spelling for audit.",
    },
    players: players.sort(
      (first, second) =>
        first.teamCode.localeCompare(second.teamCode) ||
        first.shirtNumber - second.shirtNumber,
    ),
    teams,
    unresolvedHistoricalMatches,
  };
  if (process.argv.includes("--check")) {
    if (!existsSync(OUTPUT_FILE)) {
      throw new Error("Generated 2026 player roster is missing.");
    }
    const current = JSON.parse(
      await readFile(OUTPUT_FILE, "utf8"),
    ) as GeneratedArchive;
    if (
      JSON.stringify({ ...generated, generatedAt: current.generatedAt }) !==
      JSON.stringify(current)
    ) {
      throw new Error(
        "Generated 2026 player roster is stale. Run npm run players:generate:2026.",
      );
    }
  } else {
    await writeFile(OUTPUT_FILE, `${JSON.stringify(generated, null, 2)}\n`);
  }
  console.log(
    `2026 roster: ${players.length} players across ${teams.length} teams; ` +
      `${players.filter((player) => historical.identities[player.identityId]).length} linked to historical identities.`,
  );
  if (unresolvedHistoricalMatches.length > 0) {
    console.warn(
      `Ambiguous historical matches: ${unresolvedHistoricalMatches.length}`,
    );
  }
};

void main();
