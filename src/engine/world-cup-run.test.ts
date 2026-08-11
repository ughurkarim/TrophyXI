import { describe, expect, it } from "vitest";
import { historicalOpponents } from "@/data/opponents";
import {
  WORLD_CUP_2026_RATING_WEIGHTS,
  worldCup2026Participants,
  worldCup2026RatingBreakdownByNationCode,
} from "@/data/opponents/participants-2026";
import { hashString } from "@/engine/random";
import {
  createWorldCupRunOpponentField,
  isActiveWorldCupRunOpponent,
  isWorldCupRunFinalBoss,
} from "@/engine/world-cup-run-opponents";
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
  attack: 96 - (index % 17),
  midfield: 96 - (index % 17),
  defense: 96 - (index % 17),
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

describe("2026 + historical World Cup Run opponent model", () => {
  const participantsById = new Map(
    worldCup2026Participants.map((team) => [team.id, team]),
  );

  it("uses the requested 30% current / 70% historical weighting", () => {
    expect(WORLD_CUP_2026_RATING_WEIGHTS).toEqual({
      completed2026: 0.3,
      historicalResults: 0.45,
      historicalAppearances: 0.15,
      historicalPedigree: 0.1,
    });
  });

  it("does not let one strong 2026 USA run outweigh its longer World Cup history", () => {
    const usa = participantsById.get("usa-2026")!;
    const usaBreakdown = worldCup2026RatingBreakdownByNationCode.get("USA")!;
    const brazil = participantsById.get("brazil-2026")!;

    expect(usaBreakdown.completed2026.overall).toBe(85);
    expect(usaBreakdown.historicalAppearances).toBe(11);
    expect(usa.ratings).toEqual({
      attack: 84,
      midfield: 82,
      defense: 79,
      goalkeeper: 80,
      depth: 81,
      overall: 81,
    });
    expect(brazil.ratings.overall).toBe(89);
    expect(brazil.ratings.overall - usa.ratings.overall).toBeGreaterThanOrEqual(8);
  });

  it("preserves 2026 performance without letting it erase historical reputation", () => {
    const spain = participantsById.get("spain-2026")!;
    const germany = participantsById.get("germany-2026")!;
    const norway = participantsById.get("norway-2026")!;
    const panama = participantsById.get("panama-2026")!;

    expect(spain.tournamentStatus).toBe("complete");
    expect(spain.tournamentStats).toMatchObject({
      matches: 8,
      wins: 7,
      draws: 1,
      losses: 0,
      goalsFor: 14,
      goalsAgainst: 1,
      cleanSheets: 7,
    });

    expect(spain.ratings.overall).toBe(87);
    expect(germany.ratings.overall).toBe(87);
    expect(norway.ratings.overall).toBe(79);
    expect(panama.ratings.overall).toBe(74);
  });

  it("creates a meaningful historical-strength spread across all 48 teams", () => {
    expect(worldCup2026Participants).toHaveLength(48);
    expect(
      worldCup2026Participants.every(
        (participant) => participant.tournamentStatus === "complete",
      ),
    ).toBe(true);

    const overalls = worldCup2026Participants.map(
      (participant) => participant.ratings.overall,
    );
    expect(Math.max(...overalls) - Math.min(...overalls)).toBeGreaterThanOrEqual(18);
  });

  it("rotates seeded historical champion Final bosses and keeps archive ratings exactly", () => {
    const archiveChampionsById = new Map(
      historicalOpponents
        .filter(
          (team) =>
            team.kind === "historical" &&
            team.tournamentFinish === "champion" &&
            team.startingLineup.length === 11 &&
            team.substitutes.length >= 3,
        )
        .map((team) => [team.id, team]),
    );

    const bossIds = new Set<string>();
    for (let seed = 2026; seed < 2066; seed += 1) {
      const field = createWorldCupRunOpponentField({ seed });
      const bosses = field.filter(isWorldCupRunFinalBoss);

      expect(field).toHaveLength(47);
      expect(field.every(isActiveWorldCupRunOpponent)).toBe(true);
      expect(bosses).toHaveLength(1);

      const boss = bosses[0];
      const archived = archiveChampionsById.get(boss.id)!;
      expect(archived).toBeDefined();
      expect(boss.ratings).toEqual(archived.ratings);
      expect(boss.tournamentYear).toBe(archived.tournamentYear);
      expect(boss.managerName).toBe(archived.managerName);
      expect(boss.startingLineup).toEqual(archived.startingLineup);
      expect(boss.substitutes).toEqual(archived.substitutes);
      bossIds.add(boss.id);
    }

    // The boss is seeded, not hard-coded to Spain.
    expect(bossIds.size).toBeGreaterThan(1);
  });

  it("keeps Spain's 87 blended rating only when Spain is a normal 2026 opponent", () => {
    const participant = participantsById.get("spain-2026")!;
    const field = Array.from({ length: 40 }, (_, offset) =>
      createWorldCupRunOpponentField({ seed: 4000 + offset }),
    ).find((candidate) => {
      const spain = candidate.find((team) => team.id === "spain-2026");
      return spain && !isWorldCupRunFinalBoss(spain);
    });

    expect(field).toBeDefined();
    const spain = field!.find((team) => team.id === "spain-2026")!;
    expect(isWorldCupRunFinalBoss(spain)).toBe(false);
    expect(spain.startingLineup).toHaveLength(0);
    expect(spain.ratings).toEqual(participant.ratings);
    expect(spain.ratings.overall).toBe(87);
  });
});

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

  it("does not let the CPU resolver spill into the next group matchday", () => {
    let state = createRun();
    const userFixture = getPendingWorldCupRunUserFixture(state)!;
    expect(userFixture.matchday).toBe(1);

    state = recordWorldCupRunUserResult(state, userFixture.id, {
      userGoals: 2,
      opponentGoals: 1,
    });
    state = resolvePendingWorldCupRunCpuFixtures(state);

    const groupHistory = state.history.filter((entry) => entry.stage === "group");
    expect(groupHistory).toHaveLength(24);
    expect(
      groupHistory.every((entry) => {
        const fixture = state.fixtures.find(
          (candidate) => candidate.id === entry.fixtureId,
        );
        return fixture?.matchday === 1;
      }),
    ).toBe(true);
    expect(
      Object.values(state.standings)
        .flat()
        .every((standing) => standing.played === 1),
    ).toBe(true);

    const nextUserFixture = getPendingWorldCupRunUserFixture(state);
    expect(nextUserFixture?.matchday).toBe(2);
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


  it("makes elite teams heavy favorites without removing rare upsets", () => {
    const elite: WorldCupRunTeam = {
      id: "elite-test",
      name: "Elite Test",
      countryCode: "ELT",
      rating: 95,
      attack: 95,
      midfield: 95,
      defense: 95,
    };
    const weak: WorldCupRunTeam = {
      id: "weak-test",
      name: "Weak Test",
      countryCode: "WEK",
      rating: 75,
      attack: 75,
      midfield: 75,
      defense: 75,
    };
    const calibrationTeams = teams.map((team, index) =>
      index === 2 ? elite : index === 3 ? weak : team,
    );
    const baseState = createWorldCupRun({
      teams: calibrationTeams,
      userTeamId,
      seed: 1,
    });
    const fixture = {
      id: "calibration-elite-v-weak",
      stage: "group" as const,
      groupId: null,
      matchday: 1,
      homeTeamId: elite.id,
      awayTeamId: weak.id,
      result: null,
    };

    let wins = 0;
    let draws = 0;
    let losses = 0;
    for (let seed = 1; seed <= 5000; seed += 1) {
      const result = simulateWorldCupRunCpuFixture(
        { ...baseState, seed },
        fixture,
      );
      if (result.homeGoals > result.awayGoals) wins += 1;
      else if (result.homeGoals === result.awayGoals) draws += 1;
      else losses += 1;
    }

    expect(wins / 5000).toBeGreaterThan(0.8);
    expect(wins / 5000).toBeLessThan(0.9);
    expect(losses).toBeGreaterThan(0);
    expect(losses / 5000).toBeLessThan(0.06);
    expect(draws).toBeGreaterThan(0);
  });

  it("makes a 20-point favorite dominant without making upsets impossible", () => {
    const favorite: WorldCupRunTeam = {
      id: "favorite-95",
      name: "Favorite 95",
      countryCode: "F95",
      rating: 95,
      attack: 95,
      midfield: 95,
      defense: 95,
    };
    const underdog: WorldCupRunTeam = {
      id: "underdog-75",
      name: "Underdog 75",
      countryCode: "U75",
      rating: 75,
      attack: 75,
      midfield: 75,
      defense: 75,
    };
    const calibrationTeams = teams.map((team, index) =>
      index === 2 ? favorite : index === 3 ? underdog : team,
    );
    const baseState = createWorldCupRun({
      teams: calibrationTeams,
      userTeamId,
      seed: 1,
    });
    const fixture = {
      id: "calibration-95-v-75",
      stage: "group" as const,
      groupId: null,
      matchday: 1,
      homeTeamId: favorite.id,
      awayTeamId: underdog.id,
      result: null,
    };

    let wins = 0;
    let losses = 0;
    for (let seed = 1; seed <= 5000; seed += 1) {
      const result = simulateWorldCupRunCpuFixture(
        { ...baseState, seed },
        fixture,
      );
      if (result.homeGoals > result.awayGoals) wins += 1;
      if (result.homeGoals < result.awayGoals) losses += 1;
    }

    expect(wins / 5000).toBeGreaterThan(0.84);
    expect(losses).toBeGreaterThan(0);
    expect(losses / 5000).toBeLessThan(0.04);
  });

  it("keeps back-to-back 20-point underdog wins exceptionally rare", () => {
    const favorite: WorldCupRunTeam = {
      id: "streak-favorite",
      name: "Streak Favorite",
      countryCode: "SFV",
      rating: 95,
      attack: 95,
      midfield: 95,
      defense: 95,
    };
    const underdog: WorldCupRunTeam = {
      id: "streak-underdog",
      name: "Streak Underdog",
      countryCode: "SUD",
      rating: 75,
      attack: 75,
      midfield: 75,
      defense: 75,
    };
    const calibrationTeams = teams.map((team, index) =>
      index === 2 ? favorite : index === 3 ? underdog : team,
    );
    const baseState = createWorldCupRun({
      teams: calibrationTeams,
      userTeamId,
      seed: 1,
    });
    const firstFixture = {
      id: "calibration-streak-1",
      stage: "group" as const,
      groupId: null,
      matchday: 1,
      homeTeamId: favorite.id,
      awayTeamId: underdog.id,
      result: null,
    };
    const secondFixture = {
      ...firstFixture,
      id: "calibration-streak-2",
      matchday: 2,
    };

    let doubleUpsets = 0;
    for (let seed = 1; seed <= 5000; seed += 1) {
      const state = { ...baseState, seed };
      const first = simulateWorldCupRunCpuFixture(state, firstFixture);
      const second = simulateWorldCupRunCpuFixture(state, secondFixture);
      if (
        first.homeGoals < first.awayGoals &&
        second.homeGoals < second.awayGoals
      ) {
        doubleUpsets += 1;
      }
    }

    expect(doubleUpsets / 5000).toBeLessThan(0.005);
  });

  it("keeps evenly matched neutral-site teams statistically symmetric", () => {
    const first: WorldCupRunTeam = {
      id: "even-first",
      name: "Even First",
      countryCode: "EV1",
      rating: 85,
      attack: 85,
      midfield: 85,
      defense: 85,
    };
    const second: WorldCupRunTeam = {
      id: "even-second",
      name: "Even Second",
      countryCode: "EV2",
      rating: 85,
      attack: 85,
      midfield: 85,
      defense: 85,
    };
    const calibrationTeams = teams.map((team, index) =>
      index === 2 ? first : index === 3 ? second : team,
    );
    const baseState = createWorldCupRun({
      teams: calibrationTeams,
      userTeamId,
      seed: 1,
    });
    const fixture = {
      id: "calibration-even",
      stage: "group" as const,
      groupId: null,
      matchday: 1,
      homeTeamId: first.id,
      awayTeamId: second.id,
      result: null,
    };

    let homeWins = 0;
    let awayWins = 0;
    for (let seed = 1; seed <= 5000; seed += 1) {
      const result = simulateWorldCupRunCpuFixture(
        { ...baseState, seed },
        fixture,
      );
      if (result.homeGoals > result.awayGoals) homeWins += 1;
      if (result.awayGoals > result.homeGoals) awayWins += 1;
    }

    expect(Math.abs(homeWins - awayWins) / 5000).toBeLessThan(0.05);
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

  it("resolves only the current knockout round and stops before the next round", () => {
    let state = resolveGroupWithUserResults({
      userGoals: 4,
      opponentGoals: 0,
    });
    expect(state.currentStage).toBe("round-of-32");

    const userFixture = getPendingWorldCupRunUserFixture(state)!;
    state = recordWorldCupRunUserResult(state, userFixture.id, {
      userGoals: 2,
      opponentGoals: 0,
    });
    state = resolvePendingWorldCupRunCpuFixtures(state);

    expect(state.currentStage).toBe("round-of-16");
    expect(
      state.fixtures
        .filter((fixture) => fixture.stage === "round-of-32")
        .every((fixture) => fixture.result),
    ).toBe(true);
    expect(
      state.fixtures
        .filter((fixture) => fixture.stage === "round-of-16")
        .every((fixture) => !fixture.result),
    ).toBe(true);
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