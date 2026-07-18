import { describe, expect, it } from "vitest";
import { spain2010 } from "@/data/champions";
import { getFormation } from "@/data/formations";
import { managersById } from "@/data/managers";
import { simulateMatch } from "@/engine/simulation";
import { testLineup } from "@/engine/ratings.test";

const input = {
  lineup: testLineup,
  formation: getFormation("4-3-3"),
  opponent: spain2010,
  seed: 8675309,
} as const;

describe("match simulation", () => {
  it("is deterministic for an identical seed", () => {
    expect(simulateMatch(input)).toEqual(simulateMatch(input));
  });

  it("creates realistic bounded match statistics and a final whistle", () => {
    const result = simulateMatch(input);
    expect(result.score.user).toBeLessThanOrEqual(6);
    expect(result.score.opponent).toBeLessThanOrEqual(6);
    expect(result.stats.possession[0] + result.stats.possession[1]).toBe(100);
    expect(result.stats.shotsOnTarget[0]).toBeLessThanOrEqual(result.stats.shots[0]);
    expect(result.events.at(-1)?.type).toBe("fulltime");
  });

  it("resolves a forced 90-minute tie through extra time", () => {
    const result = simulateMatch({ ...input, knockoutMode: "force-extra-time" });
    expect(result.score.afterExtraTime).toBe(true);
    expect(result.events.some((event) => event.type === "extra-time")).toBe(true);
  });

  it("resolves a forced extra-time tie on penalties", () => {
    const result = simulateMatch({ ...input, knockoutMode: "force-penalties" });
    expect(result.score.penalties).toBeDefined();
    expect(result.score.penalties?.[0]).not.toBe(result.score.penalties?.[1]);
    expect(result.events.some((event) => event.type === "penalties")).toBe(true);
  });

  it("turns a selected manager into a bounded rating effect and match event", () => {
    const manager = managersById.get("joachim-low-2014")!;
    const result = simulateMatch({ ...input, manager, eraId: "modern-masters" });
    expect(result.userRatings.managerFit).toBeGreaterThanOrEqual(75);
    expect(result.userRatings.managerFit).toBeLessThanOrEqual(100);
    expect(result.events.some((event) => event.type === "manager")).toBe(true);
    expect(result.managerImpact).toContain(manager.managerName);
  });
});
