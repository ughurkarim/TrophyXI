import { describe, expect, it } from "vitest";
import { draftEras } from "@/data/eras";
import { draftEligibleManagers, managers } from "@/data/managers";
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
    expect(players).toHaveLength(629);
    expect(new Set(players.map((player) => player.playerIdentityId)).size).toBe(
      287,
    );
    expect(
      players.filter((player) => player.primaryPosition === "GK"),
    ).toHaveLength(73);
    expect(
      players.filter((player) => defenders.includes(player.primaryPosition)),
    ).toHaveLength(155);
    expect(
      players.filter((player) => midfielders.includes(player.primaryPosition)),
    ).toHaveLength(185);
    expect(
      players.filter((player) => attackers.includes(player.primaryPosition)),
    ).toHaveLength(216);
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
    expect(managers).toHaveLength(49);
    expect(new Set(managers.map((manager) => manager.managerIdentityId)).size).toBe(
      39,
    );
    expect(draftEligiblePlayers).toHaveLength(629);
    expect(draftEligibleManagers).toHaveLength(49);
    expect(imageAttributions).toHaveLength(
      playerImages.length + managerImages.length,
    );
    expect(players.every((player) => player.isDraftEligible)).toBe(true);
    expect(
      players.every((player) => player.draftIneligibilityReason === null),
    ).toBe(true);
    expect(
      players.filter((player) => !imagesById.has(player.imageId)),
    ).toHaveLength(629 - playerImages.length);
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
    expect(userSuppliedPlayerImages).toHaveLength(29);
    expect(
      userSuppliedPlayerImages.every(
        (image) =>
          image.photographedYear === null &&
          image.exactTournamentImage === false &&
          image.matchQuality === "user-supplied-permissioned",
      ),
    ).toBe(true);
    expect(identityFallbackPlayerImages).toHaveLength(59);
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
      file: "/assets/players/2002/gianluigi-buffon-2002.png",
      fallback: true,
      exactTournamentImage: false,
    });
    expect(imagesById.has("sergio-ramos-2010")).toBe(false);
    const messi2006 = imagesById.get("lionel-messi-2006");
    expect(messi2006?.file).toBe(
      "/assets/players/2006/lionel-messi-2006.png",
    );
    expect(messi2006?.cacheVersion).toBe("1f22e4d1c9abdbeb");
  });

  it("enforces the 99 cap and broad tournament-card rating distribution", () => {
    expect(Math.max(...draftEligiblePlayers.map((player) => player.overall))).toBe(
      99,
    );
    expect(
      draftEligiblePlayers
        .filter((player) => player.overall === 99)
        .map((player) => player.id),
    ).toEqual(
      expect.arrayContaining([
        "pele-1970",
        "diego-maradona-1986",
        "lionel-messi-2022",
      ]),
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

  it("attaches a reviewed FBref profile to every identity and Giroud's honors", () => {
    const identityRepresentatives = [
      ...new Map(
        players.map((player) => [player.playerIdentityId, player]),
      ).values(),
    ];
    expect(identityRepresentatives).toHaveLength(287);
    expect(
      identityRepresentatives.every(
        (player) =>
          player.careerStats?.sourceName === "FBref" &&
          player.careerStats.sourceUrl.startsWith(
            "https://fbref.com/en/players/",
          ),
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
    expect(
      giroud.careerAccolades.every(
        (accolade) =>
          accolade.sourceName === "FBref" &&
          accolade.sourceUrl ===
            "https://fbref.com/en/players/16ceb862/Olivier-Giroud",
      ),
    ).toBe(true);
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
