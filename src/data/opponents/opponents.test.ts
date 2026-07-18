import { describe, expect, it } from "vitest";
import { formations } from "@/data/formations";
import { historicalOpponents } from "@/data/opponents/generated";
import { calculateOpponentEraFit } from "@/engine/era-translation";
import { WORLD_CUP_YEARS } from "@/types/game";

const expected = new Map([
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
  it("represents every verified participant from 1970 through 2022", () => {
    expect(historicalOpponents).toHaveLength(368);
    expect(new Set(historicalOpponents.map((opponent) => opponent.id)).size).toBe(
      368,
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
      expect(opponent.tournamentStats.matches).not.toBeNull();
      expect(opponent.originalRatings).toBe(true);
      expect(opponent.formationIsModel).toBe(true);
      expect(formationIds.has(opponent.formation)).toBe(true);
    }
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
