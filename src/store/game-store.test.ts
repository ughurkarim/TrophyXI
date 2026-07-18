import { beforeEach, describe, expect, it } from "vitest";
import { getFormation } from "@/data/formations";
import { historicalOpponents } from "@/data/opponents/generated";
import { playersById } from "@/data/players";
import { useGameStore } from "@/store/game-store";

const initialize = () => {
  const store = useGameStore.getState();
  store.clearGame();
  store.selectEra("all");
  store.selectManager(useGameStore.getState().managerOptionIds[0]);
  store.selectFormation(useGameStore.getState().formationOptionIds[0]);
};

const completeStarters = () => {
  const formation = getFormation(useGameStore.getState().formationId!);
  for (const slot of formation.slots) {
    useGameStore.getState().selectSlot(slot.id);
    const option = useGameStore.getState().optionIds[0];
    expect(option).toBeTruthy();
    useGameStore.getState().selectPlayer(option);
  }
};

const completeBench = () => {
  useGameStore.getState().startBenchDraft();
  for (const slotId of ["bench-1", "bench-2", "bench-3"] as const) {
    useGameStore
      .getState()
      .selectPlayer(useGameStore.getState().optionIds[0]);
    useGameStore.getState().assignBenchPlayer(slotId);
  }
  useGameStore.getState().finalizeBench();
};

describe("game store integrity", () => {
  beforeEach(() => {
    localStorage.clear();
    initialize();
  });

  it("waits for an explicit open-slot selection", () => {
    expect(useGameStore.getState().optionIds).toEqual([]);
    const slot = getFormation(useGameStore.getState().formationId!).slots[9];
    useGameStore.getState().selectSlot(slot.id);
    expect(useGameStore.getState().selectedSlotId).toBe(slot.id);
    expect(useGameStore.getState().optionIds).toHaveLength(3);
    useGameStore.getState().selectPlayer(useGameStore.getState().optionIds[0]);
    expect(useGameStore.getState().selectedSlotId).toBeNull();
    expect(useGameStore.getState().picks[0].slotId).toBe(slot.id);
  });

  it("allows exactly two permanent player respins", () => {
    const slot = getFormation(useGameStore.getState().formationId!).slots[9];
    useGameStore.getState().selectSlot(slot.id);
    const first = useGameStore
      .getState()
      .optionIds.map((id) => playersById.get(id)!.playerIdentityId);
    useGameStore.getState().respinPlayers();
    const second = useGameStore
      .getState()
      .optionIds.map((id) => playersById.get(id)!.playerIdentityId);
    expect(second.every((identity) => !first.includes(identity))).toBe(true);
    expect(useGameStore.getState().playerRespinsRemaining).toBe(1);
    useGameStore.getState().respinPlayers();
    const third = [...useGameStore.getState().optionIds];
    expect(useGameStore.getState().playerRespinsRemaining).toBe(0);
    useGameStore.getState().respinPlayers();
    expect(useGameStore.getState().optionIds).toEqual(third);
    expect(useGameStore.getState().playerRespinsRemaining).toBe(0);
  });

  it("does not let manager selection consume a player respin", () => {
    useGameStore.getState().clearGame();
    useGameStore.getState().selectEra("1970s");
    const before = [...useGameStore.getState().managerOptionIds];
    useGameStore.getState().respinManagers();
    expect(useGameStore.getState().managerOptionIds).toEqual(before);
    expect(useGameStore.getState().playerRespinsRemaining).toBe(2);
  });

  it("drafts exactly three identity-safe bench players and reorders priority", () => {
    completeStarters();
    const starterIdentities = new Set(
      useGameStore
        .getState()
        .picks.map(
          (pick) => playersById.get(pick.cardId)!.playerIdentityId,
        ),
    );
    useGameStore.getState().startBenchDraft();
    for (const [index, slotId] of (
      ["bench-1", "bench-2", "bench-3"] as const
    ).entries()) {
      const options = useGameStore.getState().optionIds;
      expect(options).toHaveLength(3);
      expect(
        new Set(
          options.map((id) => playersById.get(id)!.playerIdentityId),
        ).size,
      ).toBe(3);
      useGameStore.getState().selectPlayer(options[0]);
      useGameStore.getState().assignBenchPlayer(slotId);
      expect(useGameStore.getState().benchPicks).toHaveLength(index + 1);
    }
    const benchIdentities = useGameStore
      .getState()
      .benchPicks.map(
        (pick) => playersById.get(pick.cardId)!.playerIdentityId,
      );
    expect(new Set(benchIdentities).size).toBe(3);
    expect(
      benchIdentities.every((identity) => !starterIdentities.has(identity)),
    ).toBe(true);
    const originalFirst = useGameStore
      .getState()
      .benchPicks.find((pick) => pick.slotId === "bench-1")!.cardId;
    useGameStore.getState().moveBenchPlayer("bench-1", 1);
    expect(
      useGameStore
        .getState()
        .benchPicks.find((pick) => pick.slotId === "bench-2")!.cardId,
    ).toBe(originalFirst);
  });

  it("persists a valid nation-year opponent selection after the full squad", () => {
    completeStarters();
    completeBench();
    const opponent = historicalOpponents.find(
      (candidate) => candidate.id === "brazil-1970",
    )!;
    useGameStore.getState().selectOpponent(opponent.id);
    expect(useGameStore.getState().selectedOpponentId).toBe(opponent.id);
  });

  it("repairs duplicate identities in hydrated picks and announces it", () => {
    useGameStore.setState({ formationId: "4-3-3" });
    const formation = getFormation("4-3-3");
    const wideSlots = formation.slots.filter((slot) =>
      ["LW", "RW"].includes(slot.position),
    );
    useGameStore.setState({
      picks: [
        { slotId: wideSlots[0].id, cardId: "kylian-mbappe-2018" },
        { slotId: wideSlots[1].id, cardId: "kylian-mbappe-2022" },
      ],
    });
    useGameStore.getState().repairHydratedState();
    expect(useGameStore.getState().picks).toHaveLength(1);
    expect(useGameStore.getState().saveNotice).toMatch(/repaired/i);
  });
});
