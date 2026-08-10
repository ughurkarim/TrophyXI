import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import tournamentArchiveJson from "../src/data/player-tournaments.generated.json";
import requestedIdentityJson from "../src/data/requested-player-identities.generated.json";
import type { Position } from "../src/types/game";

type CsvRow = Record<string, string>;
type HistoricalTournament = {
  playerId: string;
  playerName: string;
  teamCode: string;
  tournamentYear: number;
  primaryPosition: Position;
  eligiblePositions: Position[];
};

type HistoricalArchive = {
  identities: Record<string, HistoricalTournament[]>;
};

type RequestedIdentityArchive = {
  identities: {
    identityId: string;
    primaryPosition: Position;
    eligiblePositions?: Position[];
    positionSource?: "reviewed-correction" | "match-derived" | "broad-squad-fallback";
  }[];
};
type PositionSource =
  | "identity-audit"
  | "requested"
  | "historical"
  | "broad-squad-fallback";

type GeneratedPlayer = {
  identityId: string;
  playerName: string;
  teamCode: string;
  teamName: string;
  shirtNumber: number;
  primaryPosition: Position;
  eligiblePositions: Position[];
  positionSource: PositionSource;
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
    // NFD does not decompose every Latin letter used by World Cup names.
    // Transliterate the remaining common cases before creating stable IDs.
    .replace(/ı/g, "i")
    .replace(/ß/g, "ss")
    .replace(/đ/g, "d")
    .replace(/ł/g, "l")
    .replace(/ø/g, "o")
    .replace(/æ/g, "ae")
    .replace(/œ/g, "oe")
    .replace(/ð/g, "d")
    .replace(/þ/g, "th")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const isoDate = (value: string) => {
  const [day, month, year] = value.split("/");
  return `${year}-${month}-${day}`;
};

const displayLocaleFor = (teamCode: string) =>
  teamCode === "TUR" ? "tr" : "en";

const isAllCapsWord = (value: string, locale: string) => {
  const letters = [...value].filter((character) => /\p{L}/u.test(character));
  if (letters.length === 0) return false;
  const joined = letters.join("");
  return (
    joined === joined.toLocaleUpperCase(locale) &&
    joined !== joined.toLocaleLowerCase(locale)
  );
};

const displayToken = (token: string, teamCode: string) => {
  const locale = displayLocaleFor(teamCode);
  const forceTitleCase = teamCode === "TUR";
  return token
    .split(/([-’'])/u)
    .map((part) => {
      if (part === "-" || part === "’" || part === "'") return part;
      if (!forceTitleCase && !isAllCapsWord(part, locale)) return part;
      const characters = [...part];
      const [first = "", ...rest] = characters;
      return `${first.toLocaleUpperCase(locale)}${rest
        .join("")
        .toLocaleLowerCase(locale)}`;
    })
    .join("");
};

const displayPhrase = (value: string, teamCode: string) =>
  value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => displayToken(token, teamCode))
    .join(" ")
    .normalize("NFC");

const playerNameFor = (row: CsvRow, teamCode: string) => {
  const common = row["PLAYER NAME"].trim();
  const commonTokens = common.split(/\s+/).filter(Boolean);
  const preferredGiven = row["FIRST NAME(S)"].trim();
  const preferredGivenTokens = preferredGiven.split(/\s+/).filter(Boolean);
  const preferredGivenFirst = preferredGivenTokens[0] ?? "";
  const officialFamily = row["LAST NAME(S)"].trim();
  const normalizedGivenFirst = normalize(preferredGivenFirst);

  // FIFA commonly stores surnames in all caps. Keep sourcePlayerName untouched,
  // but never pass that casing directly into the display name.
  const displayedFamily = displayPhrase(officialFamily, teamCode);
  const displayedGiven = displayPhrase(preferredGiven, teamCode);

  // Multi-part given names (for example Irfan Can) previously defeated the
  // first-token-only ordering check. Reorder only when the complete suffix is
  // demonstrably the official given-name phrase. Korean display order is kept.
  if (teamCode !== "KOR" && preferredGivenTokens.length > 0) {
    const suffix = commonTokens.slice(-preferredGivenTokens.length).join(" ");
    if (
      normalize(suffix) === normalize(preferredGiven) &&
      commonTokens.length > preferredGivenTokens.length
    ) {
      const commonFamily = commonTokens
        .slice(0, -preferredGivenTokens.length)
        .join(" ");
      return [
        displayedGiven,
        normalize(commonFamily) === normalize(officialFamily)
          ? displayedFamily
          : displayPhrase(commonFamily, teamCode),
      ]
        .join(" ")
        .normalize("NFC");
    }
  }

  if (normalize(commonTokens[0] ?? "") === normalizedGivenFirst) {
    const commonFamily = commonTokens.slice(1).join(" ");
    return [
      displayPhrase(preferredGivenFirst, teamCode),
      normalize(commonFamily) === normalize(officialFamily)
        ? displayedFamily
        : displayPhrase(commonFamily, teamCode),
    ]
      .join(" ")
      .normalize("NFC");
  }
  if (normalize(commonTokens.at(-1) ?? "") === normalizedGivenFirst) {
    const commonFamily = commonTokens.slice(0, -1).join(" ");
    return [
      displayPhrase(preferredGivenFirst, teamCode),
      normalize(commonFamily) === normalize(officialFamily)
        ? displayedFamily
        : displayPhrase(commonFamily, teamCode),
    ]
      .join(" ")
      .normalize("NFC");
  }
  return displayPhrase(common, teamCode);
};

const positionsFor = (code: string): Position[] => {
  if (code === "GK") return ["GK"];
  if (code === "DF") return ["CB", "LB", "RB"];
  if (code === "MF") return ["CM", "DM", "AM"];
  return ["ST", "CF", "LW", "RW"];
};

type SourcePositionGroup = "GK" | "DF" | "MF" | "FW";

const sourceGroupForPosition = (position: Position): SourcePositionGroup => {
  if (position === "GK") return "GK";
  if (["LB", "LCB", "CB", "RCB", "RB", "LWB", "RWB"].includes(position)) {
    return "DF";
  }
  if (["DM", "CM", "AM", "LM", "RM"].includes(position)) return "MF";
  return "FW";
};

const conservativeEligiblePositionsFor = (position: Position): Position[] => {
  if (position === "GK") return ["GK"];
  if (position === "LB") return ["LB", "LWB"];
  if (position === "LWB") return ["LWB", "LB"];
  if (position === "RB") return ["RB", "RWB"];
  if (position === "RWB") return ["RWB", "RB"];
  if (position === "LCB") return ["LCB", "CB"];
  if (position === "RCB") return ["RCB", "CB"];
  if (position === "CB") return ["CB"];
  if (position === "DM") return ["DM", "CM"];
  if (position === "CM") return ["CM", "DM", "AM"];
  if (position === "AM") return ["AM", "CM"];
  if (position === "LM") return ["LM", "LW"];
  if (position === "RM") return ["RM", "RW"];
  if (position === "LW") return ["LW", "LM"];
  if (position === "RW") return ["RW", "RM"];
  if (position === "CF") return ["CF", "ST"];
  return ["ST", "CF"];
};

const requestedPositionByIdentity = new Map(
  (requestedIdentityJson as unknown as RequestedIdentityArchive).identities.map(
    (identity) => [identity.identityId, identity] as const,
  ),
);

type PositionProfile = {
  primaryPosition: Position;
  eligiblePositions: Position[];
  positionSource: PositionSource;
};

const precisePositionProfileFor = (
  identityId: string,
  sourceCode: string,
  historical: HistoricalArchive,
  reviewed2026PositionByIdentity: ReadonlyMap<string, PositionProfile>,
): PositionProfile | undefined => {
  const sourceGroup = sourceCode as SourcePositionGroup;

  // The checked-in generated roster can contain reviewed identity-audit
  // positions. Preserve those across regeneration instead of collapsing them
  // back to FIFA's coarse DF/MF/FW buckets.
  const reviewed2026 = reviewed2026PositionByIdentity.get(identityId);
  if (reviewed2026) {
    return reviewed2026;
  }

  const requestedIdentity = requestedPositionByIdentity.get(identityId);
  if (
    requestedIdentity &&
    (requestedIdentity.positionSource === "reviewed-correction" ||
      requestedIdentity.positionSource === "match-derived") &&
    sourceGroupForPosition(requestedIdentity.primaryPosition) === sourceGroup
  ) {
    return {
      primaryPosition: requestedIdentity.primaryPosition,
      eligiblePositions:
        requestedIdentity.eligiblePositions ??
        conservativeEligiblePositionsFor(requestedIdentity.primaryPosition),
      positionSource: "requested",
    };
  }

  const historicalTournament = [...(historical.identities[identityId] ?? [])]
    .sort((first, second) => second.tournamentYear - first.tournamentYear)
    .find(
      (tournament) =>
        sourceGroupForPosition(tournament.primaryPosition) === sourceGroup,
    );

  if (historicalTournament) {
    const eligiblePositions = [
      historicalTournament.primaryPosition,
      ...historicalTournament.eligiblePositions,
    ].filter(
      (position, index, all) =>
        all.indexOf(position) === index &&
        sourceGroupForPosition(position) === sourceGroup,
    );
    return {
      primaryPosition: historicalTournament.primaryPosition,
      eligiblePositions,
      positionSource: "historical",
    };
  }

  return undefined;
};

const reviewedHistoricalIdentityByPlayer: Record<string, string> = {
  "QAT/pedro-miguel": "ro-ro",
  "KSA/feras-albrikan": "firas-al-buraikan",
};

// Preserve reviewed public display names without changing stable identity/card IDs.
const reviewed2026DisplayNameByIdentity: Record<string, string> = {
  "gunok-mert": "Mert Günok",
  "celik-zeki": "Zeki Çelik",
  "akturkoglu-kerem": "Kerem Aktürkoğlu",
  "elmali-eren": "Eren Elmalı",
  "kahveci-irfan-can": "İrfan Can Kahveci",
  "yilmaz-baris-alper": "Barış Alper Yılmaz",
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
  const existingGenerated = existsSync(OUTPUT_FILE)
    ? (JSON.parse(await readFile(OUTPUT_FILE, "utf8")) as GeneratedArchive)
    : undefined;
  const reviewed2026PositionByIdentity = new Map<string, PositionProfile>(
    (existingGenerated?.players ?? [])
      .filter((player) => player.positionSource === "identity-audit")
      .map((player) => [
        player.identityId,
        {
          primaryPosition: player.primaryPosition,
          eligiblePositions: player.eligiblePositions,
          positionSource: "identity-audit" as const,
        },
      ]),
  );
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
    const playerName = playerNameFor(row, teamCode);
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
    const identityId =
      historicalMatch?.identityId ??
      (historical.identities[normalizedIdentityId]
        ? `${normalizedIdentityId}-${teamCode.toLocaleLowerCase()}`
        : normalizedIdentityId);
    const precisePositionProfile = precisePositionProfileFor(
      identityId,
      row.POS,
      historical,
      reviewed2026PositionByIdentity,
    );
    const broadPositions = positionsFor(row.POS);
    return {
      identityId,
      playerName: (reviewed2026DisplayNameByIdentity[identityId] ?? historicalMatch?.playerName ?? playerName).normalize("NFC"),
      teamCode,
      teamName,
      shirtNumber: Number(row["#"]),
      // FIFA's squad PDF exposes only GK/DF/MF/FW. Reviewed 2026 identity-audit
      // positions survive regeneration; requested/historical precision comes next;
      // the broad FIFA bucket is the explicit last resort.
      primaryPosition: precisePositionProfile?.primaryPosition ?? broadPositions[0],
      eligiblePositions:
        precisePositionProfile?.eligiblePositions ?? broadPositions,
      positionSource:
        precisePositionProfile?.positionSource ?? "broad-squad-fallback",
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
        "Normalized official display names with Unicode NFC and normal surname casing; preserved reviewed 2026 position profiles before requested/historical precision; retained FIFA GK/DF/MF/FW only as an explicit broad fallback; retained source spelling for audit.",
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