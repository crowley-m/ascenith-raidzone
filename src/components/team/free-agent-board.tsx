"use client";

import { useMemo, useState } from "react";

const PLATFORM_LABEL: Record<string, string> = {
  PC: "PC",
  PLAYSTATION: "PlayStation",
  XBOX: "Xbox",
  MOBILE: "Mobile",
};

export type FreeAgent = {
  id: string;
  name: string;
  region: string | null;
  timezone: string | null;
  platform: string | null;
  note: string | null;
};

const ALL = "";

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="input py-1 text-xs"
      aria-label={label}
    >
      <option value={ALL}>{label}: any</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {PLATFORM_LABEL[o] ?? o}
        </option>
      ))}
    </select>
  );
}

/** Free-agent list with region/timezone/platform filters — all client-side, the full list is already on the page. */
export function FreeAgentBoard({ agents }: { agents: FreeAgent[] }) {
  const [region, setRegion] = useState(ALL);
  const [timezone, setTimezone] = useState(ALL);
  const [platform, setPlatform] = useState(ALL);

  const regions = useMemo(
    () => [...new Set(agents.map((a) => a.region).filter((v): v is string => !!v))].sort(),
    [agents],
  );
  const timezones = useMemo(
    () => [...new Set(agents.map((a) => a.timezone).filter((v): v is string => !!v))].sort(),
    [agents],
  );
  const platforms = useMemo(
    () => [...new Set(agents.map((a) => a.platform).filter((v): v is string => !!v))].sort(),
    [agents],
  );

  const filtered = agents.filter(
    (a) =>
      (region === ALL || a.region === region) &&
      (timezone === ALL || a.timezone === timezone) &&
      (platform === ALL || a.platform === platform),
  );

  const active = region !== ALL || timezone !== ALL || platform !== ALL;

  return (
    <div>
      {(regions.length > 0 || timezones.length > 0 || platforms.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-2">
          <FilterSelect label="Region" value={region} options={regions} onChange={setRegion} />
          <FilterSelect label="Timezone" value={timezone} options={timezones} onChange={setTimezone} />
          <FilterSelect label="Platform" value={platform} options={platforms} onChange={setPlatform} />
        </div>
      )}

      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {filtered.map((a) => (
          <li key={a.id} className="border border-edge bg-panel/40 px-3 py-2 text-sm">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="font-bold text-white">{a.name}</span>
              <span className="font-mono text-[0.65rem] uppercase tracking-wide text-slate-400">
                {[a.region, a.timezone, a.platform ? (PLATFORM_LABEL[a.platform] ?? a.platform) : null]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
            {a.note && <p className="mt-1 text-xs text-slate-400">{a.note}</p>}
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="font-mono text-xs uppercase text-slate-400">
            {active ? "No free agents match those filters." : "No free agents right now."}
          </li>
        )}
      </ul>
    </div>
  );
}
