import { NextResponse } from "next/server";
import { bracketForEvent } from "@/lib/bracket";

// Polled client-side by <BracketBoard> while a bracket is live — the same
// data the event page renders server-side on first load, just fresh.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bracket = await bracketForEvent(id);
  if (!bracket) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(bracket, { headers: { "Cache-Control": "no-store" } });
}
