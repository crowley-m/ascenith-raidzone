"use client";

import { useEffect } from "react";

/**
 * Restrained scroll reveal for the public showcase pages. Any element with
 * `data-reveal` fades + rises 12px into place once, when it first enters the
 * viewport. Respects prefers-reduced-motion.
 *
 * Deliberately NOT keyed off pathname or querying the DOM once — that made
 * it depend on its effect happening to run *after* whatever else changed
 * the DOM for a route change, which broke intermittently (a page-transition
 * wrapper remounting the tree could win that race and leave sections
 * revealed nothing observed). A MutationObserver instead reacts to
 * `data-reveal` elements actually appearing, whenever that happens — route
 * change, client-rendered content, anything — so there's no timing to get
 * wrong. Each element also gets its own failsafe timer, in case it's never
 * scrolled into view.
 */
export function ScrollReveal() {
  useEffect(() => {
    const root = document.querySelector(".site-shell");
    if (!root) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seen = new WeakSet<Element>();
    const timers = new Set<number>();

    const io = reduce
      ? null
      : new IntersectionObserver(
          (entries) => {
            for (const e of entries) {
              if (e.isIntersecting) {
                e.target.classList.add("reveal-in");
                io!.unobserve(e.target);
              }
            }
          },
          { rootMargin: "0px 0px -6% 0px", threshold: 0.06 },
        );

    const handle = (el: Element) => {
      if (seen.has(el)) return;
      seen.add(el);
      if (reduce) {
        el.classList.add("reveal-in");
        return;
      }
      io!.observe(el);
      timers.add(window.setTimeout(() => el.classList.add("reveal-in"), 2500));
    };

    root.querySelectorAll("[data-reveal]").forEach(handle);

    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (node.matches("[data-reveal]")) handle(node);
          node.querySelectorAll("[data-reveal]").forEach(handle);
        });
      }
    });
    mo.observe(root, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      io?.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  return null;
}
