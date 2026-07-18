import { describe, expect, it } from "vitest";
import { getFormation } from "@/data/formations";
import { managersById } from "@/data/managers";
import { historicalOpponentsById } from "@/data/opponents/generated";
import { playersById } from "@/data/players";
import { simulateMatch } from "@/engine/simulation";
import { testLineup } from "@/engine/ratings.test";

export const testBench = [
  "pele-1970",
  "diego-maradona-1986",
  "zico-1982",
].map((id) => playersById.get(id)!);

const input = {
  lineup: testLineup,
  bench: testBench,
  formation: getFormation("4-3-3"),
  opponent: historicalOpponentsById.get("brazil-1970")!,
  seed: 8675309,
} as const;

describe("match simulation", () => {
  it("is deterministic for identical complete inputs", () => {
    expect(simulateMatch(input)).toEqual(simulateMatch(input));
  });

  it("creates bounded statistics, substitutions, and all fourteen minute records", () => {
    const result = simulateMatch(input);
    expect(result.score.user).toBeLessThanOrEqual(6);
    expect(result.score.opponent).toBeLessThanOrEqual(6);
    expect(result.stats.possession[0] + result.stats.possession[1]).toBe(100);
    expect(result.stats.shotsOnTarget[0]).toBeLessThanOrEqual(
      result.stats.shots[0],
    );
    expect(result.events.at(-1)?.type).toBe("fulltime");
    expect(result.playerMinutes).toHaveLength(14);
    expect(
      result.playerMinutes
        .filter((player) => !player.started && player.enteredAt === null)
        .every((player) => player.minutes === 0),
    ).toBe(true);
    expect(
      result.events.filter((event) => event.type === "substitution").length,
    ).toBe(result.substitutions.length);
  });

  it("uses bench order as substitution priority", () => {
    const result = simulateMatch(input);
    const usedSlots = result.substitutions.map(
      (substitution) => substitution.benchSlot,
    );
    if (usedSlots.includes("bench-3")) {
      expect(usedSlots).toContain("bench-1");
    }
    const minutes = result.playerMinutes.filter((player) => !player.started);
    expect(minutes[0].minutes).toBeGreaterThanOrEqual(minutes[2].minutes);
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

  it("applies manager OFF and DEF grades to the appropriate phases", () => {
    const manager = managersById.get("joachim-low-2014")!;
    const lowGrades = {
      ...manager,
      grades: { offense: 60, defense: 60 },
    };
    const highGrades = {
      ...manager,
      grades: { offense: 98, defense: 98 },
    };
    const low = simulateMatch({ ...input, manager: lowGrades, eraId: "2010s" });
    const high = simulateMatch({ ...input, manager: highGrades, eraId: "2010s" });
    expect(high.stats.expectedGoals[0]).toBeGreaterThan(low.stats.expectedGoals[0]);
    expect(high.stats.expectedGoals[1]).toBeLessThan(low.stats.expectedGoals[1]);
    expect(high.events.some((event) => event.type === "manager")).toBe(true);
    expect(high.managerImpact).toContain("OFF 98, DEF 98");
  });

  it("applies the selected environment to both sides", () => {
    const oldEnvironment = simulateMatch({
      ...input,
      eraId: "1970s",
    });
    const modernEnvironment = simulateMatch({
      ...input,
      eraId: "2020s",
    });
    expect(oldEnvironment.opponentEraFit).not.toBe(
      modernEnvironment.opponentEraFit,
    );
    expect(oldEnvironment.userRatings.eraFit).not.toBe(
      modernEnvironment.userRatings.eraFit,
    );
  });
});
