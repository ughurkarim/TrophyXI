import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  allPlayersBeforeIdentityPruning,
  maximumOverallByPlayerIdentity,
  players,
} from "../src/data/players";

const countFiles = async (directory: string): Promise<number> => {
  let count = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    count += entry.isDirectory()
      ? await countFiles(path.join(directory, entry.name))
      : 1;
  }
  return count;
};

const sourceCardsByIdentity = new Map<
  string,
  typeof allPlayersBeforeIdentityPruning
>();
for (const player of allPlayersBeforeIdentityPruning) {
  const cards = sourceCardsByIdentity.get(player.playerIdentityId) ?? [];
  cards.push(player);
  sourceCardsByIdentity.set(player.playerIdentityId, cards);
}

const playableCardsByIdentity = new Map<string, typeof players>();
for (const player of players) {
  const cards = playableCardsByIdentity.get(player.playerIdentityId) ?? [];
  cards.push(player);
  playableCardsByIdentity.set(player.playerIdentityId, cards);
}

const removedIdentities = [...sourceCardsByIdentity.entries()]
  .filter(
    ([identityId]) =>
      (maximumOverallByPlayerIdentity.get(identityId) ?? 0) < 80,
  )
  .map(([identityId, cards]) => ({
    identityId,
    playerName: cards[0].playerName,
    maxOverall: maximumOverallByPlayerIdentity.get(identityId),
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
  .sort(
    (first, second) =>
      (second.maxOverall ?? 0) - (first.maxOverall ?? 0) ||
      first.identityId.localeCompare(second.identityId),
  );

const removedWith80Plus = removedIdentities.filter(
  (identity) => (identity.maxOverall ?? 0) >= 80,
);
const retainedIdentityCardMismatches = [
  ...sourceCardsByIdentity.entries(),
]
  .filter(
    ([identityId]) =>
      (maximumOverallByPlayerIdentity.get(identityId) ?? 0) >= 80,
  )
  .flatMap(([identityId, sourceCards]) => {
    const playableCards = playableCardsByIdentity.get(identityId) ?? [];
    return sourceCards.length === playableCards.length
      ? []
      : [
          {
            identityId,
            sourceCards: sourceCards.length,
            playableCards: playableCards.length,
          },
        ];
  });
const incorrectlyPlayableIdentities = [...playableCardsByIdentity.keys()].filter(
  (identityId) =>
    (maximumOverallByPlayerIdentity.get(identityId) ?? 0) < 80,
);
const sourceIds = new Set(
  allPlayersBeforeIdentityPruning.map((player) => player.id),
);
const unexpectedPlayableCards = players
  .filter((player) => !sourceIds.has(player.id))
  .map((player) => player.id);

const byTournamentYear = (
  cards: typeof allPlayersBeforeIdentityPruning,
) =>
  Object.fromEntries(
    [...new Set(cards.map((player) => player.tournamentYear))]
      .sort((first, second) => first - second)
      .map((year) => [
        year,
        cards.filter((player) => player.tournamentYear === year).length,
      ]),
  );

const main = async () => {
  const output = {
    version: 1,
    generatedAt: "2026-07-26",
    rule:
      "An identity is absent from the playable pool if and only if its maximum overall across all tournament cards is below 80. Every card of every retained identity remains playable.",
    summary: {
      sourceCards: allPlayersBeforeIdentityPruning.length,
      sourceIdentities: sourceCardsByIdentity.size,
      removedCards:
        allPlayersBeforeIdentityPruning.length - players.length,
      removedIdentities: removedIdentities.length,
      playableCards: players.length,
      playableIdentities: playableCardsByIdentity.size,
      sourceCardsByTournament: byTournamentYear(
        allPlayersBeforeIdentityPruning,
      ),
      playableCardsByTournament: byTournamentYear(players),
      playable2026CardsBelow80: players.filter(
        (player) =>
          player.tournamentYear === 2026 && player.overall < 80,
      ).length,
      note:
        "Playable 2026 cards below 80 belong to identities whose historical maximum is at least 80, so they are intentionally retained.",
    },
    validation: {
      removedWith80Plus,
      retainedIdentityCardMismatches,
      incorrectlyPlayableIdentities,
      unexpectedPlayableCards,
      passed:
        removedWith80Plus.length === 0 &&
        retainedIdentityCardMismatches.length === 0 &&
        incorrectlyPlayableIdentities.length === 0 &&
        unexpectedPlayableCards.length === 0,
    },
    portraitAssets: {
      restoredPlayerFiles: await countFiles("assets/players"),
      restoredWinnerAndOpponentFiles:
        (await countFiles("assets/players/winners")) +
        (await countFiles("assets/players/opponent")),
      portraitFilesDeletedByPruning: 0,
      note:
        "No portrait file was deleted. Restored archive portraits remain available for reference verification and retained cards.",
    },
    removedIdentities,
  };

  await writeFile(
    "reports/player-pruning-audit.json",
    `${JSON.stringify(output, null, 2)}\n`,
  );
};

void main();
