const assetBaseUrl =
  process.env.NEXT_PUBLIC_ASSET_BASE_URL?.replace(/\/$/, "") ?? "";

export function assetUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return assetBaseUrl
    ? `${assetBaseUrl}${normalizedPath}`
    : normalizedPath;
}

export function playerAssetUrl(year: number, filename: string): string {
  return assetUrl(`/assets/players/${year}/${filename}`);
}

export function managerAssetUrl(year: number, filename: string): string {
  return assetUrl(`/assets/managers/${year}/${filename}`);
}