"use client";

import Image from "next/image";
import { Check, Crown, ShieldCheck } from "lucide-react";
import { imagesById } from "@/data/player-images";
import type { ManagerTournamentCard } from "@/types/game";
import { cn, flagForCountry } from "@/lib/utils";

export function ManagerCard({
  manager,
  selected,
  onSelect,
}: {
  manager: ManagerTournamentCard;
  selected?: boolean;
  onSelect: () => void;
}) {
  const image = imagesById.get(manager.imageId);
  return (
    <button
      className={cn("manager-card", selected && "manager-card--selected")}
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`Choose ${manager.managerName}, ${manager.teamName} ${manager.tournamentYear}`}
    >
      <div className="manager-card__halo" aria-hidden />
      <div className="manager-card__meta">
        <span>{flagForCountry(manager.countryCode)} {manager.countryCode}</span>
        <span>{manager.tournamentYear}</span>
      </div>
      <div className="manager-card__portrait">
        {image && (
          <Image
            src={image.file}
            alt={`Illustrated fallback portrait of ${manager.managerName}`}
            fill
            unoptimized
            sizes="(max-width: 760px) 80vw, 300px"
          />
        )}
      </div>
      <div className="manager-card__copy">
        <span className="manager-card__band">
          <Crown size={13} aria-hidden /> {manager.qualityBand}
        </span>
        <h2>{manager.managerName}</h2>
        <p>{manager.teamName} · {manager.style}</p>
        <blockquote>{manager.tacticalIdentity}</blockquote>
      </div>
      <div className="manager-card__footer">
        <span><ShieldCheck size={13} aria-hidden /> {manager.preferredFormations.join(" · ")}</span>
        {selected && <b><Check size={14} aria-hidden /> Selected</b>}
      </div>
    </button>
  );
}
