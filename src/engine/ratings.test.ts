import { describe, expect, it } from "vitest";
import { getFormation } from "@/data/formations";
import { playersById } from "@/data/players";
import { calculateTeamRatings } from "@/engine/ratings";

export const testLineup = [
  "manuel-neuer-2014",
  "roberto-carlos-2002",
  "fabio-cannavaro-2006",
  "carles-puyol-2010",
  "philipp-lahm-2014",
  "andrea-pirlo-2006",
  "xavi-2010",
  "luka-modric-2018",
  "kylian-mbappe-2022",
  "ronaldo-2002",
  "lionel-messi-2014",
].map((id) => playersById.get(id)!);

describe("team ratings", () => {
  it("calculates bounded attack, midfield, defense, chemistry, and overall", () => {
    const ratings = calculateTeamRatings(testLineup, getFormation("4-3-3"));
    for (const value of [
      ratings.attack,
      ratings.midfield,
      ratings.defense,
      ratings.chemistry,
      ratings.overall,
    ]) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(99);
    }
    expect(ratings.positionFit).toBeLessThanOrEqual(100);
    expect(ratings.eraFit).toBeLessThanOrEqual(100);
    expect(ratings.managerFit).toBeLessThanOrEqual(100);
    expect(ratings.overall).toBeGreaterThan(80);
    expect(ratings.attack).toBeGreaterThan(80);
  });
});
