import { describe, expect, it } from "vitest";
import { GET } from "@/app/assets/winners/[filename]/route";

const request = new Request("http://localhost/assets/winners");

describe("winner editorial image route", () => {
  it("serves the exact year-assigned winner image", async () => {
    const response = await GET(request, {
      params: Promise.resolve({ filename: "2022.webp" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(0);
  });

  it("rejects non-year filenames and path traversal", async () => {
    const response = await GET(request, {
      params: Promise.resolve({ filename: "../players/2022.png" }),
    });

    expect(response.status).toBe(404);
  });
});
