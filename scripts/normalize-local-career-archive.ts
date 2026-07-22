import { writeFile } from "node:fs/promises";
import careerArchiveJson from "../src/data/player-career.generated.json";
import tournamentArchiveJson from "../src/data/player-tournaments.generated.json";
import requestedIdentityJson from "../src/data/requested-player-identities.generated.json";
import { completed2026PlayerSeeds } from "../src/data/player-tournaments-2026";

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
  source: { accessedOn: string };
  identities: Record<string, TournamentRecord[]>;
};
const requestedIdentities = requestedIdentityJson as {
  identities: Array<{ identityId: string }>;
};
const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const completed2026ByIdentity = new Map(
  completed2026PlayerSeeds.map(([playerName, nation]) => [
    slugify(playerName),
    { playerName, nation },
  ]),
);

const allIdentityIds = new Set([
  ...Object.keys(archive.players),
  ...Object.keys(tournamentArchive.identities),
  ...requestedIdentities.identities.map((identity) => identity.identityId),
  ...completed2026PlayerSeeds.map(([playerName]) => slugify(playerName)),
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

const withoutSourceUrl = <T extends object>(value: T) => {
  const normalized = { ...value } as T & { sourceUrl?: string };
  delete normalized.sourceUrl;
  return normalized;
};

const players = Object.fromEntries(
  [...allIdentityIds].sort().map((identityId) => {
    const current = archive.players[identityId];
    const tournaments = tournamentArchive.identities[identityId] ?? [];
    const completed2026 = completed2026ByIdentity.get(identityId);
    const worldCupEditions = tournaments.length + (completed2026 ? 1 : 0);
    const worldCupAppearances = tournaments.reduce(
      (total, tournament) => total + tournament.appearances,
      0,
    );
    const worldCupGoals = tournaments.reduce(
      (total, tournament) => total + tournament.goals,
      0,
    );

    const careerStats = withoutSourceUrl(
      current?.careerStats
        ? {
            ...current.careerStats,
            sourceName: "Historical archive",
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
                      squad: completed2026.nation,
                      appearances: null,
                      goals: null,
                      assists: null,
                    },
                  ]
                : []),
            ],
          },
    );

    const normalizedExisting = (current?.accolades ?? []).map((accolade) =>
      withoutSourceUrl({
        ...accolade,
        sourceName: "Historical archive",
        description: accolade.description?.replace(
          /^.*? profile honor:\s*/i,
          "Historical record: ",
        ),
      }),
    );
    const tournamentAwards = tournaments.flatMap((tournament) =>
      tournament.awards.map((award) => ({
        id: `world-cup-${slugify(award.label)}`,
        label: award.label,
        category: "individual",
        sourceName: "World Cup archive",
        verified: true,
        description: `${award.shared ? "Shared " : ""}${award.label} at the ${tournament.tournamentYear} World Cup.`,
      })),
    );
    const completedAwards = (completed2026AwardByIdentity[identityId] ?? []).map(
      (award) => ({
        id: `world-cup-2026-${slugify(award.label)}`,
        label: award.label,
        category: award.category,
        sourceName: "Completed 2026 archive",
        verified: true,
        description: `${award.label} at the 2026 World Cup.`,
      }),
    );
    const finishAccolades = completed2026
      ? completed2026.nation === "ESP"
        ? [
            {
              id: "world-cup-champion-2026",
              label: "World Cup Champion",
              category: "international",
              sourceName: "Completed 2026 archive",
              verified: true,
              description: "Member of Spain's 2026 World Cup-winning squad.",
            },
          ]
        : completed2026.nation === "ARG"
          ? [
              {
                id: "world-cup-runner-up-2026",
                label: "World Cup Runner-up",
                category: "international",
                sourceName: "Completed 2026 archive",
                verified: true,
                description: "Member of Argentina's 2026 runner-up squad.",
              },
            ]
          : []
      : [];
    const participant = {
      id: "world-cup-participant",
      label: "World Cup Participant",
      count: worldCupEditions,
      category: "international",
      sourceName: "World Cup archive",
      verified: true,
      description: `Named in ${worldCupEditions} World Cup squad${worldCupEditions === 1 ? "" : "s"}.`,
    };
    const accoladesById = new Map(
      [
        ...tournamentAwards,
        ...finishAccolades,
        ...completedAwards,
        ...normalizedExisting,
        participant,
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
