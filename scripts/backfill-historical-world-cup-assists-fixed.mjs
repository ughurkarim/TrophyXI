#!/usr/bin/env node
/**
 * Backfill Trophy XI World Cup assists for every historical outfield card (1970–2022).
 *
 * Policy:
 *   1. Weltfussball's tournament assist table is treated as a complete provider table.
 *      A player absent from that year's table therefore receives 0 under that provider's convention.
 *   2. Existing non-null Trophy XI assist values are NEVER overwritten by default. They are usually
 *      FIFA-sourced and may use a different retrospective assist definition.
 *   3. Any disagreement is written to a conflict report.
 *
 * Supports either the generated TypeScript module or the JSON snapshot.
 *
 * Run from the Trophy XI repo root:
 *   node scripts/backfill-historical-world-cup-assists.mjs src/data/historical-world-cup-tournament-stats.by-card.generated.ts
 */

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const INPUT = process.argv[2] ?? "src/data/historical-world-cup-tournament-stats.by-card.generated.ts";
const inputPath = path.resolve(INPUT);
const inputDir = path.dirname(inputPath);
const inputExt = path.extname(inputPath).toLowerCase();
const outputExt = inputExt === ".ts" ? ".ts" : ".json";
const OUTPUT = process.argv[3] ?? path.join(
  inputDir,
  `historical-world-cup-tournament-stats.by-card.with-assists.generated${outputExt}`,
);
const PROVIDER_OUTPUT = path.join(inputDir, "historical-world-cup-assists-1970-2022.weltfussball.generated.json");
const CONFLICT_OUTPUT = path.join(inputDir, "historical-world-cup-assists-1970-2022.conflicts.json");

const pages = {
  1970: "https://www.weltfussball.de/wettbewerb/co139/fifa-wm/se2414/1970-in-mexiko/statistik-assists/",
  1974: "https://www.weltfussball.de/wettbewerb/co139/fifa-wm/se2415/1974-in-deutschland/statistik-assists/",
  1978: "https://www.weltfussball.de/wettbewerb/co139/fifa-wm/se2416/1978-in-argentinien/statistik-assists/",
  1982: "https://www.weltfussball.de/wettbewerb/co139/fifa-wm/se2417/1982-in-spanien/statistik-assists/",
  1986: "https://www.weltfussball.de/wettbewerb/co139/fifa-wm/se2418/1986-in-mexiko/statistik-assists/",
  1990: "https://www.weltfussball.de/wettbewerb/co139/se2419/statistik-assists/",
  1994: "https://www.weltfussball.de/wettbewerb/co139/se2420/statistik-assists/",
  1998: "https://www.weltfussball.de/wettbewerb/co139/se2421/statistik-assists/",
  2002: "https://www.weltfussball.de/wettbewerb/co139/fifa-wm/se2422/2002-in-japan-suedkorea/statistik-assists/",
  2006: "https://www.weltfussball.de/wettbewerb/co139/fifa-wm/se137/2006-in-deutschland/statistik-assists/",
  2010: "https://www.weltfussball.de/wettbewerb/co139/fifa-wm/se1790/2010-in-suedafrika/statistik-assists/",
  2014: "https://www.weltfussball.de/wettbewerb/co139/fifa-wm/se5334/2014-in-brasilien/statistik-assists/",
  2018: "https://www.weltfussball.de/wettbewerb/co139/fifa-wm/se6547/2018-in-russland/statistik-assists/",
  2022: "https://www.weltfussball.de/wettbewerb/co139/fifa-wm/se6548/2022-in-katar/statistik-assists/",
};

const decodeHtml = (value) => value
  .replace(/&nbsp;/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'")
  .replace(/&auml;/g, "ä").replace(/&ouml;/g, "ö").replace(/&uuml;/g, "ü")
  .replace(/&Auml;/g, "Ä").replace(/&Ouml;/g, "Ö").replace(/&Uuml;/g, "Ü")
  .replace(/&szlig;/g, "ß")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));

const stripTags = (html) => decodeHtml(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
const normalize = (value) => value
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[’‘`´]/g, "'")
  .replace(/ß/g, "ss")
  .replace(/[^a-zA-Z0-9]+/g, " ")
  .trim()
  .toLowerCase();

function parseAssistRows(html, year) {
  // Restrict parsing to the page's assist table when possible.
  const assistsHeading = html.search(/>\s*Assists\s*</i);
  const scoped = assistsHeading >= 0 ? html.slice(assistsHeading) : html;
  const tableMatch = scoped.match(/<table\b[\s\S]*?<\/table>/i);
  const tableHtml = tableMatch?.[0] ?? scoped;
  const rows = [...tableHtml.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
  const out = [];

  for (const rowMatch of rows) {
    const row = rowMatch[1];
    const cells = [...row.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => stripTags(m[1]));
    if (cells.length < 3) continue;

    const lastNumeric = [...cells].reverse().find((cell) => /^\d+$/.test(cell));
    if (!lastNumeric) continue;
    const assists = Number(lastNumeric);
    if (!Number.isInteger(assists) || assists < 1 || assists > 20) continue;

    // Prefer an anchor that looks like a person/player link. The provider page normally includes
    // both an abbreviated display name and a full player-name cell.
    const anchors = [...row.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
      .map((m) => ({ href: m[1], text: stripTags(m[2]) }))
      .filter((a) => a.text && !/^\d+$/.test(a.text));

    let player = anchors.find((a) => /spieler|player|personen|person/.test(a.href))?.text;
    if (!player) {
      const candidates = cells.filter((cell) =>
        /[A-Za-zÀ-ž]/.test(cell) &&
        !/^\d+$/.test(cell) &&
        !/^(Name|Spieler|Mannschaft|Spiele|Assists)$/i.test(cell)
      );
      // Full player name is normally the longest human-name-looking cell.
      player = candidates.sort((a, b) => b.length - a.length)[0];
    }
    if (!player) continue;

    out.push({ year, player, assists });
  }

  // Deduplicate exact normalized names, retaining the largest total if markup caused duplicates.
  const deduped = new Map();
  for (const row of out) {
    const key = normalize(row.player);
    const prev = deduped.get(key);
    if (!prev || row.assists > prev.assists) deduped.set(key, row);
  }
  return [...deduped.values()];
}

const stripMarkdown = (value) => value
  .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
  .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
  .replace(/[*_`~]/g, "")
  .replace(/\s+/g, " ")
  .trim();

function parseAssistRowsMarkdown(markdown, year) {
  const headingMatch = markdown.match(/(?:^|\n)#{1,4}\s+Assists\s*(?:\n|$)/i);
  const scoped = headingMatch
    ? markdown.slice((headingMatch.index ?? 0) + headingMatch[0].length)
    : markdown;
  const nextHeading = scoped.search(/\n#{1,4}\s+/);
  const section = nextHeading >= 0 ? scoped.slice(0, nextHeading) : scoped;
  const lines = section.split(/\r?\n/).filter((line) => line.includes("|"));

  let playerIndex = -1;
  let assistsIndex = -1;
  let playerOffsetFromAssists = null;
  const out = [];

  for (const rawLine of lines) {
    const cells = rawLine.split("|").map((cell) => stripMarkdown(cell));

    if (cells.length < 3) continue;

    if (playerIndex < 0 || assistsIndex < 0) {
      const lower = cells.map((cell) => normalize(cell));
      const p = lower.findIndex((cell) => cell === "spieler" || cell === "player");
      const a = lower.findIndex((cell) => cell === "assists" || cell === "assist");
      if (p >= 0 && a >= 0) {
        playerIndex = p;
        assistsIndex = a;
        playerOffsetFromAssists = a - p;
      }
      continue;
    }

    if (cells.every((cell) => /^:?-{3,}:?$/.test(cell) || cell === "")) continue;
    // Some Markdown renderers omit a blank rank cell on tied rows. Anchor the
    // positions from the right so the full-name and assist columns still line up.
    const rowAssistsIndex = cells.length - 1;
    const rowPlayerIndex = playerOffsetFromAssists == null
      ? playerIndex
      : rowAssistsIndex - playerOffsetFromAssists;
    if (rowPlayerIndex < 0 || rowPlayerIndex >= cells.length) continue;

    const player = stripMarkdown(cells[rowPlayerIndex]);
    const assistsCell = cells[rowAssistsIndex].replace(/[^0-9]/g, "");
    const assists = Number(assistsCell);
    if (!player || !Number.isInteger(assists) || assists < 1 || assists > 20) continue;
    if (/^(spieler|player|name)$/i.test(player)) continue;

    out.push({ year, player, assists });
  }

  const deduped = new Map();
  for (const row of out) {
    const key = normalize(row.player);
    const prev = deduped.get(key);
    if (!prev || row.assists > prev.assists) deduped.set(key, row);
  }
  return [...deduped.values()];
}

function jinaReaderUrls(url) {
  const parsed = new URL(url);
  const tail = `${parsed.host}${parsed.pathname}${parsed.search}`;
  return [
    `https://r.jina.ai/https://${tail}`,
    `https://r.jina.ai/http://${tail}`,
  ];
}

async function fetchText(url, headers = {}) {
  const response = await fetch(url, {
    redirect: "follow",
    headers,
  });
  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    text: await response.text(),
  };
}

async function fetchPage(year, url) {
  const browserHeaders = {
    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36",
    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "accept-language": "en-US,en;q=0.9,de;q=0.8",
    "cache-control": "no-cache",
  };

  const direct = await fetchText(url, browserHeaders);
  if (direct.ok) {
    const rows = parseAssistRows(direct.text, year);
    if (rows.length >= 10) return rows;
    console.warn(`${year}: direct page parsed only ${rows.length} rows; trying reader fallback.`);
  } else {
    console.warn(`${year}: direct request returned ${direct.status}; trying reader fallback.`);
  }

  const readerErrors = [];
  for (const readerUrl of jinaReaderUrls(url)) {
    try {
      const reader = await fetchText(readerUrl, {
        "user-agent": browserHeaders["user-agent"],
        "accept": "text/plain,text/markdown;q=0.9,*/*;q=0.8",
      });
      if (!reader.ok) {
        readerErrors.push(`${reader.status} ${reader.statusText} at ${readerUrl}`);
        continue;
      }

      let rows = parseAssistRowsMarkdown(reader.text, year);
      if (rows.length < 10) {
        // Some reader responses preserve HTML instead of Markdown.
        rows = parseAssistRows(reader.text, year);
      }
      if (rows.length >= 10) {
        console.log(`${year}: reader fallback succeeded`);
        return rows;
      }
      readerErrors.push(`parsed only ${rows.length} rows at ${readerUrl}`);
    } catch (error) {
      readerErrors.push(`${error?.message ?? error} at ${readerUrl}`);
    }
  }

  throw new Error(
    `${year}: unable to retrieve a complete assist table. Direct status ${direct.status}. ` +
    `Reader attempts: ${readerErrors.join(" | ")}`
  );
}

function parseByCardSource(sourceText, filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".json") {
    return JSON.parse(sourceText);
  }

  if (ext === ".ts") {
    const match = sourceText.match(
      /export\s+const\s+historicalWorldCupTournamentStatsByCard\s*=\s*([\s\S]*?)\s+as\s+const\s*;?\s*$/,
    );
    if (!match) {
      throw new Error(
        "Could not parse the TypeScript module. Expected `export const historicalWorldCupTournamentStatsByCard = { ... } as const;`",
      );
    }
    return JSON.parse(match[1]);
  }

  throw new Error(`Unsupported input extension: ${ext}. Use .ts or .json.`);
}

function serializeByCard(byCard, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const body = JSON.stringify(byCard, null, 2);
  if (ext === ".ts") {
    return `export const historicalWorldCupTournamentStatsByCard = ${body} as const;\n`;
  }
  return `${body}\n`;
}

const sourceText = await fs.readFile(inputPath, "utf8");
const byCard = parseByCardSource(sourceText, inputPath);
if (!byCard || Array.isArray(byCard) || typeof byCard !== "object") {
  throw new Error("Expected one object keyed by player card id.");
}

const years = Object.keys(pages).map(Number);
const yearSet = new Set(years);
const providerRowsByYear = new Map();

for (const year of years) {
  const rows = await fetchPage(year, pages[year]);
  providerRowsByYear.set(year, rows);
  console.log(`${year}: ${rows.length} players with >=1 assist`);
}

function parseCardId(cardId) {
  const match = cardId.match(/^(.*)-(\d{4})$/);
  if (!match) return null;
  const year = Number(match[2]);
  if (!yearSet.has(year)) return null;
  return {
    year,
    playerKey: normalize(match[1].replace(/-/g, " ")),
  };
}

function isGoalkeeperStats(stats) {
  return (
    Object.prototype.hasOwnProperty.call(stats, "saves") ||
    Object.prototype.hasOwnProperty.call(stats, "cleanSheets") ||
    Object.prototype.hasOwnProperty.call(stats, "goalsConceded") ||
    Object.prototype.hasOwnProperty.call(stats, "penaltiesSaved")
  );
}

const providerRecords = {};
const conflicts = [];
const unresolvedCards = [];
let historicalOutfieldCards = 0;
let existingAssistsKept = 0;
let missingAssistsFilled = 0;
let positiveAssistsFilled = 0;
let zeroAssistsFilled = 0;

for (const [cardId, stats] of Object.entries(byCard)) {
  const parsed = parseCardId(cardId);
  if (!parsed || isGoalkeeperStats(stats) || !("assists" in stats)) continue;

  historicalOutfieldCards += 1;
  const { year, playerKey } = parsed;
  const rows = providerRowsByYear.get(year) ?? [];
  const exact = rows.find((row) => normalize(row.player) === playerKey);

  let providerRow = exact;
  let matchType = exact ? "exact" : null;

  if (!providerRow) {
    const candidates = rows.filter((row) => {
      const providerKey = normalize(row.player);
      return providerKey.includes(playerKey) || playerKey.includes(providerKey);
    });
    if (candidates.length === 1) {
      providerRow = candidates[0];
      matchType = "unique-containment";
    }
  }

  const providerAssists = providerRow?.assists ?? 0;
  const existingAssists = stats.assists ?? null;

  providerRecords[cardId] = {
    tournamentYear: year,
    assists: providerAssists,
    providerPlayer: providerRow?.player ?? null,
    matchType: matchType ?? "absent-from-complete-table",
    source: `weltfussball:${year}`,
  };

  if (existingAssists !== null) {
    existingAssistsKept += 1;
    if (existingAssists !== providerAssists) {
      conflicts.push({
        cardId,
        tournamentYear: year,
        existingAssists,
        providerAssists,
        providerPlayer: providerRow?.player ?? null,
        resolution: "kept-existing",
      });
    }
    continue;
  }

  // A complete assist table lists every player with >=1 assist. Therefore a card
  // absent from that table is safely 0 under this provider's convention.
  stats.assists = providerAssists;
  missingAssistsFilled += 1;
  if (providerAssists > 0) positiveAssistsFilled += 1;
  else zeroAssistsFilled += 1;

  // Keep suspicious fuzzy situations visible instead of silently hiding them.
  if (!providerRow && playerKey.length < 3) {
    unresolvedCards.push({ cardId, tournamentYear: year, reason: "player key too short" });
  }
}

const assistsStillNull = Object.entries(byCard).filter(([cardId, stats]) => {
  const parsed = parseCardId(cardId);
  return parsed && !isGoalkeeperStats(stats) && "assists" in stats && stats.assists == null;
});

if (assistsStillNull.length > 0) {
  throw new Error(`Backfill left ${assistsStillNull.length} historical outfield assist values null.`);
}

const outputPath = path.resolve(OUTPUT);
await fs.writeFile(outputPath, serializeByCard(byCard, outputPath), "utf8");
await fs.writeFile(
  PROVIDER_OUTPUT,
  `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    source: "Weltfussball.de FIFA World Cup tournament assist tables",
    urlsByYear: pages,
    records: providerRecords,
  }, null, 2)}\n`,
  "utf8",
);
await fs.writeFile(
  CONFLICT_OUTPUT,
  `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    policy: "Existing non-null Trophy XI/FIFA assist values win over Weltfussball when definitions disagree.",
    conflicts,
    unresolvedCards,
  }, null, 2)}\n`,
  "utf8",
);

console.log("\nDone.");
console.log(`Historical outfield cards: ${historicalOutfieldCards}`);
console.log(`Existing assists kept: ${existingAssistsKept}`);
console.log(`Missing assists filled: ${missingAssistsFilled}`);
console.log(`  positive values filled: ${positiveAssistsFilled}`);
console.log(`  zeroes filled: ${zeroAssistsFilled}`);
console.log(`Conflicts preserved for review: ${conflicts.length}`);
console.log(`Output: ${outputPath}`);
console.log(`Provider snapshot: ${PROVIDER_OUTPUT}`);
console.log(`Conflict report: ${CONFLICT_OUTPUT}`);
