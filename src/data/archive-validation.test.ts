import { describe, expect, it } from "vitest";
import { draftEras } from "@/data/eras";
import { draftEligibleManagers, managers } from "@/data/managers";
import {
  gameFacePathFor,
  imageAttributions,
  imagesById,
  managerImages,
  playerImages,
} from "@/data/player-images";
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

  it("keeps every valid player draftable with real or pending photo status", () => {
    expect(managers).toHaveLength(28);
    expect(new Set(managers.map((manager) => manager.managerIdentityId)).size).toBe(
      22,
    );
    expect(draftEligiblePlayers).toHaveLength(310);
    expect(draftEligibleManagers).toHaveLength(28);
    expect(imageAttributions).toHaveLength(0);
    expect(playerImages).toHaveLength(0);
    expect(managerImages).toHaveLength(0);
    expect(players.every((player) => player.isDraftEligible)).toBe(true);
    expect(
      players.every((player) => player.draftIneligibilityReason === null),
    ).toBe(true);
    expect(
      players.filter((player) => !imagesById.has(player.imageId)),
    ).toHaveLength(310);
  });

  it("enforces the 99 cap and broad tournament-card rating distribution", () => {
    expect(Math.max(...draftEligiblePlayers.map((player) => player.overall))).toBe(
      99,
    );
    expect(
      draftEligiblePlayers
        .filter((player) => player.overall === 99)
        .map((player) => player.id),
    ).toEqual(["pele-1970", "diego-maradona-1986", "lionel-messi-2022"]);
    expect(
      draftEligiblePlayers.filter((player) => player.overall >= 95).length,
    ).toBeLessThanOrEqual(20);
    expect(
      draftEligiblePlayers.filter((player) => player.overall >= 90).length,
    ).toBeLessThan(draftEligiblePlayers.length * 0.3);
    expect(
      draftEligiblePlayers.filter((player) => player.overall < 80).length,
    ).toBeGreaterThanOrEqual(100);
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

  it("keeps tournament versions on independent image keys", () => {
    const messi = players.filter(
      (player) => player.playerIdentityId === "lionel-messi",
    );
    const ronaldo = players.filter(
      (player) => player.playerIdentityId === "ronaldo",
    );
    expect(messi.map((player) => player.imageId)).toEqual([
      "lionel-messi-2014",
      "lionel-messi-2022",
    ]);
    expect(ronaldo.map((player) => player.imageId)).toEqual([
      "ronaldo-2002",
      "ronaldo-1998",
    ]);
    expect(imagesById.has("lionel-messi-2014")).toBe(false);
    expect(imagesById.has("lionel-messi-2022")).toBe(false);
    expect(gameFacePathFor("player", "lionel-messi-2014")).toBe(
      "/players/game-faces/lionel-messi-2014.png",
    );
    expect(gameFacePathFor("player", "lionel-messi-2022")).toBe(
      "/players/game-faces/lionel-messi-2022.png",
    );
    expect(gameFacePathFor("manager", "lionel-scaloni-2022")).toBe(
      "/managers/game-faces/lionel-scaloni-2022.png",
    );
    expect(messi.every((player) => player.isDraftEligible)).toBe(true);
  });

  it("stores sourced career accolades and curated Top 100 independently", () => {
    const messi = players.find((player) => player.id === "lionel-messi-2022")!;
    expect(messi.top100Player).toBe(true);
    expect(messi.top100Source).toMatchObject({
      listName: "Trophy XI Curated Top 100",
      year: 2026,
    });
    expect(messi.careerAccolades).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "World Cup Golden Ball",
          count: 2,
        }),
        expect.objectContaining({
          label: "Champions League Winner",
          count: 4,
        }),
      ]),
    );
    expect(
      players.some((player) => player.top100Player && player.overall < 90),
    ).toBe(true);
  });

  it("produces five deterministic manager identities in every environment", () => {
    for (const era of draftEras) {
      const first = generateManagerOptions(
        draftEligibleManagers,
        era.id,
        4404,
      );
      expect(first).toHaveLength(5);
      expect(
        generateManagerOptions(draftEligibleManagers, era.id, 4404),
      ).toEqual(first);
      expect(first.every((manager) => manager.isDraftEligible)).toBe(true);
    }
  });
});
