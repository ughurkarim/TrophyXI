import { describe, expect, it } from "vitest";
import type { WorldCupRunStage } from "@/engine/world-cup-run";
import { getMobileTournamentProgressStage } from "./world-cup-run-presentation";

describe("mobile World Cup Run progress presentation", () => {
  it.each<Exclude<WorldCupRunStage, "complete">>([
    "group",
    "round-of-32",
    "round-of-16",
    "quarter-final",
    "semi-final",
    "final",
  ])("keeps the actual %s elimination stage active", (eliminatedStage) => {
    expect(
      getMobileTournamentProgressStage({
        currentStage: eliminatedStage === "final" ? "complete" : "final",
        status: "eliminated",
        eliminatedStage,
      }),
    ).toBe(eliminatedStage);
  });

  it("continues to follow the engine stage for an active run", () => {
    expect(
      getMobileTournamentProgressStage({
        currentStage: "quarter-final",
        status: "active",
        eliminatedStage: null,
      }),
    ).toBe("quarter-final");
  });
});
