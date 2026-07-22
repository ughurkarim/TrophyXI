import { describe, expect, it } from "vitest";
import { formations, getFormation } from "@/data/formations";
import {
  draftEligiblePlayers,
  playersById,
} from "@/data/players";
import { getPositionFit } from "@/engine/draft";
import {
  generateFreeSelectionSquad,
  MIN_RANDOM_POSITION_FIT,
  scoreFreeSelectionRosterImpact,
} from "@/engine/free-selection";
import type { PlayerTournamentCard } from "@/types/game";

const cardsFor = (
  squad: ReturnType<typeof generateFreeSelectionSquad>,
) =>
  [...squad.picks, ...squad.benchPicks].map(
    (pick) => playersById.get(pick.cardId)!,
  );

describe("Free Selection random squad generation", () => {
  it("ranks actual roster improvement above a perfect-fit label", () => {
    const perfectFit = scoreFreeSelectionRosterImpact({
      playerOverall: 88,
      positionFit: 100,
      overallGain: 0,
      chemistryGain: 0,
      managerFitGain: 0,
      eraFit: 85,
      versatility: 2,
      isBench: false,
    });
    const strongerRoster = scoreFreeSelectionRosterImpact({
      playerOverall: 91,
      positionFit: 88,
      overallGain: 1,
      chemistryGain: 1,
      managerFitGain: 1,
      eraFit: 85,
      versatility: 2,
      isBench: false,
    });

    expect(strongerRoster).toBeGreaterThan(perfectFit);
  });

  it("does not use positional fit when ranking bench impact", () => {
    const input = {
      playerOverall: 90,
      overallGain: 0,
      chemistryGain: 2,
      managerFitGain: 1,
      eraFit: 82,
      versatility: 4,
      isBench: true,
    };
    expect(
      scoreFreeSelectionRosterImpact({ ...input, positionFit: 100 }),
    ).toBe(scoreFreeSelectionRosterImpact({ ...input, positionFit: 48 }));
  });

  it("is deterministic and varies with the supplied seed", () => {
    const formation = getFormation("4-3-3");
    const first = generateFreeSelectionSquad({
      formation,
      cards: draftEligiblePlayers,
      seed: 2026,
    });
    const repeat = generateFreeSelectionSquad({
      formation,
      cards: draftEligiblePlayers,
      seed: 2026,
    });
    const different = generateFreeSelectionSquad({
      formation,
      cards: draftEligiblePlayers,
      seed: 2027,
    });

    expect(repeat).toEqual(first);
    expect(different).not.toEqual(first);
  });

  it.each(formations)(
    "builds a strong identity-safe $id XI and ordered three-player bench",
    (formation) => {
      const squad = generateFreeSelectionSquad({
        formation,
        cards: draftEligiblePlayers,
        seed: 91 + formation.id.length,
      });
      expect(squad.picks).toHaveLength(11);
      expect(squad.benchPicks).toEqual([
        expect.objectContaining({ slotId: "bench-1" }),
        expect.objectContaining({ slotId: "bench-2" }),
        expect.objectContaining({ slotId: "bench-3" }),
      ]);
      expect(new Set(squad.picks.map((pick) => pick.slotId))).toEqual(
        new Set(formation.slots.map((slot) => slot.id)),
      );

      const squadCards = cardsFor(squad);
      expect(squadCards).toHaveLength(14);
      expect(
        new Set(squadCards.map((card) => card.playerIdentityId)).size,
      ).toBe(14);

      for (const pick of squad.picks) {
        const slot = formation.slots.find(
          (candidate) => candidate.id === pick.slotId,
        )!;
        const card = playersById.get(pick.cardId)!;
        expect(getPositionFit(card, slot)).toBeGreaterThanOrEqual(
          MIN_RANDOM_POSITION_FIT,
        );
        if (slot.position === "GK") {
          expect(card.primaryPosition).toBe("GK");
        } else {
          expect(card.primaryPosition).not.toBe("GK");
        }
      }

      const bench = squad.benchPicks.map(
        (pick) => playersById.get(pick.cardId)!,
      );
      const outfieldPositions = new Set(
        bench
          .filter((card) => card.primaryPosition !== "GK")
          .flatMap((card) => [card.primaryPosition, ...card.eligiblePositions]),
      );
      expect(
        [...outfieldPositions].some((position) =>
          ["LB", "LCB", "CB", "RCB", "RB", "LWB", "RWB", "DM"].includes(
            position,
          ),
        ),
      ).toBe(true);
      expect(
        [...outfieldPositions].some((position) =>
          ["AM", "LM", "RM", "LW", "RW", "CF", "ST"].includes(position),
        ),
      ).toBe(true);
    },
  );

  it("excludes supplied identities from starters and substitutes", () => {
    const excludedIdentityIds = new Set(
      draftEligiblePlayers
        .filter((card) => card.overall >= 94)
        .map((card) => card.playerIdentityId),
    );
    const squad = generateFreeSelectionSquad({
      formation: getFormation("4-2-3-1"),
      cards: draftEligiblePlayers,
      seed: 1970,
      excludedIdentityIds,
    });
    expect(
      cardsFor(squad).every(
        (card) => !excludedIdentityIds.has(card.playerIdentityId),
      ),
    ).toBe(true);
  });

  it("keeps research-only cards outside generation", () => {
    const formation = getFormation("4-3-3");
    const researchOnly: PlayerTournamentCard = {
      ...draftEligiblePlayers.find(
        (card) => card.primaryPosition === "ST",
      )!,
      id: "research-only-free-selection-card",
      playerIdentityId: "research-only-free-selection-identity",
      isDraftEligible: false,
      draftIneligibilityReason: "Research only",
      overall: 99,
    };
    const squad = generateFreeSelectionSquad({
      formation,
      cards: [researchOnly, ...draftEligiblePlayers],
      seed: 2014,
    });
    expect(
      [...squad.picks, ...squad.benchPicks].map((pick) => pick.cardId),
    ).not.toContain(researchOnly.id);
  });

  it("does not require a second goalkeeper for the substitute bench", () => {
    const singleGoalkeeper = draftEligiblePlayers.find(
      (card) => card.primaryPosition === "GK",
    )!;
    const outfield = draftEligiblePlayers.filter(
      (card) => card.primaryPosition !== "GK",
    );
    const squad = generateFreeSelectionSquad({
      formation: getFormation("4-3-3"),
      cards: [singleGoalkeeper, ...outfield],
      seed: 1998,
    });

    expect(squad.picks).toHaveLength(11);
    expect(squad.benchPicks).toHaveLength(3);
    expect(
      squad.benchPicks.every(
        (pick) => playersById.get(pick.cardId)?.primaryPosition !== "GK",
      ),
    ).toBe(true);
  });
});
