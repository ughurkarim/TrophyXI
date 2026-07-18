import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlayerDatabase } from "@/components/database/player-database";

describe("PlayerDatabase", () => {
  it("searches all draftable cards and exposes real and pending photo filters", () => {
    render(<PlayerDatabase />);

    expect(screen.getByRole("heading", { name: "Player Database" })).toBeVisible();
    expect(screen.getAllByText("310", { selector: "dd" })).toHaveLength(2);

    fireEvent.change(screen.getByPlaceholderText("Search player or nation"), {
      target: { value: "Lionel Messi" },
    });
    expect(
      screen.getByRole("button", {
        name: /view lionel messi 2014, rated 96, photo pending/i,
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", {
        name: /view lionel messi 2022, rated 99, photo pending/i,
      }),
    ).toBeVisible();

    fireEvent.change(screen.getByLabelText("Photo"), {
      target: { value: "pending" },
    });
    expect(
      screen.getByRole("button", {
        name: /view lionel messi 2014, rated 96, photo pending/i,
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", {
        name: /view lionel messi 2022, rated 99, photo pending/i,
      }),
    ).toBeVisible();
  });
});
