import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export async function logAudit(input: {
  actorId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  meta?: Prisma.InputJsonValue;
}) {
  try {
    await db.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        meta: input.meta,
      },
    });
  } catch (err) {
    console.error("audit log failed", err);
  }
}
