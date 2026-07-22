import { describe, expect, it } from "vitest";
import { draftEras } from "@/data/eras";
import { draftEligibleManagers, managers } from "@/data/managers";
import playerTournamentsJson from "@/data/player-tournaments.generated.json";
import requestedIdentityJson from "@/data/requested-player-identities.generated.json";
import {
  gameFacePathFor,
  historicalPlayerImages,
  identityFallbackPlayerImages,
  imageAttributions,
  imagesById,
  managerImages,
  playerImages,
  userSuppliedPlayerImages,
} from "@/data/player-images";
import { draftEligiblePlayers, players } from "@/data/players";
import { PLAYER_WORLD_CUP_YEARS } from "@/types/game";
import { generateManagerOptions } from "@/engine/draft";

describe("expanded archive contracts", () => {
  it("keeps the exact card and role targets", () => {
    const defenders = ["LB", "LCB", "CB", "RCB", "RB", "LWB", "RWB"];
    const midfielders = ["DM", "CM", "AM", "LM", "RM"];
    const attackers = ["LW", "RW", "CF", "ST"];
    expect(players).toHaveLength(1_376);
    expect(new Set(players.map((player) => player.playerIdentityId)).size).toBe(
      676,
    );
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
        players.some((player) => player.playerIdentityId === identityId),
      ),
    ).toBe(true);
    expect(
      players.filter((player) => player.primaryPosition === "GK"),
    ).toHaveLength(161);
    expect(
      players.filter((player) => defenders.includes(player.primaryPosition)),
    ).toHaveLength(307);
    expect(
      players.filter((player) => midfielders.includes(player.primaryPosition)),
    ).toHaveLength(449);
    expect(
      players.filter((player) => attackers.includes(player.primaryPosition)),
    ).toHaveLength(459);
  });

  it("covers every requested historical identity and each sourced tournament", () => {
    const actualYearsByIdentity = new Map<string, number[]>();
    for (const player of players) {
      if (player.tournamentYear === 2026) continue;
      const years = actualYearsByIdentity.get(player.playerIdentityId) ?? [];
      years.push(player.tournamentYear);
      actualYearsByIdentity.set(player.playerIdentityId, years);
    }

    expect(requestedIdentityJson.identities).toHaveLength(434);
    for (const requested of requestedIdentityJson.identities) {
      const sourcedYears = playerTournamentsJson.identities[
        requested.identityId as keyof typeof playerTournamentsJson.identities
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
    const cards2026 = players.filter((player) => player.tournamentYear === 2026);
    expect(cards2026).toHaveLength(132);
    expect(
      new Set(cards2026.map((player) => player.playerIdentityId)).size,
    ).toBe(132);
    expect(
      players
        .filter((player) => player.playerIdentityId === "jens-lehmann")
        .map((player) => player.tournamentYear),
    ).toEqual([1998, 2002, 2006]);
    expect(
      players.some((player) =>
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
      new Set(players.map((player) => player.tournamentYear)),
    ).toEqual(new Set(PLAYER_WORLD_CUP_YEARS));
    expect(new Set(players.map((player) => player.confederation))).toEqual(
      new Set(["UEFA", "CONMEBOL", "CONCACAF", "CAF", "AFC", "OFC"]),
    );
    expect(
      players.filter((player) => player.confederation === "OFC").length,
    ).toBeGreaterThanOrEqual(5);
    expect(new Set(players.map((player) => player.qualityBand))).toEqual(
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
    expect(draftEligiblePlayers).toHaveLength(1_376);
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
    ).toHaveLength(players.length - playerImages.length);
    expect(
      historicalPlayerImages,
    ).toHaveLength(56);
    expect(
      historicalPlayerImages
        .every(
          (image) =>
            image.tournamentYear <= 2002 &&
            image.photographedYear === null &&
            image.exactTournamentImage === false,
        ),
    ).toBe(true);
    expect(userSuppliedPlayerImages).toHaveLength(55);
    expect(
      userSuppliedPlayerImages.every(
        (image) =>
          image.photographedYear === null &&
          image.exactTournamentImage === false &&
          image.matchQuality === "user-supplied-permissioned",
      ),
    ).toBe(true);
    expect(
      identityFallbackPlayerImages.every(
        (image) =>
          image.fallback &&
          image.gameEdition === null &&
          ["identity-only-permissioned", "user-supplied-permissioned"].includes(
            image.matchQuality,
          ),
      ),
    ).toBe(true);
    expect(imagesById.get("mario-kempes-1982")).toMatchObject({
      file: "/assets/players/1974/mario-kempes-74.png",
      fallback: true,
      exactTournamentImage: false,
    });
    expect(imagesById.get("gerd-muller-1974")).toMatchObject({
      file: "/assets/players/1970/gerd-muller-1970.png",
      fallback: true,
      exactTournamentImage: false,
    });
    expect(imagesById.get("teofilo-cubillas-1978")).toMatchObject({
      file: "/assets/players/1970/teofilo-cubillas-1970.png",
      fallback: true,
      exactTournamentImage: false,
    });
    expect(imagesById.get("franz-beckenbauer-1970")).toMatchObject({
      file: "/assets/players/1970/franz-beckenbauer-1970.png",
      fallback: false,
      exactTournamentImage: false,
    });
    expect(imagesById.get("franz-beckenbauer-1974")).toMatchObject({
      file: "/assets/players/1970/franz-beckenbauer-1970.png",
      fallback: true,
      exactTournamentImage: false,
    });
    expect(imagesById.get("sofyan-amrabat-2018")).toMatchObject({
      file: "/assets/players/2022/sofyan-amrabat-2022.webp",
      fallback: true,
      exactTournamentImage: false,
    });
    expect(imagesById.get("gianluigi-buffon-2010")).toMatchObject({
      file: "/assets/players/2014/gianluigi-buffon-2014.png",
      fallback: true,
      exactTournamentImage: false,
    });
    expect(imagesById.get("sergio-ramos-2010")).toMatchObject({
      file: "/assets/players/2014/sergio-ramos-2014.png",
      fallback: true,
      exactTournamentImage: false,
    });
    const messi2006 = imagesById.get("lionel-messi-2006");
    expect(messi2006?.file).toBe(
      "/assets/players/2006/lionel-messi-2006.png",
    );
    expect(messi2006?.cacheVersion).toBe("ce83969b96dab437");
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
    ).toBeLessThanOrEqual(25);
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
        overall: 93,
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
    expect(messi.careerAccolades).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "World Cup Golden Ball",
          count: 2,
        }),
        expect.objectContaining({
          label: "Champions League Winner",
          count: 4,
        }),
      ]),
    );
    expect(
      players.some((player) => player.top100Player && player.overall < 90),
    ).toBe(true);
  });

  it("attaches career context and at least one accolade to every identity", () => {
    const identityRepresentatives = [
      ...new Map(
        players.map((player) => [player.playerIdentityId, player]),
      ).values(),
    ];
    expect(identityRepresentatives).toHaveLength(676);
    expect(
      identityRepresentatives.every(
        (player) =>
          player.careerStats !== null && player.careerAccolades.length > 0,
      ),
    ).toBe(true);

    const giroud = players.find(
      (player) => player.id === "olivier-giroud-2018",
    )!;
    expect(giroud.careerAccolades).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Domestic League Champion",
          count: 2,
        }),
        expect.objectContaining({
          label: "UEFA Champions League Champion",
          count: 1,
        }),
        expect.objectContaining({
          label: "World Cup Champion",
          count: 1,
        }),
      ]),
    );
    expect(giroud.careerAccolades.every((accolade) => accolade.verified)).toBe(
      true,
    );
  });

  it("resolves every card once an identity has any local portrait", () => {
    const cardsByIdentity = new Map<string, typeof players>();
    for (const player of players) {
      const cards = cardsByIdentity.get(player.playerIdentityId) ?? [];
      cards.push(player);
      cardsByIdentity.set(player.playerIdentityId, cards);
    }

    for (const [identityId, cards] of cardsByIdentity) {
      if (!cards.some((player) => imagesById.has(player.imageId))) continue;
      expect(
        cards.every((player) => imagesById.has(player.imageId)),
        `${identityId} does not resolve an exact or closest-year portrait for every card`,
      ).toBe(true);
    }
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
