import Link from "next/link";
import { auth } from "@/auth";
import { isStaff } from "@/lib/rbac";
import { site } from "@/lib/site";

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
          <Link href="/events" className="hover:text-white">
            Events
          </Link>
          <Link href="/proof" className="hover:text-white">
            Results
          </Link>
          <Link href="/rules" className="hover:text-white">
            Rules
          </Link>
          <a
            href={site.discordInvite}
            target="_blank"
            rel="noreferrer"
            className="hover:text-white"
          >
            Discord
          </a>
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              {isStaff(user.role) && (
                <Link href="/portal" className="btn-ghost hidden sm:inline-flex">
                  Portal
                </Link>
              )}
              <Link href="/me" className="btn-primary">
                My profile
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden font-mono text-[0.66rem] font-bold uppercase tracking-[0.16em] text-slate-300 hover:text-white sm:inline"
              >
                Sign in
              </Link>
              <Link href="/register" className="btn-primary">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
