import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MobileLanding } from "@/components/mobile/mobile-landing";

describe("MobileLanding", () => {
  it("offers the phone-first hero trio and an immediate play action", () => {
    render(<MobileLanding />);

    expect(screen.getByText("Lionel Messi")).toBeInTheDocument();
    expect(screen.getByText("Lamine Yamal")).toBeInTheDocument();
    expect(screen.getByText("Pelé")).toBeInTheDocument();
    expect(screen.queryByText("Kylian Mbappé")).not.toBeInTheDocument();
    expect(screen.queryByText(/world cup xi simulator/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Cristiano Ronaldo")).not.toBeInTheDocument();
    expect(screen.getByText(/play trophy xi/i).closest("a")).toHaveAttribute(
      "href",
      "/play",
    );
  });

  it("does not render either protected desktop timeline in its component tree", () => {
    render(<MobileLanding />);

    expect(screen.queryByTestId("hero-scroll-scene")).not.toBeInTheDocument();
    expect(screen.queryByTestId("champion-scroll-scene")).not.toBeInTheDocument();
    expect(screen.queryByText(/six tournaments · twenty years/i)).not.toBeInTheDocument();
  });
});
