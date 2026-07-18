import { describe, expect, it } from "vitest";
import { createSeededRandom, hashString, randomInt } from "@/engine/random";

describe("seeded random", () => {
  it("repeats an identical sequence for an identical seed", () => {
    const first = createSeededRandom(123456);
    const second = createSeededRandom(123456);
    expect(Array.from({ length: 8 }, () => first())).toEqual(
      Array.from({ length: 8 }, () => second()),
    );
  });

  it("creates bounded integers and stable hashes", () => {
    const random = createSeededRandom(12);
    expect(Array.from({ length: 30 }, () => randomInt(random, 2, 5))).toEqual(
      expect.arrayContaining([2, 3, 4, 5]),
    );
    expect(hashString("trophy-xi")).toBe(hashString("trophy-xi"));
  });
});
