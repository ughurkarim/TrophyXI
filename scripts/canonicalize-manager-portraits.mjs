import { access, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const managerDirectory = path.join(repoRoot, "assets", "managers");

/**
 * Keep imported filenames intact and write one stable, ASCII-only PNG per
 * manager identity. Roberto Martinez is intentionally excluded from the
 * conversion pass until the opaque source portrait has been isolated.
 */
const portraits = [
  ["alf-ramsey", "alf-ramsey.png"],
  ["helmut-schon", "Helmut Schön.png"],
  ["mario-zagallo", "zagallo.png"],
  ["enzo-bearzot", "Enzo Bearzot.png"],
  ["ernst-happel", "Ernst Happel.png"],
  ["tele-santana", "Telê Santana.png"],
  ["guus-hiddink", "guus-hiddink-2002.png"],
  ["marcelo-bielsa", "Marcelo Bielsa .png"],
  ["marcello-lippi", "Marcello Lippi.png"],
  ["jurgen-klinsmann", "jurgen-klinsmann-2006.png"],
  ["raymond-domenech", "Raymond Domenech.png"],
  ["jose-pekerman", "José Pékerman.png"],
  ["vicente-del-bosque", "Vicente del Bosque.webp"],
  ["joachim-low", "joachim-low-2014.png"],
  ["louis-van-gaal", "louis-van-gaal-2014.png"],
  ["didier-deschamps", "didier-deschamps-2018.png"],
  ["zlatko-dalic", "zlatko-dalic-2018.png"],
  ["tite", "tite-2022.png"],
  ["lionel-scaloni", "lionel-scaloni-2022.png"],
  ["walid-regragui", "walid-regragui.png"],
  ["jupp-derwall", "Jupp Derwall.png"],
  ["senol-gunes", "Şenol Güneş.webp"],
  ["bert-van-marwijk", "Bert_van_Marwijk.1.webp"],
  ["gareth-southgate", "Gareth Southgate.webp"],
  ["luis-de-la-fuente", "Luis de la Fuente.png"],
  ["carlo-ancelotti", "Carlo_Ancelotti.webp"],
  ["thomas-tuchel", "tuchel.png"],
];

await mkdir(managerDirectory, { recursive: true });

for (const [identityId, sourceFilename] of portraits) {
  const source = path.join(managerDirectory, sourceFilename);
  const output = path.join(managerDirectory, `${identityId}.png`);
  await access(source);

  if (source === output) {
    console.log(`kept ${identityId}.png`);
    continue;
  }

  await sharp(source)
    .ensureAlpha()
    .png({ compressionLevel: 9, palette: false })
    .toFile(output);
  console.log(`wrote ${identityId}.png from ${sourceFilename}`);
}

console.log(
  "pending roberto-martinez.png: isolate Roberto Martínez.jpeg before registering the canonical derivative",
);
