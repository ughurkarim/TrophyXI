import { describe, expect, it } from "vitest";
import { formations, getFormation } from "@/data/formations";

describe("formations", () => {
  it("generates eleven unique, valid tactical slots for every shape", () => {
    for (const formation of formations) {
      expect(formation.slots).toHaveLength(11);
      expect(new Set(formation.slots.map((slot) => slot.id)).size).toBe(11);
      for (const slot of formation.slots) {
        expect(slot.x).toBeGreaterThanOrEqual(0);
        expect(slot.x).toBeLessThanOrEqual(100);
        expect(slot.y).toBeGreaterThanOrEqual(0);
        expect(slot.y).toBeLessThanOrEqual(100);
        expect(slot.accepts.length).toBeGreaterThan(0);
      }
    }
  });

  it("returns a requested formation", () => {
    expect(getFormation("4-3-3").slots.at(-1)?.label).toBe("RW");
  });
});
