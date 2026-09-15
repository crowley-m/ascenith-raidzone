import { requireStaff } from "@/lib/session";
import { can, roleLabel } from "@/lib/rbac";
import { db } from "@/lib/db";
import { PortalNav } from "@/components/portal/portal-nav";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff();

  // ambient counts for the nav dots — cheap, and only queried for sections the role can see
  const [pendingPlayers, openDisputes] = await Promise.all([
    can(user.role, "player:view") ? db.player.count({ where: { status: "PENDING" } }) : 0,
    can(user.role, "reward:view") ? db.reward.count({ where: { disputedAt: { not: null } } }) : 0,
  ]);

  const items = [
    { href: "/portal", label: "Overview", show: true },
    { href: "/portal/analytics", label: "Analytics", show: can(user.role, "player:view") },
    { href: "/portal/players", label: "Players", show: can(user.role, "player:view"), dot: pendingPlayers > 0 },
    { href: "/portal/teams", label: "Teams", show: can(user.role, "player:view") },
    { href: "/portal/events", label: "Events", show: can(user.role, "event:view") },
    { href: "/portal/broadcast", label: "Broadcast", show: can(user.role, "event:manage") },
    { href: "/portal/seasons", label: "Seasons", show: can(user.role, "event:manage") },
    { href: "/portal/rewards", label: "Rewards", show: can(user.role, "reward:view"), dot: openDisputes > 0 },
    { href: "/portal/factions", label: "Factions", show: can(user.role, "faction:manage") },
    { href: "/portal/discord", label: "Discord", show: can(user.role, "discord:manage") },
    { href: "/portal/media", label: "Gallery", show: can(user.role, "media:manage") },
    { href: "/portal/staff", label: "Staff", show: can(user.role, "staff:manage") },
    { href: "/portal/audit", label: "Audit", show: can(user.role, "settings:manage") },
    { href: "/portal/settings", label: "Settings", show: can(user.role, "settings:manage") },
  ].filter((i) => i.show);

  return (
    <div className="mx-auto w-full max-w-[100rem] px-5 py-10">
      <a
        href="#portal-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:bg-teal focus:px-3 focus:py-2 focus:font-mono focus:text-xs focus:uppercase focus:tracking-widest focus:text-void"
      >
        Skip portal navigation
      </a>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 className="font-display text-2xl font-extrabold text-white">Staff portal</h1>
        <div className="flex items-center gap-3">
          <form action="/portal/search" className="flex items-center">
            <input
              name="q"
              aria-label="Search players, teams, events"
              placeholder="Search players, teams, events…"
              className="input w-56 py-1.5 text-xs sm:w-72"
            />
          </form>
          <span className="badge border-teal/40 text-teal">{roleLabel(user.role)}</span>
        </div>
      </div>

      <div className="mt-6 gap-8 lg:grid lg:grid-cols-[12rem_1fr]">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <PortalNav items={items} />
        </aside>
        <div id="portal-content" tabIndex={-1} className="mt-6 min-w-0 focus:outline-none lg:mt-0">
          {children}
        </div>
      </div>
    </div>
  );
}
