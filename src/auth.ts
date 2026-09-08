import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Discord from "next-auth/providers/discord";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { authConfig } from "@/auth.config";
import { syncMemberRoles } from "@/lib/discord-roles";

// Email/password sign-in is opt-in — set ENABLE_EMAIL_AUTH=true to turn it on.
// Discord is the only route by default.
export const EMAIL_AUTH_ENABLED = process.env.ENABLE_EMAIL_AUTH === "true";

const OWNER_DISCORD_ID = process.env.OWNER_DISCORD_ID ?? "";
const OWNER_DISCORD_USERNAME = (process.env.OWNER_DISCORD_USERNAME ?? "").toLowerCase();

const providers: NextAuthConfig["providers"] = [];

if (process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET) {
  providers.push(
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      // NOTE: do NOT pass a bare `authorization: { params: {...} }` here.
      // next-auth beta shallow-replaces the provider's default `authorization`
      // object, dropping its `url`; the sign-in leg then hits `new URL(issuer)`
      // with no issuer and dies with "TypeError: Invalid URL" (error=Configuration).
      // The default scope is already "identify email", so we just use it.
      // Discord verifies emails; auto-link so a member who signed up with
      // email/password can also use "Login with Discord".
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

if (EMAIL_AUTH_ENABLED) {
  providers.push(
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = z
          .object({ email: z.string().email(), password: z.string().min(1) })
          .safeParse(raw);
        if (!parsed.success) return null;

        const user = await db.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });
        if (!user?.passwordHash) return null;

        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) return null;

        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  );
}

async function resolveRole(
  userId: string,
  allowUpsert: boolean,
): Promise<"OWNER" | "ADMIN" | "MODERATOR" | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { discordId: true, discordUsername: true, staffRole: { select: { role: true } } },
  });
  if (!user) return null;
  if (user.staffRole) return user.staffRole.role;

  // Auto-grant OWNER to the configured owner. Only write on sign-in — later
  // reads just report the role, they don't re-provision it every request.
  const isOwner =
    (OWNER_DISCORD_ID && user.discordId === OWNER_DISCORD_ID) ||
    (OWNER_DISCORD_USERNAME &&
      user.discordUsername?.toLowerCase() === OWNER_DISCORD_USERNAME);
  if (isOwner) {
    if (allowUpsert) {
      await db.staffRole.upsert({
        where: { userId },
        create: { userId, role: "OWNER" },
        update: { role: "OWNER" },
      });
    }
    return "OWNER";
  }
  return null;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(db),
  providers,
  events: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "discord" && profile && user.id) {
        const p = profile as {
          id?: string;
          username?: string;
          global_name?: string;
          avatar?: string | null;
          image_url?: string;
        };
        await db.user.update({
          where: { id: user.id },
          data: {
            discordId: p.id,
            discordUsername: p.username ?? p.global_name,
            discordAvatar: p.avatar ?? null,
            name: user.name ?? p.global_name ?? p.username,
            image: user.image ?? p.image_url ?? null,
          },
        });
        void syncMemberRoles(user.id);
      }
    },
  },
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger }) {
      if (user?.id) token.uid = user.id;
      if (!token.uid) return token;

      // The jwt callback runs on *every* request that reads the session. Only
      // touch the DB on sign-in or an explicit session update, or once the
      // cached copy is older than 10 minutes — and never let a DB hiccup throw,
      // because a throw here silently signs the user out.
      const last = typeof token.checkedAt === "number" ? token.checkedAt : 0;
      const stale = Date.now() - last > 10 * 60 * 1000;
      const isSignIn = !!user;
      if (!isSignIn && trigger !== "update" && !stale) return token;

      try {
        token.role = await resolveRole(token.uid as string, isSignIn);
        const player = await db.player.findUnique({
          where: { userId: token.uid as string },
          select: { id: true, status: true },
        });
        token.playerId = player?.id ?? null;
        token.playerStatus = player?.status ?? null;
        token.checkedAt = Date.now();
      } catch (err) {
        // Keep whatever we already had on the token; try again next request.
        console.error("[auth] jwt refresh failed, keeping cached token", err);
      }
      return token;
    },
  },
});
