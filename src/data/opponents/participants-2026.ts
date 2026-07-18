import type {
  Confederation,
  DataCitation,
  FormationId,
  HistoricalWorldCupTeam,
} from "@/types/game";

export const worldCup2026ParticipantSource: DataCitation = {
  label: "Qualified teams for the FIFA World Cup 2026",
  url: "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/world-cup-2026-who-has-qualified",
  publisher: "FIFA",
  accessedOn: "2026-07-18",
};

const participants = [
  ["Algeria", "ALG", "CAF"],
  ["Argentina", "ARG", "CONMEBOL"],
  ["Australia", "AUS", "AFC"],
  ["Austria", "AUT", "UEFA"],
  ["Belgium", "BEL", "UEFA"],
  ["Bosnia and Herzegovina", "BIH", "UEFA"],
  ["Brazil", "BRA", "CONMEBOL"],
  ["Cabo Verde", "CPV", "CAF"],
  ["Canada", "CAN", "CONCACAF"],
  ["Colombia", "COL", "CONMEBOL"],
  ["Congo DR", "COD", "CAF"],
  ["Côte d'Ivoire", "CIV", "CAF"],
  ["Curaçao", "CUW", "CONCACAF"],
  ["Croatia", "CRO", "UEFA"],
  ["Czechia", "CZE", "UEFA"],
  ["Ecuador", "ECU", "CONMEBOL"],
  ["Egypt", "EGY", "CAF"],
  ["England", "ENG", "UEFA"],
  ["France", "FRA", "UEFA"],
  ["Germany", "GER", "UEFA"],
  ["Ghana", "GHA", "CAF"],
  ["Haiti", "HAI", "CONCACAF"],
  ["IR Iran", "IRN", "AFC"],
  ["Iraq", "IRQ", "AFC"],
  ["Japan", "JPN", "AFC"],
  ["Jordan", "JOR", "AFC"],
  ["Korea Republic", "KOR", "AFC"],
  ["Mexico", "MEX", "CONCACAF"],
  ["Morocco", "MAR", "CAF"],
  ["Netherlands", "NED", "UEFA"],
  ["New Zealand", "NZL", "OFC"],
  ["Norway", "NOR", "UEFA"],
  ["Panama", "PAN", "CONCACAF"],
  ["Paraguay", "PAR", "CONMEBOL"],
  ["Portugal", "POR", "UEFA"],
  ["Qatar", "QAT", "AFC"],
  ["Saudi Arabia", "KSA", "AFC"],
  ["Scotland", "SCO", "UEFA"],
  ["Senegal", "SEN", "CAF"],
  ["South Africa", "RSA", "CAF"],
  ["Spain", "ESP", "UEFA"],
  ["Sweden", "SWE", "UEFA"],
  ["Switzerland", "SUI", "UEFA"],
  ["Tunisia", "TUN", "CAF"],
  ["Türkiye", "TUR", "UEFA"],
  ["USA", "USA", "CONCACAF"],
  ["Uruguay", "URU", "CONMEBOL"],
  ["Uzbekistan", "UZB", "AFC"],
] as const satisfies ReadonlyArray<
  readonly [string, string, Confederation]
>;

const formations: FormationId[] = [
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

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const worldCup2026Participants: HistoricalWorldCupTeam[] =
  participants.map(([nationName, nationCode, confederation], index) => {
    // These are explicitly Trophy XI model values, not current tournament stats.
    const phaseOffset = (index * 7) % 5;
    const base = 80 + (index % 4);
    const attack = base + phaseOffset;
    const midfield = base + ((phaseOffset + 2) % 5);
    const defense = base + ((phaseOffset + 4) % 5);
    const goalkeeper = base + ((phaseOffset + 1) % 5);
    const depth = base + ((phaseOffset + 3) % 5);
    const overall = Math.round(
      attack * 0.26 +
        midfield * 0.25 +
        defense * 0.27 +
        goalkeeper * 0.14 +
        depth * 0.08,
    );
    return {
      id: `${slugify(nationName)}-2026`,
      kind: "historical",
      nationCode,
      nationName,
      tournamentYear: 2026,
      confederation,
      tournamentFinish: null,
      tournamentStatus: "in-progress",
      dataStatus: "modeled-lineup",
      managerName: null,
      formation: formations[index % formations.length],
      alternateFormations: [],
      startingLineup: [],
      substitutes: [],
      tacticalProfile:
        "Tournament-in-progress participant with a clearly labeled Trophy XI tactical model",
      ratings: {
        attack,
        midfield,
        defense,
        goalkeeper,
        depth,
        overall,
      },
      tournamentStats: {
        matches: null,
        wins: null,
        draws: null,
        losses: null,
        goalsFor: null,
        goalsAgainst: null,
        cleanSheets: null,
      },
      sources: [worldCup2026ParticipantSource],
      originalRatings: true,
      formationIsModel: true,
      difficulty:
        overall >= 86 ? "Elite" : overall >= 82 ? "Contender" : "Underdog",
    };
  });
