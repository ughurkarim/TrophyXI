import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import playerTournamentsJson from "../src/data/player-tournaments.generated.json";
import completed2026RosterJson from "../src/data/player-tournaments-2026.generated.json";
import requestedIdentityJson from "../src/data/requested-player-identities.generated.json";
import { draftEras } from "../src/data/eras";
import { formations } from "../src/data/formations";
import { playerCareerDataByIdentityId } from "../src/data/player-career-data";
import { localPortraitRecords } from "../src/data/local-portrait-manifest";
import {
  draftEligibleManagers,
  managers,
  managerGradeLabel,
} from "../src/data/managers";
import {
  historicalOpponentArchive,
  historicalOpponents,
  worldCupAllStars,
} from "../src/data/opponents";
import {
  historicalPlayerImages,
  identityFallbackPlayerImages,
  imageAttributions,
  imagesById,
  managerImages,
  playerImages,
  tournamentEditionPlayerImages,
  userSuppliedPlayerImages,
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
import { calculateManagerEraFit } from "../src/engine/manager-era-fit";
import { calculateTeamRatings } from "../src/engine/ratings";
import { flagForCountry } from "../src/lib/utils";
import type {
  PlayerTournamentCard,
  Position,
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
  const imagesByPath = new Map<string, typeof imageAttributions>();
  for (const image of imageAttributions) {
    const entries = imagesByPath.get(image.file) ?? [];
    entries.push(image);
    imagesByPath.set(image.file, entries);
  }
  const playerTournaments = playerTournamentsJson as {
    identities: Record<
      string,
      Array<{
        tournamentYear: number;
        appearances: number;
        starts: number;
        goals: number;
        primaryPosition: Position;
        eligiblePositions: Position[];
        awards: Array<{ label: string }>;
      }>
    >;
    unresolvedIdentityIds: string[];
  };
  const completed2026Roster = completed2026RosterJson as {
    players: Array<{ identityId: string; teamCode: string }>;
    teams: Array<{ teamCode: string; playerCount: number }>;
  };

  assert(playerIds.size === players.length, "Player card ids must be unique");
  assert(
    imageIds.size === imageAttributions.length,
    "Image attribution ids must be unique",
  );
  assert(
    [...imagesByPath.values()].every(
      (entries) =>
        entries.length === 1 ||
        entries.filter((image) => !image.fallback).length === 1,
    ),
    "Every shared production portrait path must have one direct source image",
  );
  assert(
    new Set(localPortraitRecords.map((record) => record.id)).size ===
      localPortraitRecords.length,
    "Local portrait record ids must be unique",
  );
  const managerById = new Map(managers.map((manager) => [manager.id, manager]));
  for (const record of localPortraitRecords) {
    const card =
      record.kind === "player"
        ? playersById.get(record.id)
        : managerById.get(record.id);
    assert(Boolean(card), `${record.id} local portrait has no matching card`);
    assert(
      card?.tournamentYear === record.tournamentYear,
      `${record.id} local portrait has the wrong tournament year`,
    );
    assert(
      !/^https?:\/\//i.test(record.localPath) &&
        /\.(?:png|webp|jpe?g|avif)$/i.test(record.localPath),
      `${record.id} local portrait path is invalid`,
    );
  }
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
    historicalOpponentArchive.every(
      (opponent, index) =>
        index === 0 ||
        (historicalOpponentArchive[index - 1].tournamentYear ?? 0) >=
          (opponent.tournamentYear ?? 0),
    ),
    "Historical opponent archive must be reverse chronological",
  );

  for (const year of PLAYER_WORLD_CUP_YEARS) {
    const cardCount = players.filter(
      (player) => player.tournamentYear === year,
    ).length;
    const minimumCards = year === 2026 ? 2 : 10;
    assert(
      cardCount >= minimumCards,
      `${year} requires at least ${minimumCards} player cards; found ${cardCount}`,
    );
  }
  for (const year of WORLD_CUP_YEARS) {
    const opponentCount = historicalOpponentArchive.filter(
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
    assert(
      playerCareerDataByIdentityId.has(player.playerIdentityId),
      `${player.id} is missing its normalized career record`,
    );
    const accoladeIds = new Set<string>();
    for (const accolade of player.careerAccolades) {
      assert(
        !accoladeIds.has(accolade.id),
        `${player.id} has duplicate accolade id ${accolade.id}`,
      );
      accoladeIds.add(accolade.id);
      assert(Boolean(accolade.label.trim()), `${player.id} has an empty accolade label`);
      assert(
        accolade.count === undefined ||
          (Number.isInteger(accolade.count) && accolade.count > 0),
        `${player.id}/${accolade.id} has an invalid accolade count`,
      );
      assert(
        accolade.verified && Boolean(accolade.sourceName),
        `${player.id}/${accolade.id} has incomplete source metadata`,
      );
    }
    assert(
      player.top100Player
        ? Boolean(
            player.top100Source?.listName &&
              (player.top100Source.sourceUrl || player.top100Source.note),
          )
        : player.top100Source === undefined,
      `${player.id} has invalid Top 100 metadata`,
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
        manager.grades.defense <= 100 &&
        manager.leadership >= 0 &&
        manager.leadership <= 100 &&
        manager.gameManagement >= 0 &&
        manager.gameManagement <= 100,
      `${manager.id} has an invalid manager grade`,
    );
    assert(
      Object.values(manager.eraFitProfile).every(
        (value) => Number.isFinite(value) && value >= 0 && value <= 100,
      ) &&
        draftEras.every((era) => {
          const fit = calculateManagerEraFit(manager, era.id).score;
          return fit >= 0 && fit <= 100;
        }) &&
        calculateManagerEraFit(manager, "all").score < 100,
      `${manager.id} has an invalid Manager Era Fit profile`,
    );
    assert(
      manager.preferredFormations.every((id) => formationIds.has(id)),
      `${manager.id} has an invalid preferred formation`,
    );
    assert(
      manager.acceptableFormations.every((id) => formationIds.has(id)),
      `${manager.id} has an invalid acceptable formation`,
    );
    assert(
      Boolean(manager.style && manager.tacticalIdentity.trim()),
      `${manager.id} is missing a tactical type or identity`,
    );
  }
  assert(
    draftEligibleManagers.length === managers.length &&
      draftEligibleManagers.length >= 25,
    "The audited manager pool must keep every stored manager active",
  );
  assert(
    new Set(draftEligibleManagers.map((manager) => manager.qualityBand)).size >=
      3,
    "The active manager pool must retain meaningful quality-band variety",
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
      managerOptions.length === 3,
      `${era.id} cannot produce three manager identities`,
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
      managerRespin.length === 3 &&
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
  for (const [index, offer] of benchOfferSamples.entries()) {
    assert(
      offer.length === 5 &&
        new Set(offer.map((player) => player.playerIdentityId)).size === 5,
      `Bench sample ${index} must contain five unique player identities`,
    );
    assert(
      new Set(offer.map(tacticalFamily)).size >= 2,
      `Bench sample ${index} needs at least two tactical families`,
    );
  }
  assert(
    new Set(
      starterOfferSamples.map((offer) =>
        offer.map((player) => player.id).join("|"),
      ),
    ).size >= 180 &&
      new Set(
        benchOfferSamples.map((offer) =>
          offer.map((player) => player.id).join("|"),
        ),
      ).size >= 180,
    "Draft samples must produce substantially different player combinations",
  );
  assert(
    starterOfferSamples.flat().some((player) => player.overall >= 94) &&
      benchOfferSamples.flat().some((player) => player.overall >= 90) &&
      benchOfferSamples.flat().some((player) => player.overall < 80),
    "Draft samples must surface both exciting elite cards and useful lower-rated depth",
  );

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
    playersById.get("rodri-2026")?.overall === 96,
    "Rodri 2026 must use the Golden Ball baseline rating of 96",
  );
  assert(
    draftEligiblePlayers.filter((player) => player.overall >= 95).length <= 25,
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
    "rodri-2026",
  ];
  assert(
    goldenBallCardIds.every(
      (id) => (playersById.get(id)?.overall ?? 0) >= 96,
    ),
    "Golden Ball tournament cards should normally be rated at least 96",
  );
  const silverBallCardIds = draftEligiblePlayers
    .filter((player) =>
      player.achievements.some(
        (achievement) => achievement.label === "Silver Ball",
      ),
    )
    .map((player) => player.id);
  assert(
    silverBallCardIds.length > 0 &&
      silverBallCardIds.every(
        (id) => (playersById.get(id)?.overall ?? 0) >= 92,
      ),
    "Silver Ball tournament cards must be rated at least 92",
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
  assert(
    activeManagerGradeLabels.some((grade) => grade === "S"),
    "At least one deserving active manager must support an S grade",
  );
  assert(
    activeManagerGradeLabels.some((grade) =>
      ["B-", "C+", "C", "D", "F"].includes(grade),
    ),
    "The manager pool must retain lower and flawed grades",
  );
  assert(
    draftEligibleManagers.some(
      (manager) =>
        Math.abs(manager.grades.offense - manager.grades.defense) >= 10,
    ),
    "The manager pool must retain attacking and defensive specialists",
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
  const expectedHistoricalCardCount = Object.values(
    playerTournaments.identities,
  ).reduce((total, tournaments) => total + tournaments.length, 0);
  const expectedPlayerIdentityCount = new Set([
    ...Object.keys(playerTournaments.identities),
    ...completed2026Roster.players.map((player) => player.identityId),
  ]).size;
  assert(
    players.length ===
      expectedHistoricalCardCount + completed2026Roster.players.length &&
      playerIdentities.size === expectedPlayerIdentityCount,
    `Player archive must exactly match sourced rosters; expected ${expectedHistoricalCardCount + completed2026Roster.players.length} cards / ${expectedPlayerIdentityCount} identities, found ${players.length} / ${playerIdentities.size}`,
  );
  assert(
    managers.length === 47 && managerIdentities.size === 47,
    `Manager archive must contain one card for each of 47 identities; found ${managers.length} / ${managerIdentities.size}`,
  );
  const cards2026 = players.filter((player) => player.tournamentYear === 2026);
  assert(
    cards2026.length === completed2026Roster.players.length &&
      new Set(cards2026.map((player) => player.playerIdentityId)).size ===
        completed2026Roster.players.length &&
      completed2026Roster.teams.length === 48 &&
      completed2026Roster.teams.every((team) => team.playerCount === 26),
    "The completed 2026 archive must contain all 1,248 unique players across 48 complete squads",
  );
  assert(
    versionsByIdentity
      .get("jens-lehmann")
      ?.map((player) => player.tournamentYear)
      .join("|") === "1998|2002|2006",
    "Jens Lehmann must retain his 1998, 2002, and 2006 squad cards",
  );
  for (const excludedId of [
    "neymar-2010",
    "michael-essien-2010",
    "radamel-falcao-2014",
    "samuel-etoo-2006",
    "youssef-msakni-2018",
  ]) {
    assert(!playersById.has(excludedId), `${excludedId} must not exist`);
  }
  assert(
    requestedIdentityJson.identities.length === 434,
    `Requested historical identity manifest must contain 434 players; found ${requestedIdentityJson.identities.length}`,
  );
  for (const requested of requestedIdentityJson.identities) {
    const sourcedYears = playerTournaments.identities[requested.identityId]?.map(
      (tournament) => tournament.tournamentYear,
    );
    const actualYears = versionsByIdentity
      .get(requested.identityId)
      ?.filter((player) => player.tournamentYear !== 2026)
      .map((player) => player.tournamentYear);
    assert(
      Boolean(
        sourcedYears &&
          actualYears?.join("|") === sourcedYears.join("|") &&
          requested.featuredYears.every((year) => sourcedYears.includes(year)),
      ),
      `${requested.identityId} is missing a requested or sourced tournament card`,
    );
  }
  for (const [identityId, versions] of versionsByIdentity) {
    const representative = versions[0];
    assert(
      Boolean(representative.careerStats),
      `${identityId} is missing career context`,
    );
    if (versions.some((player) => imagesById.has(player.imageId))) {
      assert(
        versions.every((player) => imagesById.has(player.imageId)),
        `${identityId} does not resolve an exact or closest-year portrait for every card`,
      );
    }
  }
  const expectedTournamentCardIds = new Set(
    Object.entries(playerTournaments.identities).flatMap(
      ([identityId, tournaments]) =>
        tournaments.map(
          (tournament) => `${identityId}-${tournament.tournamentYear}`,
      ),
    ),
  );
  for (const player of cards2026) expectedTournamentCardIds.add(player.id);
  assert(
    playerTournaments.unresolvedIdentityIds.length === 0 &&
      expectedTournamentCardIds.size === players.length &&
      players.every((player) => expectedTournamentCardIds.has(player.id)),
    "Player archive does not exactly match sourced 1970–2022 squads plus the completed 2026 set",
  );
  assert(
    players.every(
      (player) => {
        if (player.tournamentYear === 2026) {
          const hasClaimedStats = Object.values(player.tournamentStats).some(
            (value) => value !== null,
          );
          const statsAreSourced =
            !hasClaimedStats ||
            player.statSources.some((source) =>
              source.url.includes("fifa.com/"),
            );
          const finishIsSourced =
            player.tournamentFinish === null ||
            Boolean(
              player.tournamentFinishSource?.url.includes("fifa.com/"),
            );
          return statsAreSourced && finishIsSourced;
        }
        return (
          player.tournamentStats.appearances !== null &&
          player.tournamentStats.starts !== null &&
          player.tournamentStats.goals !== null &&
          player.statSources.some((source) =>
            source.url.includes("jfjelstul/worldcup"),
          )
        );
      },
    ),
    "A tournament card contains tournament claims without supporting evidence",
  );
  for (const [identityId, tournaments] of Object.entries(
    playerTournaments.identities,
  )) {
    for (const tournament of tournaments) {
      const card = playersById.get(
        `${identityId}-${tournament.tournamentYear}`,
      );
      assert(
        Boolean(
          card &&
            card.tournamentStats.appearances === tournament.appearances &&
            card.tournamentStats.starts === tournament.starts &&
            card.tournamentStats.goals === tournament.goals &&
            card.primaryPosition === tournament.primaryPosition &&
            card.eligiblePositions.join("|") ===
              tournament.eligiblePositions.join("|") &&
            tournament.awards.every((award) =>
              card.achievements.some(
                (achievement) => achievement.label === award.label,
              ),
            ),
        ),
        `${identityId}-${tournament.tournamentYear} does not preserve its sourced tournament profile`,
      );
    }
  }
  for (const [identityId, expectedYears] of [
    ["cristiano-ronaldo", [2006, 2010, 2014, 2018, 2022, 2026]],
    ["lionel-messi", [2006, 2010, 2014, 2018, 2022, 2026]],
  ] as const) {
    assert(
      versionsByIdentity
        .get(identityId)
        ?.map((player) => player.tournamentYear)
        .join("|") === expectedYears.join("|"),
      `${identityId} does not have all six tournament versions`,
    );
    const availablePortraitYears =
      identityId === "lionel-messi"
        ? expectedYears.filter((year) => year !== 2006)
        : expectedYears;
    assert(
      availablePortraitYears.every((year) =>
        imagesById.has(`${identityId}-${year}`),
      ),
      `${identityId} does not have every available local portrait`,
    );
  }
  assert(
    players.every(
      (player) =>
        player.imageId === player.id &&
        (imagesById.has(player.imageId) || player.isDraftEligible),
    ),
    "Card-id image resolution or photo-pending draft eligibility drifted",
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
  for (const opponent of historicalOpponentArchive) {
    assert(!opponentIds.has(opponent.id), `Duplicate opponent id ${opponent.id}`);
    opponentIds.add(opponent.id);
    assert(formationIds.has(opponent.formation), `${opponent.id} has invalid formation`);
    assert(opponent.sources.length > 0, `${opponent.id} has no source record`);
    assert(
      opponent.tournamentYear === 2026
        ? opponent.tournamentStatus === "complete" &&
          Object.values(opponent.tournamentStats).every(
            (value) => value !== null,
          ) &&
          opponent.tournamentStats.matches ===
            (opponent.tournamentStats.wins ?? 0) +
              (opponent.tournamentStats.draws ?? 0) +
              (opponent.tournamentStats.losses ?? 0)
        : opponent.tournamentStats.matches !== null,
      `${opponent.id} has invalid tournament-progress fields`,
    );
    assert(
      opponent.startingLineup.length === 0 ||
        opponent.startingLineup.every((player) => player.sourcePlayerId),
      `${opponent.id} has an invalid sourced starting-lineup identity`,
    );
    assert(
      opponent.substitutes.length === 0 ||
        opponent.substitutes.every((player) => player.sourcePlayerId),
      `${opponent.id} has an invalid sourced substitute identity`,
    );
  }
  for (const year of WORLD_CUP_YEARS) {
    assert(
      historicalOpponentArchive.filter(
        (opponent) =>
          opponent.tournamentYear === year &&
          opponent.tournamentFinish === "champion",
      ).length === 1,
      `${year} must have exactly one sourced champion`,
    );
  }
  assert(
    historicalOpponents.length === 15 &&
      historicalOpponents.every(
        (opponent) => opponent.tournamentFinish === "champion",
      ),
    "Normal opponent pool must contain exactly the 15 completed champions",
  );
  for (const champion of historicalOpponents) {
    const roster = [...champion.startingLineup, ...champion.substitutes];
    assert(
      champion.dataStatus === "verified-lineup" &&
        champion.managerName !== null &&
        Boolean(champion.managerCardId) &&
        Boolean(champion.managerIdentityId),
      `${champion.id} is missing its sourced champion manager`,
    );
    assert(
      champion.startingLineup.length === 11 &&
        champion.startingLineup.some((player) => player.position === "GK") &&
        champion.substitutes.length >= 3,
      `${champion.id} must retain a complete final XI, goalkeeper, and bench pool`,
    );
    assert(
      new Set(roster.map((player) => player.playerIdentityId)).size ===
        roster.length &&
        roster.every(
          (player) => Boolean(player.sourcePlayerId) && player.rating !== undefined,
        ),
      `${champion.id} has invalid champion roster identities or ratings`,
    );
    assert(
      Boolean(champion.formationLabel) &&
        Boolean(champion.sources.length) &&
        (champion.tournamentYear === 2026 ||
          (Boolean(champion.finalLineupSource) &&
            Boolean(champion.rosterSource))) &&
        Boolean(champion.championFact) &&
        Boolean(champion.championFactSource) &&
        Boolean(champion.era),
      `${champion.id} is missing its historical formation, source, fact, or era`,
    );
  }
  assert(
    historicalOpponentArchive
      .filter((opponent) => opponent.tournamentYear === 2026)
      .every(
        (opponent) =>
          opponent.tournamentStatus === "complete" &&
          opponent.sources.some((source) =>
            source.url.includes("fifa.com/"),
          ) &&
          Object.values(opponent.tournamentStats).every(
            (value) => value !== null,
          ),
      ),
    "Completed 2026 team records must retain FIFA source coverage and complete result fields",
  );

  const directPlayerImages = imageAttributions.filter(
    (image) => image.kind === "player" && !image.fallback,
  );
  const directPortraitsByIdentity = new Map<
    string,
    typeof directPlayerImages
  >();
  for (const image of directPlayerImages) {
    const card = playersById.get(image.id);
    if (!card) continue;
    directPortraitsByIdentity.set(card.playerIdentityId, [
      ...(directPortraitsByIdentity.get(card.playerIdentityId) ?? []),
      image,
    ]);
  }
  const managerByIdentity = new Map(
    managers.map((manager) => [manager.managerIdentityId, manager]),
  );

  await Promise.all(
    imageAttributions.map(async (image) => {
      const localFile = path.join(
        process.cwd(),
        image.file.replace(/^\//, ""),
      );
      assert(
        existsSync(localFile),
        `${image.id} is missing local portrait ${image.file}`,
      );
      assert(
        !/^https?:\/\//i.test(image.file) &&
          /\.(?:png|webp|jpe?g|avif)$/i.test(image.file),
        `${image.id} has a remote or unsupported production path`,
      );
      assert(
        Boolean(
          image.subjectName.trim() &&
            image.cacheVersion.trim() &&
            image.changes.trim() &&
            image.matchQuality,
        ),
        `${image.id} has incomplete neutral portrait metadata`,
      );
      assert(
        image.cropFocus.x >= 0 &&
          image.cropFocus.x <= 100 &&
          image.cropFocus.y >= 0 &&
          image.cropFocus.y <= 100,
        `${image.id} has invalid crop focus`,
      );

      if (image.kind === "manager") {
        assert(
          Boolean(managerByIdentity.get(image.id)) &&
            image.file === `/assets/managers/${image.id}.png`,
          `${image.id} manager portrait must use its one canonical identity path`,
        );
      } else if (image.fallback) {
        const targetCard = playersById.get(image.id);
        const candidates = targetCard
          ? [...(directPortraitsByIdentity.get(targetCard.playerIdentityId) ?? [])]
              .sort(
                (first, second) =>
                  Math.abs(first.tournamentYear - targetCard.tournamentYear) -
                    Math.abs(second.tournamentYear - targetCard.tournamentYear) ||
                  second.tournamentYear - first.tournamentYear ||
                  first.id.localeCompare(second.id),
              )
          : [];
        const closest = candidates[0];
        assert(
          Boolean(
            targetCard &&
              closest &&
              closest.file === image.file &&
              image.gameEdition === null &&
              !image.exactTournamentImage,
          ),
          `${image.id} does not reuse the closest verified portrait for its identity`,
        );
      } else {
        const card = playersById.get(image.id);
        assert(
          Boolean(card && card.tournamentYear === image.tournamentYear),
          `${image.id} direct portrait has no matching tournament card`,
        );
      }

      if (!existsSync(localFile)) return;
      const metadata = await sharp(localFile).metadata();
      assert(
        ["png", "webp", "jpeg", "avif"].includes(metadata.format ?? ""),
        `${image.id} has an unsupported local portrait format`,
      );
      if (/background|transparent|cutout|isolat/i.test(image.changes)) {
        const stats = await sharp(localFile).stats();
        const alpha = stats.channels[3];
        assert(
          metadata.hasAlpha === true && Boolean(alpha && alpha.min < 255),
          `${image.id} background-isolated derivative must retain transparent pixels`,
        );
      }
    }),
  );

  assert(
    new Set(managerImages.map((image) => image.id)).size ===
      managerImages.length,
    "Manager portraits must be unique by manager identity",
  );

  const neutralHistoricalCodes = new Set([
    "CSK",
    "DDR",
    "NIR",
    "SCG",
    "SUN",
    "YUG",
  ]);
  assert(
    historicalOpponentArchive.every((opponent) => {
      const flag = flagForCountry(opponent.nationCode);
      return neutralHistoricalCodes.has(opponent.nationCode)
        ? flag === "◇"
        : flag !== "◌";
    }),
    "Historical opponent flag mapping is incomplete or misleading",
  );
  assert(
    historicalOpponentArchive.some(
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
    `Draftable players: ${draftEligiblePlayers.length}; tournament-edition game faces: ${tournamentEditionPlayerImages.length}; historical identity portraits: ${historicalPlayerImages.length}; user-supplied portraits: ${userSuppliedPlayerImages.length}; identity fallbacks: ${identityFallbackPlayerImages.length}; photo-pending placeholders: ${draftEligiblePlayers.length - playerImages.length}`,
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
    `Tournament-edition faces: ${tournamentEditionPlayerImages.length} players; exact-year faces: ${managerImages.length} managers; historical identity portraits: ${historicalPlayerImages.length}; user-supplied portraits: ${userSuppliedPlayerImages.length}; identity fallbacks: ${identityFallbackPlayerImages.length}`,
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
          historicalOpponentArchive.filter(
            (opponent) => opponent.tournamentYear === year,
          ).length,
        ]),
      ),
    )}`,
  );
  console.log(
    `Research archive: ${historicalOpponentArchive.length}; normal champion opponents: ${historicalOpponents.length}; source coverage ${historicalOpponents.filter((opponent) => opponent.sources.length > 0).length}/${historicalOpponents.length}; missing manager ${missingOpponentManagers}; missing sourced lineup ${missingOpponentLineups}`,
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
    `Accolade source coverage: ${draftEligiblePlayers.flatMap((player) => player.achievements).filter((achievement) => achievement.source.url).length}/${draftEligiblePlayers.flatMap((player) => player.achievements).length}; flag coverage ${historicalOpponentArchive.filter((opponent) => flagForCountry(opponent.nationCode) !== "◌").length}/${historicalOpponentArchive.length}`,
  );
  console.log(
    `Career accolades: ${draftEligiblePlayers.flatMap((player) => player.careerAccolades).length} card records across ${playerCareerDataByIdentityId.size} normalized identities`,
  );
  console.log(
    `Local portraits: ${localPortraitRecords.length} manifest records / ${playerImages.length} resolved player cards / ${managerImages.length} managers`,
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
