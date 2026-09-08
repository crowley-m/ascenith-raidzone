import { requirePermission } from "@/lib/session";
import { db } from "@/lib/db";
import { GalleryManager } from "@/components/portal/gallery-manager";

export const dynamic = "force-dynamic";

export default async function MediaPage() {
  await requirePermission("media:manage");

  const images = await db.mediaAsset.findMany({
    where: { kind: "gallery" },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      caption: true,
      tag: true,
      bytes: true,
      width: true,
      height: true,
      createdAt: true,
    },
  });

  return (
    <div className="max-w-3xl">
      <h2 className="font-display text-xl font-bold text-white">Landing gallery</h2>
      <p className="mt-1 text-sm text-slate-400">
        The “Where it goes down” wall on the landing page. The first six images show, in this
        order. Uploads are downscaled and stored automatically.
      </p>

      <GalleryManager images={images.map((i) => ({ ...i, createdAt: i.createdAt.toISOString() }))} />
    </div>
  );
}
