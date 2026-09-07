import Link from "next/link";
import { fmtDateTime, relative } from "@/lib/format";

export type EventCardData = {
  id: string;
  title: string;
  description?: string | null;
  startsAt: Date;
  server?: string | null;
  maxSlots?: number | null;
  status: string;
  _count?: { signups: number };
};

export function EventCard({ event, href }: { event: EventCardData; href?: string }) {
  const signups = event._count?.signups ?? 0;
  return (
    <Link
      href={href ?? `/events/${event.id}`}
      className="card group block transition hover:border-teal/50"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="badge">{relative(event.startsAt)}</span>
        {event.status !== "PUBLISHED" && (
          <span className="badge border-ember/40 text-ember">{event.status}</span>
        )}
      </div>
      <h3 className="mt-3 font-display text-lg font-bold text-white group-hover:text-teal">
        {event.title}
      </h3>
      {event.description && (
        <p className="mt-1 line-clamp-2 text-sm text-slate-400">{event.description}</p>
      )}
      <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-400">
        <div>
          <dt className="inline text-slate-500">When: </dt>
          <dd className="inline">{fmtDateTime(event.startsAt)}</dd>
        </div>
        {event.server && (
          <div>
            <dt className="inline text-slate-500">Server: </dt>
            <dd className="inline">{event.server}</dd>
          </div>
        )}
        <div>
          <dt className="inline text-slate-500">Signed up: </dt>
          <dd className="inline">
            {signups}
            {event.maxSlots ? ` / ${event.maxSlots}` : ""}
          </dd>
        </div>
      </dl>
    </Link>
  );
}
