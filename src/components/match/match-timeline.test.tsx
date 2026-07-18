import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MatchTimeline } from "@/components/match/match-timeline";
import { getFormation } from "@/data/formations";
import { historicalOpponentsById } from "@/data/opponents/generated";
import { playersById } from "@/data/players";
import { simulateMatch } from "@/engine/simulation";
import { testLineup } from "@/engine/ratings.test";

const testBench = ["pele-1970", "diego-maradona-1986", "zico-1982"].map(
  (id) => playersById.get(id)!,
);

describe("MatchTimeline", () => {
  it("provides pause, fast-forward, and skip controls", async () => {
    const user = userEvent.setup();
    const onSkip = vi.fn();
    const result = simulateMatch({
      lineup: testLineup,
      bench: testBench,
      formation: getFormation("4-3-3"),
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
});
