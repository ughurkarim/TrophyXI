import path from "node:path";
import sharp from "sharp";
import { imageAttributions } from "../src/data/player-images";

const ROOT = process.cwd();
const OUTPUT =
  process.argv[2] ?? path.join("/tmp", "trophy-xi-portrait-contact-sheet.png");
const COLUMNS = 6;
const CELL_WIDTH = 180;
const CELL_HEIGHT = 236;
const imageWidth = 154;
const imageHeight = 194;

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

const main = async () => {
  const rows = Math.ceil(imageAttributions.length / COLUMNS);
  const composites: Array<{ input: Buffer; left: number; top: number }> = [];
  for (const [index, image] of imageAttributions.entries()) {
    const left = (index % COLUMNS) * CELL_WIDTH;
    const top = Math.floor(index / COLUMNS) * CELL_HEIGHT;
    const portrait = await sharp(path.join(ROOT, "public", image.file))
      .resize(imageWidth, imageHeight, {
        fit: "contain",
        background: { r: 8, g: 10, b: 8, alpha: 1 },
      })
      .png()
      .toBuffer();
    const label = await sharp(
      Buffer.from(`
        <svg width="${CELL_WIDTH}" height="38" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#0b0e0c"/>
          <text x="90" y="15" text-anchor="middle" fill="#d9bb65" font-family="Arial" font-size="10">${escapeXml(image.id)}</text>
          <text x="90" y="29" text-anchor="middle" fill="#869087" font-family="Arial" font-size="9">${escapeXml(image.photoContext)}</text>
        </svg>
      `),
    )
      .png()
      .toBuffer();
    composites.push(
      { input: portrait, left: left + 13, top: top + 2 },
      { input: label, left, top: top + 198 },
    );
  }
  await sharp({
    create: {
      width: COLUMNS * CELL_WIDTH,
      height: rows * CELL_HEIGHT,
      channels: 4,
      background: { r: 4, g: 5, b: 4, alpha: 1 },
    },
  })
    .composite(composites)
    .png()
    .toFile(OUTPUT);
  console.log(`Wrote ${imageAttributions.length} portraits to ${OUTPUT}`);
};

void main();
