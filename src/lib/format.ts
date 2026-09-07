import { format, formatDistanceToNowStrict, isPast } from "date-fns";

export function fmtDateTime(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return format(date, "EEE d MMM yyyy, HH:mm");
}

export function fmtDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return format(date, "d MMM yyyy");
}

export function relative(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return isPast(date)
    ? `${formatDistanceToNowStrict(date)} ago`
    : `in ${formatDistanceToNowStrict(date)}`;
}

export function toInputDateTime(d: Date | string | null | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
}
