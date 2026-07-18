import { getFormation } from "@/data/formations";
import { worldCupAllStars } from "@/data/opponents/all-stars";
import { playersById } from "@/data/players";
import { calculateEraFit } from "@/data/eras";
import { calculateTeamRatings } from "@/engine/ratings";
import type {
  DraftEraId,
  PlayerTournamentCard,
  TeamRatings,
} from "@/types/game";

const cardsFor = (cardIds: readonly string[]) =>
  cardIds.map((cardId) => {
    const player = playersById.get(cardId);
    if (!player) throw new Error(`Missing World Cup All-Stars card ${cardId}`);
    return player;
  });

export const getWorldCupAllStarsLineup = () =>
  cardsFor(worldCupAllStars.allStars!.starterPicks.map((pick) => pick.cardId));

export const getWorldCupAllStarsBench = () =>
  cardsFor(worldCupAllStars.allStars!.substituteCardIds);

export const calculateWorldCupAllStarsEraFit = (eraId: DraftEraId) => {
  const profile = worldCupAllStars.allStars!;
  const formation = getFormation(worldCupAllStars.formation);
  const players = [
    ...getWorldCupAllStarsLineup(),
    ...getWorldCupAllStarsBench(),
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
): TeamRatings => {
  const profile = worldCupAllStars.allStars!;
  const formation = getFormation(worldCupAllStars.formation);
  const lineup = getWorldCupAllStarsLineup();
  const bench = getWorldCupAllStarsBench();
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
    eraFit: calculateWorldCupAllStarsEraFit(eraId),
    overall: bounded(base.overall, modifier.maximum),
  };
};

export const getAllStarsPlayerByIdentity = (identityId: string) =>
  [...getWorldCupAllStarsLineup(), ...getWorldCupAllStarsBench()].find(
    (player: PlayerTournamentCard) => player.playerIdentityId === identityId,
  );
