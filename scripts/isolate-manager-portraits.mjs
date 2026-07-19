import { spawn } from "node:child_process";
import { mkdir, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const SOURCE_DIRECTORY = path.join(ROOT, "public", "managers", "sources");
const OUTPUT_DIRECTORY = path.join(ROOT, "public", "managers", "png");
const INTERMEDIATE_DIRECTORY = path.join(
  os.tmpdir(),
  "manager-portrait-isolation",
);
const SWIFT_SCRIPT = path.join(
  ROOT,
  "scripts",
  "isolate-manager-portraits.swift",
);
const MASTER_WIDTH = 700;
const MASTER_HEIGHT = 900;
const FOREGROUND_ALPHA_THRESHOLD = 8;

const run = (command, arguments_) =>
  new Promise((resolve, reject) => {
    const process = spawn(command, arguments_, {
      cwd: ROOT,
      stdio: "inherit",
    });
    process.once("error", reject);
    process.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });

const largestConnectedForeground = async (input) => {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixelCount = info.width * info.height;
  const visited = new Uint8Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  let largestSeed = -1;
  let largestSize = 0;

  const alphaAt = (index) => data[index * info.channels + 3];
  for (let seed = 0; seed < pixelCount; seed += 1) {
    if (
      visited[seed] ||
      alphaAt(seed) <= FOREGROUND_ALPHA_THRESHOLD
    ) {
      continue;
    }
    visited[seed] = 1;
    let head = 0;
    let tail = 1;
    queue[0] = seed;
    while (head < tail) {
      const index = queue[head++];
      const x = index % info.width;
      const neighbors = [
        index - info.width,
        index + info.width,
        x > 0 ? index - 1 : -1,
        x + 1 < info.width ? index + 1 : -1,
      ];
      for (const neighbor of neighbors) {
        if (
          neighbor < 0 ||
          neighbor >= pixelCount ||
          visited[neighbor] ||
          alphaAt(neighbor) <= FOREGROUND_ALPHA_THRESHOLD
        ) {
          continue;
        }
        visited[neighbor] = 1;
        queue[tail++] = neighbor;
      }
    }
    if (tail > largestSize) {
      largestSize = tail;
      largestSeed = seed;
    }
  }
  if (largestSeed < 0) {
    throw new Error(`${input}: person mask has no connected foreground`);
  }

  const keep = new Uint8Array(pixelCount);
  keep[largestSeed] = 1;
  let head = 0;
  let tail = 1;
  queue[0] = largestSeed;
  while (head < tail) {
    const index = queue[head++];
    const x = index % info.width;
    const neighbors = [
      index - info.width,
      index + info.width,
      x > 0 ? index - 1 : -1,
      x + 1 < info.width ? index + 1 : -1,
    ];
    for (const neighbor of neighbors) {
      if (
        neighbor < 0 ||
        neighbor >= pixelCount ||
        keep[neighbor] ||
        alphaAt(neighbor) <= FOREGROUND_ALPHA_THRESHOLD
      ) {
        continue;
      }
      keep[neighbor] = 1;
      queue[tail++] = neighbor;
    }
  }
  for (let index = 0; index < pixelCount; index += 1) {
    if (!keep[index]) data[index * info.channels + 3] = 0;
  }
  return sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels,
    },
  })
    .png()
    .toBuffer();
};

await mkdir(INTERMEDIATE_DIRECTORY, { recursive: true });
await mkdir(OUTPUT_DIRECTORY, { recursive: true });
await run("xcrun", [
  "swift",
  SWIFT_SCRIPT,
  SOURCE_DIRECTORY,
  INTERMEDIATE_DIRECTORY,
]);

const isolatedFiles = (await readdir(INTERMEDIATE_DIRECTORY))
  .filter((file) => file.endsWith(".png"))
  .sort();
for (const file of isolatedFiles) {
  const input = path.join(INTERMEDIATE_DIRECTORY, file);
  const output = path.join(OUTPUT_DIRECTORY, file);
  const connectedForeground = await largestConnectedForeground(input);
  const trimmed = await sharp(connectedForeground)
    .trim({
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      threshold: 4,
    })
    .png()
    .toBuffer();
  await sharp(trimmed)
    .resize(MASTER_WIDTH, MASTER_HEIGHT, {
      fit: "contain",
      position: "centre",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      withoutEnlargement: false,
    })
    .png({ compressionLevel: 9 })
    .toFile(output);
  const metadata = await sharp(output).metadata();
  const stats = await sharp(output).stats();
  const alpha = stats.channels[3];
  if (
    metadata.width !== MASTER_WIDTH ||
    metadata.height !== MASTER_HEIGHT ||
    metadata.hasAlpha !== true ||
    !alpha ||
    alpha.min !== 0 ||
    alpha.max !== 255
  ) {
    throw new Error(`${file}: expected a foreground-only 700×900 alpha PNG`);
  }
  console.log(`Prepared ${path.relative(ROOT, output)}`);
}
