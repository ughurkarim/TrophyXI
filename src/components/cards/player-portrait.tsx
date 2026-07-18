"use client";

import Image from "next/image";
import { imagesById } from "@/data/player-images";
import type { PlayerTournamentCard } from "@/types/game";

export function PlayerPortrait({ player }: { player: PlayerTournamentCard }) {
  const image = imagesById.get(player.imageId);

  return (
    <div className="player-card__portrait player-card__portrait--cutout">
      {image && (
        <Image
          src={image.file}
          alt={
            image.fallback
              ? `Illustrated fallback portrait of ${player.playerName}`
              : `${player.playerName} tournament cutout`
          }
          fill
          unoptimized
          priority={false}
          sizes="(max-width: 700px) 76vw, 260px"
          className="portrait-photo"
        />
      )}
      <span className="portrait-year" aria-hidden>
        {String(player.tournamentYear).slice(-2)}
      </span>
      {image?.fallback && (
        <span className="portrait-fallback">ILLUSTRATED</span>
      )}
    </div>
  );
}
