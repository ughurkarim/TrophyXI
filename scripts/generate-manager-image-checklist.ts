import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { managers } from "../src/data/managers";

const root = process.cwd();
const rows = [...managers]
  .sort(
    (first, second) =>
      second.tournamentYear - first.tournamentYear ||
      first.managerName.localeCompare(second.managerName),
  )
  .map((manager) => {
    const expectedImagePath = `assets/managers/${manager.tournamentYear}/${manager.id}.png`;
    const imagePresent = existsSync(path.join(root, expectedImagePath));
    return {
      managerCardId: manager.id,
      managerIdentityId: manager.managerIdentityId,
      managerName: manager.managerName,
      country: manager.countryName,
      team: manager.teamName,
      tournamentYear: manager.tournamentYear,
      expectedImagePath,
      imagePresent,
      photoStatus: imagePresent ? "available" : "photo-pending",
    };
  });

const columns = [
  "managerCardId",
  "managerIdentityId",
  "managerName",
  "country",
  "team",
  "tournamentYear",
  "expectedImagePath",
  "imagePresent",
  "photoStatus",
] as const;

const csvCell = (value: string | number | boolean) => {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

const csv = [
  columns.join(","),
  ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(",")),
].join("\n");

const markdown = [
  "# Trophy XI manager image checklist",
  "",
  `Generated from the active manager archive: ${rows.length} tournament-manager cards.`,
  "",
  "| Manager card ID | Manager identity ID | Manager | Country | Team | Tournament year | Expected image path | Image present | Photo status |",
  "| --- | --- | --- | --- | --- | ---: | --- | --- | --- |",
  ...rows.map(
    (row) =>
      `| ${row.managerCardId} | ${row.managerIdentityId} | ${row.managerName} | ${row.country} | ${row.team} | ${row.tournamentYear} | \`${row.expectedImagePath}\` | ${row.imagePresent ? "yes" : "no"} | ${row.photoStatus} |`,
  ),
  "",
  "Manager portraits are card-specific. A file for one tournament card must never be reused for another year.",
  "",
].join("\n");

writeFileSync(path.join(root, "manager-image-checklist.csv"), `${csv}\n`);
writeFileSync(path.join(root, "MANAGER_IMAGE_CHECKLIST.md"), markdown);

console.log(
  `Wrote ${rows.length} manager rows (${rows.filter((row) => row.imagePresent).length} images present).`,
);
