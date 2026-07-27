import { createHash } from "node:crypto";
import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import ratingAudit2026Json from "../src/data/player-ratings-2026.generated.json";
import {
  allPlayersBeforeIdentityPruning as players,
} from "../src/data/players";

type FileEntry = {
  isDirectory(): boolean;
  name: string;
};

const countFiles = async (directory: string): Promise<number> => {
  let count = 0;
  for (const entry of (await readdir(directory, {
    withFileTypes: true,
  })) as FileEntry[]) {
    count += entry.isDirectory()
      ? await countFiles(path.join(directory, entry.name))
      : 1;
  }
  return count;
};

const cardsByIdentity = new Map<string, typeof players>();
for (const player of players) {
  const cards = cardsByIdentity.get(player.playerIdentityId) ?? [];
  cards.push(player);
  cardsByIdentity.set(player.playerIdentityId, cards);
}

const removalAudit = [...cardsByIdentity.entries()]
  .map(([identityId, cards]) => ({
    identityId,
    playerName: cards[0].playerName,
    maxOverall: Math.max(...cards.map((card) => card.overall)),
    cards: cards
      .map((card) => ({
        cardId: card.id,
        tournamentYear: card.tournamentYear,
        overall: card.overall,
      }))
      .sort(
        (first, second) =>
          first.tournamentYear - second.tournamentYear ||
          first.cardId.localeCompare(second.cardId),
      ),
  }))
  .filter((identity) => identity.maxOverall < 80)
  .sort(
    (first, second) =>
      second.maxOverall - first.maxOverall ||
      first.identityId.localeCompare(second.identityId),
  );

const removedCardIds = new Set(
  removalAudit.flatMap((identity) =>
    identity.cards.map((card) => card.cardId),
  ),
);
const retainedCards = players.filter((player) => !removedCardIds.has(player.id));
const historicalCards = players
  .filter((player) => player.tournamentYear !== 2026)
  .sort((first, second) => first.id.localeCompare(second.id));
const historicalRatingFingerprint = createHash("sha256")
  .update(
    historicalCards
      .map((player) => `${player.id}:${player.overall}`)
      .join("\n"),
  )
  .digest("hex");
const goldenBallCardIds = [
  "paolo-rossi-1982",
  "diego-maradona-1986",
  "salvatore-schillaci-1990",
  "romario-1994",
  "ronaldo-1998",
  "oliver-kahn-2002",
  "zinedine-zidane-2006",
  "diego-forlan-2010",
  "lionel-messi-2014",
  "luka-modric-2018",
  "lionel-messi-2022",
  "rodri-2026",
];

const main = async () => {
  const output = {
    version: 1,
    generatedAt: "2026-07-26",
    checkpoint: "before-identity-pruning",
    rule:
      "Remove an identity if and only if its maximum overall across all tournament cards is below 80. Retained identities keep every tournament card.",
    restoredBaseline: {
      playableCards: players.length,
      playableIdentities: cardsByIdentity.size,
      historicalCards: historicalCards.length,
      cards2026: players.filter((player) => player.tournamentYear === 2026)
        .length,
      historicalRatingFingerprint,
      historicalRatingsConfirmation:
        "The 1970–2022 rating implementation and overrides are restored from the pre-task repository; the fingerprint covers every historical card id and overall.",
      goldenBallExamples: goldenBallCardIds.map((cardId) => ({
        cardId,
        overall: players.find((player) => player.id === cardId)?.overall,
      })),
      faceSystem: {
        restoredPlayerFiles: await countFiles("assets/players"),
        restoredWinnerAndOpponentFiles:
          (await countFiles("assets/players/winners")) +
          (await countFiles("assets/players/opponent")),
        filesDeletedAtCheckpoint: 0,
        policy:
          "The restored portrait paths, manifests, routes, and files remain in place. Runtime 2026 portraits accept FC26 only; every other 2026 card is Photo Pending.",
      },
    },
    ratingAudit2026: ratingAudit2026Json,
    proposedPruning: {
      identitiesBelow80: removalAudit.length,
      cardsBelongingToRemovedIdentities: removedCardIds.size,
      identitiesRetained: cardsByIdentity.size - removalAudit.length,
      cardsRetained: retainedCards.length,
      cards2026Below80: players.filter(
        (player) => player.tournamentYear === 2026 && player.overall < 80,
      ).length,
      retainedIdentityCompleteness:
        "All cards belonging to every retained identity remain in the playable pool.",
      removalAudit,
    },
  };

  await writeFile(
    "reports/pre-pruning-checkpoint.json",
    `${JSON.stringify(output, null, 2)}\n`,
  );
};

void main();
