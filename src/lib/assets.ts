const assetBaseUrl =
  process.env.NEXT_PUBLIC_ASSET_BASE_URL?.replace(/\/$/, "") ?? "";

export function assetUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return assetBaseUrl
    ? `${assetBaseUrl}${normalizedPath}`
    : normalizedPath;
}

/** Canonical object path for every player card portrait. */
export function playerGameFacePath(playerCardId: string): string {
  return `/players/game-faces/${playerCardId}.png`;
}

/** Final browser-facing URL, including NEXT_PUBLIC_ASSET_BASE_URL when set. */
export function playerGameFaceAssetUrl(playerCardId: string): string {
  return assetUrl(playerGameFacePath(playerCardId));
}

export function managerAssetUrl(year: number, filename: string): string {
  return assetUrl(`/assets/managers/${year}/${filename}`);
}