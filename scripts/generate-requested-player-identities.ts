import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { players } from "../src/data/players";
import type { Position } from "../src/types/game";

type CsvRow = Record<string, string>;

type RequestedIdentity = {
  identityId: string;
  playerId: string;
  playerName: string;
  countryCode: string;
  referenceYear: number;
  primaryPosition: Position;
  eligiblePositions: Position[];
  positionSource: "reviewed-correction" | "match-derived" | "broad-squad-fallback";
  featuredYears: number[];
  priority: "essential" | "cult";
};

const root = process.cwd();
const sourceDirectory = path.join(root, "data", "sources", "fjelstul-world-cup");
const outputFile = path.join(
  root,
  "src",
  "data",
  "requested-player-identities.generated.json",
);
const positionCorrectionsFile = path.join(
  root,
  "data",
  "player-position-corrections.csv",
);
const requestFile = process.argv.find((argument) => argument.startsWith("--request="))
  ?.slice("--request=".length);

if (!requestFile) {
  throw new Error("Pass the curated roster request with --request=/absolute/path.txt");
}

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

const nameTokenSignature = (value: string) =>
  normalizeName(value).split("-").filter(Boolean).sort().join("-");

const playerNameFor = (row: CsvRow) =>
  row.given_name === "not applicable"
    ? row.family_name
    : `${row.given_name} ${row.family_name}`;

const projectCodeFor = (code: string) =>
  ({
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
  })[code as keyof Record<string, string>] ?? code;

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
  if (rawCode === "DF") return "CB";
  if (rawCode === "MF") return "CM";
  if (rawCode === "FW") return "ST";
  return fallback;
};

const positionProfileForReference = (
  playerId: string,
  tournamentYear: number,
  squadRow: CsvRow,
  appearances: CsvRow[],
): {
  primaryPosition: Position;
  eligiblePositions: Position[];
  positionSource: "match-derived" | "broad-squad-fallback";
} => {
  const fallbackPosition = mappedPosition(squadRow.position_code);
  const positionCounts = new Map<Position, number>();
  for (const row of appearances) {
    if (
      row.player_id !== playerId ||
      Number(row.tournament_id.replace("WC-", "")) !== tournamentYear
    ) {
      continue;
    }
    const position = mappedPosition(row.position_code, fallbackPosition);
    positionCounts.set(position, (positionCounts.get(position) ?? 0) + 1);
  }
  const rankedPositions = [...positionCounts.entries()].sort(
    (first, second) => second[1] - first[1],
  );
  if (rankedPositions.length === 0) {
    return {
      primaryPosition: fallbackPosition,
      eligiblePositions: [fallbackPosition],
      positionSource: "broad-squad-fallback",
    };
  }
  const primaryPosition = rankedPositions[0][0];
  return {
    primaryPosition,
    eligiblePositions: rankedPositions
      .map(([position]) => position)
      .filter(
        (position, index, all) =>
          all.indexOf(position) === index &&
          (primaryPosition === "GK" ? position === "GK" : position !== "GK"),
      ),
    positionSource: "match-derived",
  };
};

const reviewedPlayerIdByName: Record<string, string> = {
  "simao-sabrosa": "P-32279",
  "miguel-monteiro": "P-28497",
  "juan-quintero": "P-14499",
  "jose-maria-gimenez": "P-65659",
  "giorgos-samaras": "P-58348",
  "mehdi-benatia": "P-53270",
  "julio-cesar": "P-11275",
  "javier-hernandez": "P-36515",
  "oscar": "P-37239",
  "pepe": "P-81972",
};

const canonicalIdentityByPlayerId: Record<
  string,
  { identityId: string; playerName: string }
> = {
  "P-14499": {
    identityId: "juan-fernando-quintero",
    playerName: "Juan Fernando Quintero",
  },
  "P-50699": {
    identityId: "nelson-haedo-valdez",
    playerName: "Nelson Haedo Valdez",
  },
};

const excludedNonParticipants = new Set([
  "samuel-etoo:2006",
  "youssef-msakni:2018",
]);

const main = async () => {
const request = await readFile(requestFile, "utf8");
const [squadsCsv, appearancesCsv] = await Promise.all([
  readFile(path.join(sourceDirectory, "squads.csv"), "utf8"),
  readFile(path.join(sourceDirectory, "player_appearances.csv"), "utf8"),
]);
const squads = parseCsv(squadsCsv).filter((row) => {
  const year = Number(row.tournament_id.replace("WC-", ""));
  return year >= 1970 && year <= 2022;
});
const appearances = parseCsv(appearancesCsv);
const positionCorrections = existsSync(positionCorrectionsFile)
  ? parseCsv(await readFile(positionCorrectionsFile, "utf8"))
  : [];
const positionCorrectionByCard = new Map(
  positionCorrections.map((row) => [
    `${row.identityId}:${row.referenceYear}`,
    {
      primaryPosition: row.newPosition as Position,
      eligiblePositions: (row.eligiblePositions || row.newPosition)
        .split("|")
        .filter(Boolean) as Position[],
    },
  ] as const),
);

const existingByNormalizedName = new Map<string, (typeof players)[number]>();
for (const player of players) {
  existingByNormalizedName.set(normalizeName(player.playerName), player);
}

const requested = new Map<
  string,
  { playerName: string; featuredYears: Set<number>; priority: "essential" | "cult" }
>();
let activeYear = 0;
let priority: "essential" | "cult" = "essential";
for (const rawLine of request.split(/\r?\n/)) {
  const heading = rawLine.match(/^(2006|2010|2014|2018|2022|2026)\s/);
  if (heading) {
    activeYear = Number(heading[1]);
    priority = "essential";
    continue;
  }
  if (/^(?:Tournament icons|2026 tournament icons)/i.test(rawLine)) {
    priority = "cult";
    continue;
  }
  if (/^(?:Essential|Major stars)/i.test(rawLine)) {
    priority = "essential";
    continue;
  }
  if (!activeYear || activeYear === 2026 || !rawLine.startsWith("* ")) continue;
  if (/should not receive|was not at this tournament|was injured/i.test(rawLine)) continue;
  if (/Golden Ball and James/i.test(rawLine)) continue;
  let playerName = rawLine.slice(2).split(/\s+[—–]\s+/)[0].trim();
  if (/impact substitute Julio Cruz/i.test(playerName)) playerName = "Julio Cruz";
  const identityId = normalizeName(playerName);
  if (excludedNonParticipants.has(`${identityId}:${activeYear}`)) continue;
  const current = requested.get(identityId) ?? {
    playerName,
    featuredYears: new Set<number>(),
    priority,
  };
  current.featuredYears.add(activeYear);
  if (priority === "essential") current.priority = "essential";
  requested.set(identityId, current);
}

const resolved: RequestedIdentity[] = [];
const unresolved: string[] = [];
for (const [requestedId, entry] of requested) {
  const existing = existingByNormalizedName.get(requestedId);
  const identityId = existing?.playerIdentityId ?? requestedId;
  const lookupName = existing?.playerName ?? entry.playerName;
  const reviewedPlayerId = reviewedPlayerIdByName[requestedId];
  const candidates = reviewedPlayerId
    ? squads.filter((row) => row.player_id === reviewedPlayerId)
    : squads.filter((row) =>
        normalizeName(playerNameFor(row)) === normalizeName(lookupName) ||
        normalizeName(row.family_name) === normalizeName(lookupName) ||
        nameTokenSignature(playerNameFor(row)) === nameTokenSignature(lookupName),
      );
  const candidateIds = [...new Set(candidates.map((row) => row.player_id))];
  if (candidateIds.length !== 1) {
    unresolved.push(`${entry.playerName} (${candidateIds.join(", ") || "no match"})`);
    continue;
  }
  const playerId = candidateIds[0];
  const playerRows = squads.filter((row) => row.player_id === playerId);
  const featuredReference = [...entry.featuredYears]
    .sort((first, second) => second - first)
    .flatMap((year) => playerRows.filter(
      (row) => Number(row.tournament_id.replace("WC-", "")) === year,
    ))[0];
  const reference = featuredReference ?? playerRows.at(-1);
  if (!reference) {
    unresolved.push(`${entry.playerName} (no squad row)`);
    continue;
  }
  const referenceYear = Number(reference.tournament_id.replace("WC-", ""));
  const reviewedCorrection =
    positionCorrectionByCard.get(`${identityId}:${referenceYear}`) ??
    positionCorrectionByCard.get(`${requestedId}:${referenceYear}`);
  const derivedProfile = positionProfileForReference(
    playerId,
    referenceYear,
    reference,
    appearances,
  );
  resolved.push({
    identityId,
    playerId,
    playerName: existing?.playerName ?? entry.playerName,
    countryCode: projectCodeFor(reference.team_code),
    referenceYear,
    // A reviewed correction is authoritative. Otherwise use tournament
    // appearance roles, and only fall back to the broad squad category when no
    // appearance position exists.
    primaryPosition:
      reviewedCorrection?.primaryPosition ?? derivedProfile.primaryPosition,
    eligiblePositions:
      reviewedCorrection?.eligiblePositions ?? derivedProfile.eligiblePositions,
    positionSource: reviewedCorrection
      ? "reviewed-correction"
      : derivedProfile.positionSource,
    featuredYears: [...entry.featuredYears].sort((first, second) => first - second),
    priority: entry.priority,
  });
}

if (unresolved.length > 0) {
  throw new Error(`Unresolved requested identities:\n${unresolved.join("\n")}`);
}

const uniqueByPlayerId = new Map<string, RequestedIdentity>();
for (const identity of resolved) {
  const canonical = canonicalIdentityByPlayerId[identity.playerId];
  const normalized = canonical
    ? { ...identity, ...canonical }
    : identity;
  const current = uniqueByPlayerId.get(identity.playerId);
  if (!current) {
    uniqueByPlayerId.set(identity.playerId, normalized);
    continue;
  }
  uniqueByPlayerId.set(identity.playerId, {
    ...current,
    ...canonical,
    featuredYears: [
      ...new Set([...current.featuredYears, ...normalized.featuredYears]),
    ].sort((first, second) => first - second),
    priority:
      current.priority === "essential" || normalized.priority === "essential"
        ? "essential"
        : "cult",
  });
}

const identities = [...uniqueByPlayerId.values()];

await writeFile(
  outputFile,
  `${JSON.stringify({
    version: 1,
    generatedAt: new Date().toISOString(),
    identities: identities.sort((first, second) => first.identityId.localeCompare(second.identityId)),
    excludedNonParticipants: [...excludedNonParticipants].sort(),
  }, null, 2)}\n`,
);

console.log(`Resolved ${identities.length} requested historical identities.`);
};

void main();