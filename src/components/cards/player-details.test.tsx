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
  eraImpact: 1,
  managerFit: 91,
  chemistryContribution: 5,
  benchPriority: null,
};

describe("PlayerDetails", () => {
  it("shows the player record without source, permission, or implementation copy", async () => {
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
        name: /tournament-edition card face of lionel messi/i,
      }),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("TOURNAMENT VERSIONS")).toBeVisible();
    expect(within(dialog).getByText("TOURNAMENT RECORD")).toBeVisible();
    expect(within(dialog).getByText("PLAYER TAG EFFECTS")).toBeVisible();
    expect(within(dialog).getByText("CAREER ACCOLADES")).toBeVisible();
    expect(within(dialog).getByText("94%")).toBeVisible();
    expect(within(dialog).getByText("+5")).toBeVisible();
    expect(within(dialog).queryByText(/PHOTO STATUS/i)).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/PORTRAIT SOURCE/i)).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/FBref/i)).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/permission/i)).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/official FIFA ratings/i)).not.toBeInTheDocument();
    await user.click(
      within(dialog).getByRole("button", { name: /close player record/i }),
    );
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("keeps tournament versions newest-first and opens the chosen card", async () => {
    const user = userEvent.setup();
    const player = playersById.get("lionel-messi-2022")!;
    render(<PlayerDetails player={player} onClose={vi.fn()} />);
    const versionButtons = screen.getAllByRole("button", {
      name: /open lionel messi .* card/i,
    });
    const years = versionButtons.map((button) =>
      Number(button.getAttribute("aria-label")?.match(/\b(19|20)\d{2}\b/)?.[0]),
    );
    expect(years).toEqual([...years].sort((first, second) => second - first));
    const target = screen.getByRole("button", {
      name: /open lionel messi 2014 card/i,
    });
    await user.click(target);
    expect(target).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByText(/Argentina · 2014/),
    ).toBeVisible();
    expect(screen.getAllByText(/Photo|Photo Pending|Current version/).length)
      .toBeGreaterThan(0);
  });

  it("limits accolades to six rows until SHOW MORE is used", async () => {
    const user = userEvent.setup();
    const base = playersById.get("lionel-messi-2022")!;
    const source = base.careerAccolades[0];
    const player = {
      ...base,
      top100Player: false,
      achievements: [],
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
    const section = screen.getByText("CAREER ACCOLADES").closest("section")!;
    expect(within(section).getAllByRole("listitem")).toHaveLength(6);
    await user.click(
      within(section).getByRole("button", { name: "SHOW 2 MORE" }),
    );
    expect(within(section).getAllByRole("listitem")).toHaveLength(8);
  });

  it("keeps the premium Top 100 badge without curated explanatory copy", async () => {
    const user = userEvent.setup();
    const player = playersById.get("lionel-messi-2022")!;
    render(<PlayerDetails player={player} onClose={vi.fn()} />);
    const showMore = screen.queryByRole("button", { name: /SHOW \d+ MORE/ });
    if (showMore) await user.click(showMore);
    expect(
      document.querySelector('[data-accolade-kind="top-100"]'),
    ).toHaveTextContent("TOP 100 PLAYER");
    expect(screen.queryByText(/Trophy XI Curated Top 100/i)).not.toBeInTheDocument();
    expect(accoladeTransition(true, 5)).toEqual({
      duration: 0,
      delay: 0,
    });
    expect(accoladeTransition(false, 5).delay).toBeCloseTo(0.35);
  });

  it("hides unknown statistics and Top 100 when they are not stored", () => {
    const base = playersById.get("dele-alli-2018")!;
    const player = {
      ...base,
      tournamentStats: {
        ...base.tournamentStats,
        assists: null,
      },
    };
    render(<PlayerDetails player={player} onClose={vi.fn()} />);
    expect(screen.queryByText("TOP 100 PLAYER")).not.toBeInTheDocument();
    expect(screen.queryByText("Assists")).not.toBeInTheDocument();
    expect(screen.queryByText(/Not sourced|Unknown/i)).not.toBeInTheDocument();
  });

  it("sorts Giroud's sourced honors by importance without source labels", () => {
    const player = playersById.get("olivier-giroud-2018")!;
    render(<PlayerDetails player={player} onClose={vi.fn()} />);
    const accolades = screen
      .getByText("CAREER ACCOLADES")
      .closest("section")!;
    const rows = within(accolades).getAllByRole("listitem");
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining("1× WORLD CUP CHAMPION"),
      expect.stringContaining("1× UEFA CHAMPIONS LEAGUE CHAMPION"),
      expect.stringContaining("2× DOMESTIC LEAGUE CHAMPION"),
    ]);
    expect(within(accolades).queryByText("FBref")).not.toBeInTheDocument();
    expect(within(accolades).queryByRole("link")).not.toBeInTheDocument();
  });
});
