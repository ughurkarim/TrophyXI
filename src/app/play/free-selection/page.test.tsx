import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FreeSelectionPage from "@/app/play/free-selection/page";
import { managersById } from "@/data/managers";
import { useGameStore } from "@/store/game-store";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

describe("FreeSelectionPage", () => {
  beforeEach(() => {
    router.push.mockReset();
    router.replace.mockReset();
    useGameStore.getState().clearGame();
    useGameStore.setState({
      hasHydrated: true,
      gameMode: "free-selection",
      eraId: "2010s",
      managerId: managersById.get("joachim-low-2014")!.id,
      formationId: "4-3-3",
      picks: [],
      benchPicks: [],
      draftPhase: "starters",
      selectedPlayerId: null,
      projectedPositionFits: [],
    });
  });

  it(
    "selects a position first, recommends players, and places the chosen card",
    async () => {
      const user = userEvent.setup();
      render(<FreeSelectionPage />);

      expect(
        screen.getByRole("heading", { name: "BUILD YOUR SQUAD" }),
      ).toBeVisible();
      expect(
        screen.getByText("Select a position on the pitch."),
      ).toBeVisible();
      expect(screen.queryByText(/LCB|RCB/)).not.toBeInTheDocument();
      expect(
        screen.getAllByRole("button", { name: /^CB: empty/i }),
      ).toHaveLength(2);

      await user.click(
        screen.getByRole("button", { name: /^GK: empty/i }),
      );
      expect(screen.getByText("BEST SQUAD IMPACT FIRST")).toBeVisible();
      const options = screen.getAllByRole("button", {
        name: /select .* for GK/i,
      });
      await user.click(options[0]);
      const place = screen.getByRole("button", { name: "PLACE" });
      expect(place).toBeEnabled();
      await user.click(place);

      expect(useGameStore.getState().picks).toHaveLength(1);
      expect(useGameStore.getState().picks[0].slotId).toBe("gk");
    },
    10_000,
  );

  it("ranks bench depth without showing positional fit", async () => {
    const user = userEvent.setup();
    render(<FreeSelectionPage />);

    await user.click(screen.getByRole("button", { name: /b1 open bench/i }));

    expect(screen.getByText("BEST BENCH IMPACT FIRST")).toBeVisible();
    expect(screen.queryByText(/position fit/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Draft eligibility")).not.toBeInTheDocument();

    const options = screen.getAllByRole("button", { name: /select .* for bench/i });
    await user.click(options[0]);
    expect(screen.queryByText(/position fit/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "PLACE" })).toBeEnabled();
  });
});
