import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { imageAttributions } from "../src/data/player-images";

type LicensedSource = {
  id: string;
  downloadUrl: string;
  maskFile?: string;
  isolatedFile?: string;
};

const ROOT = process.cwd();
const SOURCE_CONFIG = path.join(ROOT, "scripts", "player-image-sources.json");
const MASTER_WIDTH = 700;
const MASTER_HEIGHT = 900;

const escapeXml = (value: string) =>
  value.replace(/[<>&'"]/g, (character) => {
    const entities: Record<string, string> = {
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      "'": "&apos;",
      '"': "&quot;",
    };
    return entities[character];
  });

const paletteFor = (value: string) => {
  let hash = 0;
  for (const character of value) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  const palettes = [
    ["#d8b75f", "#591c24", "#f5e7b6"],
    ["#d4a936", "#153962", "#f6e8ba"],
    ["#c9a851", "#28523f", "#f5e6b2"],
    ["#d9bd70", "#512f6f", "#f5e7b6"],
    ["#c9a45d", "#7b2a1c", "#fff0c8"],
  ];
  return palettes[hash % palettes.length];
};

const fallbackSvg = (
  subjectName: string,
  year: number,
  id: string,
  kind: "player" | "manager",
) => {
  const [gold, kit, light] = paletteFor(id);
  const initials = subjectName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toLocaleUpperCase();
  const roleMark = kind === "manager" ? "MGR" : String(year);
  return `
    <svg width="${MASTER_WIDTH}" height="${MASTER_HEIGHT}" viewBox="0 0 700 900" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="kit" x1="0" y1="0" x2="1" y2="1">
          <stop stop-color="${kit}"/>
          <stop offset=".55" stop-color="${kit}"/>
          <stop offset="1" stop-color="#080a09"/>
        </linearGradient>
        <linearGradient id="skin" x1=".2" y1="0" x2=".8" y2="1">
          <stop stop-color="${light}"/>
          <stop offset="1" stop-color="#b68151"/>
        </linearGradient>
      </defs>
      <g>
        <path d="M225 842c8-160 14-253 50-329 22-46 57-73 75-73s53 27 75 73c36 76 42 169 50 329H225Z" fill="url(#kit)" stroke="${gold}" stroke-width="8"/>
        <path d="M286 461c23 39 105 39 128 0l-27-36h-74l-27 36Z" fill="url(#skin)"/>
        <path d="M244 305c0-112 46-188 106-188s106 76 106 188c0 93-42 161-106 161s-106-68-106-161Z" fill="url(#skin)" stroke="${gold}" stroke-width="7"/>
        <path d="M247 279c2-103 45-174 103-174 65 0 103 85 103 174-26-42-54-62-99-66-43-3-75 17-107 66Z" fill="#101311"/>
        <path d="M277 314c17-12 36-13 54-2M369 312c19-10 39-8 55 5" fill="none" stroke="#49352d" stroke-width="8" stroke-linecap="round"/>
        <path d="M329 373c14 8 30 8 43 0" fill="none" stroke="#754b3b" stroke-width="7" stroke-linecap="round"/>
        <path d="M250 550 350 635 450 550M350 635v206" fill="none" stroke="${gold}" stroke-width="9" opacity=".72"/>
        <circle cx="350" cy="662" r="67" fill="#090c0a" stroke="${gold}" stroke-width="7"/>
        <text x="350" y="682" text-anchor="middle" fill="${light}" font-family="Arial, sans-serif" font-size="58" font-weight="800">${escapeXml(initials)}</text>
        <text x="350" y="790" text-anchor="middle" fill="${gold}" font-family="Arial, sans-serif" font-size="28" font-weight="700" letter-spacing="8">${roleMark}</text>
      </g>
    </svg>`;
};

const loadLicensedSources = async (): Promise<Map<string, LicensedSource>> => {
  if (!existsSync(SOURCE_CONFIG)) return new Map();
  const parsed = JSON.parse(await readFile(SOURCE_CONFIG, "utf8")) as LicensedSource[];
  return new Map(parsed.map((source) => [source.id, source]));
};

const importLicensed = async (
  id: string,
  source: LicensedSource,
  outputFile: string,
) => {
  const sourcesDirectory = path.join(ROOT, "public", "players", "sources");
  await mkdir(sourcesDirectory, { recursive: true });
  const preservedFile = path.join(sourcesDirectory, `${id}${path.extname(source.downloadUrl) || ".jpg"}`);
  if (!existsSync(preservedFile)) {
    const response = await fetch(source.downloadUrl);
    if (!response.ok) throw new Error(`${id}: download failed (${response.status})`);
    await writeFile(preservedFile, Buffer.from(await response.arrayBuffer()));
  }
  if (source.isolatedFile) {
    const isolatedFile = path.resolve(ROOT, source.isolatedFile);
    if (!existsSync(isolatedFile)) {
      throw new Error(`${id}: missing reviewed isolated derivative ${isolatedFile}`);
    }
    await sharp(isolatedFile)
      .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .resize(MASTER_WIDTH, MASTER_HEIGHT, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png({ compressionLevel: 9, palette: true })
      .toFile(outputFile);
    return;
  }

  if (!source.maskFile) throw new Error(`${id}: source requires a mask or isolated derivative`);
  const maskFile = path.resolve(ROOT, source.maskFile);
  if (!existsSync(maskFile)) throw new Error(`${id}: missing reviewed alpha mask ${maskFile}`);

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
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize(MASTER_WIDTH, MASTER_HEIGHT, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9, palette: true })
    .toFile(outputFile);
};

const main = async () => {
  const sources = await loadLicensedSources();
  const ids = new Set<string>();
  for (const image of imageAttributions) {
    if (ids.has(image.id)) throw new Error(`Duplicate image manifest id: ${image.id}`);
    ids.add(image.id);
    if (!image.author || !image.license || !image.changes) {
      throw new Error(`${image.id}: incomplete attribution metadata`);
    }
    if (!image.fallback && (!image.sourcePage || !image.licenseUrl || !sources.has(image.id))) {
      throw new Error(`${image.id}: licensed images require page, license, source, and mask`);
    }

    const outputFile = path.join(ROOT, "public", image.file);
    await mkdir(path.dirname(outputFile), { recursive: true });
    const source = sources.get(image.id);
    if (image.fallback) {
      await sharp(
        Buffer.from(
          fallbackSvg(image.subjectName, image.tournamentYear, image.id, image.kind),
        ),
      )
        .png({ compressionLevel: 9, palette: true })
        .toFile(outputFile);
    } else if (source) {
      await importLicensed(image.id, source, outputFile);
    }

    const metadata = await sharp(outputFile).metadata();
    if (
      metadata.width !== MASTER_WIDTH ||
      metadata.height !== MASTER_HEIGHT ||
      !metadata.hasAlpha
    ) {
      throw new Error(`${image.id}: expected a transparent 700×900 PNG master`);
    }
  }

  const licensed = imageAttributions.filter((image) => !image.fallback).length;
  console.log(
    `Imported ${imageAttributions.length} transparent masters (${licensed} licensed, ${imageAttributions.length - licensed} intentional illustrated fallbacks).`,
  );
};

void main();
