import { writeFile } from "node:fs/promises";
import careerArchiveJson from "../src/data/player-career.generated.json";
import tournamentArchiveJson from "../src/data/player-tournaments.generated.json";
import requestedIdentityJson from "../src/data/requested-player-identities.generated.json";
import completed2026RosterJson from "../src/data/player-tournaments-2026.generated.json";
import fbrefPlayerMapJson from "../data/sources/fbref/player-map.json";
import careerCurationJson from "./player-career-curation.json";

type CareerEntry = {
  careerStats: null | (Record<string, unknown> & {
    sourceName?: string;
    sourceUrl?: string;
    coverageNote?: string;
  });
  accolades: Array<
    Record<string, unknown> & {
      sourceName?: string;
      sourceUrl?: string;
      description?: string;
      id?: string;
      label?: string;
    }
  >;
  top100Player: boolean;
  top100Source?: Record<string, unknown>;
};

const archive = careerArchiveJson as {
  version: number;
  generatedAt: string;
  players: Record<string, CareerEntry>;
};
type TournamentRecord = {
  tournamentYear: number;
  teamCode: string;
  teamName: string;
  teamPerformance: string;
  appearances: number;
  starts: number;
  goals: number;
  awards: Array<{ id: string; label: string; shared: boolean }>;
};
const tournamentArchive = tournamentArchiveJson as {
  source: { accessedOn: string; url: string };
  identities: Record<string, TournamentRecord[]>;
};
const requestedIdentities = requestedIdentityJson as {
  identities: Array<{ identityId: string }>;
};
const completed2026Roster = completed2026RosterJson as {
  source: { name: string; url: string };
  players: Array<{
    identityId: string;
    playerName: string;
    teamCode: string;
    teamName: string;
  }>;
};
const fbrefPlayerMap = fbrefPlayerMapJson as Array<{
  playerIdentityId: string;
  sourceUrl: string;
}>;
const careerCuration = careerCurationJson as {
  supplementaryAccolades: Record<string, CareerEntry["accolades"]>;
};
const fbrefSourceByIdentity = new Map(
  fbrefPlayerMap.map((mapping) => [
    mapping.playerIdentityId,
    mapping.sourceUrl,
  ]),
);
const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const completed2026ByIdentity = new Map(
  completed2026Roster.players.map((player) => [
    player.identityId,
    {
      playerName: player.playerName,
      nation: player.teamCode,
      teamName: player.teamName,
    },
  ]),
);

const allIdentityIds = new Set([
  ...Object.keys(tournamentArchive.identities),
  ...requestedIdentities.identities.map((identity) => identity.identityId),
  ...completed2026Roster.players.map((player) => player.identityId),
]);

const completed2026AwardByIdentity: Record<
  string,
  { label: string; category: "individual" }[]
> = {
  rodri: [{ label: "World Cup Golden Ball", category: "individual" }],
  "kylian-mbappe": [
    { label: "World Cup Golden Boot", category: "individual" },
  ],
  "unai-simon": [
    { label: "World Cup Golden Glove", category: "individual" },
  ],
  "pau-cubarsi": [
    { label: "World Cup Young Player Award", category: "individual" },
  ],
  "jude-bellingham": [
    { label: "World Cup Bronze Boot", category: "individual" },
  ],
};
const worldCupChampionByYear: Record<number, string> = {
  1970: "BRA",
  1974: "GER",
  1978: "ARG",
  1982: "ITA",
  1986: "ARG",
  1990: "GER",
  1994: "BRA",
  1998: "FRA",
  2002: "BRA",
  2006: "ITA",
  2010: "ESP",
  2014: "GER",
  2018: "FRA",
  2022: "ARG",
  2026: "ESP",
};

const players = Object.fromEntries(
  [...allIdentityIds].sort().map((identityId) => {
    const current = archive.players[identityId];
    const tournaments = tournamentArchive.identities[identityId] ?? [];
    const completed2026 = completed2026ByIdentity.get(identityId);
    const fbrefSourceUrl = fbrefSourceByIdentity.get(identityId);
    const worldCupAppearances = tournaments.reduce(
      (total, tournament) => total + tournament.appearances,
      0,
    );
    const worldCupGoals = tournaments.reduce(
      (total, tournament) => total + tournament.goals,
      0,
    );

    const careerStats =
      current?.careerStats
        ? {
            ...current.careerStats,
            sourceName:
              current.careerStats.sourceName ?? "Historical archive",
            ...(current.careerStats.sourceName === "FBref" && fbrefSourceUrl
              ? { sourceUrl: fbrefSourceUrl }
              : {}),
            coverageNote:
              "Coverage varies by competition and era; null values remain unknown.",
          }
        : {
            clubAppearances: null,
            clubGoals: null,
            clubAssists: null,
            nationalTeamAppearances:
              tournaments.length > 0 ? worldCupAppearances : null,
            nationalTeamGoals: tournaments.length > 0 ? worldCupGoals : null,
            sourceName: "World Cup archive",
            retrievedOn: "2026-07-21",
            coverageNote:
              "National-team totals cover World Cup tournament appearances and goals in the local archive; other competitions remain unknown.",
            competitionStats: [
              ...tournaments.map((tournament) => ({
                id: `world-cup-${tournament.tournamentYear}`,
                season: String(tournament.tournamentYear),
                competition: "World Cup",
                scope: "international",
                squad: tournament.teamName,
                appearances: tournament.appearances,
                goals: tournament.goals,
                assists: null,
              })),
              ...(completed2026
                ? [
                    {
                      id: "world-cup-2026",
                      season: "2026",
                      competition: "World Cup",
                      scope: "international",
                      squad: completed2026.teamName,
                      appearances: null,
                      goals: null,
                      assists: null,
                    },
                  ]
                : []),
            ],
          };

    const normalizedExisting = (current?.accolades ?? [])
      .filter(
        (accolade) =>
          accolade.id !== "world-cup-participant" &&
          accolade.label !== "World Cup Participant" &&
          !accolade.id?.startsWith("world-cup-squad-") &&
          !accolade.label?.startsWith("World Cup Squad — "),
      )
      .map((accolade) => {
        const datedFbrefHonor =
          accolade.sourceName === "FBref"
            ? accolade.description?.match(
                /(?:FBref profile honor:|Historical record:)\s*(\d{4}(?:-\d{2,4})?)\s+/i,
              )
            : undefined;
        const season = datedFbrefHonor?.[1];
        return {
          ...accolade,
          ...(season && !accolade.label?.includes(`— ${season}`)
            ? {
                id: `${accolade.id}-${slugify(season)}`,
                label: `${accolade.label} — ${season}`,
              }
            : {}),
          ...(accolade.sourceName === "FBref" && fbrefSourceUrl
            ? { sourceUrl: fbrefSourceUrl }
            : {}),
          sourceName: accolade.sourceName ?? "Historical archive",
          description: accolade.description?.replace(
            /^.*? profile honor:\s*/i,
            "FBref profile honor: ",
          ),
        };
      });
    const tournamentAwards = tournaments.flatMap((tournament) =>
      tournament.awards.map((award) => ({
        id: `world-cup-${tournament.tournamentYear}-${slugify(award.label)}`,
        label: `${award.label} — ${tournament.tournamentYear}`,
        category: "individual",
        sourceName: "World Cup archive",
        sourceUrl: tournamentArchive.source.url,
        verified: true,
        description: `${award.shared ? "Shared " : ""}${award.label} at the ${tournament.tournamentYear} World Cup.`,
      })),
    );
    const completedAwards = (completed2026AwardByIdentity[identityId] ?? []).map(
      (award) => ({
        id: `world-cup-2026-${slugify(award.label)}`,
        label: `${award.label} — 2026`,
        category: award.category,
          sourceName: "Completed 2026 archive",
          sourceUrl: completed2026Roster.source.url,
        verified: true,
        description: `${award.label} at the 2026 World Cup.`,
      }),
    );
    const historicalFinishAccolades = tournaments.flatMap((tournament) => {
      if (tournament.teamPerformance !== "final") return [];
      const champion =
        worldCupChampionByYear[tournament.tournamentYear] ===
        tournament.teamCode;
      return [
        {
          id: `world-cup-${champion ? "winner" : "runner-up"}-${tournament.tournamentYear}`,
          label: `World Cup ${champion ? "Winner" : "Runner-up"} — ${tournament.tournamentYear}`,
          category: "international",
          sourceName: "The Fjelstul World Cup Database",
          sourceUrl: tournamentArchive.source.url,
          verified: true,
          description: `Member of ${tournament.teamName}'s ${tournament.tournamentYear} World Cup ${champion ? "winning" : "runner-up"} squad.`,
        },
      ];
    });
    const completedFinishAccolades = completed2026
      ? completed2026.nation === "ESP"
        ? [
            {
              id: "world-cup-champion-2026",
              label: "World Cup Winner — 2026",
              category: "international",
              sourceName: "Completed 2026 archive",
              sourceUrl: completed2026Roster.source.url,
              verified: true,
              description: "Member of Spain's 2026 World Cup-winning squad.",
            },
          ]
        : completed2026.nation === "ARG"
          ? [
              {
                id: "world-cup-runner-up-2026",
                label: "World Cup Runner-up — 2026",
                category: "international",
                sourceName: "Completed 2026 archive",
                sourceUrl: completed2026Roster.source.url,
                verified: true,
                description: "Member of Argentina's 2026 runner-up squad.",
              },
            ]
          : []
      : [];
    const accoladesById = new Map(
      [
        ...normalizedExisting,
        ...tournamentAwards,
        ...historicalFinishAccolades,
        ...completedFinishAccolades,
        ...completedAwards,
        ...(careerCuration.supplementaryAccolades[identityId] ?? []),
      ].map((accolade) => [accolade.id, accolade]),
    );

    return [
      identityId,
      {
        ...(current ?? { top100Player: false }),
        careerStats,
        accolades: [...accoladesById.values()],
      },
    ];
  }),
);

const main = async () => {
  await writeFile(
    new URL("../src/data/player-career.generated.json", import.meta.url),
    `${JSON.stringify(
      {
        ...archive,
        generatedAt: new Date().toISOString(),
        players,
      },
      null,
      2,
    )}\n`,
  );

  console.log(
    `Normalized career records for ${allIdentityIds.size} identities.`,
  );
};

void main();
