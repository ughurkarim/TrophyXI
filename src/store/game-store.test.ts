import { beforeEach, describe, expect, it } from "vitest";
import { spain2010 } from "@/data/champions";
import { playersById } from "@/data/players";
import { useGameStore } from "@/store/game-store";

const initialize = () => {
  const store = useGameStore.getState();
  store.clearGame();
  store.selectEra("all");
  store.selectManager(useGameStore.getState().managerOptionIds[0]);
  store.selectFormation("4-3-3");
};

describe("game store integrity", () => {
  beforeEach(() => {
    localStorage.clear();
    initialize();
  });

  it("waits for an explicit open-slot selection", () => {
    expect(useGameStore.getState().optionIds).toEqual([]);
    useGameStore.getState().selectSlot("st");
    expect(useGameStore.getState().selectedSlotId).toBe("st");
    expect(useGameStore.getState().optionIds).toHaveLength(3);
    useGameStore.getState().selectPlayer(useGameStore.getState().optionIds[0]);
    expect(useGameStore.getState().selectedSlotId).toBeNull();
    expect(useGameStore.getState().picks[0].slotId).toBe("st");
  });

  it("permanently rejects all three identities on the one player respin", () => {
    useGameStore.getState().selectSlot("st");
    const first = useGameStore
      .getState()
      .optionIds.map((id) => playersById.get(id)!.playerIdentityId);
    useGameStore.getState().respinPlayers();
    const second = useGameStore
      .getState()
      .optionIds.map((id) => playersById.get(id)!.playerIdentityId);
    expect(second.every((identity) => !first.includes(identity))).toBe(true);
    expect(useGameStore.getState().respinUsed).toBe(true);
    const fixed = [...useGameStore.getState().optionIds];
    useGameStore.getState().respinPlayers();
    expect(useGameStore.getState().optionIds).toEqual(fixed);
  });

  it("never returns a Spain 2010 opponent identity", () => {
    const excluded = new Set(
      spain2010.lineup.map((player) => player.playerIdentityId),
    );
    for (const slotId of ["gk", "lb", "lcb", "cm", "lw", "st", "rw"]) {
      useGameStore.getState().selectSlot(slotId);
      const identities = useGameStore
        .getState()
        .optionIds.map((id) => playersById.get(id)!.playerIdentityId);
      expect(identities.every((identity) => !excluded.has(identity))).toBe(true);
      useGameStore.getState().cancelSlot();
    }
  });

  it("repairs duplicate identities in hydrated picks and announces it", () => {
    useGameStore.setState({
      picks: [
        { slotId: "lw", cardId: "kylian-mbappe-2018" },
        { slotId: "rw", cardId: "kylian-mbappe-2022" },
      ],
    });
    useGameStore.getState().repairHydratedState();
    expect(useGameStore.getState().picks).toHaveLength(1);
    expect(useGameStore.getState().saveNotice).toMatch(/repaired/i);
  });
});
