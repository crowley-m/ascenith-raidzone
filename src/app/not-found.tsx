import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Lost the trail" };

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-void px-6 text-center">
      <p className="font-mono text-[0.72rem] font-bold uppercase tracking-[0.3em] text-teal">
        404 · off the map
      </p>
      <h1 className="mt-4 font-poster text-[22vw] uppercase leading-none text-white sm:text-[9rem]">
        Lost the trail
      </h1>
      <p className="mt-4 max-w-md text-sm text-slate-400">
        That page isn&apos;t on the roster. It may have been moved, or the link is stale.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn-primary">
          Back to base
        </Link>
        <Link href="/events" className="btn-ghost">
          Browse events
        </Link>
      </div>
    </div>
  );
}
