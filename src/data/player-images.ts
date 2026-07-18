import {
  managerGameFaceRecords,
  playerGameFaceRecords,
} from "@/data/game-face-manifest";
import { managersById } from "@/data/managers";
import { playersById } from "@/data/players";
import type { GameFaceManifestRecord } from "@/lib/importers/game-face";
import type { ImageAttribution } from "@/types/game";

type GameFaceKind = ImageAttribution["kind"];

export const gameFacePathFor = (kind: GameFaceKind, cardId: string) =>
  `/${kind === "player" ? "players" : "managers"}/game-faces/${cardId}.png`;

const buildAttribution = (
  record: GameFaceManifestRecord,
): ImageAttribution => {
  const { id, kind } = record;
  const player = kind === "player" ? playersById.get(id) : undefined;
  const manager = kind === "manager" ? managersById.get(id) : undefined;
  if (!player && !manager) {
    throw new Error(
      `${id}: exact-year game face requires a matching tournament card`,
    );
  }
  const subjectName = player?.playerName ?? manager!.managerName;
  const tournamentYear = player?.tournamentYear ?? manager!.tournamentYear;
  if (
    tournamentYear !== record.tournamentYear ||
    record.localPath !== gameFacePathFor(kind, id)
  ) {
    throw new Error(`${id}: exact-year game-face manifest mismatch`);
  }
  return {
    id,
    kind,
    subjectName,
    tournamentYear,
    file: record.localPath,
    sourceFile: record.sourceFile,
    sourcePage: record.sourceUrl,
    author: record.author,
    license: record.license,
    licenseUrl: record.licenseUrl,
    changes: record.changes,
    fallback: false,
    representedTeam: player?.countryName ?? manager!.teamName,
    photographedYear: record.tournamentYear,
    exactTournamentImage: true,
    isNationalTeamKit: false,
    photoContext: "exact-tournament",
    cropFocus: { x: 50, y: 20 },
    gameEdition: record.gameEdition,
    sourceWebsite: record.sourceWebsite,
    retrievedOn: record.retrievedOn,
    matchQuality: record.matchQuality,
  };
};

export const playerImages = playerGameFaceRecords.map(buildAttribution);

export const managerImages = managerGameFaceRecords.map(buildAttribution);

export const imageAttributions = [...playerImages, ...managerImages];
export const imagesById = new Map(
  imageAttributions.map((image) => [image.id, image]),
);

export const hasRealPortrait = (imageId: string) => imagesById.has(imageId);
