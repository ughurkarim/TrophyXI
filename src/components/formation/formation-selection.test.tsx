import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FormationSelection } from "@/components/formation/formation-selection";
import { formations } from "@/data/formations";
import { managersById } from "@/data/managers";
import { calculateManagerFit } from "@/engine/chemistry";
import {
  calculateFormationEraFit,
  calculateFormationRecommendationScore,
} from "@/engine/formation-fit";

const manager = managersById.get("luiz-felipe-scolari-2002")!;
const offerIds = ["3-5-2", "4-4-2", "4-3-3", "5-3-2"] as const;

describe("FormationSelection", () => {
  it("requires an explicit formation selection before continuing", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    render(
      <FormationSelection
        manager={manager}
        eraId="2000s"
        offerIds={[...offerIds]}
        formationRespinRemaining={1}
        onRespin={vi.fn()}
        onContinue={onContinue}
      />,
    );

    const enterDraft = screen.getByRole("button", { name: "ENTER DRAFT →" });
    expect(enterDraft).toBeDisabled();
    expect(
      screen
        .getAllByRole("button", { name: /choose .* formation, manager fit/i })
        .every((card) => card.getAttribute("aria-pressed") === "false"),
    ).toBe(true);

    const shape = screen.getByRole("button", {
      name: /choose 4–4–2 formation/i,
    });
    await user.click(shape);
    expect(shape).toHaveAttribute("aria-pressed", "true");
    expect(enterDraft).toBeEnabled();
    await user.click(enterDraft);
    expect(onContinue).toHaveBeenCalledWith("4-4-2");
  });

  it("renders the compact brief, separate context fields, and four complete cards", () => {
    render(
      <FormationSelection
        manager={manager}
        eraId="2000s"
        offerIds={[...offerIds]}
        formationRespinRemaining={1}
        onRespin={vi.fn()}
        onContinue={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Choose your system." }),
    ).toBeVisible();
    expect(
      screen.getByText(
        "Select the formation that best fits your manager, the match era, and the squad you want to build.",
      ),
    ).toBeVisible();
    const context = screen.getByTestId("formation-context");
    expect(within(context).getByText("Manager")).toBeVisible();
    expect(within(context).getByText(manager.managerName)).toBeVisible();
    expect(within(context).getByText("Style")).toBeVisible();
    expect(within(context).getByText(manager.style)).toBeVisible();
    expect(within(context).getByText("Match Era")).toBeVisible();
    expect(within(context).getByText("2000s")).toBeVisible();
    expect(context).not.toHaveTextContent("2002—2006");
    expect(
      screen.getAllByRole("button", {
        name: /choose .* formation, manager fit/i,
      }),
    ).toHaveLength(4);
    expect(screen.getAllByText(/tactical identity/i)).toHaveLength(4);
    expect(screen.getAllByText(/attack/i)).toHaveLength(4);
    expect(screen.getAllByText(/control/i)).toHaveLength(4);
    expect(screen.getAllByText(/defense/i)).toHaveLength(4);
    expect(document.querySelectorAll('[data-fit-kind="manager"]')).toHaveLength(
      4,
    );
    expect(document.querySelectorAll('[data-fit-kind="era"]')).toHaveLength(4);
  });

  it("recommends the strongest combined production Manager Fit and Era Fit", () => {
    render(
      <FormationSelection
        manager={manager}
        eraId="2000s"
        offerIds={[...offerIds]}
        formationRespinRemaining={1}
        onRespin={vi.fn()}
        onContinue={vi.fn()}
      />,
    );

    const expected = offerIds
      .map((id) => formations.find((formation) => formation.id === id)!)
      .map((formation) => {
        const managerFit = calculateManagerFit(manager, formation, "2000s");
        const eraFit = calculateFormationEraFit(formation, "2000s");
        return {
          formation,
          managerFit,
          eraFit,
          score: calculateFormationRecommendationScore(managerFit, eraFit),
        };
      })
      .reduce((best, current) =>
        current.score > best.score ||
        (current.score === best.score &&
          current.managerFit > best.managerFit)
          ? current
          : best,
      );

    const recommendedCard = document.querySelector(
      `[data-formation-id="${expected.formation.id}"]`,
    );
    expect(recommendedCard).not.toBeNull();
    expect(
      within(recommendedCard as HTMLElement).getByText("Recommended"),
    ).toBeVisible();
    expect(screen.getAllByText("Recommended")).toHaveLength(1);
    expect(
      new Set(
        Array.from(
          document.querySelectorAll<HTMLElement>("[data-era-fit]"),
          (card) => card.dataset.eraFit,
        ),
      ).size,
    ).toBeGreaterThan(1);
    expect(
      screen
        .getAllByRole("button", { name: /choose .* formation, manager fit/i })
        .some((card) => card.getAttribute("aria-pressed") === "true"),
    ).toBe(false);
  });

  it("confirms the separate formation respin", async () => {
    const user = userEvent.setup();
    const onRespin = vi.fn();
    render(
      <FormationSelection
        manager={manager}
        eraId="2000s"
        offerIds={[...offerIds]}
        formationRespinRemaining={1}
        onRespin={onRespin}
        onContinue={vi.fn()}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: "FORMATION RESPIN ×1" }),
    );
    expect(
      screen.getByRole("dialog", {
        name: /replace all four formation choices/i,
      }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /use formation respin/i }),
    );
    expect(onRespin).toHaveBeenCalledOnce();
  });

  it("keeps the Selected System summary limited to its required fields", async () => {
    const user = userEvent.setup();
    render(
      <FormationSelection
        manager={manager}
        eraId="2000s"
        offerIds={[...offerIds]}
        formationRespinRemaining={1}
        onRespin={vi.fn()}
        onContinue={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: /choose 3–5–2 formation/i,
      }),
    );
    const selectedSystem = screen.getByTestId("selected-system");
    expect(selectedSystem).toHaveTextContent("Selected System");
    expect(selectedSystem).toHaveTextContent("3–5–2");
    expect(selectedSystem).toHaveTextContent("Manager Fit");
    expect(selectedSystem).toHaveTextContent("ENTER DRAFT →");
    expect(selectedSystem).not.toHaveTextContent("Era Fit");
    expect(selectedSystem).not.toHaveTextContent("2000s");
    expect(selectedSystem).not.toHaveTextContent(
      "Wing-backs stretch the pitch",
    );
  });
});
