import { describe, expect, it } from "vitest";
import { draftEras } from "@/data/eras";
import { formations, getFormation } from "@/data/formations";
import { calculateFormationEraFit } from "@/engine/formation-fit";

describe("formation Era Fit", () => {
  it("produces bounded numeric compatibility for every formation and era", () => {
    for (const formation of formations) {
      for (const era of draftEras) {
        const fit = calculateFormationEraFit(formation, era.id);
        expect(fit).toBeGreaterThanOrEqual(era.id === "all" ? 0 : 60);
        expect(fit).toBeLessThanOrEqual(100);
        if (era.id === "all") expect(fit).toBe(0);
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
});
