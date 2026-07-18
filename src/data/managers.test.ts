import { describe, expect, it } from "vitest";
import { managerGradeLabel, managers } from "@/data/managers";

describe("manager grades", () => {
  it("maps the full numeric grade scale", () => {
    expect(managerGradeLabel(100)).toBe("S");
    expect(managerGradeLabel(94)).toBe("A+");
    expect(managerGradeLabel(90)).toBe("A");
    expect(managerGradeLabel(86)).toBe("A-");
    expect(managerGradeLabel(83)).toBe("B+");
    expect(managerGradeLabel(80)).toBe("B");
    expect(managerGradeLabel(76)).toBe("B-");
    expect(managerGradeLabel(73)).toBe("C+");
    expect(managerGradeLabel(70)).toBe("C");
    expect(managerGradeLabel(66)).toBe("C-");
    expect(managerGradeLabel(60)).toBe("D");
    expect(managerGradeLabel(54)).toBe("F");
  });

  it("keeps every explicit OFF and DEF grade capped", () => {
    for (const manager of managers) {
      expect(manager.grades.offense).toBeGreaterThanOrEqual(0);
      expect(manager.grades.offense).toBeLessThanOrEqual(100);
      expect(manager.grades.defense).toBeGreaterThanOrEqual(0);
      expect(manager.grades.defense).toBeLessThanOrEqual(100);
    }
  });
});
