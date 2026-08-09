import { beforeEach, describe, expect, it } from "vitest";
import { getFormation } from "@/data/formations";
import {
  historicalOpponentArchive,
  historicalOpponents,
} from "@/data/opponents";
import { draftEligiblePlayers, playersById } from "@/data/players";
import { generateFreeSelectionSquad } from "@/engine/free-selection";
import {
  isActiveWorldCupRunOpponent,
  WORLD_CUP_RUN_OPPONENT_COUNT,
} from "@/engine/world-cup-run-opponents";
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

const prepareWorldCupSquad = () => {
  const store = useGameStore.getState();
  store.clearGame();
  store.selectGameMode("world-cup-run");
  store.selectEra("all");
  store.selectManager(useGameStore.getState().managerOptionIds[0]);
  store.selectFormation(useGameStore.getState().formationOptionIds[0]);
  const formation = getFormation(useGameStore.getState().formationId!);
  const squad = generateFreeSelectionSquad({
    formation,
    cards: draftEligiblePlayers,
    seed: 2_026,
  });
  useGameStore.setState({ ...squad, draftPhase: "review" });
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

  it("persists the selected game mode and resets into that mode's fresh state", () => {
    useGameStore.getState().clearGame();
    useGameStore.getState().selectGameMode("free-selection");

    expect(useGameStore.getState().gameMode).toBe("free-selection");
    expect(useGameStore.getState().eraId).toBeNull();
    const saved = JSON.parse(
      localStorage.getItem("trophy-xi-game-v1") ?? "{}",
    ) as { state?: { gameMode?: string } };
    expect(saved.state?.gameMode).toBe("free-selection");

    useGameStore.getState().selectEra("all");
    expect(useGameStore.getState().managerRespinRemaining).toBe(0);
    expect(useGameStore.getState().formationRespinRemaining).toBe(0);
  });

  it("keeps manager selection editable after formation advance", () => {
    const firstManagerId = useGameStore.getState().managerId!;
    const otherManagerId = useGameStore
      .getState()
      .managerOptionIds.find((id) => id !== firstManagerId)!;

    expect(useGameStore.getState().managerLocked).toBe(false);
    useGameStore.getState().selectManager(otherManagerId);

    expect(useGameStore.getState().managerId).toBe(otherManagerId);
    expect(useGameStore.getState().formationId).toBeNull();
  });

  it("treats reselecting the current manager as a no-op", () => {
    const before = useGameStore.getState();
    useGameStore.getState().selectManager(before.managerId!);
    const after = useGameStore.getState();

    expect(after.managerId).toBe(before.managerId);
    expect(after.formationId).toBe(before.formationId);
    expect(after.optionIds).toEqual(before.optionIds);
    expect(after.picks).toEqual(before.picks);
    expect(after.benchPicks).toEqual(before.benchPicks);
    expect(after.matchResult).toBe(before.matchResult);
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
    const before = useGameStore.getState();
    useGameStore.getState().respinFormations();
    const after = useGameStore.getState();
    const replacement = [...after.formationOptionIds];
    expect(replacement).toHaveLength(4);
    expect(replacement.every((id) => !original.includes(id))).toBe(true);
    expect(after.formationRespinRemaining).toBe(0);
    expect(after.playerRespinsRemaining).toBe(2);
    expect(after.managerId).toBe(before.managerId);
    expect(after.eraId).toBe(before.eraId);
    expect(after.draftSeed).toBe(before.draftSeed);
    expect(after.managerOptionIds).toEqual(before.managerOptionIds);
    expect(after.originalFormationOptionIds).toEqual(
      before.originalFormationOptionIds,
    );
    expect(after.optionIds).toEqual(before.optionIds);
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
    expect(before).toHaveLength(3);
    expect(replacement).toHaveLength(3);
    expect(replacement.every((id) => !before.includes(id))).toBe(true);
    expect(useGameStore.getState().managerRespinRemaining).toBe(0);
    expect(useGameStore.getState().playerRespinsRemaining).toBe(2);
    expect(useGameStore.getState().formationRespinRemaining).toBe(1);
    useGameStore.getState().respinManagers();
    expect(useGameStore.getState().managerOptionIds).toEqual(replacement);
    const saved = JSON.parse(
      localStorage.getItem("trophy-xi-game-v1") ?? "{}",
    ) as { state?: { managerRespinRemaining?: number } };
    expect(saved.state?.managerRespinRemaining).toBe(0);
  });

  it("allows a visible manager change and respin without locking", () => {
    useGameStore.getState().clearGame();
    useGameStore.getState().selectEra("2010s");
    const [first, second] = useGameStore.getState().managerOptionIds;

    useGameStore.getState().selectManager(first);
    expect(useGameStore.getState().managerLocked).toBe(false);
    useGameStore.getState().selectManager(second);
    expect(useGameStore.getState().managerId).toBe(second);
    useGameStore.getState().respinManagers();
    expect(useGameStore.getState().managerOptionIds).not.toContain(second);
    expect(useGameStore.getState().managerId).toBeNull();

    useGameStore.getState().lockManager();
    expect(useGameStore.getState().managerLocked).toBe(false);
  });

  it("keeps every respin counter independent across manager, formation, and player offers", () => {
    useGameStore.getState().clearGame();
    useGameStore.getState().selectEra("2000s");
    useGameStore.getState().respinManagers();
    expect(useGameStore.getState().managerRespinRemaining).toBe(0);
    expect(useGameStore.getState().formationRespinRemaining).toBe(1);
    expect(useGameStore.getState().playerRespinsRemaining).toBe(2);

    useGameStore
      .getState()
      .selectManager(useGameStore.getState().managerOptionIds[0]);
    useGameStore.getState().respinFormations();
    expect(useGameStore.getState().formationRespinRemaining).toBe(0);
    expect(useGameStore.getState().playerRespinsRemaining).toBe(2);

    useGameStore
      .getState()
      .selectFormation(useGameStore.getState().formationOptionIds[0]);
    useGameStore.getState().respinPlayers();
    expect(useGameStore.getState().playerRespinsRemaining).toBe(1);
    expect(useGameStore.getState().managerRespinRemaining).toBe(0);
    expect(useGameStore.getState().formationRespinRemaining).toBe(0);
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

  it("randomizes, validates, and finalizes an identity-safe Free Selection 11 plus 3", () => {
    useGameStore.getState().clearGame();
    useGameStore.getState().selectGameMode("free-selection");
    useGameStore.getState().selectEra("all");
    useGameStore
      .getState()
      .selectManager(useGameStore.getState().managerOptionIds[0]);
    useGameStore
      .getState()
      .selectFormation(useGameStore.getState().formationOptionIds[0]);
    useGameStore.getState().randomizeFreeSquad();

    const randomized = useGameStore.getState();
    expect(randomized.picks).toHaveLength(11);
    expect(randomized.benchPicks).toHaveLength(3);
    expect(
      new Set(
        [...randomized.picks, ...randomized.benchPicks].map(
          (pick) => playersById.get(pick.cardId)!.playerIdentityId,
        ),
      ).size,
    ).toBe(14);

    randomized.finalizeFreeSelection();
    expect(useGameStore.getState().draftPhase).toBe("opponent");
  });

  it("allows any identity-safe manual bench and can return from opponent selection", () => {
    useGameStore.getState().clearGame();
    useGameStore.getState().selectGameMode("free-selection");
    useGameStore.getState().selectEra("all");
    useGameStore
      .getState()
      .selectManager(useGameStore.getState().managerOptionIds[0]);
    useGameStore
      .getState()
      .selectFormation(useGameStore.getState().formationOptionIds[0]);
    useGameStore.getState().randomizeFreeSquad();

    const state = useGameStore.getState();
    const usedIdentityIds = new Set(
      [...state.picks, ...state.benchPicks].map(
        (pick) => playersById.get(pick.cardId)!.playerIdentityId,
      ),
    );
    const replacement = draftEligiblePlayers.find(
      (player) =>
        player.primaryPosition !== "GK" &&
        !usedIdentityIds.has(player.playerIdentityId),
    )!;
    useGameStore.setState({
      benchPicks: state.benchPicks.map((pick) =>
        playersById.get(pick.cardId)?.primaryPosition === "GK"
          ? { ...pick, cardId: replacement.id }
          : pick,
      ),
    });

    useGameStore.getState().finalizeFreeSelection();
    expect(useGameStore.getState().draftPhase).toBe("opponent");
    useGameStore.getState().editFreeSelection();
    expect(useGameStore.getState().draftPhase).toBe("review");
    expect(useGameStore.getState().selectedOpponentId).toBeNull();
  });

  it("defaults Champions Only on and can persist an explicit off state", () => {
    expect(useGameStore.getState().opponentFilters.championOnly).toBe(true);
    useGameStore.getState().setOpponentFilters({ championOnly: false });
    expect(useGameStore.getState().opponentFilters.championOnly).toBe(false);
  });

  it("starts an end-of-run redraft from fresh manager choices in the same era", () => {
    const eraId = useGameStore.getState().eraId;
    expect(eraId).toBe("all");
    expect(useGameStore.getState().managerId).toBeTruthy();

    useGameStore.getState().restartFromManager();

    const restarted = useGameStore.getState();
    expect(restarted.eraId).toBe(eraId);
    expect(restarted.managerId).toBeNull();
    expect(restarted.managerOptionIds).toHaveLength(3);
    expect(restarted.originalManagerOptionIds).toEqual(
      restarted.managerOptionIds,
    );
    expect(restarted.managerRespinRemaining).toBe(1);
    expect(restarted.formationId).toBeNull();
    expect(restarted.formationOptionIds).toEqual([]);
    expect(restarted.picks).toEqual([]);
    expect(restarted.benchPicks).toEqual([]);
    expect(restarted.optionIds).toEqual([]);
    expect(restarted.matchResult).toBeNull();
  });

  it("resets the in-progress draft to fresh coach choices in the same era", () => {
    const eraId = useGameStore.getState().eraId;
    useGameStore.getState().resetDraft();

    const reset = useGameStore.getState();
    expect(reset.eraId).toBe(eraId);
    expect(reset.managerId).toBeNull();
    expect(reset.managerOptionIds).toHaveLength(3);
    expect(reset.managerRespinRemaining).toBe(1);
    expect(reset.formationId).toBeNull();
    expect(reset.picks).toEqual([]);
    expect(reset.benchPicks).toEqual([]);
    expect(reset.optionIds).toEqual([]);
    expect(reset.playerRespinsRemaining).toBe(2);
  });

  it("persists a valid nation-year opponent selection after the full squad", () => {
    completeStarters();
    completeBench();
    const draftedIdentities = new Set(
      [...useGameStore.getState().picks, ...useGameStore.getState().benchPicks].map(
        (pick) => playersById.get(pick.cardId)!.playerIdentityId,
      ),
    );
    const opponent = historicalOpponents.find(
      (candidate) =>
        ![...candidate.startingLineup, ...candidate.substitutes].some(
          (player) => draftedIdentities.has(player.playerIdentityId),
        ),
    )!;
    useGameStore.getState().selectOpponent(opponent.id);
    expect(useGameStore.getState().selectedOpponentId).toBe(opponent.id);
  });

  it("accepts an opponent whose sourced lineup shares a drafted identity", () => {
    const squad = generateFreeSelectionSquad({
      formation: getFormation("4-3-3"),
      cards: draftEligiblePlayers,
      seed: 77,
    });
    useGameStore.setState({
      picks: [
        { slotId: squad.picks[0].slotId, cardId: "lionel-messi-2022" },
        ...squad.picks.slice(1),
      ],
      benchPicks: squad.benchPicks,
      draftPhase: "opponent",
      selectedOpponentId: null,
    });

    useGameStore.getState().selectOpponent("argentina-2022");
    expect(useGameStore.getState().selectedOpponentId).toBe("argentina-2022");
  });

  it("starts, quick-simulates, persists, and restarts a 48-team World Cup Run", () => {
    prepareWorldCupSquad();
    useGameStore.getState().startWorldCupRun();

    const started = useGameStore.getState().worldCupRun!;
    const field = useGameStore.getState().worldCupRunOpponents;
    expect(started.teams).toHaveLength(48);
    expect(field).toHaveLength(WORLD_CUP_RUN_OPPONENT_COUNT);
    expect(started.groups).toHaveLength(12);
    expect(
      started.fixtures.filter(
        (fixture) =>
          fixture.stage === "group" &&
          [fixture.homeTeamId, fixture.awayTeamId].includes("trophy-xi"),
      ),
    ).toHaveLength(3);
    expect(started.history).toHaveLength(0);
    expect(field.every(isActiveWorldCupRunOpponent)).toBe(true);
    expect(
      field.every((opponent) => !opponent.nationName.startsWith("Trophy XI Model")),
    ).toBe(true);
    expect(
      new Set(
        started.teams
          .filter((team) => team.id !== started.userTeamId)
          .map((team) => team.id),
      ),
    ).toEqual(new Set(field.map((opponent) => opponent.id)));
    const saved = JSON.parse(
      localStorage.getItem("trophy-xi-game-v1") ?? "{}",
    ) as {
      state?: {
        worldCupRun?: { teams?: unknown[] };
        worldCupRunOpponents?: unknown[];
      };
    };
    expect(saved.state?.worldCupRun?.teams).toHaveLength(48);
    expect(saved.state?.worldCupRunOpponents).toHaveLength(
      WORLD_CUP_RUN_OPPONENT_COUNT,
    );

    useGameStore.getState().simulateWorldCupRunMatch();
    expect(useGameStore.getState().worldCupRun?.history).toHaveLength(24);
    expect(
      Object.values(useGameStore.getState().worldCupRun!.standings)
        .flat()
        .every((standing) => standing.played === 1),
    ).toBe(true);
    expect(useGameStore.getState().matchResult).toBeNull();

    const initialSeed = started.seed;
    useGameStore.getState().restartWorldCupRun();
    expect(useGameStore.getState().worldCupRun?.seed).not.toBe(initialSeed);
    expect(useGameStore.getState().worldCupRun?.groups).toHaveLength(12);
  }, 10_000);

  it("clears a hydrated World Cup Run field containing a retired modeled team", () => {
    prepareWorldCupSquad();
    useGameStore.getState().startWorldCupRun();
    useGameStore.setState((state) => ({
      worldCupRunOpponents: [
        {
          ...state.worldCupRunOpponents[0],
          id: "trophy-xi-model-01",
          kind: "model",
          nationName: "Trophy XI Model 01",
        },
        ...state.worldCupRunOpponents.slice(1),
      ],
    }));

    useGameStore.getState().repairHydratedState();

    expect(useGameStore.getState().worldCupRun).toBeNull();
    expect(useGameStore.getState().worldCupRunOpponents).toEqual([]);
    expect(useGameStore.getState().selectedOpponentId).toBeNull();
    expect(useGameStore.getState().saveNotice).toMatch(
      /tournament field was rebuilt/i,
    );
  });

  it("rejects a research stub even when it reuses an active champion id", () => {
    prepareWorldCupSquad();
    useGameStore.getState().startWorldCupRun();
    const field = useGameStore.getState().worldCupRunOpponents;
    const championIndex = field.findIndex((opponent) => {
      const archiveVersion = historicalOpponentArchive.find(
        (candidate) => candidate.id === opponent.id,
      );
      return (
        historicalOpponents.some((champion) => champion.id === opponent.id) &&
        archiveVersion?.startingLineup.length === 0
      );
    });
    expect(championIndex).toBeGreaterThanOrEqual(0);
    const researchStub = historicalOpponentArchive.find(
      (opponent) => opponent.id === field[championIndex].id,
    )!;
    expect(researchStub.startingLineup).toHaveLength(0);
    useGameStore.setState({
      worldCupRunOpponents: field.map((opponent, index) =>
        index === championIndex ? researchStub : opponent,
      ),
    });

    useGameStore.getState().repairHydratedState();

    expect(useGameStore.getState().worldCupRun).toBeNull();
    expect(useGameStore.getState().worldCupRunOpponents).toEqual([]);
  });

  it("selects and simulates World Cup XI around the drafted identities", () => {
    completeStarters();
    completeBench();
    useGameStore.getState().selectOpponent("world-cup-all-stars");
    expect(useGameStore.getState().selectedOpponentId).toBe(
      "world-cup-all-stars",
    );
    expect(() => useGameStore.getState().simulate()).not.toThrow();
    expect(useGameStore.getState().matchResult?.opponentId).toBe(
      "world-cup-all-stars",
    );
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
