import { describe, expect, it } from "vitest";
import {
  FBREF_REQUIRED_ATTRIBUTION,
  fbrefPortraitPathForCard,
  parseFbrefPortraitAssetUrl,
  validateFbrefPortraitManifest,
  validateFbrefPortraitMapping,
  waybackRawUrlFor,
  type FbrefPortraitCardRef,
  type FbrefPortraitManifestRecord,
  type FbrefPortraitMapping,
} from "@/lib/importers/fbref-portrait";

const mapping: FbrefPortraitMapping = {
  playerIdentityId: "diego-maradona",
  playerName: "Diego Maradona",
  fbrefId: "a2270ea2",
  sourcePage: "https://fbref.com/en/players/a2270ea2/Diego-Maradona",
  wikipediaPage: "https://en.wikipedia.org/wiki/Diego_Maradona",
  wikidataItem: "Q17515",
};

const card: FbrefPortraitCardRef = {
  id: "diego-maradona-1986",
  playerIdentityId: "diego-maradona",
  playerName: "Diego Maradona",
  tournamentYear: 1986,
};

const record: FbrefPortraitManifestRecord = {
  id: card.id,
  kind: "player",
  playerIdentityId: card.playerIdentityId,
  tournamentYear: card.tournamentYear,
  fbrefId: mapping.fbrefId,
  sourceWebsite: "FBref",
  sourcePage: mapping.sourcePage,
  sourceAssetUrl:
    "https://fbref.com/req/202302030/images/headshots/a2270ea2_2022.jpg",
  retrievalUrl:
    "https://web.archive.org/web/2id_/https://fbref.com/req/202302030/images/headshots/a2270ea2_2022.jpg",
  localPath: "/assets/players/1986/diego-maradona-1986.png",
  sourceFile: "/assets/players/1986/diego-maradona-1986.png",
  sourcePublisher: "Sports Reference",
  photographer: null,
  license: "Project-specific FBref permission",
  permissionReference: "User-confirmed project-specific permission",
  retrievedOn: "2026-07-19",
  matchQuality: "identity-only-permissioned",
  requiredAttribution: FBREF_REQUIRED_ATTRIBUTION,
  changes:
    "Source JPEG converted to local PNG without cropping; image date not stated.",
  sourceSha256: "a".repeat(64),
  sourceByteLength: 1,
  runtimeSha256: "b".repeat(64),
  runtimeByteLength: 2,
};

describe("FBref historical portrait import contracts", () => {
  it("extracts only the mapped player's FBref headshot", () => {
    expect(
      parseFbrefPortraitAssetUrl(
        `<script>{"contentUrl":"https:\\/\\/fbref.com\\/req\\/202302030\\/images\\/headshots\\/a2270ea2_2022.jpg"}</script>`,
        "a2270ea2",
      ),
    ).toBe(record.sourceAssetUrl);
    expect(() =>
      parseFbrefPortraitAssetUrl(
        '<img src="https://fbref.com/req/x/images/headshots/deadbeef_2022.jpg">',
        "a2270ea2",
      ),
    ).toThrow(/does not expose/i);
    expect(() =>
      parseFbrefPortraitAssetUrl(
        "<title>Attention Required! | Cloudflare</title>",
        "a2270ea2",
      ),
    ).toThrow(/challenge/i);
  });

  it("uses an archived retrieval route and a card-specific PNG path", () => {
    expect(waybackRawUrlFor(record.sourceAssetUrl)).toBe(record.retrievalUrl);
    expect(fbrefPortraitPathForCard(card.id, card.tournamentYear)).toBe(
      record.localPath,
    );
  });

  it("validates reviewed identity mappings and rejects unknown identities", () => {
    expect(
      validateFbrefPortraitMapping(mapping, new Set(["diego-maradona"])),
    ).toEqual([]);
    expect(
      validateFbrefPortraitMapping(mapping, new Set(["pele"])),
    ).toContain("identity is not in the pre-2003 active archive");
  });

  it("keeps historical portraits identity-only and within 2002 or earlier", () => {
    expect(validateFbrefPortraitManifest([record], [card])).toEqual([]);
    expect(
      validateFbrefPortraitManifest(
        [{ ...record, tournamentYear: 2006 }],
        [card],
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/outside the requested era/i),
        expect.stringMatching(/identity or year mismatch/i),
      ]),
    );
  });
});
