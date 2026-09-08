import { requirePermission } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { SettingsForm } from "@/components/portal/settings-form";

export const dynamic = "force-dynamic";

export default async function PortalSettingsPage() {
  await requirePermission("settings:manage");
  const settings = await getSettings();

  return (
    <div className="max-w-2xl">
      <h2 className="font-display text-xl font-bold text-white">Settings</h2>
      <p className="mt-1 text-sm text-slate-400">
        Bot behaviour and the Discord invite. These override the values baked in at deploy time.
      </p>
      <div className="mt-6">
        <SettingsForm settings={settings} />
      </div>
    </div>
  );
}
