import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CircularPortrait } from "@/components/cards/circular-portrait";
import { gameFacePathFor } from "@/data/player-images";

describe("CircularPortrait", () => {
  it("resolves exact card-year paths without sharing tournament versions", () => {
    expect(gameFacePathFor("player", "cristiano-ronaldo-2006")).toBe(
      "/players/game-faces/cristiano-ronaldo-2006.png",
    );
    expect(gameFacePathFor("player", "cristiano-ronaldo-2018")).toBe(
      "/players/game-faces/cristiano-ronaldo-2018.png",
    );
  });

  it("renders a draftable non-face Photo Pending identity marker", () => {
    render(
      <CircularPortrait
        imageId="lionel-messi-2014"
        subjectName="Lionel Messi"
        era="2010s"
        statusTier="icon"
        countryCode="ARG"
        tournamentYear={2014}
      />,
    );
    const pending = screen.getByRole("img", {
      name: /photo pending for lionel messi 2014/i,
    });
    expect(pending).toHaveTextContent("LM");
    expect(pending).toHaveTextContent("PHOTO PENDING");
    expect(pending.closest(".circular-portrait")).toHaveAttribute(
      "data-photo-status",
      "pending",
    );
    expect(pending.closest(".circular-portrait")).toHaveClass(
      "circular-portrait--icon",
    );
    expect(screen.queryByRole("img", { name: /photograph/i })).not.toBeInTheDocument();
  });
});
