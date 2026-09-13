"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Searchable + scrollable player combobox. A plain <select> with 100+ players
 * only scrolls; this adds type-to-filter on top while keeping the same
 * name/required contract as a native select (submits `name` as the player id).
 */
export function PlayerPicker({
  name,
  players,
  required,
  defaultValue,
}: {
  name: string;
  players: { id: string; label: string }[];
  required?: boolean;
  defaultValue?: string;
}) {
  const [id, setId] = useState(defaultValue ?? "");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(() => players.find((p) => p.id === id), [players, id]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return players;
    return players.filter((p) => p.label.toLowerCase().includes(q));
  }, [players, query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function pick(p: { id: string; label: string }) {
    setId(p.id);
    setQuery("");
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const p = filtered[highlight];
      if (p) pick(p);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <input type="hidden" name={name} value={id} required={required} />
      <input
        ref={inputRef}
        className="input"
        placeholder="Type to search, or click to browse…"
        value={open ? query : selected?.label ?? ""}
        onFocus={() => {
          setOpen(true);
          setQuery("");
          setHighlight(0);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onKeyDown={onKeyDown}
      />
      {open && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto border border-edge bg-panel text-sm shadow-lg">
          {filtered.length === 0 && (
            <li className="px-3 py-2 text-slate-500">No players match.</li>
          )}
          {filtered.map((p, i) => (
            <li key={p.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(p)}
                className={`block w-full px-3 py-1.5 text-left ${
                  i === highlight ? "bg-void text-teal" : "text-slate-200"
                } ${p.id === id ? "font-semibold" : ""}`}
              >
                {p.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
