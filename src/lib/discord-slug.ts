/**
 * Live-typing transform toward Discord's expected channel-name shape
 * (lowercase, hyphenated) — mirrors what Discord's own client does as you
 * type a channel name. Deliberately doesn't trim a trailing hyphen (that
 * would eat the separator the instant someone types a space before the
 * next word) — call `slugifyChannelNameFinal` on blur/submit for that.
 */
export function slugifyChannelName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-{2,}/g, "-")
    .slice(0, 90);
}

export function slugifyChannelNameFinal(raw: string): string {
  return slugifyChannelName(raw).replace(/^-+|-+$/g, "");
}
