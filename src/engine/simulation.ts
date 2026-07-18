import {
  controlCommentary,
  goalCommentary,
  openingCommentary,
} from "@/engine/commentary";
import { calculateTeamRatings } from "@/engine/ratings";
import {
  createSeededRandom,
  randomInt,
  type RandomSource,
  weightedPick,
} from "@/engine/random";
import type {
  Champion,
  DraftEraId,
  DraftPick,
  Formation,
  ManagerTournamentCard,
  MatchEvent,
  MatchResult,
  PlayerTournamentCard,
} from "@/types/game";

export type SimulationInput = {
  lineup: PlayerTournamentCard[];
  picks?: DraftPick[];
  formation: Formation;
  manager?: ManagerTournamentCard;
  eraId?: DraftEraId;
  opponent: Champion;
  seed: number;
  knockoutMode?: "normal" | "force-extra-time" | "force-penalties";
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const poisson = (lambda: number, random: RandomSource, cap = 4) => {
  const threshold = Math.exp(-lambda);
  let product = 1;
  let count = 0;
  do {
    count += 1;
    product *= random();
  } while (product > threshold && count <= cap);
  return Math.min(cap, count - 1);
};

const createEvent = (
  event: Omit<MatchEvent, "id">,
  index: number,
): MatchEvent => ({ ...event, id: `${event.minute}-${event.type}-${index}` });

const goalMinutes = (
  count: number,
  random: RandomSource,
  from: number,
  to: number,
) =>
  Array.from({ length: count }, () => randomInt(random, from, to)).sort(
    (a, b) => a - b,
  );

const chooseUserScorer = (
  lineup: PlayerTournamentCard[],
  random: RandomSource,
) =>
  weightedPick(
    lineup.filter((player) => player.primaryPosition !== "GK"),
    (player) => player.attributes.attack + player.attributes.clutch * 0.35,
    random,
  );

const chooseUserAssist = (
  lineup: PlayerTournamentCard[],
  scorerId: string,
  random: RandomSource,
) =>
  weightedPick(
    lineup.filter((player) => player.id !== scorerId && player.primaryPosition !== "GK"),
    (player) => player.attributes.creativity,
    random,
  );

const chooseOpponentPlayer = (
  opponent: Champion,
  random: RandomSource,
  excludeName?: string,
) =>
  weightedPick(
    opponent.lineup.filter(
      (player) => player.position !== "GK" && player.name !== excludeName,
    ),
    (player) =>
      player.rating *
      (["ST", "CF", "LW", "RW", "AM"].includes(player.position) ? 1.45 : 0.7),
    random,
  );

export const simulateMatch = ({
  lineup,
  picks,
  formation,
  manager,
  eraId = "all",
  opponent,
  seed,
  knockoutMode = "normal",
}: SimulationInput): MatchResult => {
  if (lineup.length !== 11) throw new Error("A complete eleven is required");
  if (!opponent.playable || opponent.lineup.length !== 11) {
    throw new Error("The selected champion is not playable");
  }

  const random = createSeededRandom(seed);
  const userRatings = calculateTeamRatings(lineup, formation, {
    picks,
    manager,
    eraId,
  });
  const opponentRatings = opponent.ratings;
  const avgClutch =
    lineup.reduce((sum, player) => sum + player.attributes.clutch, 0) /
      lineup.length +
    (manager?.simulationModifier.clutch ?? 0);
  const midfieldEdge = userRatings.midfield - opponentRatings.midfield;
  const userPossession = Math.round(clamp(50 + midfieldEdge * 0.72 + (random() - 0.5) * 8, 32, 64));
  const opponentPossession = 100 - userPossession;
  const userXg = clamp(
    1.18 +
      (userRatings.attack - opponentRatings.defense) * 0.035 +
      midfieldEdge * 0.014 +
      (userRatings.chemistry - 75) * 0.006 +
      (avgClutch - 85) * 0.008 +
      (random() - 0.5) * 0.42,
    0.35,
    3.15,
  );
  const opponentXg = clamp(
    1.28 +
      (opponentRatings.attack - userRatings.defense) * 0.035 -
      midfieldEdge * 0.011 +
      (opponentRatings.chemistry - 90) * 0.005 +
      (random() - 0.5) * 0.42,
    0.35,
    3.15,
  );

  let userGoals = poisson(userXg, random);
  let opponentGoals = poisson(opponentXg, random);
  if (knockoutMode !== "normal") {
    const tiedScore = Math.min(2, Math.max(0, Math.round((userXg + opponentXg) / 2)));
    userGoals = tiedScore;
    opponentGoals = tiedScore;
  }

  const regularUserGoals = userGoals;
  const regularOpponentGoals = opponentGoals;
  let extraUserGoals = 0;
  let extraOpponentGoals = 0;
  let afterExtraTime = false;
  let penalties: [number, number] | undefined;

  if (userGoals === opponentGoals) {
    afterExtraTime = true;
    extraUserGoals = poisson(userXg * 0.27, random, 2);
    extraOpponentGoals = poisson(opponentXg * 0.27, random, 2);
    if (knockoutMode === "force-penalties") {
      extraUserGoals = 0;
      extraOpponentGoals = 0;
    }
    userGoals += extraUserGoals;
    opponentGoals += extraOpponentGoals;

    if (userGoals === opponentGoals) {
      const userEdge = clamp((avgClutch - 89) / 100, -0.04, 0.05);
      let userPens = 0;
      let opponentPens = 0;
      for (let kick = 0; kick < 5; kick += 1) {
        if (random() < 0.76 + userEdge) userPens += 1;
        if (random() < 0.75) opponentPens += 1;
      }
      while (userPens === opponentPens) {
        if (random() < 0.76 + userEdge) userPens += 1;
        if (random() < 0.75) opponentPens += 1;
      }
      penalties = [userPens, opponentPens];
    }
  }

  const rawEvents: Array<Omit<MatchEvent, "id">> = [
    {
      minute: 0,
      minuteLabel: "KO",
      type: "kickoff",
      team: "neutral",
      title: "Kickoff",
      detail: openingCommentary(random),
      userScore: 0,
      opponentScore: 0,
    },
    {
      minute: randomInt(random, 8, 16),
      minuteLabel: "",
      type: "commentary",
      team: userPossession >= 50 ? "user" : "opponent",
      title: "Midfield battle",
      detail: controlCommentary(userPossession >= 50 ? "user" : "opponent", random),
      userScore: 0,
      opponentScore: 0,
    },
  ];

  if (manager) {
    const managerMinute = randomInt(random, 18, 34);
    rawEvents.push({
      minute: managerMinute,
      minuteLabel: `${managerMinute}’`,
      type: "manager",
      team: "user",
      title: `${manager.managerName} adjusts the shape`,
      detail:
        userRatings.managerFit >= 94
          ? `${manager.tacticalIdentity}. The system responds immediately.`
          : `${manager.tacticalIdentity}. The XI works to translate the instruction.`,
      userScore: 0,
      opponentScore: 0,
    });
  }

  goalMinutes(regularUserGoals, random, 9, 88).forEach((minute) => {
    const scorer = chooseUserScorer(lineup, random);
    const assist = random() > 0.22 ? chooseUserAssist(lineup, scorer.id, random) : undefined;
    rawEvents.push({
      minute,
      minuteLabel: `${minute}’`,
      type: "goal",
      team: "user",
      title: `GOAL — ${scorer.playerName} ${scorer.tournamentYear}`,
      detail: goalCommentary(
        `${scorer.playerName} ${scorer.tournamentYear}`,
        assist ? `${assist.playerName} ${assist.tournamentYear}` : undefined,
        "user",
      ),
      userScore: 0,
      opponentScore: 0,
    });
  });

  goalMinutes(regularOpponentGoals, random, 9, 88).forEach((minute) => {
    const scorer = chooseOpponentPlayer(opponent, random);
    const assist =
      random() > 0.25
        ? chooseOpponentPlayer(opponent, random, scorer.name)
        : undefined;
    rawEvents.push({
      minute,
      minuteLabel: `${minute}’`,
      type: "goal",
      team: "opponent",
      title: `GOAL — ${scorer.name}`,
      detail: goalCommentary(scorer.name, assist?.name, "opponent"),
      userScore: 0,
      opponentScore: 0,
    });
  });

  const userYellows = randomInt(random, 0, 2);
  const opponentYellows = randomInt(random, 0, 2);
  for (let index = 0; index < userYellows; index += 1) {
    const player = lineup[randomInt(random, 1, lineup.length - 1)];
    const minute = randomInt(random, 24, 84);
    rawEvents.push({
      minute,
      minuteLabel: `${minute}’`,
      type: "yellow",
      team: "user",
      title: `Yellow card — ${player.playerName}`,
      detail: "A late challenge stops the transition.",
      userScore: 0,
      opponentScore: 0,
    });
  }
  for (let index = 0; index < opponentYellows; index += 1) {
    const player = opponent.lineup[randomInt(random, 1, opponent.lineup.length - 1)];
    const minute = randomInt(random, 24, 84);
    rawEvents.push({
      minute,
      minuteLabel: `${minute}’`,
      type: "yellow",
      team: "opponent",
      title: `Yellow card — ${player.name}`,
      detail: "The referee has seen enough of the tactical foul.",
      userScore: 0,
      opponentScore: 0,
    });
  }

  rawEvents.push({
    minute: 45,
    minuteLabel: "HT",
    type: "halftime",
    team: "neutral",
    title: "Half-time",
    detail: "The teams disappear down the tunnel. Fine margins remain.",
    userScore: 0,
    opponentScore: 0,
  });

  if (afterExtraTime) {
    rawEvents.push({
      minute: 90,
      minuteLabel: "ET",
      type: "extra-time",
      team: "neutral",
      title: "Extra time",
      detail: "Ninety minutes cannot separate these teams.",
      userScore: 0,
      opponentScore: 0,
    });
    goalMinutes(extraUserGoals, random, 94, 118).forEach((minute) => {
      const scorer = chooseUserScorer(lineup, random);
      rawEvents.push({
        minute,
        minuteLabel: `${minute}’`,
        type: "goal",
        team: "user",
        title: `GOAL — ${scorer.playerName} ${scorer.tournamentYear}`,
        detail: `${scorer.playerName} finds something special in extra time.`,
        userScore: 0,
        opponentScore: 0,
      });
    });
    goalMinutes(extraOpponentGoals, random, 94, 118).forEach((minute) => {
      const scorer = chooseOpponentPlayer(opponent, random);
      rawEvents.push({
        minute,
        minuteLabel: `${minute}’`,
        type: "goal",
        team: "opponent",
        title: `GOAL — ${scorer.name}`,
        detail: `${scorer.name} arrives when Spain need him most.`,
        userScore: 0,
        opponentScore: 0,
      });
    });
  }

  if (penalties) {
    rawEvents.push({
      minute: 121,
      minuteLabel: "PEN",
      type: "penalties",
      team: penalties[0] > penalties[1] ? "user" : "opponent",
      title: `Penalty shootout ${penalties[0]}–${penalties[1]}`,
      detail:
        penalties[0] > penalties[1]
          ? "Trophy XI hold their nerve from the spot."
          : "Spain survive the shootout under impossible pressure.",
      userScore: userGoals,
      opponentScore: opponentGoals,
    });
  }

  rawEvents.push({
    minute: afterExtraTime ? 122 : 90,
    minuteLabel: "FT",
    type: "fulltime",
    team: "neutral",
    title: "Full-time",
    detail: "History has its answer.",
    userScore: userGoals,
    opponentScore: opponentGoals,
  });

  rawEvents.sort((a, b) => a.minute - b.minute || (a.type === "fulltime" ? 1 : -1));
  let runningUserScore = 0;
  let runningOpponentScore = 0;
  const events = rawEvents.map((event, index) => {
    if (event.type === "goal" && event.team === "user") runningUserScore += 1;
    if (event.type === "goal" && event.team === "opponent") runningOpponentScore += 1;
    return createEvent(
      {
        ...event,
        minuteLabel: event.minuteLabel || `${event.minute}’`,
        userScore: event.type === "penalties" ? userGoals : runningUserScore,
        opponentScore: event.type === "penalties" ? opponentGoals : runningOpponentScore,
      },
      index,
    );
  });

  const userShots = Math.max(userGoals + 2, Math.round(userXg * 4.1 + randomInt(random, 3, 7)));
  const opponentShots = Math.max(
    opponentGoals + 2,
    Math.round(opponentXg * 4.1 + randomInt(random, 3, 7)),
  );
  const userShotsOnTarget = Math.min(
    userShots,
    Math.max(userGoals, Math.round(userShots * (0.32 + random() * 0.14))),
  );
  const opponentShotsOnTarget = Math.min(
    opponentShots,
    Math.max(opponentGoals, Math.round(opponentShots * (0.32 + random() * 0.14))),
  );

  const userPotm = weightedPick(
    lineup,
    (player) => player.overall + player.attributes.clutch * 0.25,
    random,
  );
  const opponentPotm = weightedPick(opponent.lineup, (player) => player.rating, random);
  const userWon =
    userGoals > opponentGoals ||
    (userGoals === opponentGoals && penalties && penalties[0] > penalties[1]);

  return {
    seed,
    opponentId: opponent.id,
    score: {
      user: userGoals,
      opponent: opponentGoals,
      afterExtraTime,
      ...(penalties ? { penalties } : {}),
    },
    stats: {
      possession: [userPossession, opponentPossession],
      shots: [userShots, opponentShots],
      shotsOnTarget: [userShotsOnTarget, opponentShotsOnTarget],
      expectedGoals: [Number(userXg.toFixed(2)), Number(opponentXg.toFixed(2))],
      yellowCards: [userYellows, opponentYellows],
      tacticalImpact: [
        userRatings.managerFit,
        opponent.ratings.managerFit ?? opponent.ratings.chemistry,
      ],
    },
    events,
    playerOfTheMatch:
      userWon && userGoals > 0
        ? `${userPotm.playerName} ${userPotm.tournamentYear}`
        : opponentPotm.name,
    userRatings,
    managerImpact: manager
      ? `${manager.managerName} delivered ${userRatings.managerFit}% tactical fit through ${manager.style} principles.`
      : "No tournament manager impact was applied.",
    generatedAt: new Date(
      Date.UTC(2026, 0, 1) + (seed % 365) * 86_400_000,
    ).toISOString(),
  };
};
