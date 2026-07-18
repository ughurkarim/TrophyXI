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

  it("defaults Champions Only on and keeps All-Stars featured", () => {
    render(<OpponentSelection eraId="1970s" onContinue={vi.fn()} />);
    expect(
      screen.getByRole("switch", { name: "Champions Only" }),
    ).toBeChecked();
    expect(
      screen.getByRole("button", { name: /select world cup all-stars/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /world cup winners, newest first/i,
      }),
    ).toBeInTheDocument();
  });

  it("disables Champions Only and exposes every team for a year", async () => {
    const user = userEvent.setup();
    render(<OpponentSelection eraId="1970s" onContinue={vi.fn()} />);
    await user.click(
      screen.getByRole("switch", { name: "Champions Only" }),
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Tournament year" }),
      "1970",
    );
    const teams = screen.getAllByRole("button", { name: /^select /i });
    expect(teams).toHaveLength(17);
    expect(
      screen.getByRole("button", { name: /select brazil 1970/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /select belgium 1970/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /select world cup all-stars/i }),
    ).toBeInTheDocument();
  });

  it("shows 2026 as in progress with no champion", async () => {
    const user = userEvent.setup();
    render(<OpponentSelection eraId="2020s" onContinue={vi.fn()} />);
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Tournament year" }),
      "2026",
    );
    expect(
      screen.queryByRole("button", { name: /select .* 2026/i }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("switch", { name: "Champions Only" }),
    );
    expect(
      screen.getAllByText(/tournament in progress/i).length,
    ).toBeGreaterThan(0);
  });
});
