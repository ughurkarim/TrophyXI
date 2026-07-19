import { historicalOpponents } from "@/data/opponents";
import type { DataCitation, HistoricalWorldCupTeam } from "@/types/game";

type ChampionPresentation = {
  id: string;
  championFact: string;
  tacticalLabel: string;
  sourceUrl: string;
};

export type LandingChampion = HistoricalWorldCupTeam & {
  tournamentYear: NonNullable<HistoricalWorldCupTeam["tournamentYear"]>;
  championFact: string;
  tacticalLabel: string;
  championFactSource: DataCitation;
};

const presentations: ChampionPresentation[] = [
  {
    id: "argentina-2022",
    championFact:
      "Recovered from an opening defeat to become world champions.",
    tacticalLabel: "Collective recovery",
    sourceUrl:
      "https://www.fifa.com/es/articles/el-camino-de-argentina-hacia-el-titulo-de-la-copa-mundial",
  },
  {
    id: "france-2018",
    championFact:
      "Mbappé became the second teenager to score in a World Cup final.",
    tacticalLabel: "Controlled transitions",
    sourceUrl: "https://www.fifa.com/en/archive/kylian-mbappe",
  },
  {
    id: "germany-2014",
    championFact:
      "The first European nation to win a World Cup in the Americas.",
    tacticalLabel: "Collective precision",
    sourceUrl:
      "https://inside.fifa.com/tournaments/mens/worldcup/2014brazil/news/germans-reign-as-brazil-thrills-the-world-2404806",
  },
  {
    id: "spain-2010",
    championFact:
      "The first champion to recover from losing its opening match.",
    tacticalLabel: "Positional control",
    sourceUrl:
      "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/spain-qualify-2026",
  },
  {
    id: "italy-2006",
    championFact: "Allowed only two goals during the entire tournament.",
    tacticalLabel: "Defensive resilience",
    sourceUrl:
      "https://www.fifa.com/it/tournaments/mens/worldcup/articles/germania-italia-semifinale-2006",
  },
  {
    id: "brazil-2002",
    championFact: "Won all seven matches on the way to a fifth title.",
    tacticalLabel: "Front-three transitions",
    sourceUrl:
      "https://www.fifa.com/en/articles/brazil-26-world-cup-records",
  },
  {
    id: "france-1998",
    championFact:
      "Won its first World Cup while playing on home soil.",
    tacticalLabel: "Midfield power",
    sourceUrl:
      "https://www.fifa.com/en/tournaments/mens/worldcup/articles/france-1998-winners-champions-stats-statistics",
  },
  {
    id: "brazil-1994",
    championFact:
      "Ended a 24-year title wait in the first World Cup final decided by penalties.",
    tacticalLabel: "Compact counterattack",
    sourceUrl:
      "https://www.fifa.com/pt/articles/copa-mundo-1994-brasil-italia-final",
  },
  {
    id: "west-germany-1990",
    championFact:
      "Won a third title in a final rematch against Argentina.",
    tacticalLabel: "Structured control",
    sourceUrl:
      "https://www.fifa.com/de/tournaments/mens/worldcup/articles/wm-titel-deutschland-ueberblick-ergebnisse-torschuetzen-kader",
  },
  {
    id: "argentina-1986",
    championFact:
      "Maradona inspired one of the tournament’s most celebrated individual campaigns.",
    tacticalLabel: "Maradona-led creation",
    sourceUrl:
      "https://www.fifa.com/es/articles/el-partido-perfecto-de-maradona-contra-inglaterra-en-mexico-1986",
  },
  {
    id: "italy-1982",
    championFact:
      "Paolo Rossi scored six goals and won the Golden Boot.",
    tacticalLabel: "Rossi-led tournament surge",
    sourceUrl:
      "https://www.fifa.com/en/tournaments/mens/worldcup/articles/paolo-rossi-italy-golden-boot-1982",
  },
  {
    id: "argentina-1978",
    championFact:
      "Captured its first World Cup title as the host nation.",
    tacticalLabel: "Host-nation intensity",
    sourceUrl:
      "https://www.fifa.com/en/tournaments/mens/worldcup/articles/argentina-1978-champions-stats-statistics",
  },
  {
    id: "west-germany-1974",
    championFact:
      "Came from behind to defeat the Netherlands in the final.",
    tacticalLabel: "Sweeper-led authority",
    sourceUrl: "https://collect.fifa.com/marketplace/pn-c2-27",
  },
  {
    id: "brazil-1970",
    championFact:
      "Won every match and permanently claimed the Jules Rimet Trophy.",
    tacticalLabel: "Fluid attacking interchange",
    sourceUrl:
      "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/brazil-team-profile-history",
  },
];

const opponentById = new Map(
  historicalOpponents.map((opponent) => [opponent.id, opponent]),
);

export const landingChampions: LandingChampion[] = presentations.map(
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
      ...champion,
      tournamentYear: champion.tournamentYear,
      championFact: presentation.championFact,
      tacticalLabel: presentation.tacticalLabel,
      championFactSource: {
        label: `${champion.nationName} ${champion.tournamentYear} champion fact`,
        url: presentation.sourceUrl,
        publisher: "FIFA",
        accessedOn: "2026-07-18",
      },
    };
  },
);
