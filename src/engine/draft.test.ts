import { describe, expect, it } from "vitest";
import { formations, getFormation } from "@/data/formations";
import { draftEligibleManagers } from "@/data/managers";
import { draftEligiblePlayers, players } from "@/data/players";
import {
  canPlacePlayer,
  generateDraftOptions,
  generateBenchOptions,
  generateFormationOffer,
  generateFormationRespin,
  generateManagerOptions,
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
    expect(getPositionFit(goalkeeper, formation.slots[0])).toBe(100);
    expect(
      getPlacementPenaltyPercent(
        getPositionFit(goalkeeper, formation.slots[0]),
      ),
    ).toBe(0);
    expect(getPositionFit(striker, formation.slots[0])).toBe(0);
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
    expect(getPositionFit(centerBack, formation.slots[2])).toBe(100);
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
      starterOffers.every((offer) =>
        offer.some((player) => player.overall >= 88),
      ),
    ).toBe(true);
    expect(
      new Set(
        starterOffers.map((offer) =>
          offer.map((player) => player.playerIdentityId).sort().join("|"),
        ),
      ).size,
    ).toBeGreaterThan(90);
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
      ).toBeLessThanOrEqual(3);
      expect(offer.some((player) => player.overall >= 85)).toBe(true);
    }
    const average = (offers: typeof starterOffers) =>
      offers
        .flat()
        .reduce((sum, player) => sum + player.overall, 0) /
      offers.flat().length;
    expect(average(benchOffers)).toBeLessThan(average(starterOffers));
  }, 20_000);

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

  it("strongly downweights recently shown identities without hard-excluding the pool", () => {
    const remembered = generateDraftOptions(
      draftEligiblePlayers,
      formation,
      [],
      44_444,
      0,
    ).map((player) => player.playerIdentityId);
    const rememberedSet = new Set(remembered);
    const seenIdentityCounts = Object.fromEntries(
      remembered.map((identityId) => [identityId, 6]),
    );
    let baselineAppearances = 0;
    let downweightedAppearances = 0;

    for (let seed = 0; seed < 250; seed += 1) {
      const baseline = generateDraftOptions(
        draftEligiblePlayers,
        formation,
        [],
        50_000 + seed,
        0,
      );
      const downweighted = generateDraftOptions(
        draftEligiblePlayers,
        formation,
        [],
        50_000 + seed,
        0,
        { seenIdentityCounts, recentIdentityIds: remembered },
      );
      baselineAppearances += baseline.filter((card) =>
        rememberedSet.has(card.playerIdentityId),
      ).length;
      downweightedAppearances += downweighted.filter((card) =>
        rememberedSet.has(card.playerIdentityId),
      ).length;
    }

    expect(baselineAppearances).toBeGreaterThan(0);
    expect(downweightedAppearances).toBeLessThan(baselineAppearances);
  }, 20_000);

  it("uses broad full-pool identity coverage instead of a fixed leading window", () => {
    const identities = new Set<string>();
    for (let seed = 0; seed < 300; seed += 1) {
      for (const card of generateDraftOptions(
        draftEligiblePlayers,
        formation,
        [],
        70_000 + seed,
        0,
      )) {
        identities.add(card.playerIdentityId);
      }
    }

    expect(identities.size).toBeGreaterThan(200);
  }, 20_000);

  it("downweights a recently shown tournament version while keeping it possible", () => {
    const versionsByIdentity = new Map<string, (typeof draftEligiblePlayers)[number][]>();
    for (const card of draftEligiblePlayers) {
      const versions = versionsByIdentity.get(card.playerIdentityId) ?? [];
      versions.push(card);
      versionsByIdentity.set(card.playerIdentityId, versions);
    }

    const recentCardIds: string[] = [];
    const seenCardCounts: Record<string, number> = {};
    for (const versions of versionsByIdentity.values()) {
      if (versions.length < 2) continue;
      recentCardIds.push(versions[0].id);
      seenCardCounts[versions[0].id] = 6;
    }
    const recentCards = new Set(recentCardIds);
    let baselineRecentVersions = 0;
    let downweightedRecentVersions = 0;

    for (let seed = 0; seed < 300; seed += 1) {
      const baseline = generateDraftOptions(
        draftEligiblePlayers,
        formation,
        [],
        80_000 + seed,
        0,
      );
      const downweighted = generateDraftOptions(
        draftEligiblePlayers,
        formation,
        [],
        80_000 + seed,
        0,
        { seenCardCounts, recentCardIds },
      );
      baselineRecentVersions += baseline.filter((card) =>
        recentCards.has(card.id),
      ).length;
      downweightedRecentVersions += downweighted.filter((card) =>
        recentCards.has(card.id),
      ).length;
    }

    expect(baselineRecentVersions).toBeGreaterThan(0);
    expect(downweightedRecentVersions).toBeLessThan(baselineRecentVersions);
  }, 20_000);

  it("keeps manager offers deterministic, identity-safe, and broadly distributed", () => {
    const first = generateManagerOptions(
      draftEligibleManagers,
      "all",
      91_000,
    );
    const repeat = generateManagerOptions(
      draftEligibleManagers,
      "all",
      91_000,
    );
    expect(first.map((manager) => manager.id)).toEqual(
      repeat.map((manager) => manager.id),
    );
    expect(new Set(first.map((manager) => manager.managerIdentityId)).size).toBe(
      3,
    );

    const allIdentities = new Set(
      draftEligibleManagers.map((manager) => manager.managerIdentityId),
    );
    const appeared = new Set<string>();
    for (let seed = 0; seed < 400; seed += 1) {
      for (const manager of generateManagerOptions(
        draftEligibleManagers,
        "all",
        92_000 + seed,
      )) {
        appeared.add(manager.managerIdentityId);
      }
    }
    expect(appeared.size).toBeGreaterThanOrEqual(
      Math.min(30, Math.max(3, Math.floor(allIdentities.size * 0.6))),
    );
  });

  it("downweights recently shown manager identities without hard-excluding them", () => {
    const remembered = generateManagerOptions(
      draftEligibleManagers,
      "all",
      93_000,
    );
    const rememberedIds = remembered.map(
      (manager) => manager.managerIdentityId,
    );
    const rememberedSet = new Set(rememberedIds);
    const seenIdentityCounts = Object.fromEntries(
      rememberedIds.map((identityId) => [identityId, 6]),
    );
    let baselineAppearances = 0;
    let downweightedAppearances = 0;

    for (let seed = 0; seed < 300; seed += 1) {
      const baseline = generateManagerOptions(
        draftEligibleManagers,
        "all",
        94_000 + seed,
      );
      const downweighted = generateManagerOptions(
        draftEligibleManagers,
        "all",
        94_000 + seed,
        [],
        0,
        {
          seenIdentityCounts,
          recentIdentityIds: rememberedIds,
        },
      );
      baselineAppearances += baseline.filter((manager) =>
        rememberedSet.has(manager.managerIdentityId),
      ).length;
      downweightedAppearances += downweighted.filter((manager) =>
        rememberedSet.has(manager.managerIdentityId),
      ).length;
    }

    expect(baselineAppearances).toBeGreaterThan(0);
    expect(downweightedAppearances).toBeLessThan(baselineAppearances);
  });

  it("rotates exact manager tournament versions with card-level freshness", () => {
    const versionsByIdentity = new Map<
      string,
      (typeof draftEligibleManagers)[number][]
    >();
    for (const manager of draftEligibleManagers) {
      const versions = versionsByIdentity.get(manager.managerIdentityId) ?? [];
      versions.push(manager);
      versionsByIdentity.set(manager.managerIdentityId, versions);
    }

    const recentCardIds: string[] = [];
    const seenCardCounts: Record<string, number> = {};
    for (const versions of versionsByIdentity.values()) {
      if (versions.length < 2) continue;
      recentCardIds.push(versions[0].id);
      seenCardCounts[versions[0].id] = 6;
    }
    expect(recentCardIds.length).toBeGreaterThan(0);

    const recentCards = new Set(recentCardIds);
    let baselineRecentVersions = 0;
    let downweightedRecentVersions = 0;
    for (let seed = 0; seed < 400; seed += 1) {
      const baseline = generateManagerOptions(
        draftEligibleManagers,
        "all",
        95_000 + seed,
      );
      const downweighted = generateManagerOptions(
        draftEligibleManagers,
        "all",
        95_000 + seed,
        [],
        0,
        { seenCardCounts, recentCardIds },
      );
      baselineRecentVersions += baseline.filter((manager) =>
        recentCards.has(manager.id),
      ).length;
      downweightedRecentVersions += downweighted.filter((manager) =>
        recentCards.has(manager.id),
      ).length;
    }

    expect(baselineRecentVersions).toBeGreaterThan(0);
    expect(downweightedRecentVersions).toBeLessThan(baselineRecentVersions);
  });

  it("rotates formations with novelty while preserving tactical offer structure", () => {
    const manager = draftEligibleManagers[0];
    const first = generateFormationOffer(manager, "all", 96_000);
    expect(first).toHaveLength(4);
    expect(new Set(first).size).toBe(4);
    expect(first.every((id) => formations.some((formation) => formation.id === id))).toBe(
      true,
    );

    const seenFormationCounts = Object.fromEntries(
      first.map((formationId) => [formationId, 6]),
    );
    const remembered = new Set(first);
    let baselineOverlap = 0;
    let downweightedOverlap = 0;
    for (let seed = 0; seed < 250; seed += 1) {
      const baseline = generateFormationOffer(
        manager,
        "all",
        97_000 + seed,
      );
      const downweighted = generateFormationOffer(
        manager,
        "all",
        97_000 + seed,
        4,
        {
          seenFormationCounts,
          recentFormationIds: first,
        },
      );
      baselineOverlap += baseline.filter((id) => remembered.has(id)).length;
      downweightedOverlap += downweighted.filter((id) =>
        remembered.has(id),
      ).length;
    }
    expect(baselineOverlap).toBeGreaterThan(0);
    expect(downweightedOverlap).toBeLessThan(baselineOverlap);

    const respin = generateFormationRespin(
      manager,
      "all",
      96_000,
      first,
      { seenFormationCounts, recentFormationIds: first },
    );
    expect(respin).toHaveLength(4);
    expect(respin.every((id) => !remembered.has(id))).toBe(true);
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