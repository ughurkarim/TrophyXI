import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SOURCE_DIR = path.join(ROOT, "data", "sources", "fjelstul-world-cup");
const OUTPUT = path.join(ROOT, "src", "data", "opponents", "generated.ts");
const CHAMPION_OUTPUT = path.join(
  ROOT,
  "src",
  "data",
  "opponents",
  "champion-rosters.generated.json",
);
const YEARS = [
  1970, 1974, 1978, 1982, 1986, 1990, 1994, 1998, 2002, 2006, 2010, 2014,
  2018, 2022,
];
const FORMATIONS = [
  "4-3-3",
  "4-2-3-1",
  "4-4-2",
  "3-5-2",
  "4-1-4-1",
  "4-3-1-2",
  "4-2-2-2",
  "4-5-1",
  "3-4-3",
  "3-4-2-1",
  "5-3-2",
  "5-2-3",
];
const EXPECTED: Record<number, number> = {
  1970: 16,
  1974: 16,
  1978: 16,
  1982: 24,
  1986: 24,
  1990: 24,
  1994: 24,
  1998: 32,
  2002: 32,
  2006: 32,
  2010: 32,
  2014: 32,
  2018: 32,
  2022: 32,
};

const parseCsv = (value: string) => {
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
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const [headers, ...records] = rows;
  return records.map((record) =>
    Object.fromEntries(headers.map((header, index) => [header, record[index] ?? ""])),
  );
};

const hash = (value: string) => {
  let output = 2166136261;
  for (const character of value) {
    output ^= character.charCodeAt(0);
    output = Math.imul(output, 16777619);
  }
  return output >>> 0;
};

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const personName = (givenName: string, familyName: string) =>
  [givenName === "not applicable" ? "" : givenName, familyName]
    .filter(Boolean)
    .join(" ");

const finishFor = (performance: string, team: string, winner: string) => {
  if (performance === "final") return team === winner ? "champion" : "runner-up";
  if (performance === "third-place match") return "semi-finals";
  return performance;
};

const baseForFinish: Record<string, number> = {
  champion: 94,
  "runner-up": 91,
  "semi-finals": 88,
  "quarter-finals": 85,
  "round of 16": 81,
  "second group stage": 80,
  "group stage": 76,
};

const main = async () => {
  const [
    qualifiedCsv,
    tournamentsCsv,
    teamsCsv,
    appearancesCsv,
    squadsCsv,
    appointmentsCsv,
  ] = await Promise.all([
    readFile(path.join(SOURCE_DIR, "qualified_teams.csv"), "utf8"),
    readFile(path.join(SOURCE_DIR, "tournaments.csv"), "utf8"),
    readFile(path.join(SOURCE_DIR, "teams.csv"), "utf8"),
    readFile(path.join(SOURCE_DIR, "player_appearances.csv"), "utf8"),
    readFile(path.join(SOURCE_DIR, "squads.csv"), "utf8"),
    readFile(path.join(SOURCE_DIR, "manager_appointments.csv"), "utf8"),
  ]);
  const qualified = parseCsv(qualifiedCsv);
  const tournaments = parseCsv(tournamentsCsv);
  const teams = parseCsv(teamsCsv);
  const appearances = parseCsv(appearancesCsv);
  const squads = parseCsv(squadsCsv);
  const appointments = parseCsv(appointmentsCsv);
  const tournamentById = new Map(
    tournaments.map((tournament) => [tournament.tournament_id, tournament]),
  );
  const teamById = new Map(teams.map((team) => [team.team_id, team]));

  const rows = qualified
    .filter((entry) => YEARS.includes(Number(entry.tournament_id.slice(-4))))
    .map((entry) => {
      const tournament = tournamentById.get(entry.tournament_id);
      const team = teamById.get(entry.team_id);
      if (!tournament || !team) {
        throw new Error(`Missing tournament/team reference for ${entry.key_id}`);
      }
      const tournamentYear = Number(entry.tournament_id.slice(-4));
      const tournamentFinish = finishFor(
        entry.performance,
        entry.team_name,
        tournament.winner,
      );
      const id = `${slugify(entry.team_name)}-${tournamentYear}`;
      const noise = hash(id);
      const base = baseForFinish[tournamentFinish] ?? 76;
      const attack = Math.min(97, base + ((noise >>> 1) % 7) - 3);
      const midfield = Math.min(97, base + ((noise >>> 4) % 7) - 3);
      const defense = Math.min(97, base + ((noise >>> 7) % 7) - 3);
      const goalkeeper = Math.min(97, base + ((noise >>> 10) % 7) - 3);
      const depth = Math.min(97, base + ((noise >>> 13) % 7) - 3);
      const overall = Math.round(
        attack * 0.26 +
          midfield * 0.25 +
          defense * 0.27 +
          goalkeeper * 0.14 +
          depth * 0.08,
      );
      return {
        id,
        nationCode: entry.team_code,
        nationName: entry.team_name,
        tournamentYear,
        confederation: team.confederation_code,
        tournamentFinish,
        managerName: null,
        formation: FORMATIONS[noise % FORMATIONS.length],
        tacticalProfile:
          overall >= 87
            ? "Elite tournament structure with decisive transition threat"
            : overall >= 81
              ? "Competitive historical shape with identifiable phase strengths"
              : "Underdog tournament profile built around collective resilience",
        ratings: {
          attack,
          midfield,
          defense,
          goalkeeper,
          depth,
          overall,
        },
        tournamentStats: {
          matches: Number(entry.count_matches),
          wins: null,
          draws: null,
          losses: null,
          goalsFor: null,
          goalsAgainst: null,
          cleanSheets: null,
        },
        originalRatings: true,
        difficulty:
          overall >= 93
            ? "Legendary"
            : overall >= 88
              ? "Elite"
              : overall >= 81
                ? "Contender"
                : "Underdog",
      };
    })
    .sort(
      (first, second) =>
        second.tournamentYear - first.tournamentYear ||
        first.nationName.localeCompare(second.nationName),
    );

  for (const year of YEARS) {
    const count = rows.filter((row) => row.tournamentYear === year).length;
    if (count !== EXPECTED[year]) {
      throw new Error(`${year}: expected ${EXPECTED[year]} teams, found ${count}`);
    }
  }
  if (new Set(rows.map((row) => row.id)).size !== rows.length) {
    throw new Error("Duplicate historical opponent ids");
  }

  const championRosters = YEARS.map((tournamentYear) => {
    const tournamentId = `WC-${tournamentYear}`;
    const tournament = tournamentById.get(tournamentId);
    if (!tournament) throw new Error(`${tournamentId}: tournament missing`);
    const winner = qualified.find(
      (entry) =>
        entry.tournament_id === tournamentId &&
        entry.team_name === tournament.winner,
    );
    if (!winner) throw new Error(`${tournamentId}: champion missing`);

    const finalAppearances = appearances.filter(
      (appearance) =>
        appearance.tournament_id === tournamentId &&
        appearance.team_id === winner.team_id &&
        appearance.stage_name === "final",
    );
    const starters = finalAppearances.filter(
      (appearance) => appearance.starter === "1",
    );
    if (starters.length !== 11) {
      throw new Error(
        `${tournamentId} ${winner.team_name}: expected 11 final starters, found ${starters.length}`,
      );
    }

    const squad = squads.filter(
      (player) =>
        player.tournament_id === tournamentId &&
        player.team_id === winner.team_id,
    );
    const starterIds = new Set(starters.map((player) => player.player_id));
    const finalAppearanceByPlayerId = new Map(
      finalAppearances.map((player) => [player.player_id, player]),
    );
    const finalSubstituteOrder = new Map(
      finalAppearances
        .filter((player) => player.substitute === "1")
        .map((player, index) => [player.player_id, index]),
    );
    const substitutePool = squad
      .filter((player) => !starterIds.has(player.player_id))
      .sort((first, second) => {
        const firstOrder =
          finalSubstituteOrder.get(first.player_id) ?? Number.MAX_SAFE_INTEGER;
        const secondOrder =
          finalSubstituteOrder.get(second.player_id) ?? Number.MAX_SAFE_INTEGER;
        return (
          firstOrder - secondOrder ||
          Number(first.shirt_number) - Number(second.shirt_number) ||
          first.player_id.localeCompare(second.player_id)
        );
      });
    const manager = appointments.find(
      (appointment) =>
        appointment.tournament_id === tournamentId &&
        appointment.team_id === winner.team_id,
    );
    if (!manager) {
      throw new Error(`${tournamentId} ${winner.team_name}: manager missing`);
    }

    const playerRecord = (
      player: Record<string, string>,
      starter: boolean,
    ) => {
      const appearance = finalAppearanceByPlayerId.get(player.player_id);
      return {
        sourcePlayerId: player.player_id,
        name: personName(player.given_name, player.family_name),
        sourcePositionCode:
          appearance?.position_code || player.position_code,
        shirtNumber: Number(player.shirt_number),
        starter,
        appearedAsSubstituteInFinal:
          appearance?.substitute === "1",
      };
    };

    return {
      id: `${slugify(winner.team_name)}-${tournamentYear}`,
      tournamentYear,
      nationCode: winner.team_code,
      nationName: winner.team_name,
      finalMatchId: starters[0]?.match_id,
      finalMatchName: starters[0]?.match_name,
      manager: {
        sourceManagerId: manager.manager_id,
        name: personName(manager.given_name, manager.family_name),
      },
      startingLineup: starters.map((player) => playerRecord(player, true)),
      substitutes: substitutePool.map((player) =>
        playerRecord(player, false),
      ),
    };
  }).sort(
    (first, second) =>
      second.tournamentYear - first.tournamentYear ||
      first.nationName.localeCompare(second.nationName),
  );

  const output = `// Generated by scripts/import-world-cup-teams.ts from the vendored
// Fjelstul World Cup Database qualified_teams, tournaments, and teams tables.
// Team participation, match counts, and finishes are sourced facts. Tactical
// profiles, formations, difficulty labels, and ratings are Trophy XI models.
import type { DataCitation, HistoricalWorldCupTeam } from "@/types/game";

export const historicalOpponentSource: DataCitation = {
  label: "The Fjelstul World Cup Database v1.2.0",
  url: "https://github.com/jfjelstul/worldcup",
  publisher: "Joshua C. Fjelstul, Ph.D.",
  accessedOn: "2026-07-18",
};

const opponentRows = ${JSON.stringify(rows, null, 2)} as const;

export const historicalOpponents: HistoricalWorldCupTeam[] = opponentRows.map(
  (opponent) => ({
    ...opponent,
    alternateFormations: [],
    startingLineup: [],
    substitutes: [],
    tournamentStats: { ...opponent.tournamentStats },
    sources: [historicalOpponentSource],
    formationIsModel: true,
    tournamentStatus: "complete",
    dataStatus: "modeled-lineup",
  }),
);

export const historicalOpponentsById = new Map(
  historicalOpponents.map((opponent) => [opponent.id, opponent]),
);
`;
  await writeFile(OUTPUT, output);
  await writeFile(
    CHAMPION_OUTPUT,
    `${JSON.stringify(championRosters, null, 2)}\n`,
  );
  console.log(`Generated ${rows.length} historical opponents in ${OUTPUT}`);
  console.log(
    `Generated ${championRosters.length} champion final rosters in ${CHAMPION_OUTPUT}`,
  );
};

void main();
