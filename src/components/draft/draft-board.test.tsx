import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DraftBoard } from "@/components/draft/draft-board";
import { useGameStore } from "@/store/game-store";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

describe("DraftBoard", () => {
  beforeEach(() => {
    localStorage.clear();
    useGameStore.getState().clearGame();
    useGameStore.getState().selectEra("all");
    useGameStore
      .getState()
      .selectManager(useGameStore.getState().managerOptionIds[0]);
    useGameStore.getState().selectFormation("4-3-3");
    useGameStore.getState().selectSlot("gk");
  });

  it("selects a card and advances draft progress", async () => {
    const user = userEvent.setup();
    render(<DraftBoard />);
    expect(screen.getByLabelText("0 of 11 players drafted")).toBeInTheDocument();
    const choices = screen.getAllByRole("button", { name: /draft .* rated/i });
    expect(choices).toHaveLength(3);
    await user.click(choices[0]);
    expect(screen.getByLabelText("1 of 11 players drafted")).toBeInTheDocument();
    expect(useGameStore.getState().picks).toHaveLength(1);
  });

  it("confirms before resetting the current draft", async () => {
    const user = userEvent.setup();
    render(<DraftBoard />);
    await user.click(screen.getAllByRole("button", { name: /draft .* rated/i })[0]);
    await user.click(screen.getByRole("button", { name: "Reset draft" }));
    expect(screen.getByRole("dialog", { name: /return every player card/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reset XI" }));
    expect(useGameStore.getState().picks).toHaveLength(0);
  });
});
