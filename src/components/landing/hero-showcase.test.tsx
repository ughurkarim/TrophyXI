import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  HeroShowcase,
  pointerParallaxEnabled,
  stableHeroTransform,
} from "@/components/landing/hero-showcase";

describe("HeroShowcase", () => {
  it("clamps rapid pointer movement and always returns to a zero base", () => {
    const bounds = { left: 100, top: 50, width: 500, height: 400 };
    const samples = [
      [-10_000, -10_000],
      [100, 50],
      [350, 250],
      [600, 450],
      [10_000, 10_000],
    ];

    for (let pass = 0; pass < 20; pass += 1) {
      for (const [x, y] of samples) {
        const transform = stableHeroTransform(x, y, bounds);
        expect(Math.abs(transform.x)).toBeLessThanOrEqual(8);
        expect(Math.abs(transform.y)).toBeLessThanOrEqual(6);
        expect(Math.abs(transform.rotateX)).toBeLessThanOrEqual(3.5);
        expect(Math.abs(transform.rotateY)).toBeLessThanOrEqual(4);
      }
    }
    expect(stableHeroTransform(350, 250, bounds)).toEqual({
      x: 0,
      y: 0,
      rotateX: -0,
      rotateY: 0,
    });
  });

  it("disables pointer parallax for touch and reduced motion", () => {
    expect(pointerParallaxEnabled("mouse", false)).toBe(true);
    expect(pointerParallaxEnabled("touch", false)).toBe(false);
    expect(pointerParallaxEnabled("pen", false)).toBe(false);
    expect(pointerParallaxEnabled("mouse", true)).toBe(false);
  });

  it("survives repeated pointer entry and exit without accumulating styles", () => {
    render(<HeroShowcase />);
    const showcase = screen.getByTestId("hero-showcase");
    Object.defineProperty(showcase, "getBoundingClientRect", {
      value: () => ({
        left: 0,
        top: 0,
        width: 500,
        height: 400,
        right: 500,
        bottom: 400,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });
    for (let index = 0; index < 25; index += 1) {
      fireEvent.pointerMove(showcase, {
        clientX: index % 2 ? 800 : -300,
        clientY: index % 2 ? 700 : -200,
        pointerType: "mouse",
      });
      fireEvent.pointerLeave(showcase, { pointerType: "mouse" });
    }
    expect(showcase).toHaveAttribute("tabindex", "0");
    expect(showcase).toHaveAccessibleName(
      /pelé 1970, messi 2022, and cristiano ronaldo 2018/i,
    );
    expect(screen.getByText("Pelé")).toBeInTheDocument();
    expect(screen.getByText("Lionel Messi")).toBeInTheDocument();
    expect(screen.getByText("Cristiano Ronaldo")).toBeInTheDocument();
    fireEvent.focus(showcase);
    fireEvent.blur(showcase);
  });
});
