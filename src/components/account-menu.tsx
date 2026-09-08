"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

export function AccountMenu({
  name,
  isStaff,
  nav,
}: {
  name: string;
  isStaff: boolean;
  nav: { href: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const short = name.length > 16 ? `${name.slice(0, 15)}…` : name;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 border border-edge px-3 py-1.5 font-mono text-[0.66rem] font-bold uppercase tracking-[0.14em] text-slate-200 hover:border-teal/50 hover:text-white"
      >
        <span className="h-1.5 w-1.5 flex-none rounded-full bg-teal" />
        {short}
        <span className={`transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-56 border border-edge bg-void shadow-xl"
        >
          <div className="flex flex-col py-1">
            <MenuLink href="/me">My profile</MenuLink>
            <MenuLink href="/me/events">My events</MenuLink>
            <MenuLink href="/me/rewards">My rewards</MenuLink>
            {isStaff && (
              <>
                <div className="my-1 border-t border-edge/70" />
                <MenuLink href="/portal">Staff portal</MenuLink>
              </>
            )}

            {/* public links — mainly for mobile, where the top nav is hidden */}
            <div className="my-1 border-t border-edge/70 md:hidden" />
            <div className="md:hidden">
              {nav.map((n) => (
                <MenuLink key={n.href} href={n.href}>
                  {n.label}
                </MenuLink>
              ))}
            </div>

            <div className="my-1 border-t border-edge/70" />
            <button
              type="button"
              role="menuitem"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="px-4 py-2 text-left font-mono text-[0.7rem] uppercase tracking-wide text-slate-400 hover:bg-panel hover:text-white"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      role="menuitem"
      className="px-4 py-2 font-mono text-[0.7rem] uppercase tracking-wide text-slate-300 hover:bg-panel hover:text-white"
    >
      {children}
    </Link>
  );
}
