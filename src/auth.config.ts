import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe auth config (no Prisma, no bcrypt). Used by middleware.
 * The full config in src/auth.ts spreads this and adds the adapter + providers
 * + the `jwt` callback (which does the Prisma lookups).
 */
export const authConfig = {
  pages: { signIn: "/login" },
  trustHost: true,
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    // Pure token -> session mapping. Safe on the edge; runs in middleware too.
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string) ?? session.user.id;
        session.user.role = (token.role as never) ?? null;
        session.user.playerId = (token.playerId as never) ?? null;
        session.user.playerStatus = (token.playerStatus as never) ?? null;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const role = auth?.user?.role ?? null;
      const path = nextUrl.pathname;

      if (path.startsWith("/portal")) {
        return isLoggedIn && role !== null;
      }
      if (path.startsWith("/me")) {
        return isLoggedIn;
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
