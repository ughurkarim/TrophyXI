import { describe, expect, it } from "vitest";
import {
  dedupeAccolades,
  isFbrefChallengePage,
  normalizeCompetitionName,
  parseFbrefPlayerPage,
  type FbrefPlayerMapping,
} from "@/lib/importers/fbref";

const mapping: FbrefPlayerMapping = {
  playerIdentityId: "sample-player",
  playerName: "Sample Player",
  fbrefId: "abc12345",
  sourceUrl: "https://fbref.com/en/players/abc12345/Sample-Player",
};

const fixture = `
  <html>
    <h1>Sample Player</h1>
    <ul>
      <li>2x European Cup</li>
      <li>2x Champions League</li>
      <li>1x World Cup Champion</li>
      <li>Navigation item</li>
    </ul>
    <table id="stats_standard_dom_lg">
      <tbody><tr>
        <th data-stat="year_id">2001-2002</th>
        <td data-stat="team">Example FC</td>
        <td data-stat="comp_level">European Cup</td>
        <td data-stat="games">12</td>
        <td data-stat="goals">5</td>
        <td data-stat="assists">4</td>
      </tr></tbody>
      <tfoot><tr>
        <th data-stat="player">Career</th>
        <td data-stat="games">321</td>
        <td data-stat="goals">123</td>
        <td data-stat="assists">45</td>
      </tr></tfoot>
    </table>
    <table id="stats_standard_nat_tm">
      <tfoot><tr>
        <th data-stat="player">Career</th>
        <td data-stat="games">88</td>
        <td data-stat="goals">34</td>
      </tr></tfoot>
    </table>
  </html>
`;

describe("FBref import normalization", () => {
  it("normalizes renamed competitions, stats, categories, and duplicates", () => {
    const parsed = parseFbrefPlayerPage(fixture, mapping, "2026-07-18");
    expect(parsed.careerStats).toMatchObject({
      clubAppearances: 321,
      clubGoals: 123,
      clubAssists: 45,
      nationalTeamAppearances: 88,
      nationalTeamGoals: 34,
    });
    expect(parsed.careerStats.competitionStats).toEqual([
      expect.objectContaining({
        season: "2001-2002",
        competition: "UEFA Champions League",
        appearances: 12,
        goals: 5,
        assists: 4,
      }),
    ]);
    expect(normalizeCompetitionName("European Cup")).toBe(
      "UEFA Champions League",
    );
    expect(parsed.accolades).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "uefa-champions-league",
          count: 2,
          category: "continental",
        }),
        expect.objectContaining({
          id: "world-cup-champion",
          count: 1,
          category: "international",
        }),
      ]),
    );
    expect(parsed.accolades).toHaveLength(2);
  });

  it("rejects identity mismatches and access challenges", () => {
    expect(() =>
      parseFbrefPlayerPage(
        fixture.replace("Sample Player", "Different Player"),
        mapping,
        "2026-07-18",
      ),
    ).toThrow(/identity mismatch/i);
    expect(isFbrefChallengePage("<title>Just a moment...</title>")).toBe(true);
  });

  it("deduplicates imported and supplementary records by category and id", () => {
    const source = {
      id: "world-cup",
      label: "World Cup",
      category: "international" as const,
      sourceName: "FBref",
      verified: true,
    };
    expect(
      dedupeAccolades([
        { ...source, count: 1 },
        { ...source, count: 2 },
      ]),
    ).toEqual([{ ...source, count: 2 }]);
  });
});
