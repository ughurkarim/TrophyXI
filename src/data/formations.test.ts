import { describe, expect, it } from "vitest";
import { formations, getFormation } from "@/data/formations";
import { managersById } from "@/data/managers";
import {
  generateFormationOffer,
  generateFormationRespin,
} from "@/engine/draft";

describe("formations", () => {
  it("generates eleven unique, valid tactical slots for every shape", () => {
    expect(formations.length).toBeGreaterThanOrEqual(12);
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

  it("creates deterministic, varied four-shape offers with a preferred option", () => {
    const manager = managersById.get("luiz-felipe-scolari-2002")!;
    const first = generateFormationOffer(manager, "1970s", 4404);
    const repeat = generateFormationOffer(manager, "1970s", 4404);
    expect(first).toEqual(repeat);
    expect(first).toHaveLength(4);
    expect(new Set(first).size).toBe(4);
    expect(first.some((id) => manager.preferredFormations.includes(id))).toBe(true);
    expect(generateFormationOffer(manager, "2020s", 2026)).not.toEqual(first);
  });

  it("creates one deterministic four-shape respin excluding the original offer", () => {
    const manager = managersById.get("luiz-felipe-scolari-2002")!;
    const original = generateFormationOffer(manager, "2000s", 4404);
    const replacement = generateFormationRespin(
      manager,
      "2000s",
      4404,
      original,
    );
    expect(replacement).toHaveLength(4);
    expect(new Set(replacement).size).toBe(4);
    expect(replacement.every((id) => !original.includes(id))).toBe(true);
    expect(
      generateFormationRespin(manager, "2000s", 4404, original),
    ).toEqual(replacement);
  });
});
