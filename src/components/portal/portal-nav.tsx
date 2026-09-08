"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type PortalNavItem = { href: string; label: string };

export function PortalNav({ items }: { items: PortalNavItem[] }) {
  const pathname = usePathname();

  return (
    <nav
      className="-mx-5 flex gap-1 overflow-x-auto border-b border-edge/70 px-5 pb-px
        lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:border-b-0 lg:px-0 lg:pb-0"
    >
      {items.map((it) => {
        const active =
          pathname === it.href ||
          (it.href !== "/portal" && pathname.startsWith(it.href));
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`shrink-0 whitespace-nowrap px-4 py-2 text-sm font-medium transition
              lg:rounded-md lg:border-l-2 ${
                active
                  ? "border-teal text-white lg:bg-panel/60"
                  : "border-transparent text-slate-400 hover:text-slate-200 lg:hover:bg-panel/30"
              }`}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
