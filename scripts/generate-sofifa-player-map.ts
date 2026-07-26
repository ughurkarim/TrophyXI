import { createReadStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import historicalJson from "../src/data/player-tournaments.generated.json";
import roster2026Json from "../src/data/player-tournaments-2026.generated.json";

type CsvRow = Record<string, string>;
type HistoricalArchive = {
  identities: Record<
    string,
    Array<{
      playerId: string;
      playerName: string;
      tournamentYear: number;
      teamName: string;
    }>
  >;
};
type Roster2026 = {
  players: Array<{
    identityId: string;
    playerName: string;
    teamName: string;
    birthDate: string;
  }>;
};
type SoFifaRow = {
  player_id: string;
  player_url: string;
  fifa_version: string;
  fifa_update_date: string;
  short_name: string;
  long_name: string;
  dob: string;
  nationality_name: string;
  real_face: string;
  player_face_url: string;
};
type IdentityTarget = {
  playerIdentityId: string;
  playerName: string;
  familyName: string;
  birthDate: string;
  nationName: string;
  tournamentYears: number[];
};

const ROOT = process.cwd();
const FJELSTUL_PLAYERS_FILE = path.join(
  ROOT,
  "data",
  "sources",
  "fjelstul-world-cup",
  "players.csv",
);
const OUTPUT_DIRECTORY = path.join(ROOT, "data", "sources", "sofifa");
const OUTPUT_FILE = path.join(OUTPUT_DIRECTORY, "player-map.json");
const REPORT_FILE = path.join(OUTPUT_DIRECTORY, "player-map-report.json");
const historical = historicalJson as unknown as HistoricalArchive;
const roster2026 = roster2026Json as unknown as Roster2026;

const parseCsvLine = (value: string) => {
  const cells: string[] = [];
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
      cells.push(cell);
      cell = "";
    } else {
      cell += character;
    }
  }
  cells.push(cell);
  return cells;
};

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

const normalized = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[øØ]/g, "o")
    .replace(/[łŁ]/g, "l")
    .replace(/[đĐ]/g, "d")
    .replace(/[ðÐ]/g, "d")
    .replace(/[þÞ]/g, "th")
    .replace(/[ß]/g, "ss")
    .replace(/[’']/g, "")
    .toLocaleLowerCase("en")
    .replace(/oe/g, "o")
    .replace(/ue/g, "u")
    .replace(/ae/g, "a")
    .replace(/\b(not applicable|jr|junior|senior)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const tokens = (value: string) =>
  new Set(normalized(value).split(" ").filter((token) => token.length > 1));

const diceCoefficient = (first: Set<string>, second: Set<string>) => {
  if (first.size === 0 || second.size === 0) return 0;
  const overlap = [...first].filter((token) => second.has(token)).length;
  return (2 * overlap) / (first.size + second.size);
};

const scoreCandidate = (target: IdentityTarget, versions: SoFifaRow[]) => {
  const targetName = normalized(target.playerName);
  const targetTokens = tokens(target.playerName);
  const family = normalized(target.familyName);
  let score = 0;
  let matchedName = "";
  for (const version of versions) {
    for (const candidateName of [version.long_name, version.short_name]) {
      const candidate = normalized(candidateName);
      const candidateTokens = tokens(candidateName);
      let candidateScore = Math.round(
        diceCoefficient(targetTokens, candidateTokens) * 70,
      );
      if (candidate === targetName) candidateScore = 120;
      if (
        targetName.replaceAll(" ", "") === candidate.replaceAll(" ", "")
      ) {
        candidateScore = Math.max(candidateScore, 115);
      }
      if (
        family &&
        (` ${candidate} `.includes(` ${family} `) ||
          candidate.endsWith(` ${family}`))
      ) {
        candidateScore += 24;
      }
      if (candidateScore > score) {
        score = candidateScore;
        matchedName = candidateName;
      }
    }
  }
  const nation = normalized(target.nationName);
  const nationMatch = versions.some((version) => {
      const candidateNation = normalized(version.nationality_name);
      return (
        candidateNation === nation ||
        candidateNation.includes(nation) ||
        nation.includes(candidateNation)
      );
    });
  if (nationMatch) {
    score += 18;
  }
  return { score, matchedName, nationMatch };
};

const addSoFifaIndex = async (
  filename: string,
  byBirthDate: Map<string, Map<string, SoFifaRow[]>>,
  format: "legacy" | "fc25",
) => {
  const reader = readline.createInterface({
    input: createReadStream(filename),
    crlfDelay: Infinity,
  });
  let headers: string[] | undefined;
  for await (const line of reader) {
    if (!headers) {
      headers = parseCsvLine(line);
      continue;
    }
    const cells = parseCsvLine(line);
    const source = Object.fromEntries(
      headers.map((header, index) => [header, cells[index] ?? ""]),
    );
    const row =
      format === "legacy"
        ? (source as SoFifaRow)
        : ({
            player_id: source.player_id,
            player_url: `/player/${source.player_id}`,
            fifa_version: "25",
            fifa_update_date: source.version,
            short_name: source.name?.replace(/\s+-\s*$/, "") ?? "",
            long_name: source.full_name?.replace(/\u00a0/g, " ").trim() ?? "",
            dob: source.dob,
            nationality_name: source.country_name,
            real_face: source.real_face,
            player_face_url: source.image,
          } satisfies SoFifaRow);
    if (
      !row.player_id ||
      !row.dob ||
      row.real_face !== "Yes" ||
      !row.player_face_url.startsWith("https://cdn.sofifa.net/players/")
    ) {
      continue;
    }
    const byPlayer = byBirthDate.get(row.dob) ?? new Map<string, SoFifaRow[]>();
    byPlayer.set(row.player_id, [
      ...(byPlayer.get(row.player_id) ?? []),
      row,
    ]);
    byBirthDate.set(row.dob, byPlayer);
  }
};

const main = async () => {
  const indexFile = process.argv[2];
  if (!indexFile) {
    throw new Error(
      "Usage: tsx scripts/generate-sofifa-player-map.ts /path/to/male_players-legacy.csv",
    );
  }
  const currentIndexFile = process.argv[3];
  const sourcePlayers = new Map(
    parseCsv(await readFile(FJELSTUL_PLAYERS_FILE, "utf8")).map((row) => [
      row.player_id,
      row,
    ]),
  );
  const targetByIdentity = new Map<string, IdentityTarget>();
  for (const [identityId, tournaments] of Object.entries(
    historical.identities,
  )) {
    const source = sourcePlayers.get(tournaments[0].playerId);
    if (!source?.birth_date) continue;
    targetByIdentity.set(identityId, {
      playerIdentityId: identityId,
      playerName: tournaments[0].playerName,
      familyName: source.family_name ?? "",
      birthDate: source.birth_date,
      nationName: tournaments.at(-1)?.teamName ?? tournaments[0].teamName,
      tournamentYears: tournaments.map((tournament) => tournament.tournamentYear),
    });
  }
  for (const player of roster2026.players) {
    const current = targetByIdentity.get(player.identityId);
    targetByIdentity.set(player.identityId, {
      playerIdentityId: player.identityId,
      playerName: current?.playerName ?? player.playerName,
      familyName:
        current?.familyName ??
        normalized(player.playerName).split(" ").at(-1) ??
        "",
      birthDate: current?.birthDate ?? player.birthDate,
      nationName: player.teamName,
      tournamentYears: [
        ...new Set([...(current?.tournamentYears ?? []), 2026]),
      ].sort(),
    });
  }

  const byBirthDate = new Map<string, Map<string, SoFifaRow[]>>();
  await addSoFifaIndex(indexFile, byBirthDate, "legacy");
  if (currentIndexFile) {
    await addSoFifaIndex(currentIndexFile, byBirthDate, "fc25");
  }
  const mappings: Array<Record<string, unknown>> = [];
  const unresolved: Array<Record<string, unknown>> = [];
  const ambiguous: Array<Record<string, unknown>> = [];
  for (const target of [...targetByIdentity.values()].sort((first, second) =>
    first.playerIdentityId.localeCompare(second.playerIdentityId),
  )) {
    const candidates = [...(byBirthDate.get(target.birthDate)?.entries() ?? [])]
      .map(([playerId, versions]) => ({
        playerId,
        versions,
        ...scoreCandidate(target, versions),
      }))
      .sort(
        (first, second) =>
          second.score - first.score ||
          first.playerId.localeCompare(second.playerId),
      );
    const best = candidates[0];
    const runnerUp = candidates[1];
    const safelyUnique =
      best &&
      ((best.score >= 70 &&
        (!runnerUp || best.score - runnerUp.score >= 12)) ||
        (best.nationMatch &&
          !candidates.slice(1).some((candidate) => candidate.nationMatch) &&
          best.score >= 18));
    if (!safelyUnique) {
      const record = {
        playerIdentityId: target.playerIdentityId,
        playerName: target.playerName,
        birthDate: target.birthDate,
        reason: best
          ? `best score ${best.score}; runner-up ${runnerUp?.score ?? "none"}`
          : "no real-face player has the same birth date",
        candidates: candidates.slice(0, 4).map((candidate) => ({
          playerId: candidate.playerId,
          matchedName: candidate.matchedName,
          score: candidate.score,
        })),
      };
      (best ? ambiguous : unresolved).push(record);
      continue;
    }
    const versions = [...best.versions].sort(
      (first, second) =>
        Number(first.fifa_version) - Number(second.fifa_version) ||
        first.fifa_update_date.localeCompare(second.fifa_update_date),
    );
    const uniqueVersions = [
      ...new Map(versions.map((version) => [version.fifa_version, version])).values(),
    ].map((version) => ({
      fifaVersion: Number(version.fifa_version),
      updateDate: version.fifa_update_date,
      sourceUrl: version.player_face_url,
    }));
    const latestTournamentYear = Math.max(...target.tournamentYears);
    const prescribedVersion = new Map([
      [2010, 10],
      [2014, 14],
      [2018, 18],
      [2022, 23],
      [2026, 26],
    ]).get(latestTournamentYear);
    const paddedPlayerId = best.playerId.padStart(6, "0");
    const playerSourcePath = `${paddedPlayerId.slice(0, 3)}/${paddedPlayerId.slice(3)}`;
    const canonical =
      latestTournamentYear === 2026
        ? {
            fifaVersion: 26,
            updateDate: "FC 26 tournament edition",
            sourceUrl: `https://cdn.sofifa.net/players/${playerSourcePath}/26_120.png`,
          }
        : uniqueVersions.find(
              (version) => version.fifaVersion === prescribedVersion,
            ) ?? uniqueVersions.at(-1)!;
    mappings.push({
      playerIdentityId: target.playerIdentityId,
      playerName: target.playerName,
      birthDate: target.birthDate,
      nationName: target.nationName,
      tournamentYears: target.tournamentYears,
      sofifaPlayerId: best.playerId,
      sofifaName: best.matchedName,
      matchScore: best.score,
      matchEvidence:
        "Exact date of birth plus a unique normalized-name and nationality match against the SoFIFA-derived legacy index.",
      sourcePage: `https://sofifa.com/player/${best.playerId}`,
      canonicalFaceUrl: canonical.sourceUrl,
      canonicalFifaVersion: canonical.fifaVersion,
      versions: uniqueVersions,
    });
  }

  await mkdir(OUTPUT_DIRECTORY, { recursive: true });
  await writeFile(
    OUTPUT_FILE,
    `${JSON.stringify(
      {
        version: 1,
        generatedAt: new Date().toISOString(),
        source: {
          name: "FIFA 23 complete player dataset",
          url: "https://huggingface.co/datasets/jsulz/FIFA23/tree/main",
          currentDatasetUrl:
            "https://www.kaggle.com/datasets/aniss7/fifa-player-data-from-sofifa-2025-06-03",
          sourceWebsite: "SoFIFA",
          license: "MIT",
          matching:
            "Real-face rows only; exact birth date and unique normalized-name/nationality evidence.",
        },
        mappings,
      },
      null,
      2,
    )}\n`,
  );
  await writeFile(
    REPORT_FILE,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        activeIdentities: targetByIdentity.size,
        mappedIdentities: mappings.length,
        unresolvedIdentities: unresolved.length,
        ambiguousIdentities: ambiguous.length,
        unresolved,
        ambiguous,
      },
      null,
      2,
    )}\n`,
  );
  console.log(
    `SoFIFA map: ${mappings.length}/${targetByIdentity.size} identities; ${unresolved.length} no real-face DOB match; ${ambiguous.length} ambiguous.`,
  );
};

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
