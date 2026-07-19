import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlayerCard } from "@/components/cards/player-card";
import { players } from "@/data/players";
import type { PlayerStatusTier } from "@/types/game";

describe("PlayerCard rarity treatment", () => {
  it("does not place a tournament-year number over the portrait", () => {
    const player = players.find(
      (candidate) => candidate.id === "eden-hazard-2018",
    )!;
    const { container } = render(
      <PlayerCard
        player={player}
        selected={false}
        onSelect={vi.fn()}
        onInspect={vi.fn()}
      />,
    );
    expect(container.querySelector(".portrait-year")).not.toBeInTheDocument();
  });

  it("uses Messi's card-specific 2006 portrait", () => {
    const player = players.find(
      (candidate) => candidate.id === "lionel-messi-2006",
    )!;
    const { container } = render(
      <PlayerCard player={player} onSelect={vi.fn()} />,
    );

    expect(container.querySelector("img")).toHaveAttribute(
      "src",
      expect.stringMatching(
        /^\/assets\/players\/2006\/lionel-messi-2006\.png\?v=/,
      ),
    );
  });

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
