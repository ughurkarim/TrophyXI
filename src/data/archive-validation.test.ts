import { describe, expect, it } from "vitest";
import { draftEras } from "@/data/eras";
import { draftEligibleManagers, managers } from "@/data/managers";
import playerTournamentsJson from "@/data/player-tournaments.generated.json";
import completed2026RosterJson from "@/data/player-tournaments-2026.generated.json";
import ratingAudit2026Json from "@/data/player-ratings-2026.generated.json";
import requestedIdentityJson from "@/data/requested-player-identities.generated.json";
import {
  canonicalPlayerIdentityPortraits,
  importedPlayerIdentityPortraitRecords,
} from "@/data/player-identity-portraits";
import {
  gameFacePathFor,
  identityFallbackPlayerImages,
  imageAttributions,
  imagesById,
  managerImages,
  playerImages,
  tournamentEditionPlayerImages,
} from "@/data/player-images";
import {
  allPlayersBeforeIdentityPruning,
  draftEligiblePlayers,
  isPlayablePlayerCard,
  players,
} from "@/data/players";
import { PLAYER_WORLD_CUP_YEARS } from "@/types/game";
import { generateManagerOptions } from "@/engine/draft";

const playerTournamentArchive = playerTournamentsJson as unknown as {
  identities: Record<string, { tournamentYear: number }[]>;
};
const completed2026Roster = completed2026RosterJson as unknown as {
  players: Array<{ identityId: string; teamCode: string }>;
  teams: Array<{ teamCode: string; playerCount: number }>;
};
const expectedHistoricalCardCount = Object.values(
  playerTournamentArchive.identities,
).reduce((total, tournaments) => total + tournaments.length, 0);
const expectedIdentityCount = new Set([
  ...Object.keys(playerTournamentArchive.identities),
  ...completed2026Roster.players.map((player) => player.identityId),
]).size;

describe("expanded archive contracts", () => {
  it("keeps the exact card and role targets", () => {
    const defenders = ["LB", "LCB", "CB", "RCB", "RB", "LWB", "RWB"];
    const midfielders = ["DM", "CM", "AM", "LM", "RM"];
    const attackers = ["LW", "RW", "CF", "ST"];
    expect(allPlayersBeforeIdentityPruning).toHaveLength(
      expectedHistoricalCardCount + completed2026Roster.players.length,
    );
    expect(
      new Set(
        allPlayersBeforeIdentityPruning.map(
          (player) => player.playerIdentityId,
        ),
      ).size,
    ).toBe(expectedIdentityCount);
    expect(
      [
        "carlos-alberto",
        "gerson",
        "ladislao-mazurkiewicz",
        "gianni-rivera",
        "berti-vogts",
        "dirceu",
        "osvaldo-ardiles",
        "karl-heinz-rummenigge",
        "marco-tardelli",
        "bruno-conti",
        "alain-giresse",
        "careca",
        "jean-marie-pfaff",
        "rudi-voller",
        "peter-shilton",
        "carlos-valderrama",
        "rene-higuita",
        "jorginho",
        "branco",
        "aldair",
        "patrick-vieira",
        "zvonimir-boban",
        "jay-jay-okocha",
        "youri-djorkaeff",
        "juan-sebastian-veron",
        "raul",
        "franck-ribery",
        "xabi-alonso",
        "fabio-grosso",
        "gerard-pique",
        "edinson-cavani",
        "mario-gotze",
        "jerome-boateng",
        "juan-cuadrado",
        "mario-mandzukic",
        "casemiro",
        "bruno-fernandes",
        "vinicius-junior",
        "pepe",
      ].every((identityId) =>
        allPlayersBeforeIdentityPruning.some(
          (player) => player.playerIdentityId === identityId,
        ),
      ),
    ).toBe(true);
    const roleCounts = [
      allPlayersBeforeIdentityPruning.filter(
        (player) => player.primaryPosition === "GK",
      ).length,
      allPlayersBeforeIdentityPruning.filter((player) =>
        defenders.includes(player.primaryPosition),
      ).length,
      allPlayersBeforeIdentityPruning.filter((player) =>
        midfielders.includes(player.primaryPosition),
      ).length,
      allPlayersBeforeIdentityPruning.filter((player) =>
        attackers.includes(player.primaryPosition),
      ).length,
    ];
    expect(roleCounts.every((count) => count >= 500)).toBe(true);
    expect(roleCounts.reduce((total, count) => total + count, 0)).toBe(
      allPlayersBeforeIdentityPruning.length,
    );
    const expectedPlayableIds = new Set(
      allPlayersBeforeIdentityPruning
        .filter(isPlayablePlayerCard)
        .map((player) => player.id),
    );
    expect(new Set(players.map((player) => player.id))).toEqual(
      expectedPlayableIds,
    );
    for (const player of allPlayersBeforeIdentityPruning) {
      expect(
        players.some(
          (candidate) => candidate.id === player.id,
        ),
      ).toBe(isPlayablePlayerCard(player));
    }
  });

  it("covers every requested historical identity and each sourced tournament", () => {
    const actualYearsByIdentity = new Map<string, number[]>();
    for (const player of allPlayersBeforeIdentityPruning) {
      if (player.tournamentYear === 2026) continue;
      const years = actualYearsByIdentity.get(player.playerIdentityId) ?? [];
      years.push(player.tournamentYear);
      actualYearsByIdentity.set(player.playerIdentityId, years);
    }

    expect(requestedIdentityJson.identities).toHaveLength(434);
    for (const requested of requestedIdentityJson.identities) {
      const sourcedYears = playerTournamentArchive.identities[
        requested.identityId
      ]?.map((tournament) => tournament.tournamentYear);
      expect(sourcedYears, requested.identityId).toBeDefined();
      expect(actualYearsByIdentity.get(requested.identityId), requested.identityId)
        .toEqual(sourcedYears);
      expect(
        requested.featuredYears.every((year) => sourcedYears?.includes(year)),
        `${requested.identityId} is missing a requested tournament`,
      ).toBe(true);
    }
  });

  it("keeps the complete 2026 set and rejects explicitly invalid editions", () => {
    const cards2026 = allPlayersBeforeIdentityPruning.filter(
      (player) => player.tournamentYear === 2026,
    );
    expect(cards2026).toHaveLength(completed2026Roster.players.length);
    expect(
      new Set(cards2026.map((player) => player.playerIdentityId)).size,
    ).toBe(completed2026Roster.players.length);
    expect(completed2026Roster.teams).toHaveLength(48);
    expect(
      completed2026Roster.teams.every((team) => team.playerCount === 26),
    ).toBe(true);
    expect(
      cards2026.filter((player) => player.countryCode === "CRO"),
    ).toHaveLength(26);
    const auditedByCardId = new Map(
      ratingAudit2026Json.cards.map((card) => [card.cardId, card]),
    );
    expect(ratingAudit2026Json.cards).toHaveLength(
      completed2026Roster.players.length,
    );
    expect(auditedByCardId.size).toBe(completed2026Roster.players.length);
    expect(
      cards2026.every(
        (player) =>
          auditedByCardId.get(player.id)?.overall === player.overall,
      ),
    ).toBe(true);
    expect(
      allPlayersBeforeIdentityPruning
        .filter((player) => player.playerIdentityId === "jens-lehmann")
        .map((player) => player.tournamentYear),
    ).toEqual([1998, 2002, 2006]);
    expect(
      allPlayersBeforeIdentityPruning.some((player) =>
        [
          "neymar-2010",
          "michael-essien-2010",
          "radamel-falcao-2014",
          "samuel-etoo-2006",
          "youssef-msakni-2018",
        ].includes(player.id),
      ),
    ).toBe(false);
  });

  it("covers every tournament, confederation, and quality band", () => {
    expect(
      new Set(
        allPlayersBeforeIdentityPruning.map(
          (player) => player.tournamentYear,
        ),
      ),
    ).toEqual(new Set(PLAYER_WORLD_CUP_YEARS));
    expect(
      new Set(
        allPlayersBeforeIdentityPruning.map(
          (player) => player.confederation,
        ),
      ),
    ).toEqual(
      new Set(["UEFA", "CONMEBOL", "CONCACAF", "CAF", "AFC", "OFC"]),
    );
    expect(
      allPlayersBeforeIdentityPruning.filter(
        (player) => player.confederation === "OFC",
      ).length,
    ).toBeGreaterThanOrEqual(5);
    expect(
      new Set(
        allPlayersBeforeIdentityPruning.map(
          (player) => player.qualityBand,
        ),
      ),
    ).toEqual(
      new Set([
        "iconic",
        "elite",
        "standout",
        "reliable",
        "role-player",
        "limited",
      ]),
    );
  });

  it("keeps every valid player draftable with real or pending photo status", () => {
    expect(managers).toHaveLength(47);
    expect(new Set(managers.map((manager) => manager.managerIdentityId)).size).toBe(
      47,
    );
    expect(draftEligiblePlayers).toHaveLength(players.length);
    expect(draftEligibleManagers).toHaveLength(47);
    expect(imageAttributions).toHaveLength(
      playerImages.length + managerImages.length,
    );
    expect(players.every((player) => player.isDraftEligible)).toBe(true);
    expect(
      players.every((player) => player.draftIneligibilityReason === null),
    ).toBe(true);
    expect(
      players.filter((player) => !imagesById.has(player.imageId)),
    ).toHaveLength(
      players.filter((player) => !imagesById.has(player.imageId)).length,
    );
    expect(identityFallbackPlayerImages).toEqual([]);
    expect(
      [
        "mario-kempes-1982",
        "gerd-muller-1974",
        "teofilo-cubillas-1978",
        "franz-beckenbauer-1970",
        "franz-beckenbauer-1974",
        "gianluigi-buffon-2010",
        "sergio-ramos-2010",
        "lionel-messi-2006",
      ].every((id) => !imagesById.has(id)),
    ).toBe(true);
    expect(imagesById.get("lionel-messi-2014")).toMatchObject({
      file: "/players/game-faces/lionel-messi-2014.png",
      fallback: false,
      exactTournamentImage: true,
    });
  });

  it("uses only audited strict-edition game faces for target cards", () => {
    expect(
      canonicalPlayerIdentityPortraits
        .filter(
          (portrait) =>
            portrait.sourceTournamentYear === 2026 &&
            portrait.sourceKind === "sofifa-game-face",
        )
        .every((portrait) =>
          portrait.sourceImageUrl?.endsWith("/26_120.png"),
        ),
    ).toBe(true);
    expect(
      importedPlayerIdentityPortraitRecords
        .filter((portrait) => portrait.tournamentYear === 2026)
        .some((portrait) => portrait.sourceImageUrl.endsWith("/25_120.png")),
    ).toBe(false);

    const requiredEditionByYear = new Map([
      [2014, { edition: "FIFA 14", launchYear: 2013 }],
      [2018, { edition: "FIFA 18", launchYear: 2017 }],
      [2022, { edition: "FIFA 23", launchYear: 2022 }],
      [2026, { edition: "EA SPORTS FC 26", launchYear: 2025 }],
    ]);
    const runtimeTargetFaces = playerImages.filter((portrait) =>
      requiredEditionByYear.has(portrait.tournamentYear),
    );
    expect(new Set(runtimeTargetFaces.map((portrait) => portrait.id))).toEqual(
      new Set(
        tournamentEditionPlayerImages.map((portrait) => portrait.id),
      ),
    );
    expect(
      runtimeTargetFaces.every((portrait) => {
        const required = requiredEditionByYear.get(
          portrait.tournamentYear,
        );
        return (
          Boolean(required) &&
          !portrait.fallback &&
          portrait.file ===
            `/players/game-faces/${portrait.id}.png` &&
          portrait.exactTournamentImage &&
          portrait.gameEdition === required?.edition &&
          portrait.gameEditionLaunchYear === required?.launchYear &&
          portrait.matchQuality === "edition-verified"
        );
      }),
    ).toBe(true);
    expect(identityFallbackPlayerImages).toEqual([]);
  });

  it("enforces the 99 cap and broad tournament-card rating distribution", () => {
    expect(Math.max(...draftEligiblePlayers.map((player) => player.overall))).toBe(
      99,
    );
    expect(
      draftEligiblePlayers
        .filter((player) => player.overall === 99)
        .map((player) => player.id),
    ).toEqual([
      "diego-maradona-1986",
      "lionel-messi-2022",
      "pele-1970",
    ]);
    expect(players.find((player) => player.id === "rodri-2026")?.overall).toBe(
      96,
    );
    expect(
      draftEligiblePlayers.filter((player) => player.overall >= 95).length,
    ).toBeLessThanOrEqual(30);
    expect(
      draftEligiblePlayers.filter((player) => player.overall >= 90).length,
    ).toBeLessThan(draftEligiblePlayers.length * 0.3);
    expect(
      draftEligiblePlayers.filter((player) => player.overall < 80).length,
    ).toBeGreaterThanOrEqual(100);
    expect(
      new Set(draftEligiblePlayers.map((player) => player.statusTier)),
    ).toEqual(
      new Set([
        "legend",
        "icon",
        "elite",
        "standout",
        "reliable",
        "role-player",
        "limited",
      ]),
    );
    const silverBallPlayers = draftEligiblePlayers.filter((player) =>
      player.achievements.some(
        (achievement) => achievement.label === "Silver Ball",
      ),
    );
    expect(silverBallPlayers.length).toBeGreaterThan(0);
    expect(silverBallPlayers.every((player) => player.overall >= 92)).toBe(
      true,
    );
    expect(players.find((player) => player.id === "eden-hazard-2018")?.overall)
      .toBeGreaterThanOrEqual(92);
    expect(players.find((player) => player.id === "gary-lineker-1990")?.overall)
      .toBe(91);
    expect(players.find((player) => player.id === "kylian-mbappe-2026"))
      .toMatchObject({
        overall: 98,
        tournamentStats: { appearances: 8, goals: 10 },
      });
    expect(
      players
        .find((player) => player.id === "kylian-mbappe-2026")
        ?.achievements.map((achievement) => achievement.label),
    ).toContain("Golden Boot");
    expect(players.find((player) => player.id === "unai-simon-2026"))
      .toMatchObject({
        overall: 95,
        tournamentStats: {
          appearances: 8,
          cleanSheets: 7,
          goalsConceded: 1,
        },
      });
  });

  it("keeps the audited 2014 James Rodríguez card elite and fully evidenced", () => {
    const james = players.find(
      (player) => player.id === "james-rodriguez-2014",
    )!;
    expect(james.overall).toBe(94);
    expect(james.tournamentStats).toMatchObject({
      appearances: 5,
      starts: 4,
      minutes: 399,
      goals: 6,
      assists: 2,
    });
    expect(james.achievements.map((item) => item.label)).toContain(
      "Golden Boot",
    );
    for (const field of [
      "appearances",
      "starts",
      "minutes",
      "goals",
      "assists",
    ] as const) {
      expect(james.statSourcesByField[field]?.url).toMatch(/^https:\/\//);
    }
  });

  it("keeps tournament versions on independent image keys", () => {
    const messi = players.filter(
      (player) => player.playerIdentityId === "lionel-messi",
    );
    const ronaldo = players.filter(
      (player) => player.playerIdentityId === "ronaldo",
    );
    const cristiano = players.filter(
      (player) => player.playerIdentityId === "cristiano-ronaldo",
    );
    expect(messi.map((player) => player.imageId)).toEqual([
      "lionel-messi-2006",
      "lionel-messi-2010",
      "lionel-messi-2014",
      "lionel-messi-2018",
      "lionel-messi-2022",
      "lionel-messi-2026",
    ]);
    expect(ronaldo.map((player) => player.imageId)).toEqual([
      "ronaldo-1994",
      "ronaldo-1998",
      "ronaldo-2002",
      "ronaldo-2006",
    ]);
    expect(cristiano.map((player) => player.imageId)).toEqual([
      "cristiano-ronaldo-2006",
      "cristiano-ronaldo-2010",
      "cristiano-ronaldo-2014",
      "cristiano-ronaldo-2018",
      "cristiano-ronaldo-2022",
      "cristiano-ronaldo-2026",
    ]);
    expect(gameFacePathFor("player", "lionel-messi-2014", 2014)).toBe(
      "/assets/players/2014/lionel-messi-2014.png",
    );
    expect(gameFacePathFor("player", "lionel-messi-2022", 2022)).toBe(
      "/assets/players/2022/lionel-messi-2022.png",
    );
    expect(gameFacePathFor("player", "lionel-messi-2026", 2026)).toBe(
      "/assets/players/2026/lionel-messi-2026.png",
    );
    expect(gameFacePathFor("manager", "lionel-scaloni-2022", 2022)).toBe(
      "/assets/managers/2022/lionel-scaloni-2022.png",
    );
    expect(messi.every((player) => player.isDraftEligible)).toBe(true);
    expect(new Set(messi.map((player) => player.id)).size).toBe(6);
    expect(new Set(cristiano.map((player) => player.id)).size).toBe(6);
    expect(
      players.some((player, index) =>
        players.slice(index + 1).some(
          (other) =>
            other.playerIdentityId === player.playerIdentityId &&
            other.overall === player.overall,
        ),
      ),
    ).toBe(true);
  });

  it("stores sourced career accolades and curated Top 100 independently", () => {
    const messi = players.find((player) => player.id === "lionel-messi-2022")!;
    expect(messi.top100Player).toBe(true);
    expect(messi.top100Source).toMatchObject({
      listName: "Trophy XI Curated Top 100",
      year: 2026,
    });
    expect(
      messi.careerAccolades.find(
        (accolade) => accolade.label === "World Cup Golden Ball",
      ),
    ).toMatchObject({ count: 2 });
    expect(
      messi.careerAccolades.find(
        (accolade) =>
          accolade.label === "UEFA Champions League Champion",
      ),
    ).toMatchObject({ count: 4 });
    expect(
      players.some((player) => player.top100Player && player.overall < 90),
    ).toBe(true);
  });

  it("resolves one canonical career accolade list for every multi-card identity", () => {
    const cardsByIdentity = new Map<
      string,
      typeof allPlayersBeforeIdentityPruning
    >();
    for (const player of allPlayersBeforeIdentityPruning) {
      const cards = cardsByIdentity.get(player.playerIdentityId) ?? [];
      cards.push(player);
      cardsByIdentity.set(player.playerIdentityId, cards);
    }

    for (const cards of cardsByIdentity.values()) {
      if (cards.length < 2) continue;
      const [reference, ...otherCards] = cards;
      for (const card of otherCards) {
        expect(card.careerAccolades).toEqual(reference.careerAccolades);
      }
    }
  });

  it("gives every Perišić card the complete canonical list without non-winning honors", () => {
    const perisicCards = allPlayersBeforeIdentityPruning.filter(
      (player) => player.playerIdentityId === "ivan-perisic",
    );
    expect(
      perisicCards.map((player) => player.id).sort(),
    ).toEqual([
      "ivan-perisic-2014",
      "ivan-perisic-2018",
      "ivan-perisic-2022",
      "ivan-perisic-2026",
    ]);

    const canonicalAccolades = perisicCards[0]!.careerAccolades;
    for (const card of perisicCards.slice(1)) {
      expect(card.careerAccolades).toEqual(canonicalAccolades);
    }
    expect(canonicalAccolades).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "UEFA Champions League Champion",
        }),
        expect.objectContaining({
          label: "Coppa Italia Winner",
        }),
        expect.objectContaining({
          label: "DFB-Pokal Winner",
          count: 3,
        }),
        expect.objectContaining({
          label: "Bundesliga Champion",
          count: 2,
        }),
        expect.objectContaining({
          label: "Eredivisie Champion",
          count: 2,
        }),
        expect.objectContaining({
          label: "Serie A Champion",
        }),
        expect.objectContaining({
          label: "Croatian Footballer of the Year",
        }),
        expect.objectContaining({
          label: "Jupiler Pro League Player of the Year",
        }),
        expect.objectContaining({
          label: "Jupiler Pro League Top Goalscorer",
        }),
        expect.objectContaining({
          label: "KNVB Cup Top Goalscorer",
        }),
      ]),
    );
    expect(
      canonicalAccolades
        .map((accolade) => `${accolade.label} ${accolade.description ?? ""}`)
        .join(" "),
    ).not.toMatch(/runner[- ]?up|super[\s-]?cup|supercopa|supercoppa/i);
  });

  it("keeps tournament statistics and awards specific to each card", () => {
    const messi2014 = players.find(
      (player) => player.id === "lionel-messi-2014",
    )!;
    const messi2022 = players.find(
      (player) => player.id === "lionel-messi-2022",
    )!;

    expect(messi2014.careerAccolades).toEqual(messi2022.careerAccolades);
    expect(messi2014.tournamentStats).not.toEqual(messi2022.tournamentStats);
    expect(messi2014.achievements).not.toEqual(messi2022.achievements);
    expect(messi2014.achievements.map((award) => award.label)).toEqual([
      "Golden Ball",
    ]);
    expect(messi2022.achievements.map((award) => award.label)).toEqual([
      "Golden Ball",
      "Silver Boot",
    ]);
  });

  it("attaches complete career context to every identity without inventing accolades", () => {
    const identityRepresentatives = [
      ...new Map(
        allPlayersBeforeIdentityPruning.map((player) => [
          player.playerIdentityId,
          player,
        ]),
      ).values(),
    ];
    expect(identityRepresentatives).toHaveLength(expectedIdentityCount);
    expect(
      identityRepresentatives.every(
        (player) => player.careerStats !== null,
      ),
    ).toBe(true);
    expect(
      identityRepresentatives.some(
        (player) => player.careerAccolades.length === 0,
      ),
    ).toBe(true);

    const giroud = players.find(
      (player) => player.id === "olivier-giroud-2018",
    )!;
    expect(giroud.careerAccolades).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "UEFA Champions League Champion",
          description: expect.stringContaining("20/21"),
        }),
        expect.objectContaining({
          label: "FIFA World Cup Champion",
        }),
      ]),
    );
    expect(
      giroud.careerAccolades.some((accolade) =>
        /2020|2021|20\/21/.test(
          `${accolade.label} ${accolade.description ?? ""}`,
        ),
      ),
    ).toBe(true);
    expect(giroud.careerAccolades.every((accolade) => accolade.verified)).toBe(
      true,
    );
    expect(
      identityRepresentatives
        .flatMap((player) => player.careerAccolades)
        .some((accolade) => accolade.label.startsWith("World Cup Squad — ")),
    ).toBe(false);
  });

  it("never resolves a historical card with another tournament year's face", () => {
    expect(identityFallbackPlayerImages).toEqual([]);
    expect(imagesById.has("cristiano-ronaldo-2006")).toBe(false);
    expect(imagesById.has("pele-1970")).toBe(false);
    expect(imagesById.has("siphiwe-tshabalala-2010")).toBe(false);
  });

  it("produces three deterministic manager identities in every environment", () => {
    for (const era of draftEras) {
      const first = generateManagerOptions(
        draftEligibleManagers,
        era.id,
        4404,
      );
      expect(first).toHaveLength(3);
      expect(
        generateManagerOptions(draftEligibleManagers, era.id, 4404),
      ).toEqual(first);
      expect(first.every((manager) => manager.isDraftEligible)).toBe(true);
    }
  });
});
