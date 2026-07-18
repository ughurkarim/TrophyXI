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

  it("renders a draftable non-face Photo Pending identity marker", () => {
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
    const pending = screen.getByRole("img", {
      name: /photo pending for pelé 1970/i,
    });
    expect(pending).toHaveTextContent("P");
    expect(pending).toHaveTextContent("PHOTO PENDING");
    expect(pending.closest(".circular-portrait")).toHaveAttribute(
      "data-photo-status",
      "pending",
    );
    expect(pending.closest(".circular-portrait")).toHaveClass(
      "circular-portrait--legend",
    );
    expect(screen.queryByRole("img", { name: /exact-year card face/i }))
      .not.toBeInTheDocument();
  });
});
