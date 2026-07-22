import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PlayPage from "@/app/play/page";
import { useGameStore } from "@/store/game-store";

const router = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

describe("PlayPage", () => {
  beforeEach(() => {
    localStorage.clear();
    router.push.mockReset();
    useGameStore.getState().clearGame();
    useGameStore.setState({ hasHydrated: true });
  });

  it("keeps a mode choice pending until it is explicitly confirmed", async () => {
    const user = userEvent.setup();
    render(<PlayPage />);

    const confirm = screen.getByRole("button", {
      name: "CONTINUE",
    });
    const freeSelection = screen.getByRole("button", {
      name: /free selection/i,
    });

    expect(confirm).toBeDisabled();
    expect(useGameStore.getState().gameMode).toBeNull();
    const persistedBeforeSelection = localStorage.getItem("trophy-xi-game-v1");

    await user.click(freeSelection);

    expect(freeSelection).toHaveAttribute("aria-pressed", "true");
    expect(router.push).not.toHaveBeenCalled();
    expect(useGameStore.getState().gameMode).toBeNull();
    expect(localStorage.getItem("trophy-xi-game-v1")).toBe(
      persistedBeforeSelection,
    );

    await user.click(screen.getByRole("button", { name: "CONTINUE" }));

    expect(useGameStore.getState().gameMode).toBe("free-selection");
    expect(router.push).toHaveBeenCalledWith("/play/era");
    expect(
      JSON.parse(localStorage.getItem("trophy-xi-game-v1") ?? "{}").state
        ?.gameMode,
    ).toBe("free-selection");
  });

  it("supports keyboard selection without exposing saved-run UI", async () => {
    const user = userEvent.setup();
    useGameStore.setState({
      gameMode: "world-cup-run",
      eraId: "all",
    });
    render(<PlayPage />);

    const classicDraft = screen.getByRole("button", {
      name: /classic draft/i,
    });
    classicDraft.focus();
    await user.keyboard("{Enter}");

    expect(classicDraft).toHaveAttribute("aria-pressed", "true");
    expect(useGameStore.getState().gameMode).toBe("world-cup-run");
    expect(useGameStore.getState().eraId).toBe("all");
    expect(screen.queryByText(/saved run/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /resume/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/archive xi/i)).not.toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });
});
