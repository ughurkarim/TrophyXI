import { playerSeedSchema } from "@/lib/validation";
import {
  playerCareerDataByIdentityId,
  playerDisplayAccoladesByIdentityId,
} from "@/data/player-career-data";
import tournamentArchiveJson from "@/data/player-tournaments.generated.json";
import requestedIdentityJson from "@/data/requested-player-identities.generated.json";
import { completed2026PlayerRatings } from "@/data/player-tournaments-2026";
import completed2026RosterJson from "@/data/player-tournaments-2026.generated.json";
import { historicalWorldCupTournamentStatsByCard } from "@/data/historical-world-cup-tournament-stats.by-card.generated";
import { worldCup2026GoalkeeperStats } from "@/data/world-cup-2026-goalkeeper-stats.generated";
import type {
  Confederation,
  DataCitation,
  PlayerAttributes,
  PlayerTournamentCard,
  PlayerStatusTier,
  Position,
  QualityBand,
  EraLegacy,
  EraTranslationProfile,
  TournamentAchievement,
  TournamentFinish,
  TournamentStatLine,
} from "@/types/game";
import { tournamentEraFor } from "@/data/eras";

// Every number below is an original Trophy XI simulation value. These are not
// official ratings and should not be interpreted as career or historical claims.

type Nation = {
  code: string;
  name: string;
  confederation: Confederation;
};

const nations: Record<string, Nation> = {
  AGO: { code: "AGO", name: "Angola", confederation: "CAF" },
  ARE: { code: "ARE", name: "United Arab Emirates", confederation: "AFC" },
  ARG: { code: "ARG", name: "Argentina", confederation: "CONMEBOL" },
  ALG: { code: "ALG", name: "Algeria", confederation: "CAF" },
  AUS: { code: "AUS", name: "Australia", confederation: "AFC" },
  AUT: { code: "AUT", name: "Austria", confederation: "UEFA" },
  BEL: { code: "BEL", name: "Belgium", confederation: "UEFA" },
  BIH: { code: "BIH", name: "Bosnia and Herzegovina", confederation: "UEFA" },
  BOL: { code: "BOL", name: "Bolivia", confederation: "CONMEBOL" },
  BRA: { code: "BRA", name: "Brazil", confederation: "CONMEBOL" },
  BUL: { code: "BUL", name: "Bulgaria", confederation: "UEFA" },
  CHI: { code: "CHI", name: "Chile", confederation: "CONMEBOL" },
  CMR: { code: "CMR", name: "Cameroon", confederation: "CAF" },
  CAN: { code: "CAN", name: "Canada", confederation: "CONCACAF" },
  CHN: { code: "CHN", name: "China", confederation: "AFC" },
  CPV: { code: "CPV", name: "Cabo Verde", confederation: "CAF" },
  COL: { code: "COL", name: "Colombia", confederation: "CONMEBOL" },
  CRC: { code: "CRC", name: "Costa Rica", confederation: "CONCACAF" },
  CRO: { code: "CRO", name: "Croatia", confederation: "UEFA" },
  COD: { code: "COD", name: "Congo DR", confederation: "CAF" },
  CZE: { code: "CZE", name: "Czech Republic", confederation: "UEFA" },
  CUW: { code: "CUW", name: "Curaçao", confederation: "CONCACAF" },
  CSK: { code: "CSK", name: "Czechoslovakia", confederation: "UEFA" },
  DDR: { code: "DDR", name: "East Germany", confederation: "UEFA" },
  DEN: { code: "DEN", name: "Denmark", confederation: "UEFA" },
  ECU: { code: "ECU", name: "Ecuador", confederation: "CONMEBOL" },
  EGY: { code: "EGY", name: "Egypt", confederation: "CAF" },
  ENG: { code: "ENG", name: "England", confederation: "UEFA" },
  ESP: { code: "ESP", name: "Spain", confederation: "UEFA" },
  FRA: { code: "FRA", name: "France", confederation: "UEFA" },
  GER: { code: "GER", name: "Germany", confederation: "UEFA" },
  GHA: { code: "GHA", name: "Ghana", confederation: "CAF" },
  GRC: { code: "GRC", name: "Greece", confederation: "UEFA" },
  HAI: { code: "HAI", name: "Haiti", confederation: "CONCACAF" },
  HND: { code: "HND", name: "Honduras", confederation: "CONCACAF" },
  HUN: { code: "HUN", name: "Hungary", confederation: "UEFA" },
  ISL: { code: "ISL", name: "Iceland", confederation: "UEFA" },
  IRL: { code: "IRL", name: "Republic of Ireland", confederation: "UEFA" },
  IRQ: { code: "IRQ", name: "Iraq", confederation: "AFC" },
  ISR: { code: "ISR", name: "Israel", confederation: "UEFA" },
  ITA: { code: "ITA", name: "Italy", confederation: "UEFA" },
  CIV: { code: "CIV", name: "Côte d’Ivoire", confederation: "CAF" },
  JAM: { code: "JAM", name: "Jamaica", confederation: "CONCACAF" },
  JOR: { code: "JOR", name: "Jordan", confederation: "AFC" },
  JPN: { code: "JPN", name: "Japan", confederation: "AFC" },
  KOR: { code: "KOR", name: "South Korea", confederation: "AFC" },
  KWT: { code: "KWT", name: "Kuwait", confederation: "AFC" },
  MAR: { code: "MAR", name: "Morocco", confederation: "CAF" },
  MEX: { code: "MEX", name: "Mexico", confederation: "CONCACAF" },
  NED: { code: "NED", name: "Netherlands", confederation: "UEFA" },
  NGA: { code: "NGA", name: "Nigeria", confederation: "CAF" },
  NIR: { code: "NIR", name: "Northern Ireland", confederation: "UEFA" },
  NOR: { code: "NOR", name: "Norway", confederation: "UEFA" },
  NZL: { code: "NZL", name: "New Zealand", confederation: "OFC" },
  PAN: { code: "PAN", name: "Panama", confederation: "CONCACAF" },
  PAR: { code: "PAR", name: "Paraguay", confederation: "CONMEBOL" },
  PER: { code: "PER", name: "Peru", confederation: "CONMEBOL" },
  POL: { code: "POL", name: "Poland", confederation: "UEFA" },
  POR: { code: "POR", name: "Portugal", confederation: "UEFA" },
  PRK: { code: "PRK", name: "North Korea", confederation: "AFC" },
  QAT: { code: "QAT", name: "Qatar", confederation: "AFC" },
  IRN: { code: "IRN", name: "Iran", confederation: "AFC" },
  ROU: { code: "ROU", name: "Romania", confederation: "UEFA" },
  RUS: { code: "RUS", name: "Russia", confederation: "UEFA" },
  RSA: { code: "RSA", name: "South Africa", confederation: "CAF" },
  KSA: { code: "KSA", name: "Saudi Arabia", confederation: "AFC" },
  SEN: { code: "SEN", name: "Senegal", confederation: "CAF" },
  SCO: { code: "SCO", name: "Scotland", confederation: "UEFA" },
  SLV: { code: "SLV", name: "El Salvador", confederation: "CONCACAF" },
  SCG: {
    code: "SCG",
    name: "Serbia and Montenegro",
    confederation: "UEFA",
  },
  SRB: { code: "SRB", name: "Serbia", confederation: "UEFA" },
  SVK: { code: "SVK", name: "Slovakia", confederation: "UEFA" },
  SVN: { code: "SVN", name: "Slovenia", confederation: "UEFA" },
  SUI: { code: "SUI", name: "Switzerland", confederation: "UEFA" },
  SWE: { code: "SWE", name: "Sweden", confederation: "UEFA" },
  SUN: { code: "SUN", name: "Soviet Union", confederation: "UEFA" },
  TGO: { code: "TGO", name: "Togo", confederation: "CAF" },
  TTO: { code: "TTO", name: "Trinidad and Tobago", confederation: "CONCACAF" },
  TUN: { code: "TUN", name: "Tunisia", confederation: "CAF" },
  TUR: { code: "TUR", name: "Türkiye", confederation: "UEFA" },
  UKR: { code: "UKR", name: "Ukraine", confederation: "UEFA" },
  USA: { code: "USA", name: "United States", confederation: "CONCACAF" },
  URU: { code: "URU", name: "Uruguay", confederation: "CONMEBOL" },
  UZB: { code: "UZB", name: "Uzbekistan", confederation: "AFC" },
  WAL: { code: "WAL", name: "Wales", confederation: "UEFA" },
  YUG: { code: "YUG", name: "Yugoslavia", confederation: "UEFA" },
};

const defaultsFor = (position: Position, overall: number): PlayerAttributes => {
  if (position === "GK") {
    return {
      attack: 28,
      creativity: Math.max(42, overall - 32),
      control: Math.max(52, overall - 24),
      defense: Math.max(72, overall - 11),
      physical: Math.max(70, overall - 9),
      goalkeeping: overall,
      clutch: Math.max(76, overall - 5),
    };
  }
  if (["LB", "LCB", "CB", "RCB", "RB", "LWB", "RWB"].includes(position)) {
    return {
      attack: Math.max(48, overall - 28),
      creativity: Math.max(55, overall - 23),
      control: Math.max(64, overall - 16),
      defense: Math.min(96, overall + 1),
      physical: Math.max(76, overall - 5),
      goalkeeping: 12,
      clutch: Math.max(75, overall - 8),
    };
  }
  if (["DM", "CM", "AM", "LM", "RM"].includes(position)) {
    return {
      attack: Math.max(68, overall - 13),
      creativity: Math.min(97, overall + 1),
      control: Math.min(97, overall + 2),
      defense: position === "DM" ? overall - 3 : Math.max(58, overall - 21),
      physical: Math.max(68, overall - 14),
      goalkeeping: 10,
      clutch: Math.max(78, overall - 5),
    };
  }
  return {
    attack: Math.min(98, overall + 2),
    creativity: Math.max(72, overall - 9),
    control: Math.max(76, overall - 7),
    defense: Math.max(30, overall - 50),
    physical: Math.max(73, overall - 10),
    goalkeeping: 9,
    clutch: Math.min(98, overall + 1),
  };
};

type CardSeed = {
  id: string;
  playerName: string;
  nation: keyof typeof nations;
  tournamentYear: number;
  primaryPosition: Position;
  eligiblePositions: Position[];
  overall: number;
  archetype: string;
  rarity?: "iconic" | "legendary" | "classic";
  qualityBand?: QualityBand;
  attributes?: Partial<PlayerAttributes>;
  wikipediaTitle?: string;
  finalOverall?: number;
};

const rebalanceRating = (value: number) => {
  if (value >= 99) return 97;
  if (value >= 98) return 94;
  if (value >= 97) return 93;
  if (value >= 96) return 92;
  if (value >= 95) return 90;
  if (value >= 94) return 88;
  if (value >= 93) return 87;
  if (value >= 92) return 85;
  if (value >= 91) return 83;
  if (value >= 90) return 81;
  if (value >= 89) return 79;
  if (value >= 88) return 77;
  if (value >= 87) return 75;
  if (value >= 86) return 73;
  if (value >= 85) return 70;
  if (value >= 84) return 68;
  if (value >= 83) return 66;
  return 65;
};

const tournamentRatingOverrides: Record<string, number> = {
 "pele-1970": 99,
"jairzinho-1970": 97,
"carlos-alberto-1970": 93,
"gerson-1970": 93,
"franz-beckenbauer-1970": 92,
"rivellino-1970": 92,
"tostao-1970": 91,
"ladislao-mazurkiewicz-1970": 89,
"gianni-rivera-1970": 84,

"franz-beckenbauer-1974": 97,
"johan-cruyff-1974": 97,
"gerd-muller-1974": 93,
"johan-neeskens-1974": 93,
"grzegorz-lato-1974": 92,
"berti-vogts-1974": 90,
"paul-breitner-1974": 90,

"mario-kempes-1978": 96,
"paolo-rossi-1978": 94,
"dirceu-1978": 93,
"rob-rensenbrink-1978": 93,
"ubaldo-fillol-1978": 92,
"daniel-passarella-1978": 91,
"teofilo-cubillas-1978": 91,
"osvaldo-ardiles-1978": 89,

"paolo-rossi-1982": 96,
"falcao-1982": 94,
"dino-zoff-1982": 93,
"karl-heinz-rummenigge-1982": 93,
"zico-1982": 93,
"bruno-conti-1982": 91,
"marco-tardelli-1982": 91,
"alain-giresse-1982": 90,

"diego-maradona-1986": 99,
"gary-lineker-1986": 94,
"michel-platini-1986": 93,
"harald-schumacher-1986": 91,
"careca-1986": 90,
"jean-marie-pfaff-1986": 90,

"salvatore-schillaci-1990": 96,
"lothar-matthaus-1990": 94,
"andreas-brehme-1990": 92,
"diego-maradona-1990": 92,
"gary-lineker-1990": 91,
"rudi-voller-1990": 90,
"peter-shilton-1990": 89,
"carlos-valderrama-1990": 88,
"rene-higuita-1990": 87,

"romario-1994": 96,
"roberto-baggio-1994": 94,
"hristo-stoichkov-1994": 93,
"gheorghe-hagi-1994": 92,
"bebeto-1994": 91,
"jorginho-1994": 90,
"aldair-1994": 88,
"branco-1994": 88,
"cafu-1994": 84,

"ronaldo-1998": 96,
"davor-suker-1998": 94,
"zinedine-zidane-1998": 94,
"dennis-bergkamp-1998": 93,
"lilian-thuram-1998": 93,
"edgar-davids-1998": 91,
"gabriel-batistuta-1998": 91,
"marcel-desailly-1998": 90,
"zvonimir-boban-1998": 90,
"cafu-1998": 88,
"jay-jay-okocha-1998": 88,
"juan-sebastian-veron-1998": 88,
"youri-djorkaeff-1998": 88,
"patrick-vieira-1998": 77,

"ronaldo-2002": 98,
"oliver-kahn-2002": 96,
"rivaldo-2002": 94,
"hong-myung-bo-2002": 93,
"michael-ballack-2002": 93,
"cafu-2002": 92,
"roberto-carlos-2002": 92,
"ronaldinho-2002": 91,
"miroslav-klose-2002": 88,
"raul-2002": 88,

"zinedine-zidane-2006": 96,
"fabio-cannavaro-2006": 95,
"andrea-pirlo-2006": 94,
"gianluigi-buffon-2006": 94,
"thierry-henry-2006": 92,
"claude-makelele-2006": 91,
"fabio-grosso-2006": 89,
"franck-ribery-2006": 89,
"cristiano-ronaldo-2006": 88,
"francesco-totti-2006": 88,
"kaka-2006": 87,
"lionel-messi-2006": 80,
"cafu-2006": 74,

"diego-forlan-2010": 96,
"wesley-sneijder-2010": 95,
"david-villa-2010": 94,
"thomas-muller-2010": 94,
"andres-iniesta-2010": 93,
"iker-casillas-2010": 93,
"xavi-2010": 93,
"arjen-robben-2010": 92,
"bastian-schweinsteiger-2010": 92,
"xabi-alonso-2010": 90,
"gerard-pique-2010": 89,
"lionel-messi-2010": 89,
"cristiano-ronaldo-2010": 84,
"edinson-cavani-2010": 83,

"tim-howard-2014": 87,
"lionel-messi-2014": 96,
"manuel-neuer-2014": 95,
"arjen-robben-2014": 94,
"james-rodriguez-2014": 94,
"thomas-muller-2014": 94,
"philipp-lahm-2014": 93,
"toni-kroos-2014": 93,
"mats-hummels-2014": 91,
"jerome-boateng-2014": 90,
"neymar-2014": 90,
"juan-cuadrado-2014": 89,
"mario-gotze-2014": 84,
"cristiano-ronaldo-2014": 78,

"luka-modric-2018": 96,
"eden-hazard-2018": 94,
"antoine-griezmann-2018": 93,
"kylian-mbappe-2018": 93,
"thibaut-courtois-2018": 92,
"harry-kane-2018": 92,
"ngolo-kante-2018": 91,
"ivan-perisic-2018": 90,
"paul-pogba-2018": 90,
"raphael-varane-2018": 90,
"cristiano-ronaldo-2018": 89,
"edinson-cavani-2018": 89,
"ivan-rakitic-2018": 89,
"kevin-de-bruyne-2018": 89,
"mario-mandzukic-2018": 89,
"diego-godin-2018": 88,
"hugo-lloris-2018": 88,
"kieran-trippier-2018": 88,
"philippe-coutinho-2018": 88,
"romelu-lukaku-2018": 88,
"samuel-umtiti-2018": 88,
"sime-vrsaljko-2018": 88,
"benjamin-pavard-2018": 87,
"casemiro-2018": 87,
"jan-vertonghen-2018": 87,
"toby-alderweireld-2018": 87,
"blaise-matuidi-2018": 86,
"denis-cheryshev-2018": 86,
"lucas-hernandez-2018": 86,
"pepe-2018": 86,
"yerry-mina-2018": 86,
"aleksandr-golovin-2018": 85,
"neymar-2018": 85,
"olivier-giroud-2018": 85,
"lionel-messi-2018": 84,
"takashi-inui-2018": 84,
"dele-alli-2018": 80,

"lionel-messi-2022": 99,
"kylian-mbappe-2022": 97,
"antoine-griezmann-2022": 92,
"luka-modric-2022": 92,
"emiliano-martinez-2022": 91,
"josko-gvardiol-2022": 91,
"achraf-hakimi-2022": 90,
"sofyan-amrabat-2022": 90,
"yassine-bounou-2022": 90,
"bruno-fernandes-2022": 89,
"dominik-livakovic-2022": 89,
"enzo-fernandez-2022": 89,
"julian-alvarez-2022": 89,
"olivier-giroud-2022": 89,
"alexis-mac-allister-2022": 88,
"ivan-perisic-2022": 88,
"jude-bellingham-2022": 88,
"neymar-2022": 88,
"nicolas-otamendi-2022": 88,
"theo-hernandez-2022": 88,
"vinicius-junior-2022": 88,
"angel-di-maria-2022": 87,
"azzedine-ounahi-2022": 87,
"bukayo-saka-2022": 87,
"cristian-romero-2022": 87,
"dayot-upamecano-2022": 87,
"denzel-dumfries-2022": 87,
"frenkie-de-jong-2022": 87,
"harry-kane-2022": 87,
"richarlison-2022": 87,
"casemiro-2022": 86,
"cody-gakpo-2022": 86,
"hakim-ziyech-2022": 86,
"marquinhos-2022": 86,
"mateo-kovacic-2022": 86,
"nahuel-molina-2022": 86,
"romain-saiss-2022": 86,
"thiago-silva-2022": 86,
"youssef-en-nesyri-2022": 86,
"marcos-acuna-2022": 85,
"joshua-kimmich-2022": 83,
"mohammed-kudus-2022": 83,
"ritsu-doan-2022": 83,
"breel-embolo-2022": 82,
"goncalo-ramos-2022": 82,
"ismaila-sarr-2022": 82,
"mehdi-taremi-2022": 82,
"salem-al-dawsari-2022": 82,
"vincent-aboubakar-2022": 82,
"dani-olmo-2022": 81,
"son-heung-min-2022": 81,
"cristiano-ronaldo-2022": 77,

"rodri-2026": 96,
"kylian-mbappe-2026": 95,
"unai-simon-2026": 93,
"jude-bellingham-2026": 92,
"michael-olise-2026": 92,
"pau-cubarsi-2026": 92,
"erling-haaland-2026": 91,
"bukayo-saka-2026": 90,
"dayot-upamecano-2026": 90,
"lamine-yamal-2026": 90,
"lisandro-martinez-2026": 90,
"marc-cucurella-2026": 90,
"pedro-porro-2026": 90,
"cristian-romero-2026": 89,
"dani-olmo-2026": 89,
"enzo-fernandez-2026": 89,
"fabian-ruiz-2026": 89,
"ferran-torres-2026": 89,
"harry-kane-2026": 89,
"lautaro-martinez-2026": 89,
"vozinha-2026": 89,
"aymeric-laporte-2026": 88,
"declan-rice-2026": 88,
"mikel-oyarzabal-2026": 88,
"nico-williams-2026": 88,
"vinicius-junior-2026": 87,
};

const tournamentPositionOverrides: Partial<
  Record<
    string,
    {
      primaryPosition: Position;
      eligiblePositions: Position[];
    }
  >
> = {
  "siphiwe-tshabalala-2010": {
    primaryPosition: "LW",
    eligiblePositions: ["LW", "RM"],
  },
};

export const playerStatusFor = (overall: number): PlayerStatusTier => {
  if (overall >= 98) return "legend";
  if (overall >= 94) return "icon";
  if (overall >= 90) return "elite";
  if (overall >= 85) return "standout";
  if (overall >= 80) return "reliable";
  if (overall >= 74) return "role-player";
  return "limited";
};

const qualityBandFor = (overall: number): QualityBand => {
  if (overall >= 94) return "iconic";
  if (overall >= 90) return "elite";
  if (overall >= 85) return "standout";
  if (overall >= 80) return "reliable";
  if (overall >= 74) return "role-player";
  return "limited";
};

const modeledTagsFor = (
  seed: CardSeed,
  attributes: PlayerAttributes,
): string[] => {
  const strengths = [
    ["attack", attributes.attack, "Final-third threat"],
    ["creativity", attributes.creativity, "Chance creator"],
    ["control", attributes.control, "Press resistant"],
    ["defense", attributes.defense, "Ball winner"],
    ["physical", attributes.physical, "Duel strength"],
    ["goalkeeping", attributes.goalkeeping, "Goalkeeper craft"],
    ["clutch", attributes.clutch, "High-leverage model"],
  ] as const;
  return [
    ...new Set([
      seed.archetype,
      ...strengths
        .filter(
          ([key]) => key !== "goalkeeping" || seed.primaryPosition === "GK",
        )
        .sort((first, second) => second[1] - first[1])
        .slice(0, 2)
        .map(([, , label]) => label),
    ]),
  ].slice(0, 3);
};

const fifa2018AwardsSource: DataCitation = {
  label: "Golden consolation for magical Modric",
  url: "https://inside.fifa.com/en/tournaments/mens/worldcup/2018russia/news/157-awards-piece-2986294",
  publisher: "FIFA",
  accessedOn: "2026-07-18",
};

const fifa2018StatsSource: DataCitation = {
  label: "Will World Cup stars shine at The Best?",
  url: "https://inside.fifa.com/en/tournaments/mens/worldcup/2018russia/news/will-world-cup-stars-shine-at-the-best",
  publisher: "FIFA",
  accessedOn: "2026-07-18",
};

const fifa2014JamesSource: DataCitation = {
  label: "Germans reign as Brazil thrills the world",
  url: "https://inside.fifa.com/tournaments/mens/worldcup/2014brazil/news/germans-reign-as-brazil-thrills-the-world-2404806",
  publisher: "FIFA",
  accessedOn: "2026-07-18",
};

const fifa2022AwardsSource: DataCitation = {
  label: "FIFA World Cup Qatar 2022 summary",
  url: "https://publications.fifa.com/en/annual-report-2022/2022-at-a-glance/fifa-world-cup-qatar-2022-summary/",
  publisher: "FIFA",
  accessedOn: "2026-07-18",
};

const fifa2026StatsSource: DataCitation = {
  label: "FIFA World Cup 2026 top tournament statistics — 14 July snapshot",
  url: "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/fifa-world-cup-key-statistics",
  publisher: "FIFA",
  accessedOn: "2026-07-18",
};

const fifa2026MessiRecordSource: DataCitation = {
  label: "Messi enters the World Cup record books",
  url: "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/fifa.com/en/articles/argentina-austria-match-report-highlights",
  publisher: "FIFA",
  accessedOn: "2026-07-18",
};

const fifa2026RonaldoRecordSource: DataCitation = {
  label: "Ronaldo scores in a sixth World Cup",
  url: "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/cristiano-ronaldo-portugal-goal-record",
  publisher: "FIFA",
  accessedOn: "2026-07-18",
};

const fifa2026AwardsSource: DataCitation = {
  label: "World Cup 2026 award winners",
  url: "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/award-winners",
  publisher: "FIFA",
  accessedOn: "2026-07-21",
};

const achievement = (
  id: string,
  label: string,
  description: string,
  ratingEffect: number,
  source: DataCitation,
): TournamentAchievement => ({
  id,
  label,
  description,
  ratingEffect,
  source,
});

type Evidence = {
  stats?: Partial<TournamentStatLine>;
  sources?: DataCitation[];
  achievements?: TournamentAchievement[];
};

type GeneratedTournamentAppearance = {
  playerId: string;
  playerName: string;
  tournamentYear: number;
  teamCode: string;
  teamName: string;
  teamPerformance: string;
  appearances: number;
  starts: number;
  goals: number;
  primaryPosition: Position;
  eligiblePositions: Position[];
  awards: {
    id: string;
    label: string;
    shared: boolean;
  }[];
};

type GeneratedTournamentArchive = {
  source: {
    name: string;
    version: string;
    url: string;
    accessedOn: string;
  };
  identities: Record<string, GeneratedTournamentAppearance[]>;
  unresolvedIdentityIds: string[];
};

type Completed2026RosterArchive = {
  source: {
    name: string;
    url: string;
    accessedOn: string;
  };
  players: {
    identityId: string;
    playerName: string;
    teamCode: string;
    shirtNumber: number;
    primaryPosition: Position;
    eligiblePositions: Position[];
  }[];
};

const tournamentArchive =
  tournamentArchiveJson as unknown as GeneratedTournamentArchive;
const completed2026Roster =
  completed2026RosterJson as unknown as Completed2026RosterArchive;

const fjelstulTournamentSource: DataCitation = {
  label: `${tournamentArchive.source.name} v${tournamentArchive.source.version} — player appearances, goals, and awards`,
  url: tournamentArchive.source.url,
  publisher: "Joshua C. Fjelstul, Ph.D.",
  accessedOn: tournamentArchive.source.accessedOn,
};

const generatedEvidenceByCardId = new Map<string, Evidence>();
for (const [identityId, tournaments] of Object.entries(
  tournamentArchive.identities,
)) {
  for (const tournament of tournaments) {
    generatedEvidenceByCardId.set(
      `${identityId}-${tournament.tournamentYear}`,
      {
        stats: {
          appearances: tournament.appearances,
          starts: tournament.starts,
          goals: tournament.goals,
        },
        sources: [fjelstulTournamentSource],
        achievements: tournament.awards.map((award) =>
          achievement(
            `fjelstul-${award.id.toLocaleLowerCase()}-${tournament.tournamentYear}`,
            award.label,
            `${award.shared ? "Shared " : ""}${award.label} recorded for the ${tournament.tournamentYear} tournament.`,
            award.label === "Golden Ball" ? 0.45 : 0.25,
            fjelstulTournamentSource,
          ),
        ),
      },
    );
  }
}

const worldCup2026PlayerStats: Record<
  string,
  {
    appearances: number;
    starts: number;
    goals: number;
    assists: number;
  }
> = {
  "rodri-2026": { appearances: 8, starts: 8, goals: 0, assists: 0 },
  "unai-simon-2026": { appearances: 8, starts: 8, goals: 0, assists: 0 },
  "pau-cubarsi-2026": { appearances: 8, starts: 8, goals: 0, assists: 0 },
  "lamine-yamal-2026": { appearances: 8, starts: 7, goals: 1, assists: 0 },
  "mikel-oyarzabal-2026": { appearances: 8, starts: 8, goals: 5, assists: 1 },
  "ferran-torres-2026": { appearances: 8, starts: 1, goals: 1, assists: 1 },
  "aymeric-laporte-2026": { appearances: 8, starts: 8, goals: 0, assists: 1 },
  "marc-cucurella-2026": { appearances: 8, starts: 8, goals: 0, assists: 2 },
  "pedro-porro-2026": { appearances: 6, starts: 6, goals: 2, assists: 0 },
  "fabian-ruiz-2026": { appearances: 8, starts: 4, goals: 1, assists: 0 },
  "dani-olmo-2026": { appearances: 8, starts: 6, goals: 0, assists: 2 },
  "nico-williams-2026": { appearances: 6, starts: 0, goals: 0, assists: 1 },

  "lionel-messi-2026": { appearances: 8, starts: 7, goals: 8, assists: 4 },
  "emiliano-martinez-2026": { appearances: 8, starts: 8, goals: 0, assists: 0 },
  "enzo-fernandez-2026": { appearances: 7, starts: 7, goals: 2, assists: 0 },
  "julian-alvarez-2026": { appearances: 8, starts: 5, goals: 1, assists: 0 },
  "lautaro-martinez-2026": { appearances: 7, starts: 4, goals: 3, assists: 1 },
  "alexis-mac-allister-2026": { appearances: 8, starts: 7, goals: 1, assists: 1 },
  "rodrigo-de-paul-2026": { appearances: 7, starts: 6, goals: 0, assists: 1 },
  "cristian-romero-2026": { appearances: 7, starts: 7, goals: 1, assists: 0 },
  "nicolas-otamendi-2026": { appearances: 7, starts: 1, goals: 0, assists: 0 },
  "nico-paz-2026": { appearances: 2, starts: 1, goals: 0, assists: 0 },

  "kylian-mbappe-2026": { appearances: 8, starts: 8, goals: 10, assists: 4 },
  "michael-olise-2026": { appearances: 8, starts: 8, goals: 0, assists: 7 },
  "ousmane-dembele-2026": { appearances: 8, starts: 7, goals: 6, assists: 2 },
  "desire-doue-2026": { appearances: 8, starts: 4, goals: 1, assists: 1 },
  "aurelien-tchouameni-2026": { appearances: 4, starts: 4, goals: 0, assists: 1 },
  "william-saliba-2026": { appearances: 6, starts: 6, goals: 0, assists: 0 },
  "ibrahima-konate-2026": { appearances: 2, starts: 1, goals: 0, assists: 0 },
  "theo-hernandez-2026": { appearances: 5, starts: 3, goals: 0, assists: 0 },

  "jude-bellingham-2026": { appearances: 8, starts: 7, goals: 7, assists: 1 },
  "harry-kane-2026": { appearances: 7, starts: 7, goals: 6, assists: 1 },
  "bukayo-saka-2026": { appearances: 7, starts: 3, goals: 3, assists: 3 },
  "declan-rice-2026": { appearances: 7, starts: 7, goals: 1, assists: 2 },
  "anthony-gordon-2026": { appearances: 6, starts: 5, goals: 1, assists: 3 },
  "nico-oreilly-2026": { appearances: 7, starts: 5, goals: 0, assists: 0 },
  "jordan-pickford-2026": { appearances: 7, starts: 7, goals: 0, assists: 0 },
  "marc-guehi-2026": { appearances: 8, starts: 7, goals: 0, assists: 0 },
  "ezri-konsa-2026": { appearances: 8, starts: 7, goals: 1, assists: 0 },

  "erling-haaland-2026": { appearances: 5, starts: 5, goals: 7, assists: 0 },
  "martin-odegaard-2026": { appearances: 5, starts: 5, goals: 0, assists: 4 },
  "antonio-nusa-2026": { appearances: 6, starts: 4, goals: 1, assists: 0 },
  "oscar-bobb-2026": { appearances: 6, starts: 1, goals: 0, assists: 0 },
  "alexander-sorloth-2026": { appearances: 5, starts: 5, goals: 0, assists: 0 },
  "patrick-berg-2026": { appearances: 6, starts: 4, goals: 0, assists: 2 },

  "achraf-hakimi-2026": { appearances: 6, starts: 6, goals: 1, assists: 2 },
  "brahim-diaz-2026": { appearances: 6, starts: 6, goals: 0, assists: 4 },
  "yassine-bounou-2026": { appearances: 6, starts: 6, goals: 0, assists: 0 },
  "neil-el-aynaoui-2026": { appearances: 6, starts: 6, goals: 0, assists: 0 },
  "ayyoub-bouaddi-2026": { appearances: 5, starts: 5, goals: 0, assists: 0 },
  "azzedine-ounahi-2026": { appearances: 6, starts: 5, goals: 2, assists: 0 },

  "ismaila-sarr-2026": { appearances: 4, starts: 4, goals: 4, assists: 1 },
  "iliman-ndiaye-2026": { appearances: 4, starts: 1, goals: 1, assists: 2 },
  "sadio-mane-2026": { appearances: 4, starts: 4, goals: 0, assists: 1 },

  "kevin-de-bruyne-2026": { appearances: 5, starts: 5, goals: 1, assists: 0 },
  "thibaut-courtois-2026": { appearances: 6, starts: 6, goals: 0, assists: 0 },
  "jeremy-doku-2026": { appearances: 5, starts: 4, goals: 0, assists: 0 },
  "romelu-lukaku-2026": { appearances: 6, starts: 1, goals: 3, assists: 1 },
  "amadou-onana-2026": { appearances: 4, starts: 2, goals: 0, assists: 0 },
  "youri-tielemans-2026": { appearances: 5, starts: 5, goals: 2, assists: 0 },
  "brandon-mechele-2026": { appearances: 6, starts: 6, goals: 0, assists: 0 },

  "neymar-2026": { appearances: 1, starts: 0, goals: 1, assists: 0 },
  "vinicius-junior-2026": { appearances: 5, starts: 5, goals: 4, assists: 1 },
  "rodrygo-2026": { appearances: 0, starts: 0, goals: 0, assists: 0 },
  "bruno-guimaraes-2026": { appearances: 5, starts: 5, goals: 0, assists: 4 },
  "gabriel-magalhaes-2026": { appearances: 5, starts: 5, goals: 0, assists: 1 },
  "lucas-paqueta-2026": { appearances: 4, starts: 4, goals: 0, assists: 1 },
  "raphinha-2026": { appearances: 2, starts: 2, goals: 0, assists: 0 },
  "alisson-2026": { appearances: 5, starts: 5, goals: 0, assists: 0 },

  "cristiano-ronaldo-2026": { appearances: 5, starts: 5, goals: 3, assists: 0 },
  "bruno-fernandes-2026": { appearances: 5, starts: 5, goals: 0, assists: 1 },
  "bernardo-silva-2026": { appearances: 4, starts: 1, goals: 0, assists: 0 },
  "rafael-leao-2026": { appearances: 5, starts: 1, goals: 1, assists: 1 },
  "joao-neves-2026": { appearances: 5, starts: 4, goals: 1, assists: 0 },
  "vitinha-2026": { appearances: 5, starts: 5, goals: 0, assists: 0 },
  "ruben-dias-2026": { appearances: 4, starts: 4, goals: 0, assists: 0 },
  "diogo-costa-2026": { appearances: 5, starts: 5, goals: 0, assists: 0 },

  "florian-wirtz-2026": { appearances: 4, starts: 4, goals: 0, assists: 3 },
  "jamal-musiala-2026": { appearances: 4, starts: 3, goals: 1, assists: 0 },
  "joshua-kimmich-2026": { appearances: 4, starts: 4, goals: 0, assists: 2 },
  "kai-havertz-2026": { appearances: 4, starts: 4, goals: 3, assists: 0 },
  "deniz-undav-2026": { appearances: 4, starts: 1, goals: 3, assists: 2 },
  "antonio-rudiger-2026": { appearances: 4, starts: 2, goals: 0, assists: 0 },
  "marc-andre-ter-stegen-2026": { appearances: 0, starts: 0, goals: 0, assists: 0 },

  "virgil-van-dijk-2026": { appearances: 4, starts: 4, goals: 1, assists: 1 },
  "ryan-gravenberch-2026": { appearances: 4, starts: 4, goals: 0, assists: 2 },
  "xavi-simons-2026": { appearances: 0, starts: 0, goals: 0, assists: 0 },
  "cody-gakpo-2026": { appearances: 4, starts: 4, goals: 3, assists: 1 },
  "crysencio-summerville-2026": { appearances: 4, starts: 2, goals: 2, assists: 2 },
  "denzel-dumfries-2026": { appearances: 4, starts: 4, goals: 0, assists: 2 },

  "mohamed-salah-2026": { appearances: 5, starts: 5, goals: 1, assists: 2 },
  "omar-marmoush-2026": { appearances: 5, starts: 3, goals: 0, assists: 0 },

  "christian-pulisic-2026": { appearances: 4, starts: 3, goals: 0, assists: 1 },
  "folarin-balogun-2026": { appearances: 4, starts: 4, goals: 3, assists: 0 },
  "chris-richards-2026": { appearances: 4, starts: 4, goals: 0, assists: 0 },
  "weston-mckennie-2026": { appearances: 5, starts: 5, goals: 0, assists: 0 },
  "tyler-adams-2026": { appearances: 4, starts: 4, goals: 0, assists: 0 },

  "alphonso-davies-2026": { appearances: 1, starts: 0, goals: 0, assists: 0 },
  "jonathan-david-2026": { appearances: 5, starts: 5, goals: 3, assists: 0 },
  "derek-cornelius-2026": { appearances: 4, starts: 4, goals: 0, assists: 0 },
  "nathan-saliba-2026": { appearances: 3, starts: 2, goals: 1, assists: 2 },

  "santiago-gimenez-2026": { appearances: 4, starts: 0, goals: 0, assists: 0 },
  "edson-alvarez-2026": { appearances: 4, starts: 2, goals: 0, assists: 0 },
  "roberto-alvarado-2026": { appearances: 5, starts: 5, goals: 0, assists: 3 },
  "gilberto-mora-2026": { appearances: 4, starts: 3, goals: 0, assists: 0 },

  "luis-diaz-2026": { appearances: 5, starts: 5, goals: 1, assists: 1 },
  "james-rodriguez-2026": { appearances: 5, starts: 5, goals: 0, assists: 0 },
  "jhon-arias-2026": { appearances: 5, starts: 5, goals: 1, assists: 0 },

  "julio-enciso-2026": { appearances: 5, starts: 5, goals: 1, assists: 2 },
  "miguel-almiron-2026": { appearances: 4, starts: 4, goals: 0, assists: 0 },

  "breel-embolo-2026": { appearances: 6, starts: 6, goals: 2, assists: 2 },
  "granit-xhaka-2026": { appearances: 6, starts: 6, goals: 1, assists: 0 },
  "manuel-akanji-2026": { appearances: 6, starts: 6, goals: 0, assists: 0 },
  "johan-manzambi-2026": { appearances: 4, starts: 2, goals: 3, assists: 2 },

  "alexander-isak-2026": { appearances: 4, starts: 4, goals: 1, assists: 3 },
  "viktor-gyokeres-2026": { appearances: 4, starts: 4, goals: 1, assists: 2 },

  "ramin-rezaeian-2026": { appearances: 3, starts: 3, goals: 2, assists: 1 },

  "houssem-aouar-2026": { appearances: 3, starts: 2, goals: 0, assists: 2 },
  "ramy-bensebaini-2026": { appearances: 4, starts: 4, goals: 0, assists: 0 },
  "aissa-mandi-2026": { appearances: 4, starts: 4, goals: 0, assists: 0 },
  "ibrahim-maza-2026": { appearances: 4, starts: 4, goals: 0, assists: 0 },

  "vozinha-2026": { appearances: 4, starts: 4, goals: 0, assists: 0 },
  "patrick-beach-2026": { appearances: 4, starts: 4, goals: 0, assists: 0 },
  "eloy-room-2026": { appearances: 3, starts: 3, goals: 0, assists: 0 },

  "arda-guler-2026": { appearances: 3, starts: 3, goals: 1, assists: 0 },
  "kenan-yildiz-2026": { appearances: 3, starts: 2, goals: 0, assists: 0 },

  "yan-diomande-2026": { appearances: 4, starts: 4, goals: 0, assists: 1 },

  "abdukodir-khusanov-2026": { appearances: 3, starts: 3, goals: 0, assists: 0 },
  "abbosbek-fayzullaev-2026": { appearances: 3, starts: 3, goals: 1, assists: 0 },

  "giuliano-simeone-2026": { appearances: 3, starts: 2, goals: 0, assists: 0 },

  "hannibal-mejbri-2026": { appearances: 3, starts: 3, goals: 0, assists: 2 },
  "chris-wood-2026": { appearances: 3, starts: 3, goals: 0, assists: 2 },
};

const worldCup2026GoalkeeperEvidenceByCardId = new Map<string, Evidence>(
  Object.entries(worldCup2026GoalkeeperStats).map(([id, stats]) => [
    id,
    {
      stats,
      sources: [fifa2026StatsSource],
    },
  ]),
);

const worldCup2026EvidenceByCardId = new Map<string, Evidence>(
  Object.entries(worldCup2026PlayerStats).map(([id, stats]) => [
    id,
    {
      stats,
    },
  ]),
);

const curatedEvidenceByCardId: Record<string, Evidence> = {
  ...Object.fromEntries(
    Object.entries(worldCup2026PlayerStats).map(([id, stats]) => [
      id,
      {
        stats,
        sources: [fifa2026StatsSource],
      },
    ]),
  ),
  "james-rodriguez-2014": {
    stats: {
      appearances: 5,
      starts: 4,
      minutes: 399,
      goals: 6,
      assists: 2,
    },
    sources: [fifa2014JamesSource],
    achievements: [
      achievement(
        "golden-boot-2014",
        "Golden Boot",
        "Finished as the tournament’s leading scorer with six goals.",
        0.35,
        fifa2014JamesSource,
      ),
    ],
  },
  "luka-modric-2018": {
  stats: {
    appearances: 7,
    starts: 7,
    goals: 2,
    assists: 1,
  },
  sources: [fifa2018StatsSource],
  achievements: [
    achievement(
      "golden-ball-2018",
      "Golden Ball",
      "Named the tournament’s best player by the FIFA Technical Study Group.",
      0.45,
      fifa2018AwardsSource,
    ),
  ],
},
"thibaut-courtois-2018": {
stats: {
  appearances: 7,
  starts: 7,
  saves: 27,
  cleanSheets: 3,
  goalsConceded: 6,
  penaltiesSaved: 0,
},
  sources: [fifa2018StatsSource],
  achievements: [
    achievement(
      "golden-glove-2018",
      "Golden Glove",
      "Named the tournament’s outstanding goalkeeper.",
      0.35,
      fifa2018AwardsSource,
    ),
  ],
},
"kylian-mbappe-2018": {
  stats: {
    appearances: 7,
    starts: 6,
    goals: 4,
    assists: 0,
  },
  sources: [fifa2018StatsSource],
  achievements: [
    achievement(
      "young-player-2018",
      "Young Player Award",
      "Received FIFA’s Young Player Award at Russia 2018.",
      0.3,
      fifa2018AwardsSource,
    ),
  ],
},
"antoine-griezmann-2018": {
  stats: {
    appearances: 7,
    starts: 7,
    goals: 4,
    assists: 2,
  },
  sources: [fifa2018AwardsSource],
  achievements: [
    achievement(
      "bronze-ball-2018",
      "Bronze Ball",
      "Placed third in the tournament’s best-player voting.",
      0.25,
      fifa2018AwardsSource,
    ),
  ],
},
"harry-kane-2018": {
  stats: {
    appearances: 6,
    starts: 6,
    goals: 6,
    assists: 0,
  },
  sources: [fifa2018AwardsSource],
  achievements: [
    achievement(
      "golden-boot-2018",
      "Golden Boot",
      "Finished as the tournament’s top scorer with six goals.",
      0.35,
      fifa2018AwardsSource,
    ),
  ],
},
  "lionel-messi-2022": {
  stats: {
    appearances: 7,
    starts: 7,
    goals: 7,
    assists: 3,
  },
  achievements: [
    achievement(
      "golden-ball-2022",
      "Golden Ball",
      "Named the best player of the 2022 tournament.",
      0.45,
      fifa2022AwardsSource,
    ),
  ],
},
"kylian-mbappe-2022": {
  stats: {
    appearances: 7,
    starts: 6,
    goals: 8,
    assists: 2,
  },
  achievements: [
    achievement(
      "golden-boot-2022",
      "Golden Boot",
      "Named the 2022 tournament’s top scorer.",
      0.35,
      fifa2022AwardsSource,
    ),
  ],
},
"emiliano-martinez-2022": {
  stats: {
    appearances: 7,
    starts: 7,
    goals: 0,
    assists: 0,
  },
  achievements: [
    achievement(
      "golden-glove-2022",
      "Golden Glove",
      "Named the outstanding goalkeeper of the 2022 tournament.",
      0.35,
      fifa2022AwardsSource,
    ),
  ],
},
"enzo-fernandez-2022": {
  stats: {
    appearances: 7,
    starts: 5,
    goals: 1,
    assists: 1,
  },
  achievements: [
    achievement(
      "young-player-2022",
      "Young Player Award",
      "Received FIFA’s Young Player Award at Qatar 2022.",
      0.3,
      fifa2022AwardsSource,
    ),
  ],
},
"lionel-messi-2026": {
  stats: {
    appearances: 8,
    starts: 7,
    goals: 8,
    assists: 4,
  },
  sources: [fifa2026StatsSource, fifa2026MessiRecordSource],
  achievements: [
    achievement(
      "world-cup-scoring-record-2026",
      "World Cup scoring record",
      "Became the FIFA World Cup’s all-time leading scorer during the 2026 tournament.",
      0.35,
      fifa2026MessiRecordSource,
    ),
  ],
},
"cristiano-ronaldo-2026": {
  stats: {
    appearances: 5,
    starts: 5,
    goals: 3,
    assists: 0,
  },
  sources: [fifa2026StatsSource, fifa2026RonaldoRecordSource],
  achievements: [
    achievement(
      "scored-in-six-world-cups-2026",
      "Scored in six World Cups",
      "Became the first man to score in six FIFA World Cup editions.",
      0.3,
      fifa2026RonaldoRecordSource,
    ),
  ],
},
"rodri-2026": {
  stats: {
    appearances: 8,
    starts: 8,
    goals: 0,
    assists: 0,
  },
  sources: [fifa2026AwardsSource],
  achievements: [
    achievement(
      "golden-ball-2026",
      "Golden Ball",
      "Named the outstanding player of the completed 2026 tournament.",
      0.45,
      fifa2026AwardsSource,
    ),
  ],
},
"kylian-mbappe-2026": {
  stats: {
    appearances: 8,
    starts: 8,
    goals: 10,
    assists: 4,
  },
  sources: [fifa2026AwardsSource],
  achievements: [
    achievement(
      "golden-boot-2026",
      "Golden Boot",
      "Finished as the completed tournament’s leading scorer with ten goals.",
      0.4,
      fifa2026AwardsSource,
    ),
  ],
},
"unai-simon-2026": {
  stats: {
    appearances: 8,
    starts: 8,
    saves: 12,
    cleanSheets: 7,
    goalsConceded: 1,
    penaltiesSaved: 0,
  },
  sources: [fifa2026AwardsSource],
  achievements: [
    achievement(
      "golden-glove-2026",
      "Golden Glove",
      "Recorded seven clean sheets and received the Golden Glove.",
      0.4,
      fifa2026AwardsSource,
    ),
  ],
},
"pau-cubarsi-2026": {
  stats: {
    appearances: 8,
    starts: 8,
    goals: 0,
    assists: 0,
  },
  sources: [fifa2026AwardsSource],
  achievements: [
    achievement(
      "young-player-2026",
      "Young Player Award",
      "Received the tournament’s Young Player Award.",
      0.35,
      fifa2026AwardsSource,
    ),
  ],
},
"jude-bellingham-2026": {
  stats: {
    appearances: 8,
    starts: 7,
    goals: 7,
    assists: 1,
  },
  sources: [fifa2026AwardsSource],
  achievements: [
    achievement(
      "bronze-boot-2026",
      "Bronze Boot",
      "Finished third in the tournament scoring award ranking.",
      0.25,
      fifa2026AwardsSource,
    ),
  ],
},
};

const championTournamentKeys = new Set([
  "BRA-1970",
  "GER-1974",
  "ARG-1978",
  "ITA-1982",
  "ARG-1986",
  "GER-1990",
  "BRA-1994",
  "FRA-1998",
  "BRA-2002",
  "ITA-2006",
  "ESP-2010",
  "GER-2014",
  "FRA-2018",
  "ARG-2022",
  "ESP-2026",
]);

const completed2026FinishByNation: Partial<
  Record<string, TournamentFinish>
> = {
  ESP: "champion",
  ARG: "runner-up",
  ENG: "third place",
  FRA: "fourth place",
};

const tournamentFinishFor = (
  performance: string,
  teamCode?: string,
  tournamentYear?: number,
): TournamentFinish | null => {
  if (performance === "final" && teamCode && tournamentYear) {
    return championTournamentKeys.has(`${teamCode}-${tournamentYear}`)
      ? "champion"
      : "runner-up";
  }
  if (performance === "third-place match") return "semi-finals";
  if (performance === "quarter-finals") return "quarter-finals";
  if (performance === "round of 16") return "round of 16";
  if (performance === "second group stage") return "second group stage";
  if (performance === "group stage") return "group stage";
  return null;
};

const makeCard = (seed: CardSeed): PlayerTournamentCard => {
  const nation = nations[seed.nation];
  const playerIdentityId = seed.id.replace(/-\d{4}$/, "");
  const careerData = playerCareerDataByIdentityId.get(playerIdentityId);
  const displayAccoladeData =
    playerDisplayAccoladesByIdentityId.get(playerIdentityId);
  if (!displayAccoladeData) {
    throw new Error(
      `${seed.id} is missing its identity-level career accolade audit`,
    );
  }
  const overall =
    seed.finalOverall ??
    tournamentRatingOverrides[seed.id] ??
    rebalanceRating(seed.overall);
  const base = defaultsFor(seed.primaryPosition, overall);
  const generatedEvidence = generatedEvidenceByCardId.get(seed.id) ?? {};
  const curatedEvidence = curatedEvidenceByCardId[seed.id] ?? {};
  const worldCup2026Evidence = worldCup2026EvidenceByCardId.get(seed.id) ?? {};
  const worldCup2026GoalkeeperEvidence = worldCup2026GoalkeeperEvidenceByCardId.get(seed.id) ?? {};
  const historicalStats =
  historicalWorldCupTournamentStatsByCard[
    seed.id as keyof typeof historicalWorldCupTournamentStatsByCard
  ] as Partial<TournamentStatLine> | undefined;
  const evidence: Evidence = {
stats: {
  ...generatedEvidence.stats,
  ...historicalStats,
  ...curatedEvidence.stats,
  ...worldCup2026Evidence.stats,
  ...worldCup2026GoalkeeperEvidence.stats,
},
sources: [
  ...new Map(
    [
      ...(generatedEvidence.sources ?? []),
      ...(curatedEvidence.sources ?? []),
      ...(worldCup2026Evidence.sources ?? []),
      ...(worldCup2026GoalkeeperEvidence.sources ?? []),
    ].map((source) => [source.url, source]),
  ).values(),
],
    achievements: [
      ...new Map(
        [
          ...(generatedEvidence.achievements ?? []),
          ...(curatedEvidence.achievements ?? []),
        ].map((item) => [item.label, item]),
      ).values(),
    ],
  };
const stats: TournamentStatLine = {
  appearances: null,
  starts: null,
  minutes: null,
  goals: null,
  assists: null,
  saves: null,
  cleanSheets: null,
  goalsConceded: null,
  penaltiesSaved: null,
  ...evidence.stats,
};
  const hasEvidenceField = (
    candidate: Evidence,
    key: keyof TournamentStatLine,
  ) => Object.prototype.hasOwnProperty.call(candidate.stats ?? {}, key);
  const statSourcesByField = Object.fromEntries(
  (Object.keys(stats) as Array<keyof TournamentStatLine>)
    .filter((key) => stats[key] !== null)
    .map((key) => {
      const source =
        (hasEvidenceField(worldCup2026GoalkeeperEvidence, key)
          ? worldCup2026GoalkeeperEvidence.sources?.[0]
          : undefined) ??
        (hasEvidenceField(worldCup2026Evidence, key)
          ? worldCup2026Evidence.sources?.[0]
          : undefined) ??
        (hasEvidenceField(curatedEvidence, key)
          ? curatedEvidence.sources?.[0]
          : undefined) ??
        generatedEvidence.sources?.[0];

      return source ? [key, source] : null;
    })
    .filter(
      (
        entry,
      ): entry is [keyof TournamentStatLine, DataCitation] =>
        entry !== null,
    ),
);
  const generatedTournament = tournamentArchive.identities[
    playerIdentityId
  ]?.find((item) => item.tournamentYear === seed.tournamentYear);
  const tournamentFinish =
    seed.tournamentYear === 2026
      ? (completed2026FinishByNation[seed.nation] ?? null)
      : generatedTournament
        ? tournamentFinishFor(
            generatedTournament.teamPerformance,
            generatedTournament.teamCode,
            generatedTournament.tournamentYear,
          )
        : null;
  const rebalancedOverrides = Object.fromEntries(
    Object.entries(seed.attributes ?? {}).map(([key, value]) => [
      key,
      rebalanceRating(value),
    ]),
  ) as Partial<PlayerAttributes>;
  const attributes = { ...base, ...rebalancedOverrides };
  const eraLegacy: EraLegacy =
    /pel[eé]|lionel-messi|diego-maradona|franz-beckenbauer|johan-cruyff/i.test(
      seed.id,
    )
      ? "timeless"
      : overall >= 94
        ? "cross-era"
        : overall >= 88
          ? "adaptable"
          : "era-specialist";
  const legacyBoost = {
    "era-specialist": 0,
    adaptable: 5,
    "cross-era": 10,
    timeless: 16,
  }[eraLegacy];
  const eraTranslation: EraTranslationProfile = {
    timelessness: Math.min(99, 64 + legacyBoost + Math.round(overall * 0.18)),
    physicalAdaptability: Math.min(
      99,
      Math.round(attributes.physical * 0.72 + overall * 0.18 + legacyBoost),
    ),
    technicalAdaptability: Math.min(
      99,
      Math.round(
        (attributes.control + attributes.creativity) * 0.38 +
          overall * 0.12 +
          legacyBoost,
      ),
    ),
    tacticalAdaptability: Math.min(
      99,
      Math.round(
        (attributes.control + attributes.defense + attributes.creativity) *
          0.23 +
          overall * 0.12 +
          legacyBoost,
      ),
    ),
    pressingAdaptability: Math.min(
      99,
      Math.round(
        (attributes.physical + attributes.defense + attributes.control) * 0.22 +
          overall * 0.14 +
          legacyBoost,
      ),
    ),
    tempoAdaptability: Math.min(
      99,
      Math.round(
        (attributes.physical + attributes.control + attributes.creativity) *
          0.22 +
          overall * 0.14 +
          legacyBoost,
      ),
    ),
    equipmentAdaptability: Math.min(
      99,
      Math.round(
        (attributes.physical + attributes.control) * 0.34 +
          overall * 0.14 +
          legacyBoost,
      ),
    ),
    refereeingAdaptability: Math.min(
      99,
      Math.round(
        (attributes.physical + attributes.clutch) * 0.32 +
          overall * 0.16 +
          legacyBoost,
      ),
    ),
  };
  return {
    id: seed.id,
    playerIdentityId,
    playerName: seed.playerName,
    countryCode: nation.code,
    countryName: nation.name,
    confederation: nation.confederation,
    tournamentYear: seed.tournamentYear,
    primaryPosition: seed.primaryPosition,
    eligiblePositions: seed.eligiblePositions,
    overall,
    attributes,
    era: tournamentEraFor(seed.tournamentYear),
    archetype: seed.archetype,
    qualityBand: qualityBandFor(overall),
    statusTier: playerStatusFor(overall),
    modeledTags: [
      ...modeledTagsFor(seed, attributes),
      ...(eraLegacy === "timeless" ? ["Timeless"] : []),
    ].slice(0, 4),
    isDraftEligible: true,
    draftIneligibilityReason: null,
    tournamentStats: stats,
    statSources: evidence.sources ?? [],
    statSourcesByField,
    tournamentFinish,
    tournamentFinishSource: tournamentFinish
      ? seed.tournamentYear === 2026
        ? fifa2026AwardsSource
        : fjelstulTournamentSource
      : null,
    achievements: evidence.achievements ?? [],
    careerStats: careerData?.careerStats ?? null,
    careerAccolades: displayAccoladeData.accolades,
    top100Player: careerData?.top100Player ?? false,
    ...(careerData?.top100Source
      ? { top100Source: careerData.top100Source }
      : {}),
    imageId: seed.id,
    eraLegacy,
    eraTranslation,
  };
};

const curatedSeeds: CardSeed[] = [
  // Goalkeepers (7)
  { id: "fabien-barthez-1998", playerName: "Fabien Barthez", nation: "FRA", tournamentYear: 1998, primaryPosition: "GK", eligiblePositions: ["GK"], overall: 88, archetype: "Fearless sweeper", rarity: "classic" },
  { id: "oliver-kahn-2002", playerName: "Oliver Kahn", nation: "GER", tournamentYear: 2002, primaryPosition: "GK", eligiblePositions: ["GK"], overall: 94, archetype: "Iron wall", rarity: "iconic", attributes: { clutch: 96, physical: 91 } },
  { id: "gianluigi-buffon-2006", playerName: "Gianluigi Buffon", nation: "ITA", tournamentYear: 2006, primaryPosition: "GK", eligiblePositions: ["GK"], overall: 95, archetype: "Commanding keeper", rarity: "iconic", attributes: { clutch: 96 } },
  { id: "iker-casillas-2010", playerName: "Iker Casillas", nation: "ESP", tournamentYear: 2010, primaryPosition: "GK", eligiblePositions: ["GK"], overall: 94, archetype: "Reflex captain", rarity: "iconic", attributes: { clutch: 97 } },
  { id: "manuel-neuer-2014", playerName: "Manuel Neuer", nation: "GER", tournamentYear: 2014, primaryPosition: "GK", eligiblePositions: ["GK"], overall: 96, archetype: "Eleventh outfielder", rarity: "iconic", attributes: { creativity: 76, control: 82, physical: 91 } },
  { id: "thibaut-courtois-2018", playerName: "Thibaut Courtois", nation: "BEL", tournamentYear: 2018, primaryPosition: "GK", eligiblePositions: ["GK"], overall: 92, archetype: "Long-reach stopper", rarity: "legendary" },
  { id: "emiliano-martinez-2022", playerName: "Emiliano Martínez", nation: "ARG", tournamentYear: 2022, primaryPosition: "GK", eligiblePositions: ["GK"], overall: 92, archetype: "Shootout specialist", rarity: "legendary", attributes: { clutch: 98 } },

  // Defenders (16)
  { id: "lilian-thuram-1998", playerName: "Lilian Thuram", nation: "FRA", tournamentYear: 1998, primaryPosition: "RB", eligiblePositions: ["RB", "RCB", "CB"], overall: 93, archetype: "Lockdown runner", rarity: "iconic", attributes: { attack: 75, clutch: 96 } },
  { id: "marcel-desailly-1998", playerName: "Marcel Desailly", nation: "FRA", tournamentYear: 1998, primaryPosition: "CB", eligiblePositions: ["CB", "LCB", "RCB", "DM"], overall: 92, archetype: "Power stopper", rarity: "legendary" },
  { id: "roberto-carlos-2002", playerName: "Roberto Carlos", nation: "BRA", tournamentYear: 2002, primaryPosition: "LB", eligiblePositions: ["LB", "LWB", "LM"], overall: 93, archetype: "Explosive wing-back", rarity: "iconic", attributes: { attack: 88, creativity: 83, physical: 94 } },
  { id: "cafu-2002", playerName: "Cafu", nation: "BRA", tournamentYear: 2002, primaryPosition: "RB", eligiblePositions: ["RB", "RWB", "RM"], overall: 92, archetype: "Endless overlap", rarity: "iconic", attributes: { attack: 82, control: 86, physical: 92 } },
  { id: "lucio-2002", playerName: "Lúcio", nation: "BRA", tournamentYear: 2002, primaryPosition: "CB", eligiblePositions: ["CB", "LCB", "RCB"], overall: 90, archetype: "Front-foot defender", rarity: "legendary", attributes: { physical: 94 } },
  { id: "fabio-cannavaro-2006", playerName: "Fabio Cannavaro", nation: "ITA", tournamentYear: 2006, primaryPosition: "CB", eligiblePositions: ["CB", "LCB", "RCB"], overall: 96, archetype: "Perfect reader", rarity: "iconic", attributes: { defense: 98, clutch: 97 } },
  { id: "gianluca-zambrotta-2006", playerName: "Gianluca Zambrotta", nation: "ITA", tournamentYear: 2006, primaryPosition: "LB", eligiblePositions: ["LB", "RB", "LWB", "RWB"], overall: 90, archetype: "Two-sided fullback", rarity: "legendary", attributes: { attack: 77, control: 84 } },
  { id: "marco-materazzi-2006", playerName: "Marco Materazzi", nation: "ITA", tournamentYear: 2006, primaryPosition: "LCB", eligiblePositions: ["LCB", "CB"], overall: 88, archetype: "Aerial enforcer", rarity: "classic", attributes: { physical: 94, clutch: 92 } },
  { id: "sergio-ramos-2010", playerName: "Sergio Ramos", nation: "ESP", tournamentYear: 2010, primaryPosition: "RB", eligiblePositions: ["RB", "RCB", "CB"], overall: 91, archetype: "Aggressive marker", rarity: "legendary", attributes: { physical: 92 } },
  { id: "carles-puyol-2010", playerName: "Carles Puyol", nation: "ESP", tournamentYear: 2010, primaryPosition: "CB", eligiblePositions: ["CB", "LCB", "RCB"], overall: 94, archetype: "Last-line leader", rarity: "iconic", attributes: { defense: 96, clutch: 96 } },
  { id: "philipp-lahm-2014", playerName: "Philipp Lahm", nation: "GER", tournamentYear: 2014, primaryPosition: "RB", eligiblePositions: ["RB", "LB", "DM", "CM"], overall: 94, archetype: "Tactical compass", rarity: "iconic", attributes: { creativity: 91, control: 94, defense: 93 } },
  { id: "mats-hummels-2014", playerName: "Mats Hummels", nation: "GER", tournamentYear: 2014, primaryPosition: "LCB", eligiblePositions: ["LCB", "CB", "RCB"], overall: 91, archetype: "Progressive stopper", rarity: "legendary", attributes: { control: 86, clutch: 92 } },
  { id: "raphael-varane-2018", playerName: "Raphaël Varane", nation: "FRA", tournamentYear: 2018, primaryPosition: "RCB", eligiblePositions: ["RCB", "CB", "LCB"], overall: 92, archetype: "Recovery defender", rarity: "legendary", attributes: { physical: 93 } },
  { id: "lucas-hernandez-2018", playerName: "Lucas Hernández", nation: "FRA", tournamentYear: 2018, primaryPosition: "LB", eligiblePositions: ["LB", "LCB", "CB"], overall: 87, archetype: "Hard-edge fullback", rarity: "classic" },
  { id: "cristian-romero-2022", playerName: "Cristian Romero", nation: "ARG", tournamentYear: 2022, primaryPosition: "RCB", eligiblePositions: ["RCB", "CB", "LCB"], overall: 90, archetype: "Duel hunter", rarity: "legendary", attributes: { physical: 92 } },
  { id: "achraf-hakimi-2022", playerName: "Achraf Hakimi", nation: "MAR", tournamentYear: 2022, primaryPosition: "RWB", eligiblePositions: ["RWB", "RB", "RM"], overall: 90, archetype: "Transition sprinter", rarity: "legendary", attributes: { attack: 83, physical: 92 } },

  // Midfielders (17)
  { id: "zinedine-zidane-1998", playerName: "Zinedine Zidane", nation: "FRA", tournamentYear: 1998, primaryPosition: "AM", eligiblePositions: ["AM", "CM", "CF"], overall: 96, archetype: "Grand conductor", rarity: "iconic", attributes: { attack: 91, creativity: 98, control: 98, clutch: 98 } },
  { id: "didier-deschamps-1998", playerName: "Didier Deschamps", nation: "FRA", tournamentYear: 1998, primaryPosition: "DM", eligiblePositions: ["DM", "CM"], overall: 87, archetype: "Midfield anchor", rarity: "classic", attributes: { defense: 90, physical: 88 } },
  { id: "rivaldo-2002", playerName: "Rivaldo", nation: "BRA", tournamentYear: 2002, primaryPosition: "AM", eligiblePositions: ["AM", "CF", "LW", "ST"], overall: 94, archetype: "Left-foot creator", rarity: "iconic", attributes: { attack: 95, clutch: 96 } },
  { id: "ronaldinho-2002", playerName: "Ronaldinho", nation: "BRA", tournamentYear: 2002, primaryPosition: "AM", eligiblePositions: ["AM", "LW", "LM", "CF"], overall: 91, archetype: "Improvisational ten", rarity: "legendary", attributes: { creativity: 97, control: 96 } },
  { id: "andrea-pirlo-2006", playerName: "Andrea Pirlo", nation: "ITA", tournamentYear: 2006, primaryPosition: "CM", eligiblePositions: ["CM", "DM", "AM"], overall: 94, archetype: "Deep architect", rarity: "iconic", attributes: { creativity: 98, control: 97, clutch: 95 } },
  { id: "gennaro-gattuso-2006", playerName: "Gennaro Gattuso", nation: "ITA", tournamentYear: 2006, primaryPosition: "DM", eligiblePositions: ["DM", "CM"], overall: 87, archetype: "Ball-winning engine", rarity: "classic", attributes: { defense: 93, physical: 94 } },
  { id: "xavi-2010", playerName: "Xavi", nation: "ESP", tournamentYear: 2010, primaryPosition: "CM", eligiblePositions: ["CM", "AM", "DM"], overall: 96, archetype: "Tempo master", rarity: "iconic", attributes: { creativity: 98, control: 99 } },
  { id: "andres-iniesta-2010", playerName: "Andrés Iniesta", nation: "ESP", tournamentYear: 2010, primaryPosition: "AM", eligiblePositions: ["AM", "CM", "LW", "LM"], overall: 96, archetype: "Pressure escape artist", rarity: "iconic", attributes: { attack: 89, creativity: 98, control: 99, clutch: 99 } },
  { id: "sergio-busquets-2010", playerName: "Sergio Busquets", nation: "ESP", tournamentYear: 2010, primaryPosition: "DM", eligiblePositions: ["DM", "CM"], overall: 91, archetype: "Positional pivot", rarity: "legendary", attributes: { defense: 92, control: 95 } },
  { id: "toni-kroos-2014", playerName: "Toni Kroos", nation: "GER", tournamentYear: 2014, primaryPosition: "CM", eligiblePositions: ["CM", "DM", "AM"], overall: 94, archetype: "Precision passer", rarity: "iconic", attributes: { creativity: 97, control: 97, clutch: 95 } },
  { id: "bastian-schweinsteiger-2014", playerName: "Bastian Schweinsteiger", nation: "GER", tournamentYear: 2014, primaryPosition: "DM", eligiblePositions: ["DM", "CM"], overall: 92, archetype: "Finals warrior", rarity: "legendary", attributes: { defense: 91, physical: 94, clutch: 97 } },
  { id: "paul-pogba-2018", playerName: "Paul Pogba", nation: "FRA", tournamentYear: 2018, primaryPosition: "CM", eligiblePositions: ["CM", "DM", "AM"], overall: 91, archetype: "Vertical playmaker", rarity: "legendary", attributes: { attack: 85, creativity: 93, physical: 92 } },
  { id: "ngolo-kante-2018", playerName: "N’Golo Kanté", nation: "FRA", tournamentYear: 2018, primaryPosition: "DM", eligiblePositions: ["DM", "CM"], overall: 94, archetype: "Omnipresent ball-winner", rarity: "iconic", attributes: { defense: 97, physical: 94 } },
  { id: "luka-modric-2018", playerName: "Luka Modrić", nation: "CRO", tournamentYear: 2018, primaryPosition: "CM", eligiblePositions: ["CM", "AM", "DM"], overall: 96, archetype: "Elastic conductor", rarity: "iconic", attributes: { creativity: 98, control: 98, clutch: 97 } },
  { id: "kevin-de-bruyne-2018", playerName: "Kevin De Bruyne", nation: "BEL", tournamentYear: 2018, primaryPosition: "AM", eligiblePositions: ["AM", "CM", "RM"], overall: 92, archetype: "Chance engineer", rarity: "legendary", attributes: { attack: 88, creativity: 97 } },
  { id: "enzo-fernandez-2022", playerName: "Enzo Fernández", nation: "ARG", tournamentYear: 2022, primaryPosition: "CM", eligiblePositions: ["CM", "DM"], overall: 88, archetype: "Progressive controller", rarity: "classic", attributes: { control: 91 } },
  { id: "mohammed-kudus-2022", playerName: "Mohammed Kudus", nation: "GHA", tournamentYear: 2022, primaryPosition: "AM", eligiblePositions: ["AM", "CM", "RW", "CF"], overall: 86, archetype: "Driving creator", rarity: "classic", attributes: { attack: 86, physical: 88 } },

  // Forwards (18)
  { id: "thierry-henry-1998", playerName: "Thierry Henry", nation: "FRA", tournamentYear: 1998, primaryPosition: "LW", eligiblePositions: ["LW", "LM", "ST", "CF"], overall: 88, archetype: "Breakaway threat", rarity: "classic", attributes: { attack: 91, physical: 88 } },
  { id: "davor-suker-1998", playerName: "Davor Šuker", nation: "CRO", tournamentYear: 1998, primaryPosition: "ST", eligiblePositions: ["ST", "CF"], overall: 91, archetype: "Golden finisher", rarity: "legendary", attributes: { clutch: 95 } },
  { id: "ronaldo-2002", playerName: "Ronaldo", nation: "BRA", tournamentYear: 2002, primaryPosition: "ST", eligiblePositions: ["ST", "CF"], overall: 98, archetype: "Phenomenal nine", rarity: "iconic", attributes: { attack: 99, control: 96, physical: 95, clutch: 99 }, wikipediaTitle: "Ronaldo (Brazilian footballer)" },
  { id: "miroslav-klose-2002", playerName: "Miroslav Klose", nation: "GER", tournamentYear: 2002, primaryPosition: "ST", eligiblePositions: ["ST"], overall: 88, archetype: "Aerial poacher", rarity: "classic", attributes: { physical: 91, clutch: 91 } },
  { id: "francesco-totti-2006", playerName: "Francesco Totti", nation: "ITA", tournamentYear: 2006, primaryPosition: "CF", eligiblePositions: ["CF", "ST", "AM"], overall: 90, archetype: "False-nine creator", rarity: "legendary", attributes: { creativity: 94, clutch: 94 } },
  { id: "fernando-torres-2010", playerName: "Fernando Torres", nation: "ESP", tournamentYear: 2010, primaryPosition: "ST", eligiblePositions: ["ST", "CF"], overall: 86, archetype: "Channel runner", rarity: "classic", attributes: { physical: 88 } },
  { id: "david-villa-2010", playerName: "David Villa", nation: "ESP", tournamentYear: 2010, primaryPosition: "LW", eligiblePositions: ["LW", "ST", "CF"], overall: 94, archetype: "Diagonal finisher", rarity: "iconic", attributes: { attack: 97, clutch: 97 } },
  { id: "diego-forlan-2010", playerName: "Diego Forlán", nation: "URU", tournamentYear: 2010, primaryPosition: "CF", eligiblePositions: ["CF", "ST", "AM"], overall: 95, archetype: "Long-range talisman", rarity: "iconic", attributes: { attack: 96, creativity: 94, clutch: 97 } },
  { id: "lionel-messi-2014", playerName: "Lionel Messi", nation: "ARG", tournamentYear: 2014, primaryPosition: "RW", eligiblePositions: ["RW", "CF", "AM", "ST"], overall: 95, archetype: "Gravity creator", rarity: "iconic", attributes: { attack: 97, creativity: 99, control: 99, clutch: 96 } },
  { id: "thomas-muller-2014", playerName: "Thomas Müller", nation: "GER", tournamentYear: 2014, primaryPosition: "RW", eligiblePositions: ["RW", "RM", "CF", "ST"], overall: 93, archetype: "Space interpreter", rarity: "iconic", attributes: { attack: 95, clutch: 96 } },
  { id: "arjen-robben-2014", playerName: "Arjen Robben", nation: "NED", tournamentYear: 2014, primaryPosition: "RW", eligiblePositions: ["RW", "RM", "CF"], overall: 95, archetype: "Inside-cut winger", rarity: "iconic", attributes: { attack: 96, control: 96, physical: 90 } },
  { id: "neymar-2014", playerName: "Neymar", nation: "BRA", tournamentYear: 2014, primaryPosition: "LW", eligiblePositions: ["LW", "LM", "AM", "CF"], overall: 93, archetype: "Electric playmaker", rarity: "legendary", attributes: { attack: 95, creativity: 96, control: 97 } },
  { id: "antoine-griezmann-2018", playerName: "Antoine Griezmann", nation: "FRA", tournamentYear: 2018, primaryPosition: "CF", eligiblePositions: ["CF", "ST", "AM", "RW"], overall: 94, archetype: "Linking forward", rarity: "iconic", attributes: { creativity: 93, clutch: 97 } },
  { id: "kylian-mbappe-2018", playerName: "Kylian Mbappé", nation: "FRA", tournamentYear: 2018, primaryPosition: "RW", eligiblePositions: ["RW", "LW", "ST", "CF"], overall: 94, archetype: "Transition phenomenon", rarity: "iconic", attributes: { attack: 97, physical: 95, clutch: 96 } },
  { id: "kylian-mbappe-2022", playerName: "Kylian Mbappé", nation: "FRA", tournamentYear: 2022, primaryPosition: "LW", eligiblePositions: ["LW", "RW", "ST", "CF"], overall: 98, archetype: "Finals force", rarity: "iconic", attributes: { attack: 99, physical: 96, clutch: 99 } },
  { id: "lionel-messi-2022", playerName: "Lionel Messi", nation: "ARG", tournamentYear: 2022, primaryPosition: "CF", eligiblePositions: ["CF", "ST", "AM", "RW"], overall: 99, archetype: "Complete talisman", rarity: "iconic", attributes: { attack: 99, creativity: 99, control: 99, clutch: 99 } },
  { id: "julian-alvarez-2022", playerName: "Julián Álvarez", nation: "ARG", tournamentYear: 2022, primaryPosition: "ST", eligiblePositions: ["ST", "CF", "RW"], overall: 90, archetype: "Pressing finisher", rarity: "legendary", attributes: { physical: 91, clutch: 93 } },
  { id: "ismaila-sarr-2022", playerName: "Ismaïla Sarr", nation: "SEN", tournamentYear: 2022, primaryPosition: "LW", eligiblePositions: ["LW", "LM", "RW", "ST"], overall: 86, archetype: "Direct attacker", rarity: "classic", attributes: { physical: 90 } },

  // Archive expansion — 1998
  { id: "claudio-taffarel-1998", playerName: "Cláudio Taffarel", nation: "BRA", tournamentYear: 1998, primaryPosition: "GK", eligiblePositions: ["GK"], overall: 90, archetype: "Shootout guardian", rarity: "legendary", attributes: { clutch: 94 } },
  { id: "jose-luis-chilavert-1998", playerName: "José Luis Chilavert", nation: "PAR", tournamentYear: 1998, primaryPosition: "GK", eligiblePositions: ["GK"], overall: 88, archetype: "Commanding showman", rarity: "classic", attributes: { attack: 48, creativity: 68, clutch: 92 } },
  { id: "peter-schmeichel-1998", playerName: "Peter Schmeichel", nation: "DEN", tournamentYear: 1998, primaryPosition: "GK", eligiblePositions: ["GK"], overall: 91, archetype: "Penalty-area giant", rarity: "legendary", attributes: { physical: 95 } },
  { id: "bixente-lizarazu-1998", playerName: "Bixente Lizarazu", nation: "FRA", tournamentYear: 1998, primaryPosition: "LB", eligiblePositions: ["LB", "LWB"], overall: 89, archetype: "Relentless flank guard", rarity: "legendary", attributes: { physical: 90 } },
  { id: "laurent-blanc-1998", playerName: "Laurent Blanc", nation: "FRA", tournamentYear: 1998, primaryPosition: "LCB", eligiblePositions: ["LCB", "CB", "RCB"], overall: 92, archetype: "Elegant organizer", rarity: "legendary", attributes: { control: 87, clutch: 94 } },
  { id: "frank-de-boer-1998", playerName: "Frank de Boer", nation: "NED", tournamentYear: 1998, primaryPosition: "LCB", eligiblePositions: ["LCB", "CB", "LB"], overall: 90, archetype: "Passing defender", rarity: "legendary", attributes: { creativity: 84, control: 88 } },
  { id: "paolo-maldini-1998", playerName: "Paolo Maldini", nation: "ITA", tournamentYear: 1998, primaryPosition: "LB", eligiblePositions: ["LB", "LCB", "CB"], overall: 95, archetype: "Defensive aristocrat", rarity: "iconic", attributes: { defense: 98, control: 92, clutch: 96 } },
  { id: "cafu-1998", playerName: "Cafu", nation: "BRA", tournamentYear: 1998, primaryPosition: "RWB", eligiblePositions: ["RWB", "RB", "RM"], overall: 89, archetype: "High-motor captain", rarity: "legendary", attributes: { attack: 80, physical: 92 } },
  { id: "javier-zanetti-1998", playerName: "Javier Zanetti", nation: "ARG", tournamentYear: 1998, primaryPosition: "RB", eligiblePositions: ["RB", "RWB", "DM"], overall: 91, archetype: "Unbreakable runner", rarity: "legendary", attributes: { control: 89, physical: 95 } },
  { id: "christian-panucci-1998", playerName: "Christian Panucci", nation: "ITA", tournamentYear: 1998, primaryPosition: "RB", eligiblePositions: ["RB", "RWB", "RCB"], overall: 87, archetype: "Hard-line fullback", rarity: "classic", attributes: { defense: 90 } },
  { id: "gary-neville-1998", playerName: "Gary Neville", nation: "ENG", tournamentYear: 1998, primaryPosition: "RB", eligiblePositions: ["RB", "RWB", "RCB"], overall: 85, archetype: "Disciplined wide guard", rarity: "classic", attributes: { defense: 88 } },
  { id: "roberto-carlos-1998", playerName: "Roberto Carlos", nation: "BRA", tournamentYear: 1998, primaryPosition: "LWB", eligiblePositions: ["LWB", "LB", "LM"], overall: 91, archetype: "Power flank", rarity: "legendary", attributes: { attack: 86, physical: 95 } },
  { id: "edgar-davids-1998", playerName: "Edgar Davids", nation: "NED", tournamentYear: 1998, primaryPosition: "CM", eligiblePositions: ["CM", "DM", "LM"], overall: 92, archetype: "Midfield pitbull", rarity: "legendary", attributes: { defense: 92, physical: 95 } },
  { id: "dunga-1998", playerName: "Dunga", nation: "BRA", tournamentYear: 1998, primaryPosition: "DM", eligiblePositions: ["DM", "CM"], overall: 89, archetype: "Tournament marshal", rarity: "classic", attributes: { defense: 92, clutch: 92 } },
  { id: "david-beckham-1998", playerName: "David Beckham", nation: "ENG", tournamentYear: 1998, primaryPosition: "RM", eligiblePositions: ["RM", "RW", "CM"], overall: 88, archetype: "Precision crosser", rarity: "classic", attributes: { creativity: 94, clutch: 78 } },
  { id: "rivaldo-1998", playerName: "Rivaldo", nation: "BRA", tournamentYear: 1998, primaryPosition: "AM", eligiblePositions: ["AM", "LW", "CF"], overall: 91, archetype: "Angular creator", rarity: "legendary", attributes: { attack: 92, creativity: 94 } },
  { id: "dennis-bergkamp-1998", playerName: "Dennis Bergkamp", nation: "NED", tournamentYear: 1998, primaryPosition: "AM", eligiblePositions: ["AM", "CF", "ST"], overall: 95, archetype: "Velvet technician", rarity: "iconic", attributes: { attack: 94, creativity: 97, control: 98, clutch: 97 } },
  { id: "ronaldo-1998", playerName: "Ronaldo", nation: "BRA", tournamentYear: 1998, primaryPosition: "ST", eligiblePositions: ["ST", "CF"], overall: 95, archetype: "Unstoppable phenomenon", rarity: "iconic", attributes: { attack: 98, control: 96, physical: 96 }, wikipediaTitle: "Ronaldo (Brazilian footballer)" },
  { id: "michael-owen-1998", playerName: "Michael Owen", nation: "ENG", tournamentYear: 1998, primaryPosition: "ST", eligiblePositions: ["ST", "CF", "RW"], overall: 89, archetype: "Teenage lightning", rarity: "legendary", attributes: { attack: 92, physical: 88 } },
  { id: "marc-overmars-1998", playerName: "Marc Overmars", nation: "NED", tournamentYear: 1998, primaryPosition: "LW", eligiblePositions: ["LW", "LM", "RW"], overall: 88, archetype: "Touchline sprinter", rarity: "classic", attributes: { attack: 89, physical: 90 } },
  { id: "gabriel-batistuta-1998", playerName: "Gabriel Batistuta", nation: "ARG", tournamentYear: 1998, primaryPosition: "ST", eligiblePositions: ["ST", "CF"], overall: 93, archetype: "Thunderous finisher", rarity: "iconic", attributes: { attack: 96, physical: 94, clutch: 94 } },

  // Archive expansion — 2002 and 2006
  { id: "dida-2006", playerName: "Dida", nation: "BRA", tournamentYear: 2006, primaryPosition: "GK", eligiblePositions: ["GK"], overall: 88, archetype: "Calm shot-stopper", rarity: "classic", wikipediaTitle: "Dida (footballer, born 1973)" },
  { id: "philipp-lahm-2006", playerName: "Philipp Lahm", nation: "GER", tournamentYear: 2006, primaryPosition: "LB", eligiblePositions: ["LB", "RB", "LWB"], overall: 91, archetype: "Two-footed problem solver", rarity: "legendary", attributes: { attack: 81, control: 90 } },
  { id: "ashley-cole-2006", playerName: "Ashley Cole", nation: "ENG", tournamentYear: 2006, primaryPosition: "LB", eligiblePositions: ["LB", "LWB"], overall: 91, archetype: "Elite isolation defender", rarity: "legendary", attributes: { defense: 94, physical: 92 } },
  { id: "willy-sagnol-2006", playerName: "Willy Sagnol", nation: "FRA", tournamentYear: 2006, primaryPosition: "RB", eligiblePositions: ["RB", "RWB", "RM"], overall: 87, archetype: "Crossing fullback", rarity: "classic", attributes: { creativity: 84 } },
  { id: "rio-ferdinand-2002", playerName: "Rio Ferdinand", nation: "ENG", tournamentYear: 2002, primaryPosition: "RCB", eligiblePositions: ["RCB", "CB", "LCB"], overall: 90, archetype: "Composed cover defender", rarity: "legendary", attributes: { control: 87, physical: 92 } },
  { id: "zinedine-zidane-2006", playerName: "Zinedine Zidane", nation: "FRA", tournamentYear: 2006, primaryPosition: "AM", eligiblePositions: ["AM", "CM", "CF"], overall: 97, archetype: "Final grand performance", rarity: "iconic", attributes: { attack: 94, creativity: 99, control: 99, clutch: 98 } },
  { id: "michael-ballack-2002", playerName: "Michael Ballack", nation: "GER", tournamentYear: 2002, primaryPosition: "CM", eligiblePositions: ["CM", "AM", "DM"], overall: 93, archetype: "Box-to-box leader", rarity: "iconic", attributes: { attack: 91, physical: 94, clutch: 96 } },
  { id: "claude-makelele-2006", playerName: "Claude Makélélé", nation: "FRA", tournamentYear: 2006, primaryPosition: "DM", eligiblePositions: ["DM", "CM"], overall: 92, archetype: "Space eraser", rarity: "legendary", attributes: { defense: 96, control: 92 } },
  { id: "kaka-2006", playerName: "Kaká", nation: "BRA", tournamentYear: 2006, primaryPosition: "AM", eligiblePositions: ["AM", "CM", "CF"], overall: 90, archetype: "Gliding playmaker", rarity: "legendary", attributes: { attack: 90, creativity: 94, control: 94 } },
  { id: "david-beckham-2002", playerName: "David Beckham", nation: "ENG", tournamentYear: 2002, primaryPosition: "RM", eligiblePositions: ["RM", "RW", "CM"], overall: 91, archetype: "Dead-ball commander", rarity: "legendary", attributes: { creativity: 97, clutch: 94 } },
  { id: "thierry-henry-2006", playerName: "Thierry Henry", nation: "FRA", tournamentYear: 2006, primaryPosition: "LW", eligiblePositions: ["LW", "ST", "CF"], overall: 93, archetype: "Elegant accelerator", rarity: "iconic", attributes: { attack: 96, control: 94 } },
  { id: "cristiano-ronaldo-2006", playerName: "Cristiano Ronaldo", nation: "POR", tournamentYear: 2006, primaryPosition: "LW", eligiblePositions: ["LW", "RW", "LM", "RM"], overall: 90, archetype: "Electric wide threat", rarity: "legendary", attributes: { attack: 92, creativity: 91, physical: 93 } },
  { id: "luis-figo-2006", playerName: "Luís Figo", nation: "POR", tournamentYear: 2006, primaryPosition: "RW", eligiblePositions: ["RW", "RM", "AM"], overall: 91, archetype: "Veteran wing artist", rarity: "legendary", attributes: { creativity: 95, control: 94, clutch: 93 } },

  // Archive expansion — 2010 to 2018
  { id: "marcelo-2014", playerName: "Marcelo", nation: "BRA", tournamentYear: 2014, primaryPosition: "LWB", eligiblePositions: ["LWB", "LB", "LM"], overall: 88, archetype: "Creative overlap", rarity: "classic", attributes: { attack: 84, creativity: 88 } },
  { id: "jordi-alba-2018", playerName: "Jordi Alba", nation: "ESP", tournamentYear: 2018, primaryPosition: "LB", eligiblePositions: ["LB", "LWB", "LM"], overall: 88, archetype: "Blindside runner", rarity: "classic", attributes: { attack: 82, physical: 89 } },
  { id: "maicon-2010", playerName: "Maicon", nation: "BRA", tournamentYear: 2010, primaryPosition: "RWB", eligiblePositions: ["RWB", "RB", "RM"], overall: 91, archetype: "Power overlap", rarity: "legendary", attributes: { attack: 87, physical: 95 } },

  // Archive expansion — 2022
  { id: "yassine-bounou-2022", playerName: "Yassine Bounou", nation: "MAR", tournamentYear: 2022, primaryPosition: "GK", eligiblePositions: ["GK"], overall: 92, archetype: "Knockout guardian", rarity: "legendary", attributes: { clutch: 96 }, wikipediaTitle: "Yassine Bounou" },
  { id: "dominik-livakovic-2022", playerName: "Dominik Livaković", nation: "CRO", tournamentYear: 2022, primaryPosition: "GK", eligiblePositions: ["GK"], overall: 91, archetype: "Shootout wall", rarity: "legendary", attributes: { clutch: 97 } },
  { id: "theo-hernandez-2022", playerName: "Theo Hernández", nation: "FRA", tournamentYear: 2022, primaryPosition: "LWB", eligiblePositions: ["LWB", "LB", "LM"], overall: 91, archetype: "Explosive carrier", rarity: "legendary", attributes: { attack: 86, physical: 94 } },
  { id: "josko-gvardiol-2022", playerName: "Joško Gvardiol", nation: "CRO", tournamentYear: 2022, primaryPosition: "LCB", eligiblePositions: ["LCB", "CB", "LB"], overall: 92, archetype: "Progressive sentinel", rarity: "legendary", attributes: { control: 89, physical: 93 } },
  { id: "nicolas-otamendi-2022", playerName: "Nicolás Otamendi", nation: "ARG", tournamentYear: 2022, primaryPosition: "CB", eligiblePositions: ["CB", "LCB", "RCB"], overall: 91, archetype: "Veteran enforcer", rarity: "legendary", attributes: { defense: 94, physical: 94 } },
  { id: "nahuel-molina-2022", playerName: "Nahuel Molina", nation: "ARG", tournamentYear: 2022, primaryPosition: "RWB", eligiblePositions: ["RWB", "RB", "RM"], overall: 89, archetype: "Final-third runner", rarity: "classic", attributes: { attack: 82, clutch: 92 } },
  { id: "marcos-acuna-2022", playerName: "Marcos Acuña", nation: "ARG", tournamentYear: 2022, primaryPosition: "LWB", eligiblePositions: ["LWB", "LB", "LM"], overall: 87, archetype: "Combative wide outlet", rarity: "classic", attributes: { physical: 92 } },
  { id: "denzel-dumfries-2022", playerName: "Denzel Dumfries", nation: "NED", tournamentYear: 2022, primaryPosition: "RWB", eligiblePositions: ["RWB", "RB", "RM"], overall: 90, archetype: "Back-post force", rarity: "legendary", attributes: { attack: 86, physical: 96 } },
  { id: "marquinhos-2022", playerName: "Marquinhos", nation: "BRA", tournamentYear: 2022, primaryPosition: "RCB", eligiblePositions: ["RCB", "CB", "LCB"], overall: 89, archetype: "Mobile organizer", rarity: "classic", attributes: { control: 88 } },
  { id: "dayot-upamecano-2022", playerName: "Dayot Upamecano", nation: "FRA", tournamentYear: 2022, primaryPosition: "RCB", eligiblePositions: ["RCB", "CB", "LCB"], overall: 90, archetype: "Recovery powerhouse", rarity: "legendary", attributes: { physical: 95 } },
  { id: "luka-modric-2022", playerName: "Luka Modrić", nation: "CRO", tournamentYear: 2022, primaryPosition: "CM", eligiblePositions: ["CM", "AM", "DM"], overall: 93, archetype: "Timeless conductor", rarity: "iconic", attributes: { creativity: 96, control: 97, clutch: 96 } },
  { id: "antoine-griezmann-2022", playerName: "Antoine Griezmann", nation: "FRA", tournamentYear: 2022, primaryPosition: "AM", eligiblePositions: ["AM", "CM", "CF"], overall: 95, archetype: "Total tournament creator", rarity: "iconic", attributes: { creativity: 98, control: 95, defense: 76, clutch: 97 } },
  { id: "alexis-mac-allister-2022", playerName: "Alexis Mac Allister", nation: "ARG", tournamentYear: 2022, primaryPosition: "CM", eligiblePositions: ["CM", "AM", "DM"], overall: 90, archetype: "Balanced connector", rarity: "legendary", attributes: { control: 93, creativity: 92 } },
  { id: "sofyan-amrabat-2022", playerName: "Sofyan Amrabat", nation: "MAR", tournamentYear: 2022, primaryPosition: "DM", eligiblePositions: ["DM", "CM"], overall: 91, archetype: "Midfield shield", rarity: "legendary", attributes: { defense: 94, physical: 95 } },
  { id: "jude-bellingham-2022", playerName: "Jude Bellingham", nation: "ENG", tournamentYear: 2022, primaryPosition: "CM", eligiblePositions: ["CM", "AM", "DM"], overall: 90, archetype: "Driving all-rounder", rarity: "legendary", attributes: { attack: 87, physical: 93 } },
  { id: "frenkie-de-jong-2022", playerName: "Frenkie de Jong", nation: "NED", tournamentYear: 2022, primaryPosition: "CM", eligiblePositions: ["CM", "DM"], overall: 90, archetype: "Press-resistant carrier", rarity: "legendary", attributes: { creativity: 94, control: 96 } },
  { id: "joshua-kimmich-2022", playerName: "Joshua Kimmich", nation: "GER", tournamentYear: 2022, primaryPosition: "DM", eligiblePositions: ["DM", "CM", "RB"], overall: 89, archetype: "Tactical distributor", rarity: "classic", attributes: { creativity: 92, control: 92 } },
  { id: "olivier-giroud-2022", playerName: "Olivier Giroud", nation: "FRA", tournamentYear: 2022, primaryPosition: "ST", eligiblePositions: ["ST", "CF"], overall: 92, archetype: "Reference-point finisher", rarity: "legendary", attributes: { physical: 95, clutch: 95 } },
  { id: "bukayo-saka-2022", playerName: "Bukayo Saka", nation: "ENG", tournamentYear: 2022, primaryPosition: "RW", eligiblePositions: ["RW", "RM", "LW"], overall: 89, archetype: "Brave wide creator", rarity: "legendary", attributes: { attack: 90, creativity: 91 } },
  { id: "richarlison-2022", playerName: "Richarlison", nation: "BRA", tournamentYear: 2022, primaryPosition: "ST", eligiblePositions: ["ST", "CF", "LW"], overall: 90, archetype: "Acrobatic finisher", rarity: "legendary", attributes: { attack: 93, physical: 92 } },
  { id: "cody-gakpo-2022", playerName: "Cody Gakpo", nation: "NED", tournamentYear: 2022, primaryPosition: "LW", eligiblePositions: ["LW", "CF", "ST"], overall: 89, archetype: "Inside-channel scorer", rarity: "legendary", attributes: { attack: 91, physical: 91 } },
  { id: "goncalo-ramos-2022", playerName: "Gonçalo Ramos", nation: "POR", tournamentYear: 2022, primaryPosition: "ST", eligiblePositions: ["ST", "CF"], overall: 88, archetype: "Hat-trick poacher", rarity: "classic", attributes: { attack: 91, clutch: 93 } },
  { id: "ritsu-doan-2022", playerName: "Ritsu Dōan", nation: "JPN", tournamentYear: 2022, primaryPosition: "RW", eligiblePositions: ["RW", "RM", "AM"], overall: 86, archetype: "Fearless match-turner", rarity: "classic", attributes: { clutch: 92 } },
  { id: "son-heung-min-2022", playerName: "Son Heung-min", nation: "KOR", tournamentYear: 2022, primaryPosition: "LW", eligiblePositions: ["LW", "CF", "ST"], overall: 89, archetype: "Masked transition threat", rarity: "legendary", attributes: { attack: 91, physical: 90 } },
];

type SupplementalSeed = readonly [
  playerName: string,
  nation: keyof typeof nations,
  tournamentYear: number,
  primaryPosition: Position,
];

// The expansion deliberately includes more tournament contributors beyond the
// usual all-star lists. Ratings remain original Trophy XI game estimates; no
// nullable tournament statistic below is inferred or silently treated as zero.
const supplementalSeeds: SupplementalSeed[] = [
  // Goalkeepers (15)
  ["Jorge Campos", "MEX", 1998, "GK"],
  ["Edwin van der Sar", "NED", 1998, "GK"],
  ["David Seaman", "ENG", 1998, "GK"],
  ["Rüştü Reçber", "TUR", 2002, "GK"],
  ["Marcos", "BRA", 2002, "GK"],
  ["Lee Woon-jae", "KOR", 2002, "GK"],
  ["Jens Lehmann", "GER", 2006, "GK"],
  ["Ricardo", "POR", 2006, "GK"],
  ["Mark Paston", "NZL", 2010, "GK"],
  ["Tim Howard", "USA", 2014, "GK"],
  ["Keylor Navas", "CRC", 2014, "GK"],
  ["Guillermo Ochoa", "MEX", 2014, "GK"],
  ["Hugo Lloris", "FRA", 2018, "GK"],
  ["Danijel Subašić", "CRO", 2018, "GK"],
  ["Mathew Ryan", "AUS", 2018, "GK"],

  // Defenders (30)
  ["Jaap Stam", "NED", 1998, "CB"],
  ["Sol Campbell", "ENG", 2002, "CB"],
  ["Alpay Özalan", "TUR", 2002, "RCB"],
  ["Hong Myung-bo", "KOR", 2002, "CB"],
  ["Alessandro Nesta", "ITA", 2006, "LCB"],
  ["Ricardo Carvalho", "POR", 2006, "RCB"],
  ["Éric Abidal", "FRA", 2006, "LB"],
  ["Juan", "BRA", 2006, "LCB"],
  ["Diego Godín", "URU", 2010, "CB"],
  ["Ryan Nelsen", "NZL", 2010, "CB"],
  ["Winston Reid", "NZL", 2010, "RCB"],
  ["Yuji Nakazawa", "JPN", 2010, "CB"],
  ["Rafael Márquez", "MEX", 2010, "CB"],
  ["John Mensah", "GHA", 2010, "RCB"],
  ["Thiago Silva", "BRA", 2014, "CB"],
  ["David Luiz", "BRA", 2014, "LCB"],
  ["Pablo Zabaleta", "ARG", 2014, "RB"],
  ["Ezequiel Garay", "ARG", 2014, "RCB"],
  ["Stefan de Vrij", "NED", 2014, "CB"],
  ["Daley Blind", "NED", 2014, "LWB"],
  ["Matt Besler", "USA", 2014, "LCB"],
  ["Kieran Trippier", "ENG", 2018, "RWB"],
  ["Diego Laxalt", "URU", 2018, "LWB"],
  ["Yerry Mina", "COL", 2018, "CB"],
  ["Mário Fernandes", "RUS", 2018, "RWB"],
  ["Šime Vrsaljko", "CRO", 2018, "RB"],
  ["Toby Alderweireld", "BEL", 2018, "RCB"],
  ["Kalidou Koulibaly", "SEN", 2022, "CB"],
  ["Kim Min-jae", "KOR", 2022, "CB"],
  ["Piero Hincapié", "ECU", 2022, "LCB"],

  // Midfielders (41)
  ["Gheorghe Hagi", "ROU", 1998, "AM"],
  ["Michael Laudrup", "DEN", 1998, "AM"],
  ["Emmanuel Petit", "FRA", 1998, "CM"],
  ["Nicky Butt", "ENG", 1998, "DM"],
  ["Ariel Ortega", "ARG", 1998, "AM"],
  ["Cuauhtémoc Blanco", "MEX", 1998, "AM"],
  ["Sunday Oliseh", "NGA", 1998, "DM"],
  ["Juninho Paulista", "BRA", 2002, "AM"],
  ["Kléberson", "BRA", 2002, "CM"],
  ["Hasan Şaş", "TUR", 2002, "LM"],
  ["Yoo Sang-chul", "KOR", 2002, "CM"],
  ["Landon Donovan", "USA", 2002, "AM"],
  ["Pavel Nedvěd", "CZE", 2006, "LM"],
  ["Maniche", "POR", 2006, "CM"],
  ["Deco", "POR", 2006, "AM"],
  ["Juan Román Riquelme", "ARG", 2006, "AM"],
  ["Torsten Frings", "GER", 2006, "DM"],
  ["Maxi Rodríguez", "ARG", 2006, "RM"],
  ["Stephen Appiah", "GHA", 2006, "CM"],
  ["Shunsuke Nakamura", "JPN", 2006, "AM"],
  ["Mesut Özil", "GER", 2010, "AM"],
  ["Wesley Sneijder", "NED", 2010, "AM"],
  ["Mark van Bommel", "NED", 2010, "DM"],
  ["Keisuke Honda", "JPN", 2010, "AM"],
  ["Park Ji-sung", "KOR", 2010, "CM"],
  ["Kevin-Prince Boateng", "GHA", 2010, "CM"],
  ["Simon Elliott", "NZL", 2010, "CM"],
  ["James Rodríguez", "COL", 2014, "AM"],
  ["Javier Mascherano", "ARG", 2014, "DM"],
  ["Ángel Di María", "ARG", 2014, "LM"],
  ["Yaya Touré", "CIV", 2014, "CM"],
  ["Bryan Ruiz", "CRC", 2014, "AM"],
  ["Jermaine Jones", "USA", 2014, "CM"],
  ["Ivan Rakitić", "CRO", 2018, "CM"],
  ["Eden Hazard", "BEL", 2018, "AM"],
  ["Dele Alli", "ENG", 2018, "AM"],
  ["Aleksandr Golovin", "RUS", 2018, "CM"],
  ["Wahbi Khazri", "TUN", 2018, "AM"],
  ["Azzedine Ounahi", "MAR", 2022, "CM"],
  ["Tyler Adams", "USA", 2022, "DM"],
  ["Salem Al-Dawsari", "KSA", 2022, "LM"],

  // Forwards (35)
  ["Christian Vieri", "ITA", 1998, "ST"],
  ["Brian Laudrup", "DEN", 1998, "RW"],
  ["Bebeto", "BRA", 1998, "CF"],
  ["Luis Hernández", "MEX", 1998, "ST"],
  ["Victor Ikpeba", "NGA", 1998, "ST"],
  ["Hakan Şükür", "TUR", 2002, "ST"],
  ["İlhan Mansız", "TUR", 2002, "CF"],
  ["El Hadji Diouf", "SEN", 2002, "LW"],
  ["Ahn Jung-hwan", "KOR", 2002, "ST"],
  ["Jared Borgetti", "MEX", 2002, "ST"],
  ["Andriy Shevchenko", "UKR", 2006, "ST"],
  ["Lukas Podolski", "GER", 2006, "LW"],
  ["David Trezeguet", "FRA", 2006, "ST"],
  ["Didier Drogba", "CIV", 2006, "ST"],
  ["Zlatan Ibrahimović", "SWE", 2006, "CF"],
  ["Luis Suárez", "URU", 2010, "ST"],
  ["Asamoah Gyan", "GHA", 2010, "ST"],
  ["Siphiwe Tshabalala", "RSA", 2010, "LW"],
  ["Chris Wood", "NZL", 2010, "ST"],
  ["Tim Cahill", "AUS", 2010, "CF"],
  ["Samuel Eto’o", "CMR", 2010, "ST"],
  ["Alexis Sánchez", "CHI", 2014, "LW"],
  ["Robin van Persie", "NED", 2014, "ST"],
  ["Joel Campbell", "CRC", 2014, "CF"],
  ["Ahmed Musa", "NGA", 2014, "LW"],
  ["Enner Valencia", "ECU", 2014, "ST"],
  ["Harry Kane", "ENG", 2018, "ST"],
  ["Romelu Lukaku", "BEL", 2018, "ST"],
  ["Ivan Perišić", "CRO", 2018, "LW"],
  ["Denis Cheryshev", "RUS", 2018, "LW"],
  ["Takashi Inui", "JPN", 2018, "LW"],
  ["Randal Kolo Muani", "FRA", 2022, "CF"],
  ["Mehdi Taremi", "IRN", 2022, "ST"],
  ["Vincent Aboubakar", "CMR", 2022, "ST"],
  ["Breel Embolo", "SUI", 2022, "CF"],
];

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const eligibleFor = (position: Position): Position[] => {
  if (position === "GK") return ["GK"];
  if (["LB", "LWB"].includes(position)) return [position, "LB", "LWB", "LCB"];
  if (["RB", "RWB"].includes(position)) return [position, "RB", "RWB", "RCB"];
  if (["LCB", "CB", "RCB"].includes(position)) return [position, "CB", "LCB", "RCB"];
  if (position === "DM") return ["DM", "CM"];
  if (position === "CM") return ["CM", "DM", "AM"];
  if (position === "AM") return ["AM", "CM", "CF"];
  if (position === "LM") return ["LM", "LW", "CM"];
  if (position === "RM") return ["RM", "RW", "CM"];
  if (position === "LW") return ["LW", "LM", "CF", "ST"];
  if (position === "RW") return ["RW", "RM", "CF", "ST"];
  if (position === "CF") return ["CF", "ST", "AM"];
  return ["ST", "CF"];
};

type HistoricalSeed = readonly [
  playerName: string,
  nation: keyof typeof nations,
  tournamentYear: number,
  primaryPosition: Position,
  overall: number,
  archetype: string,
];

// Older editions deliberately mix icons with strong starters and specialists.
// Ratings are original tournament-card estimates; factual statistics remain null.
const historicalSeedRows: HistoricalSeed[] = [
  ["Pelé", "BRA", 1970, "CF", 99, "Timeless complete forward"],
  ["Jairzinho", "BRA", 1970, "RW", 97, "Every-round scorer"],
  ["Gerd Müller", "GER", 1970, "ST", 96, "Penalty-box certainty"],
  ["Rivelino", "BRA", 1970, "AM", 94, "Left-foot orchestrator"],
  ["Tostão", "BRA", 1970, "CF", 93, "Fluid attacking connector"],
  ["Bobby Moore", "ENG", 1970, "CB", 94, "Anticipating captain"],
  ["Gordon Banks", "ENG", 1970, "GK", 94, "Reflex standard"],
  ["Teófilo Cubillas", "PER", 1970, "AM", 92, "Explosive tournament ten"],
  ["Giacinto Facchetti", "ITA", 1970, "LB", 91, "Commanding wide defender"],
  ["Murtaz Khurtsilava", "SUN", 1970, "CB", 86, "Physical stopper"],
  ["Johan Cruyff", "NED", 1974, "CF", 98, "Total-football catalyst"],
  ["Franz Beckenbauer", "GER", 1974, "CB", 98, "Libero architect"],
  ["Johan Neeskens", "NED", 1974, "CM", 95, "Pressing midfield spear"],
  ["Gerd Müller", "GER", 1974, "ST", 94, "Finals poacher"],
  ["Sepp Maier", "GER", 1974, "GK", 93, "Agile organizer"],
  ["Kazimierz Deyna", "POL", 1974, "AM", 93, "Elegant central creator"],
  ["Grzegorz Lato", "POL", 1974, "RW", 94, "Golden Boot runner"],
  ["Paul Breitner", "GER", 1974, "LB", 92, "Inverted power fullback"],
  ["Wolfgang Overath", "GER", 1974, "CM", 91, "Measured distributor"],
  ["René Houseman", "ARG", 1974, "RW", 85, "Elusive wide dribbler"],
  ["Mario Kempes", "ARG", 1978, "ST", 97, "Driving Golden Boot"],
  ["Daniel Passarella", "ARG", 1978, "CB", 94, "Front-foot captain"],
  ["Ubaldo Fillol", "ARG", 1978, "GK", 94, "Explosive shot-stopper"],
  ["Rob Rensenbrink", "NED", 1978, "LW", 95, "Silky inside forward"],
  ["Zico", "BRA", 1978, "AM", 90, "Early-stage playmaker"],
  ["Teófilo Cubillas", "PER", 1978, "AM", 94, "Long-range specialist"],
  ["Claudio Gentile", "ITA", 1978, "RB", 90, "Relentless marker"],
  ["Paolo Rossi", "ITA", 1978, "ST", 91, "Mobile penalty-box threat"],
  ["Arie Haan", "NED", 1978, "CM", 92, "Long-range controller"],
  ["Ruud Krol", "NED", 1978, "LB", 94, "Progressive defensive leader"],
  ["Paolo Rossi", "ITA", 1982, "ST", 98, "Knockout finisher"],
  ["Zico", "BRA", 1982, "AM", 96, "Technical master ten"],
  ["Sócrates", "BRA", 1982, "CM", 95, "Imperious playmaker"],
  ["Falcão", "BRA", 1982, "CM", 95, "Complete midfield regista"],
  ["Zbigniew Boniek", "POL", 1982, "AM", 94, "Vertical transition star"],
  ["Dino Zoff", "ITA", 1982, "GK", 96, "Veteran command"],
  ["Claudio Gentile", "ITA", 1982, "RB", 94, "Elite man-marker"],
  ["Gaetano Scirea", "ITA", 1982, "CB", 95, "Calm libero"],
  ["Pierre Littbarski", "GER", 1982, "RW", 91, "Low-center creator"],
  ["Jean Tigana", "FRA", 1982, "CM", 90, "Midfield runner"],
  ["Diego Maradona", "ARG", 1986, "AM", 99, "Tournament-defining creator"],
  ["Jorge Burruchaga", "ARG", 1986, "CM", 93, "Finals transition runner"],
  ["Jorge Valdano", "ARG", 1986, "ST", 92, "Intelligent channel forward"],
  ["Harald Schumacher", "GER", 1986, "GK", 92, "Commanding keeper"],
  ["Lothar Matthäus", "GER", 1986, "CM", 94, "Two-way midfield force"],
  ["Michel Platini", "FRA", 1986, "AM", 94, "Veteran creative authority"],
  ["Gary Lineker", "ENG", 1986, "ST", 96, "Golden Boot poacher"],
  ["Emilio Butragueño", "ESP", 1986, "ST", 94, "Slippery combination forward"],
  ["Preben Elkjær", "DEN", 1986, "ST", 92, "Powerful roaming striker"],
  ["Igor Belanov", "SUN", 1986, "RW", 92, "Direct Ballon d’Or winger"],
  ["Salvatore Schillaci", "ITA", 1990, "ST", 97, "Golden Boot revelation"],
  ["Lothar Matthäus", "GER", 1990, "CM", 98, "Complete champion captain"],
  ["Andreas Brehme", "GER", 1990, "LB", 95, "Two-footed finals fullback"],
  ["Jürgen Klinsmann", "GER", 1990, "ST", 93, "Aerial transition striker"],
  ["Sergio Goycochea", "ARG", 1990, "GK", 95, "Shootout specialist"],
  ["Paul Gascoigne", "ENG", 1990, "AM", 94, "Fearless midfield creator"],
  ["Roger Milla", "CMR", 1990, "ST", 94, "Veteran impact forward"],
  ["Franco Baresi", "ITA", 1990, "CB", 96, "Defensive line conductor"],
  ["Frank Rijkaard", "NED", 1990, "DM", 89, "Physical tactical pivot"],
  ["Tomáš Skuhravý", "CSK", 1990, "ST", 91, "Aerial tournament striker"],
  ["Romário", "BRA", 1994, "CF", 98, "Decisive close-range genius"],
  ["Roberto Baggio", "ITA", 1994, "AM", 97, "Knockout carrying force"],
  ["Bebeto", "BRA", 1994, "ST", 94, "Movement-first finisher"],
  ["Gheorghe Hagi", "ROU", 1994, "AM", 96, "Long-range creative leader"],
  ["Hristo Stoichkov", "BUL", 1994, "LW", 96, "Golden Boot left-foot force"],
  ["Dunga", "BRA", 1994, "DM", 92, "Disciplined midfield captain"],
  ["Cláudio Taffarel", "BRA", 1994, "GK", 93, "Calm knockout keeper"],
  ["Paolo Maldini", "ITA", 1994, "LB", 96, "Complete defensive reference"],
  ["Tomas Brolin", "SWE", 1994, "AM", 93, "Compact attacking connector"],
  ["Oleg Salenko", "RUS", 1994, "ST", 91, "Single-match scoring specialist"],
];

const historicalCards = historicalSeedRows.map(
  ([
    playerName,
    nation,
    tournamentYear,
    primaryPosition,
    overall,
    archetype,
  ]): CardSeed => ({
    id: `${slugify(playerName)}-${tournamentYear}`,
    playerName,
    nation,
    tournamentYear,
    primaryPosition,
    eligiblePositions: eligibleFor(primaryPosition),
    overall,
    archetype,
    rarity: overall >= 96 ? "iconic" : overall >= 92 ? "legendary" : "classic",
  }),
);

const supplementalCards = supplementalSeeds.map(
  ([playerName, nation, tournamentYear, primaryPosition], index): CardSeed => {
    const ratingCycle = [89, 86, 83, 80, 88, 85];
    const overall = ratingCycle[index % ratingCycle.length];
    const archetypes =
      primaryPosition === "GK"
        ? ["Reflex keeper", "Area commander", "Sweeper keeper"]
        : ["Tournament specialist", "Transition force", "Tactical connector"];
    return {
      id: `${slugify(playerName)}-${tournamentYear}`,
      playerName,
      nation,
      tournamentYear,
      primaryPosition,
      eligiblePositions: eligibleFor(primaryPosition),
      overall,
      archetype: archetypes[index % archetypes.length],
      qualityBand:
        overall >= 89
          ? "standout"
          : overall >= 86
            ? "reliable"
            : overall >= 83
              ? "role-player"
              : "limited",
    };
  },
);

const priorityExpansionSeeds = getPriorityExpansionSeeds();
type RequestedIdentityArchive = {
  identities: {
    identityId: string;
    playerName: string;
    countryCode: string;
    referenceYear: number;
    primaryPosition: Position;
    featuredYears: number[];
    priority: "essential" | "cult";
  }[];
};

const requestedIdentities = (
  requestedIdentityJson as unknown as RequestedIdentityArchive
).identities;
const existingArchiveSeeds = [
  ...historicalCards,
  ...curatedSeeds,
  ...supplementalCards,
  ...priorityExpansionSeeds,
];
const existingArchiveSeedIds = new Set(
  existingArchiveSeeds.map((seed) => seed.id),
);
const requestedExpansionSeeds: CardSeed[] = requestedIdentities.flatMap(
  (identity, identityIndex) =>
    identity.featuredYears.flatMap((tournamentYear, yearIndex) => {
      const id = `${identity.identityId}-${tournamentYear}`;
      if (existingArchiveSeedIds.has(id)) return [];
      const rawOverall =
        identity.priority === "essential"
          ? 94 + ((identityIndex + yearIndex) % 2)
          : 91 + ((identityIndex + yearIndex) % 2);
      return [
        {
          id,
          playerName: identity.playerName,
          nation: identity.countryCode,
          tournamentYear,
          primaryPosition: identity.primaryPosition,
          eligiblePositions: eligibleFor(identity.primaryPosition),
          overall: rawOverall,
          archetype:
            identity.priority === "essential"
              ? "Essential tournament performer"
              : "Cult tournament standout",
          rarity: rawOverall >= 94 ? "legendary" : "classic",
        },
      ];
    }),
);
const archiveSeeds = [
  ...existingArchiveSeeds,
  ...requestedExpansionSeeds,
];

const performanceRatingBonus: Record<string, number> = {
  "group stage": 0,
  "round of 16": 1,
  "second group stage": 2,
  "quarter-final": 2,
  "quarter-finals": 2,
  "semi-finals": 3,
  "third-place match": 3,
  final: 4,
  "final round": 4,
};

const tournamentAwardRatingFloor = (
  tournament: GeneratedTournamentAppearance,
) =>
  tournament.awards.reduce((floor, award) => {
    if (award.label === "Golden Ball") return Math.max(floor, 96);
    if (award.label === "Silver Ball") return Math.max(floor, 92);
    if (award.label === "Bronze Ball") return Math.max(floor, 92);
    if (award.label === "Golden Boot") return Math.max(floor, 93);
    return floor;
  }, 65);

const enforcedTournamentAwardRatingFloor = (
  tournament: GeneratedTournamentAppearance,
) =>
  tournament.awards.reduce((floor, award) => {
    if (award.label === "Golden Ball") return Math.max(floor, 96);
    if (award.label === "Silver Ball") return Math.max(floor, 92);
    return floor;
  }, 65);

const estimatedTournamentRating = (
  tournament: GeneratedTournamentAppearance,
) => {
  const awardFloor = tournamentAwardRatingFloor(tournament);
  const performanceRating =
    69 +
    Math.min(7, tournament.appearances) +
    Math.min(4, Math.ceil(tournament.starts / 2)) +
    Math.min(8, tournament.goals * 2) +
    (performanceRatingBonus[tournament.teamPerformance] ?? 0);
  return Math.min(97, Math.max(65, awardFloor, performanceRating));
};

const seedsByIdentityId = new Map<string, CardSeed[]>();
for (const seed of archiveSeeds) {
  const identityId = seed.id.replace(/-\d{4}$/, "");
  const identitySeeds = seedsByIdentityId.get(identityId) ?? [];
  identitySeeds.push(seed);
  seedsByIdentityId.set(identityId, identitySeeds);
}

const sourcedTournamentSeeds: CardSeed[] = Object.entries(
  tournamentArchive.identities,
).flatMap(
  ([identityId, tournaments]) => {
    const identitySeeds = seedsByIdentityId.get(identityId);
    const seedById = new Map(
      (identitySeeds ?? []).map((seed) => [seed.id, seed]),
    );
    return [...tournaments]
      .sort(
        (first, second) => first.tournamentYear - second.tournamentYear,
      )
      .map((tournament) => {
        const id = `${identityId}-${tournament.tournamentYear}`;
        const exactSeed = seedById.get(id);
        const positionOverride = tournamentPositionOverrides[id];
        const reference =
          exactSeed ??
          (identitySeeds?.length
            ? [...identitySeeds].sort(
                (first, second) =>
                  Math.abs(first.tournamentYear - tournament.tournamentYear) -
                  Math.abs(second.tournamentYear - tournament.tournamentYear),
              )[0]
            : {
                id,
                playerName: tournament.playerName,
                nation: tournament.teamCode,
                tournamentYear: tournament.tournamentYear,
                primaryPosition: tournament.primaryPosition,
                eligiblePositions: tournament.eligiblePositions,
                overall: estimatedTournamentRating(tournament),
                archetype: "World Cup squad player",
                rarity: "classic" as const,
              });
        const awardFloor = enforcedTournamentAwardRatingFloor(tournament);
        const desiredRating = Math.max(
          awardFloor,
          tournamentRatingOverrides[id] ??
            (exactSeed
              ? rebalanceRating(exactSeed.overall)
              : estimatedTournamentRating(tournament)),
        );
        const finalOverall = desiredRating;
        const nation =
          tournament.teamCode in nations
            ? (tournament.teamCode as keyof typeof nations)
            : reference.nation;
        return {
          ...reference,
          id,
          nation,
          tournamentYear: tournament.tournamentYear,
          primaryPosition:
            positionOverride?.primaryPosition ?? tournament.primaryPosition,
          eligiblePositions:
            positionOverride?.eligiblePositions ??
            tournament.eligiblePositions,
          overall: finalOverall,
          finalOverall,
          archetype:
            exactSeed?.archetype ??
            `${tournament.tournamentYear} ${reference.archetype.toLocaleLowerCase()}`,
          attributes: exactSeed?.attributes,
        };
      });
  },
);

// User-prioritized archive expansion. These are representative World Cup
// cards with project-created ratings and modeled roles. Factual tournament
// statistics and named honors remain empty until imported from a card-level
// published source.
function getPriorityExpansionSeeds(): CardSeed[] {
  return [
  {
    id: "carlos-alberto-1970",
    playerName: "Carlos Alberto",
    nation: "BRA",
    tournamentYear: 1970,
    primaryPosition: "RB",
    eligiblePositions: ["RB", "RWB", "RCB"],
    overall: 93,
    archetype: "Commanding attacking fullback",
  },
  {
    id: "gerson-1970",
    playerName: "Gérson",
    nation: "BRA",
    tournamentYear: 1970,
    primaryPosition: "CM",
    eligiblePositions: ["CM", "DM", "AM"],
    overall: 92,
    archetype: "Left-foot tempo architect",
  },
  {
    id: "ladislao-mazurkiewicz-1970",
    playerName: "Ladislao Mazurkiewicz",
    nation: "URU",
    tournamentYear: 1970,
    primaryPosition: "GK",
    eligiblePositions: ["GK"],
    overall: 89,
    archetype: "Explosive line goalkeeper",
  },
  {
    id: "gianni-rivera-1970",
    playerName: "Gianni Rivera",
    nation: "ITA",
    tournamentYear: 1970,
    primaryPosition: "AM",
    eligiblePositions: ["AM", "CM", "CF"],
    overall: 89,
    archetype: "Elegant final-third creator",
  },
  {
    id: "berti-vogts-1974",
    playerName: "Berti Vogts",
    nation: "GER",
    tournamentYear: 1974,
    primaryPosition: "RB",
    eligiblePositions: ["RB", "RCB", "CB"],
    overall: 90,
    archetype: "Relentless man-marker",
  },
  {
    id: "dirceu-1978",
    playerName: "Dirceu",
    nation: "BRA",
    tournamentYear: 1978,
    primaryPosition: "AM",
    eligiblePositions: ["AM", "CM", "LM"],
    overall: 87,
    archetype: "Mobile left-foot playmaker",
  },
  {
    id: "osvaldo-ardiles-1978",
    playerName: "Osvaldo Ardiles",
    nation: "ARG",
    tournamentYear: 1978,
    primaryPosition: "CM",
    eligiblePositions: ["CM", "DM", "AM"],
    overall: 89,
    archetype: "Press-resistant midfield link",
  },
  {
    id: "karl-heinz-rummenigge-1982",
    playerName: "Karl-Heinz Rummenigge",
    nation: "GER",
    tournamentYear: 1982,
    primaryPosition: "CF",
    eligiblePositions: ["CF", "ST", "RW"],
    overall: 93,
    archetype: "Powerful roaming scorer",
  },
  {
    id: "marco-tardelli-1982",
    playerName: "Marco Tardelli",
    nation: "ITA",
    tournamentYear: 1982,
    primaryPosition: "CM",
    eligiblePositions: ["CM", "DM", "AM"],
    overall: 91,
    archetype: "Two-way midfield surge",
  },
  {
    id: "bruno-conti-1982",
    playerName: "Bruno Conti",
    nation: "ITA",
    tournamentYear: 1982,
    primaryPosition: "RW",
    eligiblePositions: ["RW", "RM", "LW"],
    overall: 91,
    archetype: "Elusive touchline creator",
  },
  {
    id: "alain-giresse-1982",
    playerName: "Alain Giresse",
    nation: "FRA",
    tournamentYear: 1982,
    primaryPosition: "CM",
    eligiblePositions: ["CM", "AM", "DM"],
    overall: 90,
    archetype: "Compact passing conductor",
  },
  {
    id: "careca-1986",
    playerName: "Careca",
    nation: "BRA",
    tournamentYear: 1986,
    primaryPosition: "ST",
    eligiblePositions: ["ST", "CF"],
    overall: 90,
    archetype: "Sharp channel finisher",
  },
  {
    id: "jean-marie-pfaff-1986",
    playerName: "Jean-Marie Pfaff",
    nation: "BEL",
    tournamentYear: 1986,
    primaryPosition: "GK",
    eligiblePositions: ["GK"],
    overall: 90,
    archetype: "Acrobatic penalty-area leader",
  },
  {
    id: "rudi-voller-1990",
    playerName: "Rudi Völler",
    nation: "GER",
    tournamentYear: 1990,
    primaryPosition: "ST",
    eligiblePositions: ["ST", "CF"],
    overall: 91,
    archetype: "Combative penalty-box striker",
  },
  {
    id: "peter-shilton-1990",
    playerName: "Peter Shilton",
    nation: "ENG",
    tournamentYear: 1990,
    primaryPosition: "GK",
    eligiblePositions: ["GK"],
    overall: 90,
    archetype: "Experienced positional keeper",
  },
  {
    id: "carlos-valderrama-1990",
    playerName: "Carlos Valderrama",
    nation: "COL",
    tournamentYear: 1990,
    primaryPosition: "AM",
    eligiblePositions: ["AM", "CM"],
    overall: 89,
    archetype: "Patient central orchestrator",
  },
  {
    id: "rene-higuita-1990",
    playerName: "René Higuita",
    nation: "COL",
    tournamentYear: 1990,
    primaryPosition: "GK",
    eligiblePositions: ["GK"],
    overall: 88,
    archetype: "Adventurous sweeping keeper",
  },
  {
    id: "jorginho-1994",
    playerName: "Jorginho",
    nation: "BRA",
    tournamentYear: 1994,
    primaryPosition: "RB",
    eligiblePositions: ["RB", "RWB", "RM"],
    overall: 91,
    archetype: "Balanced overlapping fullback",
  },
  {
    id: "branco-1994",
    playerName: "Branco",
    nation: "BRA",
    tournamentYear: 1994,
    primaryPosition: "LB",
    eligiblePositions: ["LB", "LWB", "LM"],
    overall: 89,
    archetype: "Powerful set-piece fullback",
  },
  {
    id: "aldair-1994",
    playerName: "Aldair",
    nation: "BRA",
    tournamentYear: 1994,
    primaryPosition: "CB",
    eligiblePositions: ["CB", "LCB", "RCB"],
    overall: 89,
    archetype: "Calm covering defender",
  },
  {
    id: "patrick-vieira-1998",
    playerName: "Patrick Vieira",
    nation: "FRA",
    tournamentYear: 1998,
    primaryPosition: "CM",
    eligiblePositions: ["CM", "DM"],
    overall: 88,
    archetype: "Long-stride midfield controller",
  },
  {
    id: "zvonimir-boban-1998",
    playerName: "Zvonimir Boban",
    nation: "CRO",
    tournamentYear: 1998,
    primaryPosition: "AM",
    eligiblePositions: ["AM", "CM", "LM"],
    overall: 90,
    archetype: "Composed creative captain",
  },
  {
    id: "jay-jay-okocha-1998",
    playerName: "Jay-Jay Okocha",
    nation: "NGA",
    tournamentYear: 1998,
    primaryPosition: "AM",
    eligiblePositions: ["AM", "CM", "RW"],
    overall: 88,
    archetype: "Improvisational ball carrier",
  },
  {
    id: "youri-djorkaeff-1998",
    playerName: "Youri Djorkaeff",
    nation: "FRA",
    tournamentYear: 1998,
    primaryPosition: "CF",
    eligiblePositions: ["CF", "AM", "ST"],
    overall: 89,
    archetype: "Fluid supporting forward",
  },
  {
    id: "juan-sebastian-veron-1998",
    playerName: "Juan Sebastián Verón",
    nation: "ARG",
    tournamentYear: 1998,
    primaryPosition: "CM",
    eligiblePositions: ["CM", "AM", "DM"],
    overall: 89,
    archetype: "Vertical passing midfielder",
  },
  {
    id: "raul-2002",
    playerName: "Raúl",
    nation: "ESP",
    tournamentYear: 2002,
    primaryPosition: "CF",
    eligiblePositions: ["CF", "ST", "AM"],
    overall: 90,
    archetype: "Intelligent linking finisher",
  },
  {
    id: "franck-ribery-2006",
    playerName: "Franck Ribéry",
    nation: "FRA",
    tournamentYear: 2006,
    primaryPosition: "LW",
    eligiblePositions: ["LW", "LM", "RW", "AM"],
    overall: 91,
    archetype: "Direct two-sided dribbler",
  },
  {
    id: "xabi-alonso-2010",
    playerName: "Xabi Alonso",
    nation: "ESP",
    tournamentYear: 2010,
    primaryPosition: "DM",
    eligiblePositions: ["DM", "CM"],
    overall: 92,
    archetype: "Deep passing metronome",
  },
  {
    id: "fabio-grosso-2006",
    playerName: "Fabio Grosso",
    nation: "ITA",
    tournamentYear: 2006,
    primaryPosition: "LB",
    eligiblePositions: ["LB", "LWB", "LM"],
    overall: 89,
    archetype: "Decisive wide defender",
  },
  {
    id: "gerard-pique-2010",
    playerName: "Gerard Piqué",
    nation: "ESP",
    tournamentYear: 2010,
    primaryPosition: "CB",
    eligiblePositions: ["CB", "LCB", "RCB"],
    overall: 91,
    archetype: "Progressive central defender",
  },
  {
    id: "edinson-cavani-2010",
    playerName: "Edinson Cavani",
    nation: "URU",
    tournamentYear: 2010,
    primaryPosition: "ST",
    eligiblePositions: ["ST", "CF", "RW"],
    overall: 88,
    archetype: "Relentless channel runner",
  },
  {
    id: "mario-gotze-2014",
    playerName: "Mario Götze",
    nation: "GER",
    tournamentYear: 2014,
    primaryPosition: "AM",
    eligiblePositions: ["AM", "CF", "RW"],
    overall: 91,
    archetype: "Tight-space attacking connector",
  },
  {
    id: "jerome-boateng-2014",
    playerName: "Jérôme Boateng",
    nation: "GER",
    tournamentYear: 2014,
    primaryPosition: "RCB",
    eligiblePositions: ["RCB", "CB", "RB"],
    overall: 91,
    archetype: "Long-range passing stopper",
  },
  {
    id: "juan-cuadrado-2014",
    playerName: "Juan Cuadrado",
    nation: "COL",
    tournamentYear: 2014,
    primaryPosition: "RM",
    eligiblePositions: ["RM", "RW", "RWB"],
    overall: 89,
    archetype: "Elastic wide accelerator",
  },
  {
    id: "mario-mandzukic-2018",
    playerName: "Mario Mandžukić",
    nation: "CRO",
    tournamentYear: 2018,
    primaryPosition: "ST",
    eligiblePositions: ["ST", "CF", "LW"],
    overall: 91,
    archetype: "Physical pressing target",
  },
  {
    id: "casemiro-2018",
    playerName: "Casemiro",
    nation: "BRA",
    tournamentYear: 2018,
    primaryPosition: "DM",
    eligiblePositions: ["DM", "CM"],
    overall: 92,
    archetype: "Defensive midfield shield",
  },
  {
    id: "bruno-fernandes-2022",
    playerName: "Bruno Fernandes",
    nation: "POR",
    tournamentYear: 2022,
    primaryPosition: "AM",
    eligiblePositions: ["AM", "CM", "RM"],
    overall: 88,
    archetype: "Aggressive chance creator",
  },
  {
    id: "vinicius-junior-2022",
    playerName: "Vinícius Júnior",
    nation: "BRA",
    tournamentYear: 2022,
    primaryPosition: "LW",
    eligiblePositions: ["LW", "LM", "CF"],
    overall: 89,
    archetype: "Explosive left-wing carrier",
  },
  {
    id: "pepe-2018",
    playerName: "Pepe",
    nation: "POR",
    tournamentYear: 2018,
    primaryPosition: "CB",
    eligiblePositions: ["CB", "RCB", "LCB"],
    overall: 90,
    archetype: "Aggressive defensive leader",
  },
  ];
}

const audited2026RatingByIdentity = new Map(
  completed2026PlayerRatings.map((rating) => [
    rating.playerIdentityId,
    rating,
  ]),
);
const historicalDisplayNameByIdentity = new Map(
  sourcedTournamentSeeds.map((seed) => [
    seed.id.replace(/-\d{4}$/, ""),
    seed.playerName,
  ]),
);
const complete2026RosterSeeds: CardSeed[] = completed2026Roster.players.map(
  (player) => {
    const id = `${player.identityId}-2026`;
    const audited = audited2026RatingByIdentity.get(player.identityId);
    if (!audited) {
      throw new Error(`${id} is missing its explicit 2026 rating audit`);
    }
    if (
      audited.cardId !== id ||
      audited.teamCode !== player.teamCode ||
      audited.shirtNumber !== player.shirtNumber
    ) {
      throw new Error(`${id} does not match its explicit 2026 rating audit`);
    }
    return {
      id,
      playerName:
        historicalDisplayNameByIdentity.get(player.identityId) ??
        player.playerName,
      nation: player.teamCode,
      tournamentYear: 2026,
      primaryPosition: player.primaryPosition,
      eligiblePositions: player.eligiblePositions,
      overall: audited.overall,
      finalOverall: audited.overall,
      archetype:
        player.primaryPosition === "GK"
          ? "2026 tournament goalkeeper"
          : audited.overall >= 94
            ? "Tournament-defining 2026 performer"
            : audited.overall >= 90
              ? "Elite 2026 tournament performer"
              : audited.overall >= 85
                ? "2026 tournament standout"
                : "2026 World Cup squad player",
      rarity:
        audited.overall >= 96
          ? "iconic"
          : audited.overall >= 90
            ? "legendary"
            : "classic",
    };
  },
);

const seeds = [
  ...sourcedTournamentSeeds,
  ...complete2026RosterSeeds,
];

const normalizeCenterBackPosition = (position: Position): Position =>
  position === "LCB" || position === "RCB" ? "CB" : position;

export const allPlayersBeforeIdentityPruning: PlayerTournamentCard[] =
  playerSeedSchema
  .parse(seeds.map(makeCard))
  .map((player) => ({
    ...player,
    primaryPosition: normalizeCenterBackPosition(player.primaryPosition),
    eligiblePositions: [
      ...new Set(player.eligiblePositions.map(normalizeCenterBackPosition)),
    ],
  }));

export const maximumOverallByPlayerIdentity = new Map<string, number>();
for (const player of allPlayersBeforeIdentityPruning) {
  maximumOverallByPlayerIdentity.set(
    player.playerIdentityId,
    Math.max(
      maximumOverallByPlayerIdentity.get(player.playerIdentityId) ??
        Number.NEGATIVE_INFINITY,
      player.overall,
    ),
  );
}

const explicitlyPlayablePlayerCardIds = new Set([
  "siphiwe-tshabalala-2010",
]);

export const isPlayablePlayerCard = (
  player: PlayerTournamentCard,
): boolean =>
  (maximumOverallByPlayerIdentity.get(player.playerIdentityId) ?? 0) >=
    80 || explicitlyPlayablePlayerCardIds.has(player.id);

// The complete sourced archive remains intact above. The playable pool keeps
// every tournament card for identities with an 80+ version, plus narrow
// card-specific additions required by an active game mode.
export const players: PlayerTournamentCard[] =
  allPlayersBeforeIdentityPruning.filter(isPlayablePlayerCard);

export const playersById = new Map(players.map((player) => [player.id, player]));
export const draftEligiblePlayers = players.filter(
  (player) => player.isDraftEligible,
);
export const playersByIdentity = new Map(
  players.map((player) => [player.playerIdentityId, player]),
);

const playablePlayersByCardId = new Map(
  draftEligiblePlayers.map((player) => [player.id, player]),
);

/**
 * Draft, Free Selection, World Cup Run, the searchable player database, and
 * World Cup All-Stars all resolve player cards from this same active pool.
 * Returning the card map's values preserves separate tournament versions while
 * deduplicating by the card-specific ID.
 */
export const getPlayablePlayers = (): PlayerTournamentCard[] => [
  ...playablePlayersByCardId.values(),
];

export const getPlayablePlayerCardIds = (): ReadonlySet<string> =>
  new Set(playablePlayersByCardId.keys());
