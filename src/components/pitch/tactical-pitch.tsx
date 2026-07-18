"use client";
import type {
  DraftPick,
  Formation,
  PlayerTournamentCard,
} from "@/types/game";
import { cn } from "@/lib/utils";

export function TacticalPitch({
  formation,
  lineup = [],
  picks,
  compact = false,
  activeSlotId,
  selectedSlotId,
  opponentNames,
  onSelectSlot,
  onInspectPlayer,
}: {
  formation: Formation;
  lineup?: PlayerTournamentCard[];
  picks?: DraftPick[];
  compact?: boolean;
  activeSlotId?: string;
  selectedSlotId?: string | null;
  opponentNames?: string[];
  onSelectSlot?: (slotId: string) => void;
  onInspectPlayer?: (player: PlayerTournamentCard) => void;
}) {
  return (
    <div className={cn("pitch", compact && "pitch--compact")}>
      <div className="pitch__atmosphere" aria-hidden />
      <div className="pitch__lines" aria-hidden>
        <span className="pitch__center-line" />
        <span className="pitch__center-circle" />
        <span className="pitch__box pitch__box--top" />
        <span className="pitch__box pitch__box--bottom" />
      </div>
      {formation.slots.map((slot, index) => {
        const pick = picks?.find((candidate) => candidate.slotId === slot.id);
        const player = pick
          ? lineup.find((candidate) => candidate.id === pick.cardId)
          : picks
            ? undefined
            : lineup[index];
        const opponentName = opponentNames?.[index];
        const interactive = Boolean(
          (player && onInspectPlayer) || (!player && !opponentName && onSelectSlot),
        );
        const isSelected =
          selectedSlotId === slot.id || activeSlotId === slot.id;
        const className = cn(
          "pitch-node",
          player && "pitch-node--filled",
          isSelected && "pitch-node--active",
          interactive && "pitch-node--interactive",
        );
        const ariaLabel = player
          ? `${slot.label}: ${player.playerName} ${player.tournamentYear}. Inspect card`
          : opponentName
            ? `${slot.label}: ${opponentName}`
            : `${slot.label}: empty${onSelectSlot ? ". Select this position" : ""}`;
        const content = (
          <>
            <span className="pitch-node__disc">
              {player ? player.overall : opponentName ? index + 1 : slot.label}
            </span>
            {(player || opponentName) && (
              <span className="pitch-node__name">
                {player
                  ? player.playerName.split(" ").at(-1)
                  : opponentName?.split(" ").at(-1)}
              </span>
            )}
          </>
        );
        return interactive ? (
          <button
            type="button"
            key={slot.id}
            className={className}
            style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
            data-slot-x={slot.x}
            data-slot-y={slot.y}
            aria-label={ariaLabel}
            aria-pressed={!player && onSelectSlot ? isSelected : undefined}
            onClick={() => {
              if (player && onInspectPlayer) onInspectPlayer(player);
              else if (!player && onSelectSlot) onSelectSlot(slot.id);
            }}
          >
            {content}
          </button>
        ) : (
          <div
            key={slot.id}
            className={className}
            style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
            data-slot-x={slot.x}
            data-slot-y={slot.y}
            aria-label={ariaLabel}
          >
            {content}
          </div>
        );
      })}
    </div>
  );
}
