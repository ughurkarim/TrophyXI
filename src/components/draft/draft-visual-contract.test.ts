import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const draftCss = readFileSync(
  "src/components/draft/draft-board.module.css",
  "utf8",
);
const cardCss = readFileSync(
  "src/components/cards/player-card.module.css",
  "utf8",
);

describe("draft visual contract", () => {
  it("uses the exact stable green, yellow, and red fit glow palette", () => {
    expect(draftCss).toContain("#45e5a1");
    expect(draftCss).toContain("rgba(69, 229, 161, 0.55)");
    expect(draftCss).toContain("rgba(69, 229, 161, 0.72)");
    expect(draftCss).toContain("#e7bd4d");
    expect(draftCss).toContain("rgba(231, 189, 77, 0.48)");
    expect(draftCss).toContain("rgba(231, 189, 77, 0.66)");
    expect(draftCss).toContain("#e06464");
    expect(draftCss).toContain("rgba(224, 100, 100, 0.42)");
    expect(draftCss).toContain("rgba(224, 100, 100, 0.57)");
    expect(draftCss).toMatch(
      /pitch-node--fit-incompatible \.pitch-node__disc[\s\S]*?box-shadow: none;/,
    );
  });

  it("keeps tactical nodes and selected cards at stable geometry", () => {
    expect(draftCss).toMatch(
      /pitch-node:hover[\s\S]*?transform: translate\(-50%, -50%\);/,
    );
    expect(cardCss).toMatch(
      /\.card:global\(\.player-card--selected\)[\s\S]*?width: 100%;[\s\S]*?transform: none !important;/,
    );
    expect(draftCss).toContain("grid-template-columns: repeat(5, minmax(0, 1fr))");
    expect(draftCss).toContain("overscroll-behavior-x: contain");
  });
});
