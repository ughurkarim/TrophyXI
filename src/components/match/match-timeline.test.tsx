import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MatchTimeline } from "@/components/match/match-timeline";
import { spain2010 } from "@/data/champions";
import { getFormation } from "@/data/formations";
import { simulateMatch } from "@/engine/simulation";
import { testLineup } from "@/engine/ratings.test";

describe("MatchTimeline", () => {
  it("provides pause, fast-forward, and skip controls", async () => {
    const user = userEvent.setup();
    const onSkip = vi.fn();
    const result = simulateMatch({
      lineup: testLineup,
      formation: getFormation("4-3-3"),
      opponent: spain2010,
      seed: 42,
    });
    render(<MatchTimeline result={result} opponent={spain2010} onSkip={onSkip} />);
    expect(screen.getByRole("button", { name: "Pause match" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Fast forward" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /skip to result/i }));
    expect(onSkip).toHaveBeenCalledOnce();
  });
});
