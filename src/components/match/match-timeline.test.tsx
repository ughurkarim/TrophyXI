import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MatchTimeline } from "@/components/match/match-timeline";
import { getFormation } from "@/data/formations";
import { managersById } from "@/data/managers";
import { historicalOpponentsById } from "@/data/opponents";
import { playersById } from "@/data/players";
import { resolveWorldCupAllStars } from "@/engine/all-stars";
import { simulateMatch } from "@/engine/simulation";
import { testLineup } from "@/engine/ratings.test";
import { useGameStore } from "@/store/game-store";

const testBench = ["pele-1970", "diego-maradona-1986", "zico-1982"].map(
  (id) => playersById.get(id)!,
);
const formation = getFormation("4-3-3");
const userManager = managersById.get("joachim-low-2014")!;

describe("MatchTimeline", () => {
  beforeEach(() => {
    useGameStore.getState().clearGame();
    useGameStore.setState({
      formationId: formation.id,
      managerId: userManager.id,
      picks: formation.slots.map((slot, index) => ({
        slotId: slot.id,
        cardId: testLineup[index].id,
      })),
    });
  });

  it("provides pause, fast-forward, and skip controls", async () => {
    const user = userEvent.setup();
    const onSkip = vi.fn();
    const result = simulateMatch({
      lineup: testLineup,
      bench: testBench,
      formation,
      manager: userManager,
      eraId: "2010s",
      opponent: historicalOpponentsById.get("brazil-1970")!,
      seed: 42,
    });
    render(
      <MatchTimeline
        result={result}
        opponent={historicalOpponentsById.get("brazil-1970")!}
        onSkip={onSkip}
      />,
    );
    expect(screen.getByRole("button", { name: "Pause match" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fast forward" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /skip to result/i }));
    expect(onSkip).toHaveBeenCalledOnce();
  });

  it("shows both real team sheets, coaches, formations, stats, and scoreboard", () => {
    const opponent = resolveWorldCupAllStars(
      [...testLineup, ...testBench].map((player) => player.playerIdentityId),
    );
    const result = simulateMatch({
      lineup: testLineup,
      bench: testBench,
      formation,
      manager: userManager,
      eraId: "2010s",
      opponent,
      seed: 91,
    });

    render(
      <MatchTimeline result={result} opponent={opponent} onSkip={vi.fn()} />,
    );

    const userTeam = screen.getByTestId("user-lineup");
    const opponentTeam = screen.getByTestId("opponent-lineup");
    expect(within(userTeam).getAllByRole("listitem")).toHaveLength(11);
    expect(within(opponentTeam).getAllByRole("listitem")).toHaveLength(11);
    expect(within(userTeam).getByText("Joachim Löw")).toBeVisible();
    expect(within(opponentTeam).getByText("Mário Zagallo")).toBeVisible();
    expect(within(userTeam).getByText("4-3-3")).toBeVisible();
    expect(within(opponentTeam).getByText("4-3-3")).toBeVisible();
    expect(screen.getByTestId("live-scoreboard")).toHaveAccessibleName(
      /Trophy XI 0, World Cup All-Stars 0, KO/i,
    );
    expect(
      screen.getByRole("heading", { name: "Live match stats" }),
    ).toBeVisible();
    for (const label of [
      "Shots",
      "On target",
      "Chance quality",
      "Yellow cards",
      "Tactical control",
    ]) {
      expect(screen.getByText(label)).toBeVisible();
    }
  });
});
