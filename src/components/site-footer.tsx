import Link from "next/link";
import { site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-edge/70 bg-void/60">
      <div className="container-x grid gap-8 py-12 md:grid-cols-3">
        <div>
          <div className="font-display text-lg font-bold text-white">ASCENITH RAIDZONE</div>
          <p className="mt-2 max-w-xs text-sm text-slate-400">
            A {site.game} community running custom servers, events, and rewards. Run by {site.owner}.
          </p>
        </div>
        <div className="text-sm">
          <div className="label">Community</div>
          <ul className="space-y-1 text-slate-400">
            <li><Link href="/events" className="hover:text-white">Events</Link></li>
            <li><Link href="/proof" className="hover:text-white">Reward proof</Link></li>
            <li><Link href="/rules" className="hover:text-white">Rules &amp; how to join</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <div className="label">Account</div>
          <ul className="space-y-1 text-slate-400">
            <li><Link href="/register" className="hover:text-white">Register</Link></li>
            <li><Link href="/login" className="hover:text-white">Log in</Link></li>
            <li><a href={site.discordInvite} target="_blank" rel="noreferrer" className="hover:text-white">Join the Discord</a></li>
          </ul>
        </div>
      </div>
      <div className="container-x border-t border-edge/50 py-5 text-xs text-slate-500">
        © {new Date().getFullYear()} ASCENITH RAIDZONE. Not affiliated with the developers of {site.game}.
      </div>
    </footer>
  );
}
