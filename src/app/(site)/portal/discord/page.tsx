import { requirePermission } from "@/lib/session";
import { db } from "@/lib/db";
import { listGuildRoles, botGuildPermissions, channelExists, roleMemberCounts } from "@/lib/discord";
import { hiddenActorIds, maskName } from "@/lib/staff-mask";
import { DiscordCategoryForm } from "@/components/portal/discord-category-form";
import { DiscordManagementList, type CategoryVM } from "@/components/portal/discord-management-list";
import { ConfirmButton } from "@/components/portal/confirm-button";
import { restoreDiscordCategory, restoreDiscordChannel } from "@/app/(site)/portal/actions";

export const dynamic = "force-dynamic";

const RECENTLY_DELETED_DAYS = 3;

export default async function DiscordManagementPage() {
  const me = await requirePermission("discord:manage");
  const since = new Date(Date.now() - RECENTLY_DELETED_DAYS * 86400000);

  const [categories, roles, botPerms, roleCounts, hidden, deletedCategories, deletedChannels] = await Promise.all([
    db.discordCategory.findMany({
      where: { deletedAt: null },
      include: {
        channels: { where: { deletedAt: null }, orderBy: { position: "asc" }, include: { createdBy: true } },
        createdBy: true,
      },
      orderBy: { position: "asc" },
    }),
    listGuildRoles(),
    botGuildPermissions(),
    roleMemberCounts(),
    hiddenActorIds(me.role),
    db.discordCategory.findMany({ where: { deletedAt: { gte: since } }, orderBy: { deletedAt: "desc" } }),
    db.discordManagedChannel.findMany({
      where: { deletedAt: { gte: since }, category: { deletedAt: null } },
      include: { category: true },
      orderBy: { deletedAt: "desc" },
    }),
  ]);

  // Live drift check — anything created here that's since been deleted
  // directly in Discord (bypassing this page) gets flagged, not silently
  // left to look fine.
  const allIds = [
    ...categories.map((c) => c.discordId),
    ...categories.flatMap((c) => c.channels.map((ch) => ch.discordId)),
  ];
  const existsFlags = await Promise.all(allIds.map((did) => channelExists(did)));
  const exists = new Map(allIds.map((did, i) => [did, existsFlags[i]]));

  const categoryOptions = categories.map((c) => ({ id: c.id, name: c.name }));
  const existingNamesByCategory: Record<string, string[]> = {};
  for (const c of categories) {
    existingNamesByCategory[c.id] = c.channels.map((ch) => ch.name.toLowerCase());
  }

  const creatorLabel = (createdBy: { name: string | null; email: string | null }, createdById: string, createdAt: Date) =>
    `Created by ${maskName(createdBy.name ?? createdBy.email, createdById, hidden)} on ${createdAt.toLocaleDateString()}`;

  const categoryVMs: CategoryVM[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    note: c.note,
    roleIds: Array.isArray(c.roleIds) ? (c.roleIds as string[]) : [],
    missing: !exists.get(c.discordId),
    creatorLabel: creatorLabel(c.createdBy, c.createdById, c.createdAt),
    channels: c.channels.map((ch) => ({
      id: ch.id,
      name: ch.name,
      kind: ch.kind,
      topic: ch.topic,
      synced: ch.synced,
      roleIds: Array.isArray(ch.roleIds) ? (ch.roleIds as string[]) : [],
      missing: !exists.get(ch.discordId),
      creatorLabel: creatorLabel(ch.createdBy, ch.createdById, ch.createdAt),
    })),
  }));

  return (
    <div className="max-w-2xl">
      <h2 className="font-display text-xl font-bold text-white">Discord</h2>
      <p className="mt-1 text-sm text-slate-400">
        Categories and channels created directly from here, for general server organization —
        separate from the per-event spaces an event&apos;s own page builds and tears down. Only
        what&apos;s created through this page is listed below; anything set up manually in Discord
        doesn&apos;t show here and isn&apos;t touched by it.
      </p>

      {botPerms && (
        <div
          className={`mt-4 border p-3 text-xs ${
            botPerms.missing.length
              ? "border-ember/40 bg-ember/5 text-ember"
              : "border-teal/30 bg-teal/5 text-slate-300"
          }`}
        >
          {botPerms.administrator ? (
            <>Bot has Administrator — all category/channel actions available.</>
          ) : botPerms.missing.length ? (
            <>
              Bot is missing Discord permissions:{" "}
              <span className="font-mono">{botPerms.missing.join(", ")}</span>. Grant these to its
              role (Server Settings → Roles) or creating/editing categories and channels may fail.
            </>
          ) : (
            <>Bot has every permission this needs.</>
          )}
        </div>
      )}

      <div className="card mt-6">
        <p className="label mb-2">New category</p>
        <DiscordCategoryForm roles={roles} roleCounts={roleCounts} />
      </div>

      <div className="mt-6">
        <DiscordManagementList
          categories={categoryVMs}
          roles={roles}
          roleCounts={roleCounts}
          existingNamesByCategory={existingNamesByCategory}
          categoryOptions={categoryOptions}
        />
      </div>

      {(deletedCategories.length > 0 || deletedChannels.length > 0) && (
        <details className="card mt-6">
          <summary className="cursor-pointer text-sm font-medium text-slate-300">
            Recently deleted ({deletedCategories.length + deletedChannels.length})
          </summary>
          <p className="mt-2 text-xs text-slate-400">
            Kept for {RECENTLY_DELETED_DAYS} days. Restoring recreates it fresh on Discord — new
            channel, same name/roles — message history and the original channel are gone for
            good.
          </p>
          <ul className="mt-3 space-y-2">
            {deletedCategories.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-2 border border-edge/60 bg-void/40 p-2.5 text-xs">
                <span className="badge">category</span>
                <span className="text-slate-200">{c.name}</span>
                <span className="text-slate-400">deleted {c.deletedAt?.toLocaleDateString()}</span>
                <ConfirmButton
                  action={restoreDiscordCategory.bind(null, c.id)}
                  confirm={`Restore "${c.name}" and its channels as new Discord channels?`}
                  className="btn-ghost ml-auto px-2 py-1 text-xs"
                >
                  Restore
                </ConfirmButton>
              </li>
            ))}
            {deletedChannels.map((ch) => (
              <li key={ch.id} className="flex flex-wrap items-center gap-2 border border-edge/60 bg-void/40 p-2.5 text-xs">
                <span className="badge">{ch.kind === "voice" ? "voice" : "text"}</span>
                <span className="text-slate-200">#{ch.name}</span>
                <span className="text-slate-400">from {ch.category.name}</span>
                <span className="text-slate-400">deleted {ch.deletedAt?.toLocaleDateString()}</span>
                <ConfirmButton
                  action={restoreDiscordChannel.bind(null, ch.id)}
                  confirm={`Restore #${ch.name} as a new channel in ${ch.category.name}?`}
                  className="btn-ghost ml-auto px-2 py-1 text-xs"
                >
                  Restore
                </ConfirmButton>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
