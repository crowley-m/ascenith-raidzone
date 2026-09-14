/** Minimal RFC-4180 CSV serialisation for staff data exports. */
export function toCsv(rows: Record<string, unknown>[], columns?: string[]): string {
  if (rows.length === 0) return columns?.join(",") ?? "";
  const cols = columns ?? Object.keys(rows[0]);
  const esc = (v: unknown) => {
    let s = v == null ? "" : v instanceof Date ? v.toISOString() : String(v);
    // Free-typed fields (character name, team name, reward reason, ...) flow
    // in here unrestricted — a cell starting with one of these opens as a
    // live formula in Excel/Sheets instead of plain text. Prefix with a
    // quote to force it back to a literal.
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\r\n");
}

const BOM = "﻿";

export function csvResponse(csv: string, filename: string): Response {
  // BOM so Excel opens UTF-8 correctly
  return new Response(BOM + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export function slugify(s: string, max = 40): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, max);
}
