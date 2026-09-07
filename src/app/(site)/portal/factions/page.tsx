import { requirePermission } from "@/lib/session";
import { db } from "@/lib/db";
import { FactionForm } from "@/components/portal/faction-form";
import { ConfirmButton } from "@/components/portal/confirm-button";
import { deleteFaction } from "@/app/(site)/portal/actions";

export const dynamic = "force-dynamic";

export default async function FactionsPage() {
  await requirePermission("faction:manage");

  const factions = await db.faction.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { players: true } } },
  });

  return (
    <div className="max-w-2xl">
      <h2 className="font-display text-xl font-bold text-white">Factions</h2>
      <p className="mt-1 text-sm text-slate-400">Teams players can be assigned to.</p>

      <div className="card mt-6">
        <FactionForm />
      </div>

      <ul className="mt-6 space-y-2">
        {factions.map((f) => (
          <li key={f.id} className="card flex items-center justify-between">
            <span className="flex items-center gap-3">
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ background: f.color ?? "#2fd4c7" }}
              />
              <span className="font-medium text-slate-100">{f.name}</span>
              {f.tag && <span className="badge">{f.tag}</span>}
              <span className="text-xs text-slate-500">{f._count.players} players</span>
            </span>
            <ConfirmButton
              action={deleteFaction.bind(null, f.id)}
              confirm={`Delete ${f.name}? Players keep their profile but lose the faction.`}
            >
              Delete
            </ConfirmButton>
          </li>
        ))}
        {factions.length === 0 && <li className="text-sm text-slate-400">No factions yet.</li>}
      </ul>
    </div>
  );
}
