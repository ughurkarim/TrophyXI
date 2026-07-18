import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { draftEras } from "../src/data/eras";
import { formations } from "../src/data/formations";
import { managers, managerGradeLabel } from "../src/data/managers";
import { historicalOpponents } from "../src/data/opponents/generated";
import { imageAttributions } from "../src/data/player-images";
import { players } from "../src/data/players";
import {
  generateBenchOptions,
  generateDraftOptions,
  generateFormationOffer,
  generateManagerOptions,
  isEligibleForSlot,
} from "../src/engine/draft";
import type {
  PlayerTournamentCard,
  WorldCupYear,
} from "../src/types/game";
import { WORLD_CUP_YEARS } from "../src/types/game";

const EXPECTED_OPPONENTS = new Map<WorldCupYear, number>([
  [1970, 16],
  [1974, 16],
  [1978, 16],
  [1982, 24],
  [1986, 24],
  [1990, 24],
  [1994, 24],
  [1998, 32],
  [2002, 32],
  [2006, 32],
  [2010, 32],
  [2014, 32],
  [2018, 32],
  [2022, 32],
]);

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

const distribution = (values: string[]) =>
  Object.fromEntries(
    [...new Set(values)]
      .sort()
      .map((value) => [
        value,
        values.filter((candidate) => candidate === value).length,
      ]),
  );

const tacticalFamily = (player: PlayerTournamentCard) => {
  if (player.primaryPosition === "GK") return "goalkeeper";
  if (
    ["LB", "LCB", "CB", "RCB", "RB", "LWB", "RWB", "DM"].includes(
      player.primaryPosition,
    )
  ) {
    return "defensive";
  }
  if (["CM", "AM", "LM", "RM"].includes(player.primaryPosition)) {
    return "midfield";
  }
  return "attacking";
};

const main = async () => {
  const playerIds = new Set(players.map((player) => player.id));
  const playerIdentities = new Set(
    players.map((player) => player.playerIdentityId),
  );
  const managerIdentities = new Set(
    managers.map((manager) => manager.managerIdentityId),
  );
  const formationIds = new Set(formations.map((formation) => formation.id));
  const imageIds = new Set(imageAttributions.map((image) => image.id));

  assert(playerIds.size === players.length, "Player card ids must be unique");
  assert(
    imageIds.size === imageAttributions.length,
    "Image attribution ids must be unique",
  );
  assert(formations.length >= 12, `Expected at least 12 formations, found ${formations.length}`);
  assert(managers.length > 0, "Manager archive is empty");

  for (const year of WORLD_CUP_YEARS) {
    const cardCount = players.filter(
      (player) => player.tournamentYear === year,
    ).length;
    assert(cardCount >= 10, `${year} requires at least 10 player cards; found ${cardCount}`);
    const opponentCount = historicalOpponents.filter(
      (opponent) => opponent.tournamentYear === year,
    ).length;
    assert(
      opponentCount === EXPECTED_OPPONENTS.get(year),
      `${year}: expected ${EXPECTED_OPPONENTS.get(year)} historical opponents, found ${opponentCount}`,
    );
  }
  assert(
    players.every((player) =>
      WORLD_CUP_YEARS.includes(player.tournamentYear as WorldCupYear),
    ),
    "Unsupported tournament year found in player archive",
  );

  for (const confederation of [
    "UEFA",
    "CONMEBOL",
    "CONCACAF",
    "CAF",
    "AFC",
    "OFC",
  ]) {
    assert(
      players.some((player) => player.confederation === confederation),
      `${confederation} has no player coverage`,
    );
  }

  for (const player of players) {
    assert(imageIds.has(player.imageId), `${player.id} is missing image metadata`);
    assert(
      Object.values(player.eraTranslation).every(
        (value) => Number.isInteger(value) && value >= 1 && value <= 99,
      ),
      `${player.id} has an invalid Era Translation profile`,
    );
  }
  for (const manager of managers) {
    assert(imageIds.has(manager.imageId), `${manager.id} is missing image metadata`);
    assert(
      manager.grades.offense >= 0 &&
        manager.grades.offense <= 100 &&
        manager.grades.defense >= 0 &&
        manager.grades.defense <= 100,
      `${manager.id} has an invalid OFF/DEF grade`,
    );
    assert(
      manager.preferredFormations.every((id) => formationIds.has(id)),
      `${manager.id} has an invalid preferred formation`,
    );
    assert(
      manager.acceptableFormations.every((id) => formationIds.has(id)),
      `${manager.id} has an invalid acceptable formation`,
    );
  }

  for (const formation of formations) {
    assert(formation.slots.length === 11, `${formation.id} must have 11 slots`);
    assert(
      new Set(formation.slots.map((slot) => slot.id)).size === 11,
      `${formation.id} has duplicate slot ids`,
    );
    for (const slot of formation.slots) {
      assert(
        slot.x >= 0 && slot.x <= 100 && slot.y >= 0 && slot.y <= 100,
        `${formation.id}/${slot.id} has invalid coordinates`,
      );
      assert(
        slot.accepts.length > 0,
        `${formation.id}/${slot.id} has no accepted positions`,
      );
    }
  }

  const offerCombinations = new Set<string>();
  for (const era of draftEras) {
    const managerOptions = generateManagerOptions(managers, era.id, 2026);
    assert(
      managerOptions.length === 3,
      `${era.id} cannot produce three manager identities`,
    );
    for (const manager of managers) {
      for (const seed of [1970, 2026, 4404]) {
        const offer = generateFormationOffer(manager, era.id, seed);
        offerCombinations.add(offer.join("|"));
        assert(offer.length === 4, `${manager.id}/${era.id} must offer four formations`);
        assert(new Set(offer).size === 4, `${manager.id}/${era.id} repeats a formation`);
        assert(
          offer.some((id) => manager.preferredFormations.includes(id)),
          `${manager.id}/${era.id} lacks a preferred formation`,
        );
      }
    }
  }
  assert(
    offerCombinations.size >= 12,
    `Formation offers lack diversity; found ${offerCombinations.size} combinations`,
  );

  const feasibilityFormation = formations[0];
  const draftedIds: string[] = [];
  const starterPicks: Array<{ slotId: string; cardId: string }> = [];
  feasibilityFormation.slots.forEach((slot, index) => {
    const options = generateDraftOptions(
      players,
      slot,
      draftedIds,
      1970 + index,
      index,
    );
    assert(
      options.length === 3 &&
        new Set(options.map((player) => player.playerIdentityId)).size === 3 &&
        options.every((player) => isEligibleForSlot(player, slot)),
      `Starter options failed for ${slot.id}`,
    );
    draftedIds.push(options[0].id);
    starterPicks.push({ slotId: slot.id, cardId: options[0].id });
  });
  const benchOptions = generateBenchOptions(
    players,
    starterPicks,
    [],
    2026,
    0,
  );
  assert(benchOptions.length === 3, "Bench generation must return three cards");
  assert(
    new Set(benchOptions.map((player) => player.playerIdentityId)).size === 3,
    "Bench generation returned duplicate identities",
  );
  assert(
    new Set(benchOptions.map(tacticalFamily)).size >= 2,
    "Bench options need at least two tactical families",
  );

  const opponentIds = new Set<string>();
  for (const opponent of historicalOpponents) {
    assert(!opponentIds.has(opponent.id), `Duplicate opponent id ${opponent.id}`);
    opponentIds.add(opponent.id);
    assert(formationIds.has(opponent.formation), `${opponent.id} has invalid formation`);
    assert(opponent.sources.length > 0, `${opponent.id} has no source record`);
    assert(
      opponent.tournamentStats.matches !== null,
      `${opponent.id} is missing its sourced match count`,
    );
    assert(
      opponent.startingLineup.length === 0 ||
        opponent.startingLineup.every((player) =>
          playerIdentities.has(player.playerIdentityId),
        ),
      `${opponent.id} has an invalid starting-lineup identity`,
    );
    assert(
      opponent.substitutes.length === 0 ||
        opponent.substitutes.every((player) =>
          playerIdentities.has(player.playerIdentityId),
        ),
      `${opponent.id} has an invalid substitute identity`,
    );
  }

  await Promise.all(
    imageAttributions.map(async (image) => {
      const localFile = path.join(
        process.cwd(),
        "public",
        image.file.replace(/^\//, ""),
      );
      assert(existsSync(localFile), `${image.id} is missing local PNG ${image.file}`);
      assert(
        Boolean(image.author && image.license && image.changes),
        `${image.id} metadata incomplete`,
      );
      assert(
        image.cropFocus.x >= 0 &&
          image.cropFocus.x <= 100 &&
          image.cropFocus.y >= 0 &&
          image.cropFocus.y <= 100,
        `${image.id} has invalid crop focus`,
      );
      if (!image.fallback) {
        assert(
          Boolean(image.sourcePage && image.licenseUrl && image.sourceFile),
          `${image.id} licensed source metadata incomplete`,
        );
        assert(
          image.exactTournamentImage
            ? image.photographedYear === image.tournamentYear
            : true,
          `${image.id} is falsely labeled as exact tournament`,
        );
      }
      if (!existsSync(localFile)) return;
      const metadata = await sharp(localFile).metadata();
      const stats = await sharp(localFile).stats();
      const alpha = stats.channels[3];
      assert(
        metadata.format === "png" && metadata.hasAlpha === true,
        `${image.id} must be a transparent PNG`,
      );
      assert(
        Boolean(alpha && alpha.min < 255),
        `${image.id} has no transparent background pixels`,
      );
    }),
  );

  const counts = Object.fromEntries(
    Object.entries(groups).map(([name, predicate]) => [
      name,
      players.filter(predicate).length,
    ]),
  );
  const licensed = imageAttributions.filter((image) => !image.fallback);
  const exact = licensed.filter((image) => image.exactTournamentImage);
  const nationalKit = licensed.filter((image) => image.isNationalTeamKit);
  const nearby = licensed.filter(
    (image) =>
      image.isNationalTeamKit &&
      !image.exactTournamentImage &&
      image.photographedYear !== null,
  );
  const missingOpponentManagers = historicalOpponents.filter(
    (opponent) => opponent.managerName === null,
  ).length;
  const missingOpponentLineups = historicalOpponents.filter(
    (opponent) => opponent.startingLineup.length === 0,
  ).length;

  console.log("Trophy XI data report");
  console.log(`Players: ${players.length} cards / ${playerIdentities.size} identities`);
  console.log(
    `Positions: ${counts.goalkeepers} GK / ${counts.defenders} DEF / ${counts.midfielders} MID / ${counts.attackers} FWD`,
  );
  console.log(
    `Player cards by tournament: ${JSON.stringify(
      Object.fromEntries(
        WORLD_CUP_YEARS.map((year) => [
          year,
          players.filter((player) => player.tournamentYear === year).length,
        ]),
      ),
    )}`,
  );
  console.log(
    `Images: ${licensed.length} real photos / ${nationalKit.length} national-team kit / ${exact.length} exact tournament / ${nearby.length} nearby-year / ${imageAttributions.length - licensed.length} fallback`,
  );
  console.log(
    `Managers: ${managers.length} cards / ${managerIdentities.size} identities`,
  );
  console.log(
    `Manager OFF grades: ${JSON.stringify(
      distribution(managers.map((manager) => managerGradeLabel(manager.grades.offense))),
    )}`,
  );
  console.log(
    `Manager DEF grades: ${JSON.stringify(
      distribution(managers.map((manager) => managerGradeLabel(manager.grades.defense))),
    )}`,
  );
  console.log(
    `Era legacies: ${JSON.stringify(
      distribution(players.map((player) => player.eraLegacy)),
    )} / timeless ${players.filter((player) => player.eraLegacy === "timeless").length}`,
  );
  console.log(
    `Formations: ${formations.length} / seeded offer combinations sampled: ${offerCombinations.size}`,
  );
  console.log(
    `Historical opponents by tournament: ${JSON.stringify(
      Object.fromEntries(
        WORLD_CUP_YEARS.map((year) => [
          year,
          historicalOpponents.filter(
            (opponent) => opponent.tournamentYear === year,
          ).length,
        ]),
      ),
    )}`,
  );
  console.log(
    `Historical opponents: ${historicalOpponents.length}; source coverage ${historicalOpponents.filter((opponent) => opponent.sources.length > 0).length}/${historicalOpponents.length}; missing manager ${missingOpponentManagers}; missing sourced lineup ${missingOpponentLineups}`,
  );
  console.log(
    `Bench option families sampled: ${[...new Set(benchOptions.map(tacticalFamily))].join(", ")}`,
  );

  if (failures.length > 0) {
    console.error(`\n${failures.length} validation error(s):`);
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exitCode = 1;
  } else {
    console.log(
      "All archive, identity, formation, opponent, image, translation, manager-grade, and draft-feasibility checks passed.",
    );
  }
};

void main();
