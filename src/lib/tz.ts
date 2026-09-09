/** Timezones offered for events. IANA id + a friendly label. */
export const EVENT_TIMEZONES = [
  { id: "Asia/Manila", label: "Manila — Philippines (PHT)" },
  { id: "Asia/Singapore", label: "Singapore / Kuala Lumpur" },
  { id: "Asia/Jakarta", label: "Jakarta (WIB)" },
  { id: "Asia/Bangkok", label: "Bangkok / Hanoi" },
  { id: "Asia/Kolkata", label: "India (IST)" },
  { id: "Asia/Dubai", label: "Dubai (GST)" },
  { id: "Asia/Tokyo", label: "Tokyo / Seoul" },
  { id: "Australia/Sydney", label: "Sydney (AEST/AEDT)" },
  { id: "Pacific/Auckland", label: "Auckland (NZST/NZDT)" },
  { id: "Europe/London", label: "London (GMT/BST)" },
  { id: "Europe/Berlin", label: "Central Europe (CET/CEST)" },
  { id: "America/Sao_Paulo", label: "Brazil — São Paulo (BRT)" },
  { id: "America/New_York", label: "US Eastern (ET)" },
  { id: "America/Chicago", label: "US Central (CT)" },
  { id: "America/Denver", label: "US Mountain (MT)" },
  { id: "America/Los_Angeles", label: "US Pacific (PT)" },
  { id: "UTC", label: "UTC" },
] as const;

export const DEFAULT_EVENT_TZ = "Asia/Manila";

export function isValidEventTz(tz: string | null | undefined): boolean {
  return !!tz && EVENT_TIMEZONES.some((z) => z.id === tz);
}

/** The wall-clock offset (ms) of `tz` at the given instant — DST aware. */
function offsetMs(instant: number, tz: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date(instant));
  const g = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const wall = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour") % 24, g("minute"), g("second"));
  return wall - instant;
}

/** "2026-08-28T01:30" entered as `tz` local time -> the UTC instant. */
export function zonedInputToUtc(local: string, tz: string): Date {
  const [d, t] = local.split("T");
  const [y, mo, da] = d.split("-").map(Number);
  const [h, mi] = (t ?? "00:00").split(":").map(Number);
  const guess = Date.UTC(y, mo - 1, da, h, mi);
  // resolve twice for DST boundary correctness
  let off = offsetMs(guess, tz);
  off = offsetMs(guess - off, tz);
  return new Date(guess - off);
}

/** A UTC Date -> "YYYY-MM-DDTHH:mm" wall-clock in `tz` (for datetime-local inputs). */
export function utcToZonedInput(date: Date, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}`;
}

/** Format a Date in a specific zone, with the zone abbreviation. */
export function fmtInZone(d: Date | string, tz: string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZoneName: "short",
  }).format(date);
}
