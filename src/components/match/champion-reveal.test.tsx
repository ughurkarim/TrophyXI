import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChampionReveal } from "@/components/match/champion-reveal";
import { getFormation } from "@/data/formations";
import {
  historicalOpponents,
  historicalOpponentsById,
} from "@/data/opponents";
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

const renderReveal = (
  onSimulate = vi.fn(),
  selectedOpponent = opponent,
) => {
  render(
    <ChampionReveal
      opponent={selectedOpponent}
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

  it("shows a compact dossier and opens the opponent squad drawer", async () => {
    motionPreference.reduced = true;
    const user = userEvent.setup();
    const champion = historicalOpponents[0]!;
    renderReveal(vi.fn(), champion);

    const dossier = screen.getByRole("region", {
      name: new RegExp(`${champion.nationName} match dossier`, "i"),
    });
    expect(dossier).toHaveTextContent(`Manager ${champion.managerName}`);
    expect(
      within(dossier).getByText(champion.formationLabel ?? champion.formation),
    ).toBeVisible();
    expect(within(dossier).getByText(champion.tacticalProfile)).toBeVisible();
    expect(within(dossier).getByText(champion.championFact!)).toBeVisible();
    expect(within(dossier).getByText(`${champion.ratings.overall} OVR`)).toBeVisible();
    expect(within(dossier).queryByText(/not sourced/i)).not.toBeInTheDocument();
    expect(within(dossier).queryByText(/trophy xi tactical model/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /view opponent xi/i }));
    const drawer = screen.getByRole("dialog", {
      name: new RegExp(`${champion.nationName} ${champion.tournamentYear} lineup`, "i"),
    });
    expect(within(drawer).getByRole("list", { name: "Starting XI" }).children).toHaveLength(11);
    expect(within(drawer).getByRole("list", { name: "Available substitutes" }).children).toHaveLength(champion.substitutes.length);
  });
});
