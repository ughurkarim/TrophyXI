import { tournamentEraFor } from "@/data/eras";
import type {
  FormationId,
  ManagerStyle,
  ManagerTournamentCard,
  QualityBand,
} from "@/types/game";

type ManagerSeed = {
  id: string;
  managerIdentityId: string;
  managerName: string;
  countryCode: string;
  countryName: string;
  tournamentYear: number;
  teamName: string;
  style: ManagerStyle;
  preferredFormations: FormationId[];
  qualityBand: QualityBand;
  tacticalIdentity: string;
};

const seeds: ManagerSeed[] = [
  { id: "aime-jacquet-1998", managerIdentityId: "aime-jacquet", managerName: "Aimé Jacquet", countryCode: "FRA", countryName: "France", tournamentYear: 1998, teamName: "France", style: "balanced", preferredFormations: ["4-2-3-1", "4-3-3"], qualityBand: "iconic", tacticalIdentity: "Authority, balance, and a protected creator" },
  { id: "mario-zagallo-1998", managerIdentityId: "mario-zagallo", managerName: "Mário Zagallo", countryCode: "BRA", countryName: "Brazil", tournamentYear: 1998, teamName: "Brazil", style: "fluid", preferredFormations: ["4-4-2", "4-3-3"], qualityBand: "elite", tacticalIdentity: "Freedom between the lines and attacking width" },
  { id: "guus-hiddink-1998", managerIdentityId: "guus-hiddink", managerName: "Guus Hiddink", countryCode: "NED", countryName: "Netherlands", tournamentYear: 1998, teamName: "Netherlands", style: "pressing", preferredFormations: ["4-3-3", "3-5-2"], qualityBand: "elite", tacticalIdentity: "Proactive pressure with technical rotations" },
  { id: "guus-hiddink-2002", managerIdentityId: "guus-hiddink", managerName: "Guus Hiddink", countryCode: "NED", countryName: "Netherlands", tournamentYear: 2002, teamName: "South Korea", style: "pressing", preferredFormations: ["3-5-2", "4-3-3"], qualityBand: "iconic", tacticalIdentity: "Relentless running and fearless front-foot pressure" },
  { id: "luiz-felipe-scolari-2002", managerIdentityId: "luiz-felipe-scolari", managerName: "Luiz Felipe Scolari", countryCode: "BRA", countryName: "Brazil", tournamentYear: 2002, teamName: "Brazil", style: "fluid", preferredFormations: ["3-5-2", "4-3-3"], qualityBand: "iconic", tacticalIdentity: "A liberated front three backed by hardened structure" },
  { id: "luiz-felipe-scolari-2006", managerIdentityId: "luiz-felipe-scolari", managerName: "Luiz Felipe Scolari", countryCode: "BRA", countryName: "Brazil", tournamentYear: 2006, teamName: "Portugal", style: "counter", preferredFormations: ["4-2-3-1", "4-3-3"], qualityBand: "elite", tacticalIdentity: "Emotional control and ruthless transition play" },
  { id: "rudi-voller-2002", managerIdentityId: "rudi-voller", managerName: "Rudi Völler", countryCode: "GER", countryName: "Germany", tournamentYear: 2002, teamName: "Germany", style: "direct", preferredFormations: ["3-5-2", "4-4-2"], qualityBand: "standout", tacticalIdentity: "Compact foundations and direct tournament efficiency" },
  { id: "bruno-metsu-2002", managerIdentityId: "bruno-metsu", managerName: "Bruno Metsu", countryCode: "FRA", countryName: "France", tournamentYear: 2002, teamName: "Senegal", style: "counter", preferredFormations: ["4-4-2", "4-3-3"], qualityBand: "standout", tacticalIdentity: "Collective belief with explosive counterattacks" },
  { id: "marcelo-bielsa-2002", managerIdentityId: "marcelo-bielsa", managerName: "Marcelo Bielsa", countryCode: "ARG", countryName: "Argentina", tournamentYear: 2002, teamName: "Argentina", style: "pressing", preferredFormations: ["3-5-2", "4-3-3"], qualityBand: "elite", tacticalIdentity: "High-risk pressure and constant positional exchange" },
  { id: "marcello-lippi-2006", managerIdentityId: "marcello-lippi", managerName: "Marcello Lippi", countryCode: "ITA", countryName: "Italy", tournamentYear: 2006, teamName: "Italy", style: "balanced", preferredFormations: ["4-2-3-1", "4-4-2"], qualityBand: "iconic", tacticalIdentity: "Elite defensive organization with adaptable attack" },
  { id: "jurgen-klinsmann-2006", managerIdentityId: "jurgen-klinsmann", managerName: "Jürgen Klinsmann", countryCode: "GER", countryName: "Germany", tournamentYear: 2006, teamName: "Germany", style: "pressing", preferredFormations: ["4-4-2", "4-3-3"], qualityBand: "standout", tacticalIdentity: "Youthful intensity and vertical attacking intent" },
  { id: "raymond-domenech-2006", managerIdentityId: "raymond-domenech", managerName: "Raymond Domenech", countryCode: "FRA", countryName: "France", tournamentYear: 2006, teamName: "France", style: "defensive", preferredFormations: ["4-2-3-1", "4-4-2"], qualityBand: "standout", tacticalIdentity: "Veteran control protected by a disciplined block" },
  { id: "jose-pekerman-2006", managerIdentityId: "jose-pekerman", managerName: "José Pékerman", countryCode: "ARG", countryName: "Argentina", tournamentYear: 2006, teamName: "Argentina", style: "possession", preferredFormations: ["4-3-3", "4-2-3-1"], qualityBand: "elite", tacticalIdentity: "Patient combinations and technically rich midfield play" },
  { id: "vicente-del-bosque-2010", managerIdentityId: "vicente-del-bosque", managerName: "Vicente del Bosque", countryCode: "ESP", countryName: "Spain", tournamentYear: 2010, teamName: "Spain", style: "possession", preferredFormations: ["4-2-3-1", "4-3-3"], qualityBand: "iconic", tacticalIdentity: "Supreme ball control and positional patience" },
  { id: "vicente-del-bosque-2014", managerIdentityId: "vicente-del-bosque", managerName: "Vicente del Bosque", countryCode: "ESP", countryName: "Spain", tournamentYear: 2014, teamName: "Spain", style: "possession", preferredFormations: ["4-3-3", "4-2-3-1"], qualityBand: "reliable", tacticalIdentity: "Possession orthodoxy and trusted combinations" },
  { id: "joachim-low-2010", managerIdentityId: "joachim-low", managerName: "Joachim Löw", countryCode: "GER", countryName: "Germany", tournamentYear: 2010, teamName: "Germany", style: "counter", preferredFormations: ["4-2-3-1", "4-3-3"], qualityBand: "elite", tacticalIdentity: "Fast young combinations launched from compact shape" },
  { id: "joachim-low-2014", managerIdentityId: "joachim-low", managerName: "Joachim Löw", countryCode: "GER", countryName: "Germany", tournamentYear: 2014, teamName: "Germany", style: "possession", preferredFormations: ["4-3-3", "4-2-3-1"], qualityBand: "iconic", tacticalIdentity: "Technical control with ruthless positional flexibility" },
  { id: "oscar-tabarez-2010", managerIdentityId: "oscar-tabarez", managerName: "Óscar Tabárez", countryCode: "URU", countryName: "Uruguay", tournamentYear: 2010, teamName: "Uruguay", style: "counter", preferredFormations: ["4-4-2", "3-5-2"], qualityBand: "elite", tacticalIdentity: "Collective sacrifice and decisive forward combinations" },
  { id: "herve-renard-2022", managerIdentityId: "herve-renard", managerName: "Hervé Renard", countryCode: "FRA", countryName: "France", tournamentYear: 2022, teamName: "Saudi Arabia", style: "counter", preferredFormations: ["4-2-3-1", "4-4-2"], qualityBand: "standout", tacticalIdentity: "Fearless compactness and perfectly timed transition attacks" },
  { id: "alejandro-sabella-2014", managerIdentityId: "alejandro-sabella", managerName: "Alejandro Sabella", countryCode: "ARG", countryName: "Argentina", tournamentYear: 2014, teamName: "Argentina", style: "counter", preferredFormations: ["4-3-3", "4-4-2"], qualityBand: "elite", tacticalIdentity: "Defensive clarity serving a singular creative force" },
  { id: "louis-van-gaal-2014", managerIdentityId: "louis-van-gaal", managerName: "Louis van Gaal", countryCode: "NED", countryName: "Netherlands", tournamentYear: 2014, teamName: "Netherlands", style: "direct", preferredFormations: ["3-5-2", "4-3-3"], qualityBand: "elite", tacticalIdentity: "Opponent-specific structure and vertical precision" },
  { id: "didier-deschamps-2018", managerIdentityId: "didier-deschamps", managerName: "Didier Deschamps", countryCode: "FRA", countryName: "France", tournamentYear: 2018, teamName: "France", style: "counter", preferredFormations: ["4-2-3-1", "4-3-3"], qualityBand: "iconic", tacticalIdentity: "Controlled space and devastating transition speed" },
  { id: "didier-deschamps-2022", managerIdentityId: "didier-deschamps", managerName: "Didier Deschamps", countryCode: "FRA", countryName: "France", tournamentYear: 2022, teamName: "France", style: "balanced", preferredFormations: ["4-2-3-1", "4-3-3"], qualityBand: "elite", tacticalIdentity: "Adaptable structure around elite final-third talent" },
  { id: "zlatko-dalic-2018", managerIdentityId: "zlatko-dalic", managerName: "Zlatko Dalić", countryCode: "CRO", countryName: "Croatia", tournamentYear: 2018, teamName: "Croatia", style: "possession", preferredFormations: ["4-3-3", "4-2-3-1"], qualityBand: "elite", tacticalIdentity: "Midfield authority and remarkable knockout endurance" },
  { id: "zlatko-dalic-2022", managerIdentityId: "zlatko-dalic", managerName: "Zlatko Dalić", countryCode: "CRO", countryName: "Croatia", tournamentYear: 2022, teamName: "Croatia", style: "balanced", preferredFormations: ["4-3-3", "4-2-3-1"], qualityBand: "elite", tacticalIdentity: "Calm midfield circulation and shootout resilience" },
  { id: "tite-2022", managerIdentityId: "tite", managerName: "Tite", countryCode: "BRA", countryName: "Brazil", tournamentYear: 2022, teamName: "Brazil", style: "possession", preferredFormations: ["4-3-3", "4-2-3-1"], qualityBand: "standout", tacticalIdentity: "Positional attack anchored by transition security" },
  { id: "lionel-scaloni-2022", managerIdentityId: "lionel-scaloni", managerName: "Lionel Scaloni", countryCode: "ARG", countryName: "Argentina", tournamentYear: 2022, teamName: "Argentina", style: "fluid", preferredFormations: ["4-3-3", "4-4-2"], qualityBand: "iconic", tacticalIdentity: "Collective intensity and flexible support for genius" },
  { id: "walid-regragui-2022", managerIdentityId: "walid-regragui", managerName: "Walid Regragui", countryCode: "MAR", countryName: "Morocco", tournamentYear: 2022, teamName: "Morocco", style: "defensive", preferredFormations: ["4-3-3", "4-2-3-1"], qualityBand: "elite", tacticalIdentity: "Compact courage and explosive wide transitions" },
];

const modifierFor = (style: ManagerStyle) => {
  switch (style) {
    case "possession":
      return { attack: 0.3, midfield: 1.2, defense: 0.2, clutch: 0.2 };
    case "pressing":
      return { attack: 0.8, midfield: 0.6, defense: 0.1, clutch: 0.3 };
    case "counter":
      return { attack: 1.1, midfield: 0.1, defense: 0.3, clutch: 0.5 };
    case "defensive":
      return { attack: -0.2, midfield: 0.3, defense: 1.2, clutch: 0.4 };
    case "direct":
      return { attack: 0.9, midfield: -0.1, defense: 0.5, clutch: 0.3 };
    case "fluid":
      return { attack: 0.8, midfield: 0.7, defense: 0.1, clutch: 0.4 };
    default:
      return { attack: 0.4, midfield: 0.4, defense: 0.4, clutch: 0.4 };
  }
};

const styleFormations: Record<ManagerStyle, FormationId[]> = {
  possession: ["4-3-3", "4-2-3-1", "4-1-4-1", "4-3-1-2", "4-5-1"],
  pressing: ["4-3-3", "4-2-3-1", "3-4-3", "3-4-2-1", "4-1-4-1"],
  counter: ["4-2-3-1", "4-4-2", "3-5-2", "5-3-2", "5-2-3"],
  defensive: ["4-4-2", "4-5-1", "5-3-2", "5-2-3", "3-4-2-1"],
  balanced: ["4-3-3", "4-2-3-1", "4-4-2", "4-1-4-1", "5-3-2"],
  direct: ["4-4-2", "3-5-2", "4-2-2-2", "5-3-2", "5-2-3"],
  fluid: ["4-3-3", "3-5-2", "3-4-3", "3-4-2-1", "4-3-1-2"],
};

const qualityBase: Record<QualityBand, number> = {
  iconic: 93,
  elite: 88,
  standout: 83,
  reliable: 78,
  "role-player": 72,
  limited: 64,
};

const gradesFor = (seed: ManagerSeed) => {
  const base = qualityBase[seed.qualityBand];
  const offenseStyle = {
    possession: 3,
    pressing: 4,
    counter: 3,
    defensive: -5,
    balanced: 0,
    direct: 2,
    fluid: 5,
  }[seed.style];
  const defenseStyle = {
    possession: 1,
    pressing: 2,
    counter: 2,
    defensive: 5,
    balanced: 2,
    direct: 0,
    fluid: -1,
  }[seed.style];
  return {
    offense: Math.min(98, base + offenseStyle),
    defense: Math.min(98, base + defenseStyle),
  };
};

export const managerGradeLabel = (value: number) => {
  if (value >= 95) return "S";
  if (value >= 92) return "A+";
  if (value >= 88) return "A";
  if (value >= 85) return "A-";
  if (value >= 82) return "B+";
  if (value >= 78) return "B";
  if (value >= 75) return "B-";
  if (value >= 72) return "C+";
  if (value >= 68) return "C";
  if (value >= 65) return "C-";
  if (value >= 55) return "D";
  return "F";
};

export const managers: ManagerTournamentCard[] = seeds.map((seed) => ({
  ...seed,
  acceptableFormations: [
    ...new Set([...seed.preferredFormations, ...styleFormations[seed.style]]),
  ],
  era: tournamentEraFor(seed.tournamentYear),
  description: `${seed.teamName} ${seed.tournamentYear} · ${seed.tacticalIdentity}.`,
  simulationModifier: modifierFor(seed.style),
  grades: gradesFor(seed),
  leadership: Math.min(98, qualityBase[seed.qualityBand] + 2),
  gameManagement: Math.min(
    98,
    qualityBase[seed.qualityBand] +
      (["balanced", "defensive", "counter"].includes(seed.style) ? 3 : 0),
  ),
  imageId: seed.id,
  achievements: [],
}));

export const managersById = new Map(managers.map((manager) => [manager.id, manager]));
