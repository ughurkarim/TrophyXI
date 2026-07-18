import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlayerCard } from "@/components/cards/player-card";
import { players } from "@/data/players";
import type { PlayerStatusTier } from "@/types/game";

describe("PlayerCard rarity treatment", () => {
  it("applies the selected full-card tier contract for every rarity", () => {
    const tiers: PlayerStatusTier[] = [
      "legend",
      "icon",
      "elite",
      "standout",
      "reliable",
      "role-player",
      "limited",
    ];
    for (const tier of tiers) {
      const player = players.find((candidate) => candidate.statusTier === tier)!;
      const { container, unmount } = render(
        <PlayerCard
          player={player}
          selected
          onSelect={vi.fn()}
          onInspect={vi.fn()}
        />,
      );
      const card = container.querySelector(".player-card");
      expect(card).toHaveClass(
        "player-card--selected",
        `player-card--tier-${tier}`,
      );
      expect(card?.querySelector("h3")).toHaveAttribute(
        "title",
        player.playerName,
      );
      unmount();
    }
  });
});
