import { describe, expect, it } from "vitest";
import { draftEras } from "@/data/eras";
import { draftEligibleManagers, managers } from "@/data/managers";
import { imageAttributions } from "@/data/player-images";
import { draftEligiblePlayers, players } from "@/data/players";
import { PLAYER_WORLD_CUP_YEARS } from "@/types/game";
import { generateManagerOptions } from "@/engine/draft";

describe("expanded archive contracts", () => {
  it("keeps the exact card and role targets", () => {
    const defenders = ["LB", "LCB", "CB", "RCB", "RB", "LWB", "RWB"];
    const midfielders = ["DM", "CM", "AM", "LM", "RM"];
    const attackers = ["LW", "RW", "CF", "ST"];
    expect(players).toHaveLength(310);
    expect(new Set(players.map((player) => player.playerIdentityId)).size).toBe(
      287,
    );
    expect(
      players.filter((player) => player.primaryPosition === "GK"),
    ).toHaveLength(35);
    expect(
      players.filter((player) => defenders.includes(player.primaryPosition)),
    ).toHaveLength(83);
    expect(
      players.filter((player) => midfielders.includes(player.primaryPosition)),
    ).toHaveLength(99);
    expect(
      players.filter((player) => attackers.includes(player.primaryPosition)),
    ).toHaveLength(93);
  });

  it("covers every tournament, confederation, and quality band", () => {
    expect(
      new Set(players.map((player) => player.tournamentYear)),
    ).toEqual(new Set(PLAYER_WORLD_CUP_YEARS));
    expect(new Set(players.map((player) => player.confederation))).toEqual(
      new Set(["UEFA", "CONMEBOL", "CONCACAF", "CAF", "AFC", "OFC"]),
    );
    expect(
      players.filter((player) => player.confederation === "OFC").length,
    ).toBeGreaterThanOrEqual(5);
    expect(new Set(players.map((player) => player.qualityBand))).toEqual(
      new Set([
        "iconic",
        "elite",
        "standout",
        "reliable",
        "role-player",
        "limited",
      ]),
    );
  });

  it("keeps research records inactive and every playable record photo-backed", () => {
    expect(managers).toHaveLength(28);
    expect(new Set(managers.map((manager) => manager.managerIdentityId)).size).toBe(
      22,
    );
    expect(draftEligiblePlayers).toHaveLength(51);
    expect(draftEligibleManagers).toHaveLength(10);
    expect(imageAttributions).toHaveLength(61);
    expect(imageAttributions.every((image) => !image.fallback)).toBe(true);
    expect(
      imageAttributions.every(
        (image) =>
          image.sourcePage &&
          image.sourceFile &&
          image.author &&
          image.license &&
          image.licenseUrl,
      ),
    ).toBe(true);
    expect(
      players
        .filter((player) => !player.isDraftEligible)
        .every((player) => player.draftIneligibilityReason),
    ).toBe(true);
  });

  it("enforces the active rating and status distribution", () => {
    expect(Math.max(...draftEligiblePlayers.map((player) => player.overall))).toBe(
      96,
    );
    expect(
      draftEligiblePlayers.filter((player) => player.overall >= 94),
    ).toHaveLength(1);
    expect(
      draftEligiblePlayers.filter((player) => player.overall >= 92).length,
    ).toBeLessThanOrEqual(3);
    expect(
      draftEligiblePlayers.filter((player) => player.overall >= 90).length,
    ).toBeLessThanOrEqual(6);
    expect(
      draftEligiblePlayers.filter((player) => player.overall < 81).length,
    ).toBeGreaterThanOrEqual(18);
    expect(
      draftEligiblePlayers.filter((player) => player.overall < 76).length,
    ).toBeGreaterThanOrEqual(8);
    expect(
      new Set(draftEligiblePlayers.map((player) => player.statusTier)),
    ).toEqual(
      new Set([
        "legend",
        "icon",
        "elite",
        "standout",
        "reliable",
        "role-player",
        "limited",
      ]),
    );
  });

  it("produces three deterministic manager identities in every environment", () => {
    for (const era of draftEras) {
      const first = generateManagerOptions(
        draftEligibleManagers,
        era.id,
        4404,
      );
      expect(first).toHaveLength(3);
      expect(
        generateManagerOptions(draftEligibleManagers, era.id, 4404),
      ).toEqual(first);
      expect(first.every((manager) => manager.isDraftEligible)).toBe(true);
    }
  });
});
