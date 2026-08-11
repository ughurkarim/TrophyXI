import {
  controlCommentary,
  goalCommentary,
  openingCommentary,
} from "@/engine/commentary";
import { getFormation } from "@/data/formations";
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
  ManagerStyle,
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
  detailedPenaltyShootout?: boolean;
};

type MatchTeam = "user" | "opponent";
type ChanceType =
  | "central"
  | "through-ball"
  | "cutback"
  | "cross"
  | "transition"
  | "long-shot"
  | "set-piece";

type SimulationPlayer = {
  id: string;
  playerName: string;
  tournamentYear: number;
  primaryPosition: Position;
  eligiblePositions: Position[];
  assignedPosition: Position;
  overall: number;
  attributes: PlayerAttributes;
  archetype: string;
  modeledTags: string[];
  genericOpponent: boolean;
};

type TeamPhaseRatings = {
  attack: number;
  midfield: number;
  defense: number;
  goalkeeper: number;
  depth: number;
  chemistry: number;
  overall: number;
};

type TacticalProfile = {
  attack: number;
  control: number;
  defense: number;
  buildUp: number;
  pressing: number;
  transition: number;
  directness: number;
  width: number;
  defensiveStructure: number;
  chemistry: number;
  managerQuality: number;
  style: ManagerStyle;
};

type LiveSideState = {
  team: MatchTeam;
  name: string;
  starters: SimulationPlayer[];
  active: SimulationPlayer[];
  bench: SimulationPlayer[];
  ratings: TeamPhaseRatings;
  formation: Formation;
  manager?: ManagerTournamentCard;
  managerEraFit: number;
  tactics: TacticalProfile;
  fatigue: Map<string, number>;
  substitutions: SubstitutionRecord[];
  attemptedBenchSlots: Set<number>;
  score: number;
  possessionSequences: number;
  shots: number;
  shotsOnTarget: number;
  xg: number;
  yellowCards: number;
};

type RawEvent = Omit<MatchEvent, "id">;

type GoalRecord = {
  team: MatchTeam;
  minute: number;
  scorerId: string | null;
  assistId: string | null;
  event: RawEvent;
};

type MatchAccumulator = {
  events: RawEvent[];
  goals: GoalRecord[];
  goalsByPlayer: Map<string, number>;
  assistsByPlayer: Map<string, number>;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const average = (values: number[]) =>
  values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;

const normalize = (value: string) => value.trim().toLowerCase();

const positionGroup = (position: Position) => {
  if (position === "GK") return "goalkeeper";
  if (["LB", "LCB", "CB", "RCB", "RB", "LWB", "RWB"].includes(position)) {
    return "defense";
  }
  if (["DM", "CM", "LM", "RM"].includes(position)) return "midfield";
  if (["AM", "LW", "RW"].includes(position)) return "creator";
  return "attack";
};

const isWidePosition = (position: Position) =>
  ["LB", "RB", "LWB", "RWB", "LM", "RM", "LW", "RW"].includes(position);

const isCentralAttacker = (position: Position) =>
  ["AM", "CF", "ST"].includes(position);

const playerText = (player: SimulationPlayer) =>
  normalize([player.archetype, ...player.modeledTags].join(" "));

const roleBoost = (
  player: SimulationPlayer,
  role:
    | "creator"
    | "finisher"
    | "press-resistant"
    | "runner"
    | "ball-winner"
    | "target"
    | "wide"
    | "keeper-distribution",
) => {
  const text = playerText(player);
  switch (role) {
    case "creator":
      return /(creator|playmaker|vision|pass|orchestr|maker|technician)/.test(text)
        ? 1.18
        : 1;
    case "finisher":
      return /(finish|poacher|scorer|striker|box|predator|clinical)/.test(text)
        ? 1.2
        : 1;
    case "press-resistant":
      return /(press.?resistant|press resistant|retention|control|composure)/.test(
        text,
      )
        ? 1.15
        : 1;
    case "runner":
      return /(runner|pace|transition|carry|dribb|explosive|overlap)/.test(text)
        ? 1.14
        : 1;
    case "ball-winner":
      return /(ball.?winner|destroyer|tackle|screen|anchor|duel)/.test(text)
        ? 1.15
        : 1;
    case "target":
      return /(target|aerial|header|hold.?up|physical)/.test(text) ? 1.16 : 1;
    case "wide":
      return /(wide|wing|overlap|cross)/.test(text) ? 1.14 : 1;
    case "keeper-distribution":
      return /(sweeper|distribution|ball.?playing|keeper)/.test(text) ? 1.12 : 1;
  }
};

const fullAttributesForHistoricalPlayer = (
  overall: number,
  position: Position,
  ratings: HistoricalWorldCupTeam["ratings"],
): PlayerAttributes => {
  const group = positionGroup(position);
  const attackBase =
    group === "attack"
      ? overall + 6
      : group === "creator"
        ? overall + 2
        : group === "midfield"
          ? overall - 7
          : overall - 18;
  const creativityBase =
    group === "creator"
      ? overall + 5
      : group === "midfield"
        ? overall + 2
        : group === "attack"
          ? overall - 3
          : overall - 10;
  const defenseBase =
    group === "defense"
      ? overall + 5
      : group === "midfield"
        ? overall + 1
        : group === "creator"
          ? overall - 12
          : overall - 17;

  return {
    attack: clamp(attackBase * 0.68 + ratings.attack * 0.32, 35, 99),
    creativity: clamp(
      creativityBase * 0.68 + ratings.midfield * 0.32,
      35,
      99,
    ),
    control: clamp(
      overall * 0.58 +
        ratings.midfield * 0.3 +
        (group === "midfield" || group === "creator" ? 7 : 0),
      40,
      99,
    ),
    defense: clamp(defenseBase * 0.7 + ratings.defense * 0.3, 30, 99),
    physical: clamp(
      overall * 0.72 +
        ratings.defense * 0.14 +
        ratings.attack * 0.14 +
        (group === "defense" ? 3 : 0),
      45,
      99,
    ),
    goalkeeping:
      position === "GK"
        ? clamp(ratings.goalkeeper * 0.72 + overall * 0.28, 55, 99)
        : 12,
    clutch: clamp(overall + 2, 45, 99),
  };
};

const simulationPlayerForCard = (
  player: PlayerTournamentCard,
  assignedPosition: Position,
): SimulationPlayer => ({
  id: player.id,
  playerName: player.playerName,
  tournamentYear: player.tournamentYear,
  primaryPosition: player.primaryPosition,
  eligiblePositions: player.eligiblePositions,
  assignedPosition,
  overall: player.overall,
  attributes: { ...player.attributes },
  archetype: player.archetype,
  modeledTags: [...player.modeledTags],
  genericOpponent: false,
});

const historicalSimulationPlayer = (
  opponent: HistoricalWorldCupTeam,
  player: HistoricalWorldCupTeam["startingLineup"][number],
  index: number,
): SimulationPlayer => {
  const overall = player.rating ?? opponent.ratings.overall;
  return {
    id: `${opponent.id}:${player.sourcePlayerId ?? player.playerIdentityId}:${index}`,
    playerName: player.name,
    tournamentYear: opponent.tournamentYear ?? 2026,
    primaryPosition: player.position,
    eligiblePositions: compatibleHistoricalPositions(player.position),
    assignedPosition: player.position,
    overall,
    attributes: fullAttributesForHistoricalPlayer(
      overall,
      player.position,
      opponent.ratings,
    ),
    archetype: `${player.position} historical role`,
    modeledTags: [],
    genericOpponent: false,
  };
};

const genericOpponentLineup = (
  opponent: HistoricalWorldCupTeam,
  formation: Formation,
): SimulationPlayer[] =>
  formation.slots.map((slot, index) => {
    const phaseRating =
      slot.position === "GK"
        ? opponent.ratings.goalkeeper
        : positionGroup(slot.position) === "defense"
          ? opponent.ratings.defense
          : positionGroup(slot.position) === "midfield"
            ? opponent.ratings.midfield
            : opponent.ratings.attack;
    const overall = clamp(
      phaseRating * 0.76 + opponent.ratings.overall * 0.24,
      45,
      99,
    );
    return {
      id: `${opponent.id}:modeled:${slot.id}:${index}`,
      playerName: opponent.nationName,
      tournamentYear: opponent.tournamentYear ?? 2026,
      primaryPosition: slot.position,
      eligiblePositions: slot.accepts,
      assignedPosition: slot.position,
      overall,
      attributes: fullAttributesForHistoricalPlayer(
        overall,
        slot.position,
        opponent.ratings,
      ),
      archetype: `${slot.position} modeled international role`,
      modeledTags: [],
      genericOpponent: true,
    };
  });

type AllStarsSimulationSource = {
  id: string;
  playerName: string;
  tournamentYear: number;
  primaryPosition: Position;
  eligiblePositions: Position[];
  overall: number;
  attributes: Pick<PlayerAttributes, "attack" | "creativity" | "clutch"> &
    Partial<PlayerAttributes>;
  archetype?: string;
  modeledTags?: string[];
};

const normalizeAllStarsPlayer = (
  player: AllStarsSimulationSource,
  assignedPosition: Position,
): SimulationPlayer => ({
  id: player.id,
  playerName: player.playerName,
  tournamentYear: player.tournamentYear,
  primaryPosition: player.primaryPosition,
  eligiblePositions: player.eligiblePositions,
  assignedPosition,
  overall: player.overall,
  attributes: {
    attack: player.attributes.attack,
    creativity: player.attributes.creativity,
    control: player.attributes.control ?? player.overall,
    defense:
      player.attributes.defense ??
      (positionGroup(player.primaryPosition) === "defense"
        ? player.overall
        : clamp(player.overall - 10, 35, 99)),
    physical: player.attributes.physical ?? player.overall,
    goalkeeping:
      player.attributes.goalkeeping ??
      (player.primaryPosition === "GK" ? player.overall : 12),
    clutch: player.attributes.clutch,
  },
  archetype: player.archetype ?? `${player.primaryPosition} all-stars role`,
  modeledTags: player.modeledTags ? [...player.modeledTags] : [],
  genericOpponent: false,
});

const styleModifiers: Record<
  ManagerStyle,
  {
    buildUp: number;
    pressing: number;
    transition: number;
    directness: number;
    width: number;
    structure: number;
  }
> = {
  possession: {
    buildUp: 9,
    pressing: 2,
    transition: -3,
    directness: -12,
    width: 1,
    structure: 3,
  },
  pressing: {
    buildUp: 2,
    pressing: 12,
    transition: 7,
    directness: 1,
    width: 2,
    structure: 1,
  },
  counter: {
    buildUp: -4,
    pressing: -2,
    transition: 12,
    directness: 10,
    width: 3,
    structure: 6,
  },
  defensive: {
    buildUp: -5,
    pressing: -3,
    transition: 3,
    directness: 5,
    width: -4,
    structure: 12,
  },
  balanced: {
    buildUp: 1,
    pressing: 1,
    transition: 1,
    directness: 0,
    width: 0,
    structure: 2,
  },
  direct: {
    buildUp: -8,
    pressing: 1,
    transition: 8,
    directness: 14,
    width: 4,
    structure: 0,
  },
  fluid: {
    buildUp: 7,
    pressing: 4,
    transition: 5,
    directness: -2,
    width: 4,
    structure: -1,
  },
};

const historicalStyleFor = (opponent: HistoricalWorldCupTeam): ManagerStyle => {
  const text = normalize(
    `${opponent.tacticalProfile} ${opponent.championFact ?? ""}`,
  );
  if (/(possession|control|circulation|patient)/.test(text)) return "possession";
  if (/(press|pressure|compression|gegen)/.test(text)) return "pressing";
  if (/(counter|transition|break|vertical)/.test(text)) return "counter";
  if (/(defensive|compact|block|contain)/.test(text)) return "defensive";
  if (/(direct|aerial|long ball)/.test(text)) return "direct";
  if (/(fluid|rotation|interchange|total football)/.test(text)) return "fluid";
  return "balanced";
};

const tacticalProfileFor = ({
  active,
  ratings,
  formation,
  manager,
  style,
}: {
  active: SimulationPlayer[];
  ratings: TeamPhaseRatings;
  formation: Formation;
  manager?: ManagerTournamentCard;
  style: ManagerStyle;
}): TacticalProfile => {
  const outfield = active.filter((player) => player.assignedPosition !== "GK");
  const avgControl = average(outfield.map((player) => player.attributes.control));
  const avgCreativity = average(
    outfield.map((player) => player.attributes.creativity),
  );
  const avgPhysical = average(
    outfield.map((player) => player.attributes.physical),
  );
  const modifiers = styleModifiers[style];
  const managerProfile = manager?.eraFitProfile;
  const managerQuality = manager
    ? average([
        manager.gameManagement,
        manager.leadership,
        manager.grades.offense,
        manager.grades.defense,
      ])
    : ratings.overall;

  return {
    attack: ratings.attack,
    control: clamp(
      ratings.midfield * 0.52 +
        avgControl * 0.28 +
        avgCreativity * 0.12 +
        formation.tendencies.control * 0.08,
      40,
      99,
    ),
    defense: ratings.defense,
    buildUp: clamp(
      ratings.midfield * 0.34 +
        avgControl * 0.26 +
        avgCreativity * 0.18 +
        formation.tendencies.control * 0.12 +
        (managerProfile?.technicalDemand ?? managerQuality) * 0.1 +
        modifiers.buildUp,
      35,
      99,
    ),
    pressing: clamp(
      formation.pressingSuitability * 0.45 +
        avgPhysical * 0.2 +
        (managerProfile?.pressingIntensity ?? managerQuality) * 0.25 +
        ratings.midfield * 0.1 +
        modifiers.pressing,
      30,
      99,
    ),
    transition: clamp(
      ratings.attack * 0.28 +
        avgPhysical * 0.22 +
        avgControl * 0.12 +
        (managerProfile?.tempo ?? managerQuality) * 0.25 +
        formation.tendencies.attack * 0.13 +
        modifiers.transition,
      35,
      99,
    ),
    directness: clamp(
      52 +
        (formation.tendencies.attack - formation.tendencies.control) * 0.45 +
        modifiers.directness,
      25,
      92,
    ),
    width: clamp(formation.width + modifiers.width, 45, 99),
    defensiveStructure: clamp(
      ratings.defense * 0.52 +
        formation.tendencies.defense * 0.2 +
        (managerProfile?.defensiveStructure ?? managerQuality) * 0.2 +
        ratings.chemistry * 0.08 +
        modifiers.structure,
      35,
      99,
    ),
    chemistry: ratings.chemistry,
    managerQuality,
    style,
  };
};

const activeAverage = (
  side: LiveSideState,
  metric: keyof PlayerAttributes,
  minute: number,
) => {
  const values = side.active
    .filter((player) => player.assignedPosition !== "GK")
    .map((player) => effectiveAttribute(side, player, metric, minute));
  return average(values);
};

const fatigueFor = (
  side: LiveSideState,
  player: SimulationPlayer,
  minute: number,
) => {
  const tracked = side.fatigue.get(player.id) ?? 0;
  const minuteLoad = Math.max(0, minute - 1) / 90;
  const pressingLoad = Math.max(0, side.tactics.pressing - 72) * 0.035;
  const roleLoad =
    ["LW", "RW", "LWB", "RWB", "CM", "AM"].includes(player.assignedPosition)
      ? 1.4
      : 0.5;
  const resilience = (player.attributes.physical - 75) * 0.055;
  return clamp(
    tracked + minuteLoad * (9 + pressingLoad + roleLoad - resilience),
    0,
    32,
  );
};

const effectiveAttribute = (
  side: LiveSideState,
  player: SimulationPlayer,
  metric: keyof PlayerAttributes,
  minute: number,
) => {
  const fatigue = fatigueFor(side, player, minute);
  const fatiguePenalty =
    metric === "physical"
      ? fatigue * 0.26
      : metric === "control" || metric === "creativity"
        ? fatigue * 0.18
        : fatigue * 0.21;
  return clamp(player.attributes[metric] - fatiguePenalty, 25, 99);
};

const tacticalState = (
  side: LiveSideState,
  other: LiveSideState,
  minute: number,
) => {
  const trailing = side.score < other.score;
  const winning = side.score > other.score;
  const scoreMargin = Math.abs(side.score - other.score);
  const management = side.manager?.gameManagement ?? side.tactics.managerQuality;
  const managementScale = clamp(0.78 + (management - 75) * 0.008, 0.72, 1.18);

  let risk = 0;
  if (trailing) {
    // Chasing remains meaningful, but a team two or three goals down does not
    // become an all-out arcade press for the entire match.
    const desperation =
      minute >= 78
        ? Math.min(0.035, Math.max(0, scoreMargin - 1) * 0.012)
        : minute >= 60
          ? Math.min(0.02, Math.max(0, scoreMargin - 1) * 0.008)
          : 0;
    risk +=
      (minute >= 78 ? 0.17 : minute >= 60 ? 0.105 : 0.04) + desperation;
  } else if (winning) {
    // The larger the lead, the more naturally a strong side controls territory,
    // protects central space, and stops manufacturing needless high-risk attacks.
    const leadControl = Math.min(
      0.085,
      Math.max(0, scoreMargin - 1) * (minute >= 65 ? 0.035 : 0.028),
    );
    risk -= (minute >= 78 ? 0.12 : minute >= 65 ? 0.075 : 0.025) + leadControl;
  }

  return {
    risk: risk * managementScale,
    attack: clamp(side.tactics.attack + risk * 42, 35, 99),
    control: clamp(side.tactics.control + risk * 8, 35, 99),
    pressing: clamp(side.tactics.pressing + risk * 52, 25, 99),
    transition: clamp(side.tactics.transition + risk * 35, 30, 99),
    defensiveStructure: clamp(
      side.tactics.defensiveStructure - Math.max(0, risk) * 24 +
        Math.max(0, -risk) * 28,
      30,
      99,
    ),
    directness: clamp(side.tactics.directness + risk * 55, 20, 96),
  };
};

const createEvent = (
  event: Omit<MatchEvent, "id">,
  index: number,
): MatchEvent => ({ ...event, id: `${event.minute}-${event.type}-${index}` });

const addRawEvent = (
  accumulator: MatchAccumulator,
  event: RawEvent,
) => accumulator.events.push(event);

const displayPlayer = (
  player: SimulationPlayer | undefined,
  fallback: string,
) => {
  if (!player || player.genericOpponent) return fallback;
  return `${player.playerName} ${player.tournamentYear}`;
};

const chooseCreator = (
  side: LiveSideState,
  random: RandomSource,
  minute: number,
) => {
  const eligible = side.active.filter(
    (player) => player.assignedPosition !== "GK",
  );
  return weightedPick(
    eligible,
    (player) => {
      const group = positionGroup(player.assignedPosition);
      const positional =
        group === "creator"
          ? 1.35
          : group === "midfield"
            ? 1.2
            : group === "attack"
              ? 0.88
              : 0.48;
      return (
        Math.max(
          1,
          effectiveAttribute(side, player, "creativity", minute) * 0.62 +
            effectiveAttribute(side, player, "control", minute) * 0.38,
        ) *
        positional *
        roleBoost(player, "creator") *
        roleBoost(player, "press-resistant")
      );
    },
    random,
  );
};

const chooseShooter = (
  side: LiveSideState,
  random: RandomSource,
  minute: number,
  chanceType: ChanceType,
) => {
  const eligible = side.active.filter(
    (player) => player.assignedPosition !== "GK",
  );
  return weightedPick(
    eligible,
    (player) => {
      const group = positionGroup(player.assignedPosition);
      const positional =
        group === "attack"
          ? 1.55
          : group === "creator"
            ? 1.15
            : group === "midfield"
              ? chanceType === "long-shot"
                ? 0.82
                : 0.5
              : chanceType === "set-piece"
                ? 0.32
                : 0.18;
      const wide =
        chanceType === "cutback" || chanceType === "cross"
          ? isWidePosition(player.assignedPosition)
            ? 1.12
            : 1
          : 1;
      const target =
        chanceType === "cross" ? roleBoost(player, "target") : 1;
      return (
        Math.max(
          1,
          effectiveAttribute(side, player, "attack", minute) * 0.76 +
            effectiveAttribute(side, player, "clutch", minute) * 0.24,
        ) *
        positional *
        roleBoost(player, "finisher") *
        wide *
        target
      );
    },
    random,
  );
};

const chooseDefensiveReference = (
  side: LiveSideState,
  random: RandomSource,
  minute: number,
) => {
  const eligible = side.active.filter(
    (player) => player.assignedPosition !== "GK",
  );
  return weightedPick(
    eligible,
    (player) => {
      const group = positionGroup(player.assignedPosition);
      const positional =
        group === "defense"
          ? 1.45
          : group === "midfield"
            ? 1.05
            : 0.35;
      return (
        Math.max(
          1,
          effectiveAttribute(side, player, "defense", minute) * 0.72 +
            effectiveAttribute(side, player, "physical", minute) * 0.28,
        ) *
        positional *
        roleBoost(player, "ball-winner")
      );
    },
    random,
  );
};

const goalkeeperFor = (side: LiveSideState) =>
  side.active.find((player) => player.assignedPosition === "GK");

const goalkeeperRatingAt = (side: LiveSideState, minute: number) => {
  const goalkeeper = goalkeeperFor(side);
  if (!goalkeeper) return side.ratings.goalkeeper;
  return clamp(
    effectiveAttribute(side, goalkeeper, "goalkeeping", minute) * 0.82 +
      goalkeeper.overall * 0.08 +
      side.ratings.goalkeeper * 0.1,
    45,
    99,
  );
};

const possessionProbability = (
  side: LiveSideState,
  other: LiveSideState,
  minute: number,
) => {
  const state = tacticalState(side, other, minute);
  const otherState = tacticalState(other, side, minute);
  const sideControl =
    state.control * 0.42 +
    side.tactics.buildUp * 0.23 +
    activeAverage(side, "control", minute) * 0.17 +
    activeAverage(side, "creativity", minute) * 0.09 +
    side.tactics.chemistry * 0.09;
  const otherControl =
    otherState.control * 0.42 +
    other.tactics.buildUp * 0.23 +
    activeAverage(other, "control", minute) * 0.17 +
    activeAverage(other, "creativity", minute) * 0.09 +
    other.tactics.chemistry * 0.09;
  const overallEdge = clamp(
    side.ratings.overall - other.ratings.overall,
    -18,
    18,
  );

  // Phase ratings still drive possession, but the displayed team OVR now acts
  // as a modest stabilizer. A 10-point stronger side should not feel like a
  // coin flip when the underlying player/fit/chemistry model says it is better.
  return clamp(
    0.5 +
      (sideControl - otherControl) * 0.0062 +
      overallEdge * 0.0024,
    0.27,
    0.73,
  );
};

const chanceTypeFor = (
  side: LiveSideState,
  random: RandomSource,
  quickTransition: boolean,
): ChanceType => {
  if (quickTransition) return "transition";

  const directness = side.tactics.directness;
  const width = side.tactics.width;
  const roll = random();

  if (roll < 0.06) return "set-piece";
  if (directness >= 67 && roll < 0.31) return "transition";
  if (width >= 84 && roll < 0.42) return "cross";
  if (width >= 76 && roll < 0.57) return "cutback";
  if (side.tactics.buildUp >= 82 && roll < 0.68) return "through-ball";
  if (directness >= 72 && roll > 0.83) return "long-shot";
  if (side.tactics.buildUp >= 84 && roll < 0.78) return "through-ball";
  return roll > 0.86 ? "long-shot" : "central";
};

const chanceBaseXg: Record<ChanceType, number> = {
  central: 0.14,
  "through-ball": 0.205,
  cutback: 0.19,
  cross: 0.09,
  transition: 0.17,
  "long-shot": 0.045,
  "set-piece": 0.095,
};

const chanceDetail = (
  chanceType: ChanceType,
  creator: string,
  shooter: string,
) => {
  switch (chanceType) {
    case "through-ball":
      return `${creator} splits the line and releases ${shooter} through the middle.`;
    case "cutback":
      return `${creator} reaches the byline and cuts the ball back for ${shooter}.`;
    case "cross":
      return `${creator} finds delivery from wide and ${shooter} attacks the box.`;
    case "transition":
      return `${creator} turns the turnover into a fast break for ${shooter}.`;
    case "long-shot":
      return `${shooter} takes responsibility from distance after ${creator} recycles possession.`;
    case "set-piece":
      return `${creator} delivers the dead ball into a dangerous area for ${shooter}.`;
    case "central":
      return `${creator} works the ball into the inside channel for ${shooter}.`;
  }
};

const shotTitle = (
  chanceType: ChanceType,
  shooter: string,
  outcome: "saved" | "missed" | "blocked",
) => {
  const prefix =
    chanceType === "transition"
      ? "Transition chance"
      : chanceType === "set-piece"
        ? "Set-piece chance"
        : chanceType === "long-shot"
          ? "Shot from distance"
          : "Chance";
  return `${prefix} — ${shooter} ${outcome}`;
};

const maybeAddHighlight = (
  accumulator: MatchAccumulator,
  event: RawEvent,
  xg: number,
  random: RandomSource,
) => {
  if (xg >= 0.16 || random() < 0.13) addRawEvent(accumulator, event);
};

const addGoal = ({
  attacking,
  defending,
  minute,
  shooter,
  creator,
  chanceType,
  accumulator,
}: {
  attacking: LiveSideState;
  defending: LiveSideState;
  minute: number;
  shooter: SimulationPlayer;
  creator: SimulationPlayer;
  chanceType: ChanceType;
  accumulator: MatchAccumulator;
}) => {
  attacking.score += 1;
  const scorerLabel = displayPlayer(shooter, attacking.name);
  const creatorLabel =
    creator.id !== shooter.id
      ? displayPlayer(creator, attacking.name)
      : undefined;
  const event: RawEvent = {
    minute,
    minuteLabel: `${minute}’`,
    type: "goal",
    team: attacking.team,
    title: `GOAL — ${scorerLabel}`,
    detail: goalCommentary(
      scorerLabel,
      creatorLabel,
      attacking.team === "user" ? "user" : "opponent",
    ),
    userScore: 0,
    opponentScore: 0,
  };
  addRawEvent(accumulator, event);

  const scorerId = shooter.genericOpponent ? null : shooter.id;
  const assistId =
    creator.id !== shooter.id && !creator.genericOpponent ? creator.id : null;

  if (attacking.team === "user" && scorerId) {
    accumulator.goalsByPlayer.set(
      scorerId,
      (accumulator.goalsByPlayer.get(scorerId) ?? 0) + 1,
    );
    if (assistId) {
      accumulator.assistsByPlayer.set(
        assistId,
        (accumulator.assistsByPlayer.get(assistId) ?? 0) + 1,
      );
    }
  }

  accumulator.goals.push({
    team: attacking.team,
    minute,
    scorerId,
    assistId,
    event,
  });

  void defending;
  void chanceType;
};

const maybeAddYellow = (
  defending: LiveSideState,
  attacking: LiveSideState,
  minute: number,
  defender: SimulationPlayer,
  random: RandomSource,
  accumulator: MatchAccumulator,
  transitionDanger: number,
) => {
  if (defender.assignedPosition === "GK") return;
  const press = tacticalState(defending, attacking, minute).pressing;
  const physical = effectiveAttribute(defending, defender, "physical", minute);
  const foulChance = clamp(
    0.014 +
      Math.max(0, press - 76) * 0.0007 +
      transitionDanger * 0.012 -
      Math.max(0, physical - 84) * 0.0002,
    0.008,
    0.055,
  );
  if (random() >= foulChance) return;

  const yellowChance = clamp(
    0.38 + transitionDanger * 0.22 + Math.max(0, press - 86) * 0.008,
    0.34,
    0.78,
  );
  if (random() >= yellowChance || defending.yellowCards >= 5) return;

  defending.yellowCards += 1;
  addRawEvent(accumulator, {
    minute,
    minuteLabel: `${minute}’`,
    type: "yellow",
    team: defending.team,
    title: `Yellow card — ${displayPlayer(defender, defending.name)}`,
    detail:
      transitionDanger > 0.65
        ? "The counter is stopped before it can become a clear chance."
        : "The referee punishes an over-aggressive challenge.",
    userScore: 0,
    opponentScore: 0,
  });
};

const simulateAttack = ({
  attacking,
  defending,
  minute,
  random,
  accumulator,
  quickTransition = false,
  goalSuppressed = false,
}: {
  attacking: LiveSideState;
  defending: LiveSideState;
  minute: number;
  random: RandomSource;
  accumulator: MatchAccumulator;
  quickTransition?: boolean;
  goalSuppressed?: boolean;
}) => {
  const attackingState = tacticalState(attacking, defending, minute);
  const defendingState = tacticalState(defending, attacking, minute);
  const overallEdge = clamp(
    attacking.ratings.overall - defending.ratings.overall,
    -18,
    18,
  );
  const creator = chooseCreator(attacking, random, minute);
  const defender = chooseDefensiveReference(defending, random, minute);
  if (!creator || !defender) return { turnoverCounter: false };

  const creatorControl = effectiveAttribute(
    attacking,
    creator,
    "control",
    minute,
  );
  const creatorCreativity = effectiveAttribute(
    attacking,
    creator,
    "creativity",
    minute,
  );
  const defenderDefense = effectiveAttribute(
    defending,
    defender,
    "defense",
    minute,
  );
  const defenderPhysical = effectiveAttribute(
    defending,
    defender,
    "physical",
    minute,
  );

  const buildSkill =
    attacking.tactics.buildUp * 0.34 +
    creatorControl * 0.29 +
    creatorCreativity * 0.19 +
    attacking.tactics.chemistry * 0.1 +
    attackingState.control * 0.08;
  const pressResistance = roleBoost(creator, "press-resistant");
  const pressThreat =
    defendingState.pressing * 0.48 +
    defenderDefense * 0.3 +
    defenderPhysical * 0.12 +
    defending.tactics.chemistry * 0.1;

  const buildProbability = clamp(
    (quickTransition ? 0.78 : 0.7) +
      (buildSkill - pressThreat) * 0.0046 +
      (pressResistance - 1) * 0.22 +
      overallEdge * 0.0035,
    0.34,
    0.94,
  );

  if (random() >= buildProbability) {
    maybeAddYellow(
      defending,
      attacking,
      minute,
      defender,
      random,
      accumulator,
      quickTransition ? 0.75 : 0.35,
    );
    const counterProbability = clamp(
      0.12 +
        (defendingState.transition - attackingState.defensiveStructure) *
          0.0028 +
        Math.max(0, defending.tactics.directness - 60) * 0.0016,
      0.06,
      0.34,
    );
    return { turnoverCounter: random() < counterProbability };
  }

  const entrySkill =
    attackingState.control * 0.25 +
    attackingState.attack * 0.2 +
    creatorCreativity * 0.25 +
    creatorControl * 0.12 +
    attacking.tactics.width * 0.08 +
    attacking.tactics.chemistry * 0.1;
  const entryDefense =
    defendingState.defensiveStructure * 0.45 +
    defending.tactics.defense * 0.28 +
    defenderDefense * 0.2 +
    defending.tactics.chemistry * 0.07;
  const finalThirdProbability = clamp(
    (quickTransition ? 0.68 : 0.57) +
      (entrySkill - entryDefense) * 0.0044 +
      overallEdge * 0.004,
    0.24,
    0.88,
  );

  if (random() >= finalThirdProbability) {
    maybeAddYellow(
      defending,
      attacking,
      minute,
      defender,
      random,
      accumulator,
      quickTransition ? 0.7 : 0.45,
    );
    return { turnoverCounter: false };
  }

  const chanceType = chanceTypeFor(attacking, random, quickTransition);
  const shooter = chooseShooter(attacking, random, minute, chanceType);
  if (!shooter) return { turnoverCounter: false };

  const shotProbability = clamp(
    0.45 +
      (attackingState.attack - defendingState.defensiveStructure) * 0.0034 +
      overallEdge * 0.0025 +
      attackingState.risk * 0.4 +
      (chanceType === "long-shot" ? 0.14 : 0) +
      (quickTransition ? 0.07 : 0),
    0.2,
    0.8,
  );
  if (random() >= shotProbability) return { turnoverCounter: false };

  attacking.shots += 1;

  const shooterAttack = effectiveAttribute(
    attacking,
    shooter,
    "attack",
    minute,
  );
  const shooterControl = effectiveAttribute(
    attacking,
    shooter,
    "control",
    minute,
  );
  const shooterClutch = effectiveAttribute(
    attacking,
    shooter,
    "clutch",
    minute,
  );

  const creatorBonus = (creatorCreativity - 80) * 0.00115;
  const finishingSetup = (shooterAttack - 80) * 0.00135;
  const defensivePressure =
    (defenderDefense - 80) * 0.00115 +
    (defendingState.defensiveStructure - 80) * 0.00075;
  const tacticalBonus =
    chanceType === "through-ball" && attacking.tactics.buildUp >= 84
      ? 0.018
      : chanceType === "cross" && attacking.tactics.width >= 86
        ? 0.012
        : chanceType === "transition" && attackingState.transition >= 85
          ? 0.018
          : 0;

  const chanceXg = clamp(
    chanceBaseXg[chanceType] +
      creatorBonus +
      finishingSetup -
      defensivePressure +
      tacticalBonus +
      overallEdge * 0.0008 -
      fatigueFor(attacking, shooter, minute) * 0.0008,
    0.02,
    chanceType === "long-shot" ? 0.12 : 0.46,
  );
  attacking.xg += chanceXg;

  const onTargetProbability = clamp(
    0.31 +
      (shooterAttack - 75) * 0.0035 +
      (shooterControl - 75) * 0.0013 +
      chanceXg * 0.32 -
      Math.max(0, defenderDefense - 84) * 0.0012,
    0.22,
    0.7,
  );

  const keeperRating = goalkeeperRatingAt(defending, minute);
  const keeperFactor = clamp(
    1 - (keeperRating - 82) * 0.0082,
    0.82,
    1.18,
  );
  const finishingFactor = clamp(
    0.94 +
      (shooterAttack - 82) * 0.004 +
      (shooterClutch - 82) * 0.0016 +
      (roleBoost(shooter, "finisher") - 1) * 0.22,
    0.78,
    1.18,
  );

  const attackingLead = attacking.score - defending.score;
  const blowoutControl =
    attackingLead >= 4
      ? 0.62
      : attackingLead === 3
        ? 0.76
        : attackingLead === 2
          ? 0.9
          : 1;
  const lateGoalSaturation =
    attacking.score + defending.score >= 5 ? 0.94 : 1;

  const goalProbability = clamp(
    chanceXg *
      keeperFactor *
      finishingFactor *
      blowoutControl *
      lateGoalSaturation,
    0.006,
    0.58,
  );
  const goal =
    !goalSuppressed &&
    attacking.score < 6 &&
    random() < goalProbability;

  const shooterLabel = displayPlayer(shooter, attacking.name);
  const creatorLabel = displayPlayer(creator, attacking.name);

  if (goal) {
    attacking.shotsOnTarget += 1;
    addGoal({
      attacking,
      defending,
      minute,
      shooter,
      creator,
      chanceType,
      accumulator,
    });
    return { turnoverCounter: false };
  }

  const onTarget = random() < onTargetProbability;
  if (onTarget) attacking.shotsOnTarget += 1;

  const outcome: "saved" | "missed" | "blocked" = onTarget
    ? "saved"
    : defenderDefense >= 87 && random() < 0.32
      ? "blocked"
      : "missed";

  const keeperLabel = displayPlayer(goalkeeperFor(defending), defending.name);
  maybeAddHighlight(
    accumulator,
    {
      minute,
      minuteLabel: `${minute}’`,
      type: "commentary",
      team: attacking.team,
      title: shotTitle(chanceType, shooterLabel, outcome),
      detail:
        outcome === "saved"
          ? `${chanceDetail(chanceType, creatorLabel, shooterLabel)} ${keeperLabel} makes the save.`
          : chanceDetail(chanceType, creatorLabel, shooterLabel),
      userScore: 0,
      opponentScore: 0,
    },
    chanceXg,
    random,
  );

  return { turnoverCounter: false };
};

const updateFatigue = (
  side: LiveSideState,
  minute: number,
  wasInPossession: boolean,
) => {
  const state = tacticalState(side, side, minute);
  for (const player of side.active) {
    if (player.assignedPosition === "GK") continue;
    const roleLoad =
      ["LWB", "RWB", "LW", "RW", "CM", "AM"].includes(player.assignedPosition)
        ? 0.08
        : 0.04;
    const pressLoad = Math.max(0, state.pressing - 74) * 0.0016;
    const possessionLoad = wasInPossession ? 0.025 : 0.045;
    const physicalRelief = Math.max(0, player.attributes.physical - 82) * 0.0014;
    side.fatigue.set(
      player.id,
      clamp(
        (side.fatigue.get(player.id) ?? 0) +
          roleLoad +
          pressLoad +
          possessionLoad -
          physicalRelief,
        0,
        25,
      ),
    );
  }
};

const playablePositions = (player: SimulationPlayer) =>
  new Set<Position>([player.primaryPosition, ...player.eligiblePositions]);

const substitutionCandidate = (
  substitute: SimulationPlayer,
  side: LiveSideState,
  minute: number,
) => {
  if (substitute.primaryPosition === "GK") return undefined;
  const canPlay = playablePositions(substitute);
  const candidates = side.active.filter(
    (starter) =>
      starter.assignedPosition !== "GK" &&
      canPlay.has(starter.assignedPosition),
  );
  if (!candidates.length) return undefined;

  return [...candidates].sort((first, second) => {
    const firstFatigue = fatigueFor(side, first, minute);
    const secondFatigue = fatigueFor(side, second, minute);
    const firstNeed = firstFatigue * 1.4 + (100 - first.overall) * 0.38;
    const secondNeed = secondFatigue * 1.4 + (100 - second.overall) * 0.38;
    return secondNeed - firstNeed;
  })[0];
};

const makeSubstitution = (
  side: LiveSideState,
  other: LiveSideState,
  benchIndex: number,
  minute: number,
  accumulator: MatchAccumulator,
) => {
  const substitute = side.bench[benchIndex];
  if (!substitute) return false;
  const outgoing = substitutionCandidate(substitute, side, minute);
  if (!outgoing) return false;

  const trailing = side.score < other.score;
  const winning = side.score > other.score;
  const aggressive =
    trailing &&
    ["LW", "RW", "CF", "ST", "AM"].includes(substitute.primaryPosition);
  const protective =
    winning &&
    ["LB", "LCB", "CB", "RCB", "RB", "DM"].includes(
      substitute.primaryPosition,
    );
  const benchSlot = `bench-${benchIndex + 1}` as BenchSlotId;
  const managerInfluence = Math.round(
    (side.manager?.gameManagement ?? side.tactics.managerQuality) *
      (0.86 + side.managerEraFit * 0.0014),
  );

  const record: SubstitutionRecord = {
    minute,
    playerInId: substitute.id,
    playerOutId: outgoing.id,
    position: outgoing.assignedPosition,
    benchSlot,
    reason: aggressive
      ? "Attacking response while chasing the match"
      : protective
        ? "Defensive control to protect the score"
        : benchIndex === 0
          ? "Priority change to refresh the shape"
          : "Fatigue and tactical balance",
    managerInfluence,
  };

  side.substitutions.push(record);
  side.active = side.active.map((player) =>
    player.id === outgoing.id
      ? { ...substitute, assignedPosition: outgoing.assignedPosition }
      : player,
  );
  side.fatigue.set(substitute.id, 0);

  addRawEvent(accumulator, {
    minute,
    minuteLabel: `${minute}’`,
    type: "substitution",
    team: side.team,
    title: `${displayPlayer(substitute, side.name)} replaces ${displayPlayer(outgoing, side.name)}`,
    detail: `${record.reason}. New position: ${record.position}. ${record.benchSlot.replace("-", " ")} priority; ${side.manager?.managerName ?? side.name} influence ${record.managerInfluence}.`,
    userScore: 0,
    opponentScore: 0,
  });

  return true;
};

const maybeSubstitute = (
  side: LiveSideState,
  other: LiveSideState,
  minute: number,
  random: RandomSource,
  accumulator: MatchAccumulator,
  extraTime: boolean,
) => {
  const windows = extraTime ? [98, 106, 112] : [55, 68, 78];
  const useChance = extraTime ? [0.98, 0.9, 0.78] : [0.96, 0.84, 0.62];

  for (let index = 0; index < Math.min(3, side.bench.length); index += 1) {
    if (side.attemptedBenchSlots.has(index)) continue;
    if (minute < windows[index]) continue;

    const substitute = side.bench[index];
    const outgoing = substitutionCandidate(substitute, side, minute);

    // A goalkeeper or genuinely incompatible card does not block later bench slots.
    if (!outgoing) {
      side.attemptedBenchSlots.add(index);
      continue;
    }

    // Bench order is tactical priority. If an earlier playable bench slot was
    // skipped, later slots wait instead of leapfrogging it.
    const priorPlayableUnresolved = Array.from(
      { length: index },
      (_, prior) => prior,
    ).some((prior) => {
      if (side.attemptedBenchSlots.has(prior)) return false;
      const priorSub = side.bench[prior];
      return Boolean(priorSub && substitutionCandidate(priorSub, side, minute));
    });
    if (priorPlayableUnresolved) return;

    const trailing = side.score < other.score;
    const winning = side.score > other.score;
    const gameManagement =
      side.manager?.gameManagement ?? side.tactics.managerQuality;
    const scoreBoost = trailing ? 0.12 : winning ? 0.04 : 0;
    const managerBoost = (gameManagement - 78) * 0.004;
    const fatigueBoost =
      fatigueFor(side, outgoing, minute) >= 14 ? 0.08 : 0;

    if (
      random() <
      clamp(
        useChance[index] + scoreBoost + managerBoost + fatigueBoost,
        0.35,
        0.995,
      )
    ) {
      side.attemptedBenchSlots.add(index);
      makeSubstitution(side, other, index, minute, accumulator);
    }
    return;
  }
};

const maybeManagerEvent = (
  side: LiveSideState,
  other: LiveSideState,
  minute: number,
  accumulator: MatchAccumulator,
  emitted: Set<string>,
) => {
  if (!side.manager) return;
  const trailing = side.score < other.score;
  const winning = side.score > other.score;
  const key =
    minute >= 72 && trailing
      ? `${side.team}:chase`
      : minute >= 72 && winning
        ? `${side.team}:protect`
        : minute >= 25
          ? `${side.team}:shape`
          : "";
  if (!key || emitted.has(key)) return;
  emitted.add(key);

  const detail =
    key.endsWith("chase")
      ? `${side.manager.tacticalIdentity}. The block moves higher and more players attack the next phase.`
      : key.endsWith("protect")
        ? `${side.manager.tacticalIdentity}. The side shortens the pitch and protects central space.`
        : `${side.manager.tacticalIdentity}. The structure is adjusted without abandoning the game plan.`;

  addRawEvent(accumulator, {
    minute,
    minuteLabel: `${minute}’`,
    type: "manager",
    team: side.team,
    title: `${side.manager.managerName} adjusts the shape`,
    detail,
    userScore: 0,
    opponentScore: 0,
  });
};

const simulateMinute = ({
  minute,
  user,
  opponent,
  random,
  accumulator,
  managerEvents,
  extraTime,
  suppressGoals,
}: {
  minute: number;
  user: LiveSideState;
  opponent: LiveSideState;
  random: RandomSource;
  accumulator: MatchAccumulator;
  managerEvents: Set<string>;
  extraTime: boolean;
  suppressGoals: boolean;
}) => {
  maybeSubstitute(user, opponent, minute, random, accumulator, extraTime);
  maybeSubstitute(opponent, user, minute, random, accumulator, extraTime);
  maybeManagerEvent(user, opponent, minute, accumulator, managerEvents);
  maybeManagerEvent(opponent, user, minute, accumulator, managerEvents);

  const tempo =
    (user.tactics.transition +
      opponent.tactics.transition +
      user.tactics.directness +
      opponent.tactics.directness) /
    4;
  const scoreMargin = Math.abs(user.score - opponent.score);
  const totalGoals = user.score + opponent.score;
  const openGameControl =
    scoreMargin >= 3
      ? 0.38
      : scoreMargin === 2
        ? 0.58
        : totalGoals >= 4
          ? 0.76
          : 1;
  const secondSequenceChance =
    clamp((tempo - 58) / 125, 0.035, 0.24) * openGameControl;
  const sequenceCount = random() < secondSequenceChance ? 2 : 1;

  for (let sequence = 0; sequence < sequenceCount; sequence += 1) {
    const userPossessionChance = possessionProbability(user, opponent, minute);
    const attacking = random() < userPossessionChance ? user : opponent;
    const defending = attacking.team === "user" ? opponent : user;
    attacking.possessionSequences += 1;

    const attackResult = simulateAttack({
      attacking,
      defending,
      minute,
      random,
      accumulator,
      goalSuppressed: suppressGoals,
    });

    if (attackResult.turnoverCounter) {
      defending.possessionSequences += 1;
      simulateAttack({
        attacking: defending,
        defending: attacking,
        minute,
        random,
        accumulator,
        quickTransition: true,
        goalSuppressed: suppressGoals,
      });
    }

    updateFatigue(attacking, minute, true);
    updateFatigue(defending, minute, false);
  }
};

const removeGoalRecord = (
  accumulator: MatchAccumulator,
  record: GoalRecord,
) => {
  const eventIndex = accumulator.events.indexOf(record.event);
  if (eventIndex >= 0) accumulator.events.splice(eventIndex, 1);
  const goalIndex = accumulator.goals.indexOf(record);
  if (goalIndex >= 0) accumulator.goals.splice(goalIndex, 1);

  if (record.team === "user" && record.scorerId) {
    const goals = accumulator.goalsByPlayer.get(record.scorerId) ?? 0;
    if (goals <= 1) accumulator.goalsByPlayer.delete(record.scorerId);
    else accumulator.goalsByPlayer.set(record.scorerId, goals - 1);
    if (record.assistId) {
      const assists = accumulator.assistsByPlayer.get(record.assistId) ?? 0;
      if (assists <= 1) accumulator.assistsByPlayer.delete(record.assistId);
      else accumulator.assistsByPlayer.set(record.assistId, assists - 1);
    }
  }
};

const forceRegularTimeTie = (
  user: LiveSideState,
  opponent: LiveSideState,
  accumulator: MatchAccumulator,
) => {
  if (user.score === opponent.score) return;
  const leader = user.score > opponent.score ? user : opponent;
  const trailer = leader.team === "user" ? opponent : user;
  const removeCount = leader.score - trailer.score;
  const removable = accumulator.goals
    .filter((goal) => goal.team === leader.team && goal.minute <= 90)
    .slice(-removeCount);
  for (const record of removable) {
    removeGoalRecord(accumulator, record);
    leader.score -= 1;
  }
};

const resolvePenalties = (
  user: LiveSideState,
  opponent: LiveSideState,
  random: RandomSource,
) => {
  const orderedTakers = (side: LiveSideState) =>
    side.active
      .filter((player) => player.assignedPosition !== "GK")
      .sort(
        (first, second) =>
          second.attributes.clutch * 0.5 +
            second.attributes.control * 0.3 +
            second.attributes.attack * 0.2 -
            (first.attributes.clutch * 0.5 +
              first.attributes.control * 0.3 +
              first.attributes.attack * 0.2) ||
          second.overall - first.overall ||
          first.id.localeCompare(second.id),
      );

  const userTakers = orderedTakers(user);
  const opponentTakers = orderedTakers(opponent);
  const userKeeper = goalkeeperRatingAt(user, 120);
  const opponentKeeper = goalkeeperRatingAt(opponent, 120);

  let userPens = 0;
  let opponentPens = 0;
  let order = 0;
  const kicks: NonNullable<MatchResult["score"]["penaltyShootout"]> = [];

  const takeKick = (
    side: MatchTeam,
    player: SimulationPlayer,
    suddenDeath: boolean,
  ) => {
    const keeper = side === "user" ? opponentKeeper : userKeeper;
    const chance = clamp(
      0.73 +
        (player.attributes.clutch - 80) * 0.0022 +
        (player.attributes.control - 80) * 0.0011 +
        (player.attributes.attack - 80) * 0.0007 -
        (keeper - 82) * 0.0018,
      0.62,
      0.88,
    );
    const scored = random() < chance;

    if (side === "user" && scored) userPens += 1;
    if (side === "opponent" && scored) opponentPens += 1;

    order += 1;
    kicks.push({
      order,
      team: side,
      playerId: player.id,
      playerName: player.playerName,
      tournamentYear: player.tournamentYear,
      scored,
      suddenDeath,
      userPenalties: userPens,
      opponentPenalties: opponentPens,
    });
  };

  for (let round = 0; round < 5; round += 1) {
    takeKick("user", userTakers[round % userTakers.length], false);

    const opponentKicksRemaining = 5 - round;
    if (userPens > opponentPens + opponentKicksRemaining) break;

    takeKick("opponent", opponentTakers[round % opponentTakers.length], false);

    const userKicksRemaining = 4 - round;
    if (opponentPens > userPens + userKicksRemaining) break;
  }

  let suddenDeathRound = 0;
  while (userPens === opponentPens && suddenDeathRound < 12) {
    const takerIndex = (5 + suddenDeathRound) % userTakers.length;
    takeKick("user", userTakers[takerIndex], true);
    const userScored = kicks.at(-1)!.scored;

    const opponentTakerIndex = (5 + suddenDeathRound) % opponentTakers.length;
    takeKick("opponent", opponentTakers[opponentTakerIndex], true);
    const opponentScored = kicks.at(-1)!.scored;

    if (userScored !== opponentScored) break;
    suddenDeathRound += 1;
  }

  if (userPens === opponentPens) {
    // An ultra-rare deterministic fallback still resolves as a proper paired
    // sudden-death round, so both takers are shown to the user.
    const userWinsFallback = random() < 0.5;
    const userPlayer =
      userTakers[(5 + suddenDeathRound) % userTakers.length];
    const opponentPlayer =
      opponentTakers[(5 + suddenDeathRound) % opponentTakers.length];

    order += 1;
    if (userWinsFallback) userPens += 1;
    kicks.push({
      order,
      team: "user",
      playerId: userPlayer.id,
      playerName: userPlayer.playerName,
      tournamentYear: userPlayer.tournamentYear,
      scored: userWinsFallback,
      suddenDeath: true,
      userPenalties: userPens,
      opponentPenalties: opponentPens,
    });

    order += 1;
    if (!userWinsFallback) opponentPens += 1;
    kicks.push({
      order,
      team: "opponent",
      playerId: opponentPlayer.id,
      playerName: opponentPlayer.playerName,
      tournamentYear: opponentPlayer.tournamentYear,
      scored: !userWinsFallback,
      suddenDeath: true,
      userPenalties: userPens,
      opponentPenalties: opponentPens,
    });
  }

  return {
    score: [userPens, opponentPens] as [number, number],
    kicks,
  };
};

const liveSideForUser = ({
  lineup,
  bench,
  picks,
  formation,
  manager,
  ratings,
  managerEraFit,
}: {
  lineup: PlayerTournamentCard[];
  bench: PlayerTournamentCard[];
  picks?: DraftPick[];
  formation: Formation;
  manager?: ManagerTournamentCard;
  ratings: ReturnType<typeof calculateTeamRatings>;
  managerEraFit: number;
}): LiveSideState => {
  const starters = lineup.map((player, index) => {
    const pick = picks?.find((candidate) => candidate.cardId === player.id);
    const assignedSlot = pick
      ? formation.slots.find((slot) => slot.id === pick.slotId)
      : formation.slots[index];
    return simulationPlayerForCard(
      player,
      assignedSlot?.position ?? player.primaryPosition,
    );
  });
  const simulationBench = bench.map((player) =>
    simulationPlayerForCard(player, player.primaryPosition),
  );
  const phaseRatings: TeamPhaseRatings = {
    attack: ratings.attack,
    midfield: ratings.midfield,
    defense: ratings.defense,
    goalkeeper:
      lineup.find((player) => player.primaryPosition === "GK")?.attributes
        .goalkeeping ?? ratings.defense,
    depth: ratings.benchDepth ?? 75,
    chemistry: ratings.chemistry,
    overall: ratings.overall,
  };
  const style = manager?.style ?? "balanced";
  const tactics = tacticalProfileFor({
    active: starters,
    ratings: phaseRatings,
    formation,
    manager,
    style,
  });

  return {
    team: "user",
    name: "Trophy XI",
    starters,
    active: [...starters],
    bench: simulationBench,
    ratings: phaseRatings,
    formation,
    manager,
    managerEraFit,
    tactics,
    fatigue: new Map(),
    substitutions: [],
    attemptedBenchSlots: new Set(),
    score: 0,
    possessionSequences: 0,
    shots: 0,
    shotsOnTarget: 0,
    xg: 0,
    yellowCards: 0,
  };
};

const liveSideForOpponent = ({
  opponent,
  eraId,
  opponentEraFit,
}: {
  opponent: HistoricalWorldCupTeam;
  eraId: DraftEraId;
  opponentEraFit: number;
}): LiveSideState => {
  const allStarsRatings =
    opponent.kind === "all-stars"
      ? calculateWorldCupAllStarsRatings(eraId, opponent)
      : null;
  const phaseRatings: TeamPhaseRatings = allStarsRatings
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
        // Cohesion remains a strength of national teams, but a 76 OVR side no
        // longer receives the same elite 86 chemistry as a genuine contender.
        chemistry: clamp(
          78 +
            (opponent.ratings.overall - 75) * 0.32 +
            (opponent.ratings.midfield - 75) * 0.12 +
            (opponent.ratings.depth - 75) * 0.08,
          77,
          91,
        ),
        overall: opponent.ratings.overall,
      };

  const formation = getFormation(opponent.formation);
  const manager = opponent.allStars?.manager;
  const managerEraFit =
    manager && eraId !== "all"
      ? calculateManagerEraFit(manager, eraId).score
      : opponentEraFit;

  let starters: SimulationPlayer[];
  let bench: SimulationPlayer[];

  if (opponent.kind === "all-stars") {
    starters = getWorldCupAllStarsLineup(opponent).map((player, index) =>
      normalizeAllStarsPlayer(
        player,
        formation.slots[index]?.position ?? player.primaryPosition,
      ),
    );
    bench = getWorldCupAllStarsBench(opponent).map((player) =>
      normalizeAllStarsPlayer(player, player.primaryPosition),
    );
  } else if (opponent.startingLineup.length) {
    starters = opponent.startingLineup.map((player, index) => {
      const simulated = historicalSimulationPlayer(opponent, player, index);
      const slot = formation.slots[index];
      return {
        ...simulated,
        assignedPosition: slot?.position ?? player.position,
      };
    });
    bench = opponent.substitutes.map((player, index) =>
      historicalSimulationPlayer(
        opponent,
        player,
        opponent.startingLineup.length + index,
      ),
    );
  } else {
    starters = genericOpponentLineup(opponent, formation);
    bench = [];
  }

  const style = manager?.style ?? historicalStyleFor(opponent);
  const tactics = tacticalProfileFor({
    active: starters,
    ratings: phaseRatings,
    formation,
    manager,
    style,
  });

  return {
    team: "opponent",
    name: `${opponent.nationName}${opponent.tournamentYear ? ` ${opponent.tournamentYear}` : ""}`,
    starters,
    active: [...starters],
    bench,
    ratings: phaseRatings,
    formation,
    manager,
    managerEraFit,
    tactics,
    fatigue: new Map(),
    substitutions: [],
    attemptedBenchSlots: new Set(),
    score: 0,
    possessionSequences: 0,
    shots: 0,
    shotsOnTarget: 0,
    xg: 0,
    yellowCards: 0,
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
  detailedPenaltyShootout = false,
}: SimulationInput): MatchResult => {
  if (lineup.length !== 11) throw new Error("A complete eleven is required");
  if (bench.length !== 3) {
    throw new Error("Three ordered substitutes are required");
  }
  const userIdentityIds = [...lineup, ...bench].map(
    (player) => player.playerIdentityId,
  );
  if (new Set(userIdentityIds).size !== 14) {
    throw new Error("The complete squad must contain fourteen unique identities");
  }

  const random = createSeededRandom(seed);
  const userRatings = calculateTeamRatings(lineup, formation, {
    picks,
    manager,
    eraId,
    bench,
  });
  const opponentEraFit = calculateOpponentEraFit(opponent, eraId);
  const eraFitApplies = eraId !== "all";
  const managerEraFit =
    manager && eraFitApplies
      ? calculateManagerEraFit(manager, eraId).score
      : 0;

  const user = liveSideForUser({
    lineup,
    bench,
    picks,
    formation,
    manager,
    ratings: userRatings,
    managerEraFit,
  });
  const opponentSide = liveSideForOpponent({
    opponent,
    eraId,
    opponentEraFit,
  });

  const accumulator: MatchAccumulator = {
    events: [],
    goals: [],
    goalsByPlayer: new Map(),
    assistsByPlayer: new Map(),
  };
  const managerEvents = new Set<string>();

  addRawEvent(accumulator, {
    minute: 0,
    minuteLabel: "KO",
    type: "kickoff",
    team: "neutral",
    title: "Kickoff",
    detail: openingCommentary(random),
    userScore: 0,
    opponentScore: 0,
  });

  // A match now emerges from ninety seeded possession phases. Chance creation,
  // shots, saves, goals, discipline, fatigue and substitutions are consequences
  // of those phases rather than decorations added after an aggregate score roll.
  for (let minute = 1; minute <= 45; minute += 1) {
    simulateMinute({
      minute,
      user,
      opponent: opponentSide,
      random,
      accumulator,
      managerEvents,
      extraTime: false,
      suppressGoals: false,
    });
  }

  addRawEvent(accumulator, {
    minute: 45,
    minuteLabel: "HT",
    type: "halftime",
    team: "neutral",
    title: "Half-time",
    detail:
      user.possessionSequences >= opponentSide.possessionSequences
        ? controlCommentary("user", random)
        : controlCommentary("opponent", random),
    userScore: 0,
    opponentScore: 0,
  });

  for (let minute = 46; minute <= 90; minute += 1) {
    simulateMinute({
      minute,
      user,
      opponent: opponentSide,
      random,
      accumulator,
      managerEvents,
      extraTime: false,
      suppressGoals: false,
    });
  }

  if (knockoutMode !== "normal") {
    forceRegularTimeTie(user, opponentSide, accumulator);
  }

  let afterExtraTime = false;
  let penalties: [number, number] | undefined;
  let penaltyShootout: MatchResult["score"]["penaltyShootout"];

  if (user.score === opponentSide.score && competitionStage === "knockout") {
    afterExtraTime = true;
    addRawEvent(accumulator, {
      minute: 90,
      minuteLabel: "ET",
      type: "extra-time",
      team: "neutral",
      title: "Extra time",
      detail:
        "Ninety minutes cannot separate the teams. Fatigue now changes every decision.",
      userScore: 0,
      opponentScore: 0,
    });

    for (let minute = 91; minute <= 120; minute += 1) {
      simulateMinute({
        minute,
        user,
        opponent: opponentSide,
        random,
        accumulator,
        managerEvents,
        extraTime: true,
        suppressGoals: knockoutMode === "force-penalties",
      });
    }

    if (knockoutMode === "force-penalties") {
      // The special test/debug mode guarantees an extra-time tie while still
      // allowing the possession engine to generate shots and saves.
      if (user.score !== opponentSide.score) {
        const leader = user.score > opponentSide.score ? user : opponentSide;
        const trailer = leader.team === "user" ? opponentSide : user;
        const difference = leader.score - trailer.score;
        const removable = accumulator.goals
          .filter((goal) => goal.team === leader.team && goal.minute > 90)
          .slice(-difference);
        for (const record of removable) {
          removeGoalRecord(accumulator, record);
          leader.score -= 1;
        }
      }
    }

    if (user.score === opponentSide.score) {
      const shootout = resolvePenalties(user, opponentSide, random);
      penalties = shootout.score;
      penaltyShootout = shootout.kicks;

      if (detailedPenaltyShootout) {
        for (const kick of shootout.kicks) {
          addRawEvent(accumulator, {
            minute: 121,
            minuteLabel: `PEN ${kick.order}`,
            type: "penalties",
            team: kick.team,
            title: `${kick.playerName} — ${kick.scored ? "GOAL" : "MISS"}`,
            detail: `${kick.playerName} steps to the penalty spot. ${
              kick.scored ? "GOAL." : "MISS."
            } Shootout: ${kick.userPenalties}–${kick.opponentPenalties}.${
              kick.suddenDeath ? " Sudden death." : ""
            }`,
            userScore: user.score,
            opponentScore: opponentSide.score,
          });
        }
      }

      addRawEvent(accumulator, {
        minute: 121,
        minuteLabel: "PEN",
        type: "penalties",
        team: penalties[0] > penalties[1] ? "user" : "opponent",
        title: `Penalty shootout ${penalties[0]}–${penalties[1]}`,
        detail:
          penalties[0] > penalties[1]
            ? "Trophy XI hold their nerve from the spot."
            : `${opponent.nationName} survive the shootout under impossible pressure.`,
        userScore: user.score,
        opponentScore: opponentSide.score,
      });
    }
  }

  addRawEvent(accumulator, {
    minute: afterExtraTime ? 122 : 90,
    minuteLabel: "FT",
    type: "fulltime",
    team: "neutral",
    title: "Full-time",
    detail: "History has its answer.",
    userScore: user.score,
    opponentScore: opponentSide.score,
  });

  // Stable order keeps same-minute goals/substitutions deterministic.
  accumulator.events.sort((first, second) => first.minute - second.minute);

  let runningUserScore = 0;
  let runningOpponentScore = 0;
  const events = accumulator.events.map((event, index) => {
    if (event.type === "goal" && event.team === "user") runningUserScore += 1;
    if (event.type === "goal" && event.team === "opponent") {
      runningOpponentScore += 1;
    }
    return createEvent(
      {
        ...event,
        minuteLabel: event.minuteLabel || `${event.minute}’`,
        userScore: event.type === "penalties" ? user.score : runningUserScore,
        opponentScore:
          event.type === "penalties" ? opponentSide.score : runningOpponentScore,
      },
      index,
    );
  });

  const totalSequences =
    user.possessionSequences + opponentSide.possessionSequences;
  const userPossession = totalSequences
    ? Math.round((user.possessionSequences / totalSequences) * 100)
    : 50;
  const opponentPossession = 100 - userPossession;

  const fullSquad = [...lineup, ...bench];
  const userPotm = weightedPick(
    fullSquad,
    (player) =>
      player.overall +
      player.attributes.clutch * 0.25 +
      (accumulator.goalsByPlayer.get(player.id) ?? 0) * 22 +
      (accumulator.assistsByPlayer.get(player.id) ?? 0) * 9,
    random,
  );
  const userWon =
    user.score > opponentSide.score ||
    Boolean(
      user.score === opponentSide.score &&
        penalties &&
        penalties[0] > penalties[1],
    );

  const opponentManagerEraFit = opponentSide.managerEraFit;
  const managerEffectiveness = managerEraEffectiveness(manager, eraId);

  return {
    seed,
    opponentId: opponent.id,
    score: {
      user: user.score,
      opponent: opponentSide.score,
      afterExtraTime,
      ...(penalties ? { penalties } : {}),
      ...(penaltyShootout ? { penaltyShootout } : {}),
    },
    stats: {
      possession: [userPossession, opponentPossession],
      shots: [user.shots, opponentSide.shots],
      shotsOnTarget: [user.shotsOnTarget, opponentSide.shotsOnTarget],
      expectedGoals: [
        Number(user.xg.toFixed(2)),
        Number(opponentSide.xg.toFixed(2)),
      ],
      yellowCards: [user.yellowCards, opponentSide.yellowCards],
      tacticalImpact: [
        eraFitApplies
          ? Math.round((userRatings.managerFit + managerEraFit) / 2)
          : userRatings.managerFit,
        eraFitApplies
          ? opponentManagerEraFit
          : opponentSide.ratings.chemistry,
      ],
    },
    events,
    playerOfTheMatch:
      userWon && user.score > 0
        ? `${userPotm.playerName} ${userPotm.tournamentYear}`
        : `${opponent.nationName} ${opponent.tournamentYear}`,
    userRatings,
    managerImpact: manager
      ? eraFitApplies
        ? `${manager.managerName} delivered ${userRatings.managerFit}% tactical fit and ${managerEraFit}% Era Fit with OFF ${manager.grades.offense}, DEF ${manager.grades.defense}, and ${user.substitutions.length} substitutions.`
        : `${manager.managerName} delivered ${userRatings.managerFit}% formation fit with OFF ${manager.grades.offense}, DEF ${manager.grades.defense}, and ${user.substitutions.length} substitutions. Neutral era applied no era modifier.`
      : "No tournament manager impact was applied.",
    opponentEraFit,
    substitutions: user.substitutions,
    opponentSubstitutions: opponentSide.substitutions,
    playerMinutes: fullSquad.map((player) => {
      const substitutionIn = user.substitutions.find(
        (substitution) => substitution.playerInId === player.id,
      );
      const substitutionOut = user.substitutions.find(
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
        goals: accumulator.goalsByPlayer.get(player.id) ?? 0,
        assists: accumulator.assistsByPlayer.get(player.id) ?? 0,
      };
    }),
    generatedAt: new Date(
      Date.UTC(2026, 0, 1) + (seed % 365) * 86_400_000,
    ).toISOString(),
  };
};