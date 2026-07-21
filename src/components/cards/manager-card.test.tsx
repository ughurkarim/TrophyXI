import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ManagerCard } from "@/components/cards/manager-card";
import { managersById } from "@/data/managers";

describe("ManagerCard", () => {
  it("shows five manager metrics, a card-specific portrait, and no player rarity", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onInspect = vi.fn();
    const manager = managersById.get("lionel-scaloni-2022")!;
    const { container } = render(
      <ManagerCard
        manager={manager}
        eraId="2020s"
        selected
        onSelect={onSelect}
        onInspect={onInspect}
      />,
    );

    const card = container.querySelector(".manager-card")!;
    expect(card.querySelectorAll(".manager-card__grades > span")).toHaveLength(
      5,
    );
    expect(within(card as HTMLElement).getByText("ERA FIT")).toBeInTheDocument();
    expect(within(card as HTMLElement).getByText("Selected")).toBeInTheDocument();
    expect(card).not.toHaveTextContent(/iconic|legend|elite|standout|reliable|limited/i);
    expect(card).not.toHaveTextContent(/tournament versions/i);
    expect(card.querySelector("img")).toHaveAttribute(
      "src",
      expect.stringContaining("/assets/managers/lionel-scaloni-2022.png"),
    );

    await user.click(
      screen.getByRole("button", {
        name: /choose lionel scaloni, argentina 2022/i,
      }),
    );
    expect(onSelect).toHaveBeenCalledOnce();
    await user.click(
      screen.getByRole("button", {
        name: /view manager record for lionel scaloni/i,
      }),
    );
    expect(onInspect).toHaveBeenCalledOnce();
  });

  it("keeps a manager with a neutral identity marker selectable", () => {
    const manager = managersById.get("herve-renard-2022")!;
    render(
      <ManagerCard
        manager={manager}
        eraId="2020s"
        onSelect={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("img", {
        name: /hervé renard 2022 portrait/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /choose hervé renard, saudi arabia 2022/i,
      }),
    ).toBeEnabled();
  });
});
