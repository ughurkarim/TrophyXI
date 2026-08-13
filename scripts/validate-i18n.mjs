import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const localeNames = ["en", "es", "pt-BR", "ar", "fr", "ru", "de", "it"];
const duplicateKeys = new Map();

function findDuplicateKeys(source) {
  let index = 0;
  const duplicates = [];
  const skipWhitespace = () => {
    while (/\s/.test(source[index] ?? "")) index += 1;
  };
  const readString = () => {
    const start = index;
    index += 1;
    while (index < source.length) {
      if (source[index] === "\\") index += 2;
      else if (source[index++] === '"') break;
    }
    return JSON.parse(source.slice(start, index));
  };
  const readValue = (pathParts = []) => {
    skipWhitespace();
    if (source[index] === "{") {
      index += 1;
      const seen = new Set();
      skipWhitespace();
      while (source[index] !== "}" && index < source.length) {
        const key = readString();
        const keyPath = [...pathParts, key].join(".");
        if (seen.has(key)) duplicates.push(keyPath);
        seen.add(key);
        skipWhitespace();
        index += 1; // colon
        readValue([...pathParts, key]);
        skipWhitespace();
        if (source[index] === ",") {
          index += 1;
          skipWhitespace();
        }
      }
      index += 1;
      return;
    }
    if (source[index] === "[") {
      index += 1;
      let item = 0;
      skipWhitespace();
      while (source[index] !== "]" && index < source.length) {
        readValue([...pathParts, String(item++)]);
        skipWhitespace();
        if (source[index] === ",") {
          index += 1;
          skipWhitespace();
        }
      }
      index += 1;
      return;
    }
    if (source[index] === '"') readString();
    else while (index < source.length && !/[\],}]/.test(source[index])) index += 1;
  };
  readValue();
  return duplicates;
}

const read = (locale) => {
  const file = path.join(root, "messages", `${locale}.json`);
  try {
    const source = fs.readFileSync(file, "utf8");
    duplicateKeys.set(locale, findDuplicateKeys(source));
    return JSON.parse(source);
  } catch (error) {
    console.error(`${locale}: invalid JSON (${error.message})`);
    process.exitCode = 1;
    return {};
  }
};
const flatten = (value, prefix = "", result = new Map()) => {
  for (const [key, entry] of Object.entries(value)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (entry && typeof entry === "object" && !Array.isArray(entry)) flatten(entry, next, result);
    else result.set(next, entry);
  }
  return result;
};

const english = flatten(read("en"));
const placeholders = (value) => new Set(
  [...value.matchAll(/\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*(?:,|\})/g)].map((match) => match[1]),
);
const sameSet = (left, right) => left.size === right.size && [...left].every((value) => right.has(value));
let failed = false;
for (const locale of localeNames) {
  const localized = flatten(read(locale));
  const missing = locale === "en" ? [] : [...english.keys()].filter((key) => !localized.has(key));
  const extra = locale === "en" ? [] : [...localized.keys()].filter((key) => !english.has(key));
  const invalid = [...localized].filter(([, value]) => typeof value !== "string");
  const empty = [...localized].filter(([, value]) => typeof value === "string" && !value.trim());
  const placeholderMismatch = locale === "en" ? [] : [...localized].filter(([key, value]) => {
    const source = english.get(key);
    return typeof source === "string" && typeof value === "string" && !sameSet(placeholders(source), placeholders(value));
  });
  const invalidIcu = [...localized].filter(([key, value]) => {
    const source = english.get(key);
    return typeof source === "string" && source.includes(", plural,") && typeof value === "string" && !value.includes(", plural,");
  });
  const duplicates = duplicateKeys.get(locale) ?? [];
  if (missing.length || extra.length || invalid.length || empty.length || placeholderMismatch.length || invalidIcu.length || duplicates.length) failed = true;
  console.log(`${locale}: ${localized.size}/${english.size} keys`);
  if (missing.length) console.error(`  missing (${missing.length}): ${missing.slice(0, 20).join(", ")}${missing.length > 20 ? "…" : ""}`);
  if (extra.length) console.error(`  extra (${extra.length}): ${extra.slice(0, 20).join(", ")}${extra.length > 20 ? "…" : ""}`);
  if (invalid.length) console.error(`  invalid values: ${invalid.map(([key]) => key).join(", ")}`);
  if (empty.length) console.error(`  empty values: ${empty.map(([key]) => key).join(", ")}`);
  if (placeholderMismatch.length) console.error(`  placeholder mismatch (${placeholderMismatch.length}): ${placeholderMismatch.slice(0, 20).map(([key]) => key).join(", ")}${placeholderMismatch.length > 20 ? "…" : ""}`);
  if (invalidIcu.length) console.error(`  invalid ICU plural (${invalidIcu.length}): ${invalidIcu.slice(0, 20).map(([key]) => key).join(", ")}${invalidIcu.length > 20 ? "…" : ""}`);
  if (duplicates.length) console.error(`  duplicate keys (${duplicates.length}): ${duplicates.slice(0, 20).join(", ")}${duplicates.length > 20 ? "…" : ""}`);
}

if (failed) process.exitCode = 1;
else console.log(`All ${localeNames.length} locales contain the same ${english.size} translation keys.`);
