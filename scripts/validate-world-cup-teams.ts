import {
  historicalOpponentArchive,
  historicalOpponents,
  matchOpponents,
  worldCupAllStars,
} from "../src/data/opponents";
import { formations } from "../src/data/formations";
import {
  assignHistoricalLineupToFormation,
  canHistoricalPlayerFillSlot,
} from "../src/engine/historical-lineup";
import { WORLD_CUP_YEARS } from "../src/types/game";

const expectedArchiveCounts = new Map([
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

const formationsById = new Map(
  formations.map((formation) => [formation.id, formation]),
);
const failures: string[] = [];

const hasValidFormationAssignment = (
  opponent: (typeof historicalOpponents)[number],
) => {
  const formation = formationsById.get(opponent.formation);
  return Boolean(
    formation &&
      assignHistoricalLineupToFormation(
        opponent.startingLineup,
        formation,
      ),
  );
};

for (const year of WORLD_CUP_YEARS) {
  const count = historicalOpponentArchive.filter(
    (opponent) => opponent.tournamentYear === year,
  ).length;
  if (count !== expectedArchiveCounts.get(year)) {
    failures.push(`${year}: expected ${expectedArchiveCounts.get(year)}, found ${count}`);
  }
}

const expectedChampionCount = WORLD_CUP_YEARS.length;
if (historicalOpponents.length !== expectedChampionCount) {
  failures.push(
    `normal opponent pool: expected ${expectedChampionCount} champions, found ${historicalOpponents.length}`,
  );
}
if (
  matchOpponents.length !== expectedChampionCount + 1 ||
  matchOpponents[0]?.id !== worldCupAllStars.id
) {
  failures.push(
    `normal match pool must be World Cup All-Stars plus ${expectedChampionCount} champions`,
  );
}
if (
  new Set(historicalOpponents.map((opponent) => opponent.id)).size !==
  historicalOpponents.length
) {
  failures.push("Champion opponent ids are not unique");
}

for (const opponent of historicalOpponents) {
  const prefix = `${opponent.nationName} ${opponent.tournamentYear}`;
  if (opponent.tournamentFinish !== "champion") {
    failures.push(`${prefix}: normal pool entry is not a champion`);
  }
  if (opponent.dataStatus !== "verified-lineup") {
    failures.push(`${prefix}: lineup is not marked verified`);
  }
  if (!opponent.managerName || !opponent.managerCardId || !opponent.managerIdentityId) {
    failures.push(`${prefix}: sourced manager missing`);
  }
  if (!opponent.formationLabel || !formationsById.has(opponent.formation)) {
    failures.push(`${prefix}: historical or engine formation missing`);
  }
  if (!opponent.tacticalProfile || !opponent.era) {
    failures.push(`${prefix}: tactical identity or era missing`);
  }
  if (!opponent.championFact || !opponent.championFactSource) {
    failures.push(`${prefix}: unique sourced champion fact missing`);
  }
  if (!opponent.finalLineupSource || !opponent.rosterSource) {
    failures.push(`${prefix}: final-lineup or roster source missing`);
  }
  if (opponent.startingLineup.length !== 11) {
    failures.push(`${prefix}: expected exactly 11 starters`);
  }
  if (opponent.substitutes.length < 3) {
    failures.push(`${prefix}: fewer than three sourced substitute options`);
  }
  if (!opponent.startingLineup.some((player) => player.position === "GK")) {
    failures.push(`${prefix}: starting goalkeeper missing`);
  }
  if (!hasValidFormationAssignment(opponent)) {
    failures.push(`${prefix}: starting XI cannot fill the engine formation`);
  }
  if (
    !opponent.substitutes.every((substitute) =>
      formationsById
        .get(opponent.formation)
        ?.slots.some((slot) =>
          canHistoricalPlayerFillSlot(substitute, slot),
        ),
    )
  ) {
    failures.push(`${prefix}: substitute pool lacks usable positional coverage`);
  }
  const fullSquad = [...opponent.startingLineup, ...opponent.substitutes];
  if (new Set(fullSquad.map((player) => player.playerIdentityId)).size !== fullSquad.length) {
    failures.push(`${prefix}: duplicate player identity in roster`);
  }
  for (const player of fullSquad) {
    if (!player.sourcePlayerId || player.rating === undefined) {
      failures.push(`${prefix}: ${player.name} lacks source player id or modeled rating`);
    }
  }
  if (new Set(opponent.sources.map((source) => source.url)).size < 1) {
    failures.push(`${prefix}: source set missing`);
  }
}

if (failures.length) {
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(
    `Validated ${historicalOpponents.length} complete champion rosters; research archive retains ${historicalOpponentArchive.length} sourced historical teams.`,
  );
}
