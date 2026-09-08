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
      <h1 className="font-poster text-5xl uppercase leading-none text-white">
        Sign in<span className="text-teal">.</span>
      </h1>
      <p className="mt-3 text-sm text-slate-400">Back to the roster.</p>

      <div className="mt-6 border border-edge bg-panel/70">
        <div className="p-5">
          <DiscordButton callbackUrl={callbackUrl} />
          <div className="my-4 flex items-center gap-3 font-mono text-[0.6rem] uppercase tracking-widest text-slate-500">
            <span className="h-px flex-1 bg-edge" /> or <span className="h-px flex-1 bg-edge" />
          </div>

          <form action={action} className="space-y-4">
            <input type="hidden" name="callbackUrl" value={callbackUrl} />
            <div>
              <label className="label" htmlFor="email">
                Email
              </label>
              <input id="email" name="email" type="email" className="input" required />
            </div>
            <div>
              <label className="label" htmlFor="password">
                Password
              </label>
              <input id="password" name="password" type="password" className="input" required />
            </div>
            {state.error && <p className="font-mono text-sm text-ember">{state.error}</p>}
            <button type="submit" className="btn-primary w-full" disabled={pending}>
              {pending ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>

      <p className="mt-4 text-center font-mono text-[0.7rem] uppercase tracking-wide text-slate-400">
        New here?{" "}
        <Link href="/register" className="link">
          Register
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="container-x flex min-h-[80vh] items-center justify-center py-16">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
