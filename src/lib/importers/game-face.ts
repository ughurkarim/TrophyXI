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
  sourceWebsite: string;
  sourceUrl: string;
  author: string;
  license: string;
  licenseUrl: string;
  retrievedOn: string;
  matchQuality: "exact" | "manually-reviewed-exact-year";
  exactYearEvidence: string;
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

const protectedGameAssetHosts = [
  "sofifa.com",
  "ea.com",
  "easports.com",
  "fifa.com",
  "futbin.com",
  "futwiz.com",
];

export const gameFacePathForCard = (kind: GameFaceKind, id: string) =>
  `/${kind === "player" ? "players" : "managers"}/game-faces/${id}.png`;

export const isProtectedGameAssetHost = (sourceUrl: string) => {
  try {
    const host = new URL(sourceUrl).hostname.toLowerCase();
    return protectedGameAssetHosts.some(
      (blocked) => host === blocked || host.endsWith(`.${blocked}`),
    );
  } catch {
    return false;
  }
};

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
  if (!candidate.exactYearEvidence.trim()) {
    errors.push("missing exact-year evidence");
  }
  if (!candidate.reusableLicenseConfirmed) {
    errors.push("reusable license is not confirmed");
  }
  if (!candidate.approvedForImport) errors.push("candidate is not approved");
  if (isProtectedGameAssetHost(candidate.sourceUrl)) {
    errors.push("protected football-game asset sources are not importable");
  }
  try {
    const url = new URL(candidate.sourceUrl);
    if (!["http:", "https:"].includes(url.protocol)) {
      errors.push("source URL must use HTTP or HTTPS");
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
    const expectedPath = gameFacePathForCard(record.kind, record.id);
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
        reason: "No approved exact-year source is configured.",
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
