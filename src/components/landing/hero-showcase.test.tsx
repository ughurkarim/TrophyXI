import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  HERO_TOURNAMENT_YEARS,
  HeroShowcase,
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
    expect(
      showcase.querySelector('[data-card-id="lionel-messi-2026"]'),
    ).toBeInTheDocument();
    expect(
      showcase.querySelector('[data-card-id="cristiano-ronaldo-2026"]'),
    ).toBeInTheDocument();
  });
});
