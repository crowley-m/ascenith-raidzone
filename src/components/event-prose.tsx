import { proseItems } from "@/lib/prose";

/**
 * Renders free-typed event content (gameplay / schedule / wipe info) as a clean
 * point-wise list — the same shape it takes in the Discord embeds.
 */
export function EventProse({ source }: { source: string | null | undefined }) {
  const groups = proseItems(source);
  if (!groups.length) return null;

  return (
    <div className="space-y-5">
      {groups.map((items, gi) => (
        <div key={gi}>
          {items.map((it, i) => {
            if (it.kind === "heading") {
              return (
                <h3
                  key={i}
                  className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-teal"
                >
                  {it.text}
                </h3>
              );
            }
            if (it.kind === "step") {
              return (
                <div key={i} className="mt-2 flex gap-3 font-mono text-sm text-slate-200">
                  <span className="shrink-0 text-teal">{it.num}.</span>
                  <span>{it.text}</span>
                </div>
              );
            }
            return (
              <div key={i} className="mt-2 flex gap-3 font-mono text-sm text-slate-200">
                <span className="shrink-0 select-none text-teal">›</span>
                <span>{it.text}</span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
