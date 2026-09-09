import { requirePermission } from "@/lib/session";
import { db } from "@/lib/db";
import { listGuildRoles } from "@/lib/discord";
import { FactionForm } from "@/components/portal/faction-form";
import { ConfirmButton } from "@/components/portal/confirm-button";
import { deleteFaction } from "@/app/(site)/portal/actions";

export const dynamic = "force-dynamic";

export default async function FactionsPage() {
  await requirePermission("faction:manage");

  const [factions, roles] = await Promise.all([
    db.faction.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { players: true } } },
    }),
    listGuildRoles(),
  ]);

  return (
    <div className="max-w-2xl">
      <h2 className="font-display text-xl font-bold text-white">Factions</h2>
      <p className="mt-1 text-sm text-slate-400">
        Houses players can join — a persistent allegiance, separate from per-event teams. Link a
        Discord role and members get it automatically. They also show on the public{" "}
        <a href="/factions" className="link">
          Factions
        </a>{" "}
        page.
      </p>

      <div className="card mt-6">
        <p className="label mb-2">New faction</p>
        <FactionForm roles={roles} />
      </div>

      <ul className="mt-6 space-y-3">
        {factions.map((f) => (
          <li key={f.id} className="card">
            <details>
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ background: f.color ?? "#2fd4c7" }}
                />
                <span className="font-medium text-slate-100">{f.name}</span>
                {f.tag && <span className="badge">{f.tag}</span>}
                <span className="text-xs text-slate-500">{f._count.players} players</span>
                {f.discordRoleId ? (
                  <span className="badge border-teal/40 text-teal">Discord role linked</span>
                ) : (
                  <span className="text-xs text-slate-600">no Discord role</span>
                )}
              </summary>
              <div className="mt-4 border-t border-edge pt-4">
                <FactionForm
                  roles={roles}
                  faction={{
                    id: f.id,
                    name: f.name,
                    tag: f.tag,
                    color: f.color,
                    description: f.description,
                    discordRoleId: f.discordRoleId,
                  }}
                />
                <div className="mt-3">
                  <ConfirmButton
                    action={deleteFaction.bind(null, f.id)}
                    confirm={`Delete ${f.name}? Players keep their profile but lose the faction and its Discord role.`}
                  >
                    Delete faction
                  </ConfirmButton>
                </div>
              </div>
            </details>
          </li>
        ))}
        {factions.length === 0 && <li className="text-sm text-slate-400">No factions yet.</li>}
      </ul>
    </div>
  );
}
