import { describe, expect, it } from "vitest";
import { hashString } from "@/engine/random";
import {
  calculateWorldCupRunStandings,
  createWorldCupRun,
  getCurrentWorldCupRunFixtures,
  getPendingWorldCupRunUserFixture,
  recordWorldCupRunFixtureResult,
  recordWorldCupRunUserResult,
  resolvePendingWorldCupRunCpuFixtures,
  simulateWorldCupRunCpuFixture,
  WORLD_CUP_RUN_GROUP_IDS,
  type WorldCupRunState,
  type WorldCupRunTeam,
} from "@/engine/world-cup-run";

const userTeamId = "trophy-xi";
const teams: WorldCupRunTeam[] = Array.from({ length: 32 }, (_, index) => ({
  id: index === 0 ? userTeamId : `champion-${index}`,
  name: index === 0 ? "Trophy XI" : `Champion ${index}`,
  rating: 96 - (index % 17),
  seedRank: index + 1,
}));

const createRun = (seed = 2026) =>
  createWorldCupRun({ teams, userTeamId, seed });

const resolveGroupWithUserResults = (
  result: { userGoals: number; opponentGoals: number },
) => {
  let state = resolvePendingWorldCupRunCpuFixtures(createRun());
  while (state.currentStage === "group") {
    const fixture = getPendingWorldCupRunUserFixture(state);
    expect(fixture).not.toBeNull();
    state = recordWorldCupRunUserResult(state, fixture!.id, result);
    state = resolvePendingWorldCupRunCpuFixtures(state);
  }
  return state;
};

describe("World Cup Run domain", () => {
  it("creates eight deterministic four-team groups and a complete round robin", () => {
    const state = createRun();
    expect(createRun()).toEqual(state);
    expect(createRun(2027).groups).not.toEqual(state.groups);
    expect(state.groups).toHaveLength(8);
    expect(state.fixtures).toHaveLength(48);
    expect(new Set(state.groups.flatMap((group) => group.teamIds)).size).toBe(
      32,
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

  it("resolves CPU group fixtures one matchday at a time around the user", () => {
    let state = resolvePendingWorldCupRunCpuFixtures(createRun());
    const firstUserFixture = getPendingWorldCupRunUserFixture(state)!;

    expect(firstUserFixture.matchday).toBe(1);
    expect(state.history).toHaveLength(15);
    expect(
      state.history.every(
        (entry) =>
          entry.stage === "group" &&
          state.fixtures.find(
            (fixture) => fixture.id === entry.fixtureId,
          )?.matchday === 1,
      ),
    ).toBe(true);

    state = recordWorldCupRunUserResult(state, firstUserFixture.id, {
      userGoals: 1,
      opponentGoals: 0,
    });
    state = resolvePendingWorldCupRunCpuFixtures(state);

    expect(getPendingWorldCupRunUserFixture(state)?.matchday).toBe(2);
    expect(state.history).toHaveLength(31);
    expect(
      state.history.filter(
        (entry) =>
          state.fixtures.find(
            (fixture) => fixture.id === entry.fixtureId,
          )?.matchday === 2,
      ),
    ).toHaveLength(15);
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

  it("qualifies two per group into a seeded R16 without group rematches", () => {
    const state = resolveGroupWithUserResults({
      userGoals: 3,
      opponentGoals: 0,
    });
    expect(state.currentStage).toBe("round-of-16");
    expect(state.qualificationStatus).toBe("qualified");
    expect(state.status).toBe("active");
    const roundOf16 = state.fixtures.filter(
      (fixture) => fixture.stage === "round-of-16",
    );
    expect(roundOf16).toHaveLength(8);
    const qualified = new Set(
      WORLD_CUP_RUN_GROUP_IDS.flatMap((groupId) =>
        state.standings[groupId].slice(0, 2).map((standing) => standing.teamId),
      ),
    );
    expect(
      roundOf16.every(
        (fixture) =>
          qualified.has(fixture.homeTeamId) &&
          qualified.has(fixture.awayTeamId),
      ),
    ).toBe(true);
    const groupByTeam = new Map(
      state.groups.flatMap((group) =>
        group.teamIds.map((teamId) => [teamId, group.id] as const),
      ),
    );
    for (const fixture of roundOf16) {
      expect(groupByTeam.get(fixture.homeTeamId)).not.toBe(
        groupByTeam.get(fixture.awayTeamId),
      );
      expect(
        WORLD_CUP_RUN_GROUP_IDS.some(
          (groupId) =>
            state.standings[groupId][0].teamId === fixture.homeTeamId,
        ),
      ).toBe(true);
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
    expect(state.history).toHaveLength(63);
    expect(new Set(state.history.map((entry) => entry.fixtureId)).size).toBe(
      63,
    );
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
    while (groupExit.currentStage === "group") {
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
    knockoutExit = resolvePendingWorldCupRunCpuFixtures(knockoutExit);
    expect(knockoutExit.currentStage).toBe("complete");
    expect(knockoutExit.championTeamId).not.toBe(userTeamId);
  });

  it("validates the 32-team tournament boundary", () => {
    expect(() =>
      createWorldCupRun({
        teams: teams.slice(0, 31),
        userTeamId,
        seed: 1,
      }),
    ).toThrow(/exactly 32/i);
    expect(() =>
      createWorldCupRun({
        teams: teams.map((team, index) =>
          index === 31 ? { ...team, id: teams[1].id } : team,
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
});
