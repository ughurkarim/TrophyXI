import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OpponentSelection } from "@/components/draft/opponent-selection";
import { useGameStore } from "@/store/game-store";

describe("OpponentSelection", () => {
  beforeEach(() => {
    useGameStore.getState().clearGame();
    useGameStore.setState({
      draftPhase: "opponent",
      picks: Array.from({ length: 11 }, (_, index) => ({
        slotId: `slot-${index}`,
        cardId: `starter-${index}`,
      })),
      benchPicks: [
        { slotId: "bench-1", cardId: "bench-a" },
        { slotId: "bench-2", cardId: "bench-b" },
        { slotId: "bench-3", cardId: "bench-c" },
      ],
    });
  });

  it("filters by year and champion status without rendering every record", async () => {
    const user = userEvent.setup();
    render(<OpponentSelection eraId="1970s" onContinue={vi.fn()} />);
    expect(screen.getAllByRole("button", { name: /^select /i })).toHaveLength(24);
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Tournament year" }),
      "1970",
    );
    await user.click(screen.getByRole("checkbox", { name: /champions only/i }));
    const teams = screen.getAllByRole("button", { name: /^select /i });
    expect(teams).toHaveLength(1);
    expect(teams[0]).toHaveAccessibleName(/brazil 1970/i);
  });
});
