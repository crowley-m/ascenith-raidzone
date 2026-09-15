"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { postBroadcast } from "@/app/(site)/portal/actions";

type Channel = { id: string; name: string };

export function BroadcastForm({
  channels,
  defaultChannelId,
}: {
  channels: Channel[];
  defaultChannelId: string;
}) {
  const [state, action, pending] = useActionState(postBroadcast, {});
  const ref = useRef<HTMLFormElement>(null);
  const uid = useId();
  const fid = (name: string) => `${uid}-${name}`;
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok]);

  return (
    <form ref={ref} action={action} className="grid gap-4">
      <div>
        <label htmlFor={fid("channelId")} className="label">Channel</label>
        {channels.length > 0 ? (
          <select id={fid("channelId")} name="channelId" className="input" defaultValue={defaultChannelId}>
            {channels.map((c) => (
              <option key={c.id} value={c.id}>
                #{c.name}
              </option>
            ))}
          </select>
        ) : (
          <input
            id={fid("channelId")}
            name="channelId"
            className="input font-mono text-xs"
            placeholder="Channel ID"
            defaultValue={defaultChannelId}
          />
        )}
        {channels.length === 0 && (
          <p className="mt-1 text-xs text-slate-400">
            Couldn&apos;t list channels — paste a channel ID (Developer Mode → right-click channel →
            Copy Channel ID).
          </p>
        )}
      </div>

      <div>
        <label htmlFor={fid("title")} className="label">Title (optional)</label>
        <input id={fid("title")} name="title" className="input" maxLength={200} placeholder="Server maintenance" />
      </div>

      <div>
        <label htmlFor={fid("body")} className="label">Message</label>
        <textarea
          id={fid("body")}
          name="body"
          rows={6}
          className="input"
          maxLength={4000}
          placeholder="What's happening…"
        />
        <p className="mt-1 text-xs text-slate-400">Discord markdown works. Up to 4000 characters.</p>
      </div>

      <div>
        <label htmlFor={fid("imageFile")} className="label">Image (optional)</label>
        <input
          id={fid("imageFile")}
          name="imageFile"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="input text-xs file:mr-3 file:border-0 file:bg-edge file:px-3 file:py-1.5 file:text-slate-200"
        />
        <p className="mt-1 text-xs text-slate-400">
          Upload an image, or paste a URL below — uploading replaces the URL. Attaches even without
          &ldquo;Post as an embed&rdquo;.
        </p>
        <label htmlFor={fid("imageUrl")} className="sr-only">Image URL</label>
        <input
          id={fid("imageUrl")}
          name="imageUrl"
          type="url"
          className="input mt-2 font-mono text-xs"
          placeholder="…or paste a full https:// image URL"
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input type="checkbox" name="asEmbed" className="accent-teal" />
        Post as an embed (boxed, with the RAIDZONE accent)
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input type="checkbox" name="mentionEveryone" className="accent-teal" />
        Ping <span className="font-mono">@everyone</span>
      </label>

      <div className="flex items-center gap-3">
        <button className="btn-primary" disabled={pending}>
          {pending ? "Posting…" : "Post announcement"}
        </button>
        {state.error && <p className="text-xs text-ember">{state.error}</p>}
        {state.ok && <p className="text-xs text-teal">Posted to Discord.</p>}
      </div>
    </form>
  );
}
