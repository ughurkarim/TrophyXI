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
import { userSuppliedPlayerImages } from "@/data/user-player-portraits";
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

export const gameFacePathFor = (
  kind: GameFaceKind,
  cardId: string,
  tournamentYear: number,
) =>
  `/assets/${kind === "player" ? "players" : "managers"}/${tournamentYear}/${cardId}.png`;

export const playablePlayerGameFacePathFor = (cardId: string) =>
  `/players/game-faces/${cardId}.png`;

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
  const isVerified2026GameFace =
    kind === "player" &&
    tournamentYear === 2026 &&
    "sourceImageUrl" in record &&
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
    exactTournamentImage: isVerified2026GameFace,
    isNationalTeamKit: false,
    photoContext: isVerified2026GameFace
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
        : record.portraitScope === "card-specific"
          ? "manually-reviewed-edition"
          : "identity-only-permissioned",
    requiredAttribution: "Local portrait from the Trophy XI project archive.",
  };
};

export const historicalPlayerImages = playerLocalPortraitRecords
  .filter(
    (record) =>
      record.portraitScope === "identity-only" &&
      record.tournamentYear !== 2026,
  )
  .map(buildAttribution);
export const importedPlayerIdentityImages =
  importedPlayerIdentityPortraitRecords
    .filter(
      (record) =>
        archivedPlayersById.has(record.id) &&
        (record.tournamentYear !== 2026 ||
          record.sourceImageUrl.endsWith("/26_120.png")),
    )
    .map(buildAttribution);

export const tournamentEditionPlayerImages: ImageAttribution[] =
  auditedTournamentPortraits.portraits
    .filter((record) => playablePlayerCardIds.has(record.cardId))
    .map((record) => {
      const player = playablePlayersById.get(record.cardId);
      const required = STRICT_PLAYER_PORTRAIT_EDITION_BY_YEAR.get(
        record.tournamentYear,
      );
      const exactCardPath = playablePlayerGameFacePathFor(record.cardId);
      if (
        auditedTournamentPortraits.version !== 1 ||
        !player ||
        !required ||
        player.playerIdentityId !== record.playerIdentityId ||
        player.tournamentYear !== record.tournamentYear ||
        record.gameEdition !== required.gameEdition ||
        // The generated registry keeps its established metadata path. Runtime
        // points at the already-existing exact-card public copy; no asset is
        // moved, renamed, or consolidated here.
        ![
          exactCardPath,
          `/assets/players/game-faces/${record.cardId}.png`,
        ].includes(record.localPath) ||
        !record.sourcePage.includes(`/player/${record.soFifaPlayerId}`) ||
        !record.sourceImageUrl.endsWith(`/${required.version}_120.png`)
      ) {
        throw new Error(
          `${record.cardId}: audited tournament portrait registry mismatch`,
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

export const playerImages = tournamentEditionPlayerImages;

export const managerImages = [
  ...managerLocalPortraitRecords.map(buildAttribution),
  ...licensedManagerPortraitImages,
];

export const imageAttributions = [...playerImages, ...managerImages];
export const imagesById = new Map(
  imageAttributions.map((image) => [image.id, image]),
);

export const hasRealPortrait = (imageId: string) => imagesById.has(imageId);

export { userSuppliedPlayerImages };
