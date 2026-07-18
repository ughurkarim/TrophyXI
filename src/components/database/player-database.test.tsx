import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlayerDatabase } from "@/components/database/player-database";

describe("PlayerDatabase", () => {
  it("searches the expanded archive and exposes every Messi and Ronaldo version", () => {
    render(<PlayerDatabase />);

    expect(screen.getByRole("heading", { name: "Player Database" })).toBeVisible();
    expect(screen.getByText("Cards").parentElement).toHaveTextContent("629");
    expect(screen.getByText("Identities").parentElement).toHaveTextContent("287");

    fireEvent.change(screen.getByPlaceholderText("Search player or nation"), {
      target: { value: "Lionel Messi" },
    });
    expect(
      screen.getAllByRole("button", { name: /view lionel messi/i }),
    ).toHaveLength(6);

    fireEvent.change(screen.getByPlaceholderText("Search player or nation"), {
      target: { value: "Cristiano Ronaldo" },
    });
    expect(
      screen.getAllByRole("button", { name: /view cristiano ronaldo/i }),
    ).toHaveLength(6);
  });
});
