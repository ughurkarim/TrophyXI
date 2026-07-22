import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const portraits = [
  ["assets/players/1986/andreas-brehme-1986.jpeg", "assets/players/1986/andreas-brehme-1986.png"],
  ["assets/players/1986/preben-elkjær-1986.jpeg", "assets/players/1986/preben-elkj-r-1986.png"],
];

const isLightNeutral = (data, offset) => {
  const red = data[offset];
  const green = data[offset + 1];
  const blue = data[offset + 2];
  return (
    Math.min(red, green, blue) >= 225 &&
    Math.max(red, green, blue) - Math.min(red, green, blue) <= 25
  );
};

for (const [source, output] of portraits) {
  const { data, info } = await sharp(path.join(ROOT, source))
    .rotate()
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixelCount = info.width * info.height;
  const background = new Uint8Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  let head = 0;
  let tail = 0;
  const enqueue = (index) => {
    if (background[index] || !isLightNeutral(data, index * info.channels)) return;
    background[index] = 1;
    queue[tail++] = index;
  };

  for (let x = 0; x < info.width; x += 1) {
    enqueue(x);
    enqueue((info.height - 1) * info.width + x);
  }
  for (let y = 0; y < info.height; y += 1) {
    enqueue(y * info.width);
    enqueue(y * info.width + info.width - 1);
  }
  while (head < tail) {
    const index = queue[head++];
    const x = index % info.width;
    for (const neighbor of [
      index - info.width,
      index + info.width,
      x > 0 ? index - 1 : -1,
      x + 1 < info.width ? index + 1 : -1,
    ]) {
      if (neighbor >= 0 && neighbor < pixelCount) enqueue(neighbor);
    }
  }

  for (let index = 0; index < pixelCount; index += 1) {
    if (background[index]) data[index * info.channels + 3] = 0;
  }
  const outputFile = path.join(ROOT, output);
  await mkdir(path.dirname(outputFile), { recursive: true });
  await sharp(data, {
    raw: { width: info.width, height: info.height, channels: info.channels },
  })
    .png({ compressionLevel: 9 })
    .toFile(outputFile);

  const alpha = (await sharp(outputFile).stats()).channels[3];
  if (!alpha || alpha.min !== 0 || alpha.max !== 255) {
    throw new Error(`${output}: expected transparent and opaque pixels`);
  }
  console.log(`Removed light background: ${source} -> ${output}`);
}
