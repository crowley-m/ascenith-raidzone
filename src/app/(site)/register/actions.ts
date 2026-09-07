"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { db } from "@/lib/db";
import { signIn } from "@/auth";
import { registerSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";

export type RegisterState = { error?: string; fieldErrors?: Record<string, string> };

export async function registerAction(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
    characterName: formData.get("characterName"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join(".")] = issue.message;
    }
    return { error: "Please fix the errors below.", fieldErrors };
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with that email already exists. Try logging in." };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await db.user.create({
    data: {
      email,
      passwordHash,
      name: parsed.data.characterName,
      player: {
        create: { characterName: parsed.data.characterName, status: "PENDING" },
      },
    },
  });
  await logAudit({ actorId: user.id, action: "player.register", targetType: "User", targetId: user.id });

  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirectTo: "/me/profile?new=1",
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Account created, but automatic login failed. Please log in." };
    }
    throw err; // redirect() throws — let it propagate
  }
  return {};
}
