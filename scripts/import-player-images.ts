import { existsSync } from "node:fs";
import {
  mkdir,
  readFile,
  readdir,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import generatedSourcesJson from "./licensed-portrait-sources.generated.json";
import { imageAttributions } from "../src/data/player-images";
import type { ImageAttribution } from "../src/types/game";

type LicensedSource = {
  id: string;
  downloadUrl: string;
  kind?: "player" | "manager";
  maskFile?: string;
  isolatedFile?: string;
};

const ROOT = process.cwd();
const REVIEWED_SOURCE_CONFIG = path.join(
  ROOT,
  "scripts",
  "player-image-sources.json",
);
const MASTER_WIDTH = 700;
const MASTER_HEIGHT = 900;
const portraitZoom: Record<string, { scale: number; y: number }> = {
  "diego-maradona-1986": { scale: 1.35, y: 0.05 },
  "kylian-mbappe-2018": { scale: 1.75, y: 0.02 },
  "luka-modric-2018": { scale: 1.7, y: 0.02 },
  "ivan-perisic-2018": { scale: 4, y: 0.01 },
  "denzel-dumfries-2022": { scale: 2.15, y: 0.02 },
  "romelu-lukaku-2018": { scale: 1.45, y: 0.02 },
  "harry-kane-2018": { scale: 1.25, y: 0.04 },
  "tite-2022": { scale: 1.25, y: 0.04 },
  "kylian-mbappe-2022": { scale: 1.25, y: 0.06 },
  "marcos-acuna-2022": { scale: 1.75, y: 0.02 },
  "ritsu-doan-2022": { scale: 1.45, y: 0.04 },
  "louis-van-gaal-2014": { scale: 1.25, y: 0.04 },
};

const loadLicensedSources = async (): Promise<
  Map<string, LicensedSource>
> => {
  const reviewed = existsSync(REVIEWED_SOURCE_CONFIG)
    ? (JSON.parse(
        await readFile(REVIEWED_SOURCE_CONFIG, "utf8"),
      ) as LicensedSource[])
    : [];
  const generated = (
    generatedSourcesJson as Array<{
      id: string;
      kind: "player" | "manager";
      downloadUrl: string;
    }>
  ).map(({ id, kind, downloadUrl }) => ({ id, kind, downloadUrl }));
  return new Map([...reviewed, ...generated].map((source) => [source.id, source]));
};

const ovalAlphaMask = async () =>
  sharp(
    Buffer.from(`
      <svg width="${MASTER_WIDTH}" height="${MASTER_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="350" cy="450" rx="338" ry="438" fill="white"/>
      </svg>
    `),
  )
    .blur(1.4)
    .png()
    .toBuffer();

const sourcePathFor = (image: ImageAttribution) => {
  if (!image.sourceFile) {
    throw new Error(`${image.id}: licensed portrait requires a local source path`);
  }
  return path.join(ROOT, "public", image.sourceFile);
};

const preserveSource = async (
  image: ImageAttribution,
  source: LicensedSource,
) => {
  const preservedFile = sourcePathFor(image);
  await mkdir(path.dirname(preservedFile), { recursive: true });
  if (!existsSync(preservedFile)) {
    const response = await fetch(source.downloadUrl, {
      headers: {
        "User-Agent":
          "TrophyXI/0.1 (local open-source sports archive; licensed derivative)",
      },
    });
    if (!response.ok) {
      throw new Error(`${image.id}: download failed (${response.status})`);
    }
    await writeFile(
      preservedFile,
      Buffer.from(await response.arrayBuffer()),
    );
  }
  return preservedFile;
};

const cropZoomed = async (
  input: string | Buffer,
  id: string,
  isolated: boolean,
) => {
  const zoom = portraitZoom[id] ?? { scale: 1, y: 0.5 };
  if (zoom.scale === 1) {
    return sharp(input)
      .rotate()
      .resize(MASTER_WIDTH, MASTER_HEIGHT, {
        fit: isolated ? "contain" : "cover",
        position: isolated ? "centre" : sharp.strategy.attention,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .ensureAlpha()
      .png()
      .toBuffer();
  }
  const width = Math.round(MASTER_WIDTH * zoom.scale);
  const height = Math.round(MASTER_HEIGHT * zoom.scale);
  const enlarged = await sharp(input)
    .rotate()
    .resize(width, height, {
      fit: isolated ? "contain" : "cover",
      position: isolated ? "centre" : sharp.strategy.attention,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .ensureAlpha()
    .png()
    .toBuffer();
  return sharp(enlarged)
    .extract({
      left: Math.round((width - MASTER_WIDTH) / 2),
      top: Math.round((height - MASTER_HEIGHT) * zoom.y),
      width: MASTER_WIDTH,
      height: MASTER_HEIGHT,
    })
    .png()
    .toBuffer();
};

const importLicensed = async (
  image: ImageAttribution,
  source: LicensedSource,
  outputFile: string,
) => {
  const preservedFile = await preserveSource(image, source);
  if (source.isolatedFile) {
    const isolatedFile = path.resolve(ROOT, source.isolatedFile);
    if (!existsSync(isolatedFile)) {
      throw new Error(
        `${image.id}: missing reviewed isolated derivative ${isolatedFile}`,
      );
    }
    const trimmed = await sharp(isolatedFile)
      .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    await sharp(await cropZoomed(trimmed, image.id, true))
      .png({ compressionLevel: 9 })
      .toFile(outputFile);
    return;
  }

  if (source.maskFile) {
    const maskFile = path.resolve(ROOT, source.maskFile);
    if (!existsSync(maskFile)) {
      throw new Error(`${image.id}: missing reviewed alpha mask ${maskFile}`);
    }
    const subject = await sharp(preservedFile)
      .rotate()
      .resize(MASTER_WIDTH, MASTER_HEIGHT, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();
    const mask = await sharp(maskFile)
      .resize(MASTER_WIDTH, MASTER_HEIGHT, { fit: "fill" })
      .greyscale()
      .blur(0.35)
      .png()
      .toBuffer();
    await sharp(subject)
      .composite([{ input: mask, blend: "dest-in" }])
      .resize(MASTER_WIDTH, MASTER_HEIGHT, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png({ compressionLevel: 9 })
      .toFile(outputFile);
    return;
  }

  const faceForwardCrop = await cropZoomed(preservedFile, image.id, false);
  await sharp(faceForwardCrop)
    .composite([{ input: await ovalAlphaMask(), blend: "dest-in" }])
    .png({ compressionLevel: 9 })
    .toFile(outputFile);
};

const main = async () => {
  const sources = await loadLicensedSources();
  const ids = new Set<string>();
  for (const image of imageAttributions) {
    if (ids.has(image.id)) {
      throw new Error(`Duplicate image manifest id: ${image.id}`);
    }
    ids.add(image.id);
    if (
      image.fallback ||
      !image.sourcePage ||
      !image.sourceFile ||
      !image.author ||
      !image.license ||
      !image.licenseUrl ||
      !image.changes ||
      !sources.has(image.id)
    ) {
      throw new Error(
        `${image.id}: active portraits require complete licensed-photo metadata`,
      );
    }

    const outputFile = path.join(ROOT, "public", image.file);
    await mkdir(path.dirname(outputFile), { recursive: true });
    await importLicensed(image, sources.get(image.id)!, outputFile);

    const metadata = await sharp(outputFile).metadata();
    if (
      metadata.width !== MASTER_WIDTH ||
      metadata.height !== MASTER_HEIGHT ||
      !metadata.hasAlpha
    ) {
      throw new Error(`${image.id}: expected a transparent 700×900 PNG master`);
    }
  }

  for (const directory of ["players", "managers"]) {
    const outputDirectory = path.join(ROOT, "public", directory, "png");
    if (!existsSync(outputDirectory)) continue;
    for (const file of await readdir(outputDirectory)) {
      if (
        file.endsWith(".png") &&
        !ids.has(file.replace(/\.png$/, ""))
      ) {
        await unlink(path.join(outputDirectory, file));
      }
    }
  }

  console.log(
    `Imported ${imageAttributions.length} licensed transparent portrait masters; zero active illustrations.`,
  );
};

void main();
