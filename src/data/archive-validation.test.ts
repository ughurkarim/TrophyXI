import { describe, expect, it } from "vitest";
import { draftEras } from "@/data/eras";
import { managers } from "@/data/managers";
import { imageAttributions } from "@/data/player-images";
import { players } from "@/data/players";
import { WORLD_CUP_YEARS } from "@/types/game";
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
    ).toEqual(new Set(WORLD_CUP_YEARS));
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

  it("keeps image and manager manifests complete", () => {
    expect(managers).toHaveLength(28);
    expect(new Set(managers.map((manager) => manager.managerIdentityId)).size).toBe(
      22,
    );
    expect(imageAttributions).toHaveLength(338);
    expect(
      imageAttributions.filter((image) => !image.fallback),
    ).toHaveLength(4);
  });

  it("produces three deterministic manager identities in every environment", () => {
    for (const era of draftEras) {
      const first = generateManagerOptions(managers, era.id, 4404);
      expect(first).toHaveLength(3);
      expect(generateManagerOptions(managers, era.id, 4404)).toEqual(first);
    }
  });
});
