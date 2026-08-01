import { describe, expect, it } from "vitest";
import { landingChampions } from "@/data/landing-champions";

describe("landing champions", () => {
  it("keeps the winners gallery newest-first with unique sourced facts", () => {
    expect(landingChampions).toHaveLength(15);
    expect(
      landingChampions.map((champion) => champion.tournamentYear),
    ).toEqual([
      2026, 2022, 2018, 2014, 2010, 2006, 2002, 1998, 1994, 1990, 1986,
      1982, 1978, 1974, 1970,
    ]);
    expect(
      new Set(landingChampions.map((champion) => champion.championFact)).size,
    ).toBe(15);
    expect(
      landingChampions.slice(1).every(
        (champion) =>
          champion.championFact.length > 20 &&
          champion.championFactSource?.publisher === "FIFA" &&
          /^https:\/\/(?:www\.|inside\.|collect\.)?fifa\.com\//.test(
            champion.championFactSource?.url ?? "",
          ),
      ),
    ).toBe(true);
    expect(landingChampions[0]).toMatchObject({
      tournamentYear: 2026,
      nationCode: "ESP",
      nationName: "Spain",
      status: "confirmed",
      representativePlayer: "Lamine Yamal",
      representativePlayerCardId: "lamine-yamal-2026",
      representativeImage: "/players/game-faces/lamine-yamal-2026.png",
    });
    expect(
      landingChampions
        .every((champion) => champion.status === "confirmed"),
    ).toBe(true);
    expect(
      landingChampions.every(
        (champion) =>
          champion.representativePlayer.length > 2 &&
          champion.imagePosition.length > 2,
      ),
    ).toBe(true);
    expect(
      landingChampions.every(
        (champion) =>
          champion.representativeImage ===
          `/players/game-faces/${champion.representativePlayerCardId}.png`,
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
