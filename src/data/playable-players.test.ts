import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { describe, expect, it } from "vitest";
import {
  identityFallbackPlayerImages,
  playerImages,
} from "@/data/player-images";
import {
  playerDisplayAccoladesByIdentityId,
  type PlayerCareerPrimarySourceReview,
} from "@/data/player-career-data";
import {
  draftEligiblePlayers,
  getPlayablePlayerCardIds,
  getPlayablePlayers,
} from "@/data/players";
import { worldCupAllStars } from "@/data/opponents";
import { playerSeedSchema } from "@/lib/validation";
import type {
  PlayerAttributes,
  TournamentStatLine,
} from "@/types/game";

const attributeKeys = [
  "attack",
  "creativity",
  "control",
  "defense",
  "physical",
  "goalkeeping",
  "clutch",
] as const satisfies ReadonlyArray<keyof PlayerAttributes>;

const tournamentStatKeys = [
  "appearances",
  "starts",
  "minutes",
  "goals",
  "assists",
  "cleanSheets",
  "saves",
  "goalsConceded",
  "penaltiesSaved",
] as const satisfies ReadonlyArray<keyof TournamentStatLine>;

const playableCardsByIdentity = () => {
  const cardsByIdentity = new Map<
    string,
    ReturnType<typeof getPlayablePlayers>
  >();
  for (const player of getPlayablePlayers()) {
    cardsByIdentity.set(player.playerIdentityId, [
      ...(cardsByIdentity.get(player.playerIdentityId) ?? []),
      player,
    ]);
  }
  return cardsByIdentity;
};

const normalizedAccoladeLabel = (category: string, label: string) =>
  `${category}:${label
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()}`;

const isValidHttpUrl = (value: string | undefined) => {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const isValidNonfutureReviewDate = (value: string | undefined) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(timestamp) &&
    new Date(timestamp).toISOString().slice(0, 10) === value &&
    value <= new Date().toISOString().slice(0, 10)
  );
};

const checkedPrimarySourceIssue = (
  identityId: string,
  sourceName: "Transfermarkt" | "FBref",
  source: PlayerCareerPrimarySourceReview | undefined,
) => {
  if (!source) return `${identityId}: ${sourceName} review is missing`;
  if (!source.status.startsWith("checked-")) {
    return `${identityId}: ${sourceName} is not recorded as checked`;
  }
  if (!isValidHttpUrl(source.url)) {
    return `${identityId}: ${sourceName} review URL is invalid`;
  }

  const hostname = new URL(source.url).hostname.toLowerCase();
  const expectedDomain =
    sourceName === "Transfermarkt" ? "transfermarkt.com" : "fbref.com";
  if (hostname !== expectedDomain && !hostname.endsWith(`.${expectedDomain}`)) {
    return `${identityId}: ${sourceName} review URL uses ${hostname}`;
  }
  if (
    !source.playerId &&
    source.status !== "checked-current-no-player-profile" &&
    source.status !== "checked-current-search-access-blocked"
  ) {
    return `${identityId}: ${sourceName} review has no player ID or explicit no-profile result`;
  }
  return null;
};

const expectNoIdentityIssues = (label: string, issues: string[]) => {
  const preview = issues.slice(0, 30).join("\n");
  expect(
    issues,
    `${label}: ${issues.length} issue(s)${preview ? `\n${preview}` : ""}`,
  ).toHaveLength(0);
};

describe("active playable player-card pool", () => {
  it("derives one deduplicated active pool from draft-eligible cards", () => {
    const playablePlayers = getPlayablePlayers();
    const playableIds = playablePlayers.map((player) => player.id);
    const draftEligibleIds = draftEligiblePlayers.map((player) => player.id);
    const playableIdSet = getPlayablePlayerCardIds();

    expect(playablePlayers).not.toBe(getPlayablePlayers());
    expect(playableIds).toHaveLength(new Set(playableIds).size);
    expect(draftEligibleIds).toHaveLength(new Set(draftEligibleIds).size);
    expect(new Set(playableIds)).toEqual(new Set(draftEligibleIds));
    expect(playableIdSet).toEqual(new Set(playableIds));
  });

  it("keeps every playable card and gameplay-stat block schema-valid", () => {
    const playablePlayers = getPlayablePlayers();
    const result = playerSeedSchema.safeParse(playablePlayers);

    expect(
      result.success,
      result.success ? undefined : result.error.message,
    ).toBe(true);

    for (const player of playablePlayers) {
      expect(Object.keys(player.attributes).sort()).toEqual(
        [...attributeKeys].sort(),
      );
      for (const key of attributeKeys) {
        expect(Number.isInteger(player.attributes[key])).toBe(true);
        expect(player.attributes[key]).toBeGreaterThanOrEqual(1);
        expect(player.attributes[key]).toBeLessThanOrEqual(99);
      }

      expect(Object.keys(player.tournamentStats).sort()).toEqual(
        [...tournamentStatKeys].sort(),
      );
      for (const key of tournamentStatKeys) {
        const value = player.tournamentStats[key];
        expect(
          value === null || (Number.isInteger(value) && value >= 0),
        ).toBe(true);
      }
    }
  });

  it("keeps every fixed World Cup All-Stars player in the active pool", () => {
    const playableIds = getPlayablePlayerCardIds();
    const allStarsIds = [
      ...(worldCupAllStars.allStars?.starterPicks.map(
        (pick) => pick.cardId,
      ) ?? []),
      ...(worldCupAllStars.allStars?.substituteCardIds ?? []),
    ];

    expect(allStarsIds).toHaveLength(14);
    expect(allStarsIds.every((cardId) => playableIds.has(cardId))).toBe(true);
  });

  it("requires completed, reviewed source research for every playable identity", () => {
    const issues: string[] = [];

    for (const identityId of playableCardsByIdentity().keys()) {
      const record = playerDisplayAccoladesByIdentityId.get(identityId);
      if (!record) {
        issues.push(`${identityId}: canonical accolade record is missing`);
        continue;
      }
      if (record.verificationStatus !== "verified") {
        issues.push(
          `${identityId}: verificationStatus is ${record.verificationStatus}`,
        );
      }
      if (record.researchStatus !== "complete") {
        issues.push(
          `${identityId}: researchStatus is ${record.researchStatus ?? "missing"}`,
        );
      }
      if (!isValidNonfutureReviewDate(record.reviewedAt)) {
        issues.push(
          `${identityId}: reviewedAt is invalid or future (${record.reviewedAt ?? "missing"})`,
        );
      }

      const transfermarktIssue = checkedPrimarySourceIssue(
        identityId,
        "Transfermarkt",
        record.sourceReview?.transfermarkt,
      );
      if (transfermarktIssue) issues.push(transfermarktIssue);
      const fbrefIssue = checkedPrimarySourceIssue(
        identityId,
        "FBref",
        record.sourceReview?.fbref,
      );
      if (fbrefIssue) issues.push(fbrefIssue);
    }

    expectNoIdentityIssues("Incomplete playable-identity research", issues);
  });

  it("requires nonempty, verified, URL-sourced, duplicate-free canonical accolades", () => {
    const issues: string[] = [];

    for (const identityId of playableCardsByIdentity().keys()) {
      const accolades =
        playerDisplayAccoladesByIdentityId.get(identityId)?.accolades;
      if (!accolades) {
        issues.push(`${identityId}: canonical accolade record is missing`);
        continue;
      }
      if (accolades.length === 0) {
        issues.push(`${identityId}: canonical accolade list is empty`);
      }

      const seenIds = new Set<string>();
      const seenLabels = new Set<string>();
      for (const accolade of accolades) {
        const normalizedId = accolade.id.trim().toLowerCase();
        const normalizedLabel = normalizedAccoladeLabel(
          accolade.category,
          accolade.label,
        );
        if (seenIds.has(normalizedId)) {
          issues.push(`${identityId}: duplicate accolade id ${accolade.id}`);
        }
        if (seenLabels.has(normalizedLabel)) {
          issues.push(
            `${identityId}: duplicate accolade ${accolade.category}/${accolade.label}`,
          );
        }
        seenIds.add(normalizedId);
        seenLabels.add(normalizedLabel);

        if (accolade.verified !== true) {
          issues.push(`${identityId}/${accolade.id}: accolade is not verified`);
        }
        if (!accolade.sourceName.trim()) {
          issues.push(`${identityId}/${accolade.id}: source name is missing`);
        }
        if (!isValidHttpUrl(accolade.sourceUrl)) {
          issues.push(`${identityId}/${accolade.id}: source URL is missing or invalid`);
        }
      }
    }

    expectNoIdentityIssues("Invalid canonical accolades", issues);
  });

  it("links every playable card to its identity's exact canonical accolade list", () => {
    const issues: string[] = [];

    for (const [identityId, cards] of playableCardsByIdentity()) {
      const canonicalAccolades =
        playerDisplayAccoladesByIdentityId.get(identityId)?.accolades;
      if (!canonicalAccolades) {
        issues.push(`${identityId}: canonical accolade record is missing`);
        continue;
      }
      for (const card of cards) {
        if (!isDeepStrictEqual(card.careerAccolades, canonicalAccolades)) {
          issues.push(`${card.id}: does not resolve the exact canonical list`);
        }
      }
    }

    expectNoIdentityIssues("Card-to-identity accolade mismatches", issues);
  });

  it("does not apply a tournament-card-year cutoff to career accolades", () => {
    const rodri2022 = getPlayablePlayers().find(
      (player) => player.id === "rodri-2022",
    );
    const canonicalRodri = playerDisplayAccoladesByIdentityId.get("rodri");
    const postCardYearAccolade = canonicalRodri?.accolades.find(
      (accolade) => accolade.id === "ballon-d-or",
    );

    expect(rodri2022).toBeDefined();
    expect(canonicalRodri).toBeDefined();
    expect(postCardYearAccolade).toMatchObject({
      verified: true,
      description: expect.stringContaining("2024"),
    });
    expect(2024).toBeGreaterThan(rodri2022?.tournamentYear ?? Infinity);
    expect(rodri2022?.careerAccolades).toStrictEqual(
      canonicalRodri?.accolades,
    );
    expect(rodri2022?.careerAccolades).toContainEqual(postCardYearAccolade);
  });

  it("exposes only exact, playable, card-specific runtime player images", () => {
    const playableById = new Map(
      getPlayablePlayers().map((player) => [player.id, player]),
    );

    expect(identityFallbackPlayerImages).toEqual([]);
    expect(playerImages.map((image) => image.id)).toHaveLength(
      new Set(playerImages.map((image) => image.id)).size,
    );

    for (const image of playerImages) {
      const player = playableById.get(image.id);
      expect(player, `${image.id} is not playable`).toBeDefined();
      expect(image).toMatchObject({
        kind: "player",
        tournamentYear: player?.tournamentYear,
        file: `/players/game-faces/${image.id}.png`,
        fallback: false,
        exactTournamentImage: true,
      });
      expect(
        existsSync(resolve(process.cwd(), "public", image.file.slice(1))),
        `${image.id} is registered without its exact local PNG`,
      ).toBe(true);
    }
  });

  it("leaves cards with missing exact images draftable as Photo Pending", () => {
    const playablePlayers = getPlayablePlayers();
    const imageIds = new Set(playerImages.map((image) => image.id));
    const missingImagePlayers = playablePlayers.filter(
      (player) => !imageIds.has(player.id),
    );

    expect(missingImagePlayers.length).toBeGreaterThan(0);
    expect(missingImagePlayers).toHaveLength(
      playablePlayers.length - imageIds.size,
    );
    expect(
      missingImagePlayers.every(
        (player) =>
          player.isDraftEligible &&
          player.draftIneligibilityReason === null,
      ),
    ).toBe(true);
  });

  it("keeps Siphiwe Tshabalala's 2010 card playable without inventing a face", () => {
    const cardId = "siphiwe-tshabalala-2010";
    const player = getPlayablePlayers().find(
      (candidate) => candidate.id === cardId,
    );

    expect(player).toMatchObject({
      id: cardId,
      playerIdentityId: "siphiwe-tshabalala",
      playerName: "Siphiwe Tshabalala",
      countryCode: "RSA",
      countryName: "South Africa",
      confederation: "CAF",
      tournamentYear: 2010,
      primaryPosition: "LW",
      eligiblePositions: ["LW", "RM"],
      overall: 73,
      isDraftEligible: true,
      draftIneligibilityReason: null,
      tournamentStats: {
        appearances: 3,
        starts: 3,
        goals: 1,
      },
      imageId: cardId,
    });
    expect(getPlayablePlayerCardIds().has(cardId)).toBe(true);
    expect(playerImages.some((image) => image.id === cardId)).toBe(false);
    expect(
      existsSync(
        resolve(process.cwd(), "public", "players", "game-faces", `${cardId}.png`),
      ),
    ).toBe(false);
  });
});
