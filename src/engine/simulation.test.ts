import { describe, expect, it } from "vitest";
import { getFormation } from "@/data/formations";
import { managersById } from "@/data/managers";
import { historicalOpponentsById } from "@/data/opponents";
import { playersById } from "@/data/players";
import { simulateMatch } from "@/engine/simulation";
import { testLineup } from "@/engine/ratings.test";
import type { PlayerTournamentCard, Position } from "@/types/game";

export const testBench = [
  "pele-1970",
  "diego-maradona-1986",
  "zico-1982",
].map((id) => playersById.get(id)!);

const input = {
  lineup: testLineup,
  bench: testBench,
  formation: getFormation("4-3-3"),
  opponent: historicalOpponentsById.get("west-germany-1974")!,
  seed: 8675309,
} as const;

const goalkeeperBench = [
  "gianluigi-buffon-2006",
  "diego-maradona-1986",
  "zico-1982",
].map((id) => playersById.get(id)!);

const testCardAt = (
  id: string,
  primaryPosition: Position,
  eligiblePositions: Position[],
): PlayerTournamentCard => ({
  ...playersById.get("pele-1970")!,
  id,
  playerIdentityId: id,
  primaryPosition,
  eligiblePositions,
});

const resultsForSeeds = (bench: PlayerTournamentCard[], count = 40) =>
  Array.from({ length: count }, (_, index) =>
    simulateMatch({ ...input, bench, seed: index + 1 }),
  );

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
    ).toBe(result.substitutions.length + result.opponentSubstitutions.length);
  });

  it("uses the selected champion roster for opponent events and substitutions", () => {
    const result = simulateMatch(input);
    const rosterNames = new Set(
      [
        ...input.opponent.startingLineup,
        ...input.opponent.substitutes,
      ].map((player) => player.name),
    );
    const opponentPlayerEvents = result.events.filter(
      (event) =>
        event.team === "opponent" &&
        ["goal", "substitution", "yellow"].includes(event.type),
    );

    expect(result.opponentSubstitutions.length).toBeGreaterThan(0);
    expect(
      result.opponentSubstitutions.every(
        (substitution) =>
          substitution.playerInId.startsWith(`${input.opponent.id}:`) &&
          substitution.playerOutId.startsWith(`${input.opponent.id}:`),
      ),
    ).toBe(true);
    expect(
      opponentPlayerEvents.every((event) =>
        [...rosterNames].some((name) => event.title.includes(name)),
      ),
    ).toBe(true);
  });

  it("supports a champion's full available substitute pool safely", () => {
    const argentina = historicalOpponentsById.get("argentina-2022")!;
    const identitySafeLineup = testLineup.map((player) =>
      player.playerIdentityId === "lionel-messi"
        ? playersById.get("neymar-2014")!
        : player,
    );
    const result = simulateMatch({
      ...input,
      lineup: identitySafeLineup,
      opponent: argentina,
      seed: 2022,
    });
    const rosterIds = new Set([
      ...argentina.startingLineup.map((player) => player.sourcePlayerId),
      ...argentina.substitutes.map((player) => player.sourcePlayerId),
    ]);

    expect(argentina.substitutes.length).toBeGreaterThan(3);
    expect(result.opponentSubstitutions.length).toBeLessThanOrEqual(3);
    expect(
      result.opponentSubstitutions.every((substitution) =>
        [...rosterIds].some(
          (sourceId) =>
            sourceId &&
            substitution.playerInId.includes(sourceId),
        ),
      ),
    ).toBe(true);
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

  it("only substitutes into a primary or secondary tactical position", () => {
    const primaryOnly = testCardAt(
      "primary-position-sub-test",
      "ST",
      [],
    );
    const bench = [
      primaryOnly,
      playersById.get("gianluigi-buffon-2006")!,
      playersById.get("iker-casillas-2010")!,
    ];
    const result = resultsForSeeds(bench).find((candidate) =>
      candidate.substitutions.some(
        (substitution) => substitution.playerInId === primaryOnly.id,
      ),
    );
    const substitution = result?.substitutions.find(
      (candidate) => candidate.playerInId === primaryOnly.id,
    );
    const assignedPositions = new Map(
      input.formation.slots.map((slot, index) => [
        input.lineup[index].id,
        slot.position,
      ]),
    );

    expect(substitution).toBeDefined();
    expect(substitution?.position).toBe("ST");
    expect(substitution?.position).toBe(
      assignedPositions.get(substitution?.playerOutId ?? ""),
    );
  });

  it("allows a listed secondary position without falling back to another role", () => {
    const secondaryOnly = testCardAt(
      "secondary-position-sub-test",
      "AM",
      ["RW"],
    );
    const bench = [
      secondaryOnly,
      playersById.get("gianluigi-buffon-2006")!,
      playersById.get("iker-casillas-2010")!,
    ];
    const result = resultsForSeeds(bench).find((candidate) =>
      candidate.substitutions.some(
        (substitution) => substitution.playerInId === secondaryOnly.id,
      ),
    );

    expect(result).toBeDefined();
    expect(
      result!.substitutions.find(
        (substitution) => substitution.playerInId === secondaryOnly.id,
      )?.position,
    ).toBe("RW");
  });

  it("leaves incompatible and backup-goalkeeper bench cards unused", () => {
    const incompatible = testCardAt(
      "incompatible-position-sub-test",
      "LWB",
      [],
    );
    const bench = [
      incompatible,
      playersById.get("gianluigi-buffon-2006")!,
      playersById.get("iker-casillas-2010")!,
    ];

    for (const result of resultsForSeeds(bench)) {
      expect(
        result.substitutions.some((substitution) =>
          bench.some(
            (player) =>
              player.id === substitution.playerInId &&
              (player.primaryPosition === "GK" ||
                player.id === incompatible.id),
          ),
        ),
      ).toBe(false);
    }
  });

  it("does not use a second goalkeeper as a normal tactical substitute", () => {
    for (const result of resultsForSeeds(goalkeeperBench)) {
      expect(
        result.substitutions.some(
          (substitution) =>
            substitution.playerInId === goalkeeperBench[0].id,
        ),
      ).toBe(false);
    }
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

  it("runs the curated All-Stars through the normal deterministic and beatable engine", () => {
    const ids = [
      "iker-casillas-2010",
      "roberto-carlos-2002",
      "carles-puyol-2010",
      "raphael-varane-2018",
      "sergio-ramos-2010",
      "andrea-pirlo-2006",
      "luka-modric-2018",
      "andres-iniesta-2010",
      "neymar-2014",
      "david-villa-2010",
      "jairzinho-1970",
    ];
    const mythicInput = {
      lineup: ids.map((id) => playersById.get(id)!),
      bench: ["gianluigi-buffon-2006", "ronaldinho-2002", "zico-1982"].map(
        (id) => playersById.get(id)!,
      ),
      formation: getFormation("4-3-3"),
      opponent: historicalOpponentsById.get("world-cup-all-stars")!,
      eraId: "2000s" as const,
    };
    const deterministic = simulateMatch({ ...mythicInput, seed: 91 });
    expect(deterministic).toEqual(
      simulateMatch({ ...mythicInput, seed: 91 }),
    );
    expect(deterministic.opponentSubstitutions.length).toBeGreaterThan(0);
    const validSeeds = Array.from({ length: 80 }, (_, index) => index + 1);
    const results = validSeeds.map((seed) =>
      simulateMatch({ ...mythicInput, seed }),
    );
    expect(
      results.some(
        (result) =>
          result.score.user > result.score.opponent ||
          Boolean(
            result.score.penalties &&
              result.score.penalties[0] > result.score.penalties[1],
          ),
      ),
    ).toBe(true);
    expect(
      results.some(
        (result) =>
          result.score.user < result.score.opponent ||
          Boolean(
            result.score.penalties &&
              result.score.penalties[0] < result.score.penalties[1],
          ),
      ),
    ).toBe(true);
  });
});