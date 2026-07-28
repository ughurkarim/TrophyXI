import generatedJson from "@/data/player-career.generated.json";
import cardAccoladesJson from "@/data/player-accolades-by-card.generated.json";
import type {
  PlayerAccolade,
  PlayerCareerStats,
  Top100Source,
} from "@/types/game";

export type PlayerCareerData = {
  careerStats: PlayerCareerStats | null;
  accolades: PlayerAccolade[];
  top100Player: boolean;
  top100Source?: Top100Source;
};

type GeneratedCareerArchive = {
  version: number;
  generatedAt: string;
  players: Record<string, PlayerCareerData>;
};

const generated = generatedJson as unknown as GeneratedCareerArchive;
const cardAccolades = cardAccoladesJson as unknown as {
  version: number;
  generatedAt: string;
  cards: Record<
    string,
    {
      cutoffDate: string;
      accolades: PlayerAccolade[];
    }
  >;
};

export const playerCareerDataGeneratedAt = generated.generatedAt;
export const playerCareerDataByIdentityId = new Map(
  Object.entries(generated.players),
);
export const playerAccoladesByCardId = new Map(
  Object.entries(cardAccolades.cards),
);
