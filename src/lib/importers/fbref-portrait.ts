export type FbrefPortraitCardRef = {
  id: string;
  playerIdentityId: string;
  playerName: string;
  tournamentYear: number;
};

export type FbrefPortraitMapping = {
  playerIdentityId: string;
  playerName: string;
  fbrefId: string;
  sourcePage: string;
  wikipediaPage: string;
  wikidataItem: string;
};

export type FbrefPortraitManifestRecord = {
  id: string;
  kind: "player";
  playerIdentityId: string;
  tournamentYear: number;
  fbrefId: string;
  sourceWebsite: "FBref";
  sourcePage: string;
  sourceAssetUrl: string;
  retrievalUrl: string;
  localPath: string;
  sourceFile: string;
  sourcePublisher: "Sports Reference";
  photographer: null;
  license: "Project-specific FBref permission";
  permissionReference: "User-confirmed project-specific permission";
  retrievedOn: string;
  matchQuality: "identity-only-permissioned";
  requiredAttribution: string;
  changes: string;
  sourceSha256: string;
  sourceByteLength: number;
  runtimeSha256: string;
  runtimeByteLength: number;
};

export const FBREF_REQUIRED_ATTRIBUTION =
  "Player imagery sourced from FBref, used under project-specific permission.";

export const fbrefPortraitPathForCard = (
  cardId: string,
  tournamentYear: number,
) => `/assets/players/${tournamentYear}/${cardId}.png`;

export const waybackRawUrlFor = (sourceUrl: string) =>
  `https://web.archive.org/web/2id_/${sourceUrl}`;

const decodeEmbeddedUrl = (value: string) =>
  value
    .replaceAll("\\/", "/")
    .replaceAll("\\u002F", "/")
    .replaceAll("\\u002f", "/")
    .replaceAll("&amp;", "&");

export const parseFbrefPortraitAssetUrl = (
  html: string,
  fbrefId: string,
) => {
  if (!/^[a-f0-9]{8}$/i.test(fbrefId)) {
    throw new Error("invalid FBref player id");
  }
  if (
    /cf-chl|cf-mitigated|attention required|just a moment\.\.\.|enable javascript and cookies to continue/i.test(
      html,
    )
  ) {
    throw new Error("FBref challenge page returned instead of a player profile");
  }
  const normalized = decodeEmbeddedUrl(html);
  const candidates =
    normalized.match(
      /https?:\/\/(?:www\.)?fbref\.com\/req\/[^"'<>\s]+\/images\/headshots\/[^"'<>\s]+?\.(?:jpe?g|png)/gi,
    ) ?? [];
  const sourceAssetUrl = candidates.find((candidate) => {
    try {
      const url = new URL(candidate);
      return (
        url.hostname.toLocaleLowerCase() === "fbref.com" &&
        url.pathname.includes("/images/headshots/") &&
        new RegExp(`/${fbrefId}(?:_|\\.)`, "i").test(url.pathname)
      );
    } catch {
      return false;
    }
  });
  if (!sourceAssetUrl) {
    throw new Error(`profile does not expose a headshot for ${fbrefId}`);
  }
  return sourceAssetUrl;
};

export const validateFbrefPortraitMapping = (
  mapping: FbrefPortraitMapping,
  identityIds: ReadonlySet<string>,
) => {
  const errors: string[] = [];
  if (!identityIds.has(mapping.playerIdentityId)) {
    errors.push("identity is not in the pre-2003 active archive");
  }
  if (!mapping.playerName.trim()) errors.push("missing player name");
  if (!/^[a-f0-9]{8}$/i.test(mapping.fbrefId)) {
    errors.push("invalid FBref player id");
  }
  try {
    const url = new URL(mapping.sourcePage);
    if (
      url.hostname.toLocaleLowerCase() !== "fbref.com" ||
      !url.pathname.includes(`/players/${mapping.fbrefId}/`)
    ) {
      errors.push("source page is not the mapped FBref player profile");
    }
  } catch {
    errors.push("invalid FBref source page");
  }
  if (!/^https:\/\/en\.wikipedia\.org\/wiki\//.test(mapping.wikipediaPage)) {
    errors.push("invalid Wikipedia identity page");
  }
  if (!/^Q\d+$/.test(mapping.wikidataItem)) {
    errors.push("invalid Wikidata item");
  }
  return errors;
};

export const validateFbrefPortraitManifest = (
  records: readonly FbrefPortraitManifestRecord[],
  cards: readonly FbrefPortraitCardRef[],
) => {
  const errors: string[] = [];
  const cardsById = new Map(cards.map((card) => [card.id, card]));
  const ids = new Set<string>();
  const paths = new Set<string>();
  for (const record of records) {
    const card = cardsById.get(record.id);
    if (ids.has(record.id)) errors.push(`${record.id}: duplicate image id`);
    ids.add(record.id);
    if (paths.has(record.localPath)) {
      errors.push(`${record.id}: duplicate image path`);
    }
    paths.add(record.localPath);
    if (!card) {
      errors.push(`${record.id}: no matching pre-2003 card`);
      continue;
    }
    if (card.tournamentYear > 2002 || record.tournamentYear > 2002) {
      errors.push(`${record.id}: FBref portrait is outside the requested era`);
    }
    if (
      card.playerIdentityId !== record.playerIdentityId ||
      card.tournamentYear !== record.tournamentYear
    ) {
      errors.push(`${record.id}: card identity or year mismatch`);
    }
    const expectedPath = fbrefPortraitPathForCard(
      record.id,
      record.tournamentYear,
    );
    if (
      record.localPath !== expectedPath ||
      record.sourceFile !== expectedPath
    ) {
      errors.push(`${record.id}: expected card-specific path ${expectedPath}`);
    }
    if (!record.localPath.endsWith(".png")) {
      errors.push(`${record.id}: runtime portrait is not PNG`);
    }
    if (
      record.sourceWebsite !== "FBref" ||
      record.sourcePublisher !== "Sports Reference" ||
      record.license !== "Project-specific FBref permission" ||
      record.permissionReference !==
        "User-confirmed project-specific permission" ||
      record.matchQuality !== "identity-only-permissioned" ||
      record.requiredAttribution !== FBREF_REQUIRED_ATTRIBUTION ||
      record.photographer !== null
    ) {
      errors.push(`${record.id}: permission or attribution metadata mismatch`);
    }
    try {
      const sourceAsset = new URL(record.sourceAssetUrl);
      const retrieval = new URL(record.retrievalUrl);
      if (
        sourceAsset.hostname.toLocaleLowerCase() !== "fbref.com" ||
        !sourceAsset.pathname.includes("/images/headshots/") ||
        !new RegExp(`/${record.fbrefId}(?:_|\\.)`, "i").test(
          sourceAsset.pathname,
        )
      ) {
        errors.push(`${record.id}: invalid FBref source asset`);
      }
      if (retrieval.hostname.toLocaleLowerCase() !== "web.archive.org") {
        errors.push(`${record.id}: invalid archived retrieval route`);
      }
    } catch {
      errors.push(`${record.id}: invalid source or retrieval URL`);
    }
    if (
      !/^[a-f0-9]{64}$/.test(record.sourceSha256) ||
      !/^[a-f0-9]{64}$/.test(record.runtimeSha256) ||
      record.sourceByteLength <= 0 ||
      record.runtimeByteLength <= 0
    ) {
      errors.push(`${record.id}: invalid source-byte provenance`);
    }
  }
  return errors;
};
