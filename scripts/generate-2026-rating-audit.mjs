import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const [seasonStatsFile, matchesFile, squadsDirectory, outputFile] =
  process.argv.slice(2);

if (!seasonStatsFile || !matchesFile || !squadsDirectory || !outputFile) {
  throw new Error(
    "Usage: node scripts/generate-2026-rating-audit.mjs <season-stats.json> <matches.json> <squads-directory> <output.json>",
  );
}

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const projectRoot = process.cwd();
const roster = readJson(
  path.join(
    projectRoot,
    "src/data/player-tournaments-2026.generated.json",
  ),
);
const fifaStats = readJson(seasonStatsFile);
const fifaMatches = readJson(matchesFile).Results;
const fifaSquads = readdirSync(squadsDirectory)
  .filter((file) => file.endsWith(".json"))
  .sort()
  .map((file) => readJson(path.join(squadsDirectory, file)));

const metricsFor = (fifaPlayerId) =>
  Object.fromEntries(
    (fifaStats[fifaPlayerId] ?? [])
      .filter(([, , available]) => available)
      .map(([metric, value]) => [metric, value]),
  );

const localByRosterKey = new Map(
  roster.players.map((player) => [
    `${player.teamCode}|${player.shirtNumber}|${player.birthDate}`,
    player,
  ]),
);
const fifaByLocalIdentity = new Map();
for (const squad of fifaSquads) {
  for (const player of squad.Players) {
    const birthDate = player.BirthDate?.slice(0, 10) ?? "";
    const local = localByRosterKey.get(
      `${squad.IdCountry}|${player.JerseyNum}|${birthDate}`,
    );
    if (!local) continue;
    fifaByLocalIdentity.set(local.identityId, {
      fifaPlayerId: player.IdPlayer,
      fifaName: player.PlayerName[0]?.Description ?? local.playerName,
      metrics: metricsFor(player.IdPlayer),
    });
  }
}

const teamCodeById = new Map(
  fifaSquads.map((squad) => [squad.IdTeam, squad.IdCountry]),
);
const matchNumbersByTeam = new Map();
for (const match of fifaMatches) {
  for (const side of [match.Home, match.Away]) {
    const teamCode = teamCodeById.get(side.IdTeam);
    if (!teamCode) continue;
    matchNumbersByTeam.set(teamCode, [
      ...(matchNumbersByTeam.get(teamCode) ?? []),
      match.MatchNumber,
    ]);
  }
}

const finishByTeam = new Map();
for (const [teamCode, matchNumbers] of matchNumbersByTeam) {
  const finalMatchNumber = Math.max(...matchNumbers);
  let finish = "group stage";
  if (finalMatchNumber >= 73) finish = "round of 32";
  if (finalMatchNumber >= 89) finish = "round of 16";
  if (finalMatchNumber >= 97) finish = "quarter-finals";
  if (finalMatchNumber >= 101) finish = "semi-finals";
  finishByTeam.set(teamCode, finish);
}
finishByTeam.set("ESP", "champion");
finishByTeam.set("ARG", "runner-up");
finishByTeam.set("ENG", "third place");
finishByTeam.set("FRA", "fourth place");

const finishBonus = {
  "group stage": 0,
  "round of 32": 1,
  "round of 16": 2,
  "quarter-finals": 3,
  "semi-finals": 4,
  "fourth place": 5,
  "third place": 5,
  "runner-up": 5,
  champion: 5,
};

const positionFamily = (position) => {
  if (position === "GK") return "GK";
  if (
    ["LB", "LCB", "CB", "RCB", "RB", "LWB", "RWB"].includes(position)
  ) {
    return "DEF";
  }
  if (["DM", "CM", "AM", "LM", "RM"].includes(position)) return "MID";
  return "FWD";
};

const per90 = (metrics, key) => {
  const minutes = metrics.TimePlayed ?? 0;
  if (minutes <= 0) return 0;
  return ((metrics[key] ?? 0) * 90) / minutes;
};

const rawImpact = (player, metrics) => {
  const family = positionFamily(player.primaryPosition);
  if (family === "GK") {
    return (
      (metrics.GoalkeeperSavePercentage ?? 0) * 0.7 +
      per90(metrics, "GoalkeeperSaves") * 8 +
      per90(
        metrics,
        "GoalkeeperDefensiveActionsOutsidePenaltyArea",
      ) *
        4
    );
  }
  if (family === "DEF") {
    return (
      per90(metrics, "ForcedTurnovers") * 2.5 +
      per90(metrics, "LinebreaksAttemptedCompleted") * 0.35 +
      per90(metrics, "CompletedBallProgressions") * 0.45 +
      per90(metrics, "PassesCompleted") * 0.08 +
      (metrics.Threat ?? 0) * 0.5
    );
  }
  if (family === "MID") {
    return (
      per90(metrics, "ForcedTurnovers") * 1.5 +
      per90(metrics, "LinebreaksAttemptedCompleted") * 0.6 +
      per90(metrics, "CompletedBallProgressions") * 0.65 +
      per90(metrics, "TakeOnsCompleted") * 1.5 +
      (metrics.Threat ?? 0)
    );
  }
  return (
    per90(metrics, "AttemptAtGoalOnTarget") * 7 +
    per90(metrics, "TakeOnsCompleted") * 2 +
    per90(metrics, "ReceptionsInBehind") * 0.6 +
    (metrics.Threat ?? 0) * 1.5
  );
};

const candidates = roster.players.map((player) => {
  const fifa = fifaByLocalIdentity.get(player.identityId);
  const metrics = fifa?.metrics ?? {};
  return {
    player,
    fifaPlayerId: fifa?.fifaPlayerId ?? null,
    fifaName: fifa?.fifaName ?? null,
    metrics,
    family: positionFamily(player.primaryPosition),
    rawImpact: rawImpact(player, metrics),
  };
});

const impactPercentileByIdentity = new Map();
for (const family of ["GK", "DEF", "MID", "FWD"]) {
  const eligible = candidates
    .filter(
      (candidate) =>
        candidate.family === family &&
        (candidate.metrics.TimePlayed ?? 0) >= 180,
    )
    .sort((first, second) => first.rawImpact - second.rawImpact);
  eligible.forEach((candidate, index) => {
    impactPercentileByIdentity.set(
      candidate.player.identityId,
      eligible.length <= 1 ? 1 : index / (eligible.length - 1),
    );
  });
}

const participationBase = (minutes) => {
  if (minutes <= 0) return 65;
  if (minutes < 30) return 68;
  if (minutes < 90) return 70;
  if (minutes < 180) return 72;
  if (minutes < 270) return 74;
  if (minutes < 360) return 76;
  if (minutes < 450) return 78;
  if (minutes < 540) return 80;
  if (minutes < 630) return 81;
  if (minutes < 720) return 82;
  return 83;
};

const minutesCap = (minutes, goals, assists) => {
  const contributions = goals + assists;
  if (minutes <= 0) return 65;
  if (minutes < 30) return contributions > 0 ? 72 : 69;
  if (minutes < 90) return contributions > 1 ? 76 : 73;
  if (minutes < 180) return contributions > 2 ? 81 : 77;
  if (minutes < 270) return contributions > 3 ? 85 : 81;
  if (minutes < 360) return contributions > 4 ? 88 : 85;
  return 93;
};

const ratingAnchors = new Map([
  [
    "kylian-mbappe",
    {
      overall: 98,
      reason:
        "Golden Boot winner with ten goals and four assists; a legendary-scoring tournament.",
    },
  ],
  [
    "lionel-messi",
    {
      overall: 98,
      reason:
        "Runner-up with eight goals, four assists, and the all-time World Cup scoring record.",
    },
  ],
  [
    "rodri",
    {
      overall: 96,
      reason:
        "Golden Ball winner and champion, preserving Trophy XI’s 96+ Golden Ball rule.",
    },
  ],
  [
    "unai-simon",
    {
      overall: 95,
      reason:
        "Golden Glove winner and champion after seven clean sheets and one goal conceded.",
    },
  ],
  [
    "jude-bellingham",
    {
      overall: 95,
      reason:
        "Bronze Boot winner with seven goals during England’s third-place run.",
    },
  ],
  [
    "pau-cubarsi",
    {
      overall: 94,
      reason:
        "Young Player Award winner and ever-present champion defender.",
    },
  ],
  [
    "harry-kane",
    {
      overall: 94,
      reason:
        "Six goals and one assist while leading England to third place.",
    },
  ],
  [
    "michael-olise",
    {
      overall: 94,
      reason:
        "Tournament-leading seven assists across France’s eight-match run.",
    },
  ],
  [
    "mikel-oyarzabal",
    {
      overall: 94,
      reason:
        "Five goals and one assist as Spain’s champion centre-forward.",
    },
  ],
  [
    "ousmane-dembele",
    {
      overall: 94,
      reason:
        "Six goals and two assists during France’s run to the last four.",
    },
  ],
  [
    "erling-haaland",
    {
      overall: 94,
      reason:
        "Seven goals in Norway’s first World Cup quarter-final run.",
    },
  ],
]);

const cards = candidates.map((candidate) => {
  const { player, fifaPlayerId, fifaName, metrics } = candidate;
  const minutes = metrics.TimePlayed ?? 0;
  const goals = metrics.Goals ?? 0;
  const assists = metrics.Assists ?? 0;
  const percentile =
    impactPercentileByIdentity.get(player.identityId) ?? null;
  const impactBonus =
    percentile === null
      ? 0
      : percentile >= 0.95
        ? 3
        : percentile >= 0.8
          ? 2
          : percentile >= 0.6
            ? 1
            : 0;
  const goalContributionBonus = Math.min(
    9,
    Math.round(goals * 1.15 + assists * 0.8),
  );
  const finish = finishByTeam.get(player.teamCode) ?? "group stage";
  const calculatedOverall = Math.max(
    65,
    Math.min(
      participationBase(minutes) +
        finishBonus[finish] +
        impactBonus +
        goalContributionBonus,
      minutesCap(minutes, goals, assists),
      93,
    ),
  );
  const anchor = ratingAnchors.get(player.identityId);
  const overall = anchor?.overall ?? calculatedOverall;
  const evidenceSummary = !fifaPlayerId
    ? "The restored PDF-roster card has no exact team, shirt-number, and birth-date match in FIFA’s current squad/stat index; no 2026 performance credit was inferred."
    : minutes <= 0
      ? "FIFA’s official season feed records zero tournament minutes; the card is rated at the no-performance floor."
      : `FIFA records ${Number(minutes.toFixed(2))} minutes across ${metrics.MatchesPlayed ?? 0} matches, ${goals} goals, and ${assists} assists for a ${finish} team.`;

  return {
    cardId: `${player.identityId}-2026`,
    playerIdentityId: player.identityId,
    playerName: player.playerName,
    teamCode: player.teamCode,
    shirtNumber: player.shirtNumber,
    primaryPosition: player.primaryPosition,
    fifaPlayerId,
    fifaPlayerName: fifaName,
    tournamentFinish: finish,
    tournamentEvidence: {
      matchesPlayed: metrics.MatchesPlayed ?? 0,
      minutesPlayed: Number(minutes.toFixed(2)),
      goals,
      assists,
      saves:
        player.primaryPosition === "GK"
          ? (metrics.GoalkeeperSaves ?? 0)
          : null,
      savePercentage:
        player.primaryPosition === "GK"
          ? (metrics.GoalkeeperSavePercentage ?? 0)
          : null,
      impactPercentile:
        percentile === null ? null : Number(percentile.toFixed(3)),
    },
    overall,
    ratingBasis: anchor ? "manual-elite-anchor" : "evidence-tier-review",
    ratingRationale: anchor
      ? `${anchor.reason} ${evidenceSummary}`
      : `${evidenceSummary} Its final ${overall} overall is an explicit placement on the restored Trophy XI participation, progression, contribution, and position-impact bands.`,
  };
});

const distribution = Object.fromEntries(
  [...new Set(cards.map((card) => card.overall))]
    .sort((first, second) => first - second)
    .map((rating) => [
      rating,
      cards.filter((card) => card.overall === rating).length,
    ]),
);

const output = {
  version: 1,
  generatedAt: "2026-07-26",
  sources: [
    {
      name: "FIFA World Cup 2026 season player statistics",
      url: "https://fdh-api.fifa.com/v1/stats/season/285023/players.json",
      publisher: "FIFA",
      accessedOn: "2026-07-26",
    },
    {
      name: "FIFA World Cup 2026 match calendar and results",
      url: "https://api.fifa.com/api/v3/calendar/matches?language=en&count=500&idSeason=285023",
      publisher: "FIFA",
      accessedOn: "2026-07-26",
    },
    {
      name: "FIFA World Cup 2026 official squad lists",
      url: "https://fdp.fifa.org/assetspublic/ce281/pdf/SquadLists-English.pdf",
      publisher: "FIFA",
      accessedOn: "2026-07-26",
    },
    {
      name: "FIFA World Cup 2026 award winners",
      url: "https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/articles/award-winners",
      publisher: "FIFA",
      accessedOn: "2026-07-26",
    },
  ],
  methodology: {
    scope:
      "Only 2026 Trophy XI overalls are reviewed; every 1970–2022 overall remains exactly as restored from the pre-task repository.",
    scale:
      "65 no recorded tournament performance; 69–79 limited/rotation contribution; 80–84 reliable tournament contribution; 85–89 standout; 90–93 elite; 94–96 iconic; 97–99 legendary.",
    evidence:
      "Official FIFA minutes, matches, goals, assists, team progression, and position-specific season metrics place each card into a documented Trophy XI performance band.",
    exclusions:
      "No roster order, random cycle, historical reputation, club form, EA SPORTS FC rating, or pre-task historical-appearance fallback is used.",
    eliteAnchors:
      "Major awards and exceptional tournaments are reviewed explicitly. Golden Ball winner Rodri remains 96, preserving the restored historical 96+ Golden Ball rule.",
  },
  summary: {
    cards: cards.length,
    matchedToCurrentFifaStats: cards.filter((card) => card.fifaPlayerId)
      .length,
    unmatchedRestoredRosterCards: cards.filter(
      (card) => !card.fifaPlayerId,
    ).length,
    playersWithMinutes: cards.filter(
      (card) => card.tournamentEvidence.minutesPlayed > 0,
    ).length,
    playersWithoutMinutes: cards.filter(
      (card) => card.tournamentEvidence.minutesPlayed === 0,
    ).length,
    cardsAt80OrHigher: cards.filter((card) => card.overall >= 80).length,
    distribution,
  },
  unmatchedRestoredRosterCards: cards
    .filter((card) => !card.fifaPlayerId)
    .map((card) => ({
      cardId: card.cardId,
      playerIdentityId: card.playerIdentityId,
      playerName: card.playerName,
      teamCode: card.teamCode,
      shirtNumber: card.shirtNumber,
    })),
  cards,
};

writeFileSync(outputFile, `${JSON.stringify(output, null, 2)}\n`);
