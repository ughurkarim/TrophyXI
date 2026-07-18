import {
  managerGameFaceCardIds,
  playerGameFaceCardIds,
} from "@/data/game-face-manifest";
import { managersById } from "@/data/managers";
import { playersById } from "@/data/players";
import type { ImageAttribution } from "@/types/game";

type GameFaceKind = ImageAttribution["kind"];

export const gameFacePathFor = (kind: GameFaceKind, cardId: string) =>
  `/${kind === "player" ? "players" : "managers"}/game-faces/${cardId}.png`;

/**
 * A game-face file cannot become active on filename alone. Every entry must
 * identify a reusable source and the exact tournament context. The local
 * folders are currently empty, so the complete archive intentionally renders
 * Photo Pending.
 */
const exactYearSourceMetadata: Record<
  string,
  Omit<
    ImageAttribution,
    | "id"
    | "kind"
    | "subjectName"
    | "tournamentYear"
    | "file"
    | "exactTournamentImage"
    | "photoContext"
  >
> = {};

const buildAttribution = (
  id: string,
  kind: GameFaceKind,
): ImageAttribution => {
  const metadata = exactYearSourceMetadata[id];
  const player = kind === "player" ? playersById.get(id) : undefined;
  const manager = kind === "manager" ? managersById.get(id) : undefined;
  if ((!player && !manager) || !metadata) {
    throw new Error(
      `${id}: exact-year game face requires a matching card and complete source metadata`,
    );
  }
  const subjectName = player?.playerName ?? manager!.managerName;
  const tournamentYear = player?.tournamentYear ?? manager!.tournamentYear;
  return {
    ...metadata,
    id,
    kind,
    subjectName,
    tournamentYear,
    file: gameFacePathFor(kind, id),
    exactTournamentImage: true,
    photoContext: "exact-tournament",
  };
};

export const playerImages = playerGameFaceCardIds.map((id) =>
  buildAttribution(id, "player"),
);

export const managerImages = managerGameFaceCardIds.map((id) =>
  buildAttribution(id, "manager"),
);

export const imageAttributions = [...playerImages, ...managerImages];
export const imagesById = new Map(
  imageAttributions.map((image) => [image.id, image]),
);

export const hasRealPortrait = (imageId: string) => imagesById.has(imageId);
