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
  "I",
  "J",
  "K",
  "L",
] as const;

export const WORLD_CUP_RUN_KNOCKOUT_STAGES = [
  "round-of-32",
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
  countryCode: string;
  rating: number;
  /**
   * Phase ratings are optional for backwards compatibility with persisted
   * World Cup Run saves. New runs should always provide them.
   */
  attack?: number;
  midfield?: number;
  defense?: number;
  seedRank?: number;
  isChampion?: boolean;
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
  version: 6;
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
  finalBossTeamId: string;
  eliminatedStage: Exclude<WorldCupRunStage, "complete"> | null;
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
      seeded.slice(potIndex * 12, potIndex * 12 + 12),
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

const buildGroupFixtures = (groups: WorldCupRunGroup[]) =>
  groups.flatMap((group) =>
    groupSchedule.map(([matchday, first, second], fixtureIndex) => ({
      id: `group-${group.id}-md${matchday}-${(fixtureIndex % 2) + 1}`,
      stage: "group" as const,
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
  if (teams.length !== 48) {
    throw new Error("World Cup Run requires exactly 48 teams");
  }
  if (new Set(teams.map((team) => team.id)).size !== 48) {
    throw new Error("World Cup Run team ids must be unique");
  }
  if (!teams.some((team) => team.id === userTeamId)) {
    throw new Error("The user team must be present in the 48-team field");
  }
  if (!teams.some((team) => team.id !== userTeamId && team.isChampion)) {
    throw new Error("World Cup Run requires a champion final opponent");
  }
  for (const team of teams) {
    const phaseRatings = [team.attack, team.midfield, team.defense].filter(
      (value): value is number => value !== undefined,
    );
    if (
      !team.id ||
      !team.name ||
      !team.countryCode ||
      !Number.isFinite(team.rating) ||
      team.rating < 0 ||
      team.rating > 100 ||
      phaseRatings.some(
        (value) => !Number.isFinite(value) || value < 0 || value > 100,
      )
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
  const finalBossTeamId = [...teams]
    .filter((team) => team.id !== userTeamId && team.isChampion)
    .sort(
      (first, second) =>
        second.rating - first.rating ||
        hashString(`${seed}:final-boss:${first.id}`) -
          hashString(`${seed}:final-boss:${second.id}`),
    )[0].id;
  return {
    version: 6,
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
    finalBossTeamId,
    eliminatedStage: null,
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

const refreshStandings = (state: WorldCupRunState): WorldCupRunState => ({
  ...state,
  standings: Object.fromEntries(
    WORLD_CUP_RUN_GROUP_IDS.map((groupId) => [
      groupId,
      calculateWorldCupRunStandings(state, groupId),
    ]),
  ) as Record<WorldCupRunGroupId, WorldCupRunStanding[]>,
});

const normalizeResult = (result: WorldCupRunResultInput): WorldCupRunResult => ({
  homeGoals: result.homeGoals,
  awayGoals: result.awayGoals,
  afterExtraTime: Boolean(result.afterExtraTime),
  ...(result.penalties ? { penalties: [...result.penalties] as [number, number] } : {}),
});

const validateResult = (fixture: WorldCupRunFixture, result: WorldCupRunResult) => {
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
      result.penalties.some((value) => !Number.isInteger(value) || value < 0)
    ) {
      throw new Error("A tied knockout fixture requires a decided shootout");
    }
  } else if (result.penalties) {
    throw new Error("Penalties are only valid for a tied knockout score");
  }
};

const sameResult = (first: WorldCupRunResult, second: WorldCupRunResult) =>
  first.homeGoals === second.homeGoals &&
  first.awayGoals === second.awayGoals &&
  first.afterExtraTime === second.afterExtraTime &&
  (first.penalties?.[0] ?? null) === (second.penalties?.[0] ?? null) &&
  (first.penalties?.[1] ?? null) === (second.penalties?.[1] ?? null);

const winnerIdFor = (fixture: WorldCupRunFixture) => {
  if (!fixture.result || fixture.stage === "group") {
    throw new Error(`Fixture ${fixture.id} has no knockout winner`);
  }
  if (fixture.result.homeGoals > fixture.result.awayGoals) return fixture.homeTeamId;
  if (fixture.result.awayGoals > fixture.result.homeGoals) return fixture.awayTeamId;
  return fixture.result.penalties![0] > fixture.result.penalties![1]
    ? fixture.homeTeamId
    : fixture.awayTeamId;
};

const groupIdByTeam = (state: WorldCupRunState) =>
  new Map(
    state.groups.flatMap((group) =>
      group.teamIds.map((teamId) => [teamId, group.id] as const),
    ),
  );

const qualifiedTeamIds = (state: WorldCupRunState) => {
  const automatic = WORLD_CUP_RUN_GROUP_IDS.flatMap((groupId) =>
    state.standings[groupId].slice(0, 2).map((standing) => standing.teamId),
  );
  const bestThirds = WORLD_CUP_RUN_GROUP_IDS.map(
    (groupId) => state.standings[groupId][2],
  )
    .sort(
      (first, second) =>
        second.points - first.points ||
        second.goalDifference - first.goalDifference ||
        second.goalsFor - first.goalsFor ||
        first.deterministicTiebreak - second.deterministicTiebreak,
    )
    .slice(0, 8)
    .map((standing) => standing.teamId);
  const qualified = [...automatic, ...bestThirds];
  if (!qualified.includes(state.finalBossTeamId)) {
    const replacementIndex = qualified.findLastIndex(
      (teamId) => teamId !== state.userTeamId,
    );
    qualified[replacementIndex] = state.finalBossTeamId;
  }
  return qualified;
};

const createRoundOf32 = (state: WorldCupRunState): WorldCupRunFixture[] => {
  const qualified = qualifiedTeamIds(state);
  const groupFor = groupIdByTeam(state);
  const rankFor = new Map(
    WORLD_CUP_RUN_GROUP_IDS.flatMap((groupId) =>
      state.standings[groupId].map((standing) => [standing.teamId, standing.rank] as const),
    ),
  );
  const ordered = [...qualified].sort(
    (first, second) =>
      (rankFor.get(first) ?? 4) - (rankFor.get(second) ?? 4) ||
      teamById(state, second).rating - teamById(state, first).rating ||
      hashString(`${state.seed}:r32:${first}`) - hashString(`${state.seed}:r32:${second}`),
  );
  const home = ordered.slice(0, 16);
  let away = ordered.slice(16).reverse();
  for (let rotation = 0; rotation < away.length; rotation += 1) {
    if (home.every((teamId, index) => groupFor.get(teamId) !== groupFor.get(away[index]))) break;
    away = [...away.slice(1), away[0]];
  }

  const userSide = home.includes(state.userTeamId) ? home : away;
  const userIndex = userSide.indexOf(state.userTeamId);
  const bossSide = home.includes(state.finalBossTeamId) ? home : away;
  const bossIndex = bossSide.indexOf(state.finalBossTeamId);
  if (userIndex >= 0 && bossIndex >= 0 && (userIndex < 8) === (bossIndex < 8)) {
    const swapIndex = userIndex < 8 ? 8 : 0;
    [bossSide[bossIndex], bossSide[swapIndex]] = [
      bossSide[swapIndex],
      bossSide[bossIndex],
    ];
  }

  return home.map((homeTeamId, index) => ({
    id: `round-of-32-${index + 1}`,
    stage: "round-of-32",
    groupId: null,
    matchday: null,
    homeTeamId,
    awayTeamId: away[index],
    result: null,
  }));
};

const nextStageFor = (
  stage: WorldCupRunKnockoutStage,
): WorldCupRunKnockoutStage | "complete" => {
  if (stage === "round-of-32") return "round-of-16";
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

const finishGroupStage = (state: WorldCupRunState): WorldCupRunState => {
  const groupFixtures = state.fixtures.filter((fixture) => fixture.stage === "group");
  if (groupFixtures.some((fixture) => !fixture.result)) return state;
  const refreshed = refreshStandings(state);
  const qualified = new Set(qualifiedTeamIds(refreshed));
  const userQualified = qualified.has(state.userTeamId);
  return {
    ...refreshed,
    status: userQualified ? "active" : "eliminated",
    qualificationStatus: userQualified ? "qualified" : "eliminated",
    eliminatedStage: userQualified ? null : "group",
  };
};

const advanceCompletedStage = (state: WorldCupRunState): WorldCupRunState => {
  if (state.currentStage === "complete") return state;
  if (state.currentStage === "group") return finishGroupStage(state);
  const stageFixtures = state.fixtures.filter((fixture) => fixture.stage === state.currentStage);
  if (!stageFixtures.length || stageFixtures.some((fixture) => !fixture.result)) return state;
  const nextStage = nextStageFor(state.currentStage);
  if (nextStage === "complete") {
    const championTeamId = winnerIdFor(stageFixtures[0]);
    return {
      ...state,
      currentStage: "complete",
      championTeamId,
      status: championTeamId === state.userTeamId ? "champion" : "eliminated",
      eliminatedStage:
        championTeamId === state.userTeamId ? state.eliminatedStage : state.eliminatedStage ?? "final",
    };
  }
  return {
    ...state,
    fixtures: [...state.fixtures, ...createNextKnockoutRound(stageFixtures, nextStage)],
    currentStage: nextStage,
  };
};

export const enterWorldCupRunKnockouts = (state: WorldCupRunState): WorldCupRunState => {
  if (
    state.currentStage !== "group" ||
    state.qualificationStatus !== "qualified" ||
    state.fixtures.some((fixture) => fixture.stage === "group" && !fixture.result)
  ) {
    return state;
  }
  return {
    ...state,
    fixtures: [...state.fixtures, ...createRoundOf32(state)],
    currentStage: "round-of-32",
  };
};

export const getWorldCupRunFixture = (state: WorldCupRunState, fixtureId: string) =>
  state.fixtures.find((fixture) => fixture.id === fixtureId);

export const getCurrentWorldCupRunFixtures = (state: WorldCupRunState) =>
  state.currentStage === "complete"
    ? []
    : state.fixtures.filter((fixture) => fixture.stage === state.currentStage);

export const getPendingWorldCupRunUserFixture = (state: WorldCupRunState) =>
  getCurrentWorldCupRunFixtures(state).find(
    (fixture) =>
      !fixture.result &&
      [fixture.homeTeamId, fixture.awayTeamId].includes(state.userTeamId),
  ) ?? null;

const simulateTeamLevelFixture = (
  state: WorldCupRunState,
  fixture: WorldCupRunFixture,
): WorldCupRunResult => {
  const home = teamById(state, fixture.homeTeamId);
  const away = teamById(state, fixture.awayTeamId);
  const random = createSeededRandom(
    state.seed ^ hashString(`world-cup-run-fixture:${fixture.id}:${home.id}:${away.id}`),
  );
  const homeAttack = home.attack ?? home.rating;
  const homeMidfield = home.midfield ?? home.rating;
  const homeDefense = home.defense ?? home.rating;
  const awayAttack = away.attack ?? away.rating;
  const awayMidfield = away.midfield ?? away.rating;
  const awayDefense = away.defense ?? away.rating;

  const ratingEdge = home.rating - away.rating;
  const midfieldEdge = homeMidfield - awayMidfield;
  const homeAttackEdge = homeAttack - awayDefense;
  const awayAttackEdge = awayAttack - homeDefense;

  // Large quality gaps need to feel like large quality gaps. The normal phase
  // model handles competitive matches; once the overall gap exceeds 10 points,
  // this bounded bonus slightly raises the favorite's scoring expectation and
  // suppresses the underdog tail without ever making an upset impossible.
  const mismatchMagnitude = Math.max(0, Math.abs(ratingEdge) - 10);
  const mismatchAdjustment =
    Math.sign(ratingEdge) * Math.min(0.24, mismatchMagnitude * 0.02);

  // World Cup fixtures are neutral-site matches, so both teams share the same
  // scoring baseline. Quality drives the expected goals; the seeded RNG only
  // supplies bounded match-to-match variance through the Poisson sampler.
  const homeLambda = clamp(
    1.25 +
      homeAttackEdge * 0.03 +
      midfieldEdge * 0.008 +
      ratingEdge * 0.012 +
      mismatchAdjustment,
    0.2,
    3.8,
  );
  const awayLambda = clamp(
    1.25 +
      awayAttackEdge * 0.03 -
      midfieldEdge * 0.008 -
      ratingEdge * 0.012 -
      mismatchAdjustment,
    0.2,
    3.8,
  );
  let homeGoals = poisson(homeLambda, random);
  let awayGoals = poisson(awayLambda, random);

  if (fixture.stage === "group") {
    return { homeGoals, awayGoals, afterExtraTime: false };
  }

  if (
    ![fixture.homeTeamId, fixture.awayTeamId].includes(state.userTeamId) &&
    [fixture.homeTeamId, fixture.awayTeamId].includes(state.finalBossTeamId)
  ) {
    const bossAtHome = fixture.homeTeamId === state.finalBossTeamId;
    if ((bossAtHome && homeGoals <= awayGoals) || (!bossAtHome && awayGoals <= homeGoals)) {
      if (bossAtHome) homeGoals = awayGoals + 1;
      else awayGoals = homeGoals + 1;
    }
    return { homeGoals, awayGoals, afterExtraTime: false };
  }

  if (homeGoals !== awayGoals) return { homeGoals, awayGoals, afterExtraTime: false };
  homeGoals += poisson(homeLambda * 0.25, random, 2);
  awayGoals += poisson(awayLambda * 0.25, random, 2);
  if (homeGoals !== awayGoals) return { homeGoals, awayGoals, afterExtraTime: true };

  let homePenalties = 0;
  let awayPenalties = 0;
  const homeChance = clamp(0.75 + ratingEdge * 0.0015, 0.68, 0.82);
  const awayChance = clamp(0.75 - ratingEdge * 0.0015, 0.68, 0.82);
  for (let kick = 0; kick < 5; kick += 1) {
    if (random() < homeChance) homePenalties += 1;
    if (random() < awayChance) awayPenalties += 1;
  }
  for (let suddenDeath = 0; homePenalties === awayPenalties && suddenDeath < 20; suddenDeath += 1) {
    const homeScores = random() < homeChance;
    const awayScores = random() < awayChance;
    if (homeScores && !awayScores) homePenalties += 1;
    if (!homeScores && awayScores) awayPenalties += 1;
  }
  if (homePenalties === awayPenalties) {
    if (hashString(`${state.seed}:shootout-fallback:${fixture.id}`) % 2 === 0) homePenalties += 1;
    else awayPenalties += 1;
  }
  return {
    homeGoals,
    awayGoals,
    afterExtraTime: true,
    penalties: [homePenalties, awayPenalties],
  };
};

export const simulateWorldCupRunCpuFixture = (
  state: WorldCupRunState,
  fixture: WorldCupRunFixture,
) => {
  if ([fixture.homeTeamId, fixture.awayTeamId].includes(state.userTeamId)) {
    throw new Error("User fixtures require a recorded user result");
  }
  return simulateTeamLevelFixture(state, fixture);
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
    throw new Error(`Fixture ${fixtureId} cannot be played during ${state.currentStage}`);
  }
  const involvesUser = [fixture.homeTeamId, fixture.awayTeamId].includes(state.userTeamId);
  if (involvesUser && !suppliedResult) {
    throw new Error("User fixtures require a recorded user result");
  }
  const result = suppliedResult
    ? normalizeResult(suppliedResult)
    : simulateWorldCupRunCpuFixture(state, fixture);
  validateResult(fixture, result);

  let status = state.status;
  let eliminatedStage = state.eliminatedStage;
  if (fixture.stage !== "group" && involvesUser) {
    const fixtureWithResult = { ...fixture, result };
    if (winnerIdFor(fixtureWithResult) !== state.userTeamId) {
      status = "eliminated";
      eliminatedStage = fixture.stage;
    }
  }
  const updated: WorldCupRunState = {
    ...state,
    status,
    eliminatedStage,
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
  return advanceCompletedStage(fixture.stage === "group" ? refreshStandings(updated) : updated);
};

export const recordWorldCupRunUserResult = (
  state: WorldCupRunState,
  fixtureId: string,
  result: WorldCupRunUserResult,
) => {
  const fixture = getWorldCupRunFixture(state, fixtureId);
  if (!fixture) throw new Error(`Unknown World Cup Run fixture ${fixtureId}`);
  if (![fixture.homeTeamId, fixture.awayTeamId].includes(state.userTeamId)) {
    throw new Error(`Fixture ${fixtureId} does not involve the user team`);
  }
  const userAtHome = fixture.homeTeamId === state.userTeamId;
  return recordWorldCupRunFixtureResult(state, fixtureId, {
    homeGoals: userAtHome ? result.userGoals : result.opponentGoals,
    awayGoals: userAtHome ? result.opponentGoals : result.userGoals,
    afterExtraTime: result.afterExtraTime,
    ...(result.penalties
      ? { penalties: userAtHome ? result.penalties : [result.penalties[1], result.penalties[0]] }
      : {}),
  });
};

const recordQuickFixture = (state: WorldCupRunState, fixture: WorldCupRunFixture) => {
  const result = simulateTeamLevelFixture(state, fixture);
  return [fixture.homeTeamId, fixture.awayTeamId].includes(state.userTeamId)
    ? recordWorldCupRunFixtureResult(state, fixture.id, result)
    : recordWorldCupRunFixtureResult(state, fixture.id);
};

export const simulateNextWorldCupRunUserFixture = (state: WorldCupRunState) => {
  const fixture = getPendingWorldCupRunUserFixture(state);
  if (!fixture || fixture.stage === "final" || state.status !== "active") return state;
  if (fixture.stage !== "group") return recordQuickFixture(state, fixture);

  // A group-stage click represents a tournament matchday, not an isolated
  // Trophy XI game. Resolving all 24 fixtures keeps every table in lockstep
  // and guarantees every nation has played three times when Matchday 3 ends.
  let resolved = state;
  const matchdayFixtures = state.fixtures.filter(
    (candidate) =>
      candidate.stage === "group" &&
      candidate.matchday === fixture.matchday &&
      !candidate.result,
  );
  for (const matchdayFixture of matchdayFixtures) {
    resolved = recordQuickFixture(resolved, matchdayFixture);
  }
  return resolved;
};

export const simulateRemainingWorldCupRunGroup = (state: WorldCupRunState) => {
  if (state.currentStage !== "group" || state.qualificationStatus !== "pending") return state;
  let resolved = state;
  for (const fixture of state.fixtures.filter((candidate) => candidate.stage === "group" && !candidate.result)) {
    resolved = recordQuickFixture(resolved, fixture);
  }
  return resolved;
};

export const simulateRemainingWorldCupRunRound = (state: WorldCupRunState) => {
  if (
    state.currentStage === "group" ||
    state.currentStage === "final" ||
    state.currentStage === "complete" ||
    state.status !== "active"
  ) return state;
  let resolved = state;
  for (const fixture of getCurrentWorldCupRunFixtures(state).filter((candidate) => !candidate.result)) {
    resolved = recordQuickFixture(resolved, fixture);
  }
  return resolved;
};

/** Compatibility helper for result recording and deterministic domain tests. */
export const resolvePendingWorldCupRunCpuFixtures = (state: WorldCupRunState) => {
  let resolved = state;
  while (resolved.currentStage !== "complete") {
    const pendingCpuFixtures = getCurrentWorldCupRunFixtures(resolved).filter(
      (fixture) =>
        !fixture.result &&
        ![fixture.homeTeamId, fixture.awayTeamId].includes(resolved.userTeamId),
    );
    if (!pendingCpuFixtures.length) break;
    for (const fixture of pendingCpuFixtures) {
      resolved = recordWorldCupRunFixtureResult(resolved, fixture.id);
    }
  }
  return resolved;
};
