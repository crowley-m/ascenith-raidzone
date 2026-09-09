"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { profileSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { syncMemberRoles } from "@/lib/discord-roles";

export type ProfileState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string> };

function clean(v: FormDataEntryValue | null): string | null {
  const s = (v ?? "").toString().trim();
  return s.length ? s : null;
}

export async function updateProfileAction(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const user = await requireUser();

  const parsed = profileSchema.safeParse({
    characterName: formData.get("characterName"),
    gameUid: clean(formData.get("gameUid")),
    platform: clean(formData.get("platform")),
    region: clean(formData.get("region")),
    timezone: clean(formData.get("timezone")),
    playHours: clean(formData.get("playHours")),
    languages: clean(formData.get("languages")),
    factionId: clean(formData.get("factionId")),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[i.path.join(".")] = i.message;
    return { error: "Please fix the errors below.", fieldErrors };
  }

  const d = parsed.data;
  const factionId =
    d.factionId && (await db.faction.findUnique({ where: { id: d.factionId }, select: { id: true } }))
      ? d.factionId
      : null;

  await db.player.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      status: "ACTIVE",
      characterName: d.characterName,
      gameUid: d.gameUid ?? null,
      platform: d.platform ?? null,
      region: d.region ?? null,
      timezone: d.timezone ?? null,
      playHours: d.playHours ?? null,
      languages: d.languages ?? null,
      factionId,
    },
    update: {
      characterName: d.characterName,
      gameUid: d.gameUid ?? null,
      platform: d.platform ?? null,
      region: d.region ?? null,
      timezone: d.timezone ?? null,
      playHours: d.playHours ?? null,
      languages: d.languages ?? null,
      factionId,
    },
  });

  await db.user.update({ where: { id: user.id }, data: { name: d.characterName } });
  await logAudit({ actorId: user.id, action: "player.profile_update", targetType: "User", targetId: user.id });
  void syncMemberRoles(user.id);

  revalidatePath("/me");
  revalidatePath("/me/profile");
  return { ok: true };
}

async function myPlayerId(): Promise<string | null> {
  const user = await requireUser();
  if (user.playerId) return user.playerId;
  const p = await db.player.findUnique({ where: { userId: user.id }, select: { id: true } });
  return p?.id ?? null;
}

/** Player confirms a reward arrived in-game (or un-confirms). */
export async function setRewardReceived(rewardId: string, received: boolean) {
  const playerId = await myPlayerId();
  if (!playerId) return;
  await db.reward.updateMany({
    where: { id: rewardId, playerId },
    data: { receivedAt: received ? new Date() : null },
  });
  await logAudit({
    actorId: playerId,
    action: received ? "reward.received" : "reward.unreceived",
    targetType: "Reward",
    targetId: rewardId,
  });
  revalidatePath("/me/rewards");
  revalidatePath(`/portal/players/${playerId}`);
}

/** Toggle Discord DM notifications for the caller. */
export async function setDmNotifications(on: boolean) {
  const playerId = await myPlayerId();
  if (!playerId) return;
  await db.player.update({ where: { id: playerId }, data: { dmNotifications: on } });
  revalidatePath("/me/profile");
  revalidatePath("/me");
}
