import type { Role, PlayerStatus } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role | null;
      playerId: string | null;
      playerStatus: PlayerStatus | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    role?: Role | null;
    playerId?: string | null;
    playerStatus?: PlayerStatus | null;
  }
}
