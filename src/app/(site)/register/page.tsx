"use client";

import Link from "next/link";
import { DiscordButton } from "@/components/discord-button";

export default function RegisterPage() {
  return (
    <div className="container-x flex min-h-[70vh] items-center justify-center py-16">
      <div className="w-full max-w-md">
        <h1 className="font-poster text-5xl uppercase leading-none text-white">
          Register<span className="text-teal">.</span>
        </h1>
        <p className="mt-3 text-sm text-slate-400">
          One profile — sign up for events, get your rewards, get on the roster.
        </p>

        <div className="mt-6 border border-edge bg-panel/70 p-5">
          <DiscordButton callbackUrl="/me/profile?new=1" />
          <p className="mt-3 text-xs text-slate-500">
            Sign in with the Discord account you use in the ASCENITH RAIDZONE server. Your
            profile links automatically — then fill in your in-game details.
          </p>
        </div>

        <p className="mt-4 text-center font-mono text-[0.7rem] uppercase tracking-wide text-slate-400">
          Already registered?{" "}
          <Link href="/login" className="link">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
