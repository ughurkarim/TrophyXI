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
];

const candidate: GameFaceImportCandidate = {
  id: "sample-player-2014",
  kind: "player",
  tournamentYear: 2014,
  gameEdition: "Reviewed exact-year edition",
  sourceWebsite: "Reusable media archive",
  sourceUrl: "https://media.example.org/sample-player-2014.png",
  author: "Example rights holder",
  license: "CC BY 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  retrievedOn: "2026-07-18",
  matchQuality: "exact",
  exactYearEvidence: "Source record explicitly identifies the 2014 edition.",
  reusableLicenseConfirmed: true,
  approvedForImport: true,
};

describe("exact-year game-face import contracts", () => {
  it("uses distinct local PNG paths for each tournament card", () => {
    expect(gameFacePathForCard("player", cards[0].id)).toBe(
      "/players/game-faces/sample-player-2014.png",
    );
    expect(gameFacePathForCard("player", cards[1].id)).toBe(
      "/players/game-faces/sample-player-2022.png",
    );
    expect(gameFacePathForCard("player", cards[0].id)).not.toBe(
      gameFacePathForCard("player", cards[1].id),
    );
  });

  it("rejects protected game assets and tournament-year mismatches", () => {
    expect(
      validateGameFaceCandidate(
        {
          ...candidate,
          sourceWebsite: "SoFIFA",
          sourceUrl: "https://sofifa.com/player/123",
        },
        cards[0],
      ),
    ).toContain("protected football-game asset sources are not importable");
    expect(
      validateGameFaceCandidate(
        { ...candidate, tournamentYear: 2022 },
        cards[0],
      ),
    ).toContain("tournament year mismatch");
  });

  it("detects reused, remote, and card-mismatched production paths", () => {
    const record = {
      ...candidate,
      localPath: "/players/game-faces/sample-player-2014.png",
      sourceFile: "/players/game-face-sources/sample-player-2014.source",
      changes: "Converted to a square PNG.",
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
      photoPending: 2,
    });
    expect(summary.results).toHaveLength(2);
  });
});
