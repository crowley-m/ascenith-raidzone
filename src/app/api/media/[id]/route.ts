import { db } from "@/lib/db";

// Serve an uploaded image straight from the DB. Gallery stills and public reward
// proof are public, so no auth here — the id is an unguessable cuid.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const asset = await db.mediaAsset.findUnique({
    where: { id },
    select: { data: true, contentType: true },
  });
  if (!asset) return new Response("Not found", { status: 404 });

  const body = new Uint8Array(asset.data);
  return new Response(body, {
    headers: {
      "Content-Type": asset.contentType,
      "Content-Length": String(body.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
