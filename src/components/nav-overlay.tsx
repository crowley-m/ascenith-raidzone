"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

type Item = { href: string; label: string; external?: boolean };

export function NavOverlay({
  pages,
  sections = [],
  account,
  triggerClassName,
  triggerLabel = "Menu",
}: {
  pages: Item[];
  sections?: Item[];
  account: { name: string; isStaff: boolean } | null;
  triggerClassName?: string;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onEsc);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const bigLink =
    "block py-2 font-poster text-3xl uppercase leading-none transition-colors sm:text-4xl";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className={
          triggerClassName ??
          "inline-flex items-center gap-2 border border-edge px-3 py-1.5 font-mono text-[0.66rem] font-bold uppercase tracking-[0.14em] text-slate-200 hover:border-teal/50 hover:text-white"
        }
      >
        <span aria-hidden className="flex flex-col gap-[3px]">
          <span className="block h-px w-4 bg-current" />
          <span className="block h-px w-4 bg-current" />
          <span className="block h-px w-4 bg-current" />
        </span>
        {triggerLabel}
      </button>

      {open && (
        <div className="fixed inset-0 z-[200] flex flex-col bg-void/95 backdrop-blur-md">
          <div className="container-x flex h-16 flex-none items-center justify-between border-b border-edge">
            <span className="font-mono text-[0.78rem] font-bold uppercase tracking-[0.16em] text-white">
              <span className="mr-2 inline-block h-2 w-2 rounded-full bg-teal align-middle" />
              ASCENITH&middot;RAIDZONE
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="font-mono text-xs uppercase tracking-widest text-slate-400 hover:text-white"
            >
              Close &times;
            </button>
          </div>

          <div className="container-x grid flex-1 content-start gap-12 overflow-y-auto py-12 md:grid-cols-2">
            <nav>
              <p className="eyebrow">Pages</p>
              <ul className="mt-4">
                {pages.map((p) =>
                  p.external ? (
                    <li key={p.href}>
                      <a
                        href={p.href}
                        target="_blank"
                        rel="noreferrer"
                        className={`${bigLink} text-slate-200 hover:text-white`}
                      >
                        {p.label}
                      </a>
                    </li>
                  ) : (
                    <li key={p.href}>
                      <Link href={p.href} className={`${bigLink} text-slate-200 hover:text-white`}>
                        {p.label}
                      </Link>
                    </li>
                  ),
                )}
              </ul>
            </nav>

            {sections.length > 0 && (
              <nav>
                <p className="eyebrow">On this page</p>
                <ul className="mt-4">
                  {sections.map((sc) => (
                    <li key={sc.href}>
                      <a
                        href={sc.href}
                        onClick={() => setOpen(false)}
                        className={`${bigLink} text-slate-400 hover:text-white`}
                      >
                        {sc.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            )}
          </div>

          <div className="container-x flex flex-none flex-wrap items-center gap-3 border-t border-edge py-6">
            {account ? (
              <>
                <span className="mr-auto font-mono text-xs uppercase tracking-widest text-slate-500">
                  {account.name}
                </span>
                <Link href="/me" className="btn-ghost">
                  My profile
                </Link>
                {account.isStaff && (
                  <Link href="/portal" className="btn-ghost">
                    Staff portal
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="btn-ghost"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="mr-auto font-mono text-xs uppercase tracking-widest text-slate-400 hover:text-white"
                >
                  Sign in
                </Link>
                <Link href="/register" className="btn-primary">
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
