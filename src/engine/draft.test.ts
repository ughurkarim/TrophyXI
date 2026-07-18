import { describe, expect, it } from "vitest";
import { getFormation } from "@/data/formations";
import { draftEligiblePlayers, players } from "@/data/players";
import {
  canPlacePlayer,
  generateDraftOptions,
  generateBenchOptions,
  getPlacementPenaltyPercent,
  getPositionFit,
  getPositionFitState,
  hasDraftCompletionPath,
  hasDuplicatePlayers,
  hasDuplicatePicks,
  isEligibleForSlot,
} from "@/engine/draft";

describe("draft engine", () => {
  const formation = getFormation("4-3-3");

  it("keeps goalkeeper and outfield placement boundaries strict", () => {
    const goalkeeper = players.find(
      (player) => player.id === "manuel-neuer-2014",
    )!;
    const striker = players.find((player) => player.id === "ronaldo-2002")!;
    expect(isEligibleForSlot(goalkeeper, formation.slots[0])).toBe(true);
    expect(isEligibleForSlot(striker, formation.slots[0])).toBe(false);
    expect(isEligibleForSlot(goalkeeper, formation.slots[9])).toBe(false);
    expect(isEligibleForSlot(striker, formation.slots[9])).toBe(true);
  });

  it("classifies fit and uses one monotonic, capped penalty formula", () => {
    expect(getPositionFitState(96)).toBe("green");
    expect(getPositionFitState(82)).toBe("yellow");
    expect(getPositionFitState(58)).toBe("red");
    expect(getPositionFitState(44)).toBe("incompatible");
    expect(getPlacementPenaltyPercent(96)).toBe(1);
    expect(getPlacementPenaltyPercent(82)).toBe(7);
    expect(getPlacementPenaltyPercent(74)).toBe(10);
    expect(getPlacementPenaltyPercent(58)).toBe(18);
    expect(getPlacementPenaltyPercent(45)).toBe(25);
    for (let fit = 46; fit <= 100; fit += 1) {
      expect(getPlacementPenaltyPercent(fit)).toBeLessThanOrEqual(
        getPlacementPenaltyPercent(fit - 1),
      );
    }
  });

  it("scores exact, related, declared, and incompatible fits", () => {
    const centerBack = players.find(
      (player) => player.id === "fabio-cannavaro-2006",
    )!;
    const fullback = players.find(
      (player) => player.id === "roberto-carlos-1998",
    )!;
    expect(getPositionFit(centerBack, formation.slots[2])).toBe(94);
    expect(getPositionFit(fullback, formation.slots[1])).toBe(100);
    expect(getPositionFit(fullback, formation.slots[8])).toBeGreaterThanOrEqual(
      45,
    );
    expect(getPositionFit(fullback, formation.slots[0])).toBe(0);
  });

  it("returns five deterministic, identity-safe, position-diverse cards", () => {
    const options = generateDraftOptions(
      draftEligiblePlayers,
      formation,
      [],
      1234,
      0,
    );
    const repeat = generateDraftOptions(
      draftEligiblePlayers,
      formation,
      [],
      1234,
      0,
    );
    expect(options).toHaveLength(5);
    expect(options.map((option) => option.id)).toEqual(
      repeat.map((option) => option.id),
    );
    expect(
      new Set(options.map((option) => option.playerIdentityId)).size,
    ).toBe(5);
    expect(new Set(options.map((option) => option.primaryPosition)).size).toBeGreaterThan(
      1,
    );
    expect(
      options.some((player) =>
        formation.slots.some((slot) =>
          canPlacePlayer({
            cards: draftEligiblePlayers,
            formation,
            picks: [],
            player,
            slot,
          }),
        ),
      ),
    ).toBe(true);
  });

  it("keeps sampled starter and bench offers inside quality limits", () => {
    const starterOffers = Array.from({ length: 100 }, (_, seed) =>
      generateDraftOptions(
        draftEligiblePlayers,
        formation,
        [],
        4_000 + seed,
        0,
      ),
    );
    const benchOffers = Array.from({ length: 100 }, (_, seed) =>
      generateBenchOptions(
        draftEligiblePlayers,
        [],
        [],
        8_000 + seed,
        0,
      ),
    );
    expect(
      starterOffers.filter((offer) =>
        offer.every((player) => player.overall < 90),
      ).length,
    ).toBeGreaterThan(50);
    for (const offer of starterOffers) {
      expect(offer).toHaveLength(5);
      expect(new Set(offer.map((player) => player.playerIdentityId)).size).toBe(
        5,
      );
      expect(
        offer.filter((player) => player.overall >= 90).length,
      ).toBeLessThanOrEqual(2);
      expect(
        offer.filter((player) =>
          ["legend", "icon"].includes(player.statusTier),
        ).length,
      ).toBeLessThanOrEqual(2);
    }
    for (const offer of benchOffers) {
      expect(
        offer.filter((player) => player.overall >= 90).length,
      ).toBeLessThanOrEqual(1);
      expect(
        offer.filter((player) => player.overall >= 86).length,
      ).toBeLessThanOrEqual(2);
      expect(
        offer.filter((player) => player.overall < 82).length,
      ).toBeGreaterThanOrEqual(2);
      expect(offer.some((player) => player.overall < 78)).toBe(true);
    }
    const average = (offers: typeof starterOffers) =>
      offers
        .flat()
        .reduce((sum, player) => sum + player.overall, 0) /
      offers.flat().length;
    expect(average(benchOffers)).toBeLessThan(average(starterOffers));
  });

  it("prevents drafted identities and alternate versions from returning", () => {
    const picks = [{ slotId: "lw", cardId: "kylian-mbappe-2018" }];
    const options = generateDraftOptions(players, formation, picks, 2026, 1);
    expect(options.map((option) => option.id)).not.toContain(
      "kylian-mbappe-2022",
    );
    expect(
      hasDuplicatePicks([
        { slotId: "cm", cardId: options[0].id },
        { slotId: "rcm", cardId: options[0].id },
      ]),
    ).toBe(true);
    expect(
      hasDuplicatePlayers(
        [
          { slotId: "lw", cardId: "kylian-mbappe-2018" },
          { slotId: "rw", cardId: "kylian-mbappe-2022" },
        ],
        players,
      ),
    ).toBe(true);
  });

  it("detects impossible remaining drafts with maximum matching", () => {
    const outfieldOnly = players
      .filter((player) => player.primaryPosition !== "GK")
      .slice(0, 40);
    expect(
      hasDraftCompletionPath({
        cards: outfieldOnly,
        formation,
        picks: [],
      }),
    ).toBe(false);
    expect(
      hasDraftCompletionPath({
        cards: players,
        formation,
        picks: [],
      }),
    ).toBe(true);
  });
});
