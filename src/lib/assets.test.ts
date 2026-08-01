import { afterEach, describe, expect, it, vi } from "vitest";

describe("assetUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("keeps local asset paths when no asset base URL is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_ASSET_BASE_URL", undefined);
    vi.resetModules();

    const { playerGameFaceAssetUrl } = await import("@/lib/assets");

    expect(playerGameFaceAssetUrl("lionel-messi-2006")).toBe(
      "/players/game-faces/lionel-messi-2006.png",
    );
  });

  it("uses the canonical player object key on the asset domain", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_ASSET_BASE_URL",
      "https://assets.trophyxi.example/",
    );
    vi.resetModules();

    const { managerAssetUrl, playerGameFaceAssetUrl } = await import(
      "@/lib/assets"
    );

    expect(playerGameFaceAssetUrl("lionel-messi-2022")).toBe(
      "https://assets.trophyxi.example/players/game-faces/lionel-messi-2022.png",
    );
    expect(managerAssetUrl(2022, "lionel-scaloni-2022.png")).toBe(
      "https://assets.trophyxi.example/assets/managers/2022/lionel-scaloni-2022.png",
    );
  });
});
