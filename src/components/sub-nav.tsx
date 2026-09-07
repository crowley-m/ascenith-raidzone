"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SubNav({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1 border-b border-edge/70 pb-px">
      {items.map((it) => {
        const active = pathname === it.href || (it.href !== "/me" && it.href !== "/portal" && pathname.startsWith(it.href));
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`rounded-t-md px-4 py-2 text-sm font-medium transition ${
              active
                ? "border-b-2 border-teal text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
