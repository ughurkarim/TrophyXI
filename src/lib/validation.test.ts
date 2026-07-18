import { describe, expect, it } from "vitest";
import { playersById } from "@/data/players";
import { playerSeedSchema } from "@/lib/validation";

const messi = playersById.get("lionel-messi-2022")!;

describe("player career-data validation", () => {
  it("accepts normalized, sourced accolades and explicit Top 100 metadata", () => {
    expect(playerSeedSchema.safeParse([messi]).success).toBe(true);
    expect(messi.top100Source?.note).toMatch(/independent of tournament-card rating/i);
  });

  it("rejects invalid counts and duplicate accolade ids", () => {
    const duplicate = {
      ...messi.careerAccolades[0],
      count: 0,
    };
    const result = playerSeedSchema.safeParse([
      {
        ...messi,
        careerAccolades: [duplicate, duplicate],
      },
    ]);
    expect(result.success).toBe(false);
    expect(
      result.error?.issues.map((issue) => issue.message).join(" "),
    ).toMatch(/greater than or equal to 1|duplicate accolade id/i);
  });

  it("rejects unsourced factual accolades and missing Top 100 curation", () => {
    const result = playerSeedSchema.safeParse([
      {
        ...messi,
        careerAccolades: messi.careerAccolades.map((accolade, index) =>
          index === 0 ? { ...accolade, sourceUrl: undefined } : accolade,
        ),
        top100Source: undefined,
      },
    ]);
    expect(result.success).toBe(false);
    expect(
      result.error?.issues.map((issue) => issue.message).join(" "),
    ).toMatch(/source url|top 100 player requires/i);
  });
});
