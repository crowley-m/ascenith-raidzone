import { requireUser } from "@/lib/session";
import { SubNav } from "@/components/sub-nav";
import { roleLabel } from "@/lib/rbac";

export default async function MeLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="container-x py-10">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 className="font-display text-2xl font-extrabold text-white">Your account</h1>
        <p className="font-mono text-xs uppercase tracking-wide text-slate-500">
          {user.name ?? user.email ?? "Player"} &middot; {roleLabel(user.role)}
        </p>
      </div>

      <div className="mt-5">
        <SubNav
          items={[
            { href: "/me", label: "Overview" },
            { href: "/me/profile", label: "Profile" },
            { href: "/me/events", label: "My events" },
            { href: "/me/rewards", label: "My rewards" },
          ]}
        />
      </div>

      <div className="mt-8">{children}</div>
    </div>
  );
}
