import { describe, expect, it } from "vitest";
import { getFormation } from "@/data/formations";
import { playersById } from "@/data/players";
import { calculateChemistry } from "@/engine/chemistry";

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
});
