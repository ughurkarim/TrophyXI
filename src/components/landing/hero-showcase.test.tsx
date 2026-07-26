import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  HERO_TOURNAMENT_YEARS,
  HeroShowcase,
  heroCardsForYear,
  heroReducedMotionYearIndexForProgress,
  heroYearIndexForProgress,
} from "@/components/landing/hero-showcase";

describe("HeroShowcase", () => {
  it("maps the pinned scroll range across all six tournaments", () => {
    expect(HERO_TOURNAMENT_YEARS).toEqual([
      2026, 2022, 2018, 2014, 2010, 2006,
    ]);
    expect(heroYearIndexForProgress(-2)).toBe(0);
    expect(heroYearIndexForProgress(0)).toBe(0);
    expect(heroYearIndexForProgress(0.17)).toBe(1);
    expect(heroYearIndexForProgress(0.34)).toBe(2);
    expect(heroYearIndexForProgress(0.51)).toBe(3);
    expect(heroYearIndexForProgress(0.68)).toBe(4);
    expect(heroYearIndexForProgress(0.85)).toBe(5);
    expect(heroYearIndexForProgress(2)).toBe(5);
  });

  it("switches directly between endpoints when reduced motion is enabled", () => {
    expect(heroReducedMotionYearIndexForProgress(0)).toBe(0);
    expect(heroReducedMotionYearIndexForProgress(0.49)).toBe(0);
    expect(heroReducedMotionYearIndexForProgress(0.5)).toBe(5);
    expect(heroReducedMotionYearIndexForProgress(1)).toBe(5);
  });

  it("uses the exact 2006 tournament versions at the end of the transition", () => {
    const cards = heroCardsForYear(2006);
    expect(cards.messi).toMatchObject({
      id: "lionel-messi-2006",
      tournamentYear: 2006,
      overall: 80,
      primaryPosition: "ST",
      imageId: "lionel-messi-2006",
    });
    expect(cards.ronaldo).toMatchObject({
      id: "cristiano-ronaldo-2006",
      tournamentYear: 2006,
      overall: 88,
      primaryPosition: "LW",
      imageId: "cristiano-ronaldo-2006",
    });
  });

  it("starts with only the 2026 Messi and Ronaldo cards", () => {
    render(
      <HeroShowcase>
        <div>Hero copy</div>
      </HeroShowcase>,
    );

    const showcase = screen.getByTestId("hero-showcase");
    expect(showcase).toHaveAttribute("data-active-year", "2026");
    expect(showcase).toHaveAccessibleName(
      /ronaldo and messi tournament-card timeline, showing 2026/i,
    );
    expect(screen.queryByText("Pelé")).not.toBeInTheDocument();
    expect(screen.getByText("Lionel Messi")).toBeInTheDocument();
    expect(screen.getByText("Cristiano Ronaldo")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("2026");
    expect(screen.queryByText(/world cup archive/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/scroll to rewind/i)).not.toBeInTheDocument();
    expect(showcase.querySelector(".hero-background-year")).toHaveTextContent(
      "2026",
    );
    expect(
      showcase.querySelector(".hero-transition-label"),
    ).toHaveTextContent("SIX TOURNAMENTS · TWENTY YEARS2026 → 2006");
    expect(
      showcase.querySelector('[data-card-id="lionel-messi-2026"]'),
    ).toBeInTheDocument();
    expect(
      showcase.querySelector('[data-card-id="cristiano-ronaldo-2026"]'),
    ).toBeInTheDocument();
  });
});
