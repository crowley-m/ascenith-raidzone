import { auth } from "@/auth";
import { can, type Permission } from "@/lib/rbac";

/** For use inside server actions — throws instead of redirecting. */
export async function assertPermission(permission: Permission) {
  const session = await auth();
  if (!session?.user || !can(session.user.role, permission)) {
    throw new Error("Not authorized");
  }
  return session.user;
}
