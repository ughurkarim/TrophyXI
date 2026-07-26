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
import { players, playersById } from "@/data/players";
import { userSuppliedPlayerImages } from "@/data/user-player-portraits";
import type { ImageAttribution } from "@/types/game";

type GameFaceKind = ImageAttribution["kind"];

export const gameFacePathFor = (
  kind: GameFaceKind,
  cardId: string,
  tournamentYear: number,
) =>
  `/assets/${kind === "player" ? "players" : "managers"}/${tournamentYear}/${cardId}.png`;

const buildAttribution = (
  record: LocalPortraitManifestRecord | PlayerIdentityPortraitRecord,
): ImageAttribution => {
  const { id, kind } = record;
  const player = kind === "player" ? playersById.get(id) : undefined;
  const manager = kind === "manager" ? managersById.get(id) : undefined;
  if (!player && !manager) {
    throw new Error(
      `${id}: local portrait requires a matching tournament card`,
    );
  }
  const subjectName = player?.playerName ?? manager!.managerName;
  const tournamentYear = player?.tournamentYear ?? manager!.tournamentYear;
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
    exactTournamentImage: false,
    isNationalTeamKit: false,
    photoContext: "other-licensed-face",
    cropFocus: { x: 50, y: 20 },
    gameEdition: null,
    gameEditionLaunchYear: null,
    sourceWebsite: "Local portrait archive",
    retrievedOn: "2026-07-21",
    matchQuality:
      record.portraitScope === "card-specific"
        ? "manually-reviewed-edition"
        : "identity-only-permissioned",
    requiredAttribution: "Local portrait from the Trophy XI project archive.",
  };
};

export const tournamentEditionPlayerImages =
  playerLocalPortraitRecords
    .filter((record) => record.portraitScope === "card-specific")
    .map(buildAttribution);
export const historicalPlayerImages = playerLocalPortraitRecords
  .filter((record) => record.portraitScope === "identity-only")
  .map(buildAttribution);
const fc25ImportedSourceCardIds = new Set(
  importedPlayerIdentityPortraitRecords
    .filter((record) => record.sourceImageUrl.endsWith("/25_120.png"))
    .map((record) => record.id),
);
export const importedPlayerIdentityImages =
  importedPlayerIdentityPortraitRecords
    .filter(
      (record) =>
        playersById.has(record.id) &&
        !(
          record.tournamentYear === 2026 &&
          record.sourceImageUrl.includes("cdn.sofifa.net/players/") &&
          !record.sourceImageUrl.endsWith("/26_120.png")
        ),
    )
    .map(buildAttribution);
const directPlayerImageById = new Map(
  [
  ...tournamentEditionPlayerImages,
  ...historicalPlayerImages,
  ...importedPlayerIdentityImages,
  ...userSuppliedPlayerImages,
  ].map((image) => [image.id, image]),
);
const directPlayerImages = [...directPlayerImageById.values()];

/**
 * Every locally verified face can represent another tournament card for the
 * same person. The closest available tournament year wins; ties prefer the
 * newer portrait and then a stable card id. Reused images are explicitly
 * labeled as identity-only fallbacks rather than exact-tournament photos.
 */
const directPortraitsByIdentity = new Map<string, ImageAttribution[]>();
for (const image of directPlayerImages) {
  const sourceCard = playersById.get(image.id);
  if (!sourceCard) continue;
  directPortraitsByIdentity.set(sourceCard.playerIdentityId, [
    ...(directPortraitsByIdentity.get(sourceCard.playerIdentityId) ?? []),
    image,
  ]);
}

export const identityFallbackPlayerImages = players.flatMap((player) => {
  if (directPlayerImageById.has(player.imageId)) return [];
  const source = [
    ...(directPortraitsByIdentity.get(player.playerIdentityId) ?? []),
  ]
    .filter(
      (candidate) =>
        player.tournamentYear !== 2026 ||
        !fc25ImportedSourceCardIds.has(candidate.id),
    )
    .sort(
      (first, second) =>
        Math.abs(first.tournamentYear - player.tournamentYear) -
          Math.abs(second.tournamentYear - player.tournamentYear) ||
        second.tournamentYear - first.tournamentYear ||
        first.id.localeCompare(second.id),
    )[0];
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
      gameEdition: null,
      gameEditionLaunchYear: null,
      matchQuality: "identity-only-permissioned",
    },
  ];
});

export const playerImages = [
  ...directPlayerImages,
  ...identityFallbackPlayerImages,
];

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
