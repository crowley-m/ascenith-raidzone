"use client";

import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { loginAction, type LoginState } from "./actions";
import { DiscordButton } from "@/components/discord-button";

const initial: LoginState = {};

function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initial);
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/me";

  return (
    <div className="w-full max-w-md">
      <h1 className="font-display text-2xl font-extrabold text-white">Log in</h1>
      <p className="mt-2 text-sm text-slate-400">Welcome back to ASCENITH RAIDZONE.</p>

      <div className="card mt-6">
        <DiscordButton callbackUrl={callbackUrl} />
        <div className="my-4 flex items-center gap-3 text-xs text-slate-500">
          <span className="h-px flex-1 bg-edge" /> or <span className="h-px flex-1 bg-edge" />
        </div>

        <form action={action} className="space-y-4">
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" className="input" required />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" name="password" type="password" className="input" required />
          </div>
          {state.error && <p className="text-sm text-ember">{state.error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={pending}>
            {pending ? "Logging in…" : "Log in"}
          </button>
        </form>
      </div>

      <p className="mt-4 text-center text-sm text-slate-400">
        No account? <Link href="/register" className="link">Register</Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="container-x flex justify-center py-20">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
