import Link from "next/link";
import { site, socials } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-edge bg-void/60">
      <div className="container-x grid gap-8 py-12 md:grid-cols-3">
        <div>
          <div className="font-mono text-[0.78rem] font-bold uppercase tracking-[0.16em] text-white">
            ASCENITH&middot;RAIDZONE
          </div>
          <p className="mt-3 max-w-xs font-mono text-[0.7rem] uppercase leading-relaxed tracking-wide text-slate-400">
            A {site.game} community running a custom server, weekly RaidZone tournaments, and
            sponsored prizes. Run by {site.owner}.
          </p>
          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 font-mono text-[0.66rem] uppercase tracking-[0.14em] text-slate-400">
            {socials.map((sm) => (
              <li key={sm.href}>
                <a href={sm.href} target="_blank" rel="noreferrer" className="hover:text-white">
                  {sm.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="eyebrow">Community</div>
          <ul className="mt-2 space-y-1.5 font-mono text-[0.7rem] uppercase tracking-wide text-slate-400">
            <li>
              <Link href="/about" className="hover:text-white">
                About
              </Link>
            </li>
            <li>
              <Link href="/events" className="hover:text-white">
                Events
              </Link>
            </li>
            <li>
              <Link href="/teams" className="hover:text-white">
                Teams
              </Link>
            </li>
            <li>
              <Link href="/seasons" className="hover:text-white">
                Seasons
              </Link>
            </li>
            <li>
              <Link href="/winners" className="hover:text-white">
                Winners
              </Link>
            </li>
            <li>
              <Link href="/rules" className="hover:text-white">
                Rules &amp; how to join
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <div className="eyebrow">Account</div>
          <ul className="mt-2 space-y-1.5 font-mono text-[0.7rem] uppercase tracking-wide text-slate-400">
            <li>
              <Link href="/register" className="hover:text-white">
                Register
              </Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-white">
                Sign in
              </Link>
            </li>
            <li>
              <a
                href={site.discordInvite}
                target="_blank"
                rel="noreferrer"
                className="hover:text-white"
              >
                Join the Discord
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="container-x flex flex-wrap items-center justify-between gap-3 border-t border-edge py-5 font-mono text-[0.66rem] uppercase tracking-[0.14em] text-slate-500">
        <span>&copy; {new Date().getFullYear()} ASCENITH RAIDZONE</span>
        <span>Made by Crowley</span>
      </div>
    </footer>
  );
}
