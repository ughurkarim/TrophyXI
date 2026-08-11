"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check, ShieldCheck, TimerReset } from "lucide-react";
import { PlayerPortrait } from "@/components/cards/player-portrait";
import type { PlayerTournamentCard } from "@/types/game";
import { cn, flagForCountry } from "@/lib/utils";
import styles from "./player-card.module.css";

const eraAccent: Record<PlayerTournamentCard["era"], string> = {
  "1970s": "gold",
  "1980s": "gold",
  "1990s": "violet",
  "2000s": "gold",
  "2010s": "emerald",
  "2020s": "blue",
};

export function PlayerCard({
  player,
  onSelect,
  selected = false,
  decorative = false,
  className,
  showFit = false,
  positionFit,
  eraFit,
  onInspect,
  actionLabel,
  disabled = false,
  compactDraft = false,
}: {
  player: PlayerTournamentCard;
  onSelect?: () => void;
  selected?: boolean;
  decorative?: boolean;
  className?: string;
  showFit?: boolean;
  positionFit?: number;
  eraFit?: number;
  onInspect?: () => void;
  actionLabel?: string;
  disabled?: boolean;
  compactDraft?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const content = (
    <>
      <div className="player-card__shine" aria-hidden />
      <div className="player-card__header">
        <div className="player-rating">
          <strong>{player.overall}</strong>
          <span>{player.primaryPosition}</span>
        </div>
        <div className="player-era">
          <span>{player.tournamentYear}</span>
          <small>{player.statusTier.replace("-", " ")}</small>
        </div>
      </div>
      <PlayerPortrait player={player} />
      <div className="player-card__identity">
        <span className="player-country">
          {flagForCountry(player.countryCode)} {player.countryCode}
        </span>
        <h3 className="player-card__name" title={player.playerName}>{player.playerName}</h3>
        {!compactDraft && <p>{player.archetype}</p>}
      </div>
      {!compactDraft && (
        <>
          <div className="player-card__stats">
            {[
              ["ATK", player.attributes.attack],
              ["CRE", player.attributes.creativity],
              ["CTL", player.attributes.control],
              ["DEF", player.attributes.defense],
              ["PHY", player.attributes.physical],
              ["CLT", player.attributes.clutch],
            ].map(([label, value]) => (
              <span key={label}>
                <b>{value}</b>
                <small>{label}</small>
              </span>
            ))}
          </div>
          <div className="player-card__footer">
            <span>{player.countryName}</span>
            <span>{player.eligiblePositions.join(" · ")}</span>
          </div>
        </>
      )}
      {showFit && (
        <div className="player-card__fit" aria-label="Draft eligibility">
          {compactDraft ? (
            <>
              <span>POSITION FIT {positionFit ?? "—"}</span>
              {eraFit !== undefined && <span>ERA FIT {eraFit}</span>}
            </>
          ) : (
            <>
              <span>
                <ShieldCheck size={12} aria-hidden /> Position Fit{" "}
                {positionFit ?? "—"}
              </span>
              {eraFit !== undefined && (
                <span>
                  <TimerReset size={12} aria-hidden /> Era Fit {eraFit}
                </span>
              )}
            </>
          )}
        </div>
      )}
      {onInspect && (
        <button
          type="button"
          className="player-card__inspect"
          onClick={(event) => {
            event.stopPropagation();
            onInspect();
          }}
        >
          View tournament record
        </button>
      )}
      {selected && (
        <span className="player-card__selected">
          <Check size={16} aria-hidden /> Selected
        </span>
      )}
    </>
  );

  if (decorative) {
    return (
      <div
        className={cn(
          "player-card",
          styles.card,
          `player-card--${eraAccent[player.era]}`,
          `player-card--tier-${player.statusTier}`,
          className,
        )}
      >
        {content}
      </div>
    );
  }

  return (
    <motion.div
      className={cn(
        "player-card player-card--button",
        styles.card,
        `player-card--${eraAccent[player.era]}`,
        `player-card--tier-${player.statusTier}`,
        selected && "player-card--selected",
        disabled && "player-card--disabled",
        compactDraft && styles.compactDraft,
        className,
      )}
      whileHover={reduceMotion || selected || disabled ? undefined : { y: -3 }}
    >
      <button
        className="player-card__pick-target"
        onClick={onSelect}
        disabled={disabled}
        aria-label={
          actionLabel ??
          `Draft ${player.playerName} ${player.tournamentYear}, rated ${player.overall}`
        }
      />
      {content}
    </motion.div>
  );
}