import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  accoladeTransition,
  PlayerDetails,
  type PlayerFitContext,
} from "@/components/cards/player-details";
import { playersById } from "@/data/players";

const fitContext: PlayerFitContext = {
  assignedSlot: "RW",
  positionFit: 94,
  placementPenalty: 2,
  eraTranslation: 97,
  managerFit: 91,
  chemistryContribution: 5,
  benchPriority: null,
};

describe("PlayerDetails", () => {
  it("separates sourced accolades, modeled tags, fit, and attribution", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const player = playersById.get("lionel-messi-2022")!;
    render(
      <PlayerDetails
        player={player}
        fitContext={fitContext}
        onClose={onClose}
      />,
    );
    const dialog = screen.getByRole("dialog", { name: /lionel messi/i });
    expect(dialog).toHaveClass("player-drawer--legend");
    expect(
      within(dialog).getByRole("img", {
        name: /other licensed face photograph of lionel messi/i,
      }),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("TOURNAMENT RECORD")).toBeInTheDocument();
    expect(within(dialog).getByText("PLAYER TAG EFFECTS")).toBeInTheDocument();
    expect(within(dialog).getByText("CAREER ACCOLADES")).toBeInTheDocument();
    expect(within(dialog).getByText("PORTRAIT SOURCE")).toBeInTheDocument();
    expect(within(dialog).getByText("94%")).toBeInTheDocument();
    expect(within(dialog).getByText("+5")).toBeInTheDocument();
    const accoladesHeading = within(dialog).getByText("CAREER ACCOLADES");
    const accoladesSection = accoladesHeading.closest("section")!;
    expect(within(accoladesSection).getByText("Golden Ball")).toBeInTheDocument();
    expect(
      within(accoladesSection).queryByText(player.modeledTags[0]),
    ).not.toBeInTheDocument();
    await user.click(
      within(dialog).getByRole("button", { name: /close player record/i }),
    );
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("animates no more than six verified accolades and groups the rest", () => {
    const base = playersById.get("lionel-messi-2022")!;
    const source = base.achievements[0].source;
    const player = {
      ...base,
      achievements: Array.from({ length: 8 }, (_, index) => ({
        id: `verified-honor-${index}`,
        label: `Verified Honor ${index + 1}`,
        description: `Verified sourced honor ${index + 1}.`,
        ratingEffect: 0.1,
        source,
      })),
    };
    render(<PlayerDetails player={player} onClose={vi.fn()} />);
    const section = screen.getByText("CAREER ACCOLADES").closest("section")!;
    expect(within(section).getByText("More Honors")).toBeInTheDocument();
    expect(within(section).getByText(/Verified Honor 7 · Verified Honor 8/)).toBeInTheDocument();
    expect(
      section.querySelectorAll(".achievement-list > li:not(.achievement-list__more)"),
    ).toHaveLength(6);
  });

  it("prioritizes the strongest sourced accolade and removes reduced-motion stagger", () => {
    const base = playersById.get("lionel-messi-2022")!;
    const source = base.achievements[0].source;
    const player = {
      ...base,
      achievements: [
        {
          id: "supporting-honor",
          label: "Supporting Honor",
          description: "Lower-priority sourced honor.",
          ratingEffect: 0.1,
          source,
        },
        {
          id: "primary-honor",
          label: "Primary Honor",
          description: "Highest-priority sourced honor.",
          ratingEffect: 0.8,
          source,
        },
      ],
    };
    render(<PlayerDetails player={player} onClose={vi.fn()} />);
    expect(
      document.querySelector(".achievement-list__primary"),
    ).toHaveTextContent("Primary Honor");
    expect(accoladeTransition(true, 5)).toEqual({
      duration: 0,
      delay: 0,
    });
    expect(accoladeTransition(false, 5).duration).toBe(0.2);
    expect(accoladeTransition(false, 5).delay).toBeCloseTo(0.35);
  });
});
