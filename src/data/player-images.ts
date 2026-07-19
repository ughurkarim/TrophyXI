import {
  gameFaceManifestGeneratedAt,
  managerGameFaceRecords,
  playerGameFaceRecords,
} from "@/data/game-face-manifest";
import { fbrefPortraitRecords } from "@/data/fbref-portrait-manifest";
import { managersById } from "@/data/managers";
import { licensedManagerPortraitImages } from "@/data/manager-images";
import { players, playersById } from "@/data/players";
import { userSuppliedPlayerImages } from "@/data/user-player-portraits";
import type { FbrefPortraitManifestRecord } from "@/lib/importers/fbref-portrait";
import type { GameFaceManifestRecord } from "@/lib/importers/game-face";
import type { ImageAttribution } from "@/types/game";

type GameFaceKind = ImageAttribution["kind"];

export const gameFacePathFor = (
  kind: GameFaceKind,
  cardId: string,
  tournamentYear: number,
) =>
  `/assets/${kind === "player" ? "players" : "managers"}/${tournamentYear}/${cardId}.png`;

const buildAttribution = (
  record: GameFaceManifestRecord,
): ImageAttribution => {
  const { id, kind } = record;
  const player = kind === "player" ? playersById.get(id) : undefined;
  const manager = kind === "manager" ? managersById.get(id) : undefined;
  if (!player && !manager) {
    throw new Error(
      `${id}: tournament-edition game face requires a matching tournament card`,
    );
  }
  const subjectName = player?.playerName ?? manager!.managerName;
  const tournamentYear = player?.tournamentYear ?? manager!.tournamentYear;
  if (
    tournamentYear !== record.tournamentYear ||
    record.localPath !== gameFacePathFor(kind, id, tournamentYear)
  ) {
    throw new Error(`${id}: tournament-edition game-face manifest mismatch`);
  }
  return {
    id,
    kind,
    subjectName,
    tournamentYear,
    file: record.localPath,
    cacheVersion: `${gameFaceManifestGeneratedAt}-${record.id}`,
    sourceFile: record.sourceFile,
    sourcePage: record.sourceUrl,
    author: record.author,
    license: record.license,
    licenseUrl: record.licenseUrl,
    changes: record.changes,
    fallback: false,
    representedTeam: player?.countryName ?? manager!.teamName,
    photographedYear: null,
    exactTournamentImage: false,
    isNationalTeamKit: false,
    photoContext: "tournament-edition-game-face",
    cropFocus: { x: 50, y: 20 },
    gameEdition: record.gameEdition,
    gameEditionLaunchYear: record.gameEditionLaunchYear,
    sourceWebsite: record.sourceWebsite,
    retrievedOn: record.retrievedOn,
    matchQuality: record.matchQuality,
    requiredAttribution: record.requiredAttribution,
  };
};

const buildFbrefAttribution = (
  record: FbrefPortraitManifestRecord,
): ImageAttribution => {
  const player = playersById.get(record.id);
  if (!player) {
    throw new Error(`${record.id}: FBref portrait requires a matching card`);
  }
  if (
    player.tournamentYear > 2002 ||
    player.playerIdentityId !== record.playerIdentityId ||
    player.tournamentYear !== record.tournamentYear ||
    record.localPath !==
      gameFacePathFor("player", record.id, record.tournamentYear)
  ) {
    throw new Error(`${record.id}: historical FBref portrait manifest mismatch`);
  }
  return {
    id: record.id,
    kind: "player",
    subjectName: player.playerName,
    tournamentYear: player.tournamentYear,
    file: record.localPath,
    cacheVersion: record.runtimeSha256.slice(0, 16),
    sourceFile: record.sourceFile,
    sourcePage: record.sourcePage,
    author: "FBref / Sports Reference (photographer not stated)",
    license: record.license,
    licenseUrl: null,
    changes: record.changes,
    fallback: false,
    representedTeam: null,
    photographedYear: null,
    exactTournamentImage: false,
    isNationalTeamKit: false,
    photoContext: "other-licensed-face",
    cropFocus: { x: 50, y: 20 },
    gameEdition: null,
    gameEditionLaunchYear: null,
    sourceWebsite: record.sourceWebsite,
    retrievedOn: record.retrievedOn,
    matchQuality: record.matchQuality,
    requiredAttribution: record.requiredAttribution,
  };
};

export const tournamentEditionPlayerImages =
  playerGameFaceRecords.map(buildAttribution);
export const historicalPlayerImages =
  fbrefPortraitRecords.map(buildFbrefAttribution);
const directPlayerImages = [
  ...tournamentEditionPlayerImages,
  ...historicalPlayerImages,
  ...userSuppliedPlayerImages,
];

const directPlayerImageIds = new Set(
  directPlayerImages.map((image) => image.id),
);

/**
 * Identity-only historical and user-supplied portraits may represent another
 * card for the same person. Tournament-edition game faces are deliberately
 * absent from this pool: those remain locked to their licensed game edition
 * and tournament card.
 */
const youngestIdentityPortraits = new Map<
  string,
  { image: ImageAttribution; tournamentYear: number }
>();
for (const image of [
  ...historicalPlayerImages,
  ...userSuppliedPlayerImages,
]) {
  const sourceCard = playersById.get(image.id);
  if (!sourceCard) continue;
  const current = youngestIdentityPortraits.get(
    sourceCard.playerIdentityId,
  );
  if (
    !current ||
    sourceCard.tournamentYear < current.tournamentYear ||
    (sourceCard.tournamentYear === current.tournamentYear &&
      image.id.localeCompare(current.image.id) < 0)
  ) {
    youngestIdentityPortraits.set(sourceCard.playerIdentityId, {
      image,
      tournamentYear: sourceCard.tournamentYear,
    });
  }
}

export const identityFallbackPlayerImages = players.flatMap((player) => {
  if (directPlayerImageIds.has(player.imageId)) return [];
  const source = youngestIdentityPortraits.get(player.playerIdentityId)?.image;
  if (!source) return [];
  return [
    {
      ...source,
      id: player.imageId,
      subjectName: player.playerName,
      tournamentYear: player.tournamentYear,
      cacheVersion: `${source.cacheVersion}-${player.imageId}`,
      changes: `${source.changes} Reused as an identity-only fallback for the ${player.tournamentYear} tournament card; it is not represented as an exact-tournament photograph.`,
      fallback: true,
      representedTeam: player.countryName,
      photographedYear: null,
      exactTournamentImage: false,
      photoContext: "other-licensed-face" as const,
    },
  ];
});

export const playerImages = [
  ...directPlayerImages,
  ...identityFallbackPlayerImages,
];

export const managerImages = [
  ...managerGameFaceRecords.map(buildAttribution),
  ...licensedManagerPortraitImages,
];

export const imageAttributions = [...playerImages, ...managerImages];
export const imagesById = new Map(
  imageAttributions.map((image) => [image.id, image]),
);

export const hasRealPortrait = (imageId: string) => imagesById.has(imageId);

export { userSuppliedPlayerImages };
