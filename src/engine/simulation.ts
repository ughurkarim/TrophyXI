import {
  controlCommentary,
  goalCommentary,
  openingCommentary,
} from "@/engine/commentary";
import { calculateTeamRatings } from "@/engine/ratings";
import { calculateOpponentEraFit } from "@/engine/era-translation";
import {
  calculateWorldCupAllStarsRatings,
  getWorldCupAllStarsBench,
  getWorldCupAllStarsLineup,
} from "@/engine/all-stars";
import {
  createSeededRandom,
  randomInt,
  type RandomSource,
  weightedPick,
} from "@/engine/random";
import {
  calculateManagerEraFit,
  managerEraEffectiveness,
} from "@/engine/manager-era-fit";
import { compatibleHistoricalPositions } from "@/engine/historical-lineup";
import type {
  BenchSlotId,
  DraftEraId,
  DraftPick,
  Formation,
  HistoricalWorldCupTeam,
  ManagerTournamentCard,
  MatchEvent,
  MatchResult,
  PlayerAttributes,
  PlayerTournamentCard,
  Position,
  SubstitutionRecord,
} from "@/types/game";

export type SimulationInput = {
  lineup: PlayerTournamentCard[];
  bench: PlayerTournamentCard[];
  picks?: DraftPick[];
  formation: Formation;
  manager?: ManagerTournamentCard;
  eraId?: DraftEraId;
  opponent: HistoricalWorldCupTeam;
  seed: number;
  competitionStage?: "group" | "knockout";
  knockoutMode?: "normal" | "force-extra-time" | "force-penalties";
};

type SimulationPlayer = {
  id: string;
  playerName: string;
  tournamentYear: number;
  primaryPosition: Position;
  eligiblePositions: Position[];
  overall: number;
  attributes: Pick<PlayerAttributes, "attack" | "creativity" | "clutch">;
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
  opponent: HistoricalWorldCupTeam,
  lineup: SimulationPlayer[],
  random: RandomSource,
  excludedId?: string,
) => {
  if (lineup.length) {
    const player = weightedPick(
      lineup.filter(
        (candidate) =>
          candidate.primaryPosition !== "GK" && candidate.id !== excludedId,
      ),
      (candidate) =>
        excludedId
          ? candidate.attributes.creativity
          : candidate.attributes.attack + candidate.attributes.clutch * 0.35,
      random,
    );
    return {
      id: player.id,
      name: `${player.playerName} ${player.tournamentYear}`,
    };
  }
  return {
    id: opponent.id,
    name: `${opponent.nationName} ${opponent.tournamentYear ?? ""}`.trim(),
  };
};

const substitutionPosition = (
  substitute: SimulationPlayer,
  lineup: SimulationPlayer[],
  alreadyRemoved: Set<string>,
) => {
  const compatible = lineup.filter(
    (starter) =>
      !alreadyRemoved.has(starter.id) &&
      starter.primaryPosition !== "GK" &&
      (substitute.eligiblePositions.includes(starter.primaryPosition) ||
        starter.eligiblePositions.includes(substitute.primaryPosition)),
  );
  return (
    compatible.sort((first, second) => first.overall - second.overall)[0] ??
    lineup
      .filter(
        (starter) =>
          !alreadyRemoved.has(starter.id) && starter.primaryPosition !== "GK",
      )
      .sort((first, second) => first.overall - second.overall)[0]
  );
};

const createSubstitutions = ({
  lineup,
  bench,
  manager,
  managerEraFit,
  trailing,
  winning,
  extraTime,
  random,
}: {
  lineup: SimulationPlayer[];
  bench: SimulationPlayer[];
  manager?: ManagerTournamentCard;
  managerEraFit?: number;
  trailing: boolean;
  winning: boolean;
  extraTime: boolean;
  random: RandomSource;
}): SubstitutionRecord[] => {
  const windows: Array<[number, number]> = [
    [50, 70],
    [65, 80],
    [75, extraTime ? 104 : 90],
  ];
  const baselineUse = [0.96, 0.82, extraTime ? 0.82 : 0.58];
  const removed = new Set<string>();
  const eraEffectiveness = manager
    ? clamp(0.82 + ((managerEraFit ?? 75) - 75) * 0.006, 0.64, 0.98)
    : 0;
  return bench.flatMap((substitute, index) => {
    const aggressive =
      trailing &&
      ["LW", "RW", "CF", "ST", "AM"].includes(substitute.primaryPosition);
    const protective =
      winning &&
      ["LB", "LCB", "CB", "RCB", "RB", "DM"].includes(
        substitute.primaryPosition,
      );
    const managerUse =
      (((manager?.gameManagement ?? 78) - 78) * 0.004 +
        (aggressive ? ((manager?.grades.offense ?? 78) - 78) * 0.003 : 0) +
        (protective
          ? ((manager?.grades.defense ?? 78) - 78) * 0.003
          : 0)) *
      eraEffectiveness;
    if (random() > baselineUse[index] + managerUse) return [];
    const outgoing = substitutionPosition(substitute, lineup, removed);
    if (!outgoing) return [];
    removed.add(outgoing.id);
    const [from, to] = windows[index];
    const tacticalShift = aggressive ? -6 : protective ? 3 : 0;
    const minute = clamp(
      randomInt(random, from, to) + tacticalShift,
      46,
      extraTime ? 110 : 89,
    );
    const benchSlot = `bench-${index + 1}` as BenchSlotId;
    return [
      {
        minute,
        playerInId: substitute.id,
        playerOutId: outgoing.id,
        position: outgoing.primaryPosition as Position,
        benchSlot,
        reason: aggressive
          ? "Attacking response while chasing the match"
          : protective
            ? "Defensive control to protect the score"
            : index === 0
              ? "Priority change to refresh the shape"
              : "Fatigue and tactical balance",
        managerInfluence: Math.round(
          (manager?.gameManagement ?? 75) * (0.82 + eraEffectiveness * 0.18),
        ),
      },
    ];
  });
};

const historicalSimulationPlayer = (
  opponent: HistoricalWorldCupTeam,
  player: HistoricalWorldCupTeam["startingLineup"][number],
  index: number,
): SimulationPlayer => {
  const overall = player.rating ?? opponent.ratings.overall;
  const attackingPosition = [
    "AM",
    "LM",
    "RM",
    "LW",
    "RW",
    "CF",
    "ST",
  ].includes(player.position);
  const creativePosition = [
    "DM",
    "CM",
    "AM",
    "LM",
    "RM",
    "LW",
    "RW",
  ].includes(player.position);
  return {
    id: `${opponent.id}:${player.sourcePlayerId ?? player.playerIdentityId}:${index}`,
    playerName: player.name,
    tournamentYear: opponent.tournamentYear ?? 2026,
    primaryPosition: player.position,
    eligiblePositions: compatibleHistoricalPositions(player.position),
    overall,
    attributes: {
      attack: clamp(overall + (attackingPosition ? 5 : -12), 45, 99),
      creativity: clamp(overall + (creativePosition ? 4 : -7), 45, 99),
      clutch: clamp(overall + 3, 45, 99),
    },
  };
};

export const simulateMatch = ({
  lineup,
  bench,
  picks,
  formation,
  manager,
  eraId = "all",
  opponent,
  seed,
  competitionStage = "knockout",
  knockoutMode = "normal",
}: SimulationInput): MatchResult => {
  if (lineup.length !== 11) throw new Error("A complete eleven is required");
  if (bench.length !== 3) throw new Error("Three ordered substitutes are required");
  const userIdentityIds = [...lineup, ...bench].map(
    (player) => player.playerIdentityId,
  );
  if (new Set(userIdentityIds).size !== 14) {
    throw new Error("The complete squad must contain fourteen unique identities");
  }
  const opponentIdentityIds = new Set(
    [...opponent.startingLineup, ...opponent.substitutes].map(
      (player) => player.playerIdentityId,
    ),
  );
  if (userIdentityIds.some((identity) => opponentIdentityIds.has(identity))) {
    throw new Error("Opponent identities cannot appear in the user squad");
  }

  const random = createSeededRandom(seed);
  const userRatings = calculateTeamRatings(lineup, formation, {
    picks,
    manager,
    eraId,
    bench,
  });
  const opponentEraFit = calculateOpponentEraFit(opponent, eraId);
  const allStarsRatings =
    opponent.kind === "all-stars"
      ? calculateWorldCupAllStarsRatings(eraId, opponent)
      : null;
  const opponentRatings = allStarsRatings
    ? {
        attack: allStarsRatings.attack,
        midfield: allStarsRatings.midfield,
        defense: allStarsRatings.defense,
        goalkeeper: opponent.ratings.goalkeeper,
        depth: allStarsRatings.benchDepth,
        chemistry: allStarsRatings.chemistry,
        overall: allStarsRatings.overall,
      }
    : {
        ...opponent.ratings,
        chemistry: 86,
        overall: opponent.ratings.overall,
      };
  const opponentLineup: SimulationPlayer[] =
    opponent.kind === "all-stars"
      ? getWorldCupAllStarsLineup(opponent)
      : opponent.startingLineup.map((player, index) =>
          historicalSimulationPlayer(opponent, player, index),
        );
  const opponentBench: SimulationPlayer[] =
    opponent.kind === "all-stars"
      ? getWorldCupAllStarsBench(opponent)
      : opponent.substitutes.map((player, index) =>
          historicalSimulationPlayer(
            opponent,
            player,
            opponent.startingLineup.length + index,
          ),
        );
  const opponentManager = opponent.allStars?.manager;
  const managerEraFit = manager
    ? calculateManagerEraFit(manager, eraId).score
    : 75;
  const managerEffectiveness = managerEraEffectiveness(manager, eraId);
  const opponentManagerEraFit = opponentManager
    ? calculateManagerEraFit(opponentManager, eraId).score
    : opponentEraFit;
  const avgClutch =
    lineup.reduce((sum, player) => sum + player.attributes.clutch, 0) /
      lineup.length +
    (manager?.simulationModifier.clutch ?? 0) * managerEffectiveness;
  const midfieldEdge = userRatings.midfield - opponentRatings.midfield;
  const userPossession = Math.round(clamp(50 + midfieldEdge * 0.72 + (random() - 0.5) * 8, 32, 64));
  const opponentPossession = 100 - userPossession;
  const userXg = clamp(
    1.18 +
      (userRatings.attack - opponentRatings.defense) * 0.035 +
      midfieldEdge * 0.014 +
      (userRatings.chemistry - 75) * 0.006 +
      (avgClutch - 85) * 0.008 +
      ((manager?.grades.offense ?? 78) - 78) *
        0.006 *
        managerEffectiveness +
      (managerEraFit - 75) * 0.003 +
      (userRatings.eraFit - opponentEraFit) * 0.005 +
      (random() - 0.5) * 0.42,
    0.35,
    3.15,
  );
  const opponentXg = clamp(
    1.28 +
      (opponentRatings.attack - userRatings.defense) * 0.035 -
      midfieldEdge * 0.011 +
      (opponentRatings.chemistry - 90) * 0.005 +
      ((manager?.grades.defense ?? 78) - 78) *
        -0.005 *
        managerEffectiveness -
      (managerEraFit - 75) * 0.0025 +
      (opponentEraFit - userRatings.eraFit) * 0.005 +
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

  if (userGoals === opponentGoals && competitionStage === "knockout") {
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

  const substitutions = createSubstitutions({
    lineup,
    bench,
    manager,
    managerEraFit,
    trailing: userGoals < opponentGoals,
    winning: userGoals > opponentGoals,
    extraTime: afterExtraTime,
    random,
  }).sort((first, second) => first.minute - second.minute);
  const opponentSubstitutions = opponentLineup.length
      ? createSubstitutions({
        lineup: opponentLineup,
        bench: opponentBench.slice(0, 3),
        manager: opponentManager,
        managerEraFit: opponentManagerEraFit,
        trailing: opponentGoals < userGoals,
        winning: opponentGoals > userGoals,
        extraTime: afterExtraTime,
        random,
      }).sort((first, second) => first.minute - second.minute)
    : [];
  const activeLineupAt = (minute: number) => {
    const active = new Map(lineup.map((player) => [player.id, player]));
    for (const substitution of substitutions) {
      if (substitution.minute > minute) continue;
      active.delete(substitution.playerOutId);
      const incoming = bench.find(
        (player) => player.id === substitution.playerInId,
      );
      if (incoming) active.set(incoming.id, incoming);
    }
    return [...active.values()];
  };
  const activeOpponentLineupAt = (minute: number) => {
    const active = new Map(
      opponentLineup.map((player) => [player.id, player]),
    );
    for (const substitution of opponentSubstitutions) {
      if (substitution.minute > minute) continue;
      active.delete(substitution.playerOutId);
      const incoming = opponentBench.find(
        (player) => player.id === substitution.playerInId,
      );
      if (incoming) active.set(incoming.id, incoming);
    }
    return [...active.values()];
  };
  const goalsByPlayer = new Map<string, number>();
  const assistsByPlayer = new Map<string, number>();

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
        managerEraFit >= 94
          ? `${manager.tacticalIdentity}. The system responds immediately.`
          : `${manager.tacticalIdentity}. The XI works to translate the instruction.`,
      userScore: 0,
      opponentScore: 0,
    });
  }

  goalMinutes(regularUserGoals, random, 9, 88).forEach((minute) => {
    const active = activeLineupAt(minute);
    const scorer = chooseUserScorer(active, random);
    const assist = random() > 0.22 ? chooseUserAssist(active, scorer.id, random) : undefined;
    goalsByPlayer.set(scorer.id, (goalsByPlayer.get(scorer.id) ?? 0) + 1);
    if (assist) {
      assistsByPlayer.set(assist.id, (assistsByPlayer.get(assist.id) ?? 0) + 1);
    }
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
    const active = activeOpponentLineupAt(minute);
    const scorer = chooseOpponentPlayer(opponent, active, random);
    const assist =
      random() > 0.25
        ? chooseOpponentPlayer(opponent, active, random, scorer.id)
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

  for (const substitution of substitutions) {
    const incoming = bench.find(
      (player) => player.id === substitution.playerInId,
    )!;
    const outgoing = lineup.find(
      (player) => player.id === substitution.playerOutId,
    )!;
    rawEvents.push({
      minute: substitution.minute,
      minuteLabel: `${substitution.minute}’`,
      type: "substitution",
      team: "user",
      title: `${incoming.playerName} ${incoming.tournamentYear} replaces ${outgoing.playerName} ${outgoing.tournamentYear}`,
      detail: `${substitution.reason}. New position: ${substitution.position}. ${substitution.benchSlot.replace("-", " ")} priority; ${manager?.managerName ?? "the manager"} influence ${substitution.managerInfluence}.`,
      userScore: 0,
      opponentScore: 0,
    });
  }
  for (const substitution of opponentSubstitutions) {
    const incoming = opponentBench.find(
      (player) => player.id === substitution.playerInId,
    )!;
    const outgoing = opponentLineup.find(
      (player) => player.id === substitution.playerOutId,
    )!;
    rawEvents.push({
      minute: substitution.minute,
      minuteLabel: `${substitution.minute}’`,
      type: "substitution",
      team: "opponent",
      title: `${incoming.playerName} ${incoming.tournamentYear} replaces ${outgoing.playerName} ${outgoing.tournamentYear}`,
      detail: `${substitution.reason}. New position: ${substitution.position}. ${substitution.benchSlot.replace("-", " ")} priority; ${opponentManager?.managerName ?? opponent.nationName} influence ${substitution.managerInfluence}.`,
      userScore: 0,
      opponentScore: 0,
    });
  }

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
    const eligible = opponentLineup.filter(
      (player) => player.primaryPosition !== "GK",
    );
    const player =
      eligible.length > 0
        ? eligible[randomInt(random, 0, eligible.length - 1)]
        : undefined;
    const minute = randomInt(random, 24, 84);
    rawEvents.push({
      minute,
      minuteLabel: `${minute}’`,
      type: "yellow",
      team: "opponent",
      title: `Yellow card — ${player?.playerName ?? opponent.nationName}`,
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
      const active = activeLineupAt(minute);
      const scorer = chooseUserScorer(active, random);
      goalsByPlayer.set(scorer.id, (goalsByPlayer.get(scorer.id) ?? 0) + 1);
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
      const scorer = chooseOpponentPlayer(
        opponent,
        activeOpponentLineupAt(minute),
        random,
      );
      rawEvents.push({
        minute,
        minuteLabel: `${minute}’`,
        type: "goal",
        team: "opponent",
        title: `GOAL — ${scorer.name}`,
        detail: `${scorer.name} arrives when ${opponent.nationName} need a decisive moment.`,
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
          : `${opponent.nationName} survive the shootout under impossible pressure.`,
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

  const fullSquad = [...lineup, ...bench];
  const userPotm = weightedPick(
    fullSquad,
    (player) =>
      player.overall +
      player.attributes.clutch * 0.25 +
      (goalsByPlayer.get(player.id) ?? 0) * 20 +
      (assistsByPlayer.get(player.id) ?? 0) * 8,
    random,
  );
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
        Math.round((userRatings.managerFit + managerEraFit) / 2),
        opponentEraFit,
      ],
    },
    events,
    playerOfTheMatch:
      userWon && userGoals > 0
        ? `${userPotm.playerName} ${userPotm.tournamentYear}`
        : `${opponent.nationName} ${opponent.tournamentYear}`,
    userRatings,
    managerImpact: manager
      ? `${manager.managerName} delivered ${userRatings.managerFit}% tactical fit and ${managerEraFit}% Era Fit with OFF ${manager.grades.offense}, DEF ${manager.grades.defense}, and ${substitutions.length} substitutions.`
      : "No tournament manager impact was applied.",
    opponentEraFit,
    substitutions,
    opponentSubstitutions,
    playerMinutes: fullSquad.map((player) => {
      const substitutionIn = substitutions.find(
        (substitution) => substitution.playerInId === player.id,
      );
      const substitutionOut = substitutions.find(
        (substitution) => substitution.playerOutId === player.id,
      );
      const finalMinute = afterExtraTime ? 120 : 90;
      const enteredAt = substitutionIn?.minute ?? null;
      const leftAt = substitutionOut?.minute ?? null;
      const started = lineup.some((starter) => starter.id === player.id);
      return {
        cardId: player.id,
        playerName: player.playerName,
        tournamentYear: player.tournamentYear,
        started,
        minutes: started
          ? leftAt ?? finalMinute
          : enteredAt === null
            ? 0
            : finalMinute - enteredAt,
        enteredAt,
        leftAt,
        goals: goalsByPlayer.get(player.id) ?? 0,
        assists: assistsByPlayer.get(player.id) ?? 0,
      };
    }),
    generatedAt: new Date(
      Date.UTC(2026, 0, 1) + (seed % 365) * 86_400_000,
    ).toISOString(),
  };
};
