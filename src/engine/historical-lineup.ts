import type {
  Formation,
  FormationSlot,
  HistoricalLineupPlayer,
  Position,
} from "@/types/game";

export const compatibleHistoricalPositions = (
  position: Position,
): Position[] => {
  const compatible: Record<Position, Position[]> = {
    GK: ["GK"],
    LB: ["LB", "LWB", "LCB"],
    LCB: ["LCB", "CB", "LB"],
    CB: ["CB", "LCB", "RCB"],
    RCB: ["RCB", "CB", "RB"],
    RB: ["RB", "RWB", "RCB"],
    LWB: ["LWB", "LB", "LM"],
    RWB: ["RWB", "RB", "RM"],
    DM: ["DM", "CM", "CB"],
    CM: ["CM", "DM", "AM"],
    AM: ["AM", "CM", "CF"],
    LM: ["LM", "LW", "CM"],
    RM: ["RM", "RW", "CM"],
    LW: ["LW", "LM", "CF"],
    RW: ["RW", "RM", "CF"],
    CF: ["CF", "ST", "AM"],
    ST: ["ST", "CF"],
  };
  return compatible[position];
};

export const canHistoricalPlayerFillSlot = (
  player: HistoricalLineupPlayer,
  slot: FormationSlot,
) =>
  compatibleHistoricalPositions(player.position).some((position) =>
    slot.accepts.includes(position),
  );

const assignmentScore = (
  player: HistoricalLineupPlayer,
  slot: FormationSlot,
) => {
  if (player.position === slot.position) return 0;
  if (slot.accepts.includes(player.position)) return 1;
  if (compatibleHistoricalPositions(player.position).includes(slot.position)) {
    return 2;
  }
  return 3;
};

/**
 * Historical source rows are not stored in tactical-node order. This finds a
 * deterministic compatible assignment without changing the source-faithful
 * player positions or the formation coordinates used by the pitch.
 */
export const assignHistoricalLineupToFormation = (
  players: HistoricalLineupPlayer[],
  formation: Formation,
): HistoricalLineupPlayer[] | null => {
  if (players.length !== formation.slots.length) return null;

  const slots = formation.slots
    .map((slot, slotIndex) => ({
      slot,
      slotIndex,
      candidates: players
        .map((player, playerIndex) => ({ player, playerIndex }))
        .filter(({ player }) => canHistoricalPlayerFillSlot(player, slot))
        .sort(
          (first, second) =>
            assignmentScore(first.player, slot) -
              assignmentScore(second.player, slot) ||
            first.playerIndex - second.playerIndex,
        ),
    }))
    .sort(
      (first, second) =>
        first.candidates.length - second.candidates.length ||
        (first.slot.position === "GK" ? -1 : 0) -
          (second.slot.position === "GK" ? -1 : 0) ||
        first.slotIndex - second.slotIndex,
    );
  if (slots.some(({ candidates }) => candidates.length === 0)) return null;

  const usedPlayerIndexes = new Set<number>();
  const assigned = new Array<HistoricalLineupPlayer>(players.length);
  const place = (slotOrderIndex: number): boolean => {
    if (slotOrderIndex === slots.length) return true;
    const { slotIndex, candidates } = slots[slotOrderIndex];
    for (const { player, playerIndex } of candidates) {
      if (usedPlayerIndexes.has(playerIndex)) continue;
      usedPlayerIndexes.add(playerIndex);
      assigned[slotIndex] = player;
      if (place(slotOrderIndex + 1)) return true;
      usedPlayerIndexes.delete(playerIndex);
    }
    return false;
  };

  return place(0) ? assigned : null;
};
