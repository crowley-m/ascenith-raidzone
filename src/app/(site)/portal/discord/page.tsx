import { requirePermission } from "@/lib/session";
import { db } from "@/lib/db";
import { listGuildRoles, botGuildPermissions } from "@/lib/discord";
import { DiscordCategoryForm } from "@/components/portal/discord-category-form";
import { DiscordChannelForm } from "@/components/portal/discord-channel-form";
import { ConfirmButton } from "@/components/portal/confirm-button";
import { deleteDiscordCategory, deleteDiscordChannel } from "@/app/(site)/portal/actions";

export const dynamic = "force-dynamic";

export default async function DiscordManagementPage() {
  await requirePermission("discord:manage");

  const [categories, roles, botPerms] = await Promise.all([
    db.discordCategory.findMany({
      include: { channels: { orderBy: { createdAt: "asc" } } },
      orderBy: { createdAt: "asc" },
    }),
    listGuildRoles(),
    botGuildPermissions(),
  ]);

  const roleName = (id: string) => roles.find((r) => r.id === id)?.name ?? `(deleted role ${id})`;

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
        <DiscordCategoryForm />
      </div>

      <ul className="mt-6 space-y-3">
        {categories.map((c) => (
          <li key={c.id} className="card">
            <details>
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3">
                <span className="font-medium text-slate-100">{c.name}</span>
                <span className="text-xs text-slate-500">
                  {c.channels.length} channel{c.channels.length === 1 ? "" : "s"}
                </span>
              </summary>

              <div className="mt-4 space-y-4 border-t border-edge pt-4">
                <div>
                  <p className="label mb-1.5">Rename category</p>
                  <DiscordCategoryForm category={{ id: c.id, name: c.name }} />
                </div>

                <div>
                  <p className="label mb-1.5">Channels</p>
                  <ul className="space-y-2">
                    {c.channels.map((ch) => {
                      const chRoleIds = Array.isArray(ch.roleIds) ? (ch.roleIds as string[]) : [];
                      return (
                        <li key={ch.id} className="border border-edge/60 bg-void/40 p-3">
                          <details>
                            <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2">
                              <span className="badge">{ch.kind === "voice" ? "voice" : "text"}</span>
                              <span className="text-sm text-slate-100">{ch.name}</span>
                              {chRoleIds.length === 0 ? (
                                <span className="text-xs text-slate-600">staff/bot only</span>
                              ) : (
                                chRoleIds.map((rid) => (
                                  <span key={rid} className="badge border-teal/40 text-teal">
                                    {roleName(rid)}
                                  </span>
                                ))
                              )}
                            </summary>
                            <div className="mt-3 border-t border-edge/60 pt-3">
                              <DiscordChannelForm
                                categoryId={c.id}
                                roles={roles}
                                channel={{ id: ch.id, name: ch.name, kind: ch.kind, roleIds: chRoleIds }}
                              />
                              <div className="mt-3">
                                <ConfirmButton
                                  action={deleteDiscordChannel.bind(null, ch.id)}
                                  confirm={`Delete #${ch.name}? This deletes the channel on Discord too.`}
                                >
                                  Delete channel
                                </ConfirmButton>
                              </div>
                            </div>
                          </details>
                        </li>
                      );
                    })}
                    {c.channels.length === 0 && (
                      <li className="text-xs text-slate-500">No channels in this category yet.</li>
                    )}
                  </ul>
                </div>

                <div>
                  <p className="label mb-1.5">Add channel</p>
                  <DiscordChannelForm categoryId={c.id} roles={roles} />
                </div>

                <div className="border-t border-edge/60 pt-3">
                  <ConfirmButton
                    action={deleteDiscordCategory.bind(null, c.id)}
                    confirm={`Delete "${c.name}" and all ${c.channels.length} of its channels? This deletes them on Discord too.`}
                  >
                    Delete category
                  </ConfirmButton>
                </div>
              </div>
            </details>
          </li>
        ))}
        {categories.length === 0 && (
          <li className="text-sm text-slate-400">No categories yet — create one above.</li>
        )}
      </ul>
    </div>
  );
}
