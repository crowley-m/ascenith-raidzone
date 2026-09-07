// Small helper for reading env with clear errors at runtime (not build time).
export function env(key: string, fallback?: string): string {
  const v = process.env[key] ?? fallback;
  if (v === undefined) throw new Error(`Missing environment variable: ${key}`);
  return v;
}

export function optionalEnv(key: string): string | undefined {
  const v = process.env[key];
  return v && v.length > 0 ? v : undefined;
}

export const discordConfigured =
  !!process.env.DISCORD_CLIENT_ID && !!process.env.DISCORD_CLIENT_SECRET;

export const OWNER_DISCORD_ID = process.env.OWNER_DISCORD_ID ?? "";
export const OWNER_DISCORD_USERNAME = process.env.OWNER_DISCORD_USERNAME ?? "";
