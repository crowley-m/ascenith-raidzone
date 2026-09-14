"use client";

import { usePathname } from "next/navigation";

/** Subtle fade+rise on each route change — keyed by pathname so it remounts and replays. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-fade-in">
      {children}
    </div>
  );
}
