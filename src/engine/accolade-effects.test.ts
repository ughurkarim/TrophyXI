import { describe, expect, it } from "vitest";
import { playersById } from "@/data/players";
import {
  calculatePlayerAccoladeEffect,
  calculatePlayerLegacyScore,
  calculateSquadAccoladeEffect,
  classifyAccolade,
  getPlayerAccoladeItems,
} from "@/engine/accolade-effects";

const playerWithChampionCount = (count: number) => {
  const base = playersById.get("olivier-giroud-2018")!;
  const source = base.careerAccolades.find(
    (accolade) =>
      accolade.label === "World Cup Winner — 2018" ||
      accolade.label === "World Cup Champion",
  )!;
  return {
    ...base,
    playerIdentityId: "accolade-effect-test-player",
    achievements: [],
    top100Player: false,
    careerAccolades: [{ ...source, count }],
  };
};

describe("accolade effects", () => {
  it("sorts the supported accolade hierarchy and keeps Top 100 last", () => {
    const player = playersById.get("lionel-messi-2022")!;
    const items = getPlayerAccoladeItems(player);
    expect(items.map((item) => item.priority)).toEqual(
      [...items.map((item) => item.priority)].sort(
        (first, second) => first - second,
      ),
    );
    expect(items.at(-1)?.label).toBe("TOP 100 PLAYER");
  });

  it("classifies international, club, league, cup, and individual honors", () => {
    expect(classifyAccolade("Copa América Champion", "international"))
      .toBe("continental-international");
    expect(classifyAccolade("Champions League Winner", "continental"))
      .toBe("continental-club");
    expect(classifyAccolade("Premier League Champion", "domestic-league"))
      .toBe("domestic-league");
    expect(classifyAccolade("Domestic Cup Winner", "domestic-cup"))
      .toBe("domestic-cup");
    expect(classifyAccolade("La Liga Best Player", "domestic-league"))
      .toBe("league-individual");
    expect(classifyAccolade("FIFA World Cup Silver Ball", "individual"))
      .toBe("international-individual");
  });

  it("is deterministic and gives repeated trophies diminishing returns", () => {
    const one = calculatePlayerLegacyScore(playerWithChampionCount(1));
    const two = calculatePlayerLegacyScore(playerWithChampionCount(2));
    const three = calculatePlayerLegacyScore(playerWithChampionCount(3));
    expect(calculatePlayerLegacyScore(playerWithChampionCount(3))).toBe(three);
    expect(two).toBeGreaterThan(one);
    expect(three).toBeGreaterThan(two);
    expect(two - one).toBeGreaterThanOrEqual(three - two);
  });

  it("caps both player and total squad effects", () => {
    const decorated = playerWithChampionCount(256);
    const playerEffect = calculatePlayerAccoladeEffect(decorated);
    expect(playerEffect.chemistry).toBeLessThanOrEqual(1.6);
    expect(playerEffect.leadership).toBeLessThanOrEqual(2);
    expect(playerEffect.quality).toBeLessThanOrEqual(1.6);

    const squadEffect = calculateSquadAccoladeEffect(
      Array.from({ length: 40 }, (_, index) => ({
        ...decorated,
        id: `${decorated.id}-${index}`,
      })),
    );
    expect(squadEffect.chemistry).toBeLessThanOrEqual(3);
    expect(squadEffect.leadership).toBeLessThanOrEqual(3);
    expect(squadEffect.attack).toBeLessThanOrEqual(1.8);
    expect(squadEffect.midfield).toBeLessThanOrEqual(1.8);
    expect(squadEffect.defense).toBeLessThanOrEqual(1.8);
    expect(squadEffect.quality).toBeLessThanOrEqual(1.8);
  });
});
