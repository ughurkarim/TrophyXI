import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ResultPage from "@/app/result/page";
import { getFormation } from "@/data/formations";
import { managersById } from "@/data/managers";
import { resolveWorldCupAllStars } from "@/engine/all-stars";
import { calculateTeamRatings } from "@/engine/ratings";
import { simulateMatch } from "@/engine/simulation";
import { playersById } from "@/data/players";
import { useGameStore } from "@/store/game-store";

const router = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

const formation = getFormation("4-3-3");
const manager = managersById.get("joachim-low-2014")!;
const testLineup = [
  "manuel-neuer-2014",
  "roberto-carlos-2002",
  "fabio-cannavaro-2006",
  "carles-puyol-2010",
  "philipp-lahm-2014",
  "andrea-pirlo-2006",
  "xavi-2010",
  "luka-modric-2018",
  "kylian-mbappe-2022",
  "ronaldo-2002",
  "lionel-messi-2014",
].map((id) => playersById.get(id)!);
const bench = ["pele-1970", "diego-maradona-1986", "zico-1982"].map(
  (id) => playersById.get(id)!,
);

describe("ResultPage", () => {
  beforeEach(() => {
    router.push.mockReset();
    router.replace.mockReset();
    useGameStore.getState().clearGame();

    const opponent = resolveWorldCupAllStars(
      [...testLineup, ...bench].map((player) => player.playerIdentityId),
    );
    const picks = formation.slots.map((slot, index) => ({
      slotId: slot.id,
      cardId: testLineup[index].id,
    }));
    const result = simulateMatch({
      lineup: testLineup,
      bench,
      picks,
      formation,
      manager,
      eraId: "2010s",
      opponent,
      seed: 1970,
    });

    useGameStore.setState({
      hasHydrated: true,
      eraId: "2010s",
      formationId: formation.id,
      managerId: manager.id,
      picks,
      benchPicks: bench.map((player, index) => ({
        slotId: `bench-${index + 1}` as "bench-1" | "bench-2" | "bench-3",
        cardId: player.id,
      })),
      selectedOpponentId: opponent.id,
      matchResult: {
        ...result,
        playerMinutes: result.playerMinutes.map((player) =>
          player.cardId === bench[2].id
            ? {
                ...player,
                minutes: 0,
                enteredAt: null,
                leftAt: null,
              }
            : player,
        ),
        userRatings: calculateTeamRatings(testLineup, formation, {
          picks,
          manager,
          eraId: "2010s",
          bench,
        }),
      },
    });
  });

  it("presents a clean final record without internal match metadata", () => {
    render(<ResultPage />);

    expect(
      screen.getByRole("heading", {
        name: "History renders its verdict.",
      }),
    ).toBeVisible();
    expect(
      within(screen.getByTestId("result-hero")).getByText("FINAL RECORD"),
    ).toBeVisible();
    expect(screen.queryByText(/the archive answers back/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/player of the match/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\bnull\b/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        /original combined squad|trophy xi composite|matches not sourced|normal fatigue|deterministic substitutions/i,
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/bench \d priority|influence \d+/i),
    ).not.toBeInTheDocument();
    expect(
      within(screen.getByTestId("match-report")).queryByText(/\bseed\b/i),
    ).not.toBeInTheDocument();
  });

  it("shows the compact report, two XIs, contributions, timeline, and share recap", () => {
    render(<ResultPage />);

    const ratings = screen.getByTestId("final-ratings");
    for (const label of ["ATK", "MID", "DEF", "CHEM", "OVR"]) {
      expect(within(ratings).getByText(label)).toBeVisible();
    }

    const userSheet = screen.getByTestId("trophy-xi-team-sheet");
    const opponentSheet = screen.getByTestId("opponent-team-sheet");
    expect(within(userSheet).getByText("Trophy XI")).toBeVisible();
    expect(within(userSheet).getByText("Joachim Löw")).toBeVisible();
    expect(within(opponentSheet).getByText(/World Cup All-Stars/i)).toBeVisible();
    expect(within(opponentSheet).getByText("Mário Zagallo")).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Two XIs. One final record." }),
    ).toBeVisible();

    const contributions = screen.getByTestId("squad-contributions");
    expect(within(contributions).getAllByRole("article")).toHaveLength(14);
    expect(within(contributions).queryByText(/−0% placement/)).not.toBeInTheDocument();
    expect(within(contributions).getByText("Did not enter")).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "How the match turned" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Take the result with you" }),
    ).toBeVisible();
    expect(screen.getByTestId("share-card-preview")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Copy result summary" }),
    ).toBeVisible();
  });
});
