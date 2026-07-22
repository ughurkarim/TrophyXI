import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const safeFilename = /^[a-z0-9-]+\.png$/;

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ filename: string }>;
  },
) {
  const { filename } = await context.params;
  if (!safeFilename.test(filename)) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const image = await readFile(
      path.join(process.cwd(), "assets", "managers", filename),
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
