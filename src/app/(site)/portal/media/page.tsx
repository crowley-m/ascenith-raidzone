import { requirePermission } from "@/lib/session";
import { db } from "@/lib/db";
import { GalleryManager } from "@/components/portal/gallery-manager";
import { NewCollectionForm, CollectionHeader } from "@/components/portal/collection-forms";

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

  const collections = await db.mediaCollection.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const [gallery, proof, ...colImages] = await Promise.all([
    db.mediaAsset.findMany({ where: { kind: "gallery" }, orderBy: { sortOrder: "asc" }, select: SELECT }),
    db.mediaAsset.findMany({ where: { kind: "proof" }, orderBy: { sortOrder: "asc" }, select: SELECT }),
    ...collections.map((c) =>
      db.mediaAsset.findMany({ where: { kind: c.slug }, orderBy: { sortOrder: "asc" }, select: SELECT }),
    ),
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
          Screenshots of reward payouts. Shown in the “Proof” section of the public Winners page —
          the first {5} on the page, the rest behind “View all”.
        </p>
        <GalleryManager
          images={ser(proof)}
          kind="proof"
          note="No proof images yet — upload screenshots of the in-game payouts."
        />
      </section>

      {collections.map((c, i) => (
        <section key={c.id}>
          <CollectionHeader id={c.id} slug={c.slug} title={c.title} />
          <p className="mt-1 text-sm text-slate-400">
            Its own section on the Winners page (<code>/winners/{c.slug}</code>). First {5} show,
            the rest behind “View all”.
          </p>
          <GalleryManager
            images={ser(colImages[i] ?? [])}
            kind={c.slug}
            note="No images in this section yet."
          />
        </section>
      ))}

      <section className="border-t border-edge pt-10">
        <h2 className="font-display text-xl font-bold text-white">New Winners section</h2>
        <p className="mt-1 text-sm text-slate-400">
          Add another titled panel (e.g. “Base tours”, “Best clips”). It appears on the Winners
          page once it has at least one image.
        </p>
        <div className="mt-4">
          <NewCollectionForm />
        </div>
      </section>
    </div>
  );
}
