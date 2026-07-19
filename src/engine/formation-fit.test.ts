import { describe, expect, it } from "vitest";
import { draftEras } from "@/data/eras";
import { formations, getFormation } from "@/data/formations";
import {
  calculateFormationEraFit,
  calculateFormationRecommendationScore,
} from "@/engine/formation-fit";

describe("formation Era Fit", () => {
  it("produces bounded numeric compatibility for every formation and era", () => {
    for (const formation of formations) {
      for (const era of draftEras) {
        const fit = calculateFormationEraFit(formation, era.id);
        expect(fit).toBeGreaterThanOrEqual(60);
        expect(fit).toBeLessThanOrEqual(99);
      }
    }
  });

  it("responds to both the formation profile and match environment", () => {
    const classic = getFormation("4-4-2");
    const pressing = getFormation("4-2-2-2");

    expect(calculateFormationEraFit(classic, "1970s")).toBeGreaterThan(
      calculateFormationEraFit(pressing, "1970s"),
    );
    expect(calculateFormationEraFit(pressing, "2020s")).toBeGreaterThan(
      calculateFormationEraFit(classic, "2020s"),
    );
  });

  it("combines manager and era compatibility without discarding either", () => {
    expect(calculateFormationRecommendationScore(96, 80)).toBeGreaterThan(
      calculateFormationRecommendationScore(85, 88),
    );
    expect(calculateFormationRecommendationScore(80, 96)).toBeGreaterThan(
      calculateFormationRecommendationScore(80, 82),
    );
  });
});
