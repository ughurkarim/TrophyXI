import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OpponentSelection } from "@/components/draft/opponent-selection";
import { worldCupAllStars } from "@/data/opponents";
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

  it("presents Zagallo's real 1970 profile without archive-status wording", () => {
    render(<OpponentSelection eraId="1970s" onContinue={vi.fn()} />);
    const allStars = screen.getByRole("button", {
      name: /select world cup all-stars/i,
    });

    expect(worldCupAllStars.allStars?.manager).toMatchObject({
      id: "mario-zagallo-1970",
      managerIdentityId: "mario-zagallo",
      managerName: "Mário Zagallo",
      countryCode: "BRA",
      countryName: "Brazil",
      tournamentYear: 1970,
      style: "fluid",
      preferredFormations: ["4-3-3", "4-2-3-1"],
    });
    expect(worldCupAllStars.formation).toBe(
      worldCupAllStars.allStars?.manager.preferredFormations[0],
    );
    expect(
      within(allStars).getByText(/Mário Zagallo · 🇧🇷 Brazil 1970/i),
    ).toBeInTheDocument();
    for (const label of [
      "OFF",
      "DEF",
      "Leadership",
      "Game Management",
      "Era Fit",
      "Preferred formations",
      "Tactical style",
    ]) {
      expect(
        within(allStars).getByText(label, { exact: true }),
      ).toBeVisible();
    }
    for (const hiddenCopy of [
      /Partial Historical Data/i,
      /Trophy XI Modeled Lineup/i,
      /Trophy XI Manager/i,
      /Trophy XI composite manager/i,
      /Manager Not sourced/i,
    ]) {
      expect(screen.queryByText(hiddenCopy)).not.toBeInTheDocument();
    }
    expect(
      screen.queryByRole("combobox", { name: "Historical data status" }),
    ).not.toBeInTheDocument();
  });

  it("uses stable player-facing footer labels for All-Stars and champions", async () => {
    const user = userEvent.setup();
    render(<OpponentSelection eraId="1970s" onContinue={vi.fn()} />);

    expect(screen.getByText("Choose one opponent")).toBeInTheDocument();
    const allStars = screen.getByRole("button", {
      name: /select world cup all-stars/i,
    });
    await user.click(allStars);
    expect(allStars).toHaveAttribute("aria-pressed", "true");
    expect(within(allStars).getByText("Selected")).toBeVisible();
    expect(
      screen.getByText("World Cup All-Stars · Mythic"),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /select brazil 1970/i }),
    );
    expect(allStars).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Brazil 1970")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /enter the tunnel/i }),
    ).toHaveTextContent("Enter the tunnel");
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
