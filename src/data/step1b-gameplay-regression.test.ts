import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import baselineJson from "../../reports/step1b-gameplay-regression-baseline.json";
import { draftEras } from "@/data/eras";
import { formations, getFormation } from "@/data/formations";
import { managers, managersById } from "@/data/managers";
import { historicalOpponents } from "@/data/opponents";
import {
  allPlayersBeforeIdentityPruning,
  draftEligiblePlayers,
  players,
  playersById,
} from "@/data/players";
import { calculatePlayerLegacyScore } from "@/engine/accolade-effects";
import {
  benchTierWeights,
  generateBenchOptions,
  generateDraftOptions,
  starterTierWeights,
} from "@/engine/draft";
import { calculateTeamRatings } from "@/engine/ratings";
import { simulateMatch } from "@/engine/simulation";
import type { FormationId } from "@/types/game";

type Baseline = typeof baselineJson;
type HashName = keyof Baseline["hashes"];

const baseline = baselineJson as Baseline;

const sha256 = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

const sha256Text = (value: string) =>
  createHash("sha256").update(value).digest("hex");

const expectFrozenHash = (name: HashName, value: unknown) => {
  expect(
    sha256(value),
    `${name} drifted from preserved commit ${baseline.sourceCommit}`,
  ).toBe(baseline.hashes[name]);
};

const sortedArchive = [...allPlayersBeforeIdentityPruning].sort((first, second) =>
  first.id.localeCompare(second.id),
);

const cardsByIdentity = new Map<string, typeof allPlayersBeforeIdentityPruning>();
for (const player of allPlayersBeforeIdentityPruning) {
  cardsByIdentity.set(player.playerIdentityId, [
    ...(cardsByIdentity.get(player.playerIdentityId) ?? []),
    player,
  ]);
}

const cardsByTournamentYear = Object.fromEntries(
  [...new Set(allPlayersBeforeIdentityPruning.map((player) => player.tournamentYear))]
    .sort((first, second) => first - second)
    .map((year) => [
      String(year),
      allPlayersBeforeIdentityPruning.filter(
        (player) => player.tournamentYear === year,
      ).length,
    ]),
);

const lineup = baseline.scenarios.lineupCardIds.map((id) => {
  const player = playersById.get(id);
  if (!player) throw new Error(`Frozen regression lineup is missing ${id}`);
  return player;
});

const bench = baseline.scenarios.benchCardIds.map((id) => {
  const player = playersById.get(id);
  if (!player) throw new Error(`Frozen regression bench is missing ${id}`);
  return player;
});

describe("Step 1B frozen gameplay and data baseline", () => {
  it("preserves archive, identity, playable, and draft-eligibility contracts", () => {
    expect(allPlayersBeforeIdentityPruning).toHaveLength(
      baseline.counts.archiveCards,
    );
    expect(cardsByIdentity.size).toBe(baseline.counts.archiveIdentities);
    expect(players).toHaveLength(baseline.counts.playableCards);
    expect(new Set(players.map((player) => player.playerIdentityId)).size).toBe(
      baseline.counts.playableIdentities,
    );
    expect(draftEligiblePlayers).toHaveLength(
      baseline.counts.draftEligibleCards,
    );
    expect(
      [...cardsByIdentity.values()].filter((cards) => cards.length > 1),
    ).toHaveLength(baseline.counts.multiCardIdentities);
    expect(cardsByTournamentYear).toEqual(
      baseline.counts.cardsByTournamentYear,
    );

    expectFrozenHash(
      "archiveCardIdOrder",
      allPlayersBeforeIdentityPruning.map((player) => player.id),
    );
    expectFrozenHash(
      "archiveIdentityByCardOrder",
      allPlayersBeforeIdentityPruning.map(
        (player) => player.playerIdentityId,
      ),
    );
    expectFrozenHash(
      "playableCardIdOrder",
      players.map((player) => player.id),
    );
    expectFrozenHash(
      "draftEligibleCardIdOrder",
      draftEligiblePlayers.map((player) => player.id),
    );
    expectFrozenHash(
      "cardIdsSorted",
      sortedArchive.map((player) => player.id),
    );
    expectFrozenHash(
      "playerAndCardIds",
      sortedArchive.map((player) => ({
        id: player.id,
        playerIdentityId: player.playerIdentityId,
      })),
    );
    expectFrozenHash(
      "playerNames",
      sortedArchive.map((player) => ({
        id: player.id,
        playerName: player.playerName,
      })),
    );
    expectFrozenHash(
      "playableIdsSorted",
      [...players]
        .sort((first, second) => first.id.localeCompare(second.id))
        .map((player) => player.id),
    );
    expectFrozenHash(
      "draftEligibleIdsSorted",
      [...draftEligiblePlayers]
        .sort((first, second) => first.id.localeCompare(second.id))
        .map((player) => player.id),
    );
    expectFrozenHash(
      "draftEligibility",
      sortedArchive.map((player) => ({
        id: player.id,
        isDraftEligible: player.isDraftEligible,
        draftIneligibilityReason: player.draftIneligibilityReason,
      })),
    );
  });

  it("preserves every rating, attribute, status tier, and gameplay card input", () => {
    expectFrozenHash(
      "overallRatings",
      sortedArchive.map((player) => ({
        id: player.id,
        overall: player.overall,
      })),
    );
    expect(
      sha256Text(
        sortedArchive
          .filter((player) => player.tournamentYear !== 2026)
          .map((player) => `${player.id}:${player.overall}`)
          .join("\n"),
      ),
      `historicalIdOverall drifted from preserved commit ${baseline.sourceCommit}`,
    ).toBe(baseline.hashes.historicalIdOverall);
    expectFrozenHash(
      "attributes",
      sortedArchive.map((player) => ({
        id: player.id,
        attributes: player.attributes,
      })),
    );
    expectFrozenHash(
      "statusTiers",
      sortedArchive.map((player) => ({
        id: player.id,
        qualityBand: player.qualityBand,
        statusTier: player.statusTier,
      })),
    );

    expectFrozenHash(
      "gameplayCardInputs",
      allPlayersBeforeIdentityPruning.map((player) => ({
        id: player.id,
        playerIdentityId: player.playerIdentityId,
        playerName: player.playerName,
        countryCode: player.countryCode,
        countryName: player.countryName,
        confederation: player.confederation,
        tournamentYear: player.tournamentYear,
        primaryPosition: player.primaryPosition,
        eligiblePositions: player.eligiblePositions,
        overall: player.overall,
        attributes: player.attributes,
        era: player.era,
        archetype: player.archetype,
        qualityBand: player.qualityBand,
        statusTier: player.statusTier,
        modeledTags: player.modeledTags,
        isDraftEligible: player.isDraftEligible,
        draftIneligibilityReason: player.draftIneligibilityReason,
        top100Player: player.top100Player,
        top100Source: player.top100Source ?? null,
        eraLegacy: player.eraLegacy,
        eraTranslation: player.eraTranslation,
      })),
    );
  });

  it("preserves card-specific tournament records and career statistics", () => {
    const awardRows = allPlayersBeforeIdentityPruning.reduce(
      (total, player) => total + player.achievements.length,
      0,
    );
    const cardsWithAwards = allPlayersBeforeIdentityPruning.filter(
      (player) => player.achievements.length > 0,
    ).length;
    expect(awardRows).toBe(baseline.counts.tournamentAwardRows);
    expect(cardsWithAwards).toBe(baseline.counts.cardsWithTournamentAwards);

    expectFrozenHash(
      "tournamentStats",
      sortedArchive.map((player) => ({
        id: player.id,
        tournamentStats: player.tournamentStats,
        statSources: player.statSources,
        statSourcesByField: player.statSourcesByField,
      })),
    );
    expectFrozenHash(
      "tournamentAwards",
      sortedArchive.map((player) => ({
        id: player.id,
        achievements: player.achievements,
      })),
    );
    expectFrozenHash(
      "tournamentFinishes",
      sortedArchive.map((player) => ({
        id: player.id,
        tournamentFinish: player.tournamentFinish,
        tournamentFinishSource: player.tournamentFinishSource,
      })),
    );
    expectFrozenHash(
      "tournamentStatsAwardsCombined",
      allPlayersBeforeIdentityPruning.map((player) => ({
        id: player.id,
        tournamentStats: player.tournamentStats,
        statSources: player.statSources,
        statSourcesByField: player.statSourcesByField,
        tournamentFinish: player.tournamentFinish,
        tournamentFinishSource: player.tournamentFinishSource,
        achievements: player.achievements,
      })),
    );
    expectFrozenHash(
      "careerStats",
      allPlayersBeforeIdentityPruning.map((player) => ({
        id: player.id,
        careerStats: player.careerStats,
      })),
    );
  });

  it("preserves the frozen gameplay legacy input for every card", () => {
    expectFrozenHash(
      "legacyScoresByCard",
      allPlayersBeforeIdentityPruning.map((player) => ({
        id: player.id,
        score: calculatePlayerLegacyScore(player),
      })),
    );
  });

  it("keeps display-only Career Accolades outside gameplay legacy", () => {
    const displayOnlyProbe = {
      id: "step1b-display-isolation-probe",
      label: "Ballon d'Or",
      count: 256,
      category: "individual" as const,
      sourceName: "Step 1B isolation test",
      verified: true,
    };
    for (const player of allPlayersBeforeIdentityPruning) {
      expect(
        calculatePlayerLegacyScore({
          ...player,
          careerAccolades: [displayOnlyProbe],
        }),
      ).toBe(calculatePlayerLegacyScore(player));
    }

    expect(() =>
      calculatePlayerLegacyScore({
        ...allPlayersBeforeIdentityPruning[0]!,
        playerIdentityId: "missing-frozen-gameplay-identity",
      }),
    ).toThrow(/missing its frozen gameplay career record/);
  });

  it(
    "preserves draft weights and deterministic starter and bench offers",
    () => {
      expectFrozenHash("draftWeights", {
        starterTierWeights,
        benchTierWeights,
      });

      const output: Array<{
        kind: "starter" | "bench";
        formation: string;
        seed: number;
        ids: string[];
      }> = [];
      for (const formation of formations) {
        for (
          let seed = 0;
          seed < baseline.scenarios.draft.seedIndexes;
          seed += 1
        ) {
          output.push({
            kind: "starter",
            formation: formation.id,
            seed,
            ids: generateDraftOptions(
              draftEligiblePlayers,
              formation,
              [],
              baseline.scenarios.draft.starterSeedOffset + seed,
              0,
            ).map((player) => player.id),
          });
          output.push({
            kind: "bench",
            formation: formation.id,
            seed,
            ids: generateBenchOptions(
              draftEligiblePlayers,
              [],
              [],
              baseline.scenarios.draft.benchSeedOffset + seed,
              0,
            ).map((player) => player.id),
          });
        }
      }

      expect(output).toHaveLength(baseline.counts.draftOfferMatrix);
      expectFrozenHash("draftOfferMatrix", output);
    },
    30_000,
  );

  it(
    "preserves team ratings across every formation, era, and manager",
    () => {
      const output = formations.flatMap((formation) =>
        draftEras.flatMap((era) =>
          managers.map((manager) => ({
            formation: formation.id,
            era: era.id,
            manager: manager.id,
            value: calculateTeamRatings(lineup, formation, {
              manager,
              eraId: era.id,
              bench,
            }),
          })),
        ),
      );

      expect(output).toHaveLength(baseline.counts.teamRatingMatrix);
      expectFrozenHash("teamRatingMatrix", output);
    },
    30_000,
  );

  it(
    "preserves deterministic gameplay outputs across opponents and eras",
    () => {
      const manager = managersById.get(
        baseline.scenarios.simulation.managerId,
      );
      if (!manager) {
        throw new Error(
          `Frozen regression manager is missing: ${baseline.scenarios.simulation.managerId}`,
        );
      }
      const formation = getFormation(
        baseline.scenarios.simulation.formationId as FormationId,
      );
      const output = historicalOpponents.flatMap((opponent) =>
        draftEras.flatMap((era) =>
          baseline.scenarios.simulation.seeds.map((seed) => ({
            opponent: opponent.id,
            era: era.id,
            seed,
            value: simulateMatch({
              lineup,
              bench,
              formation,
              manager,
              eraId: era.id,
              opponent,
              seed,
            }),
          })),
        ),
      );

      expect(output).toHaveLength(baseline.counts.simulationMatrix);
      expectFrozenHash("simulationMatrix", output);
    },
    30_000,
  );
});
