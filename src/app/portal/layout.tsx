import Link from "next/link";
import { requireStaff } from "@/lib/session";
import { can } from "@/lib/rbac";
import { roleLabel } from "@/lib/rbac";
import { SubNav } from "@/components/sub-nav";
import { SignOutButton } from "@/components/sign-out-button";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();

  const items = [
    { href: "/portal", label: "Overview", show: true },
    { href: "/portal/players", label: "Players", show: can(user.role, "player:view") },
    { href: "/portal/events", label: "Events", show: can(user.role, "event:view") },
    { href: "/portal/rewards", label: "Rewards", show: can(user.role, "reward:view") },
    { href: "/portal/factions", label: "Factions", show: can(user.role, "faction:manage") },
    { href: "/portal/staff", label: "Staff", show: can(user.role, "staff:manage") },
  ].filter((i) => i.show);

  return (
    <div className="container-x py-12">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-teal">Staff portal</p>
          <h1 className="font-display text-2xl font-extrabold text-white">ASCENITH RAIDZONE</h1>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <span className="badge border-teal/40 text-teal">{roleLabel(user.role)}</span>
          <Link href="/me" className="hover:text-white">My profile</Link>
          <SignOutButton />
        </div>
      </div>

      <div className="mt-6">
        <SubNav items={items} />
      </div>

      <div className="mt-8">{children}</div>
    </div>
  );
}
