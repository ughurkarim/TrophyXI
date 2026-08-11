import { formations } from "@/data/formations";
import { calculateManagerEraFit } from "@/engine/manager-era-fit";
import { createSeededRandom, hashString, shuffle } from "@/engine/random";
import type {
  BenchPick,
  DraftEraId,
  DraftPick,
  Formation,
  FormationId,
  FormationSlot,
  ManagerTournamentCard,
  PlayerTournamentCard,
  Position,
  PositionFitPreview,
  PositionFitState,
  PlayerStatusTier,
} from "@/types/game";

const strongPositionFamilies: Position[][] = [
  ["CB", "LCB", "RCB"],
  ["LB", "LWB"],
  ["RB", "RWB"],
  ["DM", "CM"],
  ["AM", "CF"],
  ["LM", "LW"],
  ["RM", "RW"],
  ["ST", "CF"],
];

const defensivePositions: Position[] = [
  "LB",
  "LCB",
  "CB",
  "RCB",
  "RB",
  "LWB",
  "RWB",
];
const midfieldPositions: Position[] = ["DM", "CM", "AM", "LM", "RM"];
const shareStrongFamily = (first: Position, second: Position) =>
  strongPositionFamilies.some(
    (family) => family.includes(first) && family.includes(second),
  );

const tacticalFamilyForPosition = (position: Position) => {
  if (position === "GK") return "goalkeeper";
  if (defensivePositions.includes(position)) return "defensive";
  if (midfieldPositions.includes(position)) return "midfield";
  return "attacking";
};

const positionBand = (position: Position) => {
  if (position === "GK") return -1;
  if (defensivePositions.includes(position)) return 0;
  if (midfieldPositions.includes(position)) return 1;
  return 2;
};

export const starterTierWeights: Record<PlayerStatusTier, number> = {
  legend: 0.045,
  icon: 0.105,
  elite: 0.275,
  standout: 0.295,
  reliable: 0.19,
  "role-player": 0.07,
  limited: 0.02,
};

export const benchTierWeights: Record<PlayerStatusTier, number> = {
  legend: 0.02,
  icon: 0.06,
  elite: 0.15,
  standout: 0.28,
  reliable: 0.29,
  "role-player": 0.16,
  limited: 0.04,
};

const weightedTier = (
  random: ReturnType<typeof createSeededRandom>,
  weights: Record<PlayerStatusTier, number>,
) => {
  const roll = random();
  let cumulative = 0;
  for (const tier of Object.keys(weights) as PlayerStatusTier[]) {
    cumulative += weights[tier];
    if (roll <= cumulative) return tier;
  }
  return "reliable";
};

const weightedChoice = <T>(
  items: T[],
  random: ReturnType<typeof createSeededRandom>,
  weightFor: (item: T) => number,
): T | undefined => {
  if (items.length === 0) return undefined;
  const weights = items.map((item) => Math.max(0.0001, weightFor(item)));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = random() * total;
  for (let index = 0; index < items.length; index += 1) {
    roll -= weights[index];
    if (roll <= 0) return items[index];
  }
  return items.at(-1);
};

/**
 * Position Fit is deterministic and intentionally broad for outfield players.
 * Goalkeepers never cross the outfield boundary. Exact, related, declared,
 * accepted, same-line, adjacent-line, and distant-line fits descend monotonically.
 */
export const getPositionFit = (
  player: PlayerTournamentCard,
  slot: FormationSlot,
) => {
  const playerPosition =
  player.primaryPosition === "LCB" || player.primaryPosition === "RCB"
    ? "CB"
    : player.primaryPosition === "CF"
      ? "ST"
      : player.primaryPosition;

const slotPosition =
  slot.position === "LCB" || slot.position === "RCB"
    ? "CB"
    : slot.position === "CF"
      ? "ST"
      : slot.position;
  if (player.primaryPosition === "GK" || slot.position === "GK") {
    return player.primaryPosition === "GK" && slot.position === "GK" ? 100 : 0;
  }
  if (playerPosition === slotPosition) return 100;
  if (shareStrongFamily(playerPosition, slotPosition)) return 94;
  if (player.eligiblePositions.includes(slot.position)) return 88;
  if (slot.accepts.includes(player.primaryPosition)) return 80;
  if (
    player.eligiblePositions.some((position) => slot.accepts.includes(position))
  ) {
    return 72;
  }
  const primaryBand = positionBand(player.primaryPosition);
  const slotBand = positionBand(slot.position);
  if (primaryBand === slotBand) return 64;
  if (Math.abs(primaryBand - slotBand) === 1) return 56;
  return 48;
};

export const getPositionFitState = (fit: number): PositionFitState => {
  if (fit < 45) return "incompatible";
  if (fit >= 90) return "green";
  if (fit >= 70) return "yellow";
  return "red";
};

export const getPositionFitLabel = (fit: number) => {
  if (fit < 45) return "Incompatible";
  if (fit === 100) return "Perfect Fit";
  if (fit >= 90) return "Strong Fit";
  if (fit >= 84) return "Adaptable";
  if (fit >= 70) return "Mediocre Fit";
  if (fit >= 55) return "Awkward Fit";
  return "Bad Fit";
};

/**
 * The displayed and simulated placement penalty is one capped piecewise formula:
 * 90–100 fit => 0–3%, 70–89 => 4–11%, 45–69 => 12–25%.
 */
export const getPlacementPenaltyPercent = (fit: number) => {
  if (fit < 45) return 25;
  if (fit >= 90) return Math.round(((100 - fit) / 10) * 3);
  if (fit >= 70) return 4 + Math.round(((89 - fit) / 19) * 7);
  return 12 + Math.round(((69 - fit) / 24) * 13);
};

export const getPositionFitPreview = (
  player: PlayerTournamentCard,
  slot: FormationSlot,
  canPlace = true,
): PositionFitPreview => {
  const fit = getPositionFit(player, slot);
  const state = getPositionFitState(fit);
  return {
    slotId: slot.id,
    fit,
    state,
    label: getPositionFitLabel(fit),
    penaltyPercent: getPlacementPenaltyPercent(fit),
    canPlace: state !== "incompatible" && canPlace,
    feasibilityBlocked: state !== "incompatible" && !canPlace,
  };
};

export const isEligibleForSlot = (
  player: PlayerTournamentCard,
  slot: FormationSlot,
) => getPositionFit(player, slot) >= 45;

export type DraftOfferTheme =
  | "balanced"
  | "star-moment"
  | "position-rescue"
  | "chemistry-temptation"
  | "versatile-depth"
  | "specialist-gamble"
  | "chaos";

export type DraftGenerationRules = {
  excludedIdentityIds?: Iterable<string>;
  rejectedIdentityIds?: Iterable<string>;
  seenIdentityCounts?: Readonly<Record<string, number>>;
  recentIdentityIds?: Iterable<string>;
  seenCardCounts?: Readonly<Record<string, number>>;
  recentCardIds?: Iterable<string>;
  respinIndex?: number;
  manager?: ManagerTournamentCard;
  eraId?: DraftEraId;
  formation?: Formation;
};

const playerCardByIdCache = new WeakMap<
  PlayerTournamentCard[],
  Map<string, PlayerTournamentCard>
>();

const playerCardByIdFor = (cards: PlayerTournamentCard[]) => {
  const cached = playerCardByIdCache.get(cards);
  if (cached) return cached;
  const byId = new Map(cards.map((card) => [card.id, card]));
  playerCardByIdCache.set(cards, byId);
  return byId;
};

const usedIdentityIdsFor = (
  cards: PlayerTournamentCard[],
  picks: Array<DraftPick | BenchPick>,
) => {
  const byId = playerCardByIdFor(cards);
  return new Set(
    picks
      .map((pick) => byId.get(pick.cardId)?.playerIdentityId)
      .filter((id): id is string => Boolean(id)),
  );
};

const uniqueIdentityCards = (
  cards: PlayerTournamentCard[],
  random: ReturnType<typeof createSeededRandom>,
  rules: Pick<DraftGenerationRules, "seenCardCounts" | "recentCardIds"> = {},
) => {
  const grouped = new Map<string, PlayerTournamentCard[]>();
  const recentCards = new Set(rules.recentCardIds ?? []);
  const seenCardCount = (cardId: string) => rules.seenCardCounts?.[cardId] ?? 0;
  for (const card of cards) {
    const group = grouped.get(card.playerIdentityId) ?? [];
    group.push(card);
    grouped.set(card.playerIdentityId, group);
  }
  return [...grouped.values()].map((versions) =>
    weightedChoice(shuffle(versions, random), random, (card) => {
      const seenPenalty = 1 / (1 + seenCardCount(card.id) * 0.7);
      const recentPenalty = recentCards.has(card.id) ? 0.22 : 1;
      return seenPenalty * recentPenalty;
    })!,
  );
};

export const getOpenSlots = (formation: Formation, picks: DraftPick[]) => {
  const filled = new Set(picks.map((pick) => pick.slotId));
  return formation.slots.filter((slot) => !filled.has(slot.id));
};

/**
 * Maximum bipartite matching between remaining formation slots and available
 * player identities. Alternate versions share one right-side identity node.
 */
export const hasDraftCompletionPath = ({
  cards,
  formation,
  picks,
  excludedIdentityIds = [],
}: {
  cards: PlayerTournamentCard[];
  formation: Formation;
  picks: DraftPick[];
  excludedIdentityIds?: Iterable<string>;
}) => {
  const openSlots = getOpenSlots(formation, picks);
  if (openSlots.length === 0) return true;
  const used = usedIdentityIdsFor(cards, picks);
  const excluded = new Set(excludedIdentityIds);
  const availableIdentities = new Set<string>();
  const goalkeeperIdentities = new Set<string>();
  for (const card of cards) {
    if (used.has(card.playerIdentityId) || excluded.has(card.playerIdentityId)) {
      continue;
    }
    availableIdentities.add(card.playerIdentityId);
    if (card.primaryPosition === "GK") {
      goalkeeperIdentities.add(card.playerIdentityId);
    }
  }
  // The current fit graph has two disconnected components: goalkeeper and
  // outfield. Every outfield identity has a legal (possibly red) edge to every
  // outfield slot, so this is the exact maximum-matching result without running
  // augmenting-path recursion hundreds of times during offer ranking.
  const goalkeeperSlots = openSlots.filter(
    (slot) => slot.position === "GK",
  ).length;
  const outfieldSlots = openSlots.length - goalkeeperSlots;
  const goalkeeperIdentityCount = goalkeeperIdentities.size;
  const outfieldIdentities =
    availableIdentities.size - goalkeeperIdentityCount;
  return (
    goalkeeperIdentityCount >= goalkeeperSlots &&
    outfieldIdentities >= outfieldSlots
  );
};

export const canPlacePlayer = ({
  cards,
  formation,
  picks,
  player,
  slot,
  excludedIdentityIds = [],
}: {
  cards: PlayerTournamentCard[];
  formation: Formation;
  picks: DraftPick[];
  player: PlayerTournamentCard;
  slot: FormationSlot;
  excludedIdentityIds?: Iterable<string>;
}) => {
  if (
    !isEligibleForSlot(player, slot) ||
    picks.some((pick) => pick.slotId === slot.id)
  ) {
    return false;
  }
  const used = usedIdentityIdsFor(cards, picks);
  if (used.has(player.playerIdentityId)) return false;
  return hasDraftCompletionPath({
    cards,
    formation,
    picks: [...picks, { slotId: slot.id, cardId: player.id }],
    excludedIdentityIds,
  });
};


const isPremierCard = (card: PlayerTournamentCard) =>
  card.statusTier === "legend" || card.statusTier === "icon";

const normalizedWords = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((word) => word.length >= 3);

const archetypeMatchScore = (
  card: PlayerTournamentCard,
  formation: Formation,
) => {
  const playerWords = new Set([
    ...normalizedWords(card.archetype),
    ...card.modeledTags.flatMap(normalizedWords),
  ]);
  return formation.preferredArchetypes.reduce((score, archetype) => {
    const words = normalizedWords(archetype);
    return (
      score +
      (words.some((word) => playerWords.has(word)) ? 1 : 0)
    );
  }, 0);
};

const chemistryAffinity = ({
  card,
  draftedCards,
  manager,
  eraId,
  formation,
}: {
  card: PlayerTournamentCard;
  draftedCards: PlayerTournamentCard[];
  manager?: ManagerTournamentCard;
  eraId?: DraftEraId;
  formation: Formation;
}) => {
  let score = archetypeMatchScore(card, formation) * 5;
  for (const teammate of draftedCards) {
    if (teammate.countryCode === card.countryCode) score += 8;
    else if (teammate.confederation === card.confederation) score += 2;
    if (teammate.tournamentYear === card.tournamentYear) score += 6;
    else if (Math.abs(teammate.tournamentYear - card.tournamentYear) <= 4) {
      score += 2;
    }
    if (teammate.era === card.era) score += 2;
    if (teammate.archetype === card.archetype) score += 1;
  }

  if (manager) {
    if (manager.countryCode === card.countryCode) score += 4;
    if (manager.era === card.era) score += 3;
    if (manager.preferredFormations.includes(formation.id)) score += 3;

    const styleBoost =
      manager.style === "possession"
        ? card.attributes.control * 0.045 + card.attributes.creativity * 0.035
        : manager.style === "pressing"
          ? card.attributes.physical * 0.045 + card.attributes.defense * 0.025
          : manager.style === "counter"
            ? card.attributes.attack * 0.045 + card.attributes.physical * 0.025
            : manager.style === "defensive"
              ? card.attributes.defense * 0.05 + card.attributes.physical * 0.02
              : manager.style === "fluid"
                ? card.attributes.creativity * 0.04 + card.attributes.control * 0.03
                : (card.attributes.control + card.attributes.physical) * 0.025;
    score += styleBoost;
  }

  if (eraId && eraId !== "all" && card.era === eraId) score += 5;
  return score;
};

const squadNeedProfile = (draftedCards: PlayerTournamentCard[]) => {
  const outfield = draftedCards.filter((card) => card.primaryPosition !== "GK");
  if (outfield.length === 0) {
    return {
      attack: 1,
      creativity: 1,
      control: 1,
      defense: 1,
      physical: 1,
    };
  }
  const average = (key: keyof PlayerTournamentCard["attributes"]) =>
    outfield.reduce((sum, card) => sum + card.attributes[key], 0) /
    outfield.length;
  const values = {
    attack: average("attack"),
    creativity: average("creativity"),
    control: average("control"),
    defense: average("defense"),
    physical: average("physical"),
  };
  const maximum = Math.max(...Object.values(values));
  return {
    attack: 1 + (maximum - values.attack) / 14,
    creativity: 1 + (maximum - values.creativity) / 14,
    control: 1 + (maximum - values.control) / 14,
    defense: 1 + (maximum - values.defense) / 14,
    physical: 1 + (maximum - values.physical) / 14,
  };
};

const roleNeedScore = (
  card: PlayerTournamentCard,
  needs: ReturnType<typeof squadNeedProfile>,
) =>
  card.attributes.attack * needs.attack * 0.22 +
  card.attributes.creativity * needs.creativity * 0.21 +
  card.attributes.control * needs.control * 0.19 +
  card.attributes.defense * needs.defense * 0.2 +
  card.attributes.physical * needs.physical * 0.18;

const specialistScore = (card: PlayerTournamentCard) =>
  Math.max(
    card.attributes.attack,
    card.attributes.creativity,
    card.attributes.control,
    card.attributes.defense,
    card.attributes.physical,
    card.attributes.clutch,
  ) -
  Math.min(
    card.attributes.attack,
    card.attributes.creativity,
    card.attributes.control,
    card.attributes.defense,
    card.attributes.physical,
  ) *
    0.18;

const premiumChanceForRound = (pickIndex: number) =>
  pickIndex <= 2 ? 0.16 : pickIndex <= 5 ? 0.27 : pickIndex <= 8 ? 0.4 : 0.52;

export const draftOfferThemeFor = ({
  seed,
  formation,
  pickIndex,
  respinIndex = 0,
  premiumAllowed,
}: {
  seed: number;
  formation: Formation;
  pickIndex: number;
  respinIndex?: number;
  premiumAllowed: boolean;
}): DraftOfferTheme => {
  const random = createSeededRandom(
    seed ^
      hashString(
        `offer-director:${formation.id}:${pickIndex}:${respinIndex}`,
      ),
  );
  const themes: Array<[DraftOfferTheme, number]> = [
    ["balanced", 0.25],
    ["position-rescue", pickIndex >= 6 ? 0.2 : 0.14],
    ["chemistry-temptation", 0.17],
    ["versatile-depth", pickIndex >= 7 ? 0.16 : 0.12],
    ["specialist-gamble", 0.12],
    ["chaos", 0.1],
  ];
  if (premiumAllowed) {
    themes.push(["star-moment", pickIndex <= 2 ? 0.12 : 0.2]);
  }
  const total = themes.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = random() * total;
  for (const [theme, weight] of themes) {
    roll -= weight;
    if (roll <= 0) return theme;
  }
  return "balanced";
};

export const generateDraftOptions = (
  cards: PlayerTournamentCard[],
  formation: Formation,
  picks: DraftPick[],
  seed: number,
  pickIndex: number,
  rules: DraftGenerationRules = {},
): PlayerTournamentCard[] => {
  const used = usedIdentityIdsFor(cards, picks);
  const excluded = new Set(rules.excludedIdentityIds ?? []);
  const rejected = new Set(rules.rejectedIdentityIds ?? []);
  const recent = new Set(rules.recentIdentityIds ?? []);
  const recentCards = new Set(rules.recentCardIds ?? []);
  const seenCount = (identityId: string) =>
    rules.seenIdentityCounts?.[identityId] ?? 0;
  const seenCardCount = (cardId: string) => rules.seenCardCounts?.[cardId] ?? 0;
  const openSlots = getOpenSlots(formation, picks);
  if (openSlots.length === 0) return [];

  const random = createSeededRandom(
    seed ^
      hashString(
        `draft-v2:${formation.id}:${pickIndex}:${rules.respinIndex ?? 0}:${picks
          .map((pick) => `${pick.slotId}:${pick.cardId}`)
          .join("|")}`,
      ),
  );
  const cardsById = playerCardByIdFor(cards);
  const draftedCards = picks
    .map((pick) => cardsById.get(pick.cardId))
    .filter((card): card is PlayerTournamentCard => Boolean(card));
  const draftedHigh = draftedCards.filter((card) => card.overall >= 90).length;
  const draftedPremier = draftedCards.filter(isPremierCard).length;

  const premiumChance = premiumChanceForRound(pickIndex);
  const premiumRoll =
    (Math.abs(
      hashString(
        `draft-v2-premium:${seed}:${formation.id}:${pickIndex}:${rules.respinIndex ?? 0}`,
      ),
    ) %
      10_000) /
    10_000;
  const premierOfferAllowed =
    draftedPremier < 2 && premiumRoll < premiumChance;
  const premierOfferCap = pickIndex <= 6 ? 1 : 2;
  const theme = draftOfferThemeFor({
    seed,
    formation,
    pickIndex,
    respinIndex: rules.respinIndex,
    premiumAllowed: premierOfferAllowed,
  });

  // A whole draft has a soft high-card budget. This stops multiple 90+ cards
  // from becoming routine while keeping a lucky run possible.
  const budgetRoll =
    (Math.abs(hashString(`draft-v2-high-budget:${seed}:${formation.id}`)) %
      10_000) /
    10_000;
  const highBudget = budgetRoll < 0.18 ? 2 : budgetRoll < 0.82 ? 3 : 4;

  const identitySafe = cards.filter(
    (card) =>
      !used.has(card.playerIdentityId) &&
      !excluded.has(card.playerIdentityId) &&
      (card.overall < 90 || draftedHigh < highBudget) &&
      (!isPremierCard(card) || draftedPremier < 2),
  );
  const withoutRejected = identitySafe.filter(
    (card) => !rejected.has(card.playerIdentityId),
  );

  const uniqueFor = (pool: PlayerTournamentCard[]) =>
    shuffle(uniqueIdentityCards(pool, random, rules), random);

  const openGoalkeeperSlots = openSlots.filter(
    (slot) => slot.position === "GK",
  ).length;
  const openOutfieldSlots = openSlots.length - openGoalkeeperSlots;

  const viableForPool = (pool: PlayerTournamentCard[]) => {
    // Choose the tournament version only after removing versions that are red
    // everywhere. An identity with one useful card should not disappear because
    // a different tournament version happened to win the identity lottery.
    const usefulVersions = pool.filter((card) =>
      openSlots.some((slot) => getPositionFit(card, slot) >= 70),
    );
    const rankingCards = uniqueFor(usefulVersions);
    const remainingGoalkeeperIdentities = rankingCards.filter(
      (player) => player.primaryPosition === "GK",
    ).length;
    const remainingOutfieldIdentities =
      rankingCards.length - remainingGoalkeeperIdentities;

    const placementPreservesMatching = (
      player: PlayerTournamentCard,
      slot: FormationSlot,
    ) => {
      if (!isEligibleForSlot(player, slot)) return false;
      const goalkeeperPlacement = player.primaryPosition === "GK";
      return (
        remainingGoalkeeperIdentities - (goalkeeperPlacement ? 1 : 0) >=
          openGoalkeeperSlots - (slot.position === "GK" ? 1 : 0) &&
        remainingOutfieldIdentities - (goalkeeperPlacement ? 0 : 1) >=
          openOutfieldSlots - (slot.position === "GK" ? 0 : 1)
      );
    };

    const viable = rankingCards.filter((player) =>
      openSlots.some(
        (slot) =>
          getPositionFit(player, slot) >= 70 &&
          placementPreservesMatching(player, slot),
      ),
    );
    return { rankingCards, viable, placementPreservesMatching };
  };

  // A respin should be meaningfully fresh. Keep the previous identities out
  // whenever the remaining pool can still supply five yellow-or-green options.
  let poolState = viableForPool(withoutRejected);
  if (poolState.viable.length < 5) {
    poolState = viableForPool(identitySafe);
  }
  const { rankingCards, viable, placementPreservesMatching } = poolState;

  if (viable.length < 5) {
    throw new Error(
      `Not enough yellow-or-green identity-safe cards for ${formation.name} round ${pickIndex + 1}`,
    );
  }

  // Count useful (yellow/green) solutions per open slot. Scarce slots should
  // influence the offer, especially late, without guaranteeing the perfect card.
  const capableCounts = new Map(
    openSlots.map((slot) => [
      slot.id,
      new Set(
        rankingCards
          .filter(
            (candidate) =>
              getPositionFit(candidate, slot) >= 70 &&
              placementPreservesMatching(candidate, slot),
          )
          .map((candidate) => candidate.playerIdentityId),
      ).size,
    ]),
  );
  const scarcestSlot = [...openSlots].sort(
    (first, second) =>
      (capableCounts.get(first.id) ?? Number.MAX_SAFE_INTEGER) -
      (capableCounts.get(second.id) ?? Number.MAX_SAFE_INTEGER),
  )[0];

  const needs = squadNeedProfile(draftedCards);
  const metrics = new Map(
    viable.map((card) => {
      const usefulFits = openSlots
        .map((slot) => ({
          slot,
          fit: getPositionFit(card, slot),
          legal: placementPreservesMatching(card, slot),
        }))
        .filter(({ fit, legal }) => fit >= 70 && legal);
      const bestFit = Math.max(...usefulFits.map(({ fit }) => fit));
      const usefulCoverage = usefulFits.length;
      const scarcity = usefulFits.reduce(
        (score, { slot, fit }) =>
          score +
          (fit / 100) *
            Math.max(0, 22 - (capableCounts.get(slot.id) ?? 22)) *
            1.2,
        0,
      );
      const chemistry = chemistryAffinity({
        card,
        draftedCards,
        manager: rules.manager,
        eraId: rules.eraId,
        formation,
      });
      const need = roleNeedScore(card, needs) + scarcity;
      const versatility =
        usefulCoverage * 13 +
        Math.min(5, new Set([card.primaryPosition, ...card.eligiblePositions]).size) *
          4 +
        bestFit * 0.24;
      return [
        card.id,
        {
          bestFit,
          usefulCoverage,
          scarcity,
          chemistry,
          need,
          versatility,
          specialist: specialistScore(card),
          scarcestFit: scarcestSlot ? getPositionFit(card, scarcestSlot) : 0,
        },
      ] as const;
    }),
  );

  const ranked = shuffle(viable, random).sort((first, second) => {
    const firstMetric = metrics.get(first.id)!;
    const secondMetric = metrics.get(second.id)!;
    return (
      seenCount(first.playerIdentityId) -
        seenCount(second.playerIdentityId) ||
      Number(recent.has(first.playerIdentityId)) -
        Number(recent.has(second.playerIdentityId)) ||
      Number(recentCards.has(first.id)) - Number(recentCards.has(second.id)) ||
      seenCardCount(first.id) - seenCardCount(second.id) ||
      secondMetric.scarcity - firstMetric.scarcity ||
      secondMetric.bestFit - firstMetric.bestFit ||
      second.overall - first.overall
    );
  });

  const selected: PlayerTournamentCard[] = [];
  const currentCounts = (excludingIndex?: number) => {
    const kept = selected.filter((_, index) => index !== excludingIndex);
    return {
      high: kept.filter((card) => card.overall >= 90).length,
      strong: kept.filter((card) => card.overall >= 88).length,
      premier: kept.filter(isPremierCard).length,
    };
  };
  const allowed = (card: PlayerTournamentCard, excludingIndex?: number) => {
    const counts = currentCounts(excludingIndex);
    return (
      !selected.some(
        (candidate, index) =>
          index !== excludingIndex &&
          candidate.playerIdentityId === card.playerIdentityId,
      ) &&
      (card.overall < 90 || counts.high < 2) &&
      (card.overall < 88 || counts.strong < 3) &&
      (!isPremierCard(card) ||
        (premierOfferAllowed && counts.premier < premierOfferCap))
    );
  };

  const exposureWeight = (card: PlayerTournamentCard) => {
    const respin = (rules.respinIndex ?? 0) > 0;
    const identitySeenPenalty =
      1 / (1 + seenCount(card.playerIdentityId) * (respin ? 1.1 : 0.8));
    const recentIdentityPenalty = recent.has(card.playerIdentityId)
      ? respin
        ? 0.045
        : 0.15
      : 1;
    const cardSeenPenalty =
      1 / (1 + seenCardCount(card.id) * (respin ? 0.85 : 0.55));
    const recentCardPenalty = recentCards.has(card.id)
      ? respin
        ? 0.1
        : 0.32
      : 1;
    return (
      identitySeenPenalty *
      recentIdentityPenalty *
      cardSeenPenalty *
      recentCardPenalty
    );
  };

  type ChoiceKind =
    | "premium"
    | "quality"
    | "need"
    | "chemistry"
    | "versatility"
    | "specialist"
    | "rescue"
    | "wildcard";

  const choiceScore = (card: PlayerTournamentCard, kind: ChoiceKind) => {
    const metric = metrics.get(card.id)!;
    const quality = (card.overall - 72) * 3;
    switch (kind) {
      case "premium":
        return isPremierCard(card) ? 150 + quality + metric.bestFit * 0.2 : 0;
      case "quality":
        return quality + metric.bestFit * 0.45 + metric.need * 0.1;
      case "need":
        return metric.need * 0.75 + metric.bestFit * 0.55 + quality * 0.18;
      case "chemistry":
        return metric.chemistry * 1.3 + metric.bestFit * 0.55 + quality * 0.12;
      case "versatility":
        return metric.versatility * 1.05 + quality * 0.2;
      case "specialist":
        return metric.specialist * 0.95 + metric.bestFit * 0.35 + quality * 0.18;
      case "rescue":
        return (
          metric.scarcestFit * 0.95 +
          metric.scarcity * 1.25 +
          metric.bestFit * 0.35 +
          quality * 0.12
        );
      case "wildcard":
      default:
        return 40 + quality * 0.35 + metric.bestFit * 0.3;
    }
  };

  const choose = (
    kind: ChoiceKind,
    predicate: (card: PlayerTournamentCard) => boolean = () => true,
    excludingIndex?: number,
  ) => {
    const pool = ranked.filter(
      (card) => predicate(card) && allowed(card, excludingIndex),
    );
    return weightedChoice(pool, random, (card) => {
      const score = Math.max(1, choiceScore(card, kind));
      return exposureWeight(card) * (0.55 + score / 85);
    });
  };

  const add = (kind: ChoiceKind, predicate?: (card: PlayerTournamentCard) => boolean) => {
    if (selected.length >= 5) return;
    const candidate = choose(kind, predicate);
    if (candidate) selected.push(candidate);
  };

  const plan: ChoiceKind[] =
    theme === "star-moment"
      ? ["premium", "need", "chemistry", "versatility", "wildcard"]
      : theme === "position-rescue"
        ? ["rescue", "need", "quality", "chemistry", "wildcard"]
        : theme === "chemistry-temptation"
          ? ["chemistry", "chemistry", "need", "quality", "wildcard"]
          : theme === "versatile-depth"
            ? ["versatility", "versatility", "need", "chemistry", "wildcard"]
            : theme === "specialist-gamble"
              ? ["specialist", "need", "quality", "chemistry", "wildcard"]
              : theme === "chaos"
                ? ["wildcard", "specialist", "quality", "wildcard", "need"]
                : ["quality", "need", "chemistry", "versatility", "wildcard"];

  for (const kind of plan) {
    if (kind === "premium" && !premierOfferAllowed) add("quality");
    else add(kind);
  }
  while (selected.length < 5) add("wildcard");

  const replaceAt = (
    index: number,
    kind: ChoiceKind,
    predicate: (card: PlayerTournamentCard) => boolean,
  ) => {
    const replacement = choose(kind, predicate, index);
    if (replacement) selected[index] = replacement;
  };

  // The premium gate means exactly what the player feels: when it opens, one
  // Legend/Icon moment should actually appear. When it is closed, cleanup
  // passes are not allowed to sneak a premium card into the offer.
  if (premierOfferAllowed && !selected.some(isPremierCard)) {
    const index = selected
      .map((card, index) => ({ card, index }))
      .sort((first, second) => first.card.overall - second.card.overall)[0]?.index;
    if (index !== undefined) {
      replaceAt(index, "premium", isPremierCard);
    }
  }

  // Keep a meaningful but not overly generous quality floor. The draft should
  // be playable without turning every round into an obvious 88+ selection.
  if (!selected.some((card) => card.overall >= 86)) {
    const index = selected
      .map((card, index) => ({ card, index }))
      .sort((first, second) => first.card.overall - second.card.overall)[0]?.index;
    if (index !== undefined) {
      replaceAt(index, "quality", (card) => card.overall >= 86);
    }
  }
  while (selected.filter((card) => card.overall >= 83).length < 2) {
    const index = selected
      .map((card, index) => ({ card, index }))
      .filter(({ card }) => card.overall < 83)
      .sort((first, second) => first.card.overall - second.card.overall)[0]?.index;
    if (index === undefined) break;
    const before = selected[index].id;
    replaceAt(index, "quality", (card) => card.overall >= 83);
    if (selected[index].id === before) break;
  }

  // Late goalkeeper rescue is a choice, not a gift: one GK is guaranteed to
  // appear if the slot is still open, but its quality is not guaranteed.
  if (
    openGoalkeeperSlots > 0 &&
    pickIndex >= 7 &&
    !selected.some((card) => card.primaryPosition === "GK")
  ) {
    const index = selected
      .map((card, index) => ({ card, index }))
      .filter(({ card }) => card.primaryPosition !== "GK")
      .sort((first, second) => first.card.overall - second.card.overall)[0]?.index;
    if (index !== undefined) {
      replaceAt(index, "rescue", (card) => card.primaryPosition === "GK");
    }
  }

  // If an open slot has very few useful solutions, ensure one offer can address
  // it. This avoids unwinnable-feeling rounds while still allowing yellow fits.
  if (
    scarcestSlot &&
    (capableCounts.get(scarcestSlot.id) ?? 99) <= 18 &&
    !selected.some((card) => getPositionFit(card, scarcestSlot) >= 80)
  ) {
    const index = selected
      .map((card, index) => ({ card, index }))
      .sort((first, second) => first.card.overall - second.card.overall)[0]?.index;
    if (index !== undefined) {
      replaceAt(
        index,
        "rescue",
        (card) => getPositionFit(card, scarcestSlot) >= 80,
      );
    }
  }

  // Five copies of the same tactical decision is not a FUT-style offer.
  const families = new Set(
    selected.map((card) => tacticalFamilyForPosition(card.primaryPosition)),
  );
  if (families.size < 2) {
    const currentFamily = tacticalFamilyForPosition(selected[0].primaryPosition);
    const index = selected.length - 1;
    replaceAt(
      index,
      "need",
      (card) => tacticalFamilyForPosition(card.primaryPosition) !== currentFamily,
    );
  }

  // Cleanup passes above may trade one card for tactical reasons; preserve the
  // rarity promise if this round was designated as a premium moment.
  if (premierOfferAllowed && !selected.some(isPremierCard)) {
    const index = selected
      .map((card, index) => ({ card, index }))
      .filter(({ card }) => !isPremierCard(card))
      .sort((first, second) => first.card.overall - second.card.overall)[0]?.index;
    if (index !== undefined) {
      replaceAt(index, "premium", isPremierCard);
    }
  }

  if (selected.length !== 5) {
    throw new Error("Draft Engine v2 did not return five cards");
  }

  // Hard UX invariant: a card that is red in every currently open slot is a
  // dead option and must never be shown.
  for (const card of selected) {
    const useful = openSlots.some(
      (slot) =>
        getPositionFit(card, slot) >= 70 &&
        placementPreservesMatching(card, slot),
    );
    if (!useful) {
      throw new Error(
        `Draft Engine v2 surfaced a dead red-only option: ${card.id}`,
      );
    }
  }

  return selected;
};
export type ManagerGenerationRules = {
  seenIdentityCounts?: Readonly<Record<string, number>>;
  recentIdentityIds?: Iterable<string>;
  seenCardCounts?: Readonly<Record<string, number>>;
  recentCardIds?: Iterable<string>;
};

export const generateManagerOptions = (
  cards: ManagerTournamentCard[],
  eraId: DraftEraId,
  seed: number,
  excludedIdentityIds: Iterable<string> = [],
  respinIndex = 0,
  rules: ManagerGenerationRules = {},
) => {
  const excluded = new Set(excludedIdentityIds);
  const recentIdentities = new Set(rules.recentIdentityIds ?? []);
  const recentCards = new Set(rules.recentCardIds ?? []);
  const seenIdentityCount = (identityId: string) =>
    rules.seenIdentityCounts?.[identityId] ?? 0;
  const seenCardCount = (cardId: string) => rules.seenCardCounts?.[cardId] ?? 0;
  const eligible = cards.filter(
    (manager) => !excluded.has(manager.managerIdentityId),
  );
  const random = createSeededRandom(
    seed ^ hashString(`manager:${eraId}:${respinIndex}`),
  );

  // Managers are selected identity-first so identities with more tournament
  // cards do not receive extra lottery tickets.
  const grouped = new Map<string, ManagerTournamentCard[]>();
  for (const manager of eligible) {
    const versions = grouped.get(manager.managerIdentityId) ?? [];
    versions.push(manager);
    grouped.set(manager.managerIdentityId, versions);
  }
  if (grouped.size < 3) {
    throw new Error(`Not enough manager identities for ${eraId}`);
  }

  const remaining = [...grouped.entries()];
  const selected: ManagerTournamentCard[] = [];
  while (selected.length < 3 && remaining.length > 0) {
    const chosenIdentity = weightedChoice(
      remaining,
      random,
      ([identityId]) => {
        const seenPenalty = 1 / (1 + seenIdentityCount(identityId) * 0.85);
        const recentPenalty = recentIdentities.has(identityId) ? 0.16 : 1;
        return seenPenalty * recentPenalty;
      },
    );
    if (!chosenIdentity) break;
    const [identityId, versions] = chosenIdentity;
    const chosenVersion = weightedChoice(
      shuffle(versions, random),
      random,
      (manager) => {
        const seenPenalty = 1 / (1 + seenCardCount(manager.id) * 0.7);
        const recentPenalty = recentCards.has(manager.id) ? 0.22 : 1;
        return seenPenalty * recentPenalty;
      },
    );
    if (chosenVersion) selected.push(chosenVersion);
    remaining.splice(
      remaining.findIndex(([candidateId]) => candidateId === identityId),
      1,
    );
  }
  if (selected.length !== 3) {
    throw new Error(`Manager generation did not return three identities for ${eraId}`);
  }
  return selected;
};

export type FormationOfferRules = {
  offerIndex?: number;
  respinIndex?: number;
  originalFormationIds?: FormationId[];
  excludedFormationIds?: Iterable<FormationId>;
  seenFormationCounts?: Readonly<Record<string, number>>;
  recentFormationIds?: Iterable<FormationId>;
};

export const generateFormationOffer = (
  manager: ManagerTournamentCard,
  eraId: DraftEraId,
  seed: number,
  count = 4,
  rules: FormationOfferRules = {},
): FormationId[] => {
  const managerEraFit = calculateManagerEraFit(manager, eraId);
  const excluded = new Set(rules.excludedFormationIds ?? []);
  const recent = new Set(rules.recentFormationIds ?? []);
  const seenCount = (formationId: FormationId) =>
    rules.seenFormationCounts?.[formationId] ?? 0;
  const nonExcluded = formations.filter(
    (formation) => !excluded.has(formation.id),
  );
  const available = nonExcluded.length >= count ? nonExcluded : formations;
  const random = createSeededRandom(
    seed ^
      hashString(
        `formations:${manager.id}:${eraId}:${rules.offerIndex ?? 0}:${rules.respinIndex ?? 0}:${(
          rules.originalFormationIds ?? []
        ).join("|")}`,
      ),
  );
  const preferred = available.filter((formation) =>
    manager.preferredFormations.includes(formation.id),
  );
  const balanced = available.filter(
    (formation) =>
      formation.tendencies.attack >= 78 &&
      formation.tendencies.defense >= 78 &&
      !preferred.some((item) => item.id === formation.id),
  );
  const contrasting = available.filter(
    (formation) =>
      Math.abs(formation.tendencies.attack - formation.tendencies.defense) >=
        10 &&
      !preferred.some((item) => item.id === formation.id),
  );
  const eraStrong = available.filter((formation) =>
    formation.eraStrengths.includes(eraId),
  );
  const selected: FormationId[] = [];
  const noveltyWeight = (formation: Formation) => {
    const seenPenalty = 1 / (1 + seenCount(formation.id) * 0.7);
    const recentPenalty = recent.has(formation.id) ? 0.2 : 1;
    return seenPenalty * recentPenalty;
  };
  const tacticalWeight = (formation: Formation) => {
    let boost = 1;
    if (preferred.some((item) => item.id === formation.id)) boost *= 1.8;
    if (eraStrong.some((item) => item.id === formation.id)) boost *= 1.35;
    if (balanced.some((item) => item.id === formation.id)) boost *= 1.2;
    if (contrasting.some((item) => item.id === formation.id)) boost *= 1.15;
    return boost;
  };
  const choose = (pool: Formation[], tactical = false) =>
    weightedChoice(
      pool.filter((formation) => !selected.includes(formation.id)),
      random,
      (formation) =>
        noveltyWeight(formation) * (tactical ? tacticalWeight(formation) : 1),
    );
  const add = (formation: Formation | undefined) => {
    if (formation && !selected.includes(formation.id)) {
      selected.push(formation.id);
    }
  };

  // Keep one manager/era tactical anchor, then let every legal formation
  // compete for the remaining slots with compatibility and novelty weights.
  if (!managerEraFit.applicable || managerEraFit.score >= 84) {
    add(choose(preferred, true) ?? choose(eraStrong, true));
  } else {
    add(choose(eraStrong, true) ?? choose(preferred, true));
  }
  if (selected.length === 0) add(choose(available, true));
  while (selected.length < count) {
    const fallback = weightedChoice(
      available.filter((formation) => !selected.includes(formation.id)),
      random,
      (formation) => noveltyWeight(formation) * tacticalWeight(formation),
    );
    if (!fallback) break;
    add(fallback);
  }
  return selected.slice(0, count);
};

export const generateFormationRespin = (
  manager: ManagerTournamentCard,
  eraId: DraftEraId,
  seed: number,
  originalFormationIds: FormationId[],
  rules: Pick<
    FormationOfferRules,
    "seenFormationCounts" | "recentFormationIds"
  > = {},
) =>
  generateFormationOffer(manager, eraId, seed, 4, {
    ...rules,
    offerIndex: 0,
    respinIndex: 1,
    originalFormationIds,
    excludedFormationIds: originalFormationIds,
  });

export const generateBenchOptions = (
  cards: PlayerTournamentCard[],
  starters: DraftPick[],
  bench: BenchPick[],
  seed: number,
  round: number,
  rules: DraftGenerationRules = {},
) => {
  const used = usedIdentityIdsFor(cards, [...starters, ...bench]);
  const excluded = new Set(rules.excludedIdentityIds ?? []);
  const rejected = new Set(rules.rejectedIdentityIds ?? []);
  const recent = new Set(rules.recentIdentityIds ?? []);
  const recentCards = new Set(rules.recentCardIds ?? []);
  const seenCount = (identityId: string) =>
    rules.seenIdentityCounts?.[identityId] ?? 0;
  const seenCardCount = (cardId: string) => rules.seenCardCounts?.[cardId] ?? 0;
  const byId = playerCardByIdFor(cards);
  const starterCards = starters
    .map((pick) => byId.get(pick.cardId))
    .filter((card): card is PlayerTournamentCard => Boolean(card));
  const draftedBench = bench
    .map((pick) => byId.get(pick.cardId))
    .filter((card): card is PlayerTournamentCard => Boolean(card));
  const highCount = draftedBench.filter((card) => card.overall >= 90).length;
  const eliteCount = draftedBench.filter((card) => card.overall >= 86).length;
  const formation = rules.formation;
  const needs = squadNeedProfile([...starterCards, ...draftedBench]);

  const identitySafe = cards.filter(
    (card) =>
      !used.has(card.playerIdentityId) &&
      !excluded.has(card.playerIdentityId) &&
      (card.overall < 90 || highCount < 1) &&
      (card.overall < 86 || eliteCount < 3),
  );
  const withoutRejected = identitySafe.filter(
    (card) => !rejected.has(card.playerIdentityId),
  );
  const eligible = withoutRejected.length >= 5 ? withoutRejected : identitySafe;
  const random = createSeededRandom(
    seed ^
      hashString(
        `bench-v2:${round}:${rules.respinIndex ?? 0}:${[...used].join(",")}`,
      ),
  );
  const ranked = shuffle(uniqueIdentityCards(eligible, random, rules), random);

  const formationPositions = new Set(
    formation
      ? formation.slots
          .map((slot) => slot.position)
          .filter((position) => position !== "GK")
      : ([] as Position[]),
  );
  const benchMetrics = new Map(
    ranked.map((card) => {
      const positions = new Set([card.primaryPosition, ...card.eligiblePositions]);
      const coverage = formation
        ? [...positions].filter((position) => formationPositions.has(position)).length
        : positions.size;
      const chemistry = formation
        ? chemistryAffinity({
            card,
            draftedCards: [...starterCards, ...draftedBench],
            manager: rules.manager,
            eraId: rules.eraId,
            formation,
          })
        : 0;
      const impact =
        card.attributes.attack * 0.42 +
        card.attributes.creativity * 0.28 +
        card.attributes.clutch * 0.2 +
        card.attributes.physical * 0.1;
      const closer =
        card.attributes.defense * 0.48 +
        card.attributes.physical * 0.3 +
        card.attributes.control * 0.12 +
        card.attributes.clutch * 0.1;
      const need = roleNeedScore(card, needs);
      const versatility =
        coverage * 18 +
        Math.min(5, positions.size) * 5 +
        (card.primaryPosition === "GK" ? -28 : 0);
      return [
        card.id,
        { coverage, chemistry, impact, closer, need, versatility },
      ] as const;
    }),
  );

  const selected: PlayerTournamentCard[] = [];
  const countsWithout = (excludingIndex?: number) => {
    const kept = selected.filter((_, index) => index !== excludingIndex);
    return {
      high: kept.filter((card) => card.overall >= 90).length,
      elite: kept.filter((card) => card.overall >= 86).length,
    };
  };
  const allowed = (card: PlayerTournamentCard, excludingIndex?: number) => {
    const counts = countsWithout(excludingIndex);
    return (
      !selected.some(
        (candidate, index) =>
          index !== excludingIndex &&
          candidate.playerIdentityId === card.playerIdentityId,
      ) &&
      (card.overall < 90 || counts.high < 1) &&
      (card.overall < 86 || counts.elite < 3)
    );
  };
  const exposureWeight = (card: PlayerTournamentCard) => {
    const respin = (rules.respinIndex ?? 0) > 0;
    const identityPenalty =
      1 / (1 + seenCount(card.playerIdentityId) * (respin ? 1.05 : 0.75));
    const recentIdentityPenalty = recent.has(card.playerIdentityId)
      ? respin
        ? 0.05
        : 0.18
      : 1;
    const cardPenalty =
      1 / (1 + seenCardCount(card.id) * (respin ? 0.8 : 0.5));
    const recentCardPenalty = recentCards.has(card.id)
      ? respin
        ? 0.1
        : 0.34
      : 1;
    const goalkeeperPenalty = card.primaryPosition === "GK" ? 0.32 : 1;
    return (
      identityPenalty *
      recentIdentityPenalty *
      cardPenalty *
      recentCardPenalty *
      goalkeeperPenalty
    );
  };

  type BenchKind = "impact" | "closer" | "versatile" | "chemistry" | "quality" | "need";
  const scoreFor = (card: PlayerTournamentCard, kind: BenchKind) => {
    const metric = benchMetrics.get(card.id)!;
    const quality = Math.max(0, card.overall - 72) * 2.4;
    switch (kind) {
      case "impact":
        return metric.impact + quality * 0.4;
      case "closer":
        return metric.closer + quality * 0.35;
      case "versatile":
        return metric.versatility + quality * 0.3;
      case "chemistry":
        return metric.chemistry * 1.3 + metric.versatility * 0.3 + quality * 0.25;
      case "need":
        return metric.need * 0.75 + metric.versatility * 0.25 + quality * 0.2;
      case "quality":
      default:
        return quality + metric.impact * 0.25 + metric.closer * 0.2;
    }
  };
  const choose = (
    kind: BenchKind,
    predicate: (card: PlayerTournamentCard) => boolean = () => true,
    excludingIndex?: number,
  ) =>
    weightedChoice(
      ranked.filter((card) => predicate(card) && allowed(card, excludingIndex)),
      random,
      (card) =>
        exposureWeight(card) *
        (0.5 + Math.max(1, scoreFor(card, kind)) / 80),
    );

  const add = (kind: BenchKind, predicate?: (card: PlayerTournamentCard) => boolean) => {
    const card = choose(kind, predicate);
    if (card && selected.length < 5) selected.push(card);
  };

  // Bench offers deliberately show different match-management answers rather
  // than five versions of "highest overall substitute".
  add("impact", (card) => card.primaryPosition !== "GK");
  add("closer", (card) => card.primaryPosition !== "GK");
  add("versatile", (card) => card.primaryPosition !== "GK");
  add("chemistry", (card) => card.primaryPosition !== "GK");
  add(round >= 1 ? "need" : "quality");

  while (selected.length < 5) add("quality");

  const replaceAt = (
    index: number,
    kind: BenchKind,
    predicate: (card: PlayerTournamentCard) => boolean,
  ) => {
    const replacement = choose(kind, predicate, index);
    if (replacement) selected[index] = replacement;
  };

  if (!selected.some((card) => card.overall >= 85)) {
    const index = selected
      .map((card, index) => ({ card, index }))
      .sort((first, second) => first.card.overall - second.card.overall)[0]?.index;
    if (index !== undefined) {
      replaceAt(index, "quality", (card) => card.overall >= 85);
    }
  }

  const families = new Set(
    selected.map((card) => tacticalFamilyForPosition(card.primaryPosition)),
  );
  if (families.size < 2) {
    const family = tacticalFamilyForPosition(selected[0].primaryPosition);
    replaceAt(
      selected.length - 1,
      "need",
      (card) => tacticalFamilyForPosition(card.primaryPosition) !== family,
    );
  }

  if (selected.length !== 5) {
    throw new Error("Draft Engine v2 did not return five bench options");
  }
  return selected;
};
export const getCurrentSlot = (formation: Formation, picks: DraftPick[]) =>
  getOpenSlots(formation, picks)[0] ?? null;

export const isDraftComplete = (formation: Formation, picks: DraftPick[]) =>
  getOpenSlots(formation, picks).length === 0 &&
  picks.length === formation.slots.length;

export const hasDuplicatePicks = (picks: DraftPick[]) =>
  new Set(picks.map((pick) => pick.cardId)).size !== picks.length ||
  new Set(picks.map((pick) => pick.slotId)).size !== picks.length;

export const hasDuplicatePlayers = (
  picks: DraftPick[],
  cards: PlayerTournamentCard[],
) => {
  const byId = playerCardByIdFor(cards);
  const identities = picks
    .map((pick) => byId.get(pick.cardId)?.playerIdentityId)
    .filter((identity): identity is string => Boolean(identity));
  return new Set(identities).size !== identities.length;
};

export const validateDraftPicks = ({
  picks,
  formation,
  cards,
  excludedIdentityIds = [],
}: {
  picks: DraftPick[];
  formation: Formation;
  cards: PlayerTournamentCard[];
  excludedIdentityIds?: Iterable<string>;
}) => {
  const byId = playerCardByIdFor(cards);
  const slotsById = new Map(formation.slots.map((slot) => [slot.id, slot]));
  const excluded = new Set(excludedIdentityIds);
  const cardIds = new Set<string>();
  const slotIds = new Set<string>();
  const identityIds = new Set<string>();
  const valid: DraftPick[] = [];
  const issues: string[] = [];

  for (const pick of picks) {
    const card = byId.get(pick.cardId);
    const slot = slotsById.get(pick.slotId);
    if (!card || !slot) {
      issues.push(`Removed missing card or slot (${pick.cardId}/${pick.slotId})`);
      continue;
    }
    if (
      cardIds.has(card.id) ||
      slotIds.has(slot.id) ||
      identityIds.has(card.playerIdentityId)
    ) {
      issues.push(`Removed duplicate identity or slot (${card.playerName})`);
      continue;
    }
    if (excluded.has(card.playerIdentityId)) {
      issues.push(`Removed opponent identity (${card.playerName})`);
      continue;
    }
    if (!isEligibleForSlot(card, slot)) {
      issues.push(`Removed invalid positional fit (${card.playerName})`);
      continue;
    }
    cardIds.add(card.id);
    slotIds.add(slot.id);
    identityIds.add(card.playerIdentityId);
    valid.push(pick);
  }

  return { valid, issues };
};

export const createDraftSeed = () =>
  Math.floor(Date.now() % 2_147_483_647) || 2026;