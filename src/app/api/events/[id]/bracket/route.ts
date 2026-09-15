import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bracketForEvent } from "@/lib/bracket";

// Polled client-side by <BracketBoard> while a bracket is live — the same
// data the event page renders server-side on first load, just fresh. Same
// status gate as the public event page itself — a DRAFT event's bracket
// (team/player names) shouldn't be fetchable just by knowing/guessing its
// id before the event is actually public.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await db.event.findUnique({
    where: { id, status: { in: ["PUBLISHED", "COMPLETED", "CANCELLED"] } },
    select: { id: true },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const bracket = await bracketForEvent(id);
  if (!bracket) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(bracket, { headers: { "Cache-Control": "no-store" } });
}
