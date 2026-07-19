import { getFormation } from "@/data/formations";
import { worldCupAllStars } from "@/data/opponents/all-stars";
import { draftEligiblePlayers, playersById } from "@/data/players";
import { calculateEraFit } from "@/data/eras";
import { calculateTeamRatings } from "@/engine/ratings";
import type {
  DraftEraId,
  FormationSlot,
  HistoricalWorldCupTeam,
  PlayerTournamentCard,
  TeamRatings,
} from "@/types/game";

const cardsFor = (cardIds: readonly string[]) =>
  cardIds.map((cardId) => {
    const player = playersById.get(cardId);
    if (!player) throw new Error(`Missing World Cup All-Stars card ${cardId}`);
    return player;
  });

const canFillSlot = (
  player: PlayerTournamentCard,
  slot: FormationSlot,
) =>
  slot.accepts.includes(player.primaryPosition) ||
  player.eligiblePositions.some((position) => slot.accepts.includes(position));

const slotScore = (
  player: PlayerTournamentCard,
  slot: FormationSlot,
) =>
  player.overall * 100 +
  (player.primaryPosition === slot.position ? 40 : 0) +
  (slot.accepts.includes(player.primaryPosition) ? 20 : 0) +
  player.attributes.clutch * 0.1 +
  player.tournamentYear * 0.0001;

/**
 * World Cup XI remains a fourteen-identity opponent even when the user's squad
 * contains one of its preferred names. Only a conflicting identity is replaced;
 * the formation, difficulty, and ordinary simulation path stay unchanged.
 */
export const resolveWorldCupAllStars = (
  excludedIdentityIds: Iterable<string>,
): HistoricalWorldCupTeam => {
  const excluded = new Set(excludedIdentityIds);
  const selected = new Set<string>();
  const profile = worldCupAllStars.allStars!;
  const formation = getFormation(worldCupAllStars.formation);

  const starterPicks = profile.starterPicks.map((preferredPick) => {
    const slot = formation.slots.find(
      (candidate) => candidate.id === preferredPick.slotId,
    );
    if (!slot) {
      throw new Error(`Missing World Cup All-Stars slot ${preferredPick.slotId}`);
    }
    const preferred = playersById.get(preferredPick.cardId);
    const player =
      preferred &&
      !excluded.has(preferred.playerIdentityId) &&
      !selected.has(preferred.playerIdentityId) &&
      canFillSlot(preferred, slot)
        ? preferred
        : [...draftEligiblePlayers]
            .filter(
              (candidate) =>
                !excluded.has(candidate.playerIdentityId) &&
                !selected.has(candidate.playerIdentityId) &&
                canFillSlot(candidate, slot),
            )
            .sort(
              (first, second) =>
                slotScore(second, slot) - slotScore(first, slot),
            )[0];
    if (!player) {
      throw new Error(`No identity-safe World Cup XI option for ${slot.label}`);
    }
    selected.add(player.playerIdentityId);
    return { slotId: slot.id, cardId: player.id };
  });

  const preferredBench = cardsFor(profile.substituteCardIds);
  const substituteCards = Array.from({ length: 3 }, (_, index) => {
    const preferred = preferredBench[index];
    const player =
      !excluded.has(preferred.playerIdentityId) &&
      !selected.has(preferred.playerIdentityId)
        ? preferred
        : [...draftEligiblePlayers]
            .filter(
              (candidate) =>
                candidate.primaryPosition !== "GK" &&
                !excluded.has(candidate.playerIdentityId) &&
                !selected.has(candidate.playerIdentityId),
            )
            .sort(
              (first, second) =>
                second.overall - first.overall ||
                second.attributes.clutch - first.attributes.clutch ||
                second.tournamentYear - first.tournamentYear,
            )[0];
    if (!player) {
      throw new Error("No identity-safe World Cup XI substitute available");
    }
    selected.add(player.playerIdentityId);
    return player;
  });
  const substituteCardIds = substituteCards.map((player) => player.id) as [
    string,
    string,
    string,
  ];
  const starterCards = cardsFor(starterPicks.map((pick) => pick.cardId));
  const rationales = Object.fromEntries(
    [...starterCards, ...substituteCards].map((player) => [
      player.id,
      profile.rationales[player.id] ??
        `${player.playerName}'s ${player.tournamentYear} version preserves an identity-safe World Cup XI.`,
    ]),
  );

  return {
    ...worldCupAllStars,
    startingLineup: starterPicks.map((pick) => {
      const player = playersById.get(pick.cardId)!;
      const slot = formation.slots.find(
        (candidate) => candidate.id === pick.slotId,
      )!;
      return {
        playerIdentityId: player.playerIdentityId,
        name: `${player.playerName} ${player.tournamentYear}`,
        position: slot.position,
      };
    }),
    substitutes: substituteCards.map((player) => ({
      playerIdentityId: player.playerIdentityId,
      name: `${player.playerName} ${player.tournamentYear}`,
      position: player.primaryPosition,
    })),
    allStars: {
      ...profile,
      starterPicks,
      substituteCardIds,
      rationales,
    },
  };
};

export const getWorldCupAllStarsLineup = (
  opponent: HistoricalWorldCupTeam = worldCupAllStars,
) =>
  cardsFor(opponent.allStars!.starterPicks.map((pick) => pick.cardId));

export const getWorldCupAllStarsBench = (
  opponent: HistoricalWorldCupTeam = worldCupAllStars,
) => cardsFor(opponent.allStars!.substituteCardIds);

export const calculateWorldCupAllStarsEraFit = (
  eraId: DraftEraId,
  opponent: HistoricalWorldCupTeam = worldCupAllStars,
) => {
  const profile = opponent.allStars!;
  const formation = getFormation(opponent.formation);
  const players = [
    ...getWorldCupAllStarsLineup(opponent),
    ...getWorldCupAllStarsBench(opponent),
  ];
  const playerAverage =
    players.reduce(
      (sum, player) =>
        sum +
        calculateEraFit(player, eraId, {
          manager: profile.manager,
          formation,
        }),
      0,
    ) / players.length;
  const managerFit =
    eraId === "all"
      ? 98
      : Math.max(
          88,
          profile.manager.eraAdaptability -
            Math.abs(profile.manager.tournamentYear - Number(eraId.slice(0, 4))) *
              0.08,
        );
  return Math.round(playerAverage * 0.86 + managerFit * 0.14);
};

const capRating = (value: number) => Math.round(Math.min(99, value));

export const calculateWorldCupAllStarsRatings = (
  eraId: DraftEraId,
  opponent: HistoricalWorldCupTeam = worldCupAllStars,
): TeamRatings => {
  const profile = opponent.allStars!;
  const formation = getFormation(opponent.formation);
  const lineup = getWorldCupAllStarsLineup(opponent);
  const bench = getWorldCupAllStarsBench(opponent);
  const base = calculateTeamRatings(lineup, formation, {
    picks: profile.starterPicks,
    manager: profile.manager,
    eraId,
    bench,
  });
  const modifier = profile.mythicModifier;
  const bounded = (value: number, boost: number) =>
    capRating(value + Math.min(modifier.maximum, boost));
  return {
    ...base,
    attack: bounded(base.attack, modifier.attack),
    midfield: bounded(base.midfield, modifier.midfield),
    defense: bounded(base.defense, modifier.defense),
    chemistry: Math.min(99, Math.max(base.chemistry, profile.chemistry)),
    eraFit: calculateWorldCupAllStarsEraFit(eraId, opponent),
    overall: bounded(base.overall, modifier.maximum),
  };
};

export const getAllStarsPlayerByIdentity = (identityId: string) =>
  [...getWorldCupAllStarsLineup(), ...getWorldCupAllStarsBench()].find(
    (player: PlayerTournamentCard) => player.playerIdentityId === identityId,
  );
