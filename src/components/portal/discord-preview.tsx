import type { ReactNode } from "react";
import type { Event } from "@prisma/client";
import { eventChannelPayloads, EVENT_CHANNEL_ORDER } from "@/lib/event-channels";

/**
 * Renders the exact embeds the bot will post to each event channel, styled
 * roughly like Discord, so staff can check the content before Build / Sync.
 * Server component — no interactivity.
 */

const CHANNEL_TITLE: Record<string, string> = {
  announcement: "#announcement",
  "how-to-join": "#how-to-join",
  registration: "#registration",
  rules: "#rules",
  gameplay: "#gameplay",
  schedule: "#schedule",
  "wipe-info": "#wipe-info",
  rewards: "#rewards",
};

const fmtStamp = (unix: number, style: string) => {
  const d = new Date(unix * 1000);
  if (style === "R") {
    const diff = d.getTime() - Date.now();
    const days = Math.round(diff / 86_400_000);
    if (Math.abs(days) >= 1) return days > 0 ? `in ${days}d` : `${-days}d ago`;
    const hrs = Math.round(diff / 3_600_000);
    return hrs > 0 ? `in ${hrs}h` : `${-hrs}h ago`;
  }
  return d.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/** Discord-ish inline markdown → React nodes: **bold**, [text](url), <t:..>, <#id>. */
function inline(text: string, channelNames: Map<string, string>, key: string) {
  const nodes: ReactNode[] = [];
  const re =
    /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)]+)\)|<t:(\d+)(?::([tTdDfFR]))?>|<#(\d+)>|@everyone/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      nodes.push(
        <strong key={`${key}-${i}`} className="font-semibold text-white">
          {m[1]}
        </strong>,
      );
    } else if (m[2] !== undefined) {
      nodes.push(
        <span key={`${key}-${i}`} className="text-[#00a8fc] underline">
          {m[2]}
        </span>,
      );
    } else if (m[4] !== undefined) {
      nodes.push(
        <span key={`${key}-${i}`} className="rounded bg-[#3c4270] px-1 text-[#dee0fc]">
          {fmtStamp(Number(m[4]), m[5] ?? "f")}
        </span>,
      );
    } else if (m[6] !== undefined) {
      nodes.push(
        <span key={`${key}-${i}`} className="rounded bg-[#3c4270] px-1 text-[#c9cdfb]">
          {channelNames.get(m[6]) ?? "#channel"}
        </span>,
      );
    } else {
      nodes.push(
        <span key={`${key}-${i}`} className="rounded bg-[#3c4270] px-1 text-[#c9cdfb]">
          @everyone
        </span>,
      );
    }
    last = m.index + m[0].length;
    i++;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function Body({
  text,
  channelNames,
}: {
  text: string;
  channelNames: Map<string, string>;
}) {
  return (
    <div className="space-y-0.5 whitespace-pre-wrap text-sm leading-relaxed text-[#dbdee1]">
      {text.split("\n").map((line, i) =>
        line.trim() === "" ? (
          <div key={i} className="h-2" />
        ) : (
          <div key={i}>{inline(line, channelNames, `l${i}`)}</div>
        ),
      )}
    </div>
  );
}

export function DiscordPreview({ event }: { event: Event }) {
  const payloads = eventChannelPayloads(event);
  const channels = (event.discordChannels as Record<string, string>) ?? {};
  const channelNames = new Map(
    Object.entries(channels).map(([name, id]) => [id, `#${name}`]),
  );
  const order = EVENT_CHANNEL_ORDER.filter((n) => payloads[n]);

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        Exactly what the bot posts to each channel. Build the space, or use{" "}
        <span className="text-slate-300">Sync channels</span> after edits.
      </p>
      <div className="grid gap-4">
        {order.map((name) => {
          const p = payloads[name];
          const e = p.embed;
          return (
            <div key={name} className="overflow-hidden rounded-md border border-edge bg-[#313338]">
              <div className="flex items-center gap-2 border-b border-black/30 bg-black/20 px-3 py-1.5">
                <span className="font-mono text-xs font-bold uppercase tracking-wide text-slate-400">
                  {CHANNEL_TITLE[name] ?? `#${name}`}
                </span>
                {p.mentionEveryone && (
                  <span className="rounded bg-[#3c4270] px-1 text-[0.7rem] text-[#c9cdfb]">
                    @everyone
                  </span>
                )}
              </div>
              <div className="p-3">
                {e ? (
                  <div className="border-l-4 border-[#e5484d] bg-[#2b2d31] p-3">
                    {e.author?.name && (
                      <div className="mb-1 text-xs font-semibold text-[#dbdee1]">
                        {e.author.name}
                      </div>
                    )}
                    {e.title && (
                      <div className="mb-1 font-semibold text-white">{e.title}</div>
                    )}
                    {e.description && (
                      <div className="mb-2">
                        <Body text={e.description} channelNames={channelNames} />
                      </div>
                    )}
                    {e.fields && e.fields.length > 0 && (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {e.fields.map((f, i) => (
                          <div key={i} className={f.inline ? "" : "sm:col-span-2"}>
                            {f.name.trim() && (
                              <div className="text-xs font-semibold text-white">{f.name}</div>
                            )}
                            <Body text={f.value} channelNames={channelNames} />
                          </div>
                        ))}
                      </div>
                    )}
                    {e.image?.url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={e.image.url}
                        alt=""
                        className="mt-3 max-h-64 rounded border border-black/30 object-contain"
                      />
                    )}
                    {e.footer?.text && (
                      <div className="mt-2 text-[0.7rem] text-slate-500">{e.footer.text}</div>
                    )}
                  </div>
                ) : (
                  <Body text={p.content ?? ""} channelNames={channelNames} />
                )}
                {p.components?.[0]?.components?.[0]?.label && (
                  <div className="mt-2">
                    <span className="inline-block rounded bg-[#4e5058] px-3 py-1 text-xs font-medium text-white">
                      {p.components[0].components[0].label}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
