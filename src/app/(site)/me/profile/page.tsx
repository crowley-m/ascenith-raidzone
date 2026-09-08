import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { ProfileForm } from "@/components/profile-form";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const user = await requireUser();
  const { new: isNew } = await searchParams;

  const player = await db.player.findUnique({ where: { userId: user.id } });

  return (
    <div>
      <h2 className="font-display text-xl font-bold text-white">Your profile</h2>
      <p className="mt-1 text-sm text-slate-400">
        This is what staff see when they manage rosters and rewards.
      </p>
      <div className="mt-6">
        <ProfileForm player={player} isNew={isNew === "1"} />
      </div>
    </div>
  );
}
