import {
  managerLocalPortraitRecords,
  playerLocalPortraitRecords,
  type LocalPortraitManifestRecord,
} from "@/data/local-portrait-manifest";
import { managersById } from "@/data/managers";
import { licensedManagerPortraitImages } from "@/data/manager-images";
import {
  importedPlayerIdentityPortraitRecords,
  type PlayerIdentityPortraitRecord,
} from "@/data/player-identity-portraits";
import auditedTournamentPortraitsJson from "@/data/tournament-edition-player-portraits.generated.json";
import {
  allPlayersBeforeIdentityPruning,
  getPlayablePlayerCardIds,
  getPlayablePlayers,
} from "@/data/players";
import { playerGameFacePath } from "@/lib/assets";
import type { ImageAttribution } from "@/types/game";

type GameFaceKind = ImageAttribution["kind"];

type AuditedTournamentPortraitRegistry = {
  version: number;
  generatedAt: string;
  portraits: Array<{
    cardId: string;
    playerIdentityId: string;
    tournamentYear: number;
    gameEdition: string;
    soFifaPlayerId: string;
    sourcePage: string;
    sourceImageUrl: string;
    localPath: string;
    sha256: string;
    cacheVersion: string;
  }>;
};

const STRICT_PLAYER_PORTRAIT_EDITION_BY_YEAR = new Map<
  number,
  { gameEdition: string; launchYear: number; version: number }
>([
  [2014, { gameEdition: "FIFA 14", launchYear: 2013, version: 14 }],
  [2018, { gameEdition: "FIFA 18", launchYear: 2017, version: 18 }],
  [2022, { gameEdition: "FIFA 23", launchYear: 2022, version: 23 }],
  [2026, { gameEdition: "EA SPORTS FC 26", launchYear: 2025, version: 26 }],
]);
const auditedTournamentPortraits =
  auditedTournamentPortraitsJson as AuditedTournamentPortraitRegistry;
const archivedPlayersById = new Map(
  allPlayersBeforeIdentityPruning.map((player) => [player.id, player]),
);
const playablePlayers = getPlayablePlayers();
const playablePlayerCardIds = getPlayablePlayerCardIds();
const playablePlayersById = new Map(
  playablePlayers.map((player) => [player.id, player]),
);


type PlayablePlayerCard = (typeof playablePlayers)[number];

const playablePlayerCardsByIdentityId = new Map<
  string,
  PlayablePlayerCard[]
>();

for (const player of playablePlayers) {
  const cards =
    playablePlayerCardsByIdentityId.get(player.playerIdentityId) ?? [];
  cards.push(player);
  playablePlayerCardsByIdentityId.set(player.playerIdentityId, cards);
}

/**
 * Returns true when imageId belongs to a playable player card rather than
 * a manager or another registered image.
 */
export const isPlayablePlayerCardId = (cardId: string): boolean =>
  playablePlayersById.has(cardId);

/**
 * Player portrait lookup order:
 *
 * 1. The exact tournament-card PNG.
 * 2. Other cards for the same player identity, nearest tournament year first.
 * 3. On an equal year distance, the earlier tournament year first.
 *
 * The browser tries each canonical PNG path in order. This does not copy files
 * in S3 and never falls back to a different player identity.
 */
export const playablePlayerGameFaceCandidatesFor = (
  cardId: string,
): string[] => {
  const target = playablePlayersById.get(cardId);
  if (!target) return [];

  const samePlayerCards =
    playablePlayerCardsByIdentityId.get(target.playerIdentityId) ?? [];

  const orderedCards = [...samePlayerCards].sort((a, b) => {
    if (a.id === target.id) return -1;
    if (b.id === target.id) return 1;

    const aDistance = Math.abs(
      a.tournamentYear - target.tournamentYear,
    );
    const bDistance = Math.abs(
      b.tournamentYear - target.tournamentYear,
    );

    if (aDistance !== bDistance) return aDistance - bDistance;

    if (a.tournamentYear !== b.tournamentYear) {
      return a.tournamentYear - b.tournamentYear;
    }

    return a.id.localeCompare(b.id);
  });

  return [...new Set(
    orderedCards.map((player) => playerGameFacePath(player.id)),
  )];
};

export const gameFacePathFor = (
  kind: GameFaceKind,
  cardId: string,
  tournamentYear: number,
) =>
  kind === "player"
    ? playablePlayerGameFacePathFor(cardId)
    : `/assets/managers/${tournamentYear}/${cardId}.png`;

export const playablePlayerGameFacePathFor = (cardId: string) =>
  playerGameFacePath(cardId);

const buildAttribution = (
  record: LocalPortraitManifestRecord | PlayerIdentityPortraitRecord,
): ImageAttribution => {
  const { id, kind } = record;
  const player = kind === "player" ? archivedPlayersById.get(id) : undefined;
  const manager = kind === "manager" ? managersById.get(id) : undefined;
  if (!player && !manager) {
    throw new Error(
      `${id}: local portrait requires a matching tournament card`,
    );
  }
  const subjectName = player?.playerName ?? manager!.managerName;
  const tournamentYear = player?.tournamentYear ?? manager!.tournamentYear;
  const isExactPlayerCard =
    kind === "player" &&
    (record.portraitScope === "card-specific" ||
      record.portraitScope === "card-exact");
  const isVerified2026GameFace =
    isExactPlayerCard &&
    tournamentYear === 2026 &&
    "sourceImageUrl" in record &&
    typeof record.sourceImageUrl === "string" &&
    record.sourceImageUrl.endsWith("/26_120.png");
  if (
    tournamentYear !== record.tournamentYear ||
    record.localPath !== gameFacePathFor(kind, id, tournamentYear)
  ) {
    throw new Error(`${id}: local portrait manifest mismatch`);
  }
  if (
    record.playerIdentityId &&
    player?.playerIdentityId !== record.playerIdentityId
  ) {
    throw new Error(`${id}: local portrait identity mismatch`);
  }
  return {
    id,
    kind,
    subjectName,
    tournamentYear,
    file: record.localPath,
    cacheVersion: record.cacheVersion,
    sourceFile: record.sourceFile,
    sourcePage: "sourcePage" in record ? record.sourcePage : null,
    author: "Local project asset",
    license: "Project asset",
    licenseUrl: null,
    changes: record.changes,
    fallback: false,
    representedTeam: player?.countryName ?? manager!.teamName,
    photographedYear: null,
    exactTournamentImage: isExactPlayerCard,
    isNationalTeamKit: false,
    photoContext: isExactPlayerCard
      ? "tournament-edition-game-face"
      : "other-licensed-face",
    cropFocus: { x: 50, y: 20 },
    gameEdition: isVerified2026GameFace ? "EA SPORTS FC 26" : null,
    gameEditionLaunchYear: isVerified2026GameFace ? 2025 : null,
    sourceWebsite: "Local portrait archive",
    retrievedOn: "2026-07-21",
    matchQuality:
      isVerified2026GameFace
        ? "edition-verified"
        : record.portraitScope === "card-specific" ||
            record.portraitScope === "card-exact"
          ? "manually-reviewed-edition"
          : "identity-only-permissioned",
    requiredAttribution: "Local portrait from the Trophy XI project archive.",
  };
};

export const exactLocalPlayerImages: ImageAttribution[] = [
  ...playerLocalPortraitRecords.filter(
    (record) =>
      record.portraitScope === "card-specific" &&
      playablePlayerCardIds.has(record.id),
  ),
  ...importedPlayerIdentityPortraitRecords.filter(
    (record) =>
      record.portraitScope === "card-exact" &&
      playablePlayerCardIds.has(record.id),
  ),
].map(buildAttribution);

export const tournamentEditionPlayerImages: ImageAttribution[] =
  auditedTournamentPortraits.portraits
    .filter((record) => playablePlayerCardIds.has(record.cardId))
    .map((record) => {
      const player = playablePlayersById.get(record.cardId);
      const required = STRICT_PLAYER_PORTRAIT_EDITION_BY_YEAR.get(
        record.tournamentYear,
      );
      const exactCardPath = playablePlayerGameFacePathFor(record.cardId);
      const mismatches: string[] = [];

      if (auditedTournamentPortraits.version !== 1) {
        mismatches.push(
          `registry version: expected 1, received ${auditedTournamentPortraits.version}`,
        );
      }

      if (!player) {
        mismatches.push("player missing from playablePlayersById");
      }

      if (!required) {
        mismatches.push(`unsupported tournament year: ${record.tournamentYear}`);
      }

      if (player && player.playerIdentityId !== record.playerIdentityId) {
        mismatches.push(
          `identity: player=${player.playerIdentityId}, registry=${record.playerIdentityId}`,
        );
      }

      if (player && player.tournamentYear !== record.tournamentYear) {
        mismatches.push(
          `year: player=${player.tournamentYear}, registry=${record.tournamentYear}`,
        );
      }

      if (required && record.gameEdition !== required.gameEdition) {
        mismatches.push(
          `edition: expected=${required.gameEdition}, registry=${record.gameEdition}`,
        );
      }

      if (record.localPath !== exactCardPath) {
        mismatches.push(
          `path: expected=${exactCardPath}, registry=${record.localPath}`,
        );
      }

      if (
        !record.sourcePage.includes(`/player/${record.soFifaPlayerId}`)
      ) {
        mismatches.push(
          `source page does not contain /player/${record.soFifaPlayerId}: ${record.sourcePage}`,
        );
      }

      if (
        required &&
        !record.sourceImageUrl.endsWith(`/${required.version}_120.png`)
      ) {
        mismatches.push(
          `source image: expected version ${required.version}, received ${record.sourceImageUrl}`,
        );
      }

      if (mismatches.length > 0) {
        throw new Error(
          `${record.cardId}: audited tournament portrait registry mismatch\n${mismatches.join("\n")}`,
        );
      }

      if (!player || !required) {
        throw new Error(
          `${record.cardId}: player or required edition unexpectedly missing`,
        );
      }

      return {
        id: record.cardId,
        kind: "player",
        subjectName: player.playerName,
        tournamentYear: player.tournamentYear,
        file: exactCardPath,
        cacheVersion: record.cacheVersion,
        sourceFile: record.sourceImageUrl,
        sourcePage: record.sourcePage,
        author: "EA SPORTS game-face asset",
        license: "Cleared for Trophy XI project use",
        licenseUrl: null,
        changes:
          "Retrieved independently from the required game-edition endpoint and stored as a card-specific PNG after name, date-of-birth, nationality, source-ID, format, and duplicate validation.",
        fallback: false,
        representedTeam: player.countryName,
        photographedYear: null,
        exactTournamentImage: true,
        isNationalTeamKit: false,
        photoContext: "tournament-edition-game-face",
        cropFocus: { x: 50, y: 20 },
        gameEdition: record.gameEdition,
        gameEditionLaunchYear: required.launchYear,
        sourceWebsite: "SoFIFA",
        retrievedOn: auditedTournamentPortraits.generatedAt.slice(0, 10),
        matchQuality: "edition-verified",
        requiredAttribution: `${record.gameEdition} player game face sourced through SoFIFA.`,
      };
    });

/**
 * Playable cards render only independently audited, card-specific game faces.
 * A missing exact-year image deliberately stays absent from this map so the
 * shared portrait component renders Photo Pending. Cross-year identity
 * fallbacks remain disabled.
 */
export const identityFallbackPlayerImages: ImageAttribution[] = [];

const combinedPlayerImagesById = new Map<string, ImageAttribution>();

// Exact-year historical/local card portraits, such as Pelé 1970.
for (const image of exactLocalPlayerImages) {
  combinedPlayerImagesById.set(image.id, image);
}

// Audited game-face records take precedence when both sources contain a card.
for (const image of tournamentEditionPlayerImages) {
  combinedPlayerImagesById.set(image.id, image);
}

export const playerImages = [...combinedPlayerImagesById.values()];

export const managerImages = [
  ...managerLocalPortraitRecords.map(buildAttribution),
  ...licensedManagerPortraitImages,
];

export const imageAttributions = [...playerImages, ...managerImages];
export const imagesById = new Map(
  imageAttributions.map((image) => [image.id, image]),
);

export const hasRealPortrait = (imageId: string) => imagesById.has(imageId);