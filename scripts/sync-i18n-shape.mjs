import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const messagesDir = path.join(root, "messages");
const english = JSON.parse(fs.readFileSync(path.join(messagesDir, "en.json"), "utf8"));
const locales = ["es", "pt-BR", "ar", "fr", "ru", "de", "it"];

function mirrorShape(source, localized) {
  const output = {};
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const child = mirrorShape(value, localized?.[key]);
      if (Object.keys(child).length) output[key] = child;
    } else if (typeof localized?.[key] === "string") {
      output[key] = localized[key];
    }
  }
  return output;
}

for (const locale of locales) {
  const file = path.join(messagesDir, `${locale}.json`);
  const localized = JSON.parse(fs.readFileSync(file, "utf8"));
  fs.writeFileSync(file, `${JSON.stringify(mirrorShape(english, localized), null, 2)}\n`);
}
