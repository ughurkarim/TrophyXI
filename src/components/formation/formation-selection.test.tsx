import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FormationSelection } from "@/components/formation/formation-selection";
import { managersById } from "@/data/managers";

describe("FormationSelection", () => {
  it("selects a formation and continues with it", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    render(
      <FormationSelection
        manager={managersById.get("luiz-felipe-scolari-2002")!}
        eraId="2000s"
        offerIds={["3-5-2", "4-4-2", "4-3-3", "5-3-2"]}
        formationRespinRemaining={1}
        onRespin={vi.fn()}
        onContinue={onContinue}
      />,
    );

    const shape = screen.getByRole("button", { name: /4–4–2/i });
    await user.click(shape);
    expect(shape).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: /enter the draft/i }));
    expect(onContinue).toHaveBeenCalledWith("4-4-2");
  });

  it("renders exactly the seeded four-card offer", () => {
    render(
      <FormationSelection
        manager={managersById.get("luiz-felipe-scolari-2002")!}
        eraId="2000s"
        offerIds={["3-5-2", "4-4-2", "4-3-3", "5-3-2"]}
        formationRespinRemaining={1}
        onRespin={vi.fn()}
        onContinue={vi.fn()}
      />,
    );
    expect(screen.getAllByRole("button", { name: /tactical shape/i })).toHaveLength(4);
  });

  it("confirms the separate formation respin", async () => {
    const user = userEvent.setup();
    const onRespin = vi.fn();
    render(
      <FormationSelection
        manager={managersById.get("luiz-felipe-scolari-2002")!}
        eraId="2000s"
        offerIds={["3-5-2", "4-4-2", "4-3-3", "5-3-2"]}
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
});
