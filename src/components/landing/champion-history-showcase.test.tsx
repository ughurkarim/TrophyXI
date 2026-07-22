import { describe, expect, it } from "vitest";
import {
  championIndexForProgress,
  championProgressForIndex,
} from "@/components/landing/champion-history-showcase";

describe("ChampionHistoryShowcase", () => {
  it("maps the pinned scroll range across every tournament entry", () => {
    expect(championIndexForProgress(-1, 15)).toBe(0);
    expect(championIndexForProgress(0, 15)).toBe(0);
    expect(championIndexForProgress(1 / 15, 15)).toBe(1);
    expect(championIndexForProgress(7 / 15, 15)).toBe(7);
    expect(championIndexForProgress(14 / 15, 15)).toBe(14);
    expect(championIndexForProgress(1, 15)).toBe(14);
    expect(championIndexForProgress(2, 15)).toBe(14);
  });

  it("fills the gold progress bar through the active champion", () => {
    expect(championProgressForIndex(0, 15)).toBe("6.666666666666667%");
    expect(championProgressForIndex(7, 15)).toBe("53.333333333333336%");
    expect(championProgressForIndex(14, 15)).toBe("100%");
  });
});
