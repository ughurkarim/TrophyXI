import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlayerDatabase } from "@/components/database/player-database";

describe("PlayerDatabase", () => {
  it("searches the expanded archive and exposes every Messi and Ronaldo version", () => {
    render(<PlayerDatabase />);

    expect(screen.getByRole("heading", { name: "Player Database" })).toBeVisible();
    expect(screen.getByText("Cards").parentElement).toHaveTextContent("1376");
    expect(screen.getByText("Identities").parentElement).toHaveTextContent("676");

    fireEvent.change(screen.getByPlaceholderText("Search player or nation"), {
      target: { value: "Lionel Messi" },
    });
    expect(
      screen.getAllByRole("button", { name: /view lionel messi/i }),
    ).toHaveLength(6);
    fireEvent.click(
      screen.getByRole("button", { name: /view lionel messi 2006/i }),
    );
    const playerRecord = screen.getByRole("dialog", {
      name: /lionel messi/i,
    });
    for (const portrait of within(playerRecord).getAllByRole("img", {
      name: /lionel messi 2006 portrait/i,
    })) {
      expect(portrait).toHaveAttribute(
        "src",
        expect.stringMatching(
          /^\/assets\/players\/2006\/lionel-messi-2006\.png\?v=/,
        ),
      );
    }
    fireEvent.click(
      screen.getByRole("button", { name: /close player record/i }),
    );

    fireEvent.change(screen.getByPlaceholderText("Search player or nation"), {
      target: { value: "Cristiano Ronaldo" },
    });
    expect(
      screen.getAllByRole("button", { name: /view cristiano ronaldo/i }),
    ).toHaveLength(6);
  });
});
