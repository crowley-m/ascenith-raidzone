"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DiscordButton } from "@/components/discord-button";

function LoginForm() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/me";

  return (
    <div className="w-full max-w-md">
      <h1 className="font-poster text-5xl uppercase leading-none text-white">
        Sign in<span className="text-teal">.</span>
      </h1>
      <p className="mt-3 text-sm text-slate-400">Back to the roster.</p>

      <div className="mt-6 border border-edge bg-panel/70 p-5">
        <DiscordButton callbackUrl={callbackUrl} />
        <p className="mt-3 text-xs text-slate-500">
          ASCENITH RAIDZONE uses your Discord account — no separate password.
        </p>
      </div>

      <p className="mt-4 text-center font-mono text-[0.7rem] uppercase tracking-wide text-slate-400">
        First time?{" "}
        <Link href="/register" className="link">
          Register
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="container-x flex min-h-[70vh] items-center justify-center py-16">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
