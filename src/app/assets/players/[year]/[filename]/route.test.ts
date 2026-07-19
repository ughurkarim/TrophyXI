import { describe, expect, it } from "vitest";
import { GET } from "@/app/assets/players/[year]/[filename]/route";

const request = new Request("http://localhost/assets/players");

describe("player portrait asset route", () => {
  it("serves user-supplied WebP cutouts with Unicode filenames", async () => {
    const response = await GET(request, {
      params: Promise.resolve({
        year: "2022",
        filename: "julián-álvarez-2022.webp",
      }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(0);
  });

  it("keeps path traversal outside the portrait directory", async () => {
    const response = await GET(request, {
      params: Promise.resolve({
        year: "2022",
        filename: "../package.json",
      }),
    });

    expect(response.status).toBe(404);
  });
});
