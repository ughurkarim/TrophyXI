"use client";

import { CircularPortrait } from "@/components/cards/circular-portrait";
import { imagesById } from "@/data/player-images";
import type { PlayerTournamentCard } from "@/types/game";

export function PlayerPortrait({ player }: { player: PlayerTournamentCard }) {
  const image = imagesById.get(player.imageId);

  return (
    <div className="player-card__portrait player-card__portrait--cutout">
      <CircularPortrait
        imageId={player.imageId}
        subjectName={player.playerName}
        era={player.era}
        size="featured"
      />
      <span className="portrait-year" aria-hidden>
        {String(player.tournamentYear).slice(-2)}
      </span>
      {image?.fallback && (
        <span className="portrait-fallback">ILLUSTRATED</span>
      )}
    </div>
  );
}
