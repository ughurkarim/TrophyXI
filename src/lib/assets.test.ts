import { afterEach, describe, expect, it, vi } from "vitest";

describe("assetUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("keeps local asset paths when no asset base URL is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_ASSET_BASE_URL", undefined);
    vi.resetModules();

    const { assetUrl } = await import("@/lib/assets");

    expect(assetUrl("/assets/players/2006/lionel-messi-2006.png")).toBe(
      "/assets/players/2006/lionel-messi-2006.png",
    );
  });

  it("delivers stored player and manager paths from the asset domain", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_ASSET_BASE_URL",
      "https://assets.trophyxi.example/",
    );
    vi.resetModules();

    const { assetUrl } = await import("@/lib/assets");

    expect(assetUrl("/assets/players/2022/lionel-messi-2022.png")).toBe(
      "https://assets.trophyxi.example/assets/players/2022/lionel-messi-2022.png",
    );
    expect(assetUrl("/assets/managers/lionel-scaloni-2022.png")).toBe(
      "https://assets.trophyxi.example/assets/managers/lionel-scaloni-2022.png",
    );
  });
});
