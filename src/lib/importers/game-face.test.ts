import { describe, expect, it } from "vitest";
import {
  gameFacePathForCard,
  summarizeGameFaceImport,
  validateGameFaceCandidate,
  validateGameFaceManifest,
  type GameFaceCardRef,
  type GameFaceImportCandidate,
} from "@/lib/importers/game-face";

const cards: GameFaceCardRef[] = [
  { id: "sample-player-2014", kind: "player", tournamentYear: 2014 },
  { id: "sample-player-2022", kind: "player", tournamentYear: 2022 },
  { id: "sample-player-2026", kind: "player", tournamentYear: 2026 },
];

const candidate: GameFaceImportCandidate = {
  id: "sample-player-2014",
  kind: "player",
  tournamentYear: 2014,
  gameEdition: "FIFA 14",
  sourceWebsite: "Reusable media archive",
  sourceUrl: "https://cdn.sofifa.net/players/123/456/14_120.png",
  author: "EA SPORTS",
  license: "Project-specific EA/SoFIFA permission",
  licenseUrl: "https://sofifa.com/",
  retrievedOn: "2026-07-18",
  matchQuality: "exact",
  exactYearEvidence: "Source record explicitly identifies the 2014 edition.",
  permissionScope: "project-specific-ea-sofifa",
  requiredAttribution:
    "EA SPORTS player imagery, sourced via SoFIFA, used under project-specific permission.",
  preserveMetadataAndWatermarks: true,
  cachePolicy: "local-first-conditional",
  reusableLicenseConfirmed: true,
  approvedForImport: true,
};

describe("exact-year game-face import contracts", () => {
  it("uses distinct local PNG paths for each tournament card", () => {
    expect(gameFacePathForCard("player", cards[0].id, 2014)).toBe(
      "/assets/players/2014/sample-player-2014.png",
    );
    expect(gameFacePathForCard("player", cards[1].id, 2022)).toBe(
      "/assets/players/2022/sample-player-2022.png",
    );
    expect(gameFacePathForCard("player", cards[0].id, 2014)).not.toBe(
      gameFacePathForCard("player", cards[1].id, 2022),
    );
  });

  it("allows permissioned SoFIFA assets and rejects tournament-year mismatches", () => {
    expect(
      validateGameFaceCandidate(
        {
          ...candidate,
          sourceWebsite: "SoFIFA",
          sourceUrl: "https://cdn.sofifa.net/players/123/456/14_120.png",
        },
        cards[0],
      ),
    ).toEqual([]);
    expect(
      validateGameFaceCandidate(
        { ...candidate, tournamentYear: 2022 },
        cards[0],
      ),
    ).toContain("tournament year mismatch");
    expect(
      validateGameFaceCandidate(
        {
          ...candidate,
          gameEdition: "FIFA 15",
          sourceUrl: "https://cdn.sofifa.net/players/123/456/15_120.png",
        },
        cards[0],
      ),
    ).toEqual(
      expect.arrayContaining([
        "game edition is not the edition available by tournament June",
        "source URL is not the tournament-year edition face",
      ]),
    );
    expect(
      validateGameFaceCandidate(
        {
          ...candidate,
          id: "sample-player-2026",
          tournamentYear: 2026,
          gameEdition: "EA SPORTS FC 26",
          sourceUrl: "https://cdn.sofifa.net/players/123/456/26_120.png",
        },
        cards[2],
      ),
    ).toEqual([]);
    expect(
      validateGameFaceCandidate(
        {
          ...candidate,
          id: "sample-player-2026",
          tournamentYear: 2026,
          gameEdition: "EA SPORTS FC 27",
          sourceUrl: "https://cdn.sofifa.net/players/123/456/27_120.png",
        },
        cards[2],
      ),
    ).toEqual(
      expect.arrayContaining([
        "game edition is not the edition available by tournament June",
        "source URL is not the tournament-year edition face",
      ]),
    );
  });

  it("detects reused, remote, and card-mismatched production paths", () => {
    const record = {
      ...candidate,
      localPath: "/assets/players/2014/sample-player-2014.png",
      sourceFile: "/assets/players/2014/sample-player-2014.png",
      changes: "Original bytes preserved.",
    };
    expect(validateGameFaceManifest([record], cards)).toEqual([]);
    expect(
      validateGameFaceManifest(
        [
          record,
          {
            ...record,
            id: "sample-player-2022",
            tournamentYear: 2022,
          },
        ],
        cards,
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/duplicate image path/i),
        expect.stringMatching(/expected .*sample-player-2022\.png/i),
      ]),
    );
  });

  it("reports every unresolved card as Photo Pending without failing", () => {
    const summary = summarizeGameFaceImport(cards, []);
    expect(summary).toMatchObject({
      downloaded: 0,
      skipped: 0,
      failed: 0,
      photoPending: 3,
    });
    expect(summary.results).toHaveLength(3);
  });
});
