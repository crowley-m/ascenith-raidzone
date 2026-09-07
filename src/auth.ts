import NextAuth from "next-auth";
import type { NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Discord from "next-auth/providers/discord";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { authConfig } from "@/auth.config";

const OWNER_DISCORD_ID = process.env.OWNER_DISCORD_ID ?? "";
const OWNER_DISCORD_USERNAME = (process.env.OWNER_DISCORD_USERNAME ?? "").toLowerCase();

const providers: NextAuthConfig["providers"] = [];

if (process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET) {
  providers.push(
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      authorization: { params: { scope: "identify email" } },
      // Discord verifies emails; auto-link so a member who signed up with
      // email/password can also use "Login with Discord".
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

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

async function resolveRole(userId: string): Promise<"OWNER" | "ADMIN" | "MODERATOR" | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { discordId: true, discordUsername: true, staffRole: { select: { role: true } } },
  });
  if (!user) return null;
  if (user.staffRole) return user.staffRole.role;

  // Auto-grant OWNER to the configured owner on first sign-in.
  const isOwner =
    (OWNER_DISCORD_ID && user.discordId === OWNER_DISCORD_ID) ||
    (OWNER_DISCORD_USERNAME &&
      user.discordUsername?.toLowerCase() === OWNER_DISCORD_USERNAME);
  if (isOwner) {
    await db.staffRole.upsert({
      where: { userId },
      create: { userId, role: "OWNER" },
      update: { role: "OWNER" },
    });
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
      }
    },
  },
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user?.id) token.uid = user.id;
      if (token.uid) {
        token.role = await resolveRole(token.uid as string);
        const player = await db.player.findUnique({
          where: { userId: token.uid as string },
          select: { id: true, status: true },
        });
        token.playerId = player?.id ?? null;
        token.playerStatus = player?.status ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string) ?? session.user.id;
        session.user.role = (token.role as never) ?? null;
        session.user.playerId = (token.playerId as never) ?? null;
        session.user.playerStatus = (token.playerStatus as never) ?? null;
      }
      return session;
    },
  },
});
