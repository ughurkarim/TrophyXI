import { historicalOpponents } from "../src/data/opponents/generated";
import { WORLD_CUP_YEARS } from "../src/types/game";

const expected = new Map([
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
for (const year of WORLD_CUP_YEARS) {
  const count = historicalOpponents.filter(
    (opponent) => opponent.tournamentYear === year,
  ).length;
  if (count !== expected.get(year)) {
    failures.push(`${year}: expected ${expected.get(year)}, found ${count}`);
  }
}
if (
  new Set(historicalOpponents.map((opponent) => opponent.id)).size !==
  historicalOpponents.length
) {
  failures.push("Historical opponent ids are not unique");
}
for (const opponent of historicalOpponents) {
  if (!opponent.sources.length) failures.push(`${opponent.id}: source missing`);
  if (opponent.tournamentStats.matches === null) {
    failures.push(`${opponent.id}: sourced match count missing`);
  }
}

if (failures.length) {
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(
    `Validated ${historicalOpponents.length} sourced historical opponents across ${WORLD_CUP_YEARS.length} tournaments.`,
  );
}
