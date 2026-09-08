import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import type { Role } from "@prisma/client";

/**
 * The Owner is invisible to everyone but themselves. Any shared, staff-visible
 * feed (activity log, note/flag authors) runs names through here so a
 * Moderator/Admin never sees that an Owner exists or who holds it.
 */
export async function hiddenActorIds(
  viewerRole: Role | null | undefined,
): Promise<Set<string>> {
  // An owner sees the real names.
  if (can(viewerRole, "staff:manage")) return new Set<string>();
  const owners = await db.staffRole.findMany({
    where: { role: "OWNER" },
    select: { userId: true },
  });
  return new Set(owners.map((o) => o.userId));
}

export function maskName(
  name: string | null | undefined,
  actorId: string | null | undefined,
  hidden: Set<string>,
  fallback = "Staff",
): string {
  if (actorId && hidden.has(actorId)) return fallback;
  return name || fallback;
}
