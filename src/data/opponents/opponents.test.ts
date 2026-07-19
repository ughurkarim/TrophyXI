import { describe, expect, it } from "vitest";
import { formations } from "@/data/formations";
import {
  historicalOpponentArchive,
  historicalOpponents,
  matchOpponents,
  worldCupAllStars,
} from "@/data/opponents";
import { resolveWorldCupAllStars } from "@/engine/all-stars";
import { calculateOpponentEraFit } from "@/engine/era-translation";
import { WORLD_CUP_YEARS } from "@/types/game";

const expected = new Map([
  [2026, 48],
  [1970, 16],
  [1974, 16],
  [1978, 16],
  [1982, 24],
  [1986, 24],
  [1990, 24],
  [1994, 24],
  [1998, 32],
  [2002, 32],
  [2006, 32],
  [2010, 32],
  [2014, 32],
  [2018, 32],
  [2022, 32],
]);

describe("historical opponents", () => {
  it("keeps the 416-team research archive separate from the 14 champion match pool", () => {
    expect(historicalOpponentArchive).toHaveLength(416);
    expect(new Set(historicalOpponentArchive.map((opponent) => opponent.id)).size).toBe(
      416,
    );
    for (const year of WORLD_CUP_YEARS) {
      expect(
        historicalOpponentArchive.filter(
          (opponent) => opponent.tournamentYear === year,
        ),
      ).toHaveLength(expected.get(year)!);
    }
    expect(historicalOpponents).toHaveLength(14);
    expect(matchOpponents).toEqual([worldCupAllStars, ...historicalOpponents]);
  });

  it("keeps sourced facts separate from original models in the research archive", () => {
    const formationIds = new Set(formations.map((formation) => formation.id));
    for (const opponent of historicalOpponentArchive) {
      expect(opponent.sources.length).toBeGreaterThan(0);
      if (opponent.tournamentYear === 2026) {
        expect(opponent.tournamentStats.matches).toBeNull();
        expect(opponent.tournamentFinish).toBeNull();
      } else {
        expect(opponent.tournamentStats.matches).not.toBeNull();
      }
      expect(opponent.originalRatings).toBe(true);
      expect(opponent.formationIsModel).toBe(true);
      expect(formationIds.has(opponent.formation)).toBe(true);
    }
  });

  it("orders the research archive newest first and has no fabricated 2026 champion", () => {
    const years = historicalOpponentArchive.map(
      (opponent) => opponent.tournamentYear!,
    );
    expect(years).toEqual([...years].sort((first, second) => second - first));
    expect(
      historicalOpponentArchive.some(
        (opponent) =>
          opponent.tournamentYear === 2026 &&
          opponent.tournamentFinish === "champion",
      ),
    ).toBe(false);
  });

  it("gives every normal champion a sourced final XI, manager, roster, and fact", () => {
    const formationIds = new Set(formations.map((formation) => formation.id));
    expect(historicalOpponents.map((opponent) => opponent.tournamentYear)).toEqual([
      2022, 2018, 2014, 2010, 2006, 2002, 1998, 1994, 1990, 1986, 1982,
      1978, 1974, 1970,
    ]);
    for (const champion of historicalOpponents) {
      expect(champion.tournamentFinish).toBe("champion");
      expect(champion.dataStatus).toBe("verified-lineup");
      expect(champion.managerName).toBeTruthy();
      expect(champion.managerCardId).toBeTruthy();
      expect(champion.formationLabel).toBeTruthy();
      expect(formationIds.has(champion.formation)).toBe(true);
      expect(champion.startingLineup).toHaveLength(11);
      expect(champion.startingLineup.some((player) => player.position === "GK")).toBe(true);
      expect(champion.substitutes.length).toBeGreaterThanOrEqual(3);
      expect(champion.championFact).toBeTruthy();
      expect(champion.championFactSource?.url).toMatch(/^https:/);
      const squad = [...champion.startingLineup, ...champion.substitutes];
      expect(new Set(squad.map((player) => player.playerIdentityId)).size).toBe(
        squad.length,
      );
      expect(squad.every((player) => player.sourcePlayerId && player.rating)).toBe(true);
    }
  });

  it("defines a unique, modeled, Mythic World Cup All-Stars squad", () => {
    expect(worldCupAllStars.difficulty).toBe("Mythic");
    expect(worldCupAllStars.startingLineup).toHaveLength(11);
    expect(worldCupAllStars.substitutes).toHaveLength(3);
    const identities = [
      ...worldCupAllStars.startingLineup,
      ...worldCupAllStars.substitutes,
    ].map((player) => player.playerIdentityId);
    expect(new Set(identities).size).toBe(14);
    expect(worldCupAllStars.allStars?.manager.compositeLabel).toBe(
      "Trophy XI original composite manager.",
    );
  });

  it("resolves a complete World Cup XI around identities already drafted", () => {
    const excluded = new Set([
      "lionel-messi",
      "ronaldo",
      "manuel-neuer",
      "paolo-maldini",
    ]);
    const resolved = resolveWorldCupAllStars(excluded);
    const identities = [
      ...resolved.startingLineup,
      ...resolved.substitutes,
    ].map((player) => player.playerIdentityId);

    expect(resolved.startingLineup).toHaveLength(11);
    expect(resolved.substitutes).toHaveLength(3);
    expect(new Set(identities).size).toBe(14);
    expect(identities.every((identity) => !excluded.has(identity))).toBe(true);
  });

  it("translates historical teams deterministically and bidirectionally", () => {
    const brazil1970 = historicalOpponents.find(
      (opponent) => opponent.id === "brazil-1970",
    )!;
    const france2018 = historicalOpponents.find(
      (opponent) => opponent.id === "france-2018",
    )!;
    expect(calculateOpponentEraFit(brazil1970, "2020s")).toBe(
      calculateOpponentEraFit(brazil1970, "2020s"),
    );
    expect(calculateOpponentEraFit(brazil1970, "2020s")).toBeLessThan(
      calculateOpponentEraFit(brazil1970, "1970s"),
    );
    expect(calculateOpponentEraFit(france2018, "1970s")).toBeLessThan(
      calculateOpponentEraFit(france2018, "2010s"),
    );
    expect(calculateOpponentEraFit(brazil1970, "all")).toBe(98);
  });
});
