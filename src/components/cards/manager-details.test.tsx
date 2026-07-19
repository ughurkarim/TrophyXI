import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ManagerDetails } from "@/components/cards/manager-details";
import { managersById } from "@/data/managers";

describe("ManagerDetails", () => {
  it("shows the player-facing manager record without development metadata", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const manager = managersById.get("lionel-scaloni-2022")!;
    render(
      <ManagerDetails manager={manager} eraId="2020s" onClose={onClose} />,
    );
    const dialog = screen.getByRole("dialog", { name: /lionel scaloni/i });
    expect(
      within(dialog).getByRole("img", {
        name: /lionel scaloni/i,
      }),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("MANAGER RECORD")).toBeInTheDocument();
    expect(within(dialog).getByText("Era Fit")).toBeInTheDocument();
    expect(within(dialog).getByText("Tactical strengths")).toBeInTheDocument();
    expect(within(dialog).getByText("Tactical weaknesses")).toBeInTheDocument();
    expect(within(dialog).getByText("TOURNAMENT RESULT")).toBeInTheDocument();
    expect(within(dialog).getByText("champion")).toBeInTheDocument();
    expect(
      within(dialog).queryByText("TROPHY XI MANAGER TAGS"),
    ).not.toBeInTheDocument();
    expect(within(dialog).queryByText("PHOTO STATUS")).not.toBeInTheDocument();
    expect(within(dialog).queryByText("PORTRAIT SOURCE")).not.toBeInTheDocument();
    expect(within(dialog).queryByText("ARCHIVE VERSIONS")).not.toBeInTheDocument();
    expect(
      within(dialog).queryByText(/original Trophy XI estimates/i),
    ).not.toBeInTheDocument();
    expect(within(dialog).queryAllByRole("link")).toHaveLength(0);
    expect(
      within(dialog).queryByText(/permission|implementation|portrait source/i),
    ).not.toBeInTheDocument();
    await user.click(
      within(dialog).getByRole("button", { name: /close manager record/i }),
    );
    expect(onClose).toHaveBeenCalledOnce();
  });
});
