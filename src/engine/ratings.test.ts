import { describe, expect, it } from "vitest";
import { getFormation } from "@/data/formations";
import { playersById } from "@/data/players";
import {
  calculatePlayerLegacyScore,
  calculateSquadLegacy,
} from "@/engine/accolade-effects";
import { calculateTeamRatings } from "@/engine/ratings";
import {
  getPlacementPenaltyPercent,
  getPositionFit,
} from "@/engine/draft";
import type { PlayerTournamentCard } from "@/types/game";

export const testLineup = [
  "manuel-neuer-2014",
  "roberto-carlos-2002",
  "fabio-cannavaro-2006",
  "carles-puyol-2010",
  "philipp-lahm-2014",
  "andrea-pirlo-2006",
  "xavi-2010",
  "luka-modric-2018",
  "kylian-mbappe-2022",
  "ronaldo-2002",
  "lionel-messi-2014",
].map((id) => playersById.get(id)!);

describe("team ratings", () => {
  it("calculates bounded attack, midfield, defense, chemistry, and overall", () => {
    const ratings = calculateTeamRatings(testLineup, getFormation("4-3-3"));
    for (const value of [
      ratings.attack,
      ratings.midfield,
      ratings.defense,
      ratings.chemistry,
      ratings.overall,
    ]) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(99);
    }
    expect(ratings.positionFit).toBeLessThanOrEqual(100);
    expect(ratings.eraFit).toBeLessThanOrEqual(100);
    expect(ratings.managerFit).toBeLessThanOrEqual(100);
    expect(ratings.playerQuality!).toBeGreaterThan(0);
    expect(ratings.coreOverall!).toBeGreaterThan(0);
    expect(ratings.legacyScore!).toBeGreaterThanOrEqual(0);
    expect(ratings.legacyBonus!).toBeGreaterThanOrEqual(0);
    expect(ratings.legacyBonus!).toBeLessThanOrEqual(4);
    expect(ratings.overall).toBe(
      Math.min(99, Math.round((ratings.coreOverall ?? 0) + (ratings.legacyBonus ?? 0))),
    );
    expect(ratings.overall).toBeGreaterThan(80);
    expect(ratings.attack).toBeGreaterThan(80);
  });

  it("uses the same placement penalty formula as the visible fit model", () => {
    const formation = getFormation("4-3-3");
    const naturalPicks = formation.slots.map((slot, index) => ({
      slotId: slot.id,
      cardId: testLineup[index].id,
    }));
    const misplacedPicks = naturalPicks.map((pick) => ({ ...pick }));
    [misplacedPicks[1].cardId, misplacedPicks[9].cardId] = [
      misplacedPicks[9].cardId,
      misplacedPicks[1].cardId,
    ];
    const natural = calculateTeamRatings(testLineup, formation, {
      picks: naturalPicks,
    });
    const misplaced = calculateTeamRatings(testLineup, formation, {
      picks: misplacedPicks,
    });
    const strikerAtLeftBack = testLineup[9];
    const fit = getPositionFit(strikerAtLeftBack, formation.slots[1]);
    expect(fit).toBe(48);
    expect(getPlacementPenaltyPercent(fit)).toBe(23);
    expect(misplaced.overall).toBeLessThan(natural.overall);
    expect(misplaced.positionFit).toBeLessThan(natural.positionFit);
  });

  it("allows a slightly lower-rated perfect fit to beat an awkward higher card", () => {
    const formation = getFormation("4-3-3");
    const higher = playersById.get("ronaldo-2002")!;
    const lower = {
      ...higher,
      id: "ronaldo-perfect-fit-test",
      overall: higher.overall - 1,
    };
    const natural = calculateTeamRatings([lower], formation, {
      picks: [{ slotId: "st", cardId: lower.id }],
      eraId: "2000s",
    });
    const awkward = calculateTeamRatings([higher], formation, {
      picks: [{ slotId: "lb", cardId: higher.id }],
      eraId: "2000s",
    });
    expect(lower.overall).toBeLessThan(higher.overall);
    expect(natural.positionFit).toBeGreaterThan(awkward.positionFit);
    expect(natural.overall).toBeGreaterThan(awkward.overall);
  });

  it("penalizes a backup goalkeeper that cannot cover an outfield bench role", () => {
    const formation = getFormation("4-3-3");
    const balancedBench = [
      playersById.get("pele-1970")!,
      playersById.get("diego-maradona-1986")!,
      playersById.get("zico-1982")!,
    ];
    const backupKeeper: PlayerTournamentCard = {
      ...balancedBench[0],
      id: "backup-goalkeeper-rating-test",
      playerIdentityId: "backup-goalkeeper-rating-test",
      primaryPosition: "GK",
      eligiblePositions: ["GK"],
    };
    const keeperHeavyBench = [
      backupKeeper,
      balancedBench[1],
      balancedBench[2],
    ];

    const balanced = calculateTeamRatings(testLineup, formation, {
      bench: balancedBench,
    });
    const keeperHeavy = calculateTeamRatings(testLineup, formation, {
      bench: keeperHeavyBench,
    });

    expect(keeperHeavy.benchDepth).toBeLessThan(balanced.benchDepth);
    expect(keeperHeavy.benchVersatility).toBeLessThan(
      balanced.benchVersatility,
    );
    expect(keeperHeavy.playerQuality!).toBeLessThan(balanced.playerQuality!);
  });

  it("uses each tournament card's World Cup record for legacy", () => {
    const messi2014 = playersById.get("lionel-messi-2014")!;
    const messi2022 = playersById.get("lionel-messi-2022")!;

    const legacy2014 = calculatePlayerLegacyScore(messi2014);
    const legacy2022 = calculatePlayerLegacyScore(messi2022);

    expect(legacy2014).toBeGreaterThan(0);
    expect(legacy2022).toBeGreaterThan(legacy2014);

    const championWithoutAward: PlayerTournamentCard = {
      ...messi2022,
      id: "tournament-legacy-finish-test",
      playerIdentityId: "tournament-legacy-finish-test",
      achievements: [],
      tournamentStats: {
        ...messi2022.tournamentStats,
        goals: 0,
        assists: 0,
      },
    };

    const groupStageVersion: PlayerTournamentCard = {
      ...championWithoutAward,
      id: "tournament-legacy-group-test",
      playerIdentityId: "tournament-legacy-group-test",
      tournamentFinish: "group stage",
    };

    expect(calculatePlayerLegacyScore(championWithoutAward)).toBeGreaterThan(
      calculatePlayerLegacyScore(groupStageVersion),
    );

    const legacy = calculateSquadLegacy([messi2014, messi2022]);
    expect(legacy.contributors).toHaveLength(1);
    expect(legacy.bonus).toBeGreaterThanOrEqual(0);
    expect(legacy.bonus).toBeLessThanOrEqual(4);
  });

});