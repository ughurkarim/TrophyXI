import { describe, expect, it } from "vitest";
import { managerGradeLabel, managers } from "@/data/managers";
import { historicalOpponentArchive } from "@/data/opponents";

describe("manager grades", () => {
  it("maps the full numeric grade scale", () => {
    expect(managerGradeLabel(100)).toBe("S");
    expect(managerGradeLabel(94)).toBe("A+");
    expect(managerGradeLabel(90)).toBe("A");
    expect(managerGradeLabel(84)).toBe("A-");
    expect(managerGradeLabel(80)).toBe("B+");
    expect(managerGradeLabel(75)).toBe("B");
    expect(managerGradeLabel(70)).toBe("B-");
    expect(managerGradeLabel(65)).toBe("C+");
    expect(managerGradeLabel(60)).toBe("C");
    expect(managerGradeLabel(50)).toBe("D");
    expect(managerGradeLabel(49)).toBe("F");
  });

  it("keeps every explicit OFF and DEF grade capped", () => {
    for (const manager of managers) {
      expect(manager.grades.offense).toBeGreaterThanOrEqual(0);
      expect(manager.grades.offense).toBeLessThanOrEqual(100);
      expect(manager.grades.defense).toBeGreaterThanOrEqual(0);
      expect(manager.grades.defense).toBeLessThanOrEqual(100);
      expect(manager.leadership).toBeGreaterThanOrEqual(0);
      expect(manager.leadership).toBeLessThanOrEqual(100);
      expect(manager.gameManagement).toBeGreaterThanOrEqual(0);
      expect(manager.gameManagement).toBeLessThanOrEqual(100);
    }
  });

  it("supports deserving S grades while preserving flawed profiles", () => {
    const metrics = managers.flatMap((manager) => [
      manager.grades.offense,
      manager.grades.defense,
      manager.leadership,
      manager.gameManagement,
    ]);
    expect(metrics.some((value) => managerGradeLabel(value) === "S")).toBe(true);
    expect(metrics.some((value) => managerGradeLabel(value) === "C")).toBe(true);
    expect(
      managers.some(
        (manager) =>
          Math.abs(manager.grades.offense - manager.grades.defense) >= 10,
      ),
    ).toBe(true);
  });

  it("keeps exactly one tournament card for every manager identity", () => {
    expect(managers).toHaveLength(47);
    expect(
      new Set(managers.map((manager) => manager.managerIdentityId)).size,
    ).toBe(47);
  });

  it("resolves every manager card to a sourced tournament finish", () => {
    for (const manager of managers) {
      const tournamentRecord = historicalOpponentArchive.find(
        (opponent) =>
          opponent.tournamentYear === manager.tournamentYear &&
          opponent.nationName === manager.teamName,
      );
      expect(tournamentRecord, manager.id).toBeDefined();
      if (manager.tournamentYear !== 2026) {
        expect(tournamentRecord?.tournamentFinish, manager.id).toBeTruthy();
      }
    }
  });
});
