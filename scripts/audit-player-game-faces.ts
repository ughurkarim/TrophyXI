import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { getPlayablePlayers } from "../src/data/players";

const ROOT = process.cwd();
const CANONICAL_DIRECTORY = path.join(
  ROOT,
  "public",
  "players",
  "game-faces",
);
const REPORT_FILE = path.join(ROOT, "reports", "player-game-face-audit.json");
const LOCAL_MANIFEST_FILE = path.join(
  ROOT,
  "src",
  "data",
  "local-portrait-manifest.generated.json",
);
const IDENTITY_MANIFEST_FILE = path.join(
  ROOT,
  "src",
  "data",
  "player-identity-portraits.generated.json",
);
const TOURNAMENT_MANIFEST_FILE = path.join(
  ROOT,
  "src",
  "data",
  "tournament-edition-player-portraits.generated.json",
);
const MIGRATE = process.argv.includes("--migrate");
const CHECK = process.argv.includes("--check");

/**
 * These are the only legacy files with explicit per-card, user-supplied
 * attribution. Every other plausible legacy basename remains rejected: a
 * filename alone is not proof that the image belongs to that tournament card.
 */
const VERIFIED_MIGRATION_SOURCE_BY_CARD_ID = {
  "alain-giresse-1982": "assets/players/1982/alain-giresse-1982.png",
  "andreas-brehme-1986": "assets/players/1986/andreas-brehme-1986.png",
  "arie-haan-1974": "assets/players/1974/arie-haan-1974.png",
  "berti-vogts-1978": "assets/players/1978/berti-vogts-1978.png",
  "bobby-moore-1970": "assets/players/1970/bobby-moore-1970.webp",
  "bruno-conti-1982": "assets/players/1982/bruno-conti-1982.png",
  "claudio-gentile-1978": "assets/players/1978/claudio-gentile-1978.png",
  "cristian-romero-2022": "assets/players/2022/cristian-romero-2023.webp",
  "cristiano-ronaldo-2006":
    "assets/players/2006/cristiano-ronaldo-2006.png",
  "cristiano-ronaldo-2010":
    "assets/players/2010/cristiano-ronaldo-2010.png",
  "daniel-passarella-1978":
    "assets/players/1978/daniel-passarella-1978.png",
  "dino-zoff-1974": "assets/players/1974/dino-zoff-1974.png",
  "dirceu-1978": "assets/players/1978/Dirceu-1978.png",
  "dominik-livakovic-2022":
    "assets/players/2022/dominik-livaković-2022.webp",
  "emilio-butragueno-1986":
    "assets/players/1986/emilio-butragueño-1986.webp",
  "falcao-1982": "assets/players/1982/Falcão-1982.png",
  "franz-beckenbauer-1970":
    "assets/players/1970/franz-beckenbauer-1970.png",
  "gaetano-scirea-1978": "assets/players/1978/gaetano-scirea-1978.png",
  "gary-lineker-1986": "assets/players/1986/gary-lineker-1986.png",
  "gerd-muller-1970": "assets/players/1970/gerd-muller-1970.png",
  "giacinto-facchetti-1970":
    "assets/players/1970/giacinto-facchetti-1970.png",
  "gordon-banks-1970": "assets/players/1970/gordon-banks-1970.png",
  "grzegorz-lato-1974": "assets/players/1974/grzegorz-lato-1974.png",
  "igor-belanov-1986": "assets/players/1986/igor-belanov-1986.png",
  "jairzinho-1970": "assets/players/1970/jairzinho-1970.png",
  "jean-marie-pfaff-1986":
    "assets/players/1986/jean-marie-pfaff-1986.png",
  "jean-tigana-1982": "assets/players/1982/jean-tigana-1982.png",
  "johan-cruyff-1974": "assets/players/1974/johan-cruyff-1974.webp",
  "johan-neeskens-1974": "assets/players/1974/johan-neeskens-1974.png",
  "jorge-burruchaga-1986":
    "assets/players/1986/jorge-burruchaga-1986.png",
  "jorge-valdano-1986": "assets/players/1986/jorge-valdano-1986.png",
  "julian-alvarez-2022": "assets/players/2022/julián-álvarez-2022.webp",
  "karl-heinz-rummenigge-1978":
    "assets/players/1978/karl-heinz-rummenigge-1978.png",
  "kazimierz-deyna-1974": "assets/players/1974/kazimierz-deyna-1974.png",
  "lionel-messi-2006": "assets/players/2006/lionel-messi-2006.png",
  "lionel-messi-2010": "assets/players/2010/lionel-messi-2010.png",
  "lothar-matthaus-1986":
    "assets/players/1986/lothar-matthaus-1986.png",
  "marco-tardelli-1978": "assets/players/1978/marco-tardelli-1978.png",
  "mario-kempes-1974": "assets/players/1974/mario-kempes-74.png",
  "michel-platini-1978": "assets/players/1978/michel-platini-1978.webp",
  "osvaldo-ardiles-1978": "assets/players/1978/osvaldo-ardiles-1978.png",
  "paolo-rossi-1978": "assets/players/1978/paolo-rossi-1978.png",
  "paul-breitner-1974": "assets/players/1974/paul-breitner-1974.png",
  "preben-elkj-r-1986": "assets/players/1986/preben-elkj-r-1986.png",
  "rivelino-1970": "assets/players/1970/rivelino-1970.png",
  "rob-rensenbrink-1974":
    "assets/players/1974/rob-rensenbrink-1974.png",
  "rudi-voller-1986": "assets/players/1986/rudi-völler-1986.webp",
  "ruud-krol-1974": "assets/players/1974/ruud-krol-1974.png",
  "sepp-maier-1970": "assets/players/1970/sepp-maier-1970.png",
  "sofyan-amrabat-2022": "assets/players/2022/sofyan-amrabat-2022.webp",
  "teofilo-cubillas-1970":
    "assets/players/1970/teofilo-cubillas-1970.png",
  "tostao-1970": "assets/players/1970/tostao-1970.png",
  "wolfgang-overath-1970":
    "assets/players/1970/wolfgang-overath-1970.png",
  "zbigniew-boniek-1978": "assets/players/1978/zbigniew-boniek-1978.png",
  "zico-1978": "assets/players/1978/zico-1978.png",
} as const satisfies Record<string, string>;

const compare = (first: string, second: string) =>
  first.localeCompare(second, "en", { numeric: true });
const canonicalRuntimePath = (cardId: string) =>
  `/players/game-faces/${cardId}.png`;
const canonicalAbsolutePath = (cardId: string) =>
  path.join(CANONICAL_DIRECTORY, `${cardId}.png`);
const sha256 = async (file: string) =>
  createHash("sha256").update(await readFile(file)).digest("hex");
const readJson = async <T>(file: string) =>
  JSON.parse(await readFile(file, "utf8")) as T;
const writeJson = async (file: string, value: unknown) =>
  writeFile(file, `${JSON.stringify(value, null, 2)}\n`);

type LocalManifest = {
  version: number;
  generatedAt: string;
  portraits: Array<{
    id: string;
    kind: "player" | "manager";
    playerIdentityId?: string;
    tournamentYear: number;
    localPath: string;
    sourceFile: string;
    portraitScope: "card-specific" | "identity-only";
    cacheVersion: string;
    changes: string;
  }>;
};

type IdentityManifest = {
  version: number;
  generatedAt: string;
  identityCount: number;
  coveredIdentityCount: number;
  existingIdentityCount: number;
  importedIdentityCount: number;
  identityPortraits: unknown[];
  importedPortraits: Array<{
    id: string;
    kind: "player";
    playerIdentityId: string;
    tournamentYear: number;
    localPath: string;
    sourceFile: string;
    portraitScope: "card-exact" | "identity-only";
    cacheVersion: string;
    changes: string;
    sourcePage: string | null;
    sourceImageUrl: string | null;
  }>;
  unresolvedIdentities: unknown[];
};

type TournamentManifest = {
  version: number;
  generatedAt: string;
  portraits: Array<{ cardId: string; localPath: string } & Record<string, unknown>>;
};

const migrateVerifiedFiles = async () => {
  await mkdir(CANONICAL_DIRECTORY, { recursive: true });
  const copied: string[] = [];
  const skipped: string[] = [];

  for (const [cardId, sourceRelativePath] of Object.entries(
    VERIFIED_MIGRATION_SOURCE_BY_CARD_ID,
  ).sort(([first], [second]) => compare(first, second))) {
    const source = path.join(ROOT, sourceRelativePath);
    const target = canonicalAbsolutePath(cardId);
    if (!existsSync(source)) {
      throw new Error(`${cardId}: verified migration source is missing: ${source}`);
    }
    if (existsSync(target)) {
      skipped.push(cardId);
      continue;
    }
    if (path.extname(source).toLowerCase() === ".png") {
      await copyFile(source, target);
    } else {
      await sharp(source, { animated: false })
        .rotate()
        .png({ compressionLevel: 9, palette: false })
        .toFile(target);
    }
    copied.push(cardId);
  }
  return { copied, skipped };
};

const migrateGeneratedMetadata = async () => {
  const migratedAt = new Date().toISOString();
  const playableById = new Map(
    getPlayablePlayers().map((player) => [player.id, player]),
  );
  const local = await readJson<LocalManifest>(LOCAL_MANIFEST_FILE);
  local.generatedAt = migratedAt;
  local.portraits = local.portraits
    .filter(
      (record) =>
        record.kind === "manager" ||
        (record.portraitScope === "card-specific" &&
          existsSync(canonicalAbsolutePath(record.id))),
    )
    .map((record) =>
      record.kind === "player"
        ? {
            ...record,
            localPath: canonicalRuntimePath(record.id),
            sourceFile: canonicalRuntimePath(record.id),
          }
        : record,
    );
  await writeJson(LOCAL_MANIFEST_FILE, local);

  const identity = await readJson<IdentityManifest>(IDENTITY_MANIFEST_FILE);
  const originalById = new Map(
    identity.importedPortraits.map((record) => [record.id, record]),
  );
  const canonicalIds = new Set(
    (await readdir(CANONICAL_DIRECTORY))
      .filter((filename) => filename.endsWith(".png"))
      .map((filename) => filename.slice(0, -4)),
  );
  identity.importedPortraits = [...canonicalIds]
    .flatMap((cardId) => {
      const player = playableById.get(cardId);
      const original = originalById.get(cardId);
      if (
        !player ||
        (original?.portraitScope !== "card-exact" &&
          !(cardId in VERIFIED_MIGRATION_SOURCE_BY_CARD_ID))
      ) {
        return [];
      }
      return [
        {
          id: cardId,
          kind: "player" as const,
          playerIdentityId: player.playerIdentityId,
          tournamentYear: player.tournamentYear,
          localPath: canonicalRuntimePath(cardId),
          sourceFile: canonicalRuntimePath(cardId),
          portraitScope: "card-exact" as const,
          cacheVersion: original?.cacheVersion ?? "canonical-game-face",
          changes:
            original?.changes ??
            "Normalized an explicitly attributed, card-specific source into the canonical game-face folder.",
          sourcePage: original?.sourcePage ?? null,
          sourceImageUrl: original?.sourceImageUrl ?? null,
        },
      ];
    })
    .sort((first, second) => compare(first.id, second.id));
  const coveredIdentities = new Set(
    identity.importedPortraits.map((record) => record.playerIdentityId),
  ).size;
  identity.generatedAt = migratedAt;
  identity.coveredIdentityCount = coveredIdentities;
  identity.existingIdentityCount = coveredIdentities;
  identity.importedIdentityCount = 0;
  identity.identityPortraits = [];
  identity.unresolvedIdentities = [];
  await writeJson(IDENTITY_MANIFEST_FILE, identity);

  const tournament = await readJson<TournamentManifest>(
    TOURNAMENT_MANIFEST_FILE,
  );
  tournament.generatedAt = migratedAt;
  tournament.portraits = tournament.portraits.map((record) => ({
    ...record,
    localPath: canonicalRuntimePath(record.cardId),
  }));
  await writeJson(TOURNAMENT_MANIFEST_FILE, tournament);
};

const listTextFiles = async (start: string): Promise<string[]> => {
  const absolute = path.join(ROOT, start);
  if (!existsSync(absolute)) return [];
  const entries = await readdir(absolute, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const relative = path.join(start, entry.name);
      if (relative.startsWith(path.join("scripts", "cache"))) return [];
      if (entry.isDirectory()) return listTextFiles(relative);
      return /\.(?:[cm]?[jt]sx?|json|css|md)$/.test(entry.name)
        ? [relative]
        : [];
    }),
  );
  return files.flat();
};

const legacyReferencesIn = async (files: string[]) => {
  const references: Array<{ file: string; line: number; text: string }> = [];
  for (const file of files) {
    if (file === "scripts/audit-player-game-faces.ts") continue;
    const lines = (await readFile(path.join(ROOT, file), "utf8")).split("\n");
    lines.forEach((line, index) => {
      if (
        line.includes("assets/players/") ||
        line.includes("public/assets/players") ||
        line.includes('"assets", "players"')
      ) {
        references.push({ file, line: index + 1, text: line.trim() });
      }
    });
  }
  return references;
};

const audit = async (migration: { copied: string[]; skipped: string[] }) => {
  const playable = getPlayablePlayers();
  const playableIds = new Set(playable.map((player) => player.id));
  const invalidPlayableImageIds = playable
    .filter((player) => player.imageId !== player.id)
    .map((player) => ({
      cardId: player.id,
      imageId: player.imageId,
    }))
    .sort((first, second) => compare(first.cardId, second.cardId));
  const entries = (await readdir(CANONICAL_DIRECTORY)).sort(compare);
  const canonicalFilenames = entries.filter((entry) => entry.endsWith(".png"));
  const invalidCanonicalFiles = entries.filter(
    (entry) => entry !== ".gitkeep" && !/^[a-z0-9-]+\.png$/.test(entry),
  );
  const canonicalIds = new Set(
    canonicalFilenames.map((filename) => filename.slice(0, -4)),
  );
  const resolvedCardIds = playable
    .map((player) => player.id)
    .filter((cardId) => canonicalIds.has(cardId))
    .sort(compare);
  const missingCardIds = playable
    .map((player) => player.id)
    .filter((cardId) => !canonicalIds.has(cardId))
    .sort(compare);
  const unusedImageIds = [...canonicalIds]
    .filter((cardId) => !playableIds.has(cardId))
    .sort(compare);

  const idsByHash = new Map<string, string[]>();
  const invalidImageFiles: Array<{ file: string; reason: string }> = [];
  await Promise.all(
    canonicalFilenames.map(async (filename) => {
      const cardId = filename.slice(0, -4);
      const absolute = path.join(CANONICAL_DIRECTORY, filename);
      try {
        const metadata = await sharp(absolute).metadata();
        if (metadata.format !== "png" || !metadata.width || !metadata.height) {
          invalidImageFiles.push({
            file: filename,
            reason: `decoded as ${metadata.format ?? "unknown"} ${metadata.width ?? 0}x${metadata.height ?? 0}`,
          });
        }
      } catch (error) {
        invalidImageFiles.push({
          file: filename,
          reason: error instanceof Error ? error.message : String(error),
        });
      }
      const digest = await sha256(absolute);
      idsByHash.set(digest, [...(idsByHash.get(digest) ?? []), cardId]);
    }),
  );
  const duplicateImageGroups = [...idsByHash]
    .filter(([, ids]) => ids.length > 1)
    .map(([digest, ids]) => ({ sha256: digest, cardIds: ids.sort(compare) }))
    .sort((first, second) => compare(first.cardIds[0], second.cardIds[0]));

  const verifiedIds = new Set(
    Object.keys(VERIFIED_MIGRATION_SOURCE_BY_CARD_ID),
  );
  const rejectedLegacyCandidates = playable
    .filter((player) => {
      if (canonicalIds.has(player.id) || verifiedIds.has(player.id)) return false;
      return existsSync(
        path.join(
          ROOT,
          "assets",
          "players",
          String(player.tournamentYear),
          `${player.id}.png`,
        ),
      );
    })
    .map((player) => ({
      cardId: player.id,
      legacySource: `assets/players/${player.tournamentYear}/${player.id}.png`,
      reason: "No explicit exact-card attribution; identity/year reuse is forbidden.",
    }))
    .sort((first, second) => compare(first.cardId, second.cardId));

  const activeFiles = [
    ...(await listTextFiles("src")),
    "next.config.ts",
    "package.json",
  ];
  const activeLegacySourceReferences = await legacyReferencesIn(activeFiles);
  const allScriptFiles = await listTextFiles("scripts");
  const inactiveLegacySourceReferences = await legacyReferencesIn(
    allScriptFiles.filter(
      (file) =>
        !activeFiles.includes(file) && file !== "scripts/audit-player-game-faces.ts",
    ),
  );

  const { identityFallbackPlayerImages, playerImages } = await import(
    "../src/data/player-images"
  );
  const runtimeIds = playerImages.map((image) => image.id);
  const duplicateRuntimeCardIds = runtimeIds
    .filter((cardId, index) => runtimeIds.indexOf(cardId) !== index)
    .filter((cardId, index, ids) => ids.indexOf(cardId) === index)
    .sort(compare);
  const invalidRuntimeRecords = playerImages
    .flatMap((image) => {
      const reasons = [
        ...(playableIds.has(image.id) ? [] : ["not a playable card ID"]),
        ...(image.file === canonicalRuntimePath(image.id)
          ? []
          : [`path is ${image.file}`]),
        ...(existsSync(canonicalAbsolutePath(image.id))
          ? []
          : ["canonical PNG is missing"]),
        ...(image.kind === "player" ? [] : [`kind is ${image.kind}`]),
        ...(image.fallback ? ["fallback is enabled"] : []),
        ...(image.exactTournamentImage
          ? []
          : ["exactTournamentImage is false"]),
      ];
      return reasons.length > 0 ? [{ cardId: image.id, reasons }] : [];
    })
    .sort((first, second) => compare(first.cardId, second.cardId));

  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    canonicalDirectory: "public/players/game-faces",
    runtimePathPolicy: "/players/game-faces/{player-card-id}.png",
    deploymentObjectKeyPolicy: "players/game-faces/{player-card-id}.png",
    summary: {
      playableCardsChecked: playable.length,
      canonicalPngFiles: canonicalFilenames.length,
      imagesSuccessfullyResolved: resolvedCardIds.length,
      missingImages: missingCardIds.length,
      unusedImages: unusedImageIds.length,
      duplicateImageGroups: duplicateImageGroups.length,
      invalidImageFiles: invalidImageFiles.length,
      runtimeImageRecords: playerImages.length,
      rejectedLegacyCandidates: rejectedLegacyCandidates.length,
      activeLegacySourceReferences: activeLegacySourceReferences.length,
      invalidPlayableImageIds: invalidPlayableImageIds.length,
    },
    migration: {
      verifiedSourceCount: verifiedIds.size,
      verifiedCardIds: [...verifiedIds].sort(compare),
      copiedThisRun: migration.copied,
      alreadyCanonical: migration.skipped,
    },
    resolvedCardIds,
    missingCardIds,
    invalidPlayableImageIds,
    unusedImageIds,
    invalidCanonicalFiles,
    invalidImageFiles: invalidImageFiles.sort((first, second) =>
      compare(first.file, second.file),
    ),
    duplicateImageGroups,
    rejectedLegacyCandidates,
    runtime: {
      duplicateCardIds: duplicateRuntimeCardIds,
      invalidRecords: invalidRuntimeRecords,
      identityFallbackRecordCount: identityFallbackPlayerImages.length,
    },
    activeLegacySourceReferences,
    inactiveLegacySourceReferences,
    oldDirectoriesRemovedFromActiveUse: [
      "public/assets/players/game-faces",
      "assets/players/{year} dynamic player route",
      "assets/players/opponent",
      "assets/players/winners",
    ],
  };
  await mkdir(path.dirname(REPORT_FILE), { recursive: true });
  await writeJson(REPORT_FILE, report);

  const failures = [
    ...(invalidCanonicalFiles.length > 0
      ? [`${invalidCanonicalFiles.length} invalid canonical filenames`]
      : []),
    ...(duplicateImageGroups.length > 0
      ? [`${duplicateImageGroups.length} duplicate canonical image groups`]
      : []),
    ...(invalidImageFiles.length > 0
      ? [`${invalidImageFiles.length} invalid canonical image files`]
      : []),
    ...(duplicateRuntimeCardIds.length > 0
      ? [`${duplicateRuntimeCardIds.length} duplicate runtime card IDs`]
      : []),
    ...(invalidRuntimeRecords.length > 0
      ? [`${invalidRuntimeRecords.length} invalid runtime records`]
      : []),
    ...(invalidPlayableImageIds.length > 0
      ? [`${invalidPlayableImageIds.length} playable cards use a non-card image ID`]
      : []),
    ...(identityFallbackPlayerImages.length > 0
      ? [`${identityFallbackPlayerImages.length} identity fallback records`]
      : []),
    ...(activeLegacySourceReferences.length > 0
      ? [`${activeLegacySourceReferences.length} active legacy references`]
      : []),
  ];

  console.log(
    `Player game-face audit: ${resolvedCardIds.length}/${playable.length} resolved; ` +
      `${missingCardIds.length} PHOTO PENDING; ${unusedImageIds.length} unused; ` +
      `${duplicateImageGroups.length} duplicate groups.`,
  );
  console.log(`Full missing-ID list: ${path.relative(ROOT, REPORT_FILE)}`);
  if (CHECK && failures.length > 0) {
    throw new Error(`Player game-face audit failed:\n- ${failures.join("\n- ")}`);
  }
};

const main = async () => {
  const migration = MIGRATE
    ? await migrateVerifiedFiles()
    : { copied: [] as string[], skipped: [] as string[] };
  if (MIGRATE) await migrateGeneratedMetadata();
  await audit(migration);
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
