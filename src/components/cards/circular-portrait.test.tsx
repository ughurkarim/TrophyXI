import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CircularPortrait } from "@/components/cards/circular-portrait";
import { gameFacePathFor } from "@/data/player-images";

describe("CircularPortrait", () => {
  it("resolves exact card-year paths without sharing tournament versions", () => {
    expect(gameFacePathFor("player", "cristiano-ronaldo-2006", 2006)).toBe(
      "/assets/players/2006/cristiano-ronaldo-2006.png",
    );
    expect(gameFacePathFor("player", "cristiano-ronaldo-2018", 2018)).toBe(
      "/assets/players/2018/cristiano-ronaldo-2018.png",
    );
    expect(gameFacePathFor("player", "cristiano-ronaldo-2026", 2026)).toBe(
      "/assets/players/2026/cristiano-ronaldo-2026.png",
    );
  });

  it("renders a neutral non-face identity marker", () => {
    render(
      <CircularPortrait
        imageId="dida-2006"
        subjectName="Dida"
        era="2000s"
        statusTier="reliable"
        countryCode="BRA"
        tournamentYear={2006}
      />,
    );
    const pending = screen.getByRole("img", {
      name: /dida 2006 portrait/i,
    });
    expect(pending).toHaveTextContent("D");
    expect(pending).not.toHaveTextContent(/photo|source|pending/i);
    expect(pending.closest(".circular-portrait")).toHaveClass(
      "circular-portrait--reliable",
    );
  });

  it("renders a supplied 2006 portrait without source language", () => {
    render(
      <CircularPortrait
        imageId="cristiano-ronaldo-2006"
        subjectName="Cristiano Ronaldo"
        era="2000s"
        statusTier="elite"
        countryCode="POR"
        tournamentYear={2006}
      />,
    );
    const portrait = screen.getByRole("img", {
      name: /cristiano ronaldo 2006 portrait/i,
    });
    expect(portrait.closest(".circular-portrait")).not.toHaveAttribute(
      "data-image-context",
    );
    expect(portrait).toHaveAttribute(
      "src",
      expect.stringMatching(
        /^\/assets\/players\/2006\/cristiano-ronaldo-2006\.png\?v=/,
      ),
    );
  });

  it("uses a neutral accessible label for historical portraits", () => {
    render(
      <CircularPortrait
        imageId="pele-1970"
        subjectName="Pelé"
        era="1970s"
        statusTier="legend"
        countryCode="BRA"
        tournamentYear={1970}
      />,
    );
    const portrait = screen.getByRole("img", {
      name: /pelé 1970 portrait/i,
    });
    expect(portrait.closest(".circular-portrait")).not.toHaveAttribute(
      "data-image-context",
    );
  });
});
