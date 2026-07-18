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
        name: /exact-year card face of lionel messi/i,
      }),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("TOURNAMENT RECORD")).toBeInTheDocument();
    expect(within(dialog).getByText("PLAYER TAG EFFECTS")).toBeInTheDocument();
    expect(within(dialog).getByText("CAREER ACCOLADES")).toBeInTheDocument();
    expect(within(dialog).getByText("PORTRAIT SOURCE")).toBeInTheDocument();
    expect(within(dialog).getByText(/fifa 22 game face/i)).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        /ea sports player imagery, sourced via sofifa/i,
      ),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("94%")).toBeInTheDocument();
    expect(within(dialog).getByText("+5")).toBeInTheDocument();
    const accoladesHeading = within(dialog).getByText("CAREER ACCOLADES");
    const accoladesSection = accoladesHeading.closest("section")!;
    expect(
      within(accoladesSection).getByText("2× World Cup Golden Ball"),
    ).toBeInTheDocument();
    expect(
      within(accoladesSection).getByText("TOP 100 PLAYER"),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("TOURNAMENT ACCOLADES")).toBeInTheDocument();
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
    const source = base.careerAccolades[0];
    const player = {
      ...base,
      top100Player: false,
      careerAccolades: Array.from({ length: 8 }, (_, index) => ({
        id: `verified-honor-${index}`,
        label: `Verified Honor ${index + 1}`,
        count: index + 1,
        category: "individual" as const,
        description: `Verified sourced honor ${index + 1}.`,
        sourceName: source.sourceName,
        sourceUrl: source.sourceUrl,
        verified: true,
      })),
    };
    render(<PlayerDetails player={player} onClose={vi.fn()} />);
    const dialog = screen.getByRole("dialog");
    const section = screen.getByText("CAREER ACCOLADES").closest("section")!;
    expect(within(section).getByText("More Honors")).toBeInTheDocument();
    expect(
      within(section).getByText(/7× Verified Honor 7 · 8× Verified Honor 8/),
    ).toBeInTheDocument();
    expect(
      section.querySelectorAll(".achievement-list > li:not(.achievement-list__more)"),
    ).toHaveLength(6);
    expect(
      dialog.querySelectorAll(
        ".achievement-list > li:not(.achievement-list__more)",
      ),
    ).toHaveLength(6);
    expect(
      within(
        within(dialog).getByText("TOURNAMENT ACCOLADES").closest("section")!,
      ).getByText("More Honors"),
    ).toBeInTheDocument();
  });

  it("uses the premium Top 100 treatment and removes reduced-motion stagger", () => {
    const base = playersById.get("lionel-messi-2022")!;
    render(<PlayerDetails player={base} onClose={vi.fn()} />);
    expect(
      document.querySelector(".achievement-list__top100"),
    ).toHaveTextContent("TOP 100 PLAYER");
    expect(accoladeTransition(true, 5)).toEqual({
      duration: 0,
      delay: 0,
    });
    expect(accoladeTransition(false, 5).duration).toBe(0.2);
    expect(accoladeTransition(false, 5).delay).toBeCloseTo(0.35);
  });

  it("does not display Top 100 recognition when the stored flag is false", () => {
    const player = playersById.get("dele-alli-2018")!;
    expect(player.top100Player).toBe(false);
    render(<PlayerDetails player={player} onClose={vi.fn()} />);
    expect(screen.queryByText("TOP 100 PLAYER")).not.toBeInTheDocument();
  });
});
