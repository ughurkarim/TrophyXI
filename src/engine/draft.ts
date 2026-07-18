import { formations } from "@/data/formations";
import { createSeededRandom, hashString, shuffle } from "@/engine/random";
import type {
  BenchPick,
  DraftEraId,
  DraftPick,
  Formation,
  FormationSlot,
  FormationId,
  ManagerTournamentCard,
  PlayerTournamentCard,
  Position,
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

const shareStrongFamily = (first: Position, second: Position) =>
  strongPositionFamilies.some(
    (family) => family.includes(first) && family.includes(second),
  );

export const getPositionFit = (
  player: PlayerTournamentCard,
  slot: FormationSlot,
) => {
  if (player.primaryPosition === slot.position) return 100;
  if (shareStrongFamily(player.primaryPosition, slot.position)) return 94;
  if (player.eligiblePositions.includes(slot.position)) return 88;
  if (slot.accepts.includes(player.primaryPosition)) return 80;
  if (
    player.eligiblePositions.some((position) => slot.accepts.includes(position))
  ) {
    return 68;
  }
  return 0;
};

export const isEligibleForSlot = (
  player: PlayerTournamentCard,
  slot: FormationSlot,
) => getPositionFit(player, slot) >= 68;

export type DraftGenerationRules = {
  excludedIdentityIds?: Iterable<string>;
  rejectedIdentityIds?: Iterable<string>;
  respinIndex?: number;
};

export const generateDraftOptions = (
  cards: PlayerTournamentCard[],
  slot: FormationSlot,
  draftedIds: string[],
  seed: number,
  pickIndex: number,
  rules: DraftGenerationRules = {},
): PlayerTournamentCard[] => {
  const draftedCardIds = new Set(draftedIds);
  const draftedIdentityIds = new Set(
    cards
      .filter((card) => draftedCardIds.has(card.id))
      .map((card) => card.playerIdentityId),
  );
  const excludedIdentityIds = new Set(rules.excludedIdentityIds ?? []);
  const rejectedIdentityIds = new Set(rules.rejectedIdentityIds ?? []);
  const identitySafe = cards.filter(
    (card) =>
      !draftedCardIds.has(card.id) &&
      !draftedIdentityIds.has(card.playerIdentityId) &&
      !excludedIdentityIds.has(card.playerIdentityId) &&
      isEligibleForSlot(card, slot),
  );
  const withoutRejected = identitySafe.filter(
    (card) => !rejectedIdentityIds.has(card.playerIdentityId),
  );
  const eligible = withoutRejected.length >= 3 ? withoutRejected : identitySafe;
  if (eligible.length < 3) {
    throw new Error(`Not enough identity-safe eligible cards for ${slot.label}`);
  }
  const random = createSeededRandom(
    seed ^
      hashString(
        `${slot.id}:${pickIndex}:${rules.respinIndex ?? 0}:${draftedIds.join(",")}`,
      ),
  );
  return shuffle(eligible, random).slice(0, 3);
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
  const unique = eligible.filter(
    (manager, index) =>
      eligible.findIndex(
        (candidate) =>
          candidate.managerIdentityId === manager.managerIdentityId,
      ) === index,
  );
  if (unique.length < 3) {
    throw new Error(`Not enough manager identities for ${eraId}`);
  }
  return shuffle(
    unique,
    createSeededRandom(seed ^ hashString(`manager:${eraId}:${respinIndex}`)),
  ).slice(0, 3);
};

export const generateFormationOffer = (
  manager: ManagerTournamentCard,
  eraId: DraftEraId,
  seed: number,
  count = 4,
): FormationId[] => {
  const random = createSeededRandom(
    seed ^ hashString(`formations:${manager.id}:${eraId}`),
  );
  const preferred = shuffle(
    formations.filter((formation) =>
      manager.preferredFormations.includes(formation.id),
    ),
    random,
  );
  const balanced = shuffle(
    formations.filter(
      (formation) =>
        formation.tendencies.attack >= 78 &&
        formation.tendencies.defense >= 78 &&
        !preferred.some((item) => item.id === formation.id),
    ),
    random,
  );
  const contrasting = shuffle(
    formations.filter(
      (formation) =>
        Math.abs(formation.tendencies.attack - formation.tendencies.defense) >=
          10 &&
        !preferred.some((item) => item.id === formation.id),
    ),
    random,
  );
  const eraStrong = shuffle(
    formations.filter((formation) => formation.eraStrengths.includes(eraId)),
    random,
  );
  const selected: FormationId[] = [];
  const add = (formation: Formation | undefined) => {
    if (formation && !selected.includes(formation.id)) selected.push(formation.id);
  };
  add(preferred[0]);
  add(balanced[0]);
  add(contrasting[0]);
  add(eraStrong.find((formation) => !selected.includes(formation.id)));
  for (const formation of shuffle(formations, random)) {
    if (selected.length >= count) break;
    add(formation);
  }
  return selected.slice(0, count);
};

const tacticalFamily = (player: PlayerTournamentCard) => {
  if (player.primaryPosition === "GK") return "goalkeeper";
  if (
    ["LB", "LCB", "CB", "RCB", "RB", "LWB", "RWB", "DM"].includes(
      player.primaryPosition,
    )
  ) {
    return "defensive";
  }
  if (["CM", "AM", "LM", "RM"].includes(player.primaryPosition)) {
    return "midfield";
  }
  return "attacking";
};

export const generateBenchOptions = (
  cards: PlayerTournamentCard[],
  starters: DraftPick[],
  bench: BenchPick[],
  seed: number,
  round: number,
  rules: DraftGenerationRules = {},
) => {
  const usedCardIds = new Set([
    ...starters.map((pick) => pick.cardId),
    ...bench.map((pick) => pick.cardId),
  ]);
  const usedIdentityIds = new Set(
    cards
      .filter((card) => usedCardIds.has(card.id))
      .map((card) => card.playerIdentityId),
  );
  const excluded = new Set(rules.excludedIdentityIds ?? []);
  const rejected = new Set(rules.rejectedIdentityIds ?? []);
  const identitySafe = cards.filter(
    (card) =>
      !usedCardIds.has(card.id) &&
      !usedIdentityIds.has(card.playerIdentityId) &&
      !excluded.has(card.playerIdentityId),
  );
  const withoutRejected = identitySafe.filter(
    (card) => !rejected.has(card.playerIdentityId),
  );
  const eligible = withoutRejected.length >= 3 ? withoutRejected : identitySafe;
  const random = createSeededRandom(
    seed ^
      hashString(
        `bench:${round}:${rules.respinIndex ?? 0}:${[
          ...usedIdentityIds,
        ].join(",")}`,
      ),
  );
  const ranked = shuffle(eligible, random).sort((a, b) => {
    const versatility =
      b.eligiblePositions.length - a.eligiblePositions.length;
    return versatility * 2 + (b.overall - a.overall) * 0.1;
  });
  const selected: PlayerTournamentCard[] = [];
  const add = (card: PlayerTournamentCard | undefined) => {
    if (
      card &&
      !selected.some(
        (candidate) => candidate.playerIdentityId === card.playerIdentityId,
      )
    ) {
      selected.push(card);
    }
  };
  add(ranked.find((card) => tacticalFamily(card) === "attacking"));
  add(ranked.find((card) => tacticalFamily(card) === "defensive"));
  add(
    ranked.find(
      (card) =>
        card.eligiblePositions.length >= 3 &&
        !selected.some(
          (candidate) => candidate.playerIdentityId === card.playerIdentityId,
        ),
    ),
  );
  for (const card of ranked) {
    if (selected.length >= 3) break;
    add(card);
  }
  if (selected.length !== 3) {
    throw new Error("Not enough identity-safe bench options");
  }
  return selected;
};

export const getOpenSlots = (formation: Formation, picks: DraftPick[]) => {
  const filled = new Set(picks.map((pick) => pick.slotId));
  return formation.slots.filter((slot) => !filled.has(slot.id));
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
