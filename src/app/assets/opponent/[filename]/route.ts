import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

const OPPONENT_IMAGE_DIRECTORY = path.join(
  process.cwd(),
  "assets",
  "players",
  "opponent",
);

const contentTypes: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

type RouteContext = {
  params: Promise<{ filename: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { filename } = await params;

  // Only allow a single safe image filename. This prevents path traversal.
  if (!/^[A-Za-z0-9._-]+\.(png|jpe?g|webp)$/i.test(filename)) {
    return new Response("Not found", { status: 404 });
  }

  const extension = path.extname(filename).toLowerCase();
  const contentType = contentTypes[extension];

  if (!contentType) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const file = await readFile(
      path.join(OPPONENT_IMAGE_DIRECTORY, filename),
    );

    return new Response(new Uint8Array(file), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
