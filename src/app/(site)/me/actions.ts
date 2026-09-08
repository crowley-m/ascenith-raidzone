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
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[i.path.join(".")] = i.message;
    return { error: "Please fix the errors below.", fieldErrors };
  }

  const d = parsed.data;
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
    },
    update: {
      characterName: d.characterName,
      gameUid: d.gameUid ?? null,
      platform: d.platform ?? null,
      region: d.region ?? null,
      timezone: d.timezone ?? null,
      playHours: d.playHours ?? null,
      languages: d.languages ?? null,
    },
  });

  await db.user.update({ where: { id: user.id }, data: { name: d.characterName } });
  await logAudit({ actorId: user.id, action: "player.profile_update", targetType: "User", targetId: user.id });
  void syncMemberRoles(user.id);

  revalidatePath("/me");
  revalidatePath("/me/profile");
  return { ok: true };
}
