/**
 * Parse free-typed content (one point per line, `# Heading` groups, `1.` steps)
 * into structured groups — shared by the Discord embeds and the event page so
 * both present the same way.
 */
export type ProseItem =
  | { kind: "heading"; text: string }
  | { kind: "bullet"; text: string }
  | { kind: "step"; num: string; text: string };

export function proseItems(md: string | null | undefined): ProseItem[][] {
  const raw = (md ?? "").replace(/\r/g, "");
  const groups: ProseItem[][] = [];
  let cur: ProseItem[] = [];
  const flush = () => {
    if (cur.length) groups.push(cur);
    cur = [];
  };
  for (const src of raw.split("\n")) {
    const line = src.trim();
    if (!line) {
      flush();
      continue;
    }
    const heading = line.match(/^#{1,6}\s+(.*)$/);
    const step = line.match(/^(\d+)[.)]\s+(.*)$/);
    if (heading) {
      cur.push({ kind: "heading", text: heading[1] });
    } else if (/^[A-Za-z0-9][^:]{0,40}:$/.test(line)) {
      cur.push({ kind: "heading", text: line });
    } else if (step) {
      cur.push({ kind: "step", num: step[1], text: step[2] });
    } else {
      cur.push({ kind: "bullet", text: line.replace(/^[-*•]\s+/, "") });
    }
  }
  flush();
  return groups;
}
