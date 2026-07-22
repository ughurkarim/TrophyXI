import { describe, expect, it } from "vitest";
import { flagForCountry } from "@/lib/utils";

describe("flagForCountry", () => {
  it("uses the England subdivision flag sequence", () => {
    expect(flagForCountry("ENG")).toBe("🏴󠁧󠁢󠁥󠁮󠁧󠁿");
  });
});
