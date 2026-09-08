import { db } from "@/lib/db";
import { auth } from "@/auth";
import { isStaff } from "@/lib/rbac";

// Serve an uploaded image from the DB.
//  - gallery stills: public (they only ever appear on the public landing)
//  - reward proof: only if a *public* reward points at it, or the viewer is
//    staff — a private reward's screenshot must not be fetchable just by
//    holding the (unguessable) id.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const asset = await db.mediaAsset.findUnique({
    where: { id },
    select: { data: true, contentType: true, kind: true },
  });
  if (!asset) return new Response("Not found", { status: 404 });

  if (asset.kind === "reward") {
    const publicRef = await db.reward.findFirst({
      where: { proofImageId: id, isPublic: true },
      select: { id: true },
    });
    if (!publicRef) {
      const session = await auth();
      if (!isStaff(session?.user?.role)) return new Response("Not found", { status: 404 });
    }
  }

  const body = new Uint8Array(asset.data);
  return new Response(body, {
    headers: {
      "Content-Type": asset.contentType,
      "Content-Length": String(body.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
