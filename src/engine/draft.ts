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
  elite: 0.25,
  standout: 0.285,
  reliable: 0.205,
  "role-player": 0.085,
  limited: 0.025,
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

export type DraftGenerationRules = {
  excludedIdentityIds?: Iterable<string>;
  rejectedIdentityIds?: Iterable<string>;
  seenIdentityCounts?: Readonly<Record<string, number>>;
  recentIdentityIds?: Iterable<string>;
  seenCardCounts?: Readonly<Record<string, number>>;
  recentCardIds?: Iterable<string>;
  respinIndex?: number;
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
        `player-first:${formation.id}:${pickIndex}:${rules.respinIndex ?? 0}:${picks
          .map((pick) => `${pick.slotId}:${pick.cardId}`)
          .join("|")}`,
      ),
  );
  const cardsById = playerCardByIdFor(cards);
  const draftedCards = picks
    .map((pick) => cardsById.get(pick.cardId))
    .filter((card): card is PlayerTournamentCard => Boolean(card));
  const draftedHigh = draftedCards.filter((card) => card.overall >= 90).length;
  const draftedPremier = draftedCards.filter((card) =>
    ["legend", "icon"].includes(card.statusTier),
  ).length;

  // Premium cards should feel like an event, not an opening-round expectation.
  // Keep them possible from the start, then gradually increase their availability
  // as the XI takes shape. This gate also applies to quality-floor replacements so
  // the safety net cannot quietly inject a Legend/Icon into every early offer.
  const premierOfferChance =
    pickIndex <= 2 ? 0.18 : pickIndex <= 5 ? 0.32 : pickIndex <= 8 ? 0.48 : 0.62;
  const premierOfferRoll =
    (Math.abs(
      hashString(
        `starter-premier:${seed}:${formation.id}:${pickIndex}:${rules.respinIndex ?? 0}`,
      ),
    ) % 10_000) /
    10_000;
  const premierOfferAllowed = premierOfferRoll < premierOfferChance;
  const premierOfferCap = pickIndex <= 5 ? 1 : 2;

  const budgetRoll =
    (Math.abs(hashString(`starter-tier-budget:${seed}:${formation.id}`)) %
      10_000) /
    10_000;
  const highBudget = budgetRoll < 0.2 ? 2 : budgetRoll < 0.75 ? 3 : 4;
  const identitySafe = cards.filter(
    (card) =>
      !used.has(card.playerIdentityId) &&
      !excluded.has(card.playerIdentityId) &&
      (card.overall < 90 || draftedHigh < highBudget) &&
      (!["legend", "icon"].includes(card.statusTier) || draftedPremier < 2),
  );
  const withoutRejected = identitySafe.filter(
    (card) => !rejected.has(card.playerIdentityId),
  );
  const preservesCompletion = (pool: PlayerTournamentCard[]) =>
    pool.length >= 5 &&
    hasDraftCompletionPath({
      cards: pool,
      formation,
      picks,
    });
  // Exposure history is a weighting signal, not an exclusion rule. Every
  // identity that remains legal for this round stays in the lottery. Respinned
  // identities remain excluded only when doing so preserves a completion path.
  const preferredPool = preservesCompletion(withoutRejected)
    ? withoutRejected
    : identitySafe;
  const rankingCards = shuffle(
    uniqueIdentityCards(preferredPool, random, rules),
    random,
  );
  const openGoalkeeperSlots = openSlots.filter(
    (slot) => slot.position === "GK",
  ).length;
  const openOutfieldSlots = openSlots.length - openGoalkeeperSlots;
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
    openSlots.some((slot) => placementPreservesMatching(player, slot)),
  );
  if (viable.length < 5) {
    throw new Error(
      `Not enough viable identity-safe cards for ${formation.name} round ${pickIndex + 1}`,
    );
  }

  const capableCounts = new Map(
    openSlots.map((slot) => [
      slot.id,
      new Set(
        rankingCards
          .filter((candidate) => isEligibleForSlot(candidate, slot))
          .map((candidate) => candidate.playerIdentityId),
      ).size,
    ]),
  );
  const rank = new Map(
    viable.map((card) => {
      const fits = openSlots.map((slot) => getPositionFit(card, slot));
      const need = openSlots.reduce(
        (score, slot) =>
          score +
          (isEligibleForSlot(card, slot)
            ? Math.max(0, 40 - (capableCounts.get(slot.id) ?? 0)) * 0.18
            : 0),
        0,
      );
      return [
        card.id,
        {
          best: Math.max(...fits),
          need:
            need +
            (card.primaryPosition === "GK" &&
            openSlots.some((slot) => slot.position === "GK")
              ? 18 + pickIndex
              : 0),
        },
      ] as const;
    }),
  );
  const shuffled = shuffle(viable, random);
  const ranked = shuffled.sort((first, second) => {
    const firstRank = rank.get(first.id)!;
    const secondRank = rank.get(second.id)!;
    return (
      seenCount(first.playerIdentityId) -
        seenCount(second.playerIdentityId) ||
      Number(recent.has(first.playerIdentityId)) -
        Number(recent.has(second.playerIdentityId)) ||
      Number(recentCards.has(first.id)) - Number(recentCards.has(second.id)) ||
      seenCardCount(first.id) - seenCardCount(second.id) ||
      secondRank.need - firstRank.need ||
      second.overall - first.overall ||
      secondRank.best - firstRank.best ||
      second.eligiblePositions.length - first.eligiblePositions.length
    );
  });

  const selected: PlayerTournamentCard[] = [];
  const add = (card: PlayerTournamentCard | undefined) => {
    if (
      selected.length < 5 &&
      card &&
      !selected.some(
        (candidate) => candidate.playerIdentityId === card.playerIdentityId,
      )
    ) {
      selected.push(card);
    }
  };
  const starterWeight = (card: PlayerTournamentCard) => {
    const cardRank = rank.get(card.id)!;
    const identitySeenPenalty =
      1 / (1 + seenCount(card.playerIdentityId) * 0.85);
    const recentIdentityPenalty = recent.has(card.playerIdentityId) ? 0.14 : 1;
    const cardSeenPenalty = 1 / (1 + seenCardCount(card.id) * 0.6);
    const recentCardPenalty = recentCards.has(card.id) ? 0.3 : 1;
    const tacticalBoost = 1 + Math.min(24, cardRank.need) / 32;
    const fitBoost = 0.82 + cardRank.best / 185;
    const qualityBoost = 1 + Math.max(0, card.overall - 78) * 0.024;
    return (
      identitySeenPenalty *
      recentIdentityPenalty *
      cardSeenPenalty *
      recentCardPenalty *
      tacticalBoost *
      fitBoost *
      qualityBoost
    );
  };
  const randomFromFullPool = (pool: PlayerTournamentCard[]) =>
    weightedChoice(pool, random, starterWeight);

  for (let index = 0; index < 5; index += 1) {
    const targetTier = weightedTier(random, starterTierWeights);
    const premierCount = selected.filter((card) =>
      ["legend", "icon"].includes(card.statusTier),
    ).length;
    const highCount = selected.filter((card) => card.overall >= 90).length;
    const strongCount = selected.filter((card) => card.overall >= 88).length;
    const available = (card: PlayerTournamentCard) =>
      !selected.some(
        (candidate) =>
          candidate.playerIdentityId === card.playerIdentityId,
      ) &&
      (card.overall < 90 || highCount < 2) &&
      (card.overall < 88 || strongCount < 3) &&
      (!["legend", "icon"].includes(card.statusTier) ||
        (premierOfferAllowed && premierCount < premierOfferCap));
    const tierPool = ranked.filter(
      (card) => card.statusTier === targetTier && available(card),
    );
    const fallbackPool = ranked.filter(available);
    add(randomFromFullPool(tierPool.length ? tierPool : fallbackPool));
  }

  const replacementCandidate = ({
    minimumOverall,
    outgoingIndex,
    predicate = () => true,
  }: {
    minimumOverall: number;
    outgoingIndex: number;
    predicate?: (card: PlayerTournamentCard) => boolean;
  }) => {
    const outgoing = selected[outgoingIndex];
    const highAfterRemoval =
      selected.filter((card) => card.overall >= 90).length -
      (outgoing.overall >= 90 ? 1 : 0);
    const strongAfterRemoval =
      selected.filter((card) => card.overall >= 88).length -
      (outgoing.overall >= 88 ? 1 : 0);
    const premierAfterRemoval =
      selected.filter((card) =>
        ["legend", "icon"].includes(card.statusTier),
      ).length -
      (["legend", "icon"].includes(outgoing.statusTier) ? 1 : 0);

    return randomFromFullPool(
      ranked.filter(
        (card) =>
          card.overall >= minimumOverall &&
          predicate(card) &&
          card.playerIdentityId !== outgoing.playerIdentityId &&
          !selected.some(
            (candidate, index) =>
              index !== outgoingIndex &&
              candidate.playerIdentityId === card.playerIdentityId,
          ) &&
          (card.overall < 90 || highAfterRemoval < 2) &&
          (card.overall < 88 || strongAfterRemoval < 3) &&
          (!["legend", "icon"].includes(card.statusTier) ||
            (premierOfferAllowed && premierAfterRemoval < premierOfferCap)),
      ),
    );
  };

  if (
    new Set(
      selected.map((card) => tacticalFamilyForPosition(card.primaryPosition)),
    ).size < 2
  ) {
    const currentFamily = tacticalFamilyForPosition(
      selected[0].primaryPosition,
    );
    const outgoingIndex = selected.length - 1;
    const replacement = replacementCandidate({
      minimumOverall: 0,
      outgoingIndex,
      predicate: (card) =>
        tacticalFamilyForPosition(card.primaryPosition) !== currentFamily,
    });
    if (replacement) selected[outgoingIndex] = replacement;
  }

  const replaceLowestBelow = (minimumOverall: number, desiredCount: number) => {
    while (
      selected.filter((card) => card.overall >= minimumOverall).length <
      desiredCount
    ) {
      const outgoingIndex = selected
        .map((card, index) => ({ card, index }))
        .filter(({ card }) => card.overall < minimumOverall)
        .sort((first, second) => first.card.overall - second.card.overall)[0]
        ?.index;
      if (outgoingIndex === undefined) break;

      const replacement = replacementCandidate({
        minimumOverall,
        outgoingIndex,
      });
      if (!replacement) break;
      selected[outgoingIndex] = replacement;
    }
  };

  // Every five-card offer should have a real decision at the top instead of
  // one obvious card and four throwaways. The floor rises slightly late in
  // the draft, but three slots remain free to be specialists or gambles.
  replaceLowestBelow(88, 1);
  replaceLowestBelow(pickIndex >= 7 ? 86 : 85, 2);

  // Avoid a frustrating end-state where the goalkeeper slot is still open and
  // the final few offers never surface one. This only kicks in late.
  if (
    openGoalkeeperSlots > 0 &&
    pickIndex >= 8 &&
    !selected.some((card) => card.primaryPosition === "GK")
  ) {
    const outgoingIndex = selected
      .map((card, index) => ({ card, index }))
      .filter(({ card }) => card.primaryPosition !== "GK")
      .sort((first, second) => first.card.overall - second.card.overall)[0]
      ?.index;
    if (outgoingIndex !== undefined) {
      const replacement = replacementCandidate({
        minimumOverall: 0,
        outgoingIndex,
        predicate: (card) => card.primaryPosition === "GK",
      });
      if (replacement) selected[outgoingIndex] = replacement;
    }
  }

  if (selected.length !== 5) {
    throw new Error("Player-first draft generation did not return five cards");
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
  const draftedBench = bench
    .map((pick) => byId.get(pick.cardId))
    .filter((card): card is PlayerTournamentCard => Boolean(card));
  const highCount = draftedBench.filter((card) => card.overall >= 90).length;
  const eliteCount = draftedBench.filter((card) => card.overall >= 86).length;
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
  // Bench exposure history also stays probabilistic rather than becoming a
  // hard filter. Respinned identities are only reintroduced when necessary.
  const eligible = withoutRejected.length >= 5 ? withoutRejected : identitySafe;
  const random = createSeededRandom(
    seed ^
      hashString(
        `bench-five:${round}:${rules.respinIndex ?? 0}:${[
          ...used,
        ].join(",")}`,
      ),
  );
  const ranked = shuffle(uniqueIdentityCards(eligible, random, rules), random).sort(
    (first, second) =>
      seenCount(first.playerIdentityId) -
        seenCount(second.playerIdentityId) ||
      Number(recent.has(first.playerIdentityId)) -
        Number(recent.has(second.playerIdentityId)) ||
      Number(recentCards.has(first.id)) - Number(recentCards.has(second.id)) ||
      seenCardCount(first.id) - seenCardCount(second.id) ||
      second.overall - first.overall,
  );
  const selected: PlayerTournamentCard[] = [];
  const add = (card: PlayerTournamentCard | undefined) => {
    if (
      selected.length < 5 &&
      card &&
      !selected.some(
        (candidate) => candidate.playerIdentityId === card.playerIdentityId,
      )
    ) {
      selected.push(card);
    }
  };
  const benchWeight = (card: PlayerTournamentCard) => {
    const identitySeenPenalty =
      1 / (1 + seenCount(card.playerIdentityId) * 0.8);
    const recentIdentityPenalty = recent.has(card.playerIdentityId) ? 0.16 : 1;
    const cardSeenPenalty = 1 / (1 + seenCardCount(card.id) * 0.55);
    const recentCardPenalty = recentCards.has(card.id) ? 0.32 : 1;
    const qualityBoost = 1 + Math.max(0, card.overall - 78) * 0.01;
    return (
      identitySeenPenalty *
      recentIdentityPenalty *
      cardSeenPenalty *
      recentCardPenalty *
      qualityBoost
    );
  };
  const randomFromFullPool = (pool: PlayerTournamentCard[]) =>
    weightedChoice(pool, random, benchWeight);
  for (let index = 0; index < 5; index += 1) {
    const targetTier = weightedTier(random, benchTierWeights);
    const selectedHigh = selected.filter((card) => card.overall >= 90).length;
    const selectedElite = selected.filter((card) => card.overall >= 86).length;
    const available = (card: PlayerTournamentCard) =>
      !selected.some(
        (candidate) =>
          candidate.playerIdentityId === card.playerIdentityId,
      ) &&
      (card.overall < 90 || selectedHigh < 1) &&
      (card.overall < 86 || selectedElite < 3);
    const tierPool = ranked.filter(
      (card) => card.statusTier === targetTier && available(card),
    );
    const fallbackPool = ranked.filter(available);
    add(randomFromFullPool(tierPool.length ? tierPool : fallbackPool));
  }
  if (!selected.some((card) => card.overall >= 85)) {
    const replacement = randomFromFullPool(
      ranked.filter(
        (card) =>
          card.overall >= 85 &&
          !selected.some(
            (candidate) =>
              candidate.playerIdentityId === card.playerIdentityId,
          ),
      ),
    );
    const replaceIndex = selected
      .map((card, index) => ({ card, index }))
      .sort((first, second) => first.card.overall - second.card.overall)[0]
      ?.index;
    if (replacement && replaceIndex !== undefined) {
      selected[replaceIndex] = replacement;
    }
  }
  if (
    new Set(
      selected.map((card) => tacticalFamilyForPosition(card.primaryPosition)),
    ).size < 2
  ) {
    const currentFamily = tacticalFamilyForPosition(
      selected[0].primaryPosition,
    );
    const outgoing = selected.at(-1);
    const replacement = randomFromFullPool(
      ranked.filter(
        (card) =>
          tacticalFamilyForPosition(card.primaryPosition) !== currentFamily &&
          !selected.some(
            (candidate) =>
              candidate.playerIdentityId === card.playerIdentityId,
          ) &&
          (card.overall < 90 ||
            selected.filter((candidate) => candidate.overall >= 90).length -
              (outgoing && outgoing.overall >= 90 ? 1 : 0) <
              1) &&
          (card.overall < 86 ||
            selected.filter((candidate) => candidate.overall >= 86).length -
              (outgoing && outgoing.overall >= 86 ? 1 : 0) <
              3),
      ),
    );
    if (replacement) selected[selected.length - 1] = replacement;
  }
  if (selected.length !== 5) {
    throw new Error("Not enough identity-safe bench options");
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