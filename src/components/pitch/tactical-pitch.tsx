"use client";
import { CircularPortrait } from "@/components/cards/circular-portrait";
import type {
  DraftPick,
  Formation,
  PlayerTournamentCard,
  PositionFitPreview,
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
  fitPreviews = [],
  onSelectSlot,
  onInspectPlayer,
  onPreviewSlot,
}: {
  formation: Formation;
  lineup?: PlayerTournamentCard[];
  picks?: DraftPick[];
  compact?: boolean;
  activeSlotId?: string;
  selectedSlotId?: string | null;
  opponentNames?: string[];
  fitPreviews?: PositionFitPreview[];
  onSelectSlot?: (slotId: string) => void;
  onInspectPlayer?: (player: PlayerTournamentCard) => void;
  onPreviewSlot?: (slotId: string | null) => void;
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
        const fitPreview = fitPreviews.find(
          (candidate) => candidate.slotId === slot.id,
        );
        const pick = picks?.find((candidate) => candidate.slotId === slot.id);
        const player = pick
          ? lineup.find((candidate) => candidate.id === pick.cardId)
          : picks
            ? undefined
            : lineup[index];
        const opponentName = opponentNames?.[index];
        const interactive = Boolean(
          (player && onInspectPlayer) ||
            (!player && !opponentName && onSelectSlot),
        );
        const isSelected =
          selectedSlotId === slot.id || activeSlotId === slot.id;
        const className = cn(
          "pitch-node",
          player && "pitch-node--filled",
          isSelected && "pitch-node--active",
          interactive && "pitch-node--interactive",
          fitPreview && `pitch-node--fit-${fitPreview.state}`,
          fitPreview && slot.x <= 15 && "pitch-node--near-left",
          fitPreview && slot.x >= 85 && "pitch-node--near-right",
          fitPreview && slot.y <= 20 && "pitch-node--near-top",
          slot.y >= 80 && "pitch-node--near-bottom",
          fitPreview && slot.y >= 80 && "pitch-node--fit-label-above",
          fitPreview?.feasibilityBlocked && "pitch-node--feasibility-blocked",
        );
        const ariaLabel = player
          ? `${slot.label}: ${player.playerName} ${player.tournamentYear}. Inspect card`
          : opponentName
            ? `${slot.label}: ${opponentName}`
            : fitPreview
              ? `${slot.label}. ${fitPreview.label}, ${fitPreview.fit} percent. ${
                  fitPreview.state === "incompatible"
                    ? "Placement unavailable"
                  : fitPreview.penaltyPercent === 0
                    ? "No placement penalty"
                    : `${fitPreview.penaltyPercent} percent performance penalty`
                }.${
                  fitPreview.feasibilityBlocked
                    ? " Placement unavailable for this squad."
                    : fitPreview.canPlace
                      ? " Select this position."
                      : " Incompatible."
                }`
              : `${slot.label}: empty${onSelectSlot ? ". Select this position" : ""}`;
        const content = (
          <>
            <span className="pitch-node__disc">
              {player ? (
                <CircularPortrait
                  imageId={player.imageId}
                  subjectName={player.playerName}
                  era={player.era}
                  statusTier={player.statusTier}
                  countryCode={player.countryCode}
                  tournamentYear={player.tournamentYear}
                  size="compact"
                />
              ) : opponentName ? (
                index + 1
              ) : (
                slot.label
              )}
            </span>
            {(player || opponentName) && (
              <span className="pitch-node__name">
                {player
                  ? player.playerName.split(" ").at(-1)
                  : opponentName?.split(" ").at(-1)}
              </span>
            )}
            {!player && !opponentName && fitPreview && (
              <span className="pitch-node__fit">
                <small>POSITION FIT</small>
                <b>{fitPreview.fit}%</b>
                <em>{fitPreview.label}</em>
                {fitPreview.state !== "incompatible" &&
                  fitPreview.penaltyPercent > 0 && (
                    <i>−{fitPreview.penaltyPercent}%</i>
                  )}
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
            aria-disabled={
              !player && fitPreview ? !fitPreview.canPlace : undefined
            }
            onClick={() => {
              if (player && onInspectPlayer) onInspectPlayer(player);
              else if (
                !player &&
                onSelectSlot &&
                (!fitPreview || fitPreview.canPlace)
              ) {
                onSelectSlot(slot.id);
              }
            }}
            onMouseEnter={() => {
              if (!player && fitPreview?.canPlace) onPreviewSlot?.(slot.id);
            }}
            onMouseLeave={() => {
              if (!player) onPreviewSlot?.(null);
            }}
            onFocus={() => {
              if (!player && fitPreview?.canPlace) onPreviewSlot?.(slot.id);
            }}
            onBlur={() => {
              if (!player) onPreviewSlot?.(null);
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
