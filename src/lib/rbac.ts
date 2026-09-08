import type { Role } from "@prisma/client";

// Higher number = more power.
const RANK: Record<Role, number> = {
  MODERATOR: 1,
  ADMIN: 2,
  OWNER: 3,
};

export type Permission =
  | "player:view"
  | "player:edit"
  | "player:status"
  | "note:write"
  | "flag:write"
  | "event:view"
  | "event:manage"
  | "attendance:mark"
  | "reward:view"
  | "reward:grant"
  | "faction:manage"
  | "media:manage"
  | "staff:manage"
  | "settings:manage";

const MIN_RANK: Record<Permission, number> = {
  "player:view": RANK.MODERATOR,
  "player:edit": RANK.ADMIN,
  "player:status": RANK.ADMIN,
  "note:write": RANK.MODERATOR,
  "flag:write": RANK.MODERATOR,
  "event:view": RANK.MODERATOR,
  "event:manage": RANK.ADMIN,
  "attendance:mark": RANK.MODERATOR,
  "reward:view": RANK.MODERATOR,
  "reward:grant": RANK.ADMIN,
  "faction:manage": RANK.ADMIN,
  "media:manage": RANK.MODERATOR,
  "staff:manage": RANK.OWNER,
  "settings:manage": RANK.OWNER,
};

export function isStaff(role: Role | null | undefined): role is Role {
  return role === "OWNER" || role === "ADMIN" || role === "MODERATOR";
}

export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!isStaff(role)) return false;
  return RANK[role] >= MIN_RANK[permission];
}

export function roleLabel(role: Role | null | undefined): string {
  switch (role) {
    case "OWNER":
      return "Owner";
    case "ADMIN":
      return "Admin";
    case "MODERATOR":
      return "Moderator";
    default:
      return "Member";
  }
}
