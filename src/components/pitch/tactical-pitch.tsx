"use client";

import { useMemo } from "react";
import { CircularPortrait } from "@/components/cards/circular-portrait";
import type {
  DraftPick,
  Formation,
  PlayerTournamentCard,
  PositionFitPreview,
} from "@/types/game";
import { cn } from "@/lib/utils";
import fitStyles from "./tactical-pitch-universal.module.css";

type FormationSlot = Formation["slots"][number];

type PositionedSlot = {
  x: number;
  y: number;
  rowIndex: number;
  rowSize: number;
  isLastOutfieldRow: boolean;
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const rowYPositions = (rowCount: number): number[] => {
  const presets: Record<number, number[]> = {
    1: [45],
    2: [23, 66],
    3: [15, 46, 72],
    4: [12, 32, 52, 73],
    5: [10, 25, 41, 58, 74],
  };

  if (presets[rowCount]) return presets[rowCount];

  const top = 9;
  const bottom = 75;
  const step = rowCount > 1 ? (bottom - top) / (rowCount - 1) : 0;
  return Array.from({ length: rowCount }, (_, index) => top + step * index);
};

const rowXPositions = (slots: FormationSlot[]): number[] => {
  const ordered = [...slots].sort((first, second) => first.x - second.x);
  const count = ordered.length;
  const originalSpread = count > 1 ? ordered.at(-1)!.x - ordered[0].x : 0;

  if (count === 1) return [50];

  if (count === 2) {
    return originalSpread >= 45 ? [22, 78] : [35, 65];
  }

  if (count === 3) {
    return originalSpread >= 58 ? [15, 50, 85] : [25, 50, 75];
  }

  if (count === 4) return [12, 37, 63, 88];
  if (count === 5) return [8, 29, 50, 71, 92];

  const left = 7;
  const right = 93;
  const step = (right - left) / (count - 1);
  return Array.from({ length: count }, (_, index) => left + step * index);
};

const groupFormationRows = (slots: FormationSlot[]): FormationSlot[][] => {
  const sorted = [...slots]
    .filter((slot) => slot.position !== "GK")
    .sort((first, second) => first.y - second.y || first.x - second.x);

  const rows: FormationSlot[][] = [];
  const mergeTolerance = 8;

  for (const slot of sorted) {
    const currentRow = rows.at(-1);
    if (!currentRow) {
      rows.push([slot]);
      continue;
    }

    const currentAverageY =
      currentRow.reduce((total, candidate) => total + candidate.y, 0) /
      currentRow.length;

    if (Math.abs(slot.y - currentAverageY) <= mergeTolerance) {
      currentRow.push(slot);
    } else {
      rows.push([slot]);
    }
  }

  return rows;
};

type TacticalPitchLayoutMode = "default" | "free-selection";

const createFormationLayout = (
  formation: Formation,
  goalkeeperYCap: number | undefined,
  layoutMode: TacticalPitchLayoutMode,
): Map<string, PositionedSlot> => {
  const layout = new Map<string, PositionedSlot>();
  const rows = groupFormationRows(formation.slots);
  const isFreeSelectionLayout = layoutMode === "free-selection";
  const isWingBack = (slot: FormationSlot) =>
    slot.position === "LWB" ||
    slot.position === "RWB" ||
    slot.label === "LWB" ||
    slot.label === "RWB";
  const isCenterBack = (slot: FormationSlot) =>
    slot.position === "CB" ||
    slot.position === "LCB" ||
    slot.position === "RCB";
  const isAttackingMid = (slot: FormationSlot) =>
    slot.label === "LAM" || slot.label === "RAM";
  const isFiveThreeTwo =
    rows.length === 4 &&
    rows[0]?.length === 2 &&
    rows[1]?.length === 3 &&
    rows[2]?.length === 2 &&
    rows[3]?.length === 3 &&
    rows[2].every(isWingBack) &&
    rows[3].every(isCenterBack);
  const isFiveTwoThree =
    rows.length === 4 &&
    rows[0]?.length === 3 &&
    rows[1]?.length === 2 &&
    rows[2]?.length === 2 &&
    rows[3]?.length === 3 &&
    rows[2].every(isWingBack) &&
    rows[3].every(isCenterBack);
  const isFourTwoTwoTwo =
    rows.length === 4 &&
    rows[0]?.length === 2 &&
    rows[1]?.length === 2 &&
    rows[2]?.length === 2 &&
    rows[3]?.length === 4 &&
    rows[1].every(isAttackingMid);
  const yPositions = isFiveThreeTwo
    ? [14, 39, 59, 74]
    : isFiveTwoThree
      ? [12, 39, 57, 74]
      : rowYPositions(rows.length);

  rows.forEach((row, rowIndex) => {
    const ordered = [...row].sort((first, second) => first.x - second.x);
    const xPositions = isFiveThreeTwo && rowIndex === 1
      ? [25, 50, 75]
      : isFourTwoTwoTwo && rowIndex === 1
        ? [23, 77]
        : rowXPositions(ordered);

    ordered.forEach((slot, slotIndex) => {
      const baseX = xPositions[slotIndex];
      const baseY = yPositions[rowIndex];

      const isLeftWing = slot.position === "LW" || slot.label === "LW";
      const isRightWing = slot.position === "RW" || slot.label === "RW";
      const isLeftWingBack =
        slot.position === "LWB" || slot.label === "LWB";
      const isRightWingBack =
        slot.position === "RWB" || slot.label === "RWB";
      const isCentralMidPair =
        slot.label === "LCM" ||
        slot.label === "RCM" ||
        (ordered.length === 2 && slot.position === "CM");

      const x = isFiveThreeTwo && rowIndex === 2
        ? isLeftWingBack
          ? 12
          : isRightWingBack
            ? 88
            : baseX
        : isLeftWingBack
          ? clamp(baseX - 8, 9, 91)
          : isRightWingBack
            ? clamp(baseX + 8, 9, 91)
            : baseX;

      const freeSelectionBackLineLift =
        isFreeSelectionLayout && rowIndex === rows.length - 1
          ? ordered.length <= 3
            ? 5
            : 4
          : 0;

      const y = clamp(
        baseY -
          freeSelectionBackLineLift +
          (isLeftWing || isRightWing ? 4 : 0) +
          (isCentralMidPair && !isFiveThreeTwo && !isFiveTwoThree ? 5 : 0),
        9,
        76,
      );

      layout.set(slot.id, {
        x,
        y,
        rowIndex,
        rowSize: ordered.length,
        isLastOutfieldRow: rowIndex === rows.length - 1,
      });
    });
  });

  const goalkeepers = formation.slots.filter((slot) => slot.position === "GK");
  goalkeepers.forEach((slot, goalkeeperIndex) => {
    const goalkeeperY = isFreeSelectionLayout
      ? clamp(goalkeeperYCap ?? 88, 87, 89)
      : goalkeeperYCap === undefined
        ? 91
        : clamp(Math.min(91, goalkeeperYCap), 82, 93);

    layout.set(slot.id, {
      x: goalkeepers.length === 1 ? 50 : 44 + goalkeeperIndex * 12,
      y: goalkeeperY,
      rowIndex: rows.length,
      rowSize: goalkeepers.length,
      isLastOutfieldRow: false,
    });
  });

  return layout;
};

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
  onSelectFilledSlot,
  onPreviewSlot,
  goalkeeperYCap,
  layoutMode = "default",
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
  onSelectFilledSlot?: (slotId: string, player: PlayerTournamentCard) => void;
  onPreviewSlot?: (slotId: string | null) => void;
  goalkeeperYCap?: number;
  layoutMode?: TacticalPitchLayoutMode;
}) {
  const formationLayout = useMemo(
    () => createFormationLayout(formation, goalkeeperYCap, layoutMode),
    [formation, goalkeeperYCap, layoutMode],
  );

  return (
    <div
      className={cn(
        "pitch",
        fitStyles.universalPitch,
        compact && "pitch--compact",
      )}
      data-formation-rows={groupFormationRows(formation.slots).length}
      data-layout-mode={layoutMode}
    >
      <div className="pitch__atmosphere" aria-hidden />
      <div className="pitch__lines" aria-hidden>
        <span className="pitch__center-line" />
        <span className="pitch__center-circle" />
        <span className="pitch__box pitch__box--top" />
        <span className="pitch__box pitch__box--bottom" />
      </div>

      {formation.slots.map((slot, index) => {
        const position = formationLayout.get(slot.id) ?? {
          x: slot.x,
          y: slot.y,
          rowIndex: 0,
          rowSize: 1,
          isLastOutfieldRow: false,
        };
        const isGoalkeeper = slot.position === "GK";
        const isCenterBack =
          slot.position === "CB" ||
          slot.position === "LCB" ||
          slot.position === "RCB";
        const isLowCenterBack = position.isLastOutfieldRow && isCenterBack;
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
          (player && (onSelectFilledSlot || onInspectPlayer)) ||
            (!player && !opponentName && onSelectSlot),
        );
        const isSelected =
          selectedSlotId === slot.id || activeSlotId === slot.id;
        const className = cn(
          "pitch-node",
          `pitch-node--row-${position.rowIndex + 1}`,
          `pitch-node--row-size-${position.rowSize}`,
          player && "pitch-node--filled",
          isSelected && "pitch-node--active",
          activeSlotId === slot.id && fitPreview && "pitch-node--best-fit",
          interactive && "pitch-node--interactive",
          fitPreview && `pitch-node--fit-${fitPreview.state}`,
          fitPreview && position.x <= 15 && "pitch-node--near-left",
          fitPreview && position.x >= 85 && "pitch-node--near-right",
          fitPreview && position.y <= 18 && "pitch-node--near-top",
          isGoalkeeper && "pitch-node--goalkeeper",
          isLowCenterBack && "pitch-node--low-center-back",
          position.y >= 78 && "pitch-node--near-bottom",
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

            {!player && !opponentName && fitPreview && (
              <span className="pitch-node__fit-percent">
                {fitPreview.fit}%
              </span>
            )}

            {(player || opponentName) && (
              <span className="pitch-node__name">
                <b>
                  {player
                    ? player.playerName.split(" ").at(-1)
                    : opponentName?.split(" ").at(-1)}
                </b>
                {player && (
                  <small>
                    {player.overall} · {player.tournamentYear}
                  </small>
                )}
              </span>
            )}
          </>
        );
        const commonProps = {
          className,
          style: { left: `${position.x}%`, top: `${position.y}%` },
          "data-slot-x": slot.x,
          "data-slot-y": slot.y,
          "data-visual-x": position.x,
          "data-visual-y": position.y,
          "data-row-index": position.rowIndex,
          "data-row-size": position.rowSize,
          "data-slot-position": slot.position,
          "aria-label": ariaLabel,
          title: fitPreview ? ariaLabel : undefined,
        };

        return interactive ? (
          <button
            type="button"
            key={slot.id}
            {...commonProps}
            aria-pressed={!player && onSelectSlot ? isSelected : undefined}
            aria-disabled={
              !player && fitPreview ? !fitPreview.canPlace : undefined
            }
            onClick={() => {
              if (player && onSelectFilledSlot) {
                onSelectFilledSlot(slot.id, player);
              } else if (player && onInspectPlayer) {
                onInspectPlayer(player);
              } else if (
                !player &&
                onSelectSlot &&
                (!fitPreview || fitPreview.canPlace)
              ) {
                onSelectSlot(slot.id);
              }
            }}
            onMouseEnter={() => {
              if (!player && fitPreview?.canPlace) {
                onPreviewSlot?.(slot.id);
              }
            }}
            onMouseLeave={() => {
              if (!player) onPreviewSlot?.(null);
            }}
            onFocus={() => {
              if (!player && fitPreview?.canPlace) {
                onPreviewSlot?.(slot.id);
              }
            }}
            onBlur={() => {
              if (!player) onPreviewSlot?.(null);
            }}
          >
            {content}
          </button>
        ) : (
          <div key={slot.id} {...commonProps}>
            {content}
          </div>
        );
      })}
    </div>
  );
}