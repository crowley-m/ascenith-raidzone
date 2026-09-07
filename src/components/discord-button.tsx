"use client";

import { useTransition } from "react";
import { signIn } from "next-auth/react";

export function DiscordButton({ callbackUrl = "/me" }: { callbackUrl?: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn w-full bg-[#5865F2] text-white hover:bg-[#4752c4]"
      disabled={pending}
      onClick={() =>
        start(() => {
          void signIn("discord", { callbackUrl });
        })
      }
    >
      {pending ? "Redirecting…" : "Continue with Discord"}
    </button>
  );
}
