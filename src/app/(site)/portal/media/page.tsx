import { requirePermission } from "@/lib/session";
import { db } from "@/lib/db";
import { GalleryManager } from "@/components/portal/gallery-manager";

export const dynamic = "force-dynamic";

const SELECT = {
  id: true,
  caption: true,
  tag: true,
  bytes: true,
  width: true,
  height: true,
  createdAt: true,
} as const;

export default async function MediaPage() {
  await requirePermission("media:manage");

  const [gallery, proof] = await Promise.all([
    db.mediaAsset.findMany({ where: { kind: "gallery" }, orderBy: { sortOrder: "asc" }, select: SELECT }),
    db.mediaAsset.findMany({ where: { kind: "proof" }, orderBy: { sortOrder: "asc" }, select: SELECT }),
  ]);
  const ser = (rows: typeof gallery) =>
    rows.map((i) => ({ ...i, createdAt: i.createdAt.toISOString() }));

  return (
    <div className="max-w-3xl space-y-14">
      <section>
        <h2 className="font-display text-xl font-bold text-white">Landing gallery</h2>
        <p className="mt-1 text-sm text-slate-400">
          The “Where it goes down” wall on the landing page. The first six images show, in this
          order. Uploads are downscaled and stored automatically.
        </p>
        <GalleryManager
          images={ser(gallery)}
          kind="gallery"
          liveSlots={6}
          note="Nothing uploaded yet — the landing page shows placeholder frames."
        />
      </section>

      <section>
        <h2 className="font-display text-xl font-bold text-white">Reward proof</h2>
        <p className="mt-1 text-sm text-slate-400">
          Screenshots of reward payouts. All of these show in the “Proof” section of the public
          Winners page, in this order.
        </p>
        <GalleryManager
          images={ser(proof)}
          kind="proof"
          note="No proof images yet — upload screenshots of the in-game payouts."
        />
      </section>
    </div>
  );
}
