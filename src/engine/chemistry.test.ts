import { describe, expect, it } from "vitest";
import { getFormation } from "@/data/formations";
import { managers } from "@/data/managers";
import { playersById } from "@/data/players";
import {
  calculateChemistry,
  chemistryLabel,
  explainChemistryChange,
} from "@/engine/chemistry";

describe("chemistry", () => {
  const formation = getFormation("4-3-3");

  it("rewards shared country, year, era, and confederation links", () => {
    const linked = [
      playersById.get("fabien-barthez-1998")!,
      playersById.get("lilian-thuram-1998")!,
      playersById.get("marcel-desailly-1998")!,
    ];
    const mixed = [
      playersById.get("oliver-kahn-2002")!,
      playersById.get("roberto-carlos-2002")!,
      playersById.get("fabio-cannavaro-2006")!,
    ];
    const linkedChemistry = calculateChemistry(linked, formation);
    const mixedChemistry = calculateChemistry(mixed, formation);
    expect(linkedChemistry.countryLinks).toBe(3);
    expect(linkedChemistry.yearLinks).toBe(3);
    expect(linkedChemistry.score).toBeGreaterThan(mixedChemistry.score);
  });

  it("returns zero for an empty side", () => {
    expect(calculateChemistry([], formation).score).toBe(0);
  });

  it("uses the five published Chemistry bands", () => {
    expect(
      [0, 39, 40, 59, 60, 74, 75, 89, 90, 100].map(chemistryLabel),
    ).toEqual([
      "DISCONNECTED",
      "DISCONNECTED",
      "DEVELOPING",
      "DEVELOPING",
      "BALANCED",
      "BALANCED",
      "STRONG",
      "STRONG",
      "ELITE",
      "ELITE",
    ]);
  });

  it("builds preview reasons from the exact production contribution changes", () => {
    const player = playersById.get("lionel-messi-2022")!;
    const slot = formation.slots.find((candidate) => candidate.id === "rw")!;
    const manager = managers[0];
    const current = calculateChemistry([], formation, {
      manager,
      eraId: "2020s",
    });
    const projected = calculateChemistry([player], formation, {
      picks: [{ slotId: slot.id, cardId: player.id }],
      manager,
      eraId: "2020s",
    });
    const reasons = explainChemistryChange(current, projected, {
      positionFit: 100,
      managerFit: projected.managerFit,
      eraFit: projected.averageEraFit,
    });
    expect(reasons.length).toBeGreaterThan(0);
    expect(reasons.length).toBeLessThanOrEqual(5);
    const contributionKey = {
      position: "position",
      manager: "manager",
      era: "era",
      leadership: "leadership",
      accolades: "accolades",
      links: "links",
      bench: "bench",
      "weak-links": "weakLinks",
    } as const;
    for (const reason of reasons) {
      const key = contributionKey[reason.key];
      expect(reason.value).toBe(
        projected.contributions[key] - current.contributions[key],
      );
    }
  });
});
