import { act, render, screen, waitFor, within } from "@testing-library/react";
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
    expect(
      screen.getByLabelText(/\d+ overall, [A-Z]+/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Best Position")).toBeInTheDocument();
    const selectedPreview = screen.getByLabelText("Selected player preview");
    expect(
      within(selectedPreview).getByText("Projected Chemistry"),
    ).toBeInTheDocument();
    expect(selectedPreview).toHaveTextContent("VIEW PLAYER TAGS");
    expect(selectedPreview).not.toHaveTextContent("Placement Penalty −0%");
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
    expect(screen.queryByText("Placement Penalty 0%")).not.toBeInTheDocument();
    expect(screen.queryByText("−0%")).not.toBeInTheDocument();
  });

  it("keeps manager and drafted-player records clickable in the compact squad", async () => {
    const user = userEvent.setup();
    render(<DraftBoard />);
    expect(screen.queryByText("SQUAD ARCHIVE")).not.toBeInTheDocument();
    const squadControl = screen.getByRole("button", {
      name: "SQUAD 0 / 14",
    });
    await user.click(squadControl);
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
    await waitFor(() => expect(squadControl).toHaveFocus());

    const option = useGameStore.getState().optionIds[0];
    act(() => {
      useGameStore.getState().selectPlayer(option);
      const preview = useGameStore
        .getState()
        .projectedPositionFits.find((candidate) => candidate.canPlace)!;
      useGameStore.getState().placeSelectedPlayer(preview.slotId);
    });
    const drafted = playersById.get(option)!;
    await user.click(
      screen.getByRole("button", { name: "SQUAD 1 / 14" }),
    );
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
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "SQUAD 1 / 14" }),
      ).toHaveFocus(),
    );
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
      `Current Chemistry${committed.chemistry}`,
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
      screen.getByRole("button", { name: /^cancel$/i }),
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
      screen.getByRole("dialog", { name: /return to coach selection/i }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Choose new coach" }));
    expect(useGameStore.getState().picks).toHaveLength(0);
    expect(useGameStore.getState().managerId).toBeNull();
    expect(useGameStore.getState().formationId).toBeNull();
    expect(useGameStore.getState().managerOptionIds).toHaveLength(3);
  });

  it("opens the Chemistry explanation and removes technical guarantee copy", async () => {
    const user = userEvent.setup();
    render(<DraftBoard />);
    expect(
      screen.queryByText(/Five unique identities|completion path guaranteed/i),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /chemistry information/i }),
    );
    const dialog = screen.getByRole("dialog", {
      name: /how chemistry works/i,
    });
    expect(dialog).toHaveTextContent(
      "Chemistry measures how naturally your fourteen-player squad works together.",
    );
    expect(dialog).toHaveTextContent(
      "A lower-rated player with excellent fit may improve the squad",
    );
  });

  it("shows a positive placement penalty for the exact awkward slot", async () => {
    const user = userEvent.setup();
    render(<DraftBoard />);
    const choiceButtons = screen.getAllByRole("button", {
      name: /select .* for placement, rated/i,
    });
    let targetSlotId: string | undefined;
    for (let index = 0; index < choiceButtons.length; index += 1) {
      await user.click(choiceButtons[index]);
      targetSlotId = useGameStore
        .getState()
        .projectedPositionFits.find(
          (candidate) =>
            candidate.canPlace && candidate.penaltyPercent > 0,
        )?.slotId;
      if (targetSlotId) break;
      await user.click(screen.getByRole("button", { name: /^cancel$/i }));
    }
    expect(targetSlotId).toBeDefined();
    const formation = getFormation(useGameStore.getState().formationId!);
    const slot = formation.slots.find(
      (candidate) => candidate.id === targetSlotId,
    )!;
    const preview = useGameStore
      .getState()
      .projectedPositionFits.find(
        (candidate) => candidate.slotId === targetSlotId,
      )!;
    await user.hover(
      screen.getByRole("button", {
        name: new RegExp(`^${slot.label}\\.`, "i"),
      }),
    );
    expect(screen.getByLabelText("Selected player preview")).toHaveTextContent(
      `Placement Penalty −${preview.penaltyPercent}%`,
    );
  });
});
