import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const safeYear = /^\d{4}$/;
const safeFilename = /^[\p{L}\p{M}0-9-]+\.(?:png|webp|jpe?g)$/u;

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ year: string; filename: string }>;
  },
) {
  const { year, filename } = await context.params;
  if (!safeYear.test(year) || !safeFilename.test(filename)) {
    return new NextResponse("Not found", { status: 404 });
  }
  try {
    const image = await readFile(
      path.join(process.cwd(), "assets", "players", year, filename),
    );
    const contentType = filename.endsWith(".webp")
      ? "image/webp"
      : /\.jpe?g$/i.test(filename)
        ? "image/jpeg"
        : "image/png";
    return new NextResponse(new Uint8Array(image), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
