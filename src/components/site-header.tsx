import Link from "next/link";
import { auth } from "@/auth";
import { isStaff } from "@/lib/rbac";
import { site } from "@/lib/site";

export async function SiteHeader() {
  const session = await auth();
  const user = session?.user;

  return (
    <header className="sticky top-0 z-40 border-b border-edge/70 bg-void/80 backdrop-blur">
      <div className="container-x flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-extrabold tracking-wide text-white">
          <span className="text-teal">▲</span> ASCENITH<span className="text-teal">RAIDZONE</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
          <Link href="/events" className="hover:text-white">Events</Link>
          <Link href="/proof" className="hover:text-white">Rewards</Link>
          <Link href="/rules" className="hover:text-white">Rules &amp; Join</Link>
          <a href={site.discordInvite} target="_blank" rel="noreferrer" className="hover:text-white">Discord</a>
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              {isStaff(user.role) && (
                <Link href="/portal" className="btn-ghost hidden sm:inline-flex">Portal</Link>
              )}
              <Link href="/me" className="btn-primary">My Profile</Link>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost">Log in</Link>
              <Link href="/register" className="btn-primary">Register</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
