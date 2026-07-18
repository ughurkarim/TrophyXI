import { describe, expect, it } from "vitest";
import { formations } from "@/data/formations";
import { historicalOpponents, worldCupAllStars } from "@/data/opponents";
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
  it("represents every sourced participant from 1970 through 2026", () => {
    expect(historicalOpponents).toHaveLength(416);
    expect(new Set(historicalOpponents.map((opponent) => opponent.id)).size).toBe(
      416,
    );
    for (const year of WORLD_CUP_YEARS) {
      expect(
        historicalOpponents.filter(
          (opponent) => opponent.tournamentYear === year,
        ),
      ).toHaveLength(expected.get(year)!);
    }
  });

  it("keeps sourced facts separate from original models", () => {
    const formationIds = new Set(formations.map((formation) => formation.id));
    for (const opponent of historicalOpponents) {
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

  it("orders tournaments newest first and has no fabricated 2026 champion", () => {
    const years = historicalOpponents.map(
      (opponent) => opponent.tournamentYear!,
    );
    expect(years).toEqual([...years].sort((first, second) => second - first));
    expect(
      historicalOpponents.some(
        (opponent) =>
          opponent.tournamentYear === 2026 &&
          opponent.tournamentFinish === "champion",
      ),
    ).toBe(false);
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
