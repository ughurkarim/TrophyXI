import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OpponentSelection } from "@/components/draft/opponent-selection";
import {
  historicalOpponents,
  worldCupAllStars,
} from "@/data/opponents";
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

  it("shows the featured All-Stars and exactly fifteen champions newest first", () => {
    render(<OpponentSelection eraId="1970s" onContinue={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: /select world cup all-stars/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /fifteen champions.*knockout match/i,
      }),
    ).toBeInTheDocument();

    const championButtons = historicalOpponents.map((opponent) =>
      screen.getByRole("button", {
        name: new RegExp(
          `select ${opponent.nationName} ${opponent.tournamentYear}`,
          "i",
        ),
      }),
    );
    expect(championButtons).toHaveLength(15);
    expect(
      historicalOpponents.map((opponent) => opponent.tournamentYear),
    ).toEqual(
      [...historicalOpponents]
        .map((opponent) => opponent.tournamentYear)
        .sort((first, second) => (second ?? 0) - (first ?? 0)),
    );
  });

  it("presents Zagallo's All-Stars manager profile", () => {
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
      expect(within(allStars).getByText(label, { exact: true })).toBeVisible();
    }
  });

  it("shows the champion lockup and opens its optional XI drawer", async () => {
    const user = userEvent.setup();
    const champion = historicalOpponents[0]!;
    render(<OpponentSelection eraId="2020s" onContinue={vi.fn()} />);

    const selectButton = screen.getByRole("button", {
        name: new RegExp(
          `select ${champion.nationName} ${champion.tournamentYear}`,
          "i",
        ),
    });
    await user.click(selectButton);
    const card = selectButton.closest("article")!;
    expect(within(card).getByText(champion.managerName!)).toBeVisible();
    expect(
      within(card).getByText(
        champion.formationLabel ?? champion.formation,
      ),
    ).toBeVisible();
    expect(within(card).getByText(/world champion/i)).toBeVisible();
    expect(
      within(card).getByLabelText(`${champion.nationName} ratings`),
    ).toHaveTextContent(String(champion.ratings.overall));

    await user.click(
      within(card).getByRole("button", { name: /view .* lineup/i }),
    );
    const drawer = screen.getByRole("dialog", {
      name: new RegExp(`${champion.nationName} ${champion.tournamentYear}`, "i"),
    });
    expect(within(drawer).getByRole("list", {
      name: new RegExp(`${champion.nationName}.*starting eleven`, "i"),
    }).children).toHaveLength(11);
    expect(within(drawer).getByRole("list", {
      name: new RegExp(`${champion.nationName}.*available substitutes`, "i"),
    }).children).toHaveLength(champion.substitutes.length);
  });

  it("uses stable footer labels and keeps selection keyboard accessible", async () => {
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
    ).toBeEnabled();
  });

  it("keeps champions selectable when their lineup shares a squad identity", async () => {
    const user = userEvent.setup();
    const onEditSquad = vi.fn();
    useGameStore.setState({
      picks: [
        { slotId: "slot-0", cardId: "lionel-messi-2022" },
        ...Array.from({ length: 10 }, (_, index) => ({
          slotId: `slot-${index + 1}`,
          cardId: `starter-${index}`,
        })),
      ],
    });
    render(
      <OpponentSelection
        eraId="2020s"
        onContinue={vi.fn()}
        onEditSquad={onEditSquad}
      />,
    );

    expect(
      screen.getByRole("button", { name: /select argentina 2022/i }),
    ).toBeEnabled();
    expect(screen.queryByText("SQUAD CONFLICT")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /select world cup all-stars/i }),
    ).toBeEnabled();
    await user.click(
      screen.getByRole("button", { name: /edit squad/i }),
    );
    expect(onEditSquad).toHaveBeenCalledOnce();
  });

  it("does not expose archive controls, implementation labels, or sources", () => {
    render(<OpponentSelection eraId="2020s" onContinue={vi.fn()} />);

    for (const controlName of [
      "Champions Only",
      "Tournament year",
      "Nation",
      "Tournament finish",
      "Confederation",
      "Difficulty",
      "Historical data status",
    ]) {
      expect(
        screen.queryByRole(/Champions Only/.test(controlName) ? "switch" : "combobox", {
          name: controlName,
        }),
      ).not.toBeInTheDocument();
    }
    for (const hiddenCopy of [
      /Partial Historical Data/i,
      /Modeled Lineup/i,
      /Manager Not sourced/i,
      /Lineup Not sourced/i,
      /Complete participant archive/i,
      /research/i,
      /provenance/i,
      /source:/i,
    ]) {
      expect(screen.queryByText(hiddenCopy)).not.toBeInTheDocument();
    }
    expect(
      screen.getByRole("button", { name: /select spain 2026/i }),
    ).toBeEnabled();
  });
});
