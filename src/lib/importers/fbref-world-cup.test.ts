import { describe, expect, it } from "vitest";
import {
  isFbrefAccessChallenge,
  parseFbrefWorldCupCompetitionPages,
  parseFbrefWorldCupProfilePage,
  worldCupSourceFor,
} from "@/lib/importers/fbref-world-cup";

const cell = (stat: string, value: string, element = "td") =>
  `<${element} data-stat="${stat}">${value}</${element}>`;

describe("FBref World Cup importer", () => {
  it("parses nullable standard and goalkeeper fields without inventing zeroes", () => {
    const standardHtml = `
      <table id="stats_standard"><tbody><tr>
        ${cell("player", '<a href="/en/players/d70ce98e/Lionel-Messi">Lionel Messi</a>', "th")}
        ${cell("team", "Argentina")}
        ${cell("games", "7")}
        ${cell("games_starts", "7")}
        ${cell("minutes", "690")}
        ${cell("goals", "7")}
        ${cell("assists", "3")}
      </tr></tbody></table>`;
    const keeperHtml = `
      <table id="stats_keeper"><tbody><tr>
        ${cell("player", '<a href="/en/players/11111111/Example-Keeper">Example Keeper</a>', "th")}
        ${cell("team", "Example")}
        ${cell("gk_games", "3")}
        ${cell("gk_games_starts", "3")}
        ${cell("gk_minutes", "270")}
        ${cell("gk_clean_sheets", "0")}
        ${cell("gk_saves", "")}
      </tr></tbody></table>`;
    expect(
      parseFbrefWorldCupCompetitionPages({
        standardHtml,
        keeperHtml,
        tournamentYear: 2022,
      }),
    ).toEqual([
      expect.objectContaining({
        fbrefId: "d70ce98e",
        stats: expect.objectContaining({
          appearances: 7,
          starts: 7,
          minutes: 690,
          goals: 7,
          assists: 3,
        }),
      }),
      expect.objectContaining({
        fbrefId: "11111111",
        stats: expect.objectContaining({
          appearances: 3,
          starts: 3,
          minutes: 270,
          cleanSheets: 0,
          saves: null,
        }),
      }),
    ]);
  });

  it("parses World Cup rows from a cached player profile", () => {
    const html = `
      <table id="stats_standard_nat_tm"><tbody>
        <tr>
          ${cell("year_id", "1998", "th")}
          ${cell("team", "France")}
          ${cell("comp_level", "World Cup")}
          ${cell("games", "6")}
          ${cell("games_starts", "6")}
          ${cell("minutes", "540")}
          ${cell("goals", "0")}
          ${cell("assists", "")}
        </tr>
        <tr>
          ${cell("year_id", "1999", "th")}
          ${cell("team", "France")}
          ${cell("comp_level", "Friendlies (M)")}
          ${cell("games", "2")}
        </tr>
      </tbody></table>`;
    expect(
      parseFbrefWorldCupProfilePage({
        html,
        playerName: "Didier Deschamps",
        fbrefId: "1d9b994f",
      }),
    ).toEqual([
      expect.objectContaining({
        tournamentYear: 1998,
        teamName: "France",
        stats: expect.objectContaining({
          appearances: 6,
          starts: 6,
          minutes: 540,
          goals: 0,
          assists: null,
        }),
      }),
    ]);
  });

  it("keeps the user-provided overview URLs and derives stat-table URLs", () => {
    expect(worldCupSourceFor(2014)).toEqual({
      tournamentYear: 2014,
      overviewUrl:
        "https://fbref.com/en/comps/1/2014/2014-World-Cup-Stats",
      standardUrl:
        "https://fbref.com/en/comps/1/2014/stats/2014-World-Cup-Stats",
      keeperUrl:
        "https://fbref.com/en/comps/1/2014/keepers/2014-World-Cup-Stats",
    });
    expect(worldCupSourceFor(2026).overviewUrl).toBe(
      "https://fbref.com/en/comps/1/World-Cup-Stats",
    );
  });

  it("rejects Cloudflare challenge pages", () => {
    expect(
      isFbrefAccessChallenge(
        "<title>Just a moment...</title><script src='https://challenges.cloudflare.com/test'></script>",
      ),
    ).toBe(true);
  });
});
