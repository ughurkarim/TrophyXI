import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DraftBoard } from "@/components/draft/draft-board";
import { getFormation } from "@/data/formations";
import { managersById } from "@/data/managers";
import { playersById } from "@/data/players";
import { calculateTeamRatings } from "@/engine/ratings";
import { useGameStore } from "@/store/game-store";

const motionPreference = vi.hoisted(() => ({ reduce: false }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("framer-motion", async () => {
  const actual =
    await vi.importActual<typeof import("framer-motion")>("framer-motion");
  return {
    ...actual,
    useReducedMotion: () => motionPreference.reduce,
  };
});

describe("DraftBoard", () => {
  beforeEach(() => {
    motionPreference.reduce = false;
    localStorage.clear();
    useGameStore.getState().clearGame();
    useGameStore.getState().selectEra("all");
    useGameStore
      .getState()
      .selectManager(useGameStore.getState().managerOptionIds[0]);
    useGameStore
      .getState()
      .selectFormation(useGameStore.getState().formationOptionIds[0]);
  });

  it("selects a player first, previews fits, then places on the second click", async () => {
    const user = userEvent.setup();
    render(<DraftBoard />);
    expect(screen.getByLabelText("0 of 14 players drafted")).toBeInTheDocument();
    const choices = screen.getAllByRole("button", {
      name: /select .* for placement, rated/i,
    });
    expect(choices).toHaveLength(5);
    await user.click(choices[1]);
    expect(useGameStore.getState().picks).toHaveLength(0);
    expect(useGameStore.getState().selectedPlayerId).toBeTruthy();
    expect(screen.getByText("Current Chemistry")).toBeInTheDocument();
    expect(screen.getByText("Projected Chemistry")).toBeInTheDocument();
    const preview = useGameStore
      .getState()
      .projectedPositionFits.find((candidate) => candidate.canPlace)!;
    const formation = getFormation(useGameStore.getState().formationId!);
    const slot = formation.slots.find(
      (candidate) => candidate.id === preview.slotId,
    )!;
    await user.click(
      screen.getByRole("button", {
        name: new RegExp(`^${slot.label}\\.`, "i"),
      }),
    );
    expect(screen.getByLabelText("1 of 14 players drafted")).toBeInTheDocument();
    expect(useGameStore.getState().picks).toHaveLength(1);
    expect(screen.getByText(/Placement Penalty/i)).toBeInTheDocument();
  });

  it("keeps manager and drafted-player records clickable in the compact squad", async () => {
    const user = userEvent.setup();
    render(<DraftBoard />);
    expect(screen.getByText("SQUAD ARCHIVE")).toBeInTheDocument();
    const managerButton = screen.getByRole("button", {
      name: /inspect manager/i,
    });
    const manager = managersById.get(useGameStore.getState().managerId!)!;
    await user.click(managerButton);
    expect(
      screen.getByRole("dialog", { name: manager.managerName }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /close manager record/i }),
    );
    await waitFor(() => expect(managerButton).toHaveFocus());

    const option = useGameStore.getState().optionIds[0];
    act(() => {
      useGameStore.getState().selectPlayer(option);
      const preview = useGameStore
        .getState()
        .projectedPositionFits.find((candidate) => candidate.canPlace)!;
      useGameStore.getState().placeSelectedPlayer(preview.slotId);
    });
    const drafted = playersById.get(option)!;
    const draftedButton = screen.getByRole("button", {
      name: new RegExp(`inspect .*${drafted.playerName}`, "i"),
    });
    await user.click(draftedButton);
    expect(
      screen.getByRole("dialog", { name: drafted.playerName }),
    ).toHaveClass(`player-drawer--${drafted.statusTier}`);
    expect(screen.getByText("PLAYER TAG EFFECTS")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /close player record/i }),
    );
    await waitFor(() => expect(draftedButton).toHaveFocus());
  });

  it("previews the exact hovered slot and commits the production Chemistry value", async () => {
    const user = userEvent.setup();
    const { container } = render(<DraftBoard />);
    const choices = screen.getAllByRole("button", {
      name: /select .* for placement, rated/i,
    });
    await user.click(choices[1]);
    const previews = useGameStore
      .getState()
      .projectedPositionFits.filter((candidate) => candidate.canPlace);
    const exactPreview = previews.at(-1)!;
    const formation = getFormation(useGameStore.getState().formationId!);
    const slot = formation.slots.find(
      (candidate) => candidate.id === exactPreview.slotId,
    )!;
    const slotButton = screen.getByRole("button", {
      name: new RegExp(`^${slot.label}\\.`, "i"),
    });
    await user.hover(slotButton);
    const hud = container.querySelector(".chemistry-preview-hud")!;
    expect(hud).toHaveTextContent(`${slot.label} EXACT PLACEMENT`);
    const chemistryText = hud.querySelectorAll("dl div dd")[1].textContent!;
    const projectedChemistry = Number(chemistryText.match(/\d+/)?.[0]);
    await user.click(slotButton);
    const state = useGameStore.getState();
    const committedFormation = getFormation(state.formationId!);
    const lineup = state.picks.map((pick) => playersById.get(pick.cardId)!);
    const manager = managersById.get(state.managerId!)!;
    const committed = calculateTeamRatings(lineup, committedFormation, {
      picks: state.picks,
      manager,
      eraId: state.eraId!,
      bench: [],
    });
    expect(committed.chemistry).toBe(projectedChemistry);
    expect(container.querySelector(".chemistry-preview-hud")).toHaveTextContent(
      `Current${committed.chemistry}`,
    );
    expect(container.querySelector(".chemistry-preview-hud")).not.toHaveTextContent(
      "Projected",
    );
  });

  it("cancels selection without consuming or changing the five-card spin", async () => {
    const user = userEvent.setup();
    render(<DraftBoard />);
    const before = [...useGameStore.getState().optionIds];
    await user.click(
      screen.getAllByRole("button", {
        name: /select .* for placement, rated/i,
      })[1],
    );
    await user.click(
      screen.getAllByRole("button", { name: /cancel selection/i }).at(-1)!,
    );
    expect(useGameStore.getState().selectedPlayerId).toBeNull();
    expect(useGameStore.getState().optionIds).toEqual(before);
    expect(useGameStore.getState().playerRespinsRemaining).toBe(2);
  });

  it("keeps two-click placement available without selected-card travel in reduced motion", async () => {
    motionPreference.reduce = true;
    const user = userEvent.setup();
    render(<DraftBoard />);
    await user.click(
      screen.getAllByRole("button", {
        name: /select .* for placement, rated/i,
      })[0],
    );
    const selectedCard = screen.getByRole("button", {
      name: /cancel .* selection/i,
    });
    const selectedWrapper = selectedCard.closest(".draft-option--selected");
    expect(selectedWrapper).not.toBeNull();
    expect(selectedWrapper?.getAttribute("style") ?? "").not.toContain("-4px");
    expect(
      screen.getAllByRole("button", { name: /percent\./i }).length,
    ).toBeGreaterThan(0);
  });

  it("confirms before resetting the current draft", async () => {
    const user = userEvent.setup();
    render(<DraftBoard />);
    const option = useGameStore.getState().optionIds[1];
    useGameStore.getState().selectPlayer(option);
    const preview = useGameStore
      .getState()
      .projectedPositionFits.find((candidate) => candidate.canPlace)!;
    useGameStore.getState().placeSelectedPlayer(preview.slotId);
    await user.click(screen.getByRole("button", { name: "Reset draft" }));
    expect(
      screen.getByRole("dialog", { name: /return every player card/i }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reset squad" }));
    expect(useGameStore.getState().picks).toHaveLength(0);
  });
});
