"use client";

import { CircularPortrait } from "@/components/cards/circular-portrait";
import type { PlayerTournamentCard } from "@/types/game";

export function PlayerPortrait({ player }: { player: PlayerTournamentCard }) {
  return (
    <div className="player-card__portrait player-card__portrait--cutout">
      <CircularPortrait
        imageId={player.imageId}
        subjectName={player.playerName}
        era={player.era}
        statusTier={player.statusTier}
        countryCode={player.countryCode}
        tournamentYear={player.tournamentYear}
        size="featured"
      />
    </div>
  );
}
