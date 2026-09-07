"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction, type RegisterState } from "./actions";
import { DiscordButton } from "@/components/discord-button";

const initial: RegisterState = {};

export default function RegisterPage() {
  const [state, action, pending] = useActionState(registerAction, initial);

  return (
    <div className="container-x flex justify-center py-20">
      <div className="w-full max-w-md">
        <h1 className="font-display text-2xl font-extrabold text-white">Create your profile</h1>
        <p className="mt-2 text-sm text-slate-400">
          Register to join events and track your rewards.
        </p>

        <div className="card mt-6">
          <DiscordButton callbackUrl="/me/profile?new=1" />
          <div className="my-4 flex items-center gap-3 text-xs text-slate-500">
            <span className="h-px flex-1 bg-edge" /> or with email <span className="h-px flex-1 bg-edge" />
          </div>

          <form action={action} className="space-y-4">
            <div>
              <label className="label" htmlFor="characterName">Once Human character name</label>
              <input id="characterName" name="characterName" className="input" required maxLength={60} />
              {state.fieldErrors?.characterName && (
                <p className="mt-1 text-xs text-ember">{state.fieldErrors.characterName}</p>
              )}
            </div>
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" name="email" type="email" className="input" required />
              {state.fieldErrors?.email && (
                <p className="mt-1 text-xs text-ember">{state.fieldErrors.email}</p>
              )}
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input id="password" name="password" type="password" className="input" required minLength={8} />
              {state.fieldErrors?.password && (
                <p className="mt-1 text-xs text-ember">{state.fieldErrors.password}</p>
              )}
            </div>
            <div>
              <label className="label" htmlFor="confirm">Confirm password</label>
              <input id="confirm" name="confirm" type="password" className="input" required minLength={8} />
              {state.fieldErrors?.confirm && (
                <p className="mt-1 text-xs text-ember">{state.fieldErrors.confirm}</p>
              )}
            </div>

            {state.error && <p className="text-sm text-ember">{state.error}</p>}

            <button type="submit" className="btn-primary w-full" disabled={pending}>
              {pending ? "Creating…" : "Register"}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm text-slate-400">
          Already have an account? <Link href="/login" className="link">Log in</Link>
        </p>
      </div>
    </div>
  );
}
