import { formations } from "@/data/formations";
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

const starterTierWeights: Record<PlayerStatusTier, number> = {
  legend: 0.015,
  icon: 0.055,
  elite: 0.13,
  standout: 0.255,
  reliable: 0.285,
  "role-player": 0.2,
  limited: 0.06,
};

const benchTierWeights: Record<PlayerStatusTier, number> = {
  legend: 0.0025,
  icon: 0.0175,
  elite: 0.075,
  standout: 0.2,
  reliable: 0.335,
  "role-player": 0.28,
  limited: 0.09,
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

/**
 * Position Fit is deterministic and intentionally broad for outfield players.
 * Goalkeepers never cross the outfield boundary. Exact, related, declared,
 * accepted, same-line, adjacent-line, and distant-line fits descend monotonically.
 */
export const getPositionFit = (
  player: PlayerTournamentCard,
  slot: FormationSlot,
) => {
  if (player.primaryPosition === "GK" || slot.position === "GK") {
    return player.primaryPosition === "GK" && slot.position === "GK" ? 100 : 0;
  }
  if (player.primaryPosition === slot.position) return 100;
  if (shareStrongFamily(player.primaryPosition, slot.position)) return 94;
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
  respinIndex?: number;
};

const usedIdentityIdsFor = (
  cards: PlayerTournamentCard[],
  picks: Array<DraftPick | BenchPick>,
) => {
  const byId = new Map(cards.map((card) => [card.id, card]));
  return new Set(
    picks
      .map((pick) => byId.get(pick.cardId)?.playerIdentityId)
      .filter((id): id is string => Boolean(id)),
  );
};

const uniqueIdentityCards = (
  cards: PlayerTournamentCard[],
  random: ReturnType<typeof createSeededRandom>,
) => {
  const grouped = new Map<string, PlayerTournamentCard[]>();
  for (const card of cards) {
    const group = grouped.get(card.playerIdentityId) ?? [];
    group.push(card);
    grouped.set(card.playerIdentityId, group);
  }
  return [...grouped.values()].map((versions) => shuffle(versions, random)[0]);
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
  const versionsByIdentity = new Map<string, PlayerTournamentCard[]>();
  for (const card of cards) {
    if (used.has(card.playerIdentityId) || excluded.has(card.playerIdentityId)) {
      continue;
    }
    const versions = versionsByIdentity.get(card.playerIdentityId) ?? [];
    versions.push(card);
    versionsByIdentity.set(card.playerIdentityId, versions);
  }
  // The current fit graph has two disconnected components: goalkeeper and
  // outfield. Every outfield identity has a legal (possibly red) edge to every
  // outfield slot, so this is the exact maximum-matching result without running
  // augmenting-path recursion hundreds of times during offer ranking.
  const goalkeeperSlots = openSlots.filter(
    (slot) => slot.position === "GK",
  ).length;
  const outfieldSlots = openSlots.length - goalkeeperSlots;
  const goalkeeperIdentities = new Set(
    [...versionsByIdentity.entries()]
      .filter(([, versions]) =>
        versions.some((player) => player.primaryPosition === "GK"),
      )
      .map(([identity]) => identity),
  ).size;
  const outfieldIdentities = versionsByIdentity.size - goalkeeperIdentities;
  return (
    goalkeeperIdentities >= goalkeeperSlots &&
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
  const draftedCards = picks
    .map((pick) => cards.find((card) => card.id === pick.cardId))
    .filter((card): card is PlayerTournamentCard => Boolean(card));
  const draftedHigh = draftedCards.filter((card) => card.overall >= 90).length;
  const draftedPremier = draftedCards.filter((card) =>
    ["legend", "icon"].includes(card.statusTier),
  ).length;
  const budgetRoll =
    (Math.abs(hashString(`starter-tier-budget:${seed}:${formation.id}`)) %
      10_000) /
    10_000;
  const highBudget = budgetRoll < 0.58 ? 0 : budgetRoll < 0.9 ? 1 : 2;
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
  const preferredPool =
    withoutRejected.length >= 5 &&
    hasDraftCompletionPath({
      cards: withoutRejected,
      formation,
      picks,
    })
      ? withoutRejected
      : identitySafe;
  const uniqueCards = uniqueIdentityCards(preferredPool, random);
  const openGoalkeeperSlots = openSlots.filter(
    (slot) => slot.position === "GK",
  ).length;
  const openOutfieldSlots = openSlots.length - openGoalkeeperSlots;
  const remainingGoalkeeperIdentities = uniqueCards.filter(
    (player) => player.primaryPosition === "GK",
  ).length;
  const remainingOutfieldIdentities =
    uniqueCards.length - remainingGoalkeeperIdentities;
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
  const viable = uniqueCards.filter((player) =>
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
        uniqueCards
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
      secondRank.need - firstRank.need ||
      secondRank.best - firstRank.best ||
      Math.abs(80 - first.overall) - Math.abs(80 - second.overall) ||
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
  for (let index = 0; index < 5; index += 1) {
    const targetTier = weightedTier(random, starterTierWeights);
    const premierCount = selected.filter((card) =>
      ["legend", "icon"].includes(card.statusTier),
    ).length;
    const highCount = selected.filter((card) => card.overall >= 90).length;
    const available = (card: PlayerTournamentCard) =>
      !selected.some(
        (candidate) =>
          candidate.playerIdentityId === card.playerIdentityId,
      ) &&
      (card.overall < 90 || highCount < 2) &&
      (!["legend", "icon"].includes(card.statusTier) || premierCount < 2);
    add(
      ranked.find(
        (card) => card.statusTier === targetTier && available(card),
      ) ?? ranked.find(available),
    );
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
    const highAfterRemoval =
      selected.filter((card) => card.overall >= 90).length -
      (outgoing && outgoing.overall >= 90 ? 1 : 0);
    const premierAfterRemoval =
      selected.filter((card) =>
        ["legend", "icon"].includes(card.statusTier),
      ).length -
      (outgoing && ["legend", "icon"].includes(outgoing.statusTier) ? 1 : 0);
    const replacement = ranked.find(
      (card) =>
        tacticalFamilyForPosition(card.primaryPosition) !== currentFamily &&
        (card.overall < 90 || highAfterRemoval < 2) &&
        (!["legend", "icon"].includes(card.statusTier) ||
          premierAfterRemoval < 2) &&
        !selected.some(
          (candidate) =>
            candidate.playerIdentityId === card.playerIdentityId,
        ),
    );
    if (replacement) selected[selected.length - 1] = replacement;
  }
  if (selected.length !== 5) {
    throw new Error("Player-first draft generation did not return five cards");
  }
  return selected;
};

export const generateManagerOptions = (
  cards: ManagerTournamentCard[],
  eraId: DraftEraId,
  seed: number,
  excludedIdentityIds: Iterable<string> = [],
  respinIndex = 0,
) => {
  const excluded = new Set(excludedIdentityIds);
  const eligible = cards.filter(
    (manager) => !excluded.has(manager.managerIdentityId),
  );
  const random = createSeededRandom(
    seed ^ hashString(`manager:${eraId}:${respinIndex}`),
  );
  const seen = new Set<string>();
  const unique = shuffle(eligible, random).filter((manager) => {
    if (seen.has(manager.managerIdentityId)) return false;
    seen.add(manager.managerIdentityId);
    return true;
  });
  if (unique.length < 5) {
    throw new Error(`Not enough manager identities for ${eraId}`);
  }
  return unique.slice(0, 5);
};

export type FormationOfferRules = {
  offerIndex?: number;
  respinIndex?: number;
  originalFormationIds?: FormationId[];
  excludedFormationIds?: Iterable<FormationId>;
};

export const generateFormationOffer = (
  manager: ManagerTournamentCard,
  eraId: DraftEraId,
  seed: number,
  count = 4,
  rules: FormationOfferRules = {},
): FormationId[] => {
  const excluded = new Set(rules.excludedFormationIds ?? []);
  const available =
    formations.filter((formation) => !excluded.has(formation.id)).length >= count
      ? formations.filter((formation) => !excluded.has(formation.id))
      : formations;
  const random = createSeededRandom(
    seed ^
      hashString(
        `formations:${manager.id}:${eraId}:${rules.offerIndex ?? 0}:${rules.respinIndex ?? 0}:${(
          rules.originalFormationIds ?? []
        ).join("|")}`,
      ),
  );
  const preferred = shuffle(
    available.filter((formation) =>
      manager.preferredFormations.includes(formation.id),
    ),
    random,
  );
  const balanced = shuffle(
    available.filter(
      (formation) =>
        formation.tendencies.attack >= 78 &&
        formation.tendencies.defense >= 78 &&
        !preferred.some((item) => item.id === formation.id),
    ),
    random,
  );
  const contrasting = shuffle(
    available.filter(
      (formation) =>
        Math.abs(formation.tendencies.attack - formation.tendencies.defense) >=
          10 &&
        !preferred.some((item) => item.id === formation.id),
    ),
    random,
  );
  const eraStrong = shuffle(
    available.filter((formation) => formation.eraStrengths.includes(eraId)),
    random,
  );
  const selected: FormationId[] = [];
  const add = (formation: Formation | undefined) => {
    if (formation && !selected.includes(formation.id)) {
      selected.push(formation.id);
    }
  };
  add(preferred[0]);
  add(balanced[0]);
  add(contrasting[0]);
  add(eraStrong.find((formation) => !selected.includes(formation.id)));
  for (const formation of shuffle(available, random)) {
    if (selected.length >= count) break;
    add(formation);
  }
  return selected.slice(0, count);
};

export const generateFormationRespin = (
  manager: ManagerTournamentCard,
  eraId: DraftEraId,
  seed: number,
  originalFormationIds: FormationId[],
) =>
  generateFormationOffer(manager, eraId, seed, 4, {
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
  const byId = new Map(cards.map((card) => [card.id, card]));
  const draftedBench = bench
    .map((pick) => byId.get(pick.cardId))
    .filter((card): card is PlayerTournamentCard => Boolean(card));
  const highCount = draftedBench.filter((card) => card.overall >= 90).length;
  const eliteCount = draftedBench.filter((card) => card.overall >= 86).length;
  const below82Count = draftedBench.filter((card) => card.overall < 82).length;
  const below78Count = draftedBench.filter((card) => card.overall < 78).length;
  const roundsRemaining = 3 - bench.length;
  const mustChooseBelow82 = 2 - below82Count >= roundsRemaining;
  const mustChooseBelow78 = 1 - below78Count >= roundsRemaining;
  const identitySafe = cards.filter(
    (card) =>
      !used.has(card.playerIdentityId) &&
      !excluded.has(card.playerIdentityId) &&
      (card.overall < 90 || highCount < 1) &&
      (card.overall < 86 || eliteCount < 2) &&
      (!mustChooseBelow82 || card.overall < 82) &&
      (!mustChooseBelow78 || card.overall < 78),
  );
  const withoutRejected = identitySafe.filter(
    (card) => !rejected.has(card.playerIdentityId),
  );
  const eligible = withoutRejected.length >= 5 ? withoutRejected : identitySafe;
  const random = createSeededRandom(
    seed ^
      hashString(
        `bench-five:${round}:${rules.respinIndex ?? 0}:${[
          ...used,
        ].join(",")}`,
      ),
  );
  const ranked = shuffle(uniqueIdentityCards(eligible, random), random).sort(
    (first, second) =>
      Math.abs(78 - first.overall) - Math.abs(78 - second.overall) ||
      Math.abs(2 - first.eligiblePositions.length) -
        Math.abs(2 - second.eligiblePositions.length),
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
      (card.overall < 86 || selectedElite < 2);
    add(
      ranked.find(
        (card) => card.statusTier === targetTier && available(card),
      ) ?? ranked.find(available),
    );
  }
  const replaceHighestWith = (
    predicate: (card: PlayerTournamentCard) => boolean,
  ) => {
    const replacement = ranked.find(
      (card) =>
        predicate(card) &&
        !selected.some(
          (candidate) =>
            candidate.playerIdentityId === card.playerIdentityId,
        ),
    );
    if (!replacement) return;
    const replaceIndex = selected
      .map((card, index) => ({ card, index }))
      .filter(({ card }) => !predicate(card))
      .sort((first, second) => second.card.overall - first.card.overall)[0]
      ?.index;
    if (replaceIndex !== undefined) selected[replaceIndex] = replacement;
  };
  while (selected.filter((card) => card.overall < 82).length < 2) {
    const previous = selected.map((card) => card.id).join("|");
    replaceHighestWith((card) => card.overall < 82);
    if (previous === selected.map((card) => card.id).join("|")) break;
  }
  if (!selected.some((card) => card.overall < 78)) {
    replaceHighestWith((card) => card.overall < 78);
  }
  if (
    !selected.some(
      (card) =>
        card.eligiblePositions.length <= 2 ||
        card.eligiblePositions.length >= 4,
    )
  ) {
    replaceHighestWith(
      (card) =>
        card.overall < 86 &&
        (card.eligiblePositions.length <= 2 ||
          card.eligiblePositions.length >= 4),
    );
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
  const byId = new Map(cards.map((card) => [card.id, card]));
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
  const byId = new Map(cards.map((card) => [card.id, card]));
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
