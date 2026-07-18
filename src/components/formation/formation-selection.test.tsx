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
        eraId="turn-of-century"
        onContinue={onContinue}
      />,
    );

    const shape = screen.getByRole("button", { name: /4–4–2/i });
    await user.click(shape);
    expect(shape).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: /enter the draft/i }));
    expect(onContinue).toHaveBeenCalledWith("4-4-2");
  });
});
