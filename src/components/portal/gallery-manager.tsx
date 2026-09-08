"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addGalleryImage,
  updateGalleryImage,
  deleteGalleryImage,
  moveGalleryImage,
} from "@/app/(site)/portal/actions";

type Img = {
  id: string;
  caption: string | null;
  tag: string | null;
  bytes: number;
  width: number | null;
  height: number | null;
  createdAt: string;
};

function kb(n: number) {
  return n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function GalleryManager({
  images,
  kind = "gallery",
  liveSlots,
  note,
}: {
  images: Img[];
  kind?: "gallery" | "proof";
  liveSlots?: number; // gallery: first N show on landing. proof: undefined = all show
  note?: string;
}) {
  const [addState, addAction, adding] = useActionState(addGalleryImage, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (addState.ok) formRef.current?.reset();
  }, [addState.ok]);

  return (
    <div className="mt-6 space-y-8">
      <form ref={formRef} action={addAction} className="card grid gap-3">
        <input type="hidden" name="kind" value={kind} />
        <h3 className="font-display font-bold text-white">Add an image</h3>
        <div>
          <label className="label" htmlFor={`image-${kind}`}>
            Image file
          </label>
          <input
            id={`image-${kind}`}
            name="image"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            required
            className="block w-full text-sm text-slate-300 file:mr-3 file:border file:border-edge file:bg-void file:px-3 file:py-1.5 file:text-xs file:uppercase file:tracking-wide file:text-slate-200"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Caption</label>
            <input
              name="caption"
              className="input"
              maxLength={40}
              placeholder={kind === "proof" ? "PURGE — 1st place payout" : "PURGE 04"}
            />
          </div>
          <div>
            <label className="label">Small label</label>
            <input
              name="tag"
              className="input"
              maxLength={40}
              placeholder={kind === "proof" ? "30K Crystgin" : "base hold"}
            />
          </div>
        </div>
        {addState.error && <p className="text-sm text-ember">{addState.error}</p>}
        <div>
          <button className="btn-primary" disabled={adding}>
            {adding ? "Uploading…" : "Upload"}
          </button>
        </div>
      </form>

      <div>
        <p className="text-xs uppercase tracking-widest text-slate-500">
          {images.length} image{images.length === 1 ? "" : "s"}
          {liveSlots ? ` · first ${liveSlots} show on the landing page` : ""}
        </p>
        <ul className="mt-3 space-y-3">
          {images.map((img, i) => (
            <ImageRow key={img.id} img={img} index={i} count={images.length} liveSlots={liveSlots} />
          ))}
          {images.length === 0 && (
            <li className="text-sm text-slate-400">{note ?? "Nothing uploaded yet."}</li>
          )}
        </ul>
      </div>
    </div>
  );
}

function ImageRow({
  img,
  index,
  count,
  liveSlots,
}: {
  img: Img;
  index: number;
  count: number;
  liveSlots?: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const live = liveSlots === undefined || index < liveSlots;

  function run(fn: () => Promise<unknown>) {
    start(async () => {
      await fn();
      router.refresh();
    });
  }

  return (
    <li className="card flex flex-col gap-3 sm:flex-row sm:items-start">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/media/${img.id}`}
        alt={img.caption ?? ""}
        className="h-24 w-36 flex-none border border-edge object-cover"
      />

      <form
        action={async (fd) => {
          fd.set("id", img.id);
          await updateGalleryImage({}, fd);
          setSaved(true);
          setTimeout(() => setSaved(false), 1500);
          router.refresh();
        }}
        className="grid flex-1 gap-2 sm:grid-cols-2"
      >
        <input
          name="caption"
          defaultValue={img.caption ?? ""}
          maxLength={40}
          className="input"
          placeholder="Caption"
        />
        <input
          name="tag"
          defaultValue={img.tag ?? ""}
          maxLength={40}
          className="input"
          placeholder="Small label"
        />
        <div className="flex items-center gap-3 text-xs text-slate-500 sm:col-span-2">
          <span
            className={`badge ${live ? "border-teal/40 text-teal" : "border-edge text-slate-500"}`}
          >
            {liveSlots === undefined ? "shown" : live ? `slot ${index + 1}` : "hidden"}
          </span>
          <span>
            {img.width && img.height ? `${img.width}×${img.height} · ` : ""}
            {kb(img.bytes)}
          </span>
          <button className="btn-ghost text-xs" disabled={pending}>
            Save text
          </button>
          {saved && <span className="text-teal">saved</span>}
        </div>
      </form>

      <div className="flex flex-none gap-1">
        <button
          className="btn-ghost text-xs"
          disabled={pending || index === 0}
          onClick={() => run(() => moveGalleryImage(img.id, "up"))}
          aria-label="Move up"
        >
          ↑
        </button>
        <button
          className="btn-ghost text-xs"
          disabled={pending || index === count - 1}
          onClick={() => run(() => moveGalleryImage(img.id, "down"))}
          aria-label="Move down"
        >
          ↓
        </button>
        <button
          className="btn-danger text-xs"
          disabled={pending}
          onClick={() => {
            if (window.confirm("Delete this image?")) run(() => deleteGalleryImage(img.id));
          }}
        >
          Delete
        </button>
      </div>
    </li>
  );
}
