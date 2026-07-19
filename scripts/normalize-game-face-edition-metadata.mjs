import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const files = [
  path.join(ROOT, "scripts", "game-face-import-sources.json"),
  path.join(ROOT, "src", "data", "game-face-manifest.generated.json"),
];

const editionMetadata = {
  "FIFA 14": {
    launchYear: 2013,
    launchLabel: "September 2013 for the 2013–14 season",
  },
  "FIFA 18": {
    launchYear: 2017,
    launchLabel: "2017 for the 2017–18 season",
  },
  "FIFA 23": {
    launchYear: 2022,
    launchLabel: "2022 for the 2022–23 season",
  },
  "EA SPORTS FC 26": {
    launchYear: 2025,
    launchLabel: "2025 for the 2025–26 season",
  },
};

const evidenceFor = (face) => {
  const metadata = editionMetadata[face.gameEdition];
  const identityEvidence = (
    face.exactYearEvidence ??
    face.editionEvidence ??
    ""
  ).split(` ${face.gameEdition} launched in `)[0];
  const identityClause = identityEvidence
    .replace(
      /,\s*representing the (?:June \d{4}|November–December 2022) tournament period;\s*/i,
      "; ",
    )
    .replace(
      /\s*(?:and )?represents the (?:June \d{4}|November–December 2022) tournament period\.?/i,
      ".",
    )
    .replace(
      /,\s*and FC 26 was the current edition available by June 2026\./i,
      ".",
    )
    .trim();
  return `${identityClause} ${face.gameEdition} launched in ${metadata.launchLabel} and is the prescribed game edition for the ${face.tournamentYear} tournament card; this does not claim the underlying face was photographed in ${face.tournamentYear}.`
    .replace(/\.\s*\./g, ".")
    .replace(/\s+/g, " ")
    .trim();
};

for (const file of files) {
  const parsed = JSON.parse(await readFile(file, "utf8"));
  const faces = Array.isArray(parsed) ? parsed : parsed.faces;
  for (const face of faces) {
    const metadata = editionMetadata[face.gameEdition];
    if (!metadata) {
      throw new Error(`${face.id}: unsupported game edition ${face.gameEdition}`);
    }
    face.gameEditionLaunchYear = metadata.launchYear;
    face.matchQuality =
      face.matchQuality === "exact"
        ? "edition-verified"
        : "manually-reviewed-edition";
    face.editionEvidence = evidenceFor(face);
    delete face.exactYearEvidence;
  }
  await writeFile(file, `${JSON.stringify(parsed, null, 2)}\n`);
}

console.log(
  "Normalized game-face launch years and tournament-edition evidence.",
);
