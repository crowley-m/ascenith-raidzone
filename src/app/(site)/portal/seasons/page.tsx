import { requirePermission } from "@/lib/session";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { SeasonForm } from "@/components/portal/season-form";
import { ConfirmButton } from "@/components/portal/confirm-button";
import { deleteSeason } from "@/app/(site)/portal/actions";

export const dynamic = "force-dynamic";

const d = (v: Date | null) => (v ? v.toISOString().slice(0, 10) : "");

export default async function SeasonsPage() {
  await requirePermission("event:manage");

  const seasons = await db.season.findMany({
    orderBy: { number: "desc" },
    include: { _count: { select: { events: true } } },
  });
  const nextNumber = (seasons[0]?.number ?? 0) + 1;

  return (
    <div className="max-w-2xl">
      <h2 className="font-display text-xl font-bold text-white">Seasons</h2>
      <p className="mt-1 text-sm text-slate-400">
        Events roll up into a season; the Hall of Winners shows its champion. Crowning a winner is
        just editing the season here — no deploy.
      </p>

      <div className="card mt-6">
        <p className="label mb-2">New season</p>
        <SeasonForm nextNumber={nextNumber} />
      </div>

      <ul className="mt-6 space-y-3">
        {seasons.map((s) => (
          <li key={s.id} className="card">
            <details>
              <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 list-none">
                <span className="font-display font-bold text-white">
                  Season {s.number}
                  {s.name ? ` · ${s.name}` : ""}
                </span>
                <span className="badge">{s.status}</span>
                {s.championName ? (
                  <span className="text-sm text-teal">🏆 {s.championName}</span>
                ) : (
                  <span className="text-xs text-slate-500">no champion yet</span>
                )}
                <span className="text-xs text-slate-500">
                  {s._count.events} event{s._count.events === 1 ? "" : "s"}
                  {s.startsAt ? ` · from ${fmtDate(s.startsAt)}` : ""}
                </span>
              </summary>

              <div className="mt-4 border-t border-edge pt-4">
                <SeasonForm
                  season={{
                    id: s.id,
                    number: s.number,
                    name: s.name,
                    status: s.status,
                    startsAt: d(s.startsAt),
                    endsAt: d(s.endsAt),
                    prizePoolText: s.prizePoolText,
                    championName: s.championName,
                    championNote: s.championNote,
                    posterUrl: s.posterUrl,
                    blurb: s.blurb,
                  }}
                />
                <div className="mt-3">
                  <ConfirmButton
                    action={deleteSeason.bind(null, s.id)}
                    confirm={`Delete Season ${s.number}? Events stay but lose their season link.`}
                  >
                    Delete season
                  </ConfirmButton>
                </div>
              </div>
            </details>
          </li>
        ))}
        {seasons.length === 0 && <li className="text-sm text-slate-400">No seasons yet.</li>}
      </ul>
    </div>
  );
}
