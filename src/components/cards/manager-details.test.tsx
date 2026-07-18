import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ManagerDetails } from "@/components/cards/manager-details";
import { managersById } from "@/data/managers";

describe("ManagerDetails", () => {
  it("shows Photo Pending, grades, strengths, and tags", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const manager = managersById.get("lionel-scaloni-2022")!;
    render(<ManagerDetails manager={manager} onClose={onClose} />);
    const dialog = screen.getByRole("dialog", { name: /lionel scaloni/i });
    expect(
      within(dialog).getByRole("img", {
        name: /photo pending for lionel scaloni 2022/i,
      }),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("TOURNAMENT MODEL")).toBeInTheDocument();
    expect(within(dialog).getByText("Tactical strengths")).toBeInTheDocument();
    expect(within(dialog).getByText("Tactical weaknesses")).toBeInTheDocument();
    expect(
      within(dialog).getByText("TROPHY XI MANAGER TAGS"),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("MANAGER ACCOLADES")).toBeInTheDocument();
    expect(within(dialog).getByText("PHOTO STATUS")).toBeInTheDocument();
    expect(within(dialog).queryByText("PORTRAIT SOURCE")).not.toBeInTheDocument();
    await user.click(
      within(dialog).getByRole("button", { name: /close manager record/i }),
    );
    expect(onClose).toHaveBeenCalledOnce();
  });
});
