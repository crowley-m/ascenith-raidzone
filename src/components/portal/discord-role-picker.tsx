type Role = { id: string; name: string };

export function DiscordRolePicker({
  roles,
  defaultRoleIds = [],
  disabled = false,
  counts,
}: {
  roles: Role[];
  defaultRoleIds?: string[];
  disabled?: boolean;
  counts?: Record<string, number> | null;
}) {
  if (roles.length === 0) {
    return (
      <p className="text-xs text-slate-500">
        No assignable roles found on the server yet — leave blank for staff/bot only.
      </p>
    );
  }
  return (
    <div className={`flex flex-wrap gap-1.5 ${disabled ? "opacity-40" : ""}`}>
      {roles.map((r) => (
        <label key={r.id} className="cursor-pointer">
          <input
            type="checkbox"
            name="roleIds"
            value={r.id}
            disabled={disabled}
            defaultChecked={defaultRoleIds.includes(r.id)}
            className="peer sr-only"
          />
          <span className="inline-block border border-edge px-2.5 py-1 text-xs text-slate-400 transition peer-checked:border-teal peer-checked:bg-teal/10 peer-checked:text-teal peer-focus-visible:ring-1 peer-focus-visible:ring-teal">
            {r.name}
            {typeof counts?.[r.id] === "number" && (
              <span className="ml-1 text-slate-600">· {counts[r.id]}</span>
            )}
          </span>
        </label>
      ))}
    </div>
  );
}
