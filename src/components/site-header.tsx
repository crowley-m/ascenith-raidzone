import Link from "next/link";
import { auth } from "@/auth";
import { isStaff } from "@/lib/rbac";
import { site } from "@/lib/site";
import { AccountMenu } from "@/components/account-menu";
import { NavOverlay } from "@/components/nav-overlay";

const NAV = [
  { href: "/events", label: "Events" },
  { href: "/teams", label: "Teams" },
  { href: "/winners", label: "Winners" },
  { href: "/rules", label: "Rules" },
  { href: "/about", label: "About" },
];

export async function SiteHeader() {
  const session = await auth();
  const user = session?.user;

  return (
    <header className="sticky top-0 z-40 border-b border-edge bg-void/85 backdrop-blur">
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-mono text-[0.78rem] font-bold uppercase tracking-[0.16em] text-white"
        >
          <span className="h-2 w-2 flex-none rounded-full bg-teal" />
          ASCENITH&middot;RAIDZONE
        </Link>

        <nav className="hidden items-center gap-6 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-slate-300 md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="hover:text-white">
              {n.label}
            </Link>
          ))}
          <a
            href={site.discordInvite}
            target="_blank"
            rel="noreferrer"
            className="hover:text-white"
          >
            Discord
          </a>
        </nav>

        {/* desktop: account / auth */}
        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <AccountMenu
              name={user.name ?? user.email ?? "Account"}
              isStaff={isStaff(user.role)}
              nav={NAV}
            />
          ) : (
            <>
              <Link
                href="/login"
                className="font-mono text-[0.66rem] font-bold uppercase tracking-[0.16em] text-slate-300 hover:text-white"
              >
                Sign in
              </Link>
              <Link href="/register" className="btn-primary">
                Register
              </Link>
            </>
          )}
        </div>

        {/* mobile: everything behind one fullscreen menu */}
        <div className="md:hidden">
          <NavOverlay
            pages={[...NAV, { href: site.discordInvite, label: "Discord", external: true }]}
            account={
              user ? { name: user.name ?? user.email ?? "Account", isStaff: isStaff(user.role) } : null
            }
          />
        </div>
      </div>
    </header>
  );
}
