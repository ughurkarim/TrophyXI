import { describe, expect, it } from "vitest";
import { GET } from "@/app/assets/opponent/[filename]/route";

const request = new Request("http://localhost/assets/opponent");

describe("opponent cutout image route", () => {
  it("serves an opponent-folder cutout", async () => {
    const response = await GET(request, {
      params: Promise.resolve({ filename: "messiwin1.png" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(0);
  });

  it("rejects path traversal", async () => {
    const response = await GET(request, {
      params: Promise.resolve({ filename: "../winners/2022.webp" }),
    });

    expect(response.status).toBe(404);
  });
});
