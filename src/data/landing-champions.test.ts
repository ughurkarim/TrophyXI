import { describe, expect, it } from "vitest";
import { landingChampions } from "@/data/landing-champions";

describe("landing champions", () => {
  it("keeps all fourteen champions newest-first with unique sourced facts", () => {
    expect(landingChampions).toHaveLength(14);
    expect(
      landingChampions.map((champion) => champion.tournamentYear),
    ).toEqual([
      2022, 2018, 2014, 2010, 2006, 2002, 1998, 1994, 1990, 1986, 1982,
      1978, 1974, 1970,
    ]);
    expect(
      new Set(landingChampions.map((champion) => champion.championFact)).size,
    ).toBe(14);
    expect(
      landingChampions.every(
        (champion) =>
          champion.championFact.length > 20 &&
          champion.championFactSource.publisher === "FIFA" &&
          /^https:\/\/(?:www\.|inside\.|collect\.)?fifa\.com\//.test(
            champion.championFactSource.url,
          ),
      ),
    ).toBe(true);
    expect(
      landingChampions.some((champion) =>
        champion.championFact.includes(
          "Elite tournament structure with decisive transition threat",
        ),
      ),
    ).toBe(false);
  });
});
