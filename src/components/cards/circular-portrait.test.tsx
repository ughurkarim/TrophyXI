import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CircularPortrait } from "@/components/cards/circular-portrait";
import {
  playablePlayerGameFaceCandidatesFor,
  playablePlayerGameFacePathFor,
} from "@/data/player-images";

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

  it("uses Muslera's 2026 portrait exclusively for every playable card", () => {
    for (const year of [2010, 2014, 2018, 2022, 2026]) {
      expect(
        playablePlayerGameFaceCandidatesFor(`fernando-muslera-${year}`),
      ).toEqual(["/players/game-faces/fernando-muslera-2026.png"]);
    }
  });

  it.each([
    ["gheorghe-hagi-1990", "gheorghe-hagi-1994"],
    ["hong-myung-bo-1994", "hong-myung-bo-2002"],
    ["dunga-1998", "dunga-1994"],
    ["jurgen-klinsmann-1990", "jurgen-klinsmann-1994"],
    ["gianluigi-buffon-2014", "gianluigi-buffon-2006"],
    ["thierry-henry-2010", "thierry-henry-2002"],
    ["fabio-cannavaro-1998", "fabio-cannavaro-2006"],
    ["laurent-blanc-1998", "laurent-blanc-1998"],
    ["edgar-davids-1998", "edgar-davids-1998"],
    ["zinedine-zidane-2006", "zinedine-zidane-1998"],
  ])("prefers the refreshed %s identity portrait", (cardId, sourceCardId) => {
    expect(playablePlayerGameFaceCandidatesFor(cardId)[0]).toBe(
      `/players/game-faces/${sourceCardId}.png`,
    );
  });

  it("uses the uploaded Frank de Boer key before stale canonical objects", () => {
    expect(
      playablePlayerGameFaceCandidatesFor("frank-de-boer-1998").slice(0, 2),
    ).toEqual([
      "/players/game-faces/%20frank-de-boer-1994.png",
      "/players/game-faces/frank-de-boer-1994.png",
    ]);
  });

  it("adds a content token to refreshed player portrait URLs", () => {
    render(
      <CircularPortrait
        imageId="fernando-muslera-2010"
        subjectName="Fernando Muslera"
        era="2010s"
        countryCode="URU"
        tournamentYear={2010}
      />,
    );

    expect(
      screen.getByRole("img", {
        name: /fernando muslera 2010 portrait/i,
      }),
    ).toHaveAttribute(
      "src",
      expect.stringMatching(
        /\/players\/game-faces\/fernando-muslera-2026\.png\?v=0d2c74892d8f8c84$/,
      ),
    );
  });

  it("falls back to Photo Pending after every same-player source fails", () => {
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

    const candidateCount = playablePlayerGameFaceCandidatesFor(
      "cristiano-ronaldo-2018",
    ).length;
    for (let index = 0; index < candidateCount; index += 1) {
      fireEvent.error(
        screen.getByRole("img", {
          name: /cristiano ronaldo 2018 portrait/i,
        }),
      );
    }

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

  it("keeps Tshabalala playable-facing after his sources fail", () => {
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
    const candidateCount = playablePlayerGameFaceCandidatesFor(
      "siphiwe-tshabalala-2010",
    ).length;
    for (let index = 0; index < candidateCount; index += 1) {
      fireEvent.error(
        screen.getByRole("img", {
          name: /siphiwe tshabalala 2010 portrait/i,
        }),
      );
    }
    const pending = screen.getByRole("img", {
      name: /siphiwe tshabalala 2010 portrait, photo pending/i,
    });
    expect(pending).toHaveTextContent("ST");
    expect(pending).toHaveTextContent("PHOTO PENDING");
    expect(pending).toHaveTextContent("🇿🇦 2010");
  });
});
