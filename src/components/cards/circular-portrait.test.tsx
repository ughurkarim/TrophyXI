import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CircularPortrait } from "@/components/cards/circular-portrait";
import { playablePlayerGameFacePathFor } from "@/data/player-images";

describe("CircularPortrait", () => {
  it("resolves exact card-year paths without sharing tournament versions", () => {
    expect(playablePlayerGameFacePathFor("cristiano-ronaldo-2006")).toBe(
      "/players/game-faces/cristiano-ronaldo-2006.png",
    );
    expect(playablePlayerGameFacePathFor("cristiano-ronaldo-2018")).toBe(
      "/players/game-faces/cristiano-ronaldo-2018.png",
    );
    expect(playablePlayerGameFacePathFor("cristiano-ronaldo-2026")).toBe(
      "/players/game-faces/cristiano-ronaldo-2026.png",
    );
  });

  it("renders the shared Photo Pending marker with identity context", () => {
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
      name: /dida 2006 portrait, photo pending/i,
    });
    expect(pending).toHaveTextContent("D");
    expect(pending).toHaveTextContent("PHOTO PENDING");
    expect(pending).toHaveTextContent("🇧🇷 2006");
    expect(pending.closest(".circular-portrait")).toHaveClass(
      "circular-portrait--reliable",
    );
  });

  it("renders an audited exact-year portrait when the local file exists", () => {
    render(
      <CircularPortrait
        imageId="cristiano-ronaldo-2018"
        subjectName="Cristiano Ronaldo"
        era="2010s"
        statusTier="elite"
        countryCode="POR"
        tournamentYear={2018}
      />,
    );
    const portrait = screen.getByRole("img", {
      name: /cristiano ronaldo 2018 portrait/i,
    });
    expect(portrait.closest(".circular-portrait")).not.toHaveAttribute(
      "data-image-context",
    );
    expect(portrait).toHaveAttribute(
      "src",
      expect.stringMatching(
        /^(?:http:\/\/localhost:3000)?\/players\/game-faces\/cristiano-ronaldo-2018\.png\?v=/,
      ),
    );
  });

  it("falls back to Photo Pending when an exact image fails to load", () => {
    render(
      <CircularPortrait
        imageId="cristiano-ronaldo-2018"
        subjectName="Cristiano Ronaldo"
        era="2010s"
        statusTier="elite"
        countryCode="POR"
        tournamentYear={2018}
      />,
    );

    fireEvent.error(
      screen.getByRole("img", {
        name: /cristiano ronaldo 2018 portrait/i,
      }),
    );

    const pending = screen.getByRole("img", {
      name: /cristiano ronaldo 2018 portrait, photo pending/i,
    });
    expect(pending).toHaveTextContent("CR");
    expect(pending).toHaveTextContent("PHOTO PENDING");
    expect(pending).toHaveTextContent("🇵🇹 2018");
    expect(pending.closest(".circular-portrait")).toHaveClass(
      "circular-portrait--pending",
    );
  });

  it("keeps Tshabalala playable-facing while his exact image is pending", () => {
    render(
      <CircularPortrait
        imageId="siphiwe-tshabalala-2010"
        subjectName="Siphiwe Tshabalala"
        era="2010s"
        statusTier="limited"
        countryCode="RSA"
        tournamentYear={2010}
      />,
    );
    const pending = screen.getByRole("img", {
      name: /siphiwe tshabalala 2010 portrait, photo pending/i,
    });
    expect(pending).toHaveTextContent("ST");
    expect(pending).toHaveTextContent("PHOTO PENDING");
    expect(pending).toHaveTextContent("🇿🇦 2010");
  });
});
