import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const SWIFT_SCRIPT = path.join(ROOT, "scripts", "isolate-manager-portraits.swift");
const IMPORTED_MANIFEST_FILE = path.join(
  ROOT,
  "src",
  "data",
  "player-identity-portraits.generated.json",
);
const FOREGROUND_ALPHA_THRESHOLD = 8;
const importedMode = process.argv.includes("--imported");

const fixedPortraits = [
  ["assets/players/1978/marco-tardelli-1978.webp", "assets/players/1978/marco-tardelli-1978.png"],
  ["assets/players/1978/zico-1978.jpeg", "assets/players/1978/zico-1978.png"],
  ["assets/players/1982/jean-tigana-1982.jpeg", "assets/players/1982/jean-tigana-1982.png"],
  ["assets/players/1986/gary-lineker-1986.jpeg", "assets/players/1986/gary-lineker-1986.png"],
  ["assets/players/1986/andreas-brehme-1986.jpeg", "assets/players/1986/andreas-brehme-1986.png"],
  ["assets/players/1986/igor-belanov-1986.jpeg", "assets/players/1986/igor-belanov-1986.png"],
  ["assets/players/1986/jorge-burruchaga-1986.jpeg", "assets/players/1986/jorge-burruchaga-1986.png"],
  ["assets/players/1986/jorge-valdano-1986.webp", "assets/players/1986/jorge-valdano-1986.png"],
  ["assets/players/1986/preben-elkjær-1986.jpeg", "assets/players/1986/preben-elkj-r-1986.png"],
  ["assets/managers/Roberto Martínez.jpeg", "assets/managers/roberto-martinez.png"],
];

const importedArchive = importedMode
  ? JSON.parse(await readFile(IMPORTED_MANIFEST_FILE, "utf8"))
  : null;
const portraits = importedMode
  ? importedArchive.importedPortraits.map((record) => {
      const runtimeFile = record.localPath.replace(/^\//, "");
      return [runtimeFile, runtimeFile];
    })
  : fixedPortraits;

const run = (command, arguments_) =>
  new Promise((resolve, reject) => {
    const moduleCache = path.join(os.tmpdir(), "trophyxi-swift-module-cache");
    const child = spawn(command, arguments_, {
      cwd: ROOT,
      stdio: "inherit",
      env: {
        ...process.env,
        CLANG_MODULE_CACHE_PATH: moduleCache,
        SWIFT_MODULECACHE_PATH: moduleCache,
      },
    });
    child.once("error", reject);
    child.once("exit", (code) => {
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
  const alphaAt = (index) => data[index * info.channels + 3];
  let largestSeed = -1;
  let largestSize = 0;

  for (let seed = 0; seed < pixelCount; seed += 1) {
    if (visited[seed] || alphaAt(seed) <= FOREGROUND_ALPHA_THRESHOLD) continue;
    visited[seed] = 1;
    let head = 0;
    let tail = 1;
    queue[0] = seed;
    while (head < tail) {
      const index = queue[head++];
      const x = index % info.width;
      for (const neighbor of [
        index - info.width,
        index + info.width,
        x > 0 ? index - 1 : -1,
        x + 1 < info.width ? index + 1 : -1,
      ]) {
        if (
          neighbor < 0 ||
          neighbor >= pixelCount ||
          visited[neighbor] ||
          alphaAt(neighbor) <= FOREGROUND_ALPHA_THRESHOLD
        ) continue;
        visited[neighbor] = 1;
        queue[tail++] = neighbor;
      }
    }
    if (tail > largestSize) {
      largestSize = tail;
      largestSeed = seed;
    }
  }
  if (largestSeed < 0) throw new Error(`${input}: no connected foreground`);

  const keep = new Uint8Array(pixelCount);
  keep[largestSeed] = 1;
  let head = 0;
  let tail = 1;
  queue[0] = largestSeed;
  while (head < tail) {
    const index = queue[head++];
    const x = index % info.width;
    for (const neighbor of [
      index - info.width,
      index + info.width,
      x > 0 ? index - 1 : -1,
      x + 1 < info.width ? index + 1 : -1,
    ]) {
      if (
        neighbor < 0 ||
        neighbor >= pixelCount ||
        keep[neighbor] ||
        alphaAt(neighbor) <= FOREGROUND_ALPHA_THRESHOLD
      ) continue;
      keep[neighbor] = 1;
      queue[tail++] = neighbor;
    }
  }
  for (let index = 0; index < pixelCount; index += 1) {
    if (!keep[index]) data[index * info.channels + 3] = 0;
  }
  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: info.channels },
  }).png({ compressionLevel: 9 }).toBuffer();
};

if (portraits.length === 0) {
  console.log("No portraits are queued for background isolation.");
} else {
  const temporaryRoot = await mkdtemp(
    path.join(os.tmpdir(), "trophyxi-portraits-"),
  );
  const inputDirectory = path.join(temporaryRoot, "input");
  const maskDirectory = path.join(temporaryRoot, "mask");
  await mkdir(inputDirectory, { recursive: true });
  await mkdir(maskDirectory, { recursive: true });

  for (const [index, [source]] of portraits.entries()) {
    await sharp(path.join(ROOT, source))
      .png()
      .toFile(
        path.join(inputDirectory, `${String(index).padStart(4, "0")}.png`),
      );
  }

  await run("xcrun", ["swift", SWIFT_SCRIPT, inputDirectory, maskDirectory]);

  for (const [index, [source, output]] of portraits.entries()) {
    const isolated = path.join(
      maskDirectory,
      `${String(index).padStart(4, "0")}.png`,
    );
    const outputFile = path.join(ROOT, output);
    await mkdir(path.dirname(outputFile), { recursive: true });
    await sharp(await largestConnectedForeground(isolated)).toFile(outputFile);
    const metadata = await sharp(outputFile).metadata();
    const alpha = (await sharp(outputFile).stats()).channels[3];
    if (!metadata.hasAlpha || !alpha || alpha.min !== 0 || alpha.max !== 255) {
      throw new Error(`${output}: expected both transparent and opaque pixels`);
    }
    console.log(`Isolated ${source} -> ${output}`);
  }
}

if (importedArchive) {
  const cacheVersionById = new Map();
  for (const record of importedArchive.importedPortraits) {
    const runtimeFile = path.join(ROOT, record.localPath.replace(/^\//, ""));
    cacheVersionById.set(
      record.id,
      createHash("sha256")
        .update(await readFile(runtimeFile))
        .digest("hex")
        .slice(0, 16),
    );
  }
  const changes =
    "Preserved the downloaded source, isolated the photographed subject, and exported a transparent local PNG for identity fallback.";
  importedArchive.importedPortraits = importedArchive.importedPortraits.map(
    (record) => ({
      ...record,
      cacheVersion: cacheVersionById.get(record.id) ?? record.cacheVersion,
      changes,
    }),
  );
  importedArchive.identityPortraits = importedArchive.identityPortraits.map(
    (record) => ({
      ...record,
      cacheVersion:
        cacheVersionById.get(record.sourceCardId) ?? record.cacheVersion,
      changes: cacheVersionById.has(record.sourceCardId)
        ? changes
        : record.changes,
    }),
  );
  importedArchive.generatedAt = new Date().toISOString();
  await writeFile(
    IMPORTED_MANIFEST_FILE,
    `${JSON.stringify(importedArchive, null, 2)}\n`,
  );
}
