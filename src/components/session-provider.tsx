"use client";

/**
 * Client wrapper so server layouts can mount next-auth's <SessionProvider>.
 * Lets client components (e.g. the landing nav) read the session with
 * useSession() even though the pages themselves are statically cached.
 */
export { SessionProvider } from "next-auth/react";
