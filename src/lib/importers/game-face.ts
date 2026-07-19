export type GameFaceKind = "player" | "manager";

export type GameFaceCardRef = {
  id: string;
  kind: GameFaceKind;
  tournamentYear: number;
};

export type GameFaceImportCandidate = {
  id: string;
  kind: GameFaceKind;
  tournamentYear: number;
  gameEdition: string;
  gameEditionLaunchYear: number;
  sourceWebsite: string;
  sourceUrl: string;
  author: string;
  license: string;
  licenseUrl: string;
  retrievedOn: string;
  matchQuality: "edition-verified" | "manually-reviewed-edition";
  editionEvidence: string;
  permissionScope: "project-specific-ea-sofifa";
  requiredAttribution: string;
  preserveMetadataAndWatermarks: true;
  cachePolicy: "local-first-conditional";
  reusableLicenseConfirmed: boolean;
  approvedForImport: boolean;
};

export type GameFaceManifestRecord = GameFaceImportCandidate & {
  localPath: string;
  sourceFile: string;
  changes: string;
};

export type GameFaceImportResult = {
  id: string;
  kind: GameFaceKind;
  status: "downloaded" | "skipped" | "failed" | "photo-pending";
  reason?: string;
};

const permittedGameAssetHosts = [
  "sofifa.com",
  "cdn.sofifa.net",
  "ea.com",
  "easports.com",
  "fifa.com",
];

export const gameFacePathForCard = (
  kind: GameFaceKind,
  id: string,
  tournamentYear: number,
) =>
  `/assets/${kind === "player" ? "players" : "managers"}/${tournamentYear}/${id}.png`;

export const isPermittedGameAssetHost = (sourceUrl: string) => {
  try {
    const host = new URL(sourceUrl).hostname.toLowerCase();
    return permittedGameAssetHosts.some(
      (permitted) =>
        host === permitted || host.endsWith(`.${permitted}`),
    );
  } catch {
    return false;
  }
};

export const gameEditionLaunchYearFor = (gameEdition: string) =>
  (
    {
      "FIFA 14": 2013,
      "FIFA 18": 2017,
      "FIFA 23": 2022,
      "EA SPORTS FC 26": 2025,
    } as Record<string, number>
  )[gameEdition] ?? null;

export const validateGameFaceCandidate = (
  candidate: GameFaceImportCandidate,
  card: GameFaceCardRef | undefined,
) => {
  const errors: string[] = [];
  if (!card) errors.push("no matching tournament card");
  if (card && card.kind !== candidate.kind) errors.push("card kind mismatch");
  if (card && card.tournamentYear !== candidate.tournamentYear) {
    errors.push("tournament year mismatch");
  }
  if (!candidate.gameEdition.trim()) errors.push("missing game edition");
  const expectedLaunchYear = gameEditionLaunchYearFor(candidate.gameEdition);
  if (
    expectedLaunchYear === null ||
    candidate.gameEditionLaunchYear !== expectedLaunchYear
  ) {
    errors.push("game edition launch year is incorrect");
  }
  const tournamentEdition =
    candidate.tournamentYear === 2022
      ? "23"
      : String(candidate.tournamentYear).slice(-2);
  const expectedGameEdition =
    candidate.tournamentYear === 2026
      ? "EA SPORTS FC 26"
      : `FIFA ${tournamentEdition}`;
  if (
    candidate.kind === "player" &&
    [2006, 2010, 2014, 2018, 2022, 2026].includes(
      candidate.tournamentYear,
    ) &&
    candidate.gameEdition !== expectedGameEdition
  ) {
    errors.push("game edition does not match the tournament-date edition");
  }
  if (!candidate.sourceWebsite.trim()) errors.push("missing source website");
  if (!candidate.author.trim()) errors.push("missing author or rights holder");
  if (!candidate.license.trim()) errors.push("missing reusable license");
  if (!candidate.licenseUrl.trim()) {
    errors.push("missing license URL");
  } else {
    try {
      new URL(candidate.licenseUrl);
    } catch {
      errors.push("invalid license URL");
    }
  }
  if (!candidate.editionEvidence.trim()) {
    errors.push("missing tournament-edition evidence");
  }
  if (candidate.permissionScope !== "project-specific-ea-sofifa") {
    errors.push("project-specific EA/SoFIFA permission is not recorded");
  }
  if (!candidate.requiredAttribution.trim()) {
    errors.push("required EA/SoFIFA attribution is missing");
  }
  if (!candidate.preserveMetadataAndWatermarks) {
    errors.push("metadata and watermark preservation is not confirmed");
  }
  if (candidate.cachePolicy !== "local-first-conditional") {
    errors.push("required SoFIFA cache policy is not configured");
  }
  if (!candidate.reusableLicenseConfirmed) {
    errors.push("reusable license is not confirmed");
  }
  if (!candidate.approvedForImport) errors.push("candidate is not approved");
  if (!isPermittedGameAssetHost(candidate.sourceUrl)) {
    errors.push("source host is outside the permitted EA/SoFIFA scope");
  }
  try {
    const url = new URL(candidate.sourceUrl);
    if (!["http:", "https:"].includes(url.protocol)) {
      errors.push("source URL must use HTTP or HTTPS");
    }
    if (
      candidate.kind === "player" &&
      [2006, 2010, 2014, 2018, 2022, 2026].includes(
        candidate.tournamentYear,
      ) &&
      !url.pathname.endsWith(`/${tournamentEdition}_120.png`)
    ) {
      errors.push("source URL is not the tournament-year edition face");
    }
  } catch {
    errors.push("invalid source URL");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate.retrievedOn)) {
    errors.push("invalid retrieval date");
  }
  return errors;
};

export const validateGameFaceManifest = (
  records: readonly GameFaceManifestRecord[],
  cards: readonly GameFaceCardRef[],
) => {
  const errors: string[] = [];
  const cardsById = new Map(cards.map((card) => [card.id, card]));
  const ids = new Set<string>();
  const paths = new Set<string>();
  for (const record of records) {
    if (ids.has(record.id)) errors.push(`duplicate image id ${record.id}`);
    ids.add(record.id);
    if (paths.has(record.localPath)) {
      errors.push(`duplicate image path ${record.localPath}`);
    }
    paths.add(record.localPath);
    errors.push(
      ...validateGameFaceCandidate(record, cardsById.get(record.id)).map(
        (message) => `${record.id}: ${message}`,
      ),
    );
    const expectedPath = gameFacePathForCard(
      record.kind,
      record.id,
      record.tournamentYear,
    );
    if (record.localPath !== expectedPath) {
      errors.push(`${record.id}: expected ${expectedPath}`);
    }
    if (/^https?:\/\//i.test(record.localPath)) {
      errors.push(`${record.id}: runtime image path is remote`);
    }
    if (!record.localPath.endsWith(".png")) {
      errors.push(`${record.id}: production portrait is not PNG`);
    }
  }
  return errors;
};

export const summarizeGameFaceImport = (
  cards: readonly GameFaceCardRef[],
  results: readonly GameFaceImportResult[],
) => {
  const byId = new Map(results.map((result) => [result.id, result]));
  const complete = cards.map(
    (card) =>
      byId.get(card.id) ?? {
        id: card.id,
        kind: card.kind,
        status: "photo-pending" as const,
        reason: "No approved tournament-edition source is configured.",
      },
  );
  const count = (status: GameFaceImportResult["status"]) =>
    complete.filter((result) => result.status === status).length;
  return {
    downloaded: count("downloaded"),
    skipped: count("skipped"),
    failed: count("failed"),
    photoPending:
      cards.length - count("downloaded") - count("skipped"),
    results: complete,
  };
};
