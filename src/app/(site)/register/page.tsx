"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction, type RegisterState } from "./actions";
import { DiscordButton } from "@/components/discord-button";

const initial: RegisterState = {};

export default function RegisterPage() {
  const [state, action, pending] = useActionState(registerAction, initial);

  return (
    <div className="container-x flex min-h-[80vh] items-center justify-center py-16">
      <div className="w-full max-w-md">
        <h1 className="font-poster text-5xl uppercase leading-none text-white">
          Register<span className="text-teal">.</span>
        </h1>
        <p className="mt-3 text-sm text-slate-400">
          One profile — sign up for events, get your rewards, get on the roster.
        </p>

        <div className="mt-6 border border-edge bg-panel/70">

          <div className="p-5">
            <DiscordButton callbackUrl="/me/profile?new=1" />
            <div className="my-4 flex items-center gap-3 font-mono text-[0.6rem] uppercase tracking-widest text-slate-500">
              <span className="h-px flex-1 bg-edge" /> or with email{" "}
              <span className="h-px flex-1 bg-edge" />
            </div>

            <form action={action} className="space-y-4">
              <div>
                <label className="label" htmlFor="characterName">
                  Once Human character name
                </label>
                <input
                  id="characterName"
                  name="characterName"
                  className="input"
                  required
                  maxLength={60}
                />
                {state.fieldErrors?.characterName && (
                  <p className="mt-1 font-mono text-xs text-ember">
                    {state.fieldErrors.characterName}
                  </p>
                )}
              </div>
              <div>
                <label className="label" htmlFor="email">
                  Email
                </label>
                <input id="email" name="email" type="email" className="input" required />
                {state.fieldErrors?.email && (
                  <p className="mt-1 font-mono text-xs text-ember">{state.fieldErrors.email}</p>
                )}
              </div>
              <div>
                <label className="label" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  className="input"
                  required
                  minLength={8}
                />
                {state.fieldErrors?.password && (
                  <p className="mt-1 font-mono text-xs text-ember">
                    {state.fieldErrors.password}
                  </p>
                )}
              </div>
              <div>
                <label className="label" htmlFor="confirm">
                  Confirm password
                </label>
                <input
                  id="confirm"
                  name="confirm"
                  type="password"
                  className="input"
                  required
                  minLength={8}
                />
                {state.fieldErrors?.confirm && (
                  <p className="mt-1 font-mono text-xs text-ember">
                    {state.fieldErrors.confirm}
                  </p>
                )}
              </div>

              {state.error && <p className="font-mono text-sm text-ember">{state.error}</p>}

              <button type="submit" className="btn-primary w-full" disabled={pending}>
                {pending ? "Creating…" : "Register"}
              </button>
            </form>
          </div>
        </div>

        <p className="mt-4 text-center font-mono text-[0.7rem] uppercase tracking-wide text-slate-400">
          Already on the roster?{" "}
          <Link href="/login" className="link">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
