import fs from "node:fs";
import path from "node:path";
import { players } from "../src/data/players";
import { managers } from "../src/data/managers";
import { formations } from "../src/data/formations";
import { landingChampions } from "../src/data/landing-champions";
import { historicalOpponents, worldCupAllStars } from "../src/data/opponents";
import { contentKey } from "../src/i18n/content";

const root = process.cwd();
const file = path.join(root, "messages/en.json");
const messages = JSON.parse(fs.readFileSync(file, "utf8"));

const additions = {
  champions: {
    worldChampion: "WORLD CHAMPION", pending: "PENDING", representativePlayer: "REPRESENTATIVE PLAYER",
    photoPending: "PHOTO PENDING", yearsAria: "Champion years",
    photoPendingAria: "{player}, {year} photo pending",
    pendingShowcaseAria: "{year} world champion pending confirmation",
    showcaseAria: "{country} {year} world champion showcase",
    cardAria: "{country} {year} world champion, represented by {player}",
    imageAlt: "{player} celebrates {country}’s {year} World Cup victory",
    showYearAria: "Show {year} {country}",
  },
  freeSelection: {
    loading: "OPENING FREE SELECTION", opponentStep: "OPPONENT / 05", step: "FREE SELECTION / 04",
    eyebrow: "FREE SELECTION", title: "BUILD YOUR SQUAD",
    description: "Select a position, choose from the best tournament cards available, and complete your XI and bench.",
    teamStatsAria: "Team stats", teamStats: "TEAM STATS", legacy: "LEGACY", chemistry: "CHEMISTRY",
    chemistryStates: { strong: "STRONG", building: "BUILDING", disconnected: "DISCONNECTED" },
    squadContextAria: "Squad context", manager: "MANAGER", style: "STYLE", formation: "FORMATION", era: "ERA",
    workspaceAria: "Squad building workspace", bench: "BENCH", benchSlotsAria: "Bench slots",
    openBench: "OPEN BENCH", selectAnyPlayer: "SELECT ANY PLAYER", positionFirst: "POSITION FIRST",
    selectPosition: "Select a position on the pitch.", cardsAppear: "The strongest available tournament cards will appear automatically.",
    starterRolesRemain: "{count, plural, one {# starter role remains} other {# starter roles remain}}",
    benchPlacesRemain: "{count, plural, one {# bench place remains} other {# bench places remain}}",
    filledPosition: "FILLED POSITION", inspect: "INSPECT", replace: "REPLACE", move: "MOVE", remove: "REMOVE",
    benchSearch: "BENCH SEARCH", selectedPosition: "SELECTED POSITION", anyPlayer: "Any player",
    noPositionRestriction: "No position restriction · ranked by bench impact", clearPosition: "Clear selected position",
    searchPlayers: "Search players", searchPlaceholder: "Search player or nation", tournamentYear: "Tournament year",
    allYears: "All years", playerNation: "Player nation", allNations: "All nations", cardRarity: "Card rarity",
    allRarities: "All rarities", minimumRating: "Minimum rating", anyRating: "Any rating",
    sortByOverallTitle: "Sort the current eligible players by overall rating", byOverall: "BY OVR",
    readyToPlace: "READY TO PLACE", fit: "FIT", team: "TEAM", chemShort: "CHEM",
    placeHint: "Click {target} or press Place", place: "PLACE", playerSlot: "PLAYER SLOT", selectPlayer: "Select a player",
    chooseCardHint: "Choose a card below, then click {target} or press Place.", noPlayerSelected: "No player selected",
    sort: { highestOverall: "HIGHEST OVR FIRST", bestBench: "BEST BENCH IMPACT FIRST", bestSquad: "BEST SQUAD IMPACT FIRST" },
    selectCandidateAria: "Select {player} {year} for {target}", topOverall: "TOP OVR", best: "BEST",
    viewProfileAria: "View profile for {player} {year}", noResults: "No eligible tournament cards match these filters.",
    continueToSquad: "CONTINUE TO SQUAD",
    managerPicker: {
      eyebrow: "FREE SELECTION / MANAGER POOL", title: "Choose who leads your XI.",
      description: "Search every available manager, compare their tactical profile, and choose who will lead your XI.",
      controlsAria: "Manager pool controls", search: "Search managers", searchPlaceholder: "Search manager, nation, team…",
      nation: "Manager nation", allNations: "All nations", managerEra: "Manager era", allEras: "All eras",
      tacticalStyle: "Tactical style", allStyles: "All styles", preferredFormation: "Preferred formation",
      allFormations: "All formations", sortManagers: "Sort managers",
      sort: { bestOverall: "Rank: best overall", eraFit: "Era Fit", name: "Name", year: "Tournament year" },
      selectedPreviewAriaNamed: "Selected manager preview: {manager}", selectedPreviewAria: "Selected manager preview",
      selectedManager: "SELECTED MANAGER", preferred: "Preferred", noneSelected: "No manager selected",
      chooseToPreview: "Choose a manager below to preview their tactical profile.",
      poolCount: "{visible} OF {total} MANAGERS · {era}", rankingDescription: "PERMANENT RANK USES OFF · DEF · LEADERSHIP · GAME MANAGEMENT",
      availableManagers: "Available managers", chooseAria: "Choose {manager}, {team} {year}{eraFit}",
      eraFitSuffix: ", Era Fit {fit}", styleTactics: "{style} tactics", viewProfileAria: "View profile for {manager}, {team} {year}",
      empty: "No managers match the current pool filters.", noneSelectedShort: "None selected",
      selectToContinue: "Select a manager from the pool to continue.", confirm: "CONFIRM MANAGER",
    },
    formationPicker: {
      eyebrow: "FREE SELECTION / FORMATION", title: "Pick your system.",
      description: "Every active formation is open. Compare its shape and fit, then confirm one system.",
      selectedManager: "Selected manager", tacticalIdentity: "Tactical identity", preferredSystems: "Preferred systems",
      archive: "Archive", formationsAvailable: "formations available", availableFormations: "Available formations",
      preferred: "PREFERRED", tendencies: "ATT · MID · DEF", managerFitSummary: "{manager} · Manager Fit {managerFit}",
      fitSummary: "{manager} · Manager Fit {managerFit} · Era Fit {eraFit}", nothingSelected: "Nothing is preselected.",
      continueToSquad: "CONTINUE TO SQUAD",
    },
  },
  opponents: {
    gauntlet: "WORLD CUP GAUNTLET", title: "Choose your opponent.", championCount: "{count} CHAMPIONS",
    featuredChallenge: "FEATURED CHALLENGE", allStars: "World Cup All-Stars", allStarsUpper: "WORLD CUP ALL-STARS",
    selectAllStarsAria: "Select World Cup All-Stars, Mythic difficulty", difficulty: "DIFFICULTY", mythic: "MYTHIC",
    manager: "MANAGER", managerProfileAria: "{manager} manager profile", off: "OFF", def: "DEF", leadership: "Leadership",
    gameManagement: "Game Management", eraFit: "Era Fit", preferredFormations: "Preferred formations", tacticalStyle: "Tactical style",
    champions: "CHAMPIONS", championsDescription: "Fifteen champions. One knockout match.", teamCount: "{count} teams",
    selectedOpponent: "SELECTED OPPONENT", chooseOne: "Choose one opponent", viewXi: "View XI", editSquad: "Edit squad",
    enterTunnel: "Enter the tunnel", ratingsAria: "{country} ratings", attack: "ATTACK", midfield: "MIDFIELD", defense: "DEFENSE",
    overall: "OVERALL", selectChampionAria: "Select {country} {year}, {difficulty} difficulty", photoPending: "PHOTO PENDING",
    worldChampion: "WORLD CHAMPION", representativePending: "Representative player pending", shape: "Shape",
    viewLineupAria: "View {country} {year} lineup", selectedChampion: "SELECTED CHAMPION", closeLineup: "Close opponent lineup",
    formation: "Formation", startingXi: "STARTING XI", startingXiAria: "{country} {year} starting eleven",
    availableSubstitutes: "AVAILABLE SUBSTITUTES", substitutesAria: "{country} {year} available substitutes",
  },
  worldCupRun: {
    title: "WORLD CUP RUN", preparing: "PREPARING THE TOURNAMENT", opponent: "Opponent", continue: "CONTINUE", next: "NEXT",
    nextRound: "NEXT ROUND", goBack: "GO BACK", upcoming: "UPCOMING", remaining: "{count} REMAINING",
    simulateMatch: "SIMULATE MATCH", simulateGroup: "SIMULATE GROUP", simulateRound: "SIMULATE ROUND",
    launch: { eyebrow: "THE BIGGEST STAGE IN FOOTBALL", enter: "ENTER THE", worldCup: "WORLD CUP", overviewAria: "World Cup overview", nations: "48 NATIONS", oneTrophy: "ONE TROPHY", startsNow: "YOUR RUN STARTS NOW", begin: "BEGIN THE WORLD CUP" },
    shootout: { aria: "World Cup Final penalty shootout", eyebrow: "WORLD CUP FINAL · PENALTY SHOOTOUT", complete: "SHOOTOUT COMPLETE", userWins: "TROPHY XI WIN ON PENALTIES", opponentWins: "{opponent} WIN ON PENALTIES", userWinDescription: "The final kick settles it. Trophy XI are one step from the celebration.", lossDescription: "The final kick settles it. The shootout is over.", suddenDeath: "SUDDEN DEATH", kick: "KICK {order} · {team}", approach: "walks to the spot and places the ball.", goal: "GOAL", miss: "MISS", whistle: "THE WHISTLE…" },
    header: { group: "WORLD CUP RUN · GROUP {group}", knockout: "WORLD CUP RUN · KNOCKOUT" },
    status: { knockoutSecured: "KNOCKOUT PLACE SECURED", live: "LIVE TOURNAMENT", bestThirdQualified: "QUALIFIED · BEST 3RD", groupPosition: "{rank} IN GROUP" },
    restart: "Restart World Cup Run", restartShort: "RESTART", restartConfirm: "Restart this tournament with a new field?",
    progressAria: "Tournament progress", groups: "GROUPS", returnToMenu: "Return to menu", restartWorldCup: "Restart World Cup",
    loss: { group: "Trophy XI finished {rank} in Group {group}. Your squad and tournament record remain saved.", final: "The final hurdle proves one step too far. Your squad and tournament record remain saved.", penalties: "Trophy XI fall {user}–{opponent} on penalties. Your squad and tournament record remain saved.", knockout: "A memorable World Cup run comes to a close. Your squad and tournament record remain saved.", saved: "Your squad and tournament record remain saved." },
    victory: { worldChampions: "WORLD CHAMPIONS", reach: "reach football’s", summit: "summit.", description: "Football’s greatest prize belongs to Trophy XI.", summaryAria: "World Cup run summary", matches: "MATCHES", wins: "WINS", title: "TITLE", returnMain: "RETURN TO MAIN SCREEN", viewRun: "VIEW WORLD CUP RUN" },
    group: { nextFixture: "NEXT FIXTURE", matchday: "MATCHDAY {number}", matchdayShort: "MD {number}", complete: "GROUP COMPLETE", label: "GROUP {group}", bestThirdQualifier: "BEST THIRD-PLACE QUALIFIER", qualified: "GROUP QUALIFIED", finalScores: "The final scores are in.", thirdThrough: "Third place is through.", knockoutOpen: "The knockout road is open.", bestThirdNotice: "ONE OF THE 8 BEST THIRD-PLACE TEAMS", enterRound32: "ENTER ROUND OF 32", road: "ROAD TO THE KNOCKOUTS", matchCount: "{count} GROUP MATCHES", standings: "GROUP {group} · STANDINGS", advanceRule: "TOP 2 + BEST 3RDS ADVANCE", automaticQualificationLine: "Automatic qualification line", automaticQualification: "AUTOMATIC QUALIFICATION", bestThirdThrough: "BEST 3RD · THROUGH", fixtures: "GROUP {group} · FIXTURES" },
    table: { position: "POS", team: "TEAM", played: "P", goalDifference: "GD", points: "PTS" },
    knockout: { championshipMatch: "THE CHAMPIONSHIP MATCH", route: "TROPHY XI ROUTE", runEnds: "THE RUN ENDS HERE", oneMatch: "ONE MATCH. ONE TROPHY.", advanced: "ADVANCEMENT SECURED", stageMatch: "{stage} MATCH", noShootout: "NO SHOOTOUT", penaltiesWonAria: "Won {user}–{opponent} on penalties", penaltiesLostAria: "Lost {user}–{opponent} on penalties", enterChampionship: "ENTER CHAMPIONSHIP MATCH" },
    bracket: { full: "FULL KNOCKOUT BRACKET", roadFinal: "The road to the World Cup Final", path: "TROPHY XI PATH · FULL BRACKET", browseRounds: "Browse knockout rounds", selectedRound: "SELECTED ROUND", matchCount: "{count, plural, one {# MATCH} other {# MATCHES}}", winnerFeeder: "Winner {stage} M{match}", qualifiedTeam: "Qualified team {number}", matchUpcoming: "MATCH {number} · UPCOMING", matchFullTime: "MATCH {number} · FULL TIME", penalties: "PENALTIES", fullAria: "Full World Cup knockout bracket", decider: "THE DECIDER", winnerLifts: "WINNER LIFTS THE WORLD CUP", match: "MATCH {number}", penShort: "PEN" },
    championLifts: "{champion} lifts the trophy.", theChampion: "The champion",
  },
  matchReveal: {
    allStars: "All Stars", yourXiEra: "YOUR XI · {era}", worldCupFinal: "THE WORLD CUP FINAL", featuredMythic: "FEATURED CHALLENGE · MYTHIC", worldChampionYear: "WORLD CHAMPION · {year}", ratingsComparisonAria: "Team ratings comparison", teamStats: "TEAM STATS",
    metrics: { attack: "Attack", midfield: "Midfield", defense: "Defense", chemistry: "Chemistry", overall: "Overall" },
    dossierAria: "{country} match dossier", tacticalIdentity: "TACTICAL IDENTITY", manager: "Manager", eraFitValue: "Era Fit {value}", neutralEra: "Neutral era", formation: "FORMATION", opponentOverall: "OPPONENT OVR", viewYourXi: "View Your XI", viewOpponentXi: "View Opponent XI", finalReady: "FINAL READY", oneMatch: "One match for the trophy.", openingFinal: "Opening Final", enterFinal: "Enter Final", yourFinalXi: "YOUR FINAL XI", startingElevenAria: "{team} starting eleven", closeLineup: "Close lineup", formationAria: "{team} {formation} formation",
  },
  matchTimeline: {
    allStars: "All Stars", goal: "GOAL", miss: "MISS", suddenDeath: "SUDDEN DEATH", fullTime: "FULL TIME", paused: "PAUSED", live: "LIVE", finalMatch: "FINAL MATCH", showdown: "THE SHOWDOWN", viewsAria: "Match views", matchLog: "Match log", scoreAria: "Trophy XI {user}, {opponent} {opponentScore}, {minute}", worldCupFinal: "THE WORLD CUP FINAL", yourXi: "YOUR XI", penalties: "PENALTIES", match: "MATCH", featuredChallenge: "FEATURED CHALLENGE", worldChampionYear: "WORLD CHAMPION · {year}", allStarsLogo: "All Stars logo", extraTimeProgressAria: "Regular time complete. Extra time {percent} percent", progressAria: "Match progress {percent} percent",
    shootout: { title: "{player} — {result}", detail: "{player} steps to the penalty spot. {result}. Shootout: {user}–{opponent}. {suddenDeath}", approach: "steps forward and places the ball on the spot.", whistle: "THE WHISTLE…", label: "SHOOTOUT" },
    stats: { shots: "Shots", onTarget: "On target", chanceQuality: "Chance quality", possession: "Possession", yellowCards: "Yellow cards" },
    event: { shootoutSuddenDeath: "PENALTY SHOOTOUT · SUDDEN DEATH", shootoutKick: "PENALTY SHOOTOUT · KICK {order}", goalUser: "GOAL · TROPHY XI", goalOpponent: "GOAL · OPPONENT" },
    finalWhistle: "FINAL WHISTLE", winOnPenalties: "WIN ON PENALTIES", winFinal: "WIN THE FINAL", winWorldCup: "WIN THE WORLD CUP", areWorldChampions: "ARE WORLD CHAMPIONS", finalLevel: "THE FINAL ENDS LEVEL", historyAnswer: "History has its answer.", liveStats: "LIVE MATCH STATS", controlsAria: "Match timeline controls", speed2x: "2× MATCH SPEED", matchComplete: "MATCH COMPLETE", engineLive: "MATCH ENGINE LIVE", resume: "Resume match", pause: "Pause match", fastForward: "Fast forward", viewFinalResult: "View final result", skipResult: "Skip to result", liveAnnouncement: "{minute}. {title}. {detail} Score {user} to {opponent}.", fullTimeline: "Full match timeline", closeTimeline: "Close Full match timeline",
  },
  sharedGame: {
    step: "SHARED MATCH", eyebrow: "A TROPHY XI MATCH RECORD", title: "History was challenged.", description: "This is the complete match another manager played and shared.", scoreAria: "Final score: Trophy XI {user}, {opponent} {opponentScore}", challenger: "THE CHALLENGER", champion: "THE CHAMPION", penalties: "PENALTIES", matchReport: "MATCH REPORT", numbers: "The numbers", matchTimeline: "MATCH TIMELINE", unfolded: "How it unfolded", twoSides: "THE TWO SIDES", exactTeams: "The exact teams that played.", yourSquad: "YOUR SQUAD", bench: "BENCH", opponent: "OPPONENT", substitutes: "SUBSTITUTES", yourTurn: "YOUR TURN", canDoBetter: "Can your fourteen do better?", buildXi: "Build your XI",
  },
  privacy: {
    metadataTitle: "Privacy", metadataDescription: "Privacy information for Trophy XI.", eyebrow: "Trophy XI privacy", title: "Privacy.", lede: "Trophy XI is designed to work without requiring a user account for normal gameplay.", progressTitle: "Game progress", progressDescription: "Trophy XI may store game and preference state in your browser’s local storage so a session can survive navigation or a refresh. This information stays in the browser unless another feature explicitly sends it elsewhere.", analyticsTitle: "Analytics and performance", analyticsDescription: "The site uses Vercel Analytics and Vercel Speed Insights to understand site usage and performance. Those services may process technical usage information according to Vercel’s own privacy practices.", changesTitle: "Changes", changesDescription: "This page should be updated if Trophy XI later adds accounts, advertising, payments, user uploads, or other features that materially change what data is collected or processed.", back: "Back to Trophy XI",
  },
  engineering: {
    metadataTitle: "Engineering · Trophy XI", metadataDescription: "The math and computer science behind Trophy XI: team modeling, era translation, seeded simulation, match state, testing and delivery.", backAria: "Back to dashboard", dashboard: "DASHBOARD",
    hero: { eyebrow: "UNDER THE HOOD", titleFirst: "THE MATH BEHIND", titleSecond: "THE MATCH.", description: "A great XI is more than eleven high rated cards. Position, chemistry, manager, era, bench depth and the current match state all change what the team can actually do.", seedDescription: "The simulator stays unpredictable without becoming impossible to test. Same inputs. Same seed. Same result." },
    stats: { cards: "TOURNAMENT CARDS", identities: "PLAYER IDENTITIES", champions: "WORLD CUP CHAMPIONS", engine: "SEEDED ENGINE" },
    teamModel: { eyebrow: "01 · TEAM MODEL", title: "A TEAM IS A SYSTEM, NOT A SUM.", description: "Tournament quality is the starting point. Then the engine looks at where the player is used, how the lineup fits together, who manages it, the era around it and what is still available on the bench." },
    position: { eyebrow: "02 · POSITION", title: "A GREAT PLAYER IN THE WRONG ROLE SHOULD COST YOU.", description: "Squad building is a constraint problem. Maximize quality, but keep the lineup coherent. Force a player into the wrong role and less of that quality is actually usable.", rawXi: "RAW XI", cost: "POSITION COST", usable: "USABLE QUALITY" },
    era: { eyebrow: "03 · ERA TRANSLATION", title: "1970 → 2026 IS NOT THE SAME PROBLEM AS 2026 → 1970.", description: "Era is treated as an environment change, not a permanent advantage for modern football or older legends. The direction of the translation matters." },
    manager: { eyebrow: "04 · MANAGER", title: "CHANGE THE MANAGER. CHANGE THE TEAM.", description: "Offense, defense, tactics and game management change how the same group of players behaves before and during the match.", teamState: "TEAM STATE", transform: "MANAGER TRANSFORM", factors: "OFF · DEF · TACTICS · GAME MANAGEMENT" },
    matchEngine: { eyebrow: "05 · MATCH ENGINE", title: "RANDOM, BUT REPRODUCIBLE.", description: "Football needs variance. The simulator still needs to be debuggable. A seed gives the engine both.", result: "RESULT", seed: "σ is the simulation seed", order: "football inputs first, seeded randomness after", pipeline: { players: { title: "PLAYERS", description: "Tournament versions" }, fit: { title: "FIT", description: "Position and structure" }, team: { title: "TEAM", description: "Chemistry and balance" }, context: { title: "CONTEXT", description: "Manager and era" }, state: { title: "STATE", description: "Score, time, fatigue" }, seed: { title: "SEED", description: "Reproducible variance" } } },
    matchState: { eyebrow: "06 · MATCH STATE", title: "THE NEXT EVENT DEPENDS ON WHAT IS TRUE RIGHT NOW.", description: "The match is not decided at kickoff. Score, minute, shots, xG, cards, fatigue and substitutions keep changing the next decision. Each event updates the state, then the engine evaluates the next one.", quote: "A stronger side can move the probabilities. It never gets promised a win." },
    bench: { eyebrow: "07 · BENCH", title: "THE BENCH CHANGES WITH THE MATCH.", description: "The right substitute at 0–0 is not automatically the right substitute at 1–0 or 0–1. Time, fatigue, fit, manager behavior and score change what the next substitution needs to solve.", decision: "SUBSTITUTION DECISION", tags: { chase: "CHASE", protect: "PROTECT", fresh: "FRESH LEGS", fit: "FIT", extraTime: "EXTRA TIME" } },
    testing: { eyebrow: "08 · TESTING", title: "IF THE MODEL CHANGES, THE TESTS SHOULD CATCH IT.", description: "Reproducible simulation makes bugs easier to isolate. Historical data is validated before it reaches the game, with Vitest and Playwright covering simulation, tournament progression and integrity paths.", cards: { simulation: { label: "SIMULATION", title: "SEEDED", description: "Same inputs can reproduce the same path when a regression needs to be isolated." }, data: { label: "DATA", title: "VALIDATED", description: "Duplicate identities, unsupported records and asset mismatches are caught before release." }, product: { label: "PRODUCT", title: "40+ TEST FILES", description: "Vitest and Playwright cover the engine, progression and product integrity." } } },
    delivery: { eyebrow: "09 · DELIVERY", title: "FAST MATH STILL NEEDS A FAST PRODUCT.", description: "The game runs in Next.js and TypeScript. Player assets are delivered through S3 and CloudFront, with Vercel and Cloudflare handling the product around the simulator.", product: "PRODUCT", engine: "ENGINE", stateSimulation: "STATE + SIMULATION", assets: "ASSETS", delivery: "DELIVERY", testRequests: "TEST REQUESTS", medianResponse: "MEDIAN RESPONSE START", under374: "UNDER 374 ms" },
    idea: { eyebrow: "THE IDEA", title: "BUILD THE BETTER XI. GET THE BETTER CHANCE. NOT A GUARANTEED WIN.", description: "If the best team wins every time, it stops feeling like football. If the choices barely matter, the draft means nothing. Trophy XI has to live between those two.", cards: { decisions: { title: "DECISIONS MATTER", description: "Draft, roles, manager, era and bench all have to move the match." }, upsets: { title: "UPSETS STAY ALIVE", description: "Great teams lose. Underdogs steal games. That is part of football." }, results: { title: "RESULTS CAN BE REPLAYED", description: "Every seed can be rerun, so a weird result can be traced instead of guessed at." } } },
    final: { eyebrow: "ENOUGH THEORY", title: "BUILD AN XI.", description: "Then see if the model agrees with you.", cta: "START DRAFT", rail: "1,832 CARDS · 15 CHAMPIONS · ONE ENGINE" },
  },
};

function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      target[key] = deepMerge(
        (target[key] as Record<string, unknown> | undefined) ?? {},
        value as Record<string, unknown>,
      );
    } else if (!(key in target)) target[key] = value;
  }
  return target;
}

const contentValues = new Set<string>();
const add = (...values: Array<string | null | undefined>) => values.forEach((value) => value && contentValues.add(value));

for (const player of players) {
  add(player.archetype, player.countryName, player.tournamentFinish);
  for (const achievement of player.achievements) add(achievement.label, achievement.description);
}
for (const manager of managers) {
  add(manager.countryName, manager.teamName, manager.style, manager.tacticalIdentity);
  for (const achievement of manager.achievements) add(achievement.label, achievement.description);
}
for (const formation of formations) add(formation.description, formation.tacticalDifficulty, ...formation.managerStyles);
for (const champion of landingChampions) add(champion.nationName, champion.championFact, champion.tacticalLabel);
for (const opponent of [...historicalOpponents, worldCupAllStars]) {
  add(opponent.nationName, opponent.difficulty, opponent.championFact, opponent.tacticalProfile, opponent.allStars?.subtitle);
}
[
  "GROUP STAGE", "ROUND OF 32", "ROUND OF 16", "QUARTERFINAL", "SEMIFINAL", "WORLD CUP FINAL", "TOURNAMENT COMPLETE",
  "R32", "R16", "QF", "SF", "FINAL", "Tournament over", "The World Cup ends in the group stage.",
  "The journey ends in the Round of 32.", "The journey ends in the Round of 16.", "The dream ends in the quarterfinal.",
  "The dream ends in the semifinal.", "So close to the trophy.", "active", "qualified", "eliminated", "champion",
  "balanced", "possession", "pressing", "fluid", "counter", "direct", "defensive", "Neutral", "All Eras",
].forEach((value) => add(value));

const sourceFiles = [
  "src/app/engineering/ModelExplorer.tsx", "src/app/engineering/EraLab.tsx", "src/app/engineering/MatchStateLab.tsx",
  "src/app/engineering/SeedTrace.tsx",
];
for (const sourceFile of sourceFiles) {
  const source = fs.readFileSync(path.join(root, sourceFile), "utf8");
  for (const match of source.matchAll(/(["'`])([^\n\\]*?[A-Za-z][^\n\\]*?)\1/g)) {
    const value = match[2].trim();
    if (value.length >= 3 && value.length <= 320 && !/[/{]|className|data-|styles\.|@\//.test(value)) add(value);
  }
}

[
  "World Cup Run now uses completed 2026 tournament performance. Start a new run to use the updated opponent model.",
  "Your tournament field was rebuilt to preserve the active archive boundary. Generate a new World Cup Run to continue.",
  "Your previous save used an unavailable manager and was safely returned to manager selection.",
  "We repaired an older or invalid save. Duplicate, missing, incompatible, or infeasible entries were removed.",
  "The saved opponent was unavailable and has been cleared.",
  "Trophy XI upgraded this draft to Draft Engine v2 with squad-aware five-card offers.",
  "Playable World Cup All-Stars was removed. Your era is preserved; choose one of three tournament managers to begin a normal draft.",
  "World Cup Run v6 now rotates exact historical champion Final bosses and preserves their archive ratings. Your draft is preserved; start a new run.",
  "Trophy XI upgraded your save to the expanded tournament-manager archive and card-specific face system.",
].forEach((value) => add(value));

const content = Object.fromEntries([...contentValues].sort().map((value) => [contentKey(value), value]));
deepMerge(messages, additions);
messages.content = content;
fs.writeFileSync(file, `${JSON.stringify(messages, null, 2)}\n`);
console.log(`Seeded ${Object.keys(content).length} localized content values.`);
