import Link from "next/link";
import { relative } from "@/lib/format";
import { fmtInZone, DEFAULT_EVENT_TZ } from "@/lib/tz";
import { LiveCountdown } from "@/components/live-countdown";

export type EventCardData = {
  id: string;
  title: string;
  description?: string | null;
  startsAt: Date;
  endsAt?: Date | null;
  timezone?: string | null;
  server?: string | null;
  format?: string | null;
  maxSlots?: number | null;
  status: string;
  _count?: { signups: number };
};

export function EventCard({ event, href }: { event: EventCardData; href?: string }) {
  const signups = event._count?.signups ?? 0;
  const now = Date.now();
  const live =
    event.status === "PUBLISHED" &&
    event.startsAt.getTime() <= now &&
    (event.endsAt ? event.endsAt.getTime() > now : false);
  const open =
    event.status === "PUBLISHED" &&
    (event.endsAt ? event.endsAt.getTime() > now : event.startsAt.getTime() > now);
  const upcoming = event.status === "PUBLISHED" && event.startsAt.getTime() > now;

  const pct = event.maxSlots ? Math.min(100, Math.round((signups / event.maxSlots) * 100)) : null;
  const nearlyFull = pct !== null && pct >= 85 && pct < 100;
  const full = pct === 100;

  return (
    <Link
      href={href ?? `/events/${event.id}`}
      className="card group block transition hover:border-teal/50"
    >
      <div className="flex items-center justify-between gap-3">
        {live ? (
          <span className="badge border-teal/50 text-teal">
            <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-teal align-middle" />
            Running now
          </span>
        ) : (
          <span className="badge">
            {upcoming ? (
              <LiveCountdown target={event.startsAt.toISOString()} fallback={relative(event.startsAt)} />
            ) : (
              relative(event.startsAt)
            )}
          </span>
        )}
        {event.status !== "PUBLISHED" && (
          <span className="badge border-ember/40 text-ember">{event.status}</span>
        )}
      </div>
      <h3 className="mt-3 font-display text-lg font-bold text-white group-hover:text-teal">
        {event.title}
        {event.format === "TEAM" && (
          <span className="ml-2 align-middle text-[0.6rem] uppercase tracking-wide text-slate-400">
            team event
          </span>
        )}
      </h3>
      {event.description && (
        <p className="mt-1 line-clamp-2 text-sm text-slate-400">{event.description}</p>
      )}
      <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-400">
        <div>
          <dt className="inline text-slate-400">When: </dt>
          <dd className="inline">{fmtInZone(event.startsAt, event.timezone ?? DEFAULT_EVENT_TZ)}</dd>
        </div>
        {event.server && (
          <div>
            <dt className="inline text-slate-400">Server: </dt>
            <dd className="inline">{event.server}</dd>
          </div>
        )}
        <div>
          <dt className="inline text-slate-400">Signed up: </dt>
          <dd className="inline">
            {signups}
            {event.maxSlots ? ` / ${event.maxSlots}` : ""}
          </dd>
        </div>
      </dl>
      {pct !== null && (
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-edge">
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${
              full ? "bg-ember" : nearlyFull ? "animate-pulse bg-ember" : "bg-teal"
            }`}
            style={{ width: `${Math.max(pct, signups > 0 ? 4 : 0)}%` }}
          />
        </div>
      )}
      {open && (
        <p className="mt-4 font-mono text-[0.7rem] font-bold uppercase tracking-[0.16em] text-teal">
          {live ? "Join the wipe" : "Sign up"} <span aria-hidden>→</span>
        </p>
      )}
    </Link>
  );
}
