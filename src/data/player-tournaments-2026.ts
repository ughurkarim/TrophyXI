import playerRatings2026Json from "@/data/player-ratings-2026.generated.json";
import type { Position } from "@/types/game";

export type Completed2026PlayerRating = {
  cardId: string;
  playerIdentityId: string;
  playerName: string;
  teamCode: string;
  shirtNumber: number;
  primaryPosition: Position;
  fifaPlayerId: string | null;
  fifaPlayerName: string | null;
  tournamentFinish: string;
  tournamentEvidence: {
    matchesPlayed: number;
    minutesPlayed: number;
    goals: number;
    assists: number;
    saves: number | null;
    savePercentage: number | null;
    impactPercentile: number | null;
  };
  overall: number;
  ratingBasis: "manual-elite-anchor" | "evidence-tier-review";
  ratingRationale: string;
};

type Completed2026RatingAudit = {
  version: number;
  generatedAt: string;
  summary: {
    cards: number;
    matchedToCurrentFifaStats: number;
    unmatchedRestoredRosterCards: number;
    playersWithMinutes: number;
    playersWithoutMinutes: number;
    cardsAt80OrHigher: number;
    distribution: Record<string, number>;
  };
  cards: Completed2026PlayerRating[];
};

// This static audit is generated from official FIFA tournament evidence. Runtime
// card construction consumes only these explicit final values; it does not
// derive ratings from roster order, historical appearances, or game ratings.
export const completed2026RatingAudit =
  playerRatings2026Json as Completed2026RatingAudit;

export const completed2026PlayerRatings = completed2026RatingAudit.cards;
