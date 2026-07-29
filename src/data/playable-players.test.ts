import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  identityFallbackPlayerImages,
  playerImages,
} from "@/data/player-images";
import {
  draftEligiblePlayers,
  getPlayablePlayerCardIds,
  getPlayablePlayers,
} from "@/data/players";
import { worldCupAllStars } from "@/data/opponents";
import { playerSeedSchema } from "@/lib/validation";
import type {
  PlayerAttributes,
  TournamentStatLine,
} from "@/types/game";

const attributeKeys = [
  "attack",
  "creativity",
  "control",
  "defense",
  "physical",
  "goalkeeping",
  "clutch",
] as const satisfies ReadonlyArray<keyof PlayerAttributes>;

const tournamentStatKeys = [
  "appearances",
  "starts",
  "minutes",
  "goals",
  "assists",
  "cleanSheets",
  "saves",
  "goalsConceded",
  "penaltiesSaved",
] as const satisfies ReadonlyArray<keyof TournamentStatLine>;

describe("active playable player-card pool", () => {
  it("derives one deduplicated active pool from draft-eligible cards", () => {
    const playablePlayers = getPlayablePlayers();
    const playableIds = playablePlayers.map((player) => player.id);
    const draftEligibleIds = draftEligiblePlayers.map((player) => player.id);
    const playableIdSet = getPlayablePlayerCardIds();

    expect(playablePlayers).not.toBe(getPlayablePlayers());
    expect(playableIds).toHaveLength(new Set(playableIds).size);
    expect(draftEligibleIds).toHaveLength(new Set(draftEligibleIds).size);
    expect(new Set(playableIds)).toEqual(new Set(draftEligibleIds));
    expect(playableIdSet).toEqual(new Set(playableIds));
  });

  it("keeps every playable card and gameplay-stat block schema-valid", () => {
    const playablePlayers = getPlayablePlayers();
    const result = playerSeedSchema.safeParse(playablePlayers);

    expect(
      result.success,
      result.success ? undefined : result.error.message,
    ).toBe(true);

    for (const player of playablePlayers) {
      expect(Object.keys(player.attributes).sort()).toEqual(
        [...attributeKeys].sort(),
      );
      for (const key of attributeKeys) {
        expect(Number.isInteger(player.attributes[key])).toBe(true);
        expect(player.attributes[key]).toBeGreaterThanOrEqual(1);
        expect(player.attributes[key]).toBeLessThanOrEqual(99);
      }

      expect(Object.keys(player.tournamentStats).sort()).toEqual(
        [...tournamentStatKeys].sort(),
      );
      for (const key of tournamentStatKeys) {
        const value = player.tournamentStats[key];
        expect(
          value === null || (Number.isInteger(value) && value >= 0),
        ).toBe(true);
      }
    }
  });

  it("keeps every fixed World Cup All-Stars player in the active pool", () => {
    const playableIds = getPlayablePlayerCardIds();
    const allStarsIds = [
      ...(worldCupAllStars.allStars?.starterPicks.map(
        (pick) => pick.cardId,
      ) ?? []),
      ...(worldCupAllStars.allStars?.substituteCardIds ?? []),
    ];

    expect(allStarsIds).toHaveLength(14);
    expect(allStarsIds.every((cardId) => playableIds.has(cardId))).toBe(true);
  });

  it("exposes only exact, playable, card-specific runtime player images", () => {
    const playableById = new Map(
      getPlayablePlayers().map((player) => [player.id, player]),
    );

    expect(identityFallbackPlayerImages).toEqual([]);
    expect(playerImages.map((image) => image.id)).toHaveLength(
      new Set(playerImages.map((image) => image.id)).size,
    );

    for (const image of playerImages) {
      const player = playableById.get(image.id);
      expect(player, `${image.id} is not playable`).toBeDefined();
      expect(image).toMatchObject({
        kind: "player",
        tournamentYear: player?.tournamentYear,
        file: `/players/game-faces/${image.id}.png`,
        fallback: false,
        exactTournamentImage: true,
      });
      expect(
        existsSync(resolve(process.cwd(), "public", image.file.slice(1))),
        `${image.id} is registered without its exact local PNG`,
      ).toBe(true);
    }
  });

  it("leaves cards with missing exact images draftable as Photo Pending", () => {
    const playablePlayers = getPlayablePlayers();
    const imageIds = new Set(playerImages.map((image) => image.id));
    const missingImagePlayers = playablePlayers.filter(
      (player) => !imageIds.has(player.id),
    );

    expect(missingImagePlayers.length).toBeGreaterThan(0);
    expect(missingImagePlayers).toHaveLength(
      playablePlayers.length - imageIds.size,
    );
    expect(
      missingImagePlayers.every(
        (player) =>
          player.isDraftEligible &&
          player.draftIneligibilityReason === null,
      ),
    ).toBe(true);
  });

  it("keeps Siphiwe Tshabalala's 2010 card playable without inventing a face", () => {
    const cardId = "siphiwe-tshabalala-2010";
    const player = getPlayablePlayers().find(
      (candidate) => candidate.id === cardId,
    );

    expect(player).toMatchObject({
      id: cardId,
      playerIdentityId: "siphiwe-tshabalala",
      playerName: "Siphiwe Tshabalala",
      countryCode: "RSA",
      countryName: "South Africa",
      confederation: "CAF",
      tournamentYear: 2010,
      primaryPosition: "LW",
      eligiblePositions: ["LW", "RM"],
      overall: 73,
      isDraftEligible: true,
      draftIneligibilityReason: null,
      tournamentStats: {
        appearances: 3,
        starts: 3,
        goals: 1,
      },
      imageId: cardId,
    });
    expect(getPlayablePlayerCardIds().has(cardId)).toBe(true);
    expect(playerImages.some((image) => image.id === cardId)).toBe(false);
    expect(
      existsSync(
        resolve(process.cwd(), "public", "players", "game-faces", `${cardId}.png`),
      ),
    ).toBe(false);
  });
});
