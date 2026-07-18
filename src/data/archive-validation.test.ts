import { describe, expect, it } from "vitest";
import { draftEras } from "@/data/eras";
import { managers } from "@/data/managers";
import { imageAttributions } from "@/data/player-images";
import { players } from "@/data/players";
import { generateManagerOptions } from "@/engine/draft";

describe("expanded archive contracts", () => {
  it("keeps the exact card and role targets", () => {
    const defenders = ["LB", "LCB", "CB", "RCB", "RB", "LWB", "RWB"];
    const midfielders = ["DM", "CM", "AM", "LM", "RM"];
    const attackers = ["LW", "RW", "CF", "ST"];
    expect(players).toHaveLength(240);
    expect(new Set(players.map((player) => player.playerIdentityId)).size).toBe(
      228,
    );
    expect(
      players.filter((player) => player.primaryPosition === "GK"),
    ).toHaveLength(28);
    expect(
      players.filter((player) => defenders.includes(player.primaryPosition)),
    ).toHaveLength(70);
    expect(
      players.filter((player) => midfielders.includes(player.primaryPosition)),
    ).toHaveLength(75);
    expect(
      players.filter((player) => attackers.includes(player.primaryPosition)),
    ).toHaveLength(67);
  });

  it("covers every tournament, confederation, and quality band", () => {
    expect(
      new Set(players.map((player) => player.tournamentYear)),
    ).toEqual(new Set([1998, 2002, 2006, 2010, 2014, 2018, 2022]));
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
    expect(imageAttributions).toHaveLength(268);
    expect(
      imageAttributions.filter((image) => !image.fallback),
    ).toHaveLength(1);
  });

  it("produces three new manager identities after a respin in every era", () => {
    for (const era of draftEras) {
      const first = generateManagerOptions(managers, era.id, 4404);
      const rejected = first.map((manager) => manager.managerIdentityId);
      const second = generateManagerOptions(managers, era.id, 4404, rejected, 1);
      expect(first).toHaveLength(3);
      expect(second).toHaveLength(3);
      expect(
        second.every(
          (manager) => !rejected.includes(manager.managerIdentityId),
        ),
      ).toBe(true);
    }
  });
});
