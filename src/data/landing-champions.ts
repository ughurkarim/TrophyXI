import { historicalOpponents } from "@/data/opponents";
import type { DataCitation, HistoricalWorldCupTeam } from "@/types/game";

type ChampionPresentation = {
  id: string;
  championFact: string;
  tacticalLabel: string;
  sourceUrl: string;
  representativePlayer: string;
  representativePlayerCardId: string;
  representativeImage?: string;
  imagePosition: string;
};

const winnerImageByYear: Record<number, string> = {
  1970: "players/winners/1970.png",
  1974: "players/winners/1974.jpeg",
  1978: "players/winners/1978.jpeg",
  1982: "players/winners/1982.jpg",
  1986: "players/winners/1986.jpeg",
  1990: "players/winners/1990.jpg",
  1994: "players/winners/1994.webp",
  1998: "players/winners/1998.jpeg",
  2002: "players/winners/2002.webp",
  2006: "players/winners/2006.webp",
  2010: "players/winners/2010.jpeg",
  2014: "players/winners/2014.jpg",
  2018: "players/winners/2018.jpeg",
  2022: "players/winners/2022.webp",
  2026: "players/winners/2026.jpeg",
};

export type LandingChampion = Pick<
  HistoricalWorldCupTeam,
  "id" | "nationCode" | "nationName"
> & {
  tournamentYear: NonNullable<HistoricalWorldCupTeam["tournamentYear"]>;
  status: "confirmed" | "pending";
  championFact: string;
  tacticalLabel: string;
  championFactSource?: DataCitation;
  representativePlayer: string;
  representativePlayerCardId: string;
  representativeImage?: string;
  imagePosition: string;
};

const presentations: ChampionPresentation[] = [
  {
    id: "argentina-2022",
    championFact:
      "Lionel Messi led Argentina back from an opening defeat and lifted the trophy after an unforgettable final.",
    tacticalLabel: "Collective recovery",
    sourceUrl:
      "https://www.fifa.com/es/articles/el-camino-de-argentina-hacia-el-titulo-de-la-copa-mundial",
    representativePlayer: "Lionel Messi",
    representativePlayerCardId: "lionel-messi-2022",
    imagePosition: "47% 50%",
  },
  {
    id: "france-2018",
    championFact:
      "Kylian Mbappé became the second teenager to score in a World Cup final as France claimed its second title.",
    tacticalLabel: "Controlled transitions",
    sourceUrl: "https://www.fifa.com/en/archive/kylian-mbappe",
    representativePlayer: "Kylian Mbappé",
    representativePlayerCardId: "kylian-mbappe-2018",
    imagePosition: "50% 42%",
  },
  {
    id: "germany-2014",
    championFact:
      "Manuel Neuer anchored the first European nation to win a World Cup in the Americas.",
    tacticalLabel: "Collective precision",
    sourceUrl:
      "https://inside.fifa.com/tournaments/mens/worldcup/2014brazil/news/germans-reign-as-brazil-thrills-the-world-2404806",
    representativePlayer: "Manuel Neuer",
    representativePlayerCardId: "manuel-neuer-2014",
    imagePosition: "52% 46%",
  },
  {
    id: "spain-2010",
    championFact:
      "Iker Casillas captained the first champion to recover from losing its opening match.",
    tacticalLabel: "Positional control",
    sourceUrl:
      "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/spain-qualify-2026",
    representativePlayer: "Iker Casillas",
    representativePlayerCardId: "iker-casillas-2010",
    imagePosition: "50% 47%",
  },
  {
    id: "italy-2006",
    championFact:
      "Fabio Cannavaro captained an Italy side that allowed only two goals during the entire tournament.",
    tacticalLabel: "Defensive resilience",
    sourceUrl:
      "https://www.fifa.com/it/tournaments/mens/worldcup/articles/germania-italia-semifinale-2006",
    representativePlayer: "Fabio Cannavaro",
    representativePlayerCardId: "fabio-cannavaro-2006",
    imagePosition: "55% 46%",
  },
  {
    id: "brazil-2002",
    championFact:
      "Ronaldo scored eight goals as Brazil won all seven matches on the way to a fifth title.",
    tacticalLabel: "Front-three transitions",
    sourceUrl: "https://www.fifa.com/en/articles/brazil-26-world-cup-records",
    representativePlayer: "Ronaldo Nazário",
    representativePlayerCardId: "ronaldo-2002",
    imagePosition: "50% 45%",
  },
  {
    id: "france-1998",
    championFact:
      "Zinedine Zidane scored twice in the final as France won its first World Cup on home soil.",
    tacticalLabel: "Midfield power",
    sourceUrl:
      "https://www.fifa.com/en/tournaments/mens/worldcup/articles/france-1998-winners-champions-stats-statistics",
    representativePlayer: "Zinedine Zidane",
    representativePlayerCardId: "zinedine-zidane-1998",
    imagePosition: "50% 42%",
  },
  {
    id: "brazil-1994",
    championFact:
      "Romário led Brazil out of a 24-year title wait in the first World Cup final decided by penalties.",
    tacticalLabel: "Compact counterattack",
    sourceUrl:
      "https://www.fifa.com/pt/articles/copa-mundo-1994-brasil-italia-final",
    representativePlayer: "Romário",
    representativePlayerCardId: "romario-1994",
    imagePosition: "50% 45%",
  },
  {
    id: "west-germany-1990",
    championFact:
      "Lothar Matthäus captained West Germany to a third title in a final rematch against Argentina.",
    tacticalLabel: "Structured control",
    sourceUrl:
      "https://www.fifa.com/de/tournaments/mens/worldcup/articles/wm-titel-deutschland-ueberblick-ergebnisse-torschuetzen-kader",
    representativePlayer: "Lothar Matthäus",
    representativePlayerCardId: "lothar-matthaus-1990",
    imagePosition: "58% 42%",
  },
  {
    id: "argentina-1986",
    championFact:
      "Diego Maradona inspired one of the tournament’s most celebrated individual campaigns as Argentina won its second title.",
    tacticalLabel: "Maradona-led creation",
    sourceUrl:
      "https://www.fifa.com/es/articles/el-partido-perfecto-de-maradona-contra-inglaterra-en-mexico-1986",
    representativePlayer: "Diego Maradona",
    representativePlayerCardId: "diego-maradona-1986",
    imagePosition: "50% 36%",
  },
  {
    id: "italy-1982",
    championFact:
      "Paolo Rossi’s six goals powered Italy’s decisive tournament surge and earned him the Golden Boot.",
    tacticalLabel: "Rossi-led tournament surge",
    sourceUrl:
      "https://www.fifa.com/en/tournaments/mens/worldcup/articles/paolo-rossi-italy-golden-boot-1982",
    representativePlayer: "Paolo Rossi",
    representativePlayerCardId: "paolo-rossi-1982",
    imagePosition: "46% 42%",
  },
  {
    id: "argentina-1978",
    championFact:
      "Daniel Passarella captained Argentina to its first World Cup title on home soil.",
    tacticalLabel: "Host-nation intensity",
    sourceUrl:
      "https://www.fifa.com/en/tournaments/mens/worldcup/articles/argentina-1978-champions-stats-statistics",
    representativePlayer: "Daniel Passarella",
    representativePlayerCardId: "daniel-passarella-1978",
    imagePosition: "50% 35%",
  },
  {
    id: "west-germany-1974",
    championFact:
      "Franz Beckenbauer lifted the trophy after West Germany came from behind to win the final.",
    tacticalLabel: "Sweeper-led authority",
    sourceUrl: "https://collect.fifa.com/marketplace/pn-c2-27",
    representativePlayer: "Franz Beckenbauer",
    representativePlayerCardId: "franz-beckenbauer-1974",
    imagePosition: "50% 44%",
  },
  {
    id: "brazil-1970",
    championFact:
      "Pelé completed his third triumph as Brazil won every match and permanently claimed the Jules Rimet Trophy.",
    tacticalLabel: "Fluid attacking interchange",
    sourceUrl:
      "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/brazil-team-profile-history",
    representativePlayer: "Pelé",
    representativePlayerCardId: "pele-1970",
    imagePosition: "50% 45%",
  },
];

const opponentById = new Map(
  historicalOpponents.map((opponent) => [opponent.id, opponent]),
);

const confirmedChampions: LandingChampion[] = presentations.map(
  (presentation) => {
    const champion = opponentById.get(presentation.id);
    if (
      !champion ||
      champion.tournamentFinish !== "champion" ||
      champion.tournamentYear === null
    ) {
      throw new Error(
        `${presentation.id} is missing from the active champion archive`,
      );
    }

    return {
      id: champion.id,
      nationCode: champion.nationCode,
      nationName: champion.nationName,
      tournamentYear: champion.tournamentYear,
      status: "confirmed",
      championFact: presentation.championFact,
      tacticalLabel: presentation.tacticalLabel,
      representativePlayer: presentation.representativePlayer,
      representativePlayerCardId: presentation.representativePlayerCardId,
      representativeImage: winnerImageByYear[champion.tournamentYear],
      imagePosition: presentation.imagePosition,
      championFactSource: {
        label: `${champion.nationName} ${champion.tournamentYear} champion fact`,
        url: presentation.sourceUrl,
        publisher: "FIFA",
        accessedOn: "2026-07-18",
      },
    };
  },
);

const confirmed2026Champion: LandingChampion = {
  id: "spain-2026",
  nationCode: "ESP",
  nationName: "Spain",
  tournamentYear: 2026,
  status: "confirmed",
  championFact:
    "Lamine Yamal helped Spain win seven straight matches as La Roja claimed its second men’s World Cup.",
  tacticalLabel: "Relentless control",
  representativePlayer: "Lamine Yamal",
  representativePlayerCardId: "lamine-yamal-2026",
  representativeImage: winnerImageByYear[2026],
  imagePosition: "50% 38%",
};

export const confirmedLandingChampions = [
  confirmed2026Champion,
  ...confirmedChampions,
];
export const landingChampions: LandingChampion[] = [
  confirmed2026Champion,
  ...confirmedChampions,
];