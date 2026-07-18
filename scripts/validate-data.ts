import { existsSync } from "node:fs";
import path from "node:path";
import { spain2010 } from "../src/data/champions";
import { draftEras, isPlayerInDraftEra } from "../src/data/eras";
import { formations } from "../src/data/formations";
import { managers } from "../src/data/managers";
import { imageAttributions } from "../src/data/player-images";
import { players } from "../src/data/players";
import {
  generateDraftOptions,
  generateManagerOptions,
  isEligibleForSlot,
} from "../src/engine/draft";
import type { PlayerTournamentCard } from "../src/types/game";

const failures: string[] = [];
const assert = (condition: boolean, message: string) => {
  if (!condition) failures.push(message);
};

const groups = {
  goalkeepers: (player: PlayerTournamentCard) => player.primaryPosition === "GK",
  defenders: (player: PlayerTournamentCard) =>
    ["LB", "LCB", "CB", "RCB", "RB", "LWB", "RWB"].includes(
      player.primaryPosition,
    ),
  midfielders: (player: PlayerTournamentCard) =>
    ["DM", "CM", "AM", "LM", "RM"].includes(player.primaryPosition),
  attackers: (player: PlayerTournamentCard) =>
    ["LW", "RW", "CF", "ST"].includes(player.primaryPosition),
};

const counts = Object.fromEntries(
  Object.entries(groups).map(([name, predicate]) => [
    name,
    players.filter(predicate).length,
  ]),
);
const identityCount = new Set(players.map((player) => player.playerIdentityId)).size;
const managerIdentityCount = new Set(
  managers.map((manager) => manager.managerIdentityId),
).size;
const opponentIdentityIds = new Set(
  spain2010.lineup.map((player) => player.playerIdentityId),
);

assert(players.length === 240, `Expected 240 player cards, found ${players.length}`);
assert(identityCount >= 160, `Expected ≥160 player identities, found ${identityCount}`);
assert(counts.goalkeepers === 28, `Expected 28 goalkeepers, found ${counts.goalkeepers}`);
assert(counts.defenders === 70, `Expected 70 defenders, found ${counts.defenders}`);
assert(counts.midfielders === 75, `Expected 75 midfielders, found ${counts.midfielders}`);
assert(counts.attackers === 67, `Expected 67 attackers, found ${counts.attackers}`);
assert(managers.length === 28, `Expected 28 manager cards, found ${managers.length}`);
assert(
  managerIdentityCount === 22,
  `Expected 22 manager identities, found ${managerIdentityCount}`,
);

for (const year of [1998, 2002, 2006, 2010, 2014, 2018, 2022]) {
  assert(
    players.some((player) => player.tournamentYear === year),
    `Tournament ${year} is missing`,
  );
}
for (const confederation of ["UEFA", "CONMEBOL", "CONCACAF", "CAF", "AFC", "OFC"]) {
  const count = players.filter(
    (player) => player.confederation === confederation,
  ).length;
  assert(count > 0, `${confederation} has no player coverage`);
  if (confederation === "OFC") {
    assert(count >= 5, `OFC requires meaningful coverage; found ${count}`);
  }
}
for (const band of [
  "iconic",
  "elite",
  "standout",
  "reliable",
  "role-player",
  "limited",
]) {
  assert(
    players.some((player) => player.qualityBand === band),
    `Quality band ${band} is empty`,
  );
}

for (const era of draftEras) {
  const pool = players.filter((player) => isPlayerInDraftEra(player, era.id));
  const managerOptions = generateManagerOptions(managers, era.id, 2026);
  assert(managerOptions.length === 3, `${era.id} cannot produce three managers`);
  const managerRespin = generateManagerOptions(
    managers,
    era.id,
    2026,
    managerOptions.map((manager) => manager.managerIdentityId),
    1,
  );
  assert(managerRespin.length === 3, `${era.id} cannot produce a manager respin`);
  assert(
    managerRespin.every(
      (manager) =>
        !managerOptions.some(
          (original) =>
            original.managerIdentityId === manager.managerIdentityId,
        ),
    ),
    `${era.id} manager respin returned a rejected identity`,
  );
  for (const formation of formations) {
    const draftedIds: string[] = [];
    const draftedIdentities = new Set<string>();
    formation.slots.forEach((slot, index) => {
      try {
        const options = generateDraftOptions(
          pool,
          slot,
          draftedIds,
          1998 + index,
          index,
          { excludedIdentityIds: opponentIdentityIds },
        );
        assert(
          options.length === 3 &&
            options.every((player) => isEligibleForSlot(player, slot)),
          `${era.id}/${formation.id}/${slot.id} returned invalid options`,
        );
        const selected = options.find(
          (option) => !draftedIdentities.has(option.playerIdentityId),
        );
        if (!selected) {
          failures.push(`${era.id}/${formation.id}/${slot.id} identity dead end`);
          return;
        }
        draftedIds.push(selected.id);
        draftedIdentities.add(selected.playerIdentityId);
      } catch (error) {
        failures.push(
          `${era.id}/${formation.id}/${slot.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    });
  }
}

const imageIds = new Set(imageAttributions.map((image) => image.id));
assert(
  imageIds.size === imageAttributions.length,
  "Image attribution ids must be unique",
);
for (const player of players) {
  assert(imageIds.has(player.imageId), `${player.id} is missing image metadata`);
}
for (const manager of managers) {
  assert(imageIds.has(manager.imageId), `${manager.id} is missing image metadata`);
}
for (const image of imageAttributions) {
  assert(
    existsSync(path.join(process.cwd(), "public", image.file)),
    `${image.id} is missing local PNG ${image.file}`,
  );
  assert(Boolean(image.author && image.license && image.changes), `${image.id} metadata incomplete`);
  if (!image.fallback) {
    assert(
      Boolean(image.sourcePage && image.licenseUrl && image.sourceFile),
      `${image.id} licensed source metadata incomplete`,
    );
    if (image.sourceFile) {
      assert(
        existsSync(path.join(process.cwd(), "public", image.sourceFile)),
        `${image.id} preserved source file is missing`,
      );
    }
  }
}

const licensed = imageAttributions.filter((image) => !image.fallback).length;
const fallback = imageAttributions.length - licensed;
const sourcedStatLines = players.filter((player) =>
  Object.values(player.tournamentStats).some((value) => value !== null),
).length;
const sourcedAchievements = players.reduce(
  (sum, player) => sum + player.achievements.length,
  0,
);
console.log("Trophy XI data report");
console.log(`Players: ${players.length} cards / ${identityCount} identities`);
console.log(
  `Positions: ${counts.goalkeepers} GK / ${counts.defenders} DEF / ${counts.midfielders} MID / ${counts.attackers} FWD`,
);
console.log(`Managers: ${managers.length} cards / ${managerIdentityCount} identities`);
console.log(`Images: ${licensed} licensed / ${fallback} illustrated fallback`);
console.log(
  `Evidence: ${sourcedStatLines} sourced stat lines / ${sourcedAchievements} sourced achievements`,
);
console.log(
  `OFC cards: ${players.filter((player) => player.confederation === "OFC").length}`,
);

if (failures.length > 0) {
  console.error(`\n${failures.length} validation error(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log("All schema, coverage, feasibility, identity, image, and attribution checks passed.");
}
