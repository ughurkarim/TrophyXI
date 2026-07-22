import { describe, expect, it } from "vitest";
import { hashString } from "@/engine/random";
import {
  calculateWorldCupRunStandings,
  createWorldCupRun,
  enterWorldCupRunKnockouts,
  getCurrentWorldCupRunFixtures,
  getPendingWorldCupRunUserFixture,
  recordWorldCupRunFixtureResult,
  recordWorldCupRunUserResult,
  resolvePendingWorldCupRunCpuFixtures,
  simulateNextWorldCupRunUserFixture,
  simulateRemainingWorldCupRunGroup,
  simulateRemainingWorldCupRunRound,
  simulateWorldCupRunCpuFixture,
  type WorldCupRunState,
  type WorldCupRunTeam,
} from "@/engine/world-cup-run";

const userTeamId = "trophy-xi";
const teams: WorldCupRunTeam[] = Array.from({ length: 48 }, (_, index) => ({
  id: index === 0 ? userTeamId : `champion-${index}`,
  name: index === 0 ? "Trophy XI" : `Champion ${index}`,
  countryCode: index === 0 ? "TXI" : `T${index}`,
  rating: 96 - (index % 17),
  seedRank: index + 1,
  isChampion: index === 1,
}));

const createRun = (seed = 2026) =>
  createWorldCupRun({ teams, userTeamId, seed });

const resolveGroupWithUserResults = (
  result: { userGoals: number; opponentGoals: number },
) => {
  let state = resolvePendingWorldCupRunCpuFixtures(createRun());
  while (state.qualificationStatus === "pending") {
    const fixture = getPendingWorldCupRunUserFixture(state);
    expect(fixture).not.toBeNull();
    state = recordWorldCupRunUserResult(state, fixture!.id, result);
    state = resolvePendingWorldCupRunCpuFixtures(state);
  }
  return state.qualificationStatus === "qualified"
    ? enterWorldCupRunKnockouts(state)
    : state;
};

describe("World Cup Run domain", () => {
  it("creates twelve deterministic four-team groups and a complete round robin", () => {
    const state = createRun();
    expect(createRun()).toEqual(state);
    expect(createRun(2027).groups).not.toEqual(state.groups);
    expect(state.groups).toHaveLength(12);
    expect(state.fixtures).toHaveLength(72);
    expect(new Set(state.groups.flatMap((group) => group.teamIds)).size).toBe(
      48,
    );

    for (const group of state.groups) {
      expect(group.teamIds).toHaveLength(4);
      const fixtures = state.fixtures.filter(
        (fixture) => fixture.groupId === group.id,
      );
      expect(fixtures).toHaveLength(6);
      const appearances = new Map(
        group.teamIds.map((teamId) => [teamId, 0]),
      );
      const pairings = new Set<string>();
      for (const fixture of fixtures) {
        appearances.set(
          fixture.homeTeamId,
          appearances.get(fixture.homeTeamId)! + 1,
        );
        appearances.set(
          fixture.awayTeamId,
          appearances.get(fixture.awayTeamId)! + 1,
        );
        pairings.add(
          [fixture.homeTeamId, fixture.awayTeamId].sort().join("|"),
        );
      }
      expect([...appearances.values()]).toEqual([3, 3, 3, 3]);
      expect(pairings.size).toBe(6);
    }
  });

  it("quick-simulates a complete matchday or the whole group", () => {
    const initial = createRun();
    const afterMatch = simulateNextWorldCupRunUserFixture(initial);
    expect(afterMatch.history).toHaveLength(24);
    expect(afterMatch.history.every((entry) => {
      const playedFixture = afterMatch.fixtures.find(
        (fixture) => fixture.id === entry.fixtureId,
      );
      return playedFixture?.matchday === 1;
    })).toBe(true);
    expect(
      Object.values(afterMatch.standings)
        .flat()
        .every((standing) => standing.played === 1),
    ).toBe(true);
    expect(afterMatch.currentStage).toBe("group");

    const completed = simulateRemainingWorldCupRunGroup(afterMatch);
    expect(completed.history).toHaveLength(72);
    expect(completed.qualificationStatus).not.toBe("pending");
    expect(completed.currentStage).toBe("group");
  });

  it("finishes three balanced group matchdays through the match button", () => {
    let state = createRun();
    state = simulateNextWorldCupRunUserFixture(state);
    state = simulateNextWorldCupRunUserFixture(state);
    state = simulateNextWorldCupRunUserFixture(state);

    expect(state.history).toHaveLength(72);
    expect(
      Object.values(state.standings)
        .flat()
        .every((standing) => standing.played === 3),
    ).toBe(true);
    expect(state.qualificationStatus).not.toBe("pending");
  });

  it("ranks by points, goal difference, goals scored, then deterministic tiebreak", () => {
    let state = createRun();
    const group = state.groups.find((candidate) => candidate.id === "A")!;
    const strength = new Map(
      group.teamIds.map((teamId, index) => [teamId, index]),
    );
    for (const fixture of state.fixtures.filter(
      (candidate) => candidate.groupId === group.id,
    )) {
      const homeRank = strength.get(fixture.homeTeamId)!;
      const awayRank = strength.get(fixture.awayTeamId)!;
      state = recordWorldCupRunFixtureResult(state, fixture.id, {
        homeGoals: homeRank < awayRank ? 2 : 0,
        awayGoals: awayRank < homeRank ? 2 : 0,
      });
    }
    expect(state.standings.A.map((standing) => standing.teamId)).toEqual(
      group.teamIds,
    );
    expect(
      state.standings.A.map((standing) => ({
        played: standing.played,
        won: standing.won,
        drawn: standing.drawn,
        lost: standing.lost,
        goalDifference: standing.goalDifference,
        points: standing.points,
      })),
    ).toEqual([
      { played: 3, won: 3, drawn: 0, lost: 0, goalDifference: 6, points: 9 },
      { played: 3, won: 2, drawn: 0, lost: 1, goalDifference: 2, points: 6 },
      { played: 3, won: 1, drawn: 0, lost: 2, goalDifference: -2, points: 3 },
      { played: 3, won: 0, drawn: 0, lost: 3, goalDifference: -6, points: 0 },
    ]);

    let tied = createRun();
    for (const fixture of tied.fixtures.filter(
      (candidate) => candidate.groupId === "B",
    )) {
      tied = recordWorldCupRunFixtureResult(tied, fixture.id, {
        homeGoals: 0,
        awayGoals: 0,
      });
    }
    const expectedOrder = tied.groups
      .find((groupItem) => groupItem.id === "B")!
      .teamIds.map((teamId) => ({
        teamId,
        value: hashString(`${tied.seed}:group-tiebreak:B:${teamId}`),
      }))
      .sort((first, second) => first.value - second.value)
      .map(({ teamId }) => teamId);
    expect(tied.standings.B.map((standing) => standing.teamId)).toEqual(
      expectedOrder,
    );
    expect(calculateWorldCupRunStandings(tied, "B")).toEqual(
      tied.standings.B,
    );
  });

  it("qualifies 32 teams into a seeded Round of 32 without group rematches", () => {
    const state = resolveGroupWithUserResults({
      userGoals: 3,
      opponentGoals: 0,
    });
    expect(state.currentStage).toBe("round-of-32");
    expect(state.qualificationStatus).toBe("qualified");
    expect(state.status).toBe("active");
    const roundOf32 = state.fixtures.filter(
      (fixture) => fixture.stage === "round-of-32",
    );
    expect(roundOf32).toHaveLength(16);
    const qualified = new Set(
      roundOf32.flatMap((fixture) => [fixture.homeTeamId, fixture.awayTeamId]),
    );
    expect(qualified.size).toBe(32);
    const groupByTeam = new Map(
      state.groups.flatMap((group) =>
        group.teamIds.map((teamId) => [teamId, group.id] as const),
      ),
    );
    for (const fixture of roundOf32) {
      expect(groupByTeam.get(fixture.homeTeamId)).not.toBe(
        groupByTeam.get(fixture.awayTeamId),
      );
    }
  });

  it("advances the bracket through a penalty-decided final and records history", () => {
    let state = resolveGroupWithUserResults({
      userGoals: 2,
      opponentGoals: 0,
    });
    while (state.currentStage !== "complete") {
      const fixture = getPendingWorldCupRunUserFixture(state);
      expect(fixture).not.toBeNull();
      if (state.currentStage === "final") {
        const finalOpponentId =
          fixture!.homeTeamId === userTeamId
            ? fixture!.awayTeamId
            : fixture!.homeTeamId;
        expect(finalOpponentId).toBe(state.finalBossTeamId);
        expect(
          state.teams.find((team) => team.id === finalOpponentId)?.isChampion,
        ).toBe(true);
      }
      state =
        state.currentStage === "final"
          ? recordWorldCupRunUserResult(state, fixture!.id, {
              userGoals: 1,
              opponentGoals: 1,
              afterExtraTime: true,
              penalties: [5, 4],
            })
          : recordWorldCupRunUserResult(state, fixture!.id, {
              userGoals: 2,
              opponentGoals: 0,
            });
      state = resolvePendingWorldCupRunCpuFixtures(state);
    }

    expect(state.status).toBe("champion");
    expect(state.championTeamId).toBe(userTeamId);
    expect(state.history).toHaveLength(103);
    expect(new Set(state.history.map((entry) => entry.fixtureId)).size).toBe(
      103,
    );
    expect(
      state.fixtures.filter((fixture) => fixture.stage === "round-of-32"),
    ).toHaveLength(16);
    expect(
      state.fixtures.filter((fixture) => fixture.stage === "round-of-16"),
    ).toHaveLength(8);
    expect(
      state.fixtures.filter((fixture) => fixture.stage === "quarter-final"),
    ).toHaveLength(4);
    expect(
      state.fixtures.filter((fixture) => fixture.stage === "semi-final"),
    ).toHaveLength(2);
    expect(
      state.fixtures.filter((fixture) => fixture.stage === "final"),
    ).toHaveLength(1);
    expect(state.history.at(-1)?.result.penalties).toEqual(
      state.history.at(-1)?.homeTeamId === userTeamId ? [5, 4] : [4, 5],
    );
  });

  it("produces deterministic CPU results and never leaves a knockout tied", () => {
    const state = resolveGroupWithUserResults({
      userGoals: 2,
      opponentGoals: 0,
    });
    const cpuFixture = getCurrentWorldCupRunFixtures(state).find(
      (fixture) =>
        ![fixture.homeTeamId, fixture.awayTeamId].includes(userTeamId),
    )!;
    const first = simulateWorldCupRunCpuFixture(state, cpuFixture);
    expect(simulateWorldCupRunCpuFixture(state, cpuFixture)).toEqual(first);
    expect(
      first.homeGoals !== first.awayGoals ||
        Boolean(
          first.penalties &&
            first.penalties[0] !== first.penalties[1],
        ),
    ).toBe(true);
  });

  it("records fixtures idempotently and rejects a conflicting overwrite", () => {
    const initial = createRun();
    const fixture = initial.fixtures[0];
    const recorded = recordWorldCupRunFixtureResult(initial, fixture.id, {
      homeGoals: 1,
      awayGoals: 1,
    });
    const repeated = recordWorldCupRunFixtureResult(recorded, fixture.id, {
      homeGoals: 1,
      awayGoals: 1,
    });
    expect(repeated).toBe(recorded);
    expect(repeated.history).toHaveLength(1);
    expect(() =>
      recordWorldCupRunFixtureResult(repeated, fixture.id, {
        homeGoals: 2,
        awayGoals: 1,
      }),
    ).toThrow(/different result/i);
  });

  it("tracks group and knockout elimination without blocking CPU completion", () => {
    let groupExit = resolvePendingWorldCupRunCpuFixtures(createRun());
    while (groupExit.qualificationStatus === "pending") {
      const fixture = getPendingWorldCupRunUserFixture(groupExit)!;
      groupExit = recordWorldCupRunUserResult(groupExit, fixture.id, {
        userGoals: 0,
        opponentGoals: 5,
      });
      groupExit = resolvePendingWorldCupRunCpuFixtures(groupExit);
    }
    expect(groupExit.qualificationStatus).toBe("eliminated");
    expect(groupExit.status).toBe("eliminated");

    let knockoutExit = resolveGroupWithUserResults({
      userGoals: 4,
      opponentGoals: 0,
    });
    const fixture = getPendingWorldCupRunUserFixture(knockoutExit)!;
    knockoutExit = recordWorldCupRunUserResult(knockoutExit, fixture.id, {
      userGoals: 0,
      opponentGoals: 1,
    });
    expect(knockoutExit.status).toBe("eliminated");
    expect(knockoutExit.eliminatedStage).toBe("round-of-32");
  });

  it("validates the 48-team tournament boundary", () => {
    expect(() =>
      createWorldCupRun({
        teams: teams.slice(0, 47),
        userTeamId,
        seed: 1,
      }),
    ).toThrow(/exactly 48/i);
    expect(() =>
      createWorldCupRun({
        teams: teams.map((team, index) =>
          index === 47 ? { ...team, id: teams[1].id } : team,
        ),
        userTeamId,
        seed: 1,
      }),
    ).toThrow(/unique/i);
  });

  it("remains serialization-safe at every stage", () => {
    const state: WorldCupRunState = resolveGroupWithUserResults({
      userGoals: 1,
      opponentGoals: 0,
    });
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });

  it("resolves a complete early knockout round without opening a full match", () => {
    const roundOf32 = resolveGroupWithUserResults({ userGoals: 3, opponentGoals: 0 });
    const resolved = simulateRemainingWorldCupRunRound(roundOf32);
    expect(resolved.currentStage).toBe("round-of-16");
    expect(
      resolved.fixtures.filter((fixture) => fixture.stage === "round-of-32"),
    ).toSatisfy((fixtures: WorldCupRunState["fixtures"]) =>
      fixtures.every((fixture) => fixture.result),
    );
  });
});
