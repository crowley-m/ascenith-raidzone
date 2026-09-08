import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function ics(dt: Date): string {
  return dt.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}
function esc(s: string): string {
  return s.replace(/[\\;,]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await db.event
    .findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        summary: true,
        server: true,
        startsAt: true,
        endsAt: true,
        status: true,
        updatedAt: true,
      },
    })
    .catch(() => null);

  if (!event || (event.status !== "PUBLISHED" && event.status !== "COMPLETED")) {
    return new Response("Not found", { status: 404 });
  }

  const base = process.env.NEXTAUTH_URL ?? "https://ascenith.147.189.172.101.sslip.io:8443";
  const end = event.endsAt ?? new Date(event.startsAt.getTime() + 2 * 60 * 60 * 1000);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ASCENITH RAIDZONE//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:event-${event.id}@ascenith-raidzone`,
    `DTSTAMP:${ics(event.updatedAt)}`,
    `DTSTART:${ics(event.startsAt)}`,
    `DTEND:${ics(end)}`,
    `SUMMARY:${esc(`RAIDZONE — ${event.title}`)}`,
    `DESCRIPTION:${esc((event.summary ?? "") + `\n\n${base}/events/${event.id}`)}`,
    event.server ? `LOCATION:${esc(event.server)}` : "",
    `URL:${base}/events/${event.id}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT30M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(`RAIDZONE ${event.title} starts soon`)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return new Response(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="raidzone-${event.id}.ics"`,
    },
  });
}
