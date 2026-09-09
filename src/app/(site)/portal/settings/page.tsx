import { requirePermission } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { listGuildTextChannels, listGuildRoles, botGuildPermissions } from "@/lib/discord";
import { SettingsForm } from "@/components/portal/settings-form";

export const dynamic = "force-dynamic";

export default async function PortalSettingsPage() {
  await requirePermission("settings:manage");
  const [settings, channels, roles, botPerms] = await Promise.all([
    getSettings(),
    listGuildTextChannels(),
    listGuildRoles(),
    botGuildPermissions(),
  ]);

  return (
    <div className="max-w-2xl">
      <h2 className="font-display text-xl font-bold text-white">Settings</h2>
      <p className="mt-1 text-sm text-slate-400">
        Bot behaviour and the Discord invite. These override the values baked in at deploy time.
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
            <>Bot has Administrator — all event-space actions available.</>
          ) : botPerms.missing.length ? (
            <>
              Bot is missing Discord permissions:{" "}
              <span className="font-mono">{botPerms.missing.join(", ")}</span>. Grant these to its
              role (Server Settings → Roles) or event spaces / pins / pings may not work.
            </>
          ) : (
            <>Bot has every permission the event spaces need.</>
          )}
        </div>
      )}

      <div className="mt-6">
        <SettingsForm settings={settings} channels={channels} roles={roles} />
      </div>
    </div>
  );
}
