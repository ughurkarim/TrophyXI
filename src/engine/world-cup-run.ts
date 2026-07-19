import {
  createSeededRandom,
  hashString,
  shuffle,
  type RandomSource,
} from "@/engine/random";

export const WORLD_CUP_RUN_GROUP_IDS = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
] as const;

export const WORLD_CUP_RUN_KNOCKOUT_STAGES = [
  "round-of-16",
  "quarter-final",
  "semi-final",
  "final",
] as const;

export type WorldCupRunGroupId = (typeof WORLD_CUP_RUN_GROUP_IDS)[number];
export type WorldCupRunKnockoutStage =
  (typeof WORLD_CUP_RUN_KNOCKOUT_STAGES)[number];
export type WorldCupRunStage =
  | "group"
  | WorldCupRunKnockoutStage
  | "complete";
export type WorldCupRunStatus = "active" | "eliminated" | "champion";
export type WorldCupRunQualificationStatus =
  | "pending"
  | "qualified"
  | "eliminated";

export type WorldCupRunTeam = {
  id: string;
  name: string;
  rating: number;
  seedRank?: number;
};

export type WorldCupRunResult = {
  homeGoals: number;
  awayGoals: number;
  afterExtraTime: boolean;
  penalties?: [number, number];
};

export type WorldCupRunResultInput = Omit<
  WorldCupRunResult,
  "afterExtraTime"
> & {
  afterExtraTime?: boolean;
};

export type WorldCupRunUserResult = {
  userGoals: number;
  opponentGoals: number;
  afterExtraTime?: boolean;
  penalties?: [number, number];
};

export type WorldCupRunFixture = {
  id: string;
  stage: Exclude<WorldCupRunStage, "complete">;
  groupId: WorldCupRunGroupId | null;
  matchday: number | null;
  homeTeamId: string;
  awayTeamId: string;
  result: WorldCupRunResult | null;
};

export type WorldCupRunGroup = {
  id: WorldCupRunGroupId;
  teamIds: [string, string, string, string];
};

export type WorldCupRunStanding = {
  rank: number;
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  deterministicTiebreak: number;
};

export type WorldCupRunHistoryEntry = {
  fixtureId: string;
  stage: Exclude<WorldCupRunStage, "complete">;
  groupId: WorldCupRunGroupId | null;
  homeTeamId: string;
  awayTeamId: string;
  result: WorldCupRunResult;
};

export type WorldCupRunState = {
  version: 1;
  seed: number;
  userTeamId: string;
  teams: WorldCupRunTeam[];
  groups: WorldCupRunGroup[];
  fixtures: WorldCupRunFixture[];
  standings: Record<WorldCupRunGroupId, WorldCupRunStanding[]>;
  currentStage: WorldCupRunStage;
  status: WorldCupRunStatus;
  qualificationStatus: WorldCupRunQualificationStatus;
  history: WorldCupRunHistoryEntry[];
  championTeamId: string | null;
};

export type CreateWorldCupRunInput = {
  teams: WorldCupRunTeam[];
  userTeamId: string;
  seed: number;
};

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const poisson = (lambda: number, random: RandomSource, cap = 5) => {
  const threshold = Math.exp(-lambda);
  let product = 1;
  let count = 0;
  do {
    count += 1;
    product *= random();
  } while (product > threshold && count <= cap);
  return Math.min(cap, count - 1);
};

const teamById = (state: WorldCupRunState, teamId: string) => {
  const team = state.teams.find((candidate) => candidate.id === teamId);
  if (!team) throw new Error(`Unknown World Cup Run team ${teamId}`);
  return team;
};

const buildGroups = (
  teams: WorldCupRunTeam[],
  seed: number,
): WorldCupRunGroup[] => {
  const seeded = [...teams].sort(
    (first, second) =>
      (first.seedRank ?? Number.MAX_SAFE_INTEGER) -
        (second.seedRank ?? Number.MAX_SAFE_INTEGER) ||
      second.rating - first.rating ||
      first.id.localeCompare(second.id),
  );
  const pots = Array.from({ length: 4 }, (_, potIndex) =>
    shuffle(
      seeded.slice(potIndex * 8, potIndex * 8 + 8),
      createSeededRandom(seed ^ hashString(`world-cup-run-pot:${potIndex}`)),
    ),
  );
  return WORLD_CUP_RUN_GROUP_IDS.map((id, groupIndex) => ({
    id,
    teamIds: [
      pots[0][groupIndex].id,
      pots[1][groupIndex].id,
      pots[2][groupIndex].id,
      pots[3][groupIndex].id,
    ],
  }));
};

const groupSchedule: Array<
  [matchday: number, first: number, second: number]
> = [
  [1, 0, 3],
  [1, 1, 2],
  [2, 0, 2],
  [2, 3, 1],
  [3, 0, 1],
  [3, 2, 3],
];

const buildGroupFixtures = (
  groups: WorldCupRunGroup[],
): WorldCupRunFixture[] =>
  groups.flatMap((group) =>
    groupSchedule.map(([matchday, first, second], fixtureIndex) => ({
      id: `group-${group.id}-md${matchday}-${(fixtureIndex % 2) + 1}`,
      stage: "group",
      groupId: group.id,
      matchday,
      homeTeamId: group.teamIds[first],
      awayTeamId: group.teamIds[second],
      result: null,
    })),
  );

const emptyStandings = (
  groups: WorldCupRunGroup[],
  seed: number,
): Record<WorldCupRunGroupId, WorldCupRunStanding[]> =>
  Object.fromEntries(
    groups.map((group) => [
      group.id,
      group.teamIds
        .map((teamId) => ({
          rank: 0,
          teamId,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: 0,
          deterministicTiebreak: hashString(
            `${seed}:group-tiebreak:${group.id}:${teamId}`,
          ),
        }))
        .sort(
          (first, second) =>
            first.deterministicTiebreak - second.deterministicTiebreak,
        )
        .map((standing, index) => ({ ...standing, rank: index + 1 })),
    ]),
  ) as Record<WorldCupRunGroupId, WorldCupRunStanding[]>;

const validateTeams = (teams: WorldCupRunTeam[], userTeamId: string) => {
  if (teams.length !== 32) {
    throw new Error("World Cup Run requires exactly 32 teams");
  }
  if (new Set(teams.map((team) => team.id)).size !== 32) {
    throw new Error("World Cup Run team ids must be unique");
  }
  if (!teams.some((team) => team.id === userTeamId)) {
    throw new Error("The user team must be present in the 32-team field");
  }
  for (const team of teams) {
    if (
      !team.id ||
      !team.name ||
      !Number.isFinite(team.rating) ||
      team.rating < 0 ||
      team.rating > 100
    ) {
      throw new Error(`Invalid World Cup Run team ${team.id || "(missing id)"}`);
    }
  }
};

export const createWorldCupRun = ({
  teams,
  userTeamId,
  seed,
}: CreateWorldCupRunInput): WorldCupRunState => {
  validateTeams(teams, userTeamId);
  const groups = buildGroups(teams, seed);
  return {
    version: 1,
    seed,
    userTeamId,
    teams: teams.map((team) => ({ ...team })),
    groups,
    fixtures: buildGroupFixtures(groups),
    standings: emptyStandings(groups, seed),
    currentStage: "group",
    status: "active",
    qualificationStatus: "pending",
    history: [],
    championTeamId: null,
  };
};

export const calculateWorldCupRunStandings = (
  state: WorldCupRunState,
  groupId: WorldCupRunGroupId,
): WorldCupRunStanding[] => {
  const group = state.groups.find((candidate) => candidate.id === groupId);
  if (!group) throw new Error(`Unknown World Cup Run group ${groupId}`);
  const rows = new Map(
    group.teamIds.map((teamId) => [
      teamId,
      {
        rank: 0,
        teamId,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0,
        deterministicTiebreak: hashString(
          `${state.seed}:group-tiebreak:${groupId}:${teamId}`,
        ),
      } satisfies WorldCupRunStanding,
    ]),
  );

  for (const fixture of state.fixtures) {
    if (fixture.groupId !== groupId || !fixture.result) continue;
    const home = rows.get(fixture.homeTeamId)!;
    const away = rows.get(fixture.awayTeamId)!;
    home.played += 1;
    away.played += 1;
    home.goalsFor += fixture.result.homeGoals;
    home.goalsAgainst += fixture.result.awayGoals;
    away.goalsFor += fixture.result.awayGoals;
    away.goalsAgainst += fixture.result.homeGoals;
    if (fixture.result.homeGoals > fixture.result.awayGoals) {
      home.won += 1;
      away.lost += 1;
      home.points += 3;
    } else if (fixture.result.homeGoals < fixture.result.awayGoals) {
      away.won += 1;
      home.lost += 1;
      away.points += 3;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  return [...rows.values()]
    .map((standing) => ({
      ...standing,
      goalDifference: standing.goalsFor - standing.goalsAgainst,
    }))
    .sort(
      (first, second) =>
        second.points - first.points ||
        second.goalDifference - first.goalDifference ||
        second.goalsFor - first.goalsFor ||
        first.deterministicTiebreak - second.deterministicTiebreak ||
        first.teamId.localeCompare(second.teamId),
    )
    .map((standing, index) => ({ ...standing, rank: index + 1 }));
};

const refreshStandings = (state: WorldCupRunState) => ({
  ...state,
  standings: Object.fromEntries(
    WORLD_CUP_RUN_GROUP_IDS.map((groupId) => [
      groupId,
      calculateWorldCupRunStandings(state, groupId),
    ]),
  ) as Record<WorldCupRunGroupId, WorldCupRunStanding[]>,
});

const normalizeResult = (
  result: WorldCupRunResultInput,
): WorldCupRunResult => ({
  homeGoals: result.homeGoals,
  awayGoals: result.awayGoals,
  afterExtraTime: Boolean(result.afterExtraTime),
  ...(result.penalties ? { penalties: [...result.penalties] } : {}),
});

const validateResult = (
  fixture: WorldCupRunFixture,
  result: WorldCupRunResult,
) => {
  for (const value of [result.homeGoals, result.awayGoals]) {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error("Fixture goals must be non-negative integers");
    }
  }
  if (fixture.stage === "group") {
    if (result.afterExtraTime || result.penalties) {
      throw new Error("Group fixtures cannot use extra time or penalties");
    }
    return;
  }
  if (result.homeGoals === result.awayGoals) {
    if (
      !result.penalties ||
      result.penalties[0] === result.penalties[1] ||
      result.penalties.some(
        (value) => !Number.isInteger(value) || value < 0,
      )
    ) {
      throw new Error("A tied knockout fixture requires a decided shootout");
    }
  } else if (result.penalties) {
    throw new Error("Penalties are only valid for a tied knockout score");
  }
};

const sameResult = (
  first: WorldCupRunResult,
  second: WorldCupRunResult,
) =>
  first.homeGoals === second.homeGoals &&
  first.awayGoals === second.awayGoals &&
  first.afterExtraTime === second.afterExtraTime &&
  (first.penalties?.[0] ?? null) === (second.penalties?.[0] ?? null) &&
  (first.penalties?.[1] ?? null) === (second.penalties?.[1] ?? null);

const winnerIdFor = (fixture: WorldCupRunFixture) => {
  if (!fixture.result || fixture.stage === "group") {
    throw new Error(`Fixture ${fixture.id} has no knockout winner`);
  }
  if (fixture.result.homeGoals > fixture.result.awayGoals) {
    return fixture.homeTeamId;
  }
  if (fixture.result.awayGoals > fixture.result.homeGoals) {
    return fixture.awayTeamId;
  }
  return fixture.result.penalties![0] > fixture.result.penalties![1]
    ? fixture.homeTeamId
    : fixture.awayTeamId;
};

const r16Pairings: Array<
  [
    winnerGroup: WorldCupRunGroupId,
    runnerUpGroup: WorldCupRunGroupId,
  ]
> = [
  ["A", "B"],
  ["C", "D"],
  ["E", "F"],
  ["G", "H"],
  ["B", "A"],
  ["D", "C"],
  ["F", "E"],
  ["H", "G"],
];

const createRoundOf16 = (
  standings: Record<WorldCupRunGroupId, WorldCupRunStanding[]>,
): WorldCupRunFixture[] =>
  r16Pairings.map(([winnerGroup, runnerUpGroup], index) => ({
    id: `round-of-16-${index + 1}`,
    stage: "round-of-16",
    groupId: null,
    matchday: null,
    homeTeamId: standings[winnerGroup][0].teamId,
    awayTeamId: standings[runnerUpGroup][1].teamId,
    result: null,
  }));

const nextStageFor = (
  stage: WorldCupRunKnockoutStage,
): WorldCupRunKnockoutStage | "complete" => {
  if (stage === "round-of-16") return "quarter-final";
  if (stage === "quarter-final") return "semi-final";
  if (stage === "semi-final") return "final";
  return "complete";
};

const createNextKnockoutRound = (
  completedFixtures: WorldCupRunFixture[],
  stage: WorldCupRunKnockoutStage,
) =>
  Array.from({ length: completedFixtures.length / 2 }, (_, index) => ({
    id: `${stage}-${index + 1}`,
    stage,
    groupId: null,
    matchday: null,
    homeTeamId: winnerIdFor(completedFixtures[index * 2]),
    awayTeamId: winnerIdFor(completedFixtures[index * 2 + 1]),
    result: null,
  })) satisfies WorldCupRunFixture[];

const advanceCompletedStage = (
  state: WorldCupRunState,
): WorldCupRunState => {
  if (state.currentStage === "complete") return state;
  const stageFixtures = state.fixtures.filter(
    (fixture) => fixture.stage === state.currentStage,
  );
  if (
    stageFixtures.length === 0 ||
    stageFixtures.some((fixture) => !fixture.result)
  ) {
    return state;
  }

  if (state.currentStage === "group") {
    const refreshed = refreshStandings(state);
    const qualifiedTeamIds = new Set(
      WORLD_CUP_RUN_GROUP_IDS.flatMap((groupId) =>
        refreshed.standings[groupId]
          .slice(0, 2)
          .map((standing) => standing.teamId),
      ),
    );
    const userQualified = qualifiedTeamIds.has(state.userTeamId);
    return {
      ...refreshed,
      fixtures: [
        ...refreshed.fixtures,
        ...createRoundOf16(refreshed.standings),
      ],
      currentStage: "round-of-16",
      status: userQualified ? refreshed.status : "eliminated",
      qualificationStatus: userQualified ? "qualified" : "eliminated",
    };
  }

  const currentStage = state.currentStage;
  const nextStage = nextStageFor(currentStage);
  if (nextStage === "complete") {
    const championTeamId = winnerIdFor(stageFixtures[0]);
    return {
      ...state,
      currentStage: "complete",
      championTeamId,
      status:
        championTeamId === state.userTeamId ? "champion" : "eliminated",
    };
  }
  return {
    ...state,
    fixtures: [
      ...state.fixtures,
      ...createNextKnockoutRound(stageFixtures, nextStage),
    ],
    currentStage: nextStage,
  };
};

export const getWorldCupRunFixture = (
  state: WorldCupRunState,
  fixtureId: string,
) => state.fixtures.find((fixture) => fixture.id === fixtureId);

export const getCurrentWorldCupRunFixtures = (state: WorldCupRunState) =>
  state.currentStage === "complete"
    ? []
    : state.fixtures.filter(
        (fixture) => fixture.stage === state.currentStage,
      );

export const getPendingWorldCupRunUserFixture = (
  state: WorldCupRunState,
) =>
  getCurrentWorldCupRunFixtures(state).find(
    (fixture) =>
      !fixture.result &&
      [fixture.homeTeamId, fixture.awayTeamId].includes(state.userTeamId),
  ) ?? null;

export const simulateWorldCupRunCpuFixture = (
  state: WorldCupRunState,
  fixture: WorldCupRunFixture,
): WorldCupRunResult => {
  if (
    [fixture.homeTeamId, fixture.awayTeamId].includes(state.userTeamId)
  ) {
    throw new Error("User fixtures require a recorded user result");
  }
  const home = teamById(state, fixture.homeTeamId);
  const away = teamById(state, fixture.awayTeamId);
  const random = createSeededRandom(
    state.seed ^
      hashString(
        `world-cup-run-fixture:${fixture.id}:${home.id}:${away.id}`,
      ),
  );
  const ratingEdge = home.rating - away.rating;
  const homeLambda = clamp(1.25 + ratingEdge * 0.025, 0.25, 3.2);
  const awayLambda = clamp(1.2 - ratingEdge * 0.025, 0.25, 3.2);
  let homeGoals = poisson(homeLambda, random);
  let awayGoals = poisson(awayLambda, random);
  if (fixture.stage === "group" || homeGoals !== awayGoals) {
    return {
      homeGoals,
      awayGoals,
      afterExtraTime: false,
    };
  }

  const extraHome = poisson(homeLambda * 0.25, random, 2);
  const extraAway = poisson(awayLambda * 0.25, random, 2);
  homeGoals += extraHome;
  awayGoals += extraAway;
  if (homeGoals !== awayGoals) {
    return {
      homeGoals,
      awayGoals,
      afterExtraTime: true,
    };
  }

  let homePenalties = 0;
  let awayPenalties = 0;
  const homeChance = clamp(0.75 + ratingEdge * 0.0015, 0.68, 0.82);
  const awayChance = clamp(0.75 - ratingEdge * 0.0015, 0.68, 0.82);
  for (let kick = 0; kick < 5; kick += 1) {
    if (random() < homeChance) homePenalties += 1;
    if (random() < awayChance) awayPenalties += 1;
  }
  for (
    let suddenDeath = 0;
    homePenalties === awayPenalties && suddenDeath < 20;
    suddenDeath += 1
  ) {
    const homeScores = random() < homeChance;
    const awayScores = random() < awayChance;
    if (homeScores && !awayScores) homePenalties += 1;
    if (!homeScores && awayScores) awayPenalties += 1;
  }
  if (homePenalties === awayPenalties) {
    if (
      hashString(`${state.seed}:shootout-fallback:${fixture.id}`) % 2 ===
      0
    ) {
      homePenalties += 1;
    } else {
      awayPenalties += 1;
    }
  }
  return {
    homeGoals,
    awayGoals,
    afterExtraTime: true,
    penalties: [homePenalties, awayPenalties],
  };
};

export const recordWorldCupRunFixtureResult = (
  state: WorldCupRunState,
  fixtureId: string,
  suppliedResult?: WorldCupRunResultInput,
): WorldCupRunState => {
  const fixture = getWorldCupRunFixture(state, fixtureId);
  if (!fixture) throw new Error(`Unknown World Cup Run fixture ${fixtureId}`);
  if (fixture.result) {
    if (!suppliedResult) return state;
    const normalized = normalizeResult(suppliedResult);
    if (sameResult(fixture.result, normalized)) return state;
    throw new Error(`Fixture ${fixtureId} already has a different result`);
  }
  if (fixture.stage !== state.currentStage) {
    throw new Error(
      `Fixture ${fixtureId} cannot be played during ${state.currentStage}`,
    );
  }
  const involvesUser = [fixture.homeTeamId, fixture.awayTeamId].includes(
    state.userTeamId,
  );
  if (involvesUser && !suppliedResult) {
    throw new Error("User fixtures require a recorded user result");
  }
  const result = suppliedResult
    ? normalizeResult(suppliedResult)
    : simulateWorldCupRunCpuFixture(state, fixture);
  validateResult(fixture, result);

  let status = state.status;
  if (fixture.stage !== "group" && involvesUser) {
    const fixtureWithResult = { ...fixture, result };
    if (winnerIdFor(fixtureWithResult) !== state.userTeamId) {
      status = "eliminated";
    }
  }
  const updated: WorldCupRunState = {
    ...state,
    status,
    fixtures: state.fixtures.map((candidate) =>
      candidate.id === fixtureId ? { ...candidate, result } : candidate,
    ),
    history: [
      ...state.history,
      {
        fixtureId,
        stage: fixture.stage,
        groupId: fixture.groupId,
        homeTeamId: fixture.homeTeamId,
        awayTeamId: fixture.awayTeamId,
        result,
      },
    ],
  };
  const withStandings =
    fixture.stage === "group" ? refreshStandings(updated) : updated;
  return advanceCompletedStage(withStandings);
};

export const recordWorldCupRunUserResult = (
  state: WorldCupRunState,
  fixtureId: string,
  result: WorldCupRunUserResult,
) => {
  const fixture = getWorldCupRunFixture(state, fixtureId);
  if (!fixture) throw new Error(`Unknown World Cup Run fixture ${fixtureId}`);
  if (
    ![fixture.homeTeamId, fixture.awayTeamId].includes(state.userTeamId)
  ) {
    throw new Error(`Fixture ${fixtureId} does not involve the user team`);
  }
  const userAtHome = fixture.homeTeamId === state.userTeamId;
  return recordWorldCupRunFixtureResult(state, fixtureId, {
    homeGoals: userAtHome ? result.userGoals : result.opponentGoals,
    awayGoals: userAtHome ? result.opponentGoals : result.userGoals,
    afterExtraTime: result.afterExtraTime,
    ...(result.penalties
      ? {
          penalties: userAtHome
            ? result.penalties
            : [result.penalties[1], result.penalties[0]],
        }
      : {}),
  });
};

export const resolvePendingWorldCupRunCpuFixtures = (
  state: WorldCupRunState,
) => {
  let resolved = state;
  while (resolved.currentStage !== "complete") {
    const currentFixtures = getCurrentWorldCupRunFixtures(resolved);
    const pendingUserFixture = getPendingWorldCupRunUserFixture(resolved);
    const pendingCpuFixtures = currentFixtures.filter((fixture) => {
      if (
        fixture.result ||
        [fixture.homeTeamId, fixture.awayTeamId].includes(
          resolved.userTeamId,
        )
      ) {
        return false;
      }
      if (
        resolved.currentStage === "group" &&
        pendingUserFixture?.matchday
      ) {
        return (
          (fixture.matchday ?? Number.MAX_SAFE_INTEGER) <=
          pendingUserFixture.matchday
        );
      }
      return true;
    });
    if (pendingCpuFixtures.length === 0) break;
    for (const fixture of pendingCpuFixtures) {
      resolved = recordWorldCupRunFixtureResult(resolved, fixture.id);
    }
  }
  return resolved;
};
