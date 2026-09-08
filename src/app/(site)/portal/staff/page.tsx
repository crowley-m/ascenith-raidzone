import { requirePermission } from "@/lib/session";
import { db } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { StaffRoleForm } from "@/components/portal/staff-role-form";
import { ConfirmButton } from "@/components/portal/confirm-button";
import { removeStaffRole } from "@/app/(site)/portal/actions";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const me = await requirePermission("staff:manage");

  const [staff, candidates] = await Promise.all([
    db.staffRole.findMany({
      orderBy: { role: "asc" },
      include: { user: { select: { id: true, name: true, email: true, discordUsername: true } } },
    }),
    db.user.findMany({
      where: { staffRole: null },
      orderBy: [{ name: "asc" }, { discordUsername: "asc" }],
      take: 200,
      select: { id: true, name: true, email: true, discordUsername: true },
    }),
  ]);

  return (
    <div className="max-w-2xl">
      <h2 className="font-display text-xl font-bold text-white">Staff</h2>
      <p className="mt-1 text-sm text-slate-400">
        Owner &gt; Admin &gt; Moderator. Pick anyone who has signed in — email or Discord, doesn&apos;t
        matter.
      </p>

      <div className="card mt-6">
        <StaffRoleForm candidates={candidates} />
      </div>

      <ul className="mt-6 space-y-2">
        {staff.map((s) => (
          <li key={s.id} className="card flex items-center justify-between">
            <span>
              <span className="font-medium text-slate-100">
                {s.user.name ?? s.user.discordUsername ?? s.user.email}
              </span>
              <span className="badge ml-2 border-teal/40 text-teal">{s.role}</span>
              <span className="block text-xs text-slate-500">
                {s.user.email} · since {fmtDate(s.createdAt)}
              </span>
            </span>
            {s.user.id !== me.id && (
              <ConfirmButton
                action={removeStaffRole.bind(null, s.user.id)}
                confirm={`Remove staff access for ${s.user.name ?? s.user.email}?`}
              >
                Remove
              </ConfirmButton>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
