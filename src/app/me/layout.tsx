import { requireUser } from "@/lib/session";
import { SubNav } from "@/components/sub-nav";
import { SignOutButton } from "@/components/sign-out-button";
import { roleLabel } from "@/lib/rbac";

export default async function MeLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="container-x py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-white">
            {user.name ?? "Your account"}
          </h1>
          <p className="text-sm text-slate-500">
            {user.email ?? "Discord account"} · {roleLabel(user.role)}
          </p>
        </div>
        <SignOutButton className="btn-ghost" />
      </div>

      <div className="mt-6">
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
