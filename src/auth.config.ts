import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe auth config (no Prisma, no bcrypt). Used by middleware.
 * The full config in src/auth.ts spreads this and adds the adapter + providers.
 */
export const authConfig = {
  pages: { signIn: "/login" },
  trustHost: true,
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
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
