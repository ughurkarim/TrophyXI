import { createReadStream } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import tournamentArchiveJson from "../src/data/player-tournaments.generated.json";
import type { GameFaceImportCandidate } from "../src/lib/importers/game-face";

const ROOT = process.cwd();
const OUTPUT_FILE = path.join(
  ROOT,
  "scripts",
  "game-face-import-sources.json",
);
const FJELSTUL_PLAYERS_FILE = path.join(
  ROOT,
  "data",
  "sources",
  "fjelstul-world-cup",
  "players.csv",
);
const REQUIRED_ATTRIBUTION =
  "EA SPORTS player imagery, sourced via SoFIFA, used under project-specific permission.";

const reviewed2026Faces = [
  {
    id: "lionel-messi-2026",
    playerId: "158023",
    pageUrl: "https://sofifa.com/player/158023/lionel-messi/260008/",
    reviewedName: "Lionel Andrés Messi Cuccitini",
  },
  {
    id: "cristiano-ronaldo-2026",
    playerId: "20801",
    pageUrl:
      "https://sofifa.com/player/20801/c-ronaldo-dos-santos-aveiro/260006/",
    reviewedName: "Cristiano Ronaldo dos Santos Aveiro",
  },
] as const;

type CsvRow = Record<string, string>;

type FjelstulPlayer = {
  player_id: string;
  family_name: string;
  given_name: string;
  birth_date: string;
};

type SoFifaPlayer = {
  player_id: string;
  fifa_version: string;
  fifa_update_date: string;
  short_name: string;
  long_name: string;
  dob: string;
  real_face: string;
  player_face_url: string;
};

type TournamentArchive = {
  identities: Record<
    string,
    {
      playerId: string;
      tournamentYear: number;
    }[]
  >;
};

const tournamentArchive =
  tournamentArchiveJson as unknown as TournamentArchive;

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
  const [headerLine, ...lines] = value.trim().split(/\r?\n/);
  const headers = parseCsvLine(headerLine);
  return lines.map((line) => {
    const cells = parseCsvLine(line);
    return Object.fromEntries(
      headers.map((header, index) => [header, cells[index] ?? ""]),
    );
  });
};

const normalizeName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const containsName = (value: string, name: string) =>
  ` ${normalizeName(value)} `.includes(` ${normalizeName(name)} `);

const readSoFifaIndex = async (file: string) => {
  const byBirthDate = new Map<string, Map<string, SoFifaPlayer[]>>();
  const reader = readline.createInterface({
    input: createReadStream(file),
    crlfDelay: Infinity,
  });
  let headers: string[] | undefined;
  for await (const line of reader) {
    if (!headers) {
      headers = parseCsvLine(line);
      continue;
    }
    const cells = parseCsvLine(line);
    const record = Object.fromEntries(
      headers.map((header, index) => [header, cells[index] ?? ""]),
    ) as SoFifaPlayer;
    if (!["15", "18", "22"].includes(record.fifa_version)) continue;
    const playersForBirthDate =
      byBirthDate.get(record.dob) ?? new Map<string, SoFifaPlayer[]>();
    const versions = playersForBirthDate.get(record.player_id) ?? [];
    versions.push(record);
    playersForBirthDate.set(record.player_id, versions);
    byBirthDate.set(record.dob, playersForBirthDate);
  }
  return byBirthDate;
};

const main = async () => {
  const indexFile = process.argv[2];
  if (!indexFile) {
    throw new Error(
      "Usage: npm run images:generate:sources -- /path/to/male_players-legacy.csv",
    );
  }
  const fjelstulPlayers = new Map(
    parseCsv(await readFile(FJELSTUL_PLAYERS_FILE, "utf8")).map((row) => [
      row.player_id,
      row as FjelstulPlayer,
    ]),
  );
  const soFifaByBirthDate = await readSoFifaIndex(indexFile);
  const editionByTournamentYear = new Map([
    [2014, 14],
    [2018, 18],
    [2022, 22],
  ]);
  const candidates: GameFaceImportCandidate[] = [];

  for (const [identityId, tournaments] of Object.entries(
    tournamentArchive.identities,
  )) {
    const fjelstulPlayer = fjelstulPlayers.get(tournaments[0].playerId);
    if (!fjelstulPlayer) continue;
    const fullName = normalizeName(
      `${
        fjelstulPlayer.given_name === "not applicable"
          ? ""
          : fjelstulPlayer.given_name
      } ${fjelstulPlayer.family_name}`,
    );
    const matchingPlayers = [
      ...(soFifaByBirthDate.get(fjelstulPlayer.birth_date)?.values() ?? []),
    ].filter((versions) =>
      versions.some(
        (version) =>
          normalizeName(version.long_name) === fullName ||
          containsName(version.long_name, fjelstulPlayer.family_name) ||
          containsName(version.short_name, fjelstulPlayer.family_name),
      ),
    );
    if (matchingPlayers.length !== 1) continue;
    const versions = matchingPlayers[0];
    for (const tournament of tournaments) {
      const fifaVersion = editionByTournamentYear.get(
        tournament.tournamentYear,
      );
      if (!fifaVersion) continue;
      const indexedVersion = fifaVersion === 14 ? 15 : fifaVersion;
      const version = versions.find(
        (entry) => Number(entry.fifa_version) === indexedVersion,
      );
      if (
        !version ||
        version.real_face !== "Yes" ||
        !version.player_face_url.startsWith("https://cdn.sofifa.net/players/")
      ) {
        continue;
      }
      const paddedPlayerId = version.player_id.padStart(6, "0");
      const sourcePath = `${paddedPlayerId.slice(0, 3)}/${paddedPlayerId.slice(3)}`;
      candidates.push({
        id: `${identityId}-${tournament.tournamentYear}`,
        kind: "player",
        tournamentYear: tournament.tournamentYear,
        gameEdition: `FIFA ${fifaVersion}`,
        sourceWebsite: "SoFIFA",
        sourceUrl: `https://cdn.sofifa.net/players/${sourcePath}/${fifaVersion}_120.png`,
        author: "EA SPORTS",
        license: "Project-specific EA/SoFIFA permission",
        licenseUrl: "https://sofifa.com/",
        retrievedOn: "2026-07-18",
        matchQuality:
          fifaVersion === 14 ? "manually-reviewed-exact-year" : "exact",
        exactYearEvidence:
          fifaVersion === 14
            ? `Reviewed FIFA 14 in-season asset for SoFIFA player ${version.player_id}, representing the June 2014 tournament period; identity matched by the FIFA 15 legacy row, published name, and birth date to ${fjelstulPlayer.player_id}.`
            : `FIFA ${fifaVersion} legacy index entry dated ${version.fifa_update_date} records real_face=Yes for ${version.long_name}; matched by published name and birth date to ${fjelstulPlayer.player_id} and represents the June ${tournament.tournamentYear} tournament period.`,
        permissionScope: "project-specific-ea-sofifa",
        requiredAttribution: REQUIRED_ATTRIBUTION,
        preserveMetadataAndWatermarks: true,
        cachePolicy: "local-first-conditional",
        reusableLicenseConfirmed: true,
        approvedForImport: true,
      });
    }
  }

  for (const face of reviewed2026Faces) {
    const paddedPlayerId = face.playerId.padStart(6, "0");
    const sourcePath = `${paddedPlayerId.slice(0, 3)}/${paddedPlayerId.slice(3)}`;
    candidates.push({
      id: face.id,
      kind: "player",
      tournamentYear: 2026,
      gameEdition: "EA SPORTS FC 26",
      sourceWebsite: "SoFIFA",
      sourceUrl: `https://cdn.sofifa.net/players/${sourcePath}/26_120.png`,
      author: "EA SPORTS",
      license: "Project-specific EA/SoFIFA permission",
      licenseUrl: "https://sofifa.com/",
      retrievedOn: "2026-07-18",
      matchQuality: "manually-reviewed-exact-year",
      exactYearEvidence: `Reviewed ${face.reviewedName} on the SoFIFA FC 26 page ${face.pageUrl}; the page records real_face=Yes for player ${face.playerId}, and FC 26 was the current edition available by June 2026.`,
      permissionScope: "project-specific-ea-sofifa",
      requiredAttribution: REQUIRED_ATTRIBUTION,
      preserveMetadataAndWatermarks: true,
      cachePolicy: "local-first-conditional",
      reusableLicenseConfirmed: true,
      approvedForImport: true,
    });
  }

  const uniqueCandidates = [
    ...new Map(candidates.map((candidate) => [candidate.id, candidate])).values(),
  ].sort(
    (first, second) =>
      first.tournamentYear - second.tournamentYear ||
      first.id.localeCompare(second.id),
  );
  await writeFile(
    OUTPUT_FILE,
    `${JSON.stringify(uniqueCandidates, null, 2)}\n`,
  );
  console.log(
    `Generated ${uniqueCandidates.length} reviewed EA/SoFIFA face candidates.`,
  );
};

void main();
