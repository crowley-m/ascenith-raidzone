"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";

/** Player signs up (or re-activates a withdrawn signup) for an event. */
export async function signUpForEvent(eventId: string) {
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=/events/${eventId}`);

  // token.playerId can lag a fresh profile by a few minutes (jwt refresh window),
  // so fall back to a direct lookup before sending them off to make one.
  let playerId = session.user.playerId;
  if (!playerId) {
    const p = await db.player.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    playerId = p?.id ?? null;
  }
  if (!playerId) redirect("/me/profile?new=1");

  const event = await db.event.findUnique({
    where: { id: eventId },
    include: { _count: { select: { signups: { where: { state: "SIGNED_UP" } } } } },
  });
  if (!event || event.status !== "PUBLISHED") {
    return { error: "This event is not open for sign-ups." };
  }

  const full = event.maxSlots ? event._count.signups >= event.maxSlots : false;
  const state = full ? "WAITLIST" : "SIGNED_UP";

  await db.eventSignup.upsert({
    where: { eventId_playerId: { eventId, playerId } },
    create: { eventId, playerId, state },
    update: { state },
  });
  await logAudit({
    actorId: session.user.id,
    action: "event.signup",
    targetType: "Event",
    targetId: eventId,
    meta: { state },
  });

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/me/events");
  return { ok: true, state };
}

export async function withdrawFromEvent(eventId: string) {
  const session = await auth();
  if (!session?.user?.playerId) redirect("/login");

  await db.eventSignup.updateMany({
    where: { eventId, playerId: session.user.playerId },
    data: { state: "WITHDRAWN" },
  });
  await logAudit({
    actorId: session.user.id,
    action: "event.withdraw",
    targetType: "Event",
    targetId: eventId,
  });

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/me/events");
  return { ok: true };
}
