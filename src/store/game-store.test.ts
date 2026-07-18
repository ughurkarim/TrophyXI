import { beforeEach, describe, expect, it } from "vitest";
import { getFormation } from "@/data/formations";
import { historicalOpponents } from "@/data/opponents";
import { playersById } from "@/data/players";
import { useGameStore } from "@/store/game-store";

const initialize = () => {
  const store = useGameStore.getState();
  store.clearGame();
  store.selectEra("all");
  store.selectManager(useGameStore.getState().managerOptionIds[0]);
  store.selectFormation(useGameStore.getState().formationOptionIds[0]);
};

const placeFirstViableOption = () => {
  const option = useGameStore.getState().optionIds[0];
  expect(option).toBeTruthy();
  useGameStore.getState().selectPlayer(option);
  const preview = useGameStore
    .getState()
    .projectedPositionFits.find((candidate) => candidate.canPlace);
  expect(preview).toBeTruthy();
  useGameStore.getState().placeSelectedPlayer(preview!.slotId);
};

const completeStarters = () => {
  for (let index = 0; index < 11; index += 1) {
    placeFirstViableOption();
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

  it("generates five cards before any position and requires two clicks", () => {
    expect(useGameStore.getState().optionIds).toHaveLength(5);
    expect(useGameStore.getState().picks).toEqual([]);
    const option = useGameStore.getState().optionIds[0];
    useGameStore.getState().selectPlayer(option);
    expect(useGameStore.getState().selectedPlayerId).toBe(option);
    expect(useGameStore.getState().picks).toEqual([]);
    expect(useGameStore.getState().projectedPositionFits).toHaveLength(11);
    const preview = useGameStore
      .getState()
      .projectedPositionFits.find((candidate) => candidate.canPlace)!;
    useGameStore.getState().placeSelectedPlayer(preview.slotId);
    expect(useGameStore.getState().picks).toHaveLength(1);
    expect(useGameStore.getState().picks[0].slotId).toBe(preview.slotId);
    expect(useGameStore.getState().selectedPlayerId).toBeNull();
    expect(useGameStore.getState().optionIds).toHaveLength(5);
  });

  it("cancels by control or second card click without changing the spin", () => {
    const options = [...useGameStore.getState().optionIds];
    useGameStore.getState().selectPlayer(options[0]);
    useGameStore.getState().selectPlayer(options[0]);
    expect(useGameStore.getState().selectedPlayerId).toBeNull();
    expect(useGameStore.getState().optionIds).toEqual(options);
    useGameStore.getState().selectPlayer(options[1]);
    useGameStore.getState().cancelPlayerSelection();
    expect(useGameStore.getState().selectedPlayerId).toBeNull();
    expect(useGameStore.getState().picks).toEqual([]);
    expect(useGameStore.getState().optionIds).toEqual(options);
  });

  it("allows one separate deterministic formation respin", () => {
    useGameStore.getState().clearGame();
    useGameStore.getState().selectEra("2000s");
    useGameStore
      .getState()
      .selectManager(useGameStore.getState().managerOptionIds[0]);
    const original = [...useGameStore.getState().formationOptionIds];
    useGameStore.getState().respinFormations();
    const replacement = [...useGameStore.getState().formationOptionIds];
    expect(replacement).toHaveLength(4);
    expect(replacement.every((id) => !original.includes(id))).toBe(true);
    expect(useGameStore.getState().formationRespinRemaining).toBe(0);
    expect(useGameStore.getState().playerRespinsRemaining).toBe(2);
    useGameStore.getState().respinFormations();
    expect(useGameStore.getState().formationOptionIds).toEqual(replacement);
  });

  it("allows exactly two permanent five-card player respins", () => {
    const first = useGameStore
      .getState()
      .optionIds.map((id) => playersById.get(id)!.playerIdentityId);
    useGameStore.getState().respinPlayers();
    const second = useGameStore
      .getState()
      .optionIds.map((id) => playersById.get(id)!.playerIdentityId);
    expect(second).toHaveLength(5);
    expect(second.every((identity) => !first.includes(identity))).toBe(true);
    expect(useGameStore.getState().playerRespinsRemaining).toBe(1);
    useGameStore.getState().respinPlayers();
    const third = [...useGameStore.getState().optionIds];
    expect(useGameStore.getState().playerRespinsRemaining).toBe(0);
    useGameStore.getState().respinPlayers();
    expect(useGameStore.getState().optionIds).toEqual(third);
  });

  it("allows one permanent manager respin independent of formation and players", () => {
    useGameStore.getState().clearGame();
    useGameStore.getState().selectEra("1970s");
    const before = [...useGameStore.getState().managerOptionIds];
    useGameStore.getState().respinManagers();
    const replacement = [...useGameStore.getState().managerOptionIds];
    expect(before).toHaveLength(5);
    expect(replacement).toHaveLength(5);
    expect(replacement.every((id) => !before.includes(id))).toBe(true);
    expect(useGameStore.getState().managerRespinRemaining).toBe(0);
    expect(useGameStore.getState().playerRespinsRemaining).toBe(2);
    expect(useGameStore.getState().formationRespinRemaining).toBe(1);
    useGameStore.getState().respinManagers();
    expect(useGameStore.getState().managerOptionIds).toEqual(replacement);
  });

  it("drafts three identity-safe bench players from five-card spins and reorders priority", () => {
    completeStarters();
    const starterIdentities = new Set(
      useGameStore
        .getState()
        .picks.map((pick) => playersById.get(pick.cardId)!.playerIdentityId),
    );
    useGameStore.getState().startBenchDraft();
    for (const [index, slotId] of (
      ["bench-1", "bench-2", "bench-3"] as const
    ).entries()) {
      const options = useGameStore.getState().optionIds;
      expect(options).toHaveLength(5);
      expect(
        new Set(
          options.map((id) => playersById.get(id)!.playerIdentityId),
        ).size,
      ).toBe(5);
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

  it("defaults Champions Only on and can persist an explicit off state", () => {
    expect(useGameStore.getState().opponentFilters.championOnly).toBe(true);
    useGameStore.getState().setOpponentFilters({ championOnly: false });
    expect(useGameStore.getState().opponentFilters.championOnly).toBe(false);
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
