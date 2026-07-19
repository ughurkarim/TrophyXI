import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChampionReveal } from "@/components/match/champion-reveal";
import { getFormation } from "@/data/formations";
import { historicalOpponentsById } from "@/data/opponents";
import { calculateTeamRatings } from "@/engine/ratings";
import { testLineup } from "@/engine/ratings.test";

const motionPreference = vi.hoisted(() => ({ reduced: false }));

vi.mock("framer-motion", async () => {
  const actual = await vi.importActual<typeof import("framer-motion")>(
    "framer-motion",
  );
  return {
    ...actual,
    useReducedMotion: () => motionPreference.reduced,
  };
});

const opponent = historicalOpponentsById.get("world-cup-all-stars")!;
const userRatings = calculateTeamRatings(testLineup, getFormation("4-3-3"));

const renderReveal = (onSimulate = vi.fn()) => {
  render(
    <ChampionReveal
      opponent={opponent}
      userRatings={userRatings}
      userEra="2010s environment"
      opponentEraFit={98}
      onSimulate={onSimulate}
    />,
  );
  return onSimulate;
};

describe("ChampionReveal match transition", () => {
  afterEach(() => {
    motionPreference.reduced = false;
    vi.useRealTimers();
  });

  it("runs the broadcast-settle transition before simulation begins", () => {
    vi.useFakeTimers();
    const onSimulate = renderReveal();

    fireEvent.click(screen.getByRole("button", { name: /skip reveal/i }));
    fireEvent.click(screen.getByRole("button", { name: /simulate match/i }));

    expect(screen.getByTestId("match-transition").closest("section")).toHaveAttribute(
      "data-transitioning",
      "true",
    );
    expect(onSimulate).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(679));
    expect(onSimulate).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onSimulate).toHaveBeenCalledOnce();
  });

  it("opens the finished broadcast state immediately with reduced motion", () => {
    motionPreference.reduced = true;
    const onSimulate = renderReveal();

    fireEvent.click(screen.getByRole("button", { name: /simulate match/i }));

    expect(onSimulate).toHaveBeenCalledOnce();
    expect(screen.getByTestId("match-transition").closest("section")).toHaveAttribute(
      "data-transitioning",
      "false",
    );
  });
});
