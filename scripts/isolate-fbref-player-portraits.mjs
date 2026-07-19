import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const CACHE_DIRECTORY = path.join(
  ROOT,
  "scripts",
  "cache",
  "fbref-portraits",
);
const MANIFEST_FILE = path.join(
  ROOT,
  "src",
  "data",
  "fbref-portrait-manifest.generated.json",
);
const SWIFT_SCRIPT = path.join(
  ROOT,
  "scripts",
  "isolate-manager-portraits.swift",
);

const run = (command, arguments_) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, arguments_, {
      cwd: ROOT,
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });

const sha256 = (value) =>
  createHash("sha256").update(value).digest("hex");

const sourceExtensionFor = (record) => {
  const extension = new URL(record.sourceAssetUrl).pathname
    .split(".")
    .pop()
    ?.toLocaleLowerCase();
  return extension === "png" ? "png" : "jpg";
};

const cleanMaskEdge = async (input) => {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const sourceAlpha = new Uint8Array(info.width * info.height);
  for (let index = 0; index < sourceAlpha.length; index += 1) {
    sourceAlpha[index] = data[index * info.channels + 3];
  }
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const index = y * info.width + x;
      let erodedAlpha = 255;
      for (
        let neighborY = Math.max(0, y - 1);
        neighborY <= Math.min(info.height - 1, y + 1);
        neighborY += 1
      ) {
        for (
          let neighborX = Math.max(0, x - 1);
          neighborX <= Math.min(info.width - 1, x + 1);
          neighborX += 1
        ) {
          erodedAlpha = Math.min(
            erodedAlpha,
            sourceAlpha[neighborY * info.width + neighborX],
          );
        }
      }
      const offset = index * info.channels;
      data[offset + 3] = erodedAlpha;
      if (erodedAlpha === 0) {
        data[offset] = 0;
        data[offset + 1] = 0;
        data[offset + 2] = 0;
      }
    }
  }
  return sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels,
    },
  })
    .png({ compressionLevel: 9 })
    .toBuffer();
};

const temporaryRoot = await mkdtemp(
  path.join(os.tmpdir(), "trophy-xi-fbref-isolation-"),
);
const inputDirectory = path.join(temporaryRoot, "input");
const outputDirectory = path.join(temporaryRoot, "output");

try {
  const manifest = JSON.parse(await readFile(MANIFEST_FILE, "utf8"));
  const firstRecordByFbrefId = new Map();
  for (const record of manifest.portraits) {
    if (!firstRecordByFbrefId.has(record.fbrefId)) {
      firstRecordByFbrefId.set(record.fbrefId, record);
    }
  }

  await mkdir(inputDirectory, { recursive: true });
  await mkdir(outputDirectory, { recursive: true });
  for (const [fbrefId, record] of firstRecordByFbrefId) {
    const sourceFile = path.join(
      CACHE_DIRECTORY,
      `${fbrefId}-source.${sourceExtensionFor(record)}`,
    );
    await sharp(sourceFile)
      .withMetadata()
      .png()
      .toFile(path.join(inputDirectory, `${fbrefId}.png`));
  }

  await run("xcrun", [
    "swift",
    SWIFT_SCRIPT,
    inputDirectory,
    outputDirectory,
  ]);

  const isolatedByFbrefId = new Map();
  for (const fbrefId of firstRecordByFbrefId.keys()) {
    const isolated = await cleanMaskEdge(
      path.join(outputDirectory, `${fbrefId}.png`),
    );
    const metadata = await sharp(isolated).metadata();
    const stats = await sharp(isolated).stats();
    const alpha = stats.channels[3];
    if (
      metadata.format !== "png" ||
      metadata.hasAlpha !== true ||
      !alpha ||
      alpha.min !== 0 ||
      alpha.max !== 255
    ) {
      throw new Error(`${fbrefId}: expected a foreground-only alpha PNG`);
    }
    isolatedByFbrefId.set(fbrefId, isolated);
  }

  for (const record of manifest.portraits) {
    const isolated = isolatedByFbrefId.get(record.fbrefId);
    if (!isolated) {
      throw new Error(`${record.id}: missing isolated FBref source`);
    }
    const output = path.join(ROOT, record.localPath.replace(/^\//, ""));
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(output, isolated);
    record.runtimeSha256 = sha256(isolated);
    record.runtimeByteLength = isolated.byteLength;
    record.changes =
      "Source converted to a local PNG; background removed with a local macOS Vision person mask and a one-pixel fringe cleanup; photograph date not stated by FBref.";
  }

  manifest.generatedAt = new Date().toISOString();
  await writeFile(
    MANIFEST_FILE,
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  console.log(
    `Prepared ${manifest.portraits.length} transparent card portraits from ${firstRecordByFbrefId.size} FBref identity images.`,
  );
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
