import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { can, isStaff, type Permission } from "@/lib/rbac";

export async function getSession() {
  return auth();
}

export async function requireUser() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user;
}

export async function requireStaff() {
  const user = await requireUser();
  if (!isStaff(user.role)) redirect("/");
  return user;
}

export async function requirePermission(permission: Permission) {
  const user = await requireUser();
  if (!can(user.role, permission)) redirect("/portal");
  return user;
}
