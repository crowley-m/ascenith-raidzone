"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DiscordCategoryForm } from "@/components/portal/discord-category-form";
import { DiscordChannelForm } from "@/components/portal/discord-channel-form";
import { MoveButtons } from "@/components/portal/discord-move-buttons";
import { ConfirmButton } from "@/components/portal/confirm-button";
import {
  deleteDiscordCategory,
  deleteDiscordChannel,
  moveDiscordCategory,
  moveDiscordChannel,
  duplicateDiscordCategory,
  applyCategoryRolesToChannels,
  bulkDeleteDiscordChannels,
  bulkMoveDiscordChannels,
} from "@/app/(site)/portal/actions";

type Role = { id: string; name: string };

export type ChannelVM = {
  id: string;
  name: string;
  kind: string;
  topic: string | null;
  synced: boolean;
  roleIds: string[];
  missing: boolean;
  creatorLabel: string;
};

export type CategoryVM = {
  id: string;
  name: string;
  note: string | null;
  roleIds: string[];
  missing: boolean;
  creatorLabel: string;
  channels: ChannelVM[];
};

function roleName(roles: Role[], id: string) {
  return roles.find((r) => r.id === id)?.name ?? `(deleted role ${id})`;
}

function matches(query: string, ...vals: (string | null | undefined)[]) {
  if (!query) return true;
  const q = query.toLowerCase();
  return vals.some((v) => (v ?? "").toLowerCase().includes(q));
}

function CategoryBlock({
  category,
  ci,
  total,
  roles,
  roleCounts,
  existingNamesByCategory,
  categoryOptions,
  query,
}: {
  category: CategoryVM;
  ci: number;
  total: number;
  roles: Role[];
  roleCounts?: Record<string, number> | null;
  existingNamesByCategory: Record<string, string[]>;
  categoryOptions: { id: string; name: string }[];
  query: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [moveTarget, setMoveTarget] = useState("");
  const [movePending, startMove] = useTransition();
  const router = useRouter();

  const catMatches = matches(query, category.name);
  const visibleChannels = category.channels.filter((ch) => catMatches || matches(query, ch.name));
  if (query && !catMatches && visibleChannels.length === 0) return null;

  const otherCategories = categoryOptions.filter((c) => c.id !== category.id);

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function runMove() {
    if (!selected.size || !moveTarget) return;
    startMove(async () => {
      await bulkMoveDiscordChannels([...selected], moveTarget);
      setSelected(new Set());
      setMoveTarget("");
      router.refresh();
    });
  }

  return (
    <li className="card">
      <details open={!!query}>
        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3">
          <MoveButtons
            onUp={() => moveDiscordCategory(category.id, -1)}
            onDown={() => moveDiscordCategory(category.id, 1)}
            disableUp={ci === 0}
            disableDown={ci === total - 1}
          />
          <span className="font-medium text-slate-100">{category.name}</span>
          <span
            className="cursor-help text-xs text-slate-600"
            title={category.creatorLabel}
          >
            ⓘ
          </span>
          <span className="text-xs text-slate-500">
            {category.channels.length} channel{category.channels.length === 1 ? "" : "s"}
          </span>
          {category.missing && <span className="badge border-ember/40 text-ember">Not found on Discord</span>}
          {category.roleIds.length === 0 ? (
            <span className="text-xs text-slate-600">header: staff/bot only</span>
          ) : (
            category.roleIds.map((rid) => (
              <span key={rid} className="badge border-teal/40 text-teal">
                {roleName(roles, rid)}
              </span>
            ))
          )}
          {category.note && <span className="text-xs italic text-slate-500">— {category.note}</span>}
        </summary>

        <div className="mt-4 space-y-4 border-t border-edge pt-4">
          <div>
            <p className="label mb-1.5">Rename / edit category</p>
            <DiscordCategoryForm
              category={{ id: category.id, name: category.name, roleIds: category.roleIds, note: category.note }}
              roles={roles}
              roleCounts={roleCounts}
            />
          </div>

          <div>
            <p className="label mb-1.5">Channels</p>

            {selected.size > 0 && (
              <div className="mb-2 flex flex-wrap items-center gap-2 border border-teal/30 bg-teal/5 p-2 text-xs">
                <span className="text-teal">{selected.size} selected</span>
                <select
                  value={moveTarget}
                  onChange={(e) => setMoveTarget(e.target.value)}
                  className="input !w-auto py-1 text-xs"
                >
                  <option value="">Move to…</option>
                  {otherCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={runMove}
                  disabled={!moveTarget || movePending}
                  className="btn-ghost px-2 py-1 text-xs disabled:opacity-40"
                >
                  {movePending ? "…" : "Move"}
                </button>
                <ConfirmButton
                  action={() => bulkDeleteDiscordChannels([...selected]).then((r) => { setSelected(new Set()); return r; })}
                  confirm={`Delete ${selected.size} channel(s)? This deletes them on Discord too.`}
                  className="btn-danger px-2 py-1 text-xs"
                >
                  Delete selected
                </ConfirmButton>
                <button
                  type="button"
                  onClick={() => setSelected(new Set())}
                  className="text-slate-500 hover:text-slate-300"
                >
                  Clear
                </button>
              </div>
            )}

            <ul className="space-y-2">
              {visibleChannels.map((ch, chi) => (
                <li key={ch.id} className="border border-edge/60 bg-void/40 p-3">
                  <details open={!!query}>
                    <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selected.has(ch.id)}
                        onChange={() => toggle(ch.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="cursor-pointer"
                        aria-label={`Select #${ch.name}`}
                      />
                      <MoveButtons
                        onUp={() => moveDiscordChannel(ch.id, -1)}
                        onDown={() => moveDiscordChannel(ch.id, 1)}
                        disableUp={chi === 0}
                        disableDown={chi === category.channels.length - 1}
                      />
                      <span className="badge">{ch.kind === "voice" ? "voice" : "text"}</span>
                      <span className="text-sm text-slate-100">{ch.name}</span>
                      <span className="cursor-help text-xs text-slate-600" title={ch.creatorLabel}>
                        ⓘ
                      </span>
                      {ch.synced && <span className="badge border-teal/40 text-teal">synced</span>}
                      {ch.missing && <span className="badge border-ember/40 text-ember">Not found on Discord</span>}
                      {ch.roleIds.length === 0 ? (
                        <span className="text-xs text-slate-600">staff/bot only</span>
                      ) : (
                        ch.roleIds.map((rid) => (
                          <span key={rid} className="badge border-teal/40 text-teal">
                            {roleName(roles, rid)}
                          </span>
                        ))
                      )}
                      {ch.topic && <span className="text-xs italic text-slate-500">— {ch.topic}</span>}
                    </summary>
                    <div className="mt-3 border-t border-edge/60 pt-3">
                      <DiscordChannelForm
                        categoryId={category.id}
                        roles={roles}
                        categories={categoryOptions}
                        roleCounts={roleCounts}
                        existingNamesByCategory={existingNamesByCategory}
                        channel={{
                          id: ch.id,
                          name: ch.name,
                          kind: ch.kind,
                          topic: ch.topic,
                          categoryId: category.id,
                          roleIds: ch.roleIds,
                          synced: ch.synced,
                        }}
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
              ))}
              {visibleChannels.length === 0 && (
                <li className="text-xs text-slate-500">
                  {query ? "No channels match." : "No channels in this category yet."}
                </li>
              )}
            </ul>
          </div>

          <div>
            <p className="label mb-1.5">Add channel</p>
            <DiscordChannelForm
              categoryId={category.id}
              roles={roles}
              roleCounts={roleCounts}
              existingNamesByCategory={existingNamesByCategory}
            />
          </div>

          <div className="flex flex-wrap gap-2 border-t border-edge/60 pt-3">
            <ConfirmButton
              action={applyCategoryRolesToChannels.bind(null, category.id)}
              confirm={`Apply this category's current roles to all ${category.channels.length} channel(s) now? This is a one-time push, not "sync to category."`}
              className="btn-ghost text-xs"
            >
              Apply roles to all channels
            </ConfirmButton>
            <ConfirmButton
              action={duplicateDiscordCategory.bind(null, category.id)}
              confirm={`Duplicate "${category.name}" and its ${category.channels.length} channel${category.channels.length === 1 ? "" : "s"} into a new category?`}
              className="btn-ghost text-xs"
            >
              Duplicate category
            </ConfirmButton>
            <ConfirmButton
              action={deleteDiscordCategory.bind(null, category.id)}
              confirm={`Delete "${category.name}" and all ${category.channels.length} of its channels? This deletes them on Discord too.`}
            >
              Delete category
            </ConfirmButton>
          </div>
        </div>
      </details>
    </li>
  );
}

export function DiscordManagementList({
  categories,
  roles,
  roleCounts,
  existingNamesByCategory,
  categoryOptions,
}: {
  categories: CategoryVM[];
  roles: Role[];
  roleCounts?: Record<string, number> | null;
  existingNamesByCategory: Record<string, string[]>;
  categoryOptions: { id: string; name: string }[];
}) {
  const [query, setQuery] = useState("");

  return (
    <div>
      {categories.length > 6 && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter categories & channels…"
          className="input mb-3 text-sm"
        />
      )}
      <ul className="space-y-3">
        {categories.map((c, ci) => (
          <CategoryBlock
            key={c.id}
            category={c}
            ci={ci}
            total={categories.length}
            roles={roles}
            roleCounts={roleCounts}
            existingNamesByCategory={existingNamesByCategory}
            categoryOptions={categoryOptions}
            query={query}
          />
        ))}
        {categories.length === 0 && (
          <li className="text-sm text-slate-400">No categories yet — create one above.</li>
        )}
      </ul>
    </div>
  );
}
