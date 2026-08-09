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

type PreferredPlayerGameFace = {
  sourceCardId: string;
  cacheVersion: string;
  sourcePath?: string;
  exclusive?: boolean;
};

/**
 * Curated identity portraits that intentionally replace the older card-year
 * objects still present in the asset bucket. The content hash changes the
 * browser-facing URL after an asset replacement; the canonical card path is
 * still used everywhere except for Frank de Boer's currently uploaded legacy
 * key, which contains a leading space.
 */
const preferredPlayerGameFacesByIdentityId = new Map<
  string,
  PreferredPlayerGameFace
>([
  ["dunga", { sourceCardId: "dunga-1994", cacheVersion: "f0ddd98474f32f7a" }],
  [
    "edgar-davids",
    { sourceCardId: "edgar-davids-1998", cacheVersion: "46650a5872813f1b" },
  ],
  [
    "fabio-cannavaro",
    { sourceCardId: "fabio-cannavaro-2006", cacheVersion: "76422257fecc0330" },
  ],
  [
    "fernando-muslera",
    {
      sourceCardId: "fernando-muslera-2026",
      cacheVersion: "0d2c74892d8f8c84",
      exclusive: true,
    },
  ],
  [
    "frank-de-boer",
    {
      sourceCardId: "frank-de-boer-1994",
      sourcePath: "/players/game-faces/%20frank-de-boer-1994.png",
      cacheVersion: "611681705b7fa400",
    },
  ],
  [
    "gheorghe-hagi",
    { sourceCardId: "gheorghe-hagi-1994", cacheVersion: "dbdc273947b2f3a5" },
  ],
  [
    "gianluigi-buffon",
    { sourceCardId: "gianluigi-buffon-2006", cacheVersion: "ccfb8d16b9c72549" },
  ],
  [
    "hong-myung-bo",
    { sourceCardId: "hong-myung-bo-2002", cacheVersion: "ef16d27debf1bdba" },
  ],
  [
    "jurgen-klinsmann",
    { sourceCardId: "jurgen-klinsmann-1994", cacheVersion: "e9dd525b4c4d4075" },
  ],
  [
    "laurent-blanc",
    { sourceCardId: "laurent-blanc-1998", cacheVersion: "849fba0cd77dd13f" },
  ],
  [
    "thierry-henry",
    { sourceCardId: "thierry-henry-2002", cacheVersion: "3f92e1c5fcd46a28" },
  ],
  [
    "zinedine-zidane",
    { sourceCardId: "zinedine-zidane-1998", cacheVersion: "cbd2d0410eaae9d2" },
  ],
]);

const preferredPlayerGameFaceCacheVersionsByPath = new Map(
  [...preferredPlayerGameFacesByIdentityId.values()].flatMap((preferred) => {
    const canonicalPath = playerGameFacePath(preferred.sourceCardId);
    const preferredPath = preferred.sourcePath ?? canonicalPath;

    return [
      [preferredPath, preferred.cacheVersion],
      ...(preferredPath === canonicalPath
        ? []
        : [[canonicalPath, preferred.cacheVersion]]),
    ] as Array<[string, string]>;
  }),
);

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
 * 1. A curated identity portrait, when one has explicitly been selected.
 * 2. The exact tournament-card PNG.
 * 3. Other cards for the same player identity, nearest tournament year first.
 * 4. On an equal year distance, the earlier tournament year first.
 *
 * The browser tries each PNG candidate in order. This does not copy files in
 * S3 and never falls back to a different player identity.
 */
export const playablePlayerGameFaceCandidatesFor = (
  cardId: string,
): string[] => {
  const target = playablePlayersById.get(cardId);
  if (!target) return [];

  const samePlayerCards =
    playablePlayerCardsByIdentityId.get(target.playerIdentityId) ?? [];
  const preferred = preferredPlayerGameFacesByIdentityId.get(
    target.playerIdentityId,
  );
  const preferredCanonicalPath = preferred
    ? playerGameFacePath(preferred.sourceCardId)
    : null;
  const preferredPath = preferred?.sourcePath ?? preferredCanonicalPath;

  if (preferred?.exclusive && preferredPath) {
    return [preferredPath];
  }

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

  return [
    ...new Set([
      ...(preferredPath ? [preferredPath] : []),
      ...(preferredCanonicalPath ? [preferredCanonicalPath] : []),
      ...orderedCards.map((player) => playerGameFacePath(player.id)),
    ]),
  ];
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
 * This attribution registry remains exact-card only. Runtime candidate
 * fallback is handled separately above and never changes attribution data.
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

/**
 * Returns the content token for a player object when one is known. The CDN
 * currently ignores query parameters, but this still prevents Safari and
 * other browsers from reusing a stale response after the CDN object changes.
 */
export const playerGameFaceCacheVersionForPath = (
  path: string,
): string | null => {
  const preferredVersion = preferredPlayerGameFaceCacheVersionsByPath.get(path);
  if (preferredVersion) return preferredVersion;

  const match = /^\/players\/game-faces\/([^/?]+)\.png$/.exec(path);
  if (!match) return null;

  const registeredImage = imagesById.get(decodeURIComponent(match[1]));
  return registeredImage?.kind === "player"
    ? registeredImage.cacheVersion
    : null;
};

export const hasRealPortrait = (imageId: string) => imagesById.has(imageId);
