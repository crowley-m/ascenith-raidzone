"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export type LoginState = { error?: string };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const callbackUrl = (formData.get("callbackUrl") as string) || "/me";
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: callbackUrl,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Wrong email or password." };
    }
    throw err;
  }
  return {};
}
