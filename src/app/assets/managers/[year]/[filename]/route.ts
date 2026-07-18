import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const safeYear = /^\d{4}$/;
const safeFilename = /^[a-z0-9-]+\.png$/;

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
      path.join(process.cwd(), "assets", "managers", year, filename),
    );
    return new NextResponse(new Uint8Array(image), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
