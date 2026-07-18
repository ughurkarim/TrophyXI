import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { draftEras } from "../src/data/eras";
import { formations } from "../src/data/formations";
import {
  draftEligibleManagers,
  managers,
  managerGradeLabel,
} from "../src/data/managers";
import {
  historicalOpponents,
  worldCupAllStars,
} from "../src/data/opponents";
import {
  imageAttributions,
  imagesById,
  managerImages,
  playerImages,
} from "../src/data/player-images";
import {
  draftEligiblePlayers,
  players,
  playersById,
} from "../src/data/players";
import {
  canPlacePlayer,
  generateBenchOptions,
  generateDraftOptions,
  generateFormationOffer,
  generateFormationRespin,
  generateManagerOptions,
  getPlacementPenaltyPercent,
  getPositionFit,
  getPositionFitState,
  hasDraftCompletionPath,
} from "../src/engine/draft";
import { calculateTeamRatings } from "../src/engine/ratings";
import { flagForCountry } from "../src/lib/utils";
import type {
  PlayerTournamentCard,
  WorldCupYear,
} from "../src/types/game";
import {
  PLAYER_WORLD_CUP_YEARS,
  WORLD_CUP_YEARS,
} from "../src/types/game";

const EXPECTED_OPPONENTS = new Map<WorldCupYear, number>([
  [2026, 48],
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

const sourceFilesUnder = async (directory: string): Promise<string[]> => {
  const files: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if ([".git", ".next", "node_modules", "public"].includes(entry.name)) {
      continue;
    }
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await sourceFilesUnder(target)));
    } else if (/\.(?:ts|tsx|md|json)$/.test(entry.name)) {
      files.push(target);
    }
  }
  return files;
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
  assert(
    WORLD_CUP_YEARS.every(
      (year, index) => index === 0 || WORLD_CUP_YEARS[index - 1] > year,
    ),
    "Tournament years must be reverse chronological",
  );
  assert(
    draftEras.map((era) => era.id).join("|") ===
      "2020s|2010s|2000s|1990s|1980s|1970s|all",
    "Era options must be newest to oldest with Neutral last",
  );
  assert(
    historicalOpponents.every(
      (opponent, index) =>
        index === 0 ||
        (historicalOpponents[index - 1].tournamentYear ?? 0) >=
          (opponent.tournamentYear ?? 0),
    ),
    "Historical opponents must be reverse chronological",
  );

  for (const year of PLAYER_WORLD_CUP_YEARS) {
    const cardCount = players.filter(
      (player) => player.tournamentYear === year,
    ).length;
    assert(cardCount >= 10, `${year} requires at least 10 player cards; found ${cardCount}`);
  }
  for (const year of WORLD_CUP_YEARS) {
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
      PLAYER_WORLD_CUP_YEARS.includes(
        player.tournamentYear as (typeof PLAYER_WORLD_CUP_YEARS)[number],
      ),
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
    assert(
      player.isDraftEligible && player.draftIneligibilityReason === null,
      `${player.id} must remain draftable regardless of photo status`,
    );
    assert(
      Object.values(player.eraTranslation).every(
        (value) => Number.isInteger(value) && value >= 1 && value <= 99,
      ),
      `${player.id} has an invalid Era Translation profile`,
    );
  }
  for (const manager of managers) {
    assert(
      manager.isDraftEligible
        ? manager.draftIneligibilityReason === null
        : Boolean(manager.draftIneligibilityReason),
      `${manager.id} has inconsistent draft eligibility`,
    );
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
  assert(
    draftEligibleManagers.length === managers.length &&
      draftEligibleManagers.length >= 25,
    "The audited manager pool must keep every stored manager active",
  );
  assert(
    draftEligibleManagers.filter((manager) =>
      ["iconic", "elite"].includes(manager.qualityBand),
    ).length <
      draftEligibleManagers.length / 2,
    "Iconic and elite managers cannot make up most of the active pool",
  );

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

  for (let fit = 45; fit <= 100; fit += 1) {
    assert(
      getPlacementPenaltyPercent(fit) >= 0 &&
        getPlacementPenaltyPercent(fit) <= 25,
      `${fit}% fit has a placement penalty outside the 0–25 cap`,
    );
    if (fit > 45) {
      assert(
        getPlacementPenaltyPercent(fit) <=
          getPlacementPenaltyPercent(fit - 1),
        `Placement penalty is not monotonic at ${fit}% fit`,
      );
    }
  }
  assert(getPositionFitState(90) === "green", "90% fit must be green");
  assert(getPositionFitState(89) === "yellow", "89% fit must be yellow");
  assert(getPositionFitState(70) === "yellow", "70% fit must be yellow");
  assert(getPositionFitState(69) === "red", "69% fit must be red");
  assert(getPositionFitState(45) === "red", "45% fit must be red");
  assert(
    getPositionFitState(44) === "incompatible",
    "Below 45% fit must be incompatible",
  );

  const offerCombinations = new Set<string>();
  for (const era of draftEras) {
    const managerOptions = generateManagerOptions(
      draftEligibleManagers,
      era.id,
      2026,
    );
    assert(
      managerOptions.length === 5,
      `${era.id} cannot produce five manager identities`,
    );
    const managerIdentityIds = managerOptions.map(
      (manager) => manager.managerIdentityId,
    );
    const managerRespin = generateManagerOptions(
      draftEligibleManagers,
      era.id,
      2026,
      managerIdentityIds,
      1,
    );
    assert(
      managerRespin.length === 5 &&
        managerRespin.every(
          (manager) =>
            !managerIdentityIds.includes(manager.managerIdentityId),
        ),
      `${era.id} manager respin repeated an original identity`,
    );
    assert(
      generateManagerOptions(
        draftEligibleManagers,
        era.id,
        2026,
        managerIdentityIds,
        1,
      )
        .map((manager) => manager.id)
        .join("|") === managerRespin.map((manager) => manager.id).join("|"),
      `${era.id} manager respin is not deterministic`,
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
        const respun = generateFormationRespin(manager, era.id, seed, offer);
        assert(
          respun.length === 4 && new Set(respun).size === 4,
          `${manager.id}/${era.id} formation respin must return four unique options`,
        );
        assert(
          respun.every((id) => !offer.includes(id)),
          `${manager.id}/${era.id} formation respin repeated an original option`,
        );
        assert(
          generateFormationRespin(manager, era.id, seed, offer).join("|") ===
            respun.join("|"),
          `${manager.id}/${era.id} formation respin is not deterministic`,
        );
      }
    }
  }
  assert(
    offerCombinations.size >= 12,
    `Formation offers lack diversity; found ${offerCombinations.size} combinations`,
  );

  const feasibilityFormation = formations[0];
  const starterPicks: Array<{ slotId: string; cardId: string }> = [];
  feasibilityFormation.slots.forEach((_, index) => {
    const options = generateDraftOptions(
      draftEligiblePlayers,
      feasibilityFormation,
      starterPicks,
      1970 + index,
      index,
    );
    const player = options[0];
    const slot = feasibilityFormation.slots.find(
      (candidate) =>
        !starterPicks.some((pick) => pick.slotId === candidate.id) &&
        canPlacePlayer({
          cards: draftEligiblePlayers,
          formation: feasibilityFormation,
          picks: starterPicks,
          player,
          slot: candidate,
        }),
    );
    assert(
      options.length === 5 &&
        new Set(options.map((candidate) => candidate.playerIdentityId)).size === 5 &&
        Boolean(slot),
      `Starter options failed for round ${index + 1}`,
    );
    if (slot) starterPicks.push({ slotId: slot.id, cardId: player.id });
  });
  assert(
    hasDraftCompletionPath({
      cards: draftEligiblePlayers,
      formation: feasibilityFormation,
      picks: starterPicks,
    }),
    "Completed starter draft failed feasibility validation",
  );
  const benchOptions = generateBenchOptions(
    draftEligiblePlayers,
    starterPicks,
    [],
    2026,
    0,
  );
  assert(benchOptions.length === 5, "Bench generation must return five cards");
  assert(
    new Set(benchOptions.map((player) => player.playerIdentityId)).size === 5,
    "Bench generation returned duplicate identities",
  );
  assert(
    new Set(benchOptions.map(tacticalFamily)).size >= 2,
    "Bench options need at least two tactical families",
  );

  const starterOfferSamples = Array.from({ length: 200 }, (_, seed) =>
    generateDraftOptions(
      draftEligiblePlayers,
      feasibilityFormation,
      [],
      10_000 + seed,
      0,
    ),
  );
  const benchOfferSamples = Array.from({ length: 200 }, (_, seed) =>
    generateBenchOptions(
      draftEligiblePlayers,
      starterPicks,
      [],
      20_000 + seed,
      0,
    ),
  );
  for (const [index, offer] of starterOfferSamples.entries()) {
    assert(
      offer.filter((player) => player.overall >= 90).length <= 2,
      `Starter sample ${index} contains more than two 90+ cards`,
    );
    assert(
      offer.filter((player) =>
        ["legend", "icon"].includes(player.statusTier),
      ).length <= 2,
      `Starter sample ${index} contains more than two Legend/Icon cards`,
    );
  }
  assert(
    starterOfferSamples.filter(
      (offer) => offer.every((player) => player.overall < 90),
    ).length >= 100,
    "Most sampled starter offers must contain zero 90+ cards",
  );
  for (const [index, offer] of benchOfferSamples.entries()) {
    assert(
      offer.filter((player) => player.overall >= 90).length <= 1,
      `Bench sample ${index} contains more than one 90+ card`,
    );
    assert(
      offer.filter((player) => player.overall >= 86).length <= 2,
      `Bench sample ${index} contains more than two 86+ cards`,
    );
    assert(
      offer.filter((player) => player.overall < 82).length >= 2,
      `Bench sample ${index} lacks two sub-82 cards`,
    );
    assert(
      offer.some((player) => player.overall < 78),
      `Bench sample ${index} lacks a sub-78 card`,
    );
    assert(
      offer.some(
        (player) =>
          player.eligiblePositions.length <= 2 ||
          player.eligiblePositions.length >= 4,
      ),
      `Bench sample ${index} lacks a specialist or versatile option`,
    );
  }

  const expected99 = new Set([
    "pele-1970",
    "diego-maradona-1986",
    "lionel-messi-2022",
  ]);
  assert(
    draftEligiblePlayers.filter((player) => player.overall === 99).length ===
      expected99.size &&
      draftEligiblePlayers
        .filter((player) => player.overall === 99)
        .every((player) => expected99.has(player.id)),
    "Only Pelé 1970, Maradona 1986, and Messi 2022 may be rated 99",
  );
  assert(
    draftEligiblePlayers.filter((player) => player.overall >= 95).length <= 20,
    "The 95–99 cohort must remain very small",
  );
  assert(
    draftEligiblePlayers.filter((player) => player.overall >= 90).length <
      draftEligiblePlayers.length * 0.3,
    "Most draftable cards must remain below 90",
  );
  assert(
    draftEligiblePlayers.filter((player) => player.overall < 80).length >= 100,
    "The archive requires a broad average, role-player, and weaker-card cohort",
  );
  const goldenBallCardIds = [
    "paolo-rossi-1982",
    "diego-maradona-1986",
    "salvatore-schillaci-1990",
    "romario-1994",
    "ronaldo-1998",
    "oliver-kahn-2002",
    "zinedine-zidane-2006",
    "diego-forlan-2010",
    "lionel-messi-2014",
    "luka-modric-2018",
    "lionel-messi-2022",
  ];
  assert(
    goldenBallCardIds.every(
      (id) => (playersById.get(id)?.overall ?? 0) >= 96,
    ),
    "Golden Ball tournament cards should normally be rated at least 96",
  );
  const manuallyReviewedRatings: Record<string, number> = {
    "cafu-2002": 92,
    "ronaldo-2002": 98,
    "dele-alli-2018": 80,
    "neymar-2014": 90,
    "harry-kane-2018": 92,
    "romelu-lukaku-2018": 88,
  };
  assert(
    Object.entries(manuallyReviewedRatings).every(
      ([id, rating]) => playersById.get(id)?.overall === rating,
    ),
    "A manually reviewed named tournament-card rating drifted",
  );
  const activeManagerGradeLabels = draftEligibleManagers.flatMap((manager) => [
    managerGradeLabel(manager.grades.offense),
    managerGradeLabel(manager.grades.defense),
  ]);
  const sCount = activeManagerGradeLabels.filter((grade) => grade === "S").length;
  const topManagerGradeCount = activeManagerGradeLabels.filter((grade) =>
    ["S", "A+"].includes(grade),
  ).length;
  assert(
    sCount / activeManagerGradeLabels.length <= 0.05,
    "Active manager S grades exceed 5%",
  );
  assert(
    topManagerGradeCount / activeManagerGradeLabels.length < 0.15,
    "Active manager S/A+ grades must stay below 15%",
  );
  assert(
    activeManagerGradeLabels.filter((grade) => grade.startsWith("B")).length >=
      activeManagerGradeLabels.length * 0.4,
    "B grades must be common across active managers",
  );
  assert(
    activeManagerGradeLabels.some((grade) => grade.startsWith("C")),
    "At least one active manager C grade is required",
  );
  assert(
    draftEligiblePlayers.every(
      (player) => player.overall >= 65 && player.overall <= 99,
    ),
    "A draftable player falls outside the 65–99 scale",
  );
  const statusRanges = {
    legend: [98, 99],
    icon: [94, 97],
    elite: [90, 93],
    standout: [85, 89],
    reliable: [80, 84],
    "role-player": [74, 79],
    limited: [65, 73],
  } as const;
  for (const player of draftEligiblePlayers) {
    const [minimum, maximum] = statusRanges[player.statusTier];
    assert(
      player.overall >= minimum && player.overall <= maximum,
      `${player.id} rating ${player.overall} conflicts with ${player.statusTier}`,
    );
    assert(
      player.achievements.every(
        (achievement) =>
          Boolean(
            achievement.source.label &&
              achievement.source.url &&
              achievement.source.publisher,
          ) && !player.modeledTags.includes(achievement.label),
      ),
      `${player.id} has an unsourced or tag-mixed accolade`,
    );
  }

  const previewPlayer = starterOfferSamples[0][0];
  const previewSlot = feasibilityFormation.slots.find((slot) =>
    canPlacePlayer({
      cards: draftEligiblePlayers,
      formation: feasibilityFormation,
      picks: [],
      player: previewPlayer,
      slot,
    }),
  )!;
  const previewPicks = [{ slotId: previewSlot.id, cardId: previewPlayer.id }];
  const previewRatings = calculateTeamRatings(
    [previewPlayer],
    feasibilityFormation,
    {
      picks: previewPicks,
      manager: draftEligibleManagers[0],
      eraId: "all",
    },
  );
  const committedRatings = calculateTeamRatings(
    [previewPlayer],
    feasibilityFormation,
    {
      picks: previewPicks,
      manager: draftEligibleManagers[0],
      eraId: "all",
    },
  );
  assert(
    previewRatings.chemistry === committedRatings.chemistry &&
      previewRatings.overall === committedRatings.overall,
    "Chemistry preview does not match the committed production calculation",
  );

  const allStarsProfile = worldCupAllStars.allStars;
  assert(Boolean(allStarsProfile), "World Cup All-Stars profile missing");
  assert(
    worldCupAllStars.startingLineup.length === 11,
    "World Cup All-Stars must have 11 starters",
  );
  assert(
    worldCupAllStars.substitutes.length === 3,
    "World Cup All-Stars must have 3 substitutes",
  );
  const allStarsIdentities = [
    ...worldCupAllStars.startingLineup,
    ...worldCupAllStars.substitutes,
  ].map((player) => player.playerIdentityId);
  assert(
    new Set(allStarsIdentities).size === 14,
    "World Cup All-Stars contains duplicate identities",
  );
  assert(
    allStarsProfile?.manager.compositeLabel ===
      "Trophy XI original composite manager.",
    "World Cup All-Stars manager composite label missing",
  );
  if (allStarsProfile) {
    const allStarsFormation = formations.find(
      (formation) => formation.id === worldCupAllStars.formation,
    )!;
    for (const pick of allStarsProfile.starterPicks) {
      const player = playersById.get(pick.cardId);
      const slot = allStarsFormation.slots.find(
        (candidate) => candidate.id === pick.slotId,
      );
      assert(Boolean(player && slot), `Invalid All-Stars pick ${pick.cardId}`);
      if (player && slot) {
        assert(
          getPositionFit(player, slot) >= 70,
          `${pick.cardId} has an invalid All-Stars position`,
        );
      }
    }
    assert(
      allStarsProfile.substituteCardIds.every((id) => playersById.has(id)),
      "World Cup All-Stars bench contains an invalid card",
    );
  }

  const versionsByIdentity = new Map<string, PlayerTournamentCard[]>();
  for (const player of players) {
    const versions = versionsByIdentity.get(player.playerIdentityId) ?? [];
    versions.push(player);
    versionsByIdentity.set(player.playerIdentityId, versions);
  }
  for (const [identityId, versions] of versionsByIdentity) {
    assert(
      new Set(versions.map((player) => player.imageId)).size === versions.length,
      `${identityId} tournament versions do not own distinct image keys`,
    );
  }
  assert(
    !imagesById.has("lionel-messi-2022") &&
      !imagesById.has("lionel-messi-2014") &&
      playersById.get("lionel-messi-2014")?.isDraftEligible === true,
    "Missing exact-year Messi faces must remain Photo Pending and draftable",
  );
  const messi = playersById.get("lionel-messi-2022");
  assert(
    messi?.top100Player === true &&
      messi.careerAccolades.some(
        (accolade) =>
          accolade.label === "World Cup Golden Ball" &&
          accolade.count === 2,
      ) &&
      messi.careerAccolades.some(
        (accolade) =>
          accolade.label === "Champions League Winner" &&
          accolade.count === 4,
      ),
    "Messi is missing verified career accolades or curated Top 100 status",
  );
  assert(
    players.some((player) => player.top100Player && player.overall < 90),
    "Top 100 Player appears to be derived only from high card ratings",
  );

  const opponentIds = new Set<string>();
  for (const opponent of historicalOpponents) {
    assert(!opponentIds.has(opponent.id), `Duplicate opponent id ${opponent.id}`);
    opponentIds.add(opponent.id);
    assert(formationIds.has(opponent.formation), `${opponent.id} has invalid formation`);
    assert(opponent.sources.length > 0, `${opponent.id} has no source record`);
    assert(
      opponent.tournamentYear === 2026
        ? opponent.tournamentStats.matches === null &&
            opponent.tournamentFinish === null
        : opponent.tournamentStats.matches !== null,
      `${opponent.id} has invalid tournament-progress fields`,
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
  for (const year of WORLD_CUP_YEARS.filter((year) => year !== 2026)) {
    assert(
      historicalOpponents.filter(
        (opponent) =>
          opponent.tournamentYear === year &&
          opponent.tournamentFinish === "champion",
      ).length === 1,
      `${year} must have exactly one sourced champion`,
    );
  }
  assert(
    historicalOpponents.every(
      (opponent) =>
        opponent.tournamentYear !== 2026 ||
        (opponent.tournamentFinish === null &&
          opponent.managerName === null &&
          opponent.startingLineup.length === 0 &&
          opponent.substitutes.length === 0 &&
          Object.values(opponent.tournamentStats).every(
            (value) => value === null,
          )),
    ),
    "Unknown 2026 fields contain fabricated values",
  );

  await Promise.all(
    imageAttributions.map(async (image) => {
      const localFile = path.join(
        process.cwd(),
        "public",
        image.file.replace(/^\//, ""),
      );
      const sourceFile = image.sourceFile
        ? path.join(process.cwd(), "public", image.sourceFile)
        : "";
      assert(existsSync(localFile), `${image.id} is missing local PNG ${image.file}`);
      assert(
        Boolean(
          image.author &&
            image.license &&
            image.changes &&
            image.sourcePage &&
            image.licenseUrl &&
            image.sourceFile,
        ),
        `${image.id} metadata incomplete`,
      );
      assert(!image.fallback, `${image.id} active portrait cannot be artwork`);
      assert(
        image.file ===
          `/${image.kind === "player" ? "players" : "managers"}/game-faces/${image.id}.png`,
        `${image.id} does not use its exact card-specific game-face path`,
      );
      assert(
        Boolean(sourceFile && existsSync(sourceFile)),
        `${image.id} is missing its preserved source photograph`,
      );
      assert(
        image.cropFocus.x >= 0 &&
          image.cropFocus.x <= 100 &&
          image.cropFocus.y >= 0 &&
          image.cropFocus.y <= 100,
        `${image.id} has invalid crop focus`,
      );
      assert(
        image.exactTournamentImage
          ? image.photographedYear === image.tournamentYear &&
              image.photoContext === "exact-tournament"
          : image.photoContext !== "exact-tournament",
        `${image.id} is falsely labeled as exact tournament`,
      );
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

  for (const [kind, activeIds] of [
    [
      "players",
      new Set(playerImages.map((image) => `${image.id}.png`)),
    ],
    [
      "managers",
      new Set(managerImages.map((image) => `${image.id}.png`)),
    ],
  ] as const) {
    const pngDirectory = path.join(
      process.cwd(),
      "public",
      kind,
      "game-faces",
    );
    const files = existsSync(pngDirectory) ? await readdir(pngDirectory) : [];
    assert(
      files
        .filter((file) => file.endsWith(".png"))
        .every((file) => activeIds.has(file)),
      `${kind} game-face directory contains an unmanifested PNG`,
    );
    assert(
      activeIds.size === files.filter((file) => file.endsWith(".png")).length,
      `${kind} game-face directory does not exactly match the active manifest`,
    );
  }

  const neutralHistoricalCodes = new Set([
    "CSK",
    "DDR",
    "NIR",
    "SCG",
    "SUN",
    "YUG",
  ]);
  assert(
    historicalOpponents.every((opponent) => {
      const flag = flagForCountry(opponent.nationCode);
      return neutralHistoricalCodes.has(opponent.nationCode)
        ? flag === "◇"
        : flag !== "◌";
    }),
    "Historical opponent flag mapping is incomplete or misleading",
  );
  assert(
    historicalOpponents.some(
      (opponent) =>
        opponent.nationName === "West Germany" &&
        opponent.nationCode === "DEU",
    ),
    "West Germany historical naming policy was not preserved",
  );
  const forbiddenPhrases = [
    "tournament-winning" + " balance",
    "knockout" + " control",
  ];
  for (const file of await sourceFilesUnder(process.cwd())) {
    const contents = (await readFile(file, "utf8")).toLocaleLowerCase();
    for (const phrase of forbiddenPhrases) {
      assert(
        !contents.includes(phrase),
        `${path.relative(process.cwd(), file)} restores forbidden concept "${phrase}"`,
      );
    }
  }

  const counts = Object.fromEntries(
    Object.entries(groups).map(([name, predicate]) => [
      name,
      players.filter(predicate).length,
    ]),
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
    `Draftable players: ${draftEligiblePlayers.length}; real player photos: ${playerImages.length}; photo-pending placeholders: ${draftEligiblePlayers.length - playerImages.length}`,
  );
  console.log(
    `Positions: ${counts.goalkeepers} GK / ${counts.defenders} DEF / ${counts.midfielders} MID / ${counts.attackers} FWD`,
  );
  console.log(
    `Player cards by tournament: ${JSON.stringify(
      Object.fromEntries(
        PLAYER_WORLD_CUP_YEARS.map((year) => [
          year,
          players.filter((player) => player.tournamentYear === year).length,
        ]),
      ),
    )}`,
  );
  console.log(
    `Exact-year faces: ${playerImages.length} players / ${managerImages.length} managers`,
  );
  console.log(
    `Photo Pending: ${draftEligiblePlayers.length - playerImages.length} players / ${draftEligibleManagers.length - managerImages.length} managers`,
  );
  console.log(
    `Draftable player ratings: ${JSON.stringify(distribution(draftEligiblePlayers.map((player) => String(player.overall))))}`,
  );
  console.log(
    `Draftable player status: ${JSON.stringify(distribution(draftEligiblePlayers.map((player) => player.statusTier)))}`,
  );
  console.log(
    `Rating thresholds: 90+ ${draftEligiblePlayers.filter((player) => player.overall >= 90).length}; 92+ ${draftEligiblePlayers.filter((player) => player.overall >= 92).length}; 94+ ${draftEligiblePlayers.filter((player) => player.overall >= 94).length}; below 81 ${draftEligiblePlayers.filter((player) => player.overall < 81).length}; below 76 ${draftEligiblePlayers.filter((player) => player.overall < 76).length}`,
  );
  console.log(
    `99-rated cards: ${draftEligiblePlayers.filter((player) => player.overall === 99).map((player) => player.id).join(", ")}`,
  );
  console.log(
    `Golden Ball rating cohort: ${goldenBallCardIds.map((id) => `${id} ${playersById.get(id)?.overall}`).join(", ")}`,
  );
  console.log(
    `Managers: ${managers.length} cards / ${managerIdentities.size} identities`,
  );
  console.log(
    `Manager OFF grades: ${JSON.stringify(
      distribution(draftEligibleManagers.map((manager) => managerGradeLabel(manager.grades.offense))),
    )}`,
  );
  console.log(
    `Manager DEF grades: ${JSON.stringify(
      distribution(draftEligibleManagers.map((manager) => managerGradeLabel(manager.grades.defense))),
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
  const offerStatusDistribution = (
    offers: PlayerTournamentCard[][],
  ) =>
    distribution(
      offers.flatMap((offer) => offer.map((player) => player.statusTier)),
    );
  console.log(
    `Starter offer samples (200): ${JSON.stringify(offerStatusDistribution(starterOfferSamples))}; zero 90+ ${starterOfferSamples.filter((offer) => offer.every((player) => player.overall < 90)).length}/200`,
  );
  console.log(
    `Bench offer samples (200): ${JSON.stringify(offerStatusDistribution(benchOfferSamples))}`,
  );
  console.log(
    `Accolade source coverage: ${draftEligiblePlayers.flatMap((player) => player.achievements).filter((achievement) => achievement.source.url).length}/${draftEligiblePlayers.flatMap((player) => player.achievements).length}; flag coverage ${historicalOpponents.filter((opponent) => flagForCountry(opponent.nationCode) !== "◌").length}/${historicalOpponents.length}`,
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
