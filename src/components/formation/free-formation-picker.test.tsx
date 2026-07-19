import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FreeFormationPicker } from "@/components/formation/free-formation-picker";
import { formations } from "@/data/formations";
import { managersById } from "@/data/managers";

const manager = managersById.get("luiz-felipe-scolari-2002")!;
const formationIds = formations.map((formation) => formation.id);

describe("FreeFormationPicker", () => {
  it("shows every active formation in the compact archive without a respin", () => {
    render(
      <FreeFormationPicker
        manager={manager}
        eraId="all"
        formationIds={formationIds}
        onContinue={vi.fn()}
      />,
    );

    const archive = screen.getByTestId("free-formation-archive");
    expect(
      within(archive).getAllByRole("button", {
        name: /^choose .*formation, manager fit/i,
      }),
    ).toHaveLength(formations.length);
    expect(screen.getByText(`${formations.length} formations available`)).toBeVisible();
    expect(
      screen.queryByRole("button", { name: /formation respin/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/recommended/i)).not.toBeInTheDocument();
    expect(
      screen
        .getAllByRole("button", {
          name: /^choose .*formation, manager fit/i,
        })
        .every((option) => option.getAttribute("aria-pressed") === "false"),
    ).toBe(true);
  });

  it("requires an explicit formation choice before continuing to the squad", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    render(
      <FreeFormationPicker
        manager={manager}
        eraId="2000s"
        formationIds={formationIds}
        onContinue={onContinue}
      />,
    );

    const continueButton = screen.getByRole("button", {
      name: /continue to squad/i,
    });
    expect(continueButton).toBeDisabled();
    expect(
      within(screen.getByTestId("free-formation-context")).getByText(
        manager.managerName,
      ),
    ).toBeVisible();

    const choice = screen.getByRole("button", {
      name: /choose 4–3–3 formation/i,
    });
    await user.click(choice);
    expect(choice).toHaveAttribute("aria-pressed", "true");
    expect(continueButton).toBeEnabled();

    await user.click(continueButton);
    expect(onContinue).toHaveBeenCalledWith("4-3-3");
  });
});
