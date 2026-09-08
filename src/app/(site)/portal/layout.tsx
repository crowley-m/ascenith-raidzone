import { requireStaff } from "@/lib/session";
import { can, roleLabel } from "@/lib/rbac";
import { SubNav } from "@/components/sub-nav";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();

  const items = [
    { href: "/portal", label: "Overview", show: true },
    { href: "/portal/players", label: "Players", show: can(user.role, "player:view") },
    { href: "/portal/events", label: "Events", show: can(user.role, "event:view") },
    { href: "/portal/rewards", label: "Rewards", show: can(user.role, "reward:view") },
    { href: "/portal/factions", label: "Factions", show: can(user.role, "faction:manage") },
    { href: "/portal/media", label: "Gallery", show: can(user.role, "media:manage") },
    { href: "/portal/staff", label: "Staff", show: can(user.role, "staff:manage") },
  ].filter((i) => i.show);

  return (
    <div className="container-x py-10">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 className="font-display text-2xl font-extrabold text-white">Staff portal</h1>
        <span className="badge border-teal/40 text-teal">{roleLabel(user.role)}</span>
      </div>

      <div className="mt-5">
        <SubNav items={items} />
      </div>

      <div className="mt-8">{children}</div>
    </div>
  );
}
