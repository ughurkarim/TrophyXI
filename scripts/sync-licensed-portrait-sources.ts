import { writeFile } from "node:fs/promises";
import path from "node:path";
import {
  draftEligibleManagerCardIds,
  draftEligiblePlayerCardIds,
} from "../src/data/archive-eligibility";
import { managersById } from "../src/data/managers";
import { playersById } from "../src/data/players";

type Subject = {
  id: string;
  kind: "player" | "manager";
  subjectName: string;
  tournamentYear: number;
  wikipediaTitle: string;
};

type CommonsSource = {
  id: string;
  kind: "player" | "manager";
  subjectName: string;
  tournamentYear: number;
  fileName: string;
  downloadUrl: string;
  sourcePage: string;
  author: string;
  license: string;
  licenseUrl: string;
  photographedYear: number | null;
  representedTeam: null;
  photoContext: "other-licensed-face";
  cropFocus: { x: number; y: number };
  changes: string;
};

const ROOT = process.cwd();
const OUTPUT = path.join(
  ROOT,
  "scripts",
  "licensed-portrait-sources.generated.json",
);
const existingReviewed = new Set([
  "ivan-perisic-2018",
  "kylian-mbappe-2018",
  "luka-modric-2018",
  "thibaut-courtois-2018",
]);
const titleOverrides: Record<string, string> = {
  "ronaldo-2002": "Ronaldo (Brazilian footballer)",
  "xavi-2010": "Xavi",
  "pele-1970": "Pelé",
  "diego-maradona-1986": "Diego Maradona",
  "ngolo-kante-2018": "N'Golo Kanté",
  "son-heung-min-2022": "Son Heung-min",
  "tite-2022": "Tite (football manager)",
};
const leadFileOverrides: Record<string, string> = {
  "xavi-2010": "Xavi Hernandez.jpg",
};

const plainText = (value: string | undefined) =>
  (value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

const fetchJson = async <T>(url: URL): Promise<T> => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "TrophyXI/0.1 (local open-source sports archive; attribution audit)",
      },
    });
    if (response.ok) return (await response.json()) as T;
    if (response.status === 429 && attempt < 4) {
      await new Promise((resolve) =>
        setTimeout(resolve, 1_500 * (attempt + 1)),
      );
      continue;
    }
    throw new Error(`${url.host}: ${response.status} ${response.statusText}`);
  }
  throw new Error(`${url.host}: retry budget exhausted`);
};

const chunksOf = <T>(values: T[], size: number) =>
  Array.from({ length: Math.ceil(values.length / size) }, (_, index) =>
    values.slice(index * size, (index + 1) * size),
  );

const normalizedTitle = (value: string) =>
  value.replaceAll("_", " ").trim().toLocaleLowerCase();

const freeLeadFilesFor = async (allSubjects: Subject[]) => {
  const files = new Map<string, string>(Object.entries(leadFileOverrides));
  const missing: string[] = [];
  for (const subjects of chunksOf(allSubjects, 35)) {
    const url = new URL("https://en.wikipedia.org/w/api.php");
    url.search = new URLSearchParams({
      action: "query",
      format: "json",
      formatversion: "2",
      redirects: "1",
      prop: "pageimages",
      piprop: "name",
      pilicense: "free",
      titles: subjects.map((subject) => subject.wikipediaTitle).join("|"),
    }).toString();
    const result = await fetchJson<{
      query?: {
        normalized?: Array<{ from: string; to: string }>;
        redirects?: Array<{ from: string; to: string }>;
        pages?: Array<{
          title: string;
          missing?: boolean;
          pageimage?: string;
        }>;
      };
    }>(url);
    const aliases = new Map(
      [
        ...(result.query?.normalized ?? []),
        ...(result.query?.redirects ?? []),
      ].map(({ from, to }) => [normalizedTitle(from), normalizedTitle(to)]),
    );
    const pages = new Map(
      (result.query?.pages ?? []).map((page) => [
        normalizedTitle(page.title),
        page,
      ]),
    );
    for (const subject of subjects) {
      if (leadFileOverrides[subject.id]) continue;
      let key = normalizedTitle(subject.wikipediaTitle);
      for (let step = 0; step < 4 && aliases.has(key); step += 1) {
        key = aliases.get(key)!;
      }
      const page = pages.get(key);
      if (!page || page.missing || !page.pageimage) {
        missing.push(`${subject.id} (${subject.wikipediaTitle})`);
        continue;
      }
      files.set(subject.id, page.pageimage);
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `No freely licensed Wikipedia lead image for: ${missing.join(", ")}`,
    );
  }
  return files;
};

type CommonsInfo = {
  mime?: string;
  url?: string;
  thumburl?: string;
  descriptionurl?: string;
  extmetadata?: Record<string, { value?: string }>;
};

const commonsSourceFromInfo = (
  subject: Subject,
  fileName: string,
  info: CommonsInfo | undefined,
): CommonsSource => {
  const metadata = info?.extmetadata;
  const author = plainText(metadata?.Artist?.value);
  const license = plainText(metadata?.LicenseShortName?.value);
  const declaredLicenseUrl = plainText(metadata?.LicenseUrl?.value);
  const licenseUrl =
    declaredLicenseUrl ||
    (/public domain|\bPD\b/i.test(license)
      ? "https://commons.wikimedia.org/wiki/Commons:Public_domain"
      : "");
  const date =
    plainText(metadata?.DateTimeOriginal?.value) ||
    plainText(metadata?.DateTime?.value);
  const yearMatch = date.match(/\b(19|20)\d{2}\b/);
  if (
    !info ||
    !["image/jpeg", "image/png"].includes(info.mime ?? "") ||
    !info.descriptionurl ||
    !author ||
    !license ||
    !licenseUrl ||
    !/^https?:/.test(licenseUrl)
  ) {
    throw new Error(
      `${subject.id}: Commons image is not a fully attributed reusable photograph`,
    );
  }
  return {
    id: subject.id,
    kind: subject.kind,
    subjectName: subject.subjectName,
    tournamentYear: subject.tournamentYear,
    fileName,
    downloadUrl: info.thumburl ?? info.url!,
    sourcePage: info.descriptionurl,
    author,
    license,
    licenseUrl,
    photographedYear: yearMatch ? Number(yearMatch[0]) : null,
    representedTeam: null,
    photoContext: "other-licensed-face",
    cropFocus: { x: 50, y: 36 },
    changes:
      "Mechanically cropped to a face-forward oval, softly feathered at the alpha edge, and resized to a transparent 700×900 PNG; no generative editing.",
  };
};

const commonsSourcesFor = async (
  allSubjects: Subject[],
  leadFiles: Map<string, string>,
) => {
  const sources: CommonsSource[] = [];
  for (const subjects of chunksOf(allSubjects, 24)) {
    const url = new URL("https://commons.wikimedia.org/w/api.php");
    url.search = new URLSearchParams({
      action: "query",
      format: "json",
      formatversion: "2",
      prop: "imageinfo",
      iiprop: "url|mime|extmetadata",
      iiurlwidth: "1800",
      titles: subjects
        .map((subject) => `File:${leadFiles.get(subject.id)}`)
        .join("|"),
    }).toString();
    const result = await fetchJson<{
      query?: {
        pages?: Array<{
          title: string;
          imageinfo?: CommonsInfo[];
        }>;
      };
    }>(url);
    const pages = new Map(
      (result.query?.pages ?? []).map((page) => [
        normalizedTitle(page.title.replace(/^File:/i, "")),
        page.imageinfo?.[0],
      ]),
    );
    for (const subject of subjects) {
      const fileName = leadFiles.get(subject.id)!;
      const source = commonsSourceFromInfo(
        subject,
        fileName,
        pages.get(normalizedTitle(fileName)),
      );
      sources.push(source);
      console.log(`${subject.id} ← ${fileName} (${source.license})`);
    }
  }
  return sources;
};

const subjects: Subject[] = [
  ...draftEligiblePlayerCardIds
    .filter((id) => !existingReviewed.has(id))
    .map((id) => {
      const player = playersById.get(id);
      if (!player) throw new Error(`Missing active player ${id}`);
      return {
        id,
        kind: "player" as const,
        subjectName: player.playerName,
        tournamentYear: player.tournamentYear,
        wikipediaTitle: titleOverrides[id] ?? player.playerName,
      };
    }),
  ...draftEligibleManagerCardIds.map((id) => {
    const manager = managersById.get(id);
    if (!manager) throw new Error(`Missing active manager ${id}`);
    return {
      id,
      kind: "manager" as const,
      subjectName: manager.managerName,
      tournamentYear: manager.tournamentYear,
      wikipediaTitle: titleOverrides[id] ?? manager.managerName,
    };
  }),
];

const main = async () => {
  const leadFiles = await freeLeadFilesFor(subjects);
  const sources = await commonsSourcesFor(subjects, leadFiles);
  await writeFile(OUTPUT, `${JSON.stringify(sources, null, 2)}\n`, "utf8");
  console.log(`Wrote ${sources.length} reviewed-source candidates to ${OUTPUT}`);
};

void main();
