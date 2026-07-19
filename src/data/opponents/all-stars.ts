import { getFormation } from "@/data/formations";
import { managersById } from "@/data/managers";
import { playersById } from "@/data/players";
import type {
  DraftPick,
  HistoricalWorldCupTeam,
  ManagerTournamentCard,
} from "@/types/game";

const starterPicks: DraftPick[] = [
  { slotId: "gk", cardId: "manuel-neuer-2014" },
  { slotId: "lb", cardId: "paolo-maldini-1994" },
  { slotId: "lcb", cardId: "fabio-cannavaro-2006" },
  { slotId: "rcb", cardId: "franz-beckenbauer-1974" },
  { slotId: "rb", cardId: "cafu-2002" },
  { slotId: "lcm", cardId: "lothar-matthaus-1990" },
  { slotId: "cm", cardId: "xavi-2010" },
  { slotId: "rcm", cardId: "zinedine-zidane-1998" },
  { slotId: "lw", cardId: "kylian-mbappe-2022" },
  { slotId: "st", cardId: "ronaldo-2002" },
  { slotId: "rw", cardId: "lionel-messi-2022" },
];

const substituteCardIds = [
  "pele-1970",
  "diego-maradona-1986",
  "philipp-lahm-2014",
] as const;

const zagallo1970 = managersById.get("mario-zagallo-1970");
if (!zagallo1970) {
  throw new Error("Missing Mário Zagallo Brazil 1970 manager card");
}

export const worldCupAllStarsManager: ManagerTournamentCard & {
  compositeLabel: "Trophy XI original composite manager.";
  eraAdaptability: number;
  substitutionBehavior: string;
} = {
  ...zagallo1970,
  compositeLabel: "Trophy XI original composite manager.",
  eraAdaptability: zagallo1970.eraFitProfile.adaptability,
  substitutionBehavior:
    "Uses the ordered bench to preserve the fluid front line and tournament control.",
};

const formation = getFormation(
  worldCupAllStarsManager.preferredFormations[0],
);

const rationales: Record<string, string> = {
  "manuel-neuer-2014":
    "Sweeping range and distribution let the back line hold an ambitious height.",
  "paolo-maldini-1994":
    "Elite left-side defending balances the attacking front three.",
  "fabio-cannavaro-2006":
    "Tournament reading, recovery, and aerial timing anchor the penalty area.",
  "franz-beckenbauer-1974":
    "Progression from defense connects eras without sacrificing control.",
  "cafu-2002":
    "Repeat width and transition recovery give the right flank two-way force.",
  "lothar-matthaus-1990":
    "Ball-winning range and vertical drive protect the creative midfielders.",
  "xavi-2010":
    "Tempo control makes an all-time collection operate as one team.",
  "zinedine-zidane-1998":
    "Press resistance and final-third creation add central invention.",
  "kylian-mbappe-2022":
    "Natural left-sided depth stretches defenses and supplies elite finishing.",
  "ronaldo-2002":
    "A natural tournament nine converts the volume created around him.",
  "lionel-messi-2022":
    "Right-to-center creation combines control, chance creation, and clutch play.",
  "pele-1970":
    "Bench-one versatility changes either the forward line or the central attack.",
  "diego-maradona-1986":
    "Bench-two creation supplies a radically different match-state solution.",
  "philipp-lahm-2014":
    "Bench-three coverage protects both fullback positions and central midfield.",
};

const lineupCards = starterPicks.map((pick) => {
  const player = playersById.get(pick.cardId);
  const slot = formation.slots.find((candidate) => candidate.id === pick.slotId);
  if (!player || !slot) {
    throw new Error(`Invalid World Cup All-Stars starter ${pick.cardId}`);
  }
  return { player, slot };
});

const substituteCards = substituteCardIds.map((cardId) => {
  const player = playersById.get(cardId);
  if (!player) throw new Error(`Invalid World Cup All-Stars substitute ${cardId}`);
  return player;
});

export const worldCupAllStars: HistoricalWorldCupTeam = {
  id: "world-cup-all-stars",
  kind: "all-stars",
  nationCode: "ALL",
  nationName: "World Cup All-Stars",
  tournamentYear: null,
  confederation: null,
  tournamentFinish: null,
  tournamentStatus: "featured",
  dataStatus: "modeled-lineup",
  managerName: worldCupAllStarsManager.managerName,
  formation: formation.id,
  alternateFormations: worldCupAllStarsManager.acceptableFormations
    .filter((formationId) => formationId !== formation.id)
    .slice(0, 2),
  startingLineup: lineupCards.map(({ player, slot }) => ({
    playerIdentityId: player.playerIdentityId,
    name: `${player.playerName} ${player.tournamentYear}`,
    position: slot.position,
  })),
  substitutes: substituteCards.map((player) => ({
    playerIdentityId: player.playerIdentityId,
    name: `${player.playerName} ${player.tournamentYear}`,
    position: player.primaryPosition,
  })),
  tacticalProfile:
    "Adaptive 4–3–3 control, elite rest defense, and three distinct bench responses",
  ratings: {
    attack: 97,
    midfield: 97,
    defense: 96,
    goalkeeper: 96,
    depth: 97,
    overall: 97,
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
  sources: [],
  originalRatings: true,
  formationIsModel: true,
  difficulty: "Mythic",
  allStars: {
    subtitle: "The greatest tournament versions in one squad.",
    starterPicks,
    substituteCardIds,
    manager: worldCupAllStarsManager,
    chemistry: 98,
    mythicModifier: {
      attack: 1.5,
      midfield: 1.5,
      defense: 1.5,
      maximum: 2,
    },
    rationales,
  },
};
