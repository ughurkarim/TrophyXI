import { getPositionFit } from "@/engine/draft";
import { hashString } from "@/engine/random";
import type {
  BenchPick,
  DraftPick,
  Formation,
  FormationSlot,
  PlayerTournamentCard,
  Position,
} from "@/types/game";

export const MIN_RANDOM_POSITION_FIT = 80;

export type FreeSelectionRosterImpactInput = {
  playerOverall: number;
  positionFit: number;
  overallGain: number;
  chemistryGain: number;
  managerFitGain: number;
  eraFit: number | null;
  versatility: number;
  isBench: boolean;
};

/**
 * @deprecated UI ranking should compare the projected `calculateTeamRatings`
 * result directly. Kept for compatibility with older callers/tests.
 *
 * Manager fit and era fit are intentionally not scored independently here:
 * both already flow through the game-wide Chemistry -> Squad OVR pipeline.
 */
export const scoreFreeSelectionRosterImpact = ({
  playerOverall,
  positionFit,
  overallGain,
  chemistryGain,
  managerFitGain: _managerFitGain,
  eraFit: _eraFit,
  versatility,
  isBench,
}: FreeSelectionRosterImpactInput) => {
  void _managerFitGain;
  void _eraFit;
  return (
    overallGain * 1_000 +
    chemistryGain * 5 +
    playerOverall +
    (isBench ? versatility * 0.8 : positionFit * 0.08)
  );
};

export type FreeSelectionSquad = {
  picks: DraftPick[];
  benchPicks: [BenchPick, BenchPick, BenchPick];
};

export type FreeSelectionSquadInput = {
  formation: Formation;
  cards: PlayerTournamentCard[];
  seed: number;
  excludedIdentityIds?: Iterable<string>;
};

type CoverageFamily = "defensive" | "midfield" | "attacking";
const BENCH_PAIR_CANDIDATE_LIMIT = 240;

const defensivePositions: Position[] = [
  "LB",
  "LCB",
  "CB",
  "RCB",
  "RB",
  "LWB",
  "RWB",
  "DM",
];
const midfieldPositions: Position[] = ["DM", "CM", "AM", "LM", "RM"];
const attackingPositions: Position[] = ["AM", "LM", "RM", "LW", "RW", "CF", "ST"];

const deterministicRank = (seed: number, context: string, cardId: string) =>
  hashString(`${seed}:${context}:${cardId}`);

const coverageFamiliesByCard = new WeakMap<
  PlayerTournamentCard,
  Set<CoverageFamily>
>();

const coverageFamiliesFor = (player: PlayerTournamentCard) => {
  const cached = coverageFamiliesByCard.get(player);
  if (cached) return cached;
  const positions = new Set([
    player.primaryPosition,
    ...player.eligiblePositions,
  ]);
  const families = new Set<CoverageFamily>();
  if ([...positions].some((position) => defensivePositions.includes(position))) {
    families.add("defensive");
  }
  if ([...positions].some((position) => midfieldPositions.includes(position))) {
    families.add("midfield");
  }
  if ([...positions].some((position) => attackingPositions.includes(position))) {
    families.add("attacking");
  }
  coverageFamiliesByCard.set(player, families);
  return families;
};

const uniqueCards = (cards: PlayerTournamentCard[]) =>
  [...new Map(cards.map((card) => [card.id, card])).values()];

const starterCandidatesFor = (
  slot: FormationSlot,
  cards: PlayerTournamentCard[],
  seed: number,
) =>
  cards
    .map((card) => ({ card, fit: getPositionFit(card, slot) }))
    .filter(({ card, fit }) => {
      if (slot.position === "GK") {
        return card.primaryPosition === "GK" && fit === 100;
      }
      return card.primaryPosition !== "GK" && fit >= MIN_RANDOM_POSITION_FIT;
    })
    .sort(
      (first, second) =>
        second.fit - first.fit ||
        deterministicRank(seed, `starter:${slot.id}`, second.card.id) -
          deterministicRank(seed, `starter:${slot.id}`, first.card.id) ||
        second.card.overall - first.card.overall ||
        first.card.id.localeCompare(second.card.id),
    );

const assignStrongStarters = ({
  formation,
  cards,
  seed,
}: {
  formation: Formation;
  cards: PlayerTournamentCard[];
  seed: number;
}) => {
  const slots = formation.slots.map((slot) => ({
    slot,
    candidates: starterCandidatesFor(slot, cards, seed),
  }));
  const impossible = slots.find(({ candidates }) => candidates.length === 0);
  if (impossible) {
    throw new Error(
      `No strong identity-safe candidate is available for ${impossible.slot.label}`,
    );
  }

  const assignmentOrder = [...slots].sort(
    (first, second) =>
      new Set(
        first.candidates.map(({ card }) => card.playerIdentityId),
      ).size -
        new Set(
          second.candidates.map(({ card }) => card.playerIdentityId),
        ).size ||
      (first.slot.position === "GK" ? -1 : 0) -
        (second.slot.position === "GK" ? -1 : 0) ||
      first.slot.id.localeCompare(second.slot.id),
  );
  const usedIdentityIds = new Set<string>();
  const assignedBySlot = new Map<string, PlayerTournamentCard>();

  const assign = (index: number): boolean => {
    if (index === assignmentOrder.length) return true;
    const { slot, candidates } = assignmentOrder[index];
    for (const { card } of candidates) {
      if (usedIdentityIds.has(card.playerIdentityId)) continue;
      usedIdentityIds.add(card.playerIdentityId);
      assignedBySlot.set(slot.id, card);
      if (assign(index + 1)) return true;
      assignedBySlot.delete(slot.id);
      usedIdentityIds.delete(card.playerIdentityId);
    }
    return false;
  };

  if (!assign(0)) {
    throw new Error(
      `The supplied cards cannot fill ${formation.name} with strong unique-identity assignments`,
    );
  }
  return { assignedBySlot, usedIdentityIds };
};

const bestVersionByIdentity = (
  cards: PlayerTournamentCard[],
  usedIdentityIds: Set<string>,
  seed: number,
) => {
  const best = new Map<string, PlayerTournamentCard>();
  for (const card of cards) {
    if (
      card.primaryPosition === "GK" ||
      usedIdentityIds.has(card.playerIdentityId)
    ) {
      continue;
    }
    const previous = best.get(card.playerIdentityId);
    if (!previous) {
      best.set(card.playerIdentityId, card);
      continue;
    }
    const cardCoverage = coverageFamiliesFor(card).size;
    const previousCoverage = coverageFamiliesFor(previous).size;
    if (
      cardCoverage > previousCoverage ||
      (cardCoverage === previousCoverage &&
        card.eligiblePositions.length > previous.eligiblePositions.length) ||
      (cardCoverage === previousCoverage &&
        card.eligiblePositions.length === previous.eligiblePositions.length &&
        deterministicRank(seed, "bench-version", card.id) >
          deterministicRank(seed, "bench-version", previous.id))
    ) {
      best.set(card.playerIdentityId, card);
    }
  }
  return [...best.values()];
};

const chooseOutfieldBenchPair = (
  cards: PlayerTournamentCard[],
  usedIdentityIds: Set<string>,
  seed: number,
) => {
  const candidates = bestVersionByIdentity(cards, usedIdentityIds, seed)
    .sort(
      (first, second) =>
        coverageFamiliesFor(second).size -
          coverageFamiliesFor(first).size ||
        second.eligiblePositions.length - first.eligiblePositions.length ||
        second.overall - first.overall ||
        deterministicRank(seed, "bench-candidate", second.id) -
          deterministicRank(seed, "bench-candidate", first.id) ||
        first.id.localeCompare(second.id),
    )
    .slice(0, BENCH_PAIR_CANDIDATE_LIMIT);
  let best:
    | {
        first: PlayerTournamentCard;
        second: PlayerTournamentCard;
        score: number;
      }
    | undefined;

  for (let firstIndex = 0; firstIndex < candidates.length; firstIndex += 1) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < candidates.length;
      secondIndex += 1
    ) {
      const first = candidates[firstIndex];
      const second = candidates[secondIndex];
      const combinedFamilies = new Set([
        ...coverageFamiliesFor(first),
        ...coverageFamiliesFor(second),
      ]);
      const distinctPrimaryFamilies =
        coverageFamiliesFor(first).size > 0 &&
        coverageFamiliesFor(second).size > 0 &&
        [...coverageFamiliesFor(first)].some(
          (family) => !coverageFamiliesFor(second).has(family),
        );
      const positionCoverage = new Set([
        first.primaryPosition,
        ...first.eligiblePositions,
        second.primaryPosition,
        ...second.eligiblePositions,
      ]).size;
      const pairId = [first.id, second.id].sort().join("|");
      const score =
        combinedFamilies.size * 1_000_000 +
        (distinctPrimaryFamilies ? 100_000 : 0) +
        positionCoverage * 1_000 +
        (first.overall + second.overall) * 10 +
        (deterministicRank(seed, "bench-pair", pairId) % 1_000);
      if (!best || score > best.score) {
        best = { first, second, score };
      }
    }
  }

  if (!best) {
    throw new Error("Two unique outfield substitutes are required");
  }
  const attackingValue = (card: PlayerTournamentCard) =>
    (coverageFamiliesFor(card).has("attacking") ? 10_000 : 0) +
    card.attributes.attack * 10 +
    card.attributes.creativity;
  return [best.first, best.second].sort(
    (first, second) =>
      attackingValue(second) - attackingValue(first) ||
      deterministicRank(seed, "bench-order", second.id) -
        deterministicRank(seed, "bench-order", first.id),
  ) as [PlayerTournamentCard, PlayerTournamentCard];
};

const chooseFlexibleThirdSubstitute = (
  cards: PlayerTournamentCard[],
  usedIdentityIds: Set<string>,
  selectedOutfield: [PlayerTournamentCard, PlayerTournamentCard],
  seed: number,
) => {
  const coveredFamilies = new Set(
    selectedOutfield.flatMap((player) => [...coverageFamiliesFor(player)]),
  );
  const bestByIdentity = new Map<string, PlayerTournamentCard>();
  for (const card of cards) {
    if (usedIdentityIds.has(card.playerIdentityId)) continue;
    const previous = bestByIdentity.get(card.playerIdentityId);
    if (
      !previous ||
      card.eligiblePositions.length > previous.eligiblePositions.length ||
      (card.eligiblePositions.length === previous.eligiblePositions.length &&
        card.overall > previous.overall)
    ) {
      bestByIdentity.set(card.playerIdentityId, card);
    }
  }
  const candidate = [...bestByIdentity.values()].sort((first, second) => {
    const firstFamilies = coverageFamiliesFor(first);
    const secondFamilies = coverageFamiliesFor(second);
    const firstAdded = [...firstFamilies].filter(
      (family) => !coveredFamilies.has(family),
    ).length;
    const secondAdded = [...secondFamilies].filter(
      (family) => !coveredFamilies.has(family),
    ).length;
    return (
      secondAdded - firstAdded ||
      secondFamilies.size - firstFamilies.size ||
      second.eligiblePositions.length - first.eligiblePositions.length ||
      second.overall - first.overall ||
      deterministicRank(seed, "bench-third", second.id) -
        deterministicRank(seed, "bench-third", first.id) ||
      first.id.localeCompare(second.id)
    );
  })[0];
  if (!candidate) {
    throw new Error("A third unique substitute is required");
  }
  return candidate;
};

export const generateFreeSelectionSquad = ({
  formation,
  cards,
  seed,
  excludedIdentityIds = [],
}: FreeSelectionSquadInput): FreeSelectionSquad => {
  if (formation.slots.length !== 11) {
    throw new Error("Free Selection requires an eleven-player formation");
  }
  if (
    formation.slots.filter((slot) => slot.position === "GK").length !== 1
  ) {
    throw new Error("Free Selection requires exactly one goalkeeper slot");
  }

  const excluded = new Set(excludedIdentityIds);
  const eligibleCards = uniqueCards(cards).filter(
    (card) =>
      card.isDraftEligible && !excluded.has(card.playerIdentityId),
  );
  const { assignedBySlot, usedIdentityIds } = assignStrongStarters({
    formation,
    cards: eligibleCards,
    seed,
  });
  const [firstOutfield, secondOutfield] = chooseOutfieldBenchPair(
    eligibleCards,
    usedIdentityIds,
    seed,
  );
  usedIdentityIds.add(firstOutfield.playerIdentityId);
  usedIdentityIds.add(secondOutfield.playerIdentityId);
  const thirdSubstitute = chooseFlexibleThirdSubstitute(
    eligibleCards,
    usedIdentityIds,
    [firstOutfield, secondOutfield],
    seed,
  );

  const picks = formation.slots.map((slot) => ({
    slotId: slot.id,
    cardId: assignedBySlot.get(slot.id)!.id,
  }));
  const benchPicks: [BenchPick, BenchPick, BenchPick] = [
    { slotId: "bench-1", cardId: firstOutfield.id },
    { slotId: "bench-2", cardId: secondOutfield.id },
    { slotId: "bench-3", cardId: thirdSubstitute.id },
  ];
  return { picks, benchPicks };
};

export const generateRandomSquad = generateFreeSelectionSquad;
