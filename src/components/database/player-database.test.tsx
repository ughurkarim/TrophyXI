import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlayerDatabase } from "@/components/database/player-database";
import { draftEligiblePlayers } from "@/data/players";

describe("PlayerDatabase", () => {
  it("searches the expanded archive and exposes every Messi and Ronaldo version", () => {
    render(<PlayerDatabase />);

    expect(screen.getByRole("heading", { name: "Player Database" })).toBeVisible();
    expect(screen.getByText("Cards").parentElement).toHaveTextContent(
      String(draftEligiblePlayers.length),
    );
    expect(screen.getByText("Identities").parentElement).toHaveTextContent(
      String(
        new Set(
          draftEligiblePlayers.map((player) => player.playerIdentityId),
        ).size,
      ),
    );

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
      expect(portrait).toHaveTextContent("PHOTO PENDING");
      expect(portrait).toHaveTextContent("🇦🇷 2006");
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

    fireEvent.change(screen.getByPlaceholderText("Search player or nation"), {
      target: { value: "Siphiwe Tshabalala" },
    });
    expect(
      screen.getByRole("button", {
        name: /view siphiwe tshabalala 2010/i,
      }),
    ).toBeVisible();
  });
});
