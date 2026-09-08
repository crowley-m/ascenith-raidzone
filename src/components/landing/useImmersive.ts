"use client";

import { useEffect, type RefObject } from "react";

/**
 * Lenis smooth-scroll + light GSAP reveals for the landing.
 * Libs are dynamically imported after mount. Cleaned up on unmount.
 * No-ops for reduced-motion (plain, readable scroll).
 */
export function useImmersive(rootRef: RefObject<HTMLDivElement | null>, ready: boolean) {
  useEffect(() => {
    if (!ready || typeof window === "undefined") return;
    const root = rootRef.current;
    if (!root) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let cancelled = false;
    let cleanup = () => {};

    (async () => {
      const [{ gsap }, stMod, lenisMod] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
        import("lenis"),
      ]);
      if (cancelled) return;

      const ScrollTrigger = (stMod as any).ScrollTrigger ?? (stMod as any).default;
      const Lenis = (lenisMod as any).default ?? (lenisMod as any);

      let SplitText: any = null;
      try {
        const sp = await import("gsap/SplitText");
        SplitText = (sp as any).SplitText ?? (sp as any).default;
      } catch {
        SplitText = null;
      }
      if (cancelled) return;

      gsap.registerPlugin(ScrollTrigger);
      if (SplitText) gsap.registerPlugin(SplitText);

      const disposers: Array<() => void> = [];
      const qa = (sel: string) => Array.from(root.querySelectorAll<HTMLElement>(sel));

      let lenis: any = null;

      const ctx = gsap.context(() => {
        if (!reduce) {
          lenis = new Lenis({ duration: 1.05, smoothWheel: true });
          lenis.on("scroll", ScrollTrigger.update);
          const raf = (t: number) => lenis.raf(t * 1000);
          gsap.ticker.add(raf);
          gsap.ticker.lagSmoothing(0);
          disposers.push(() => {
            gsap.ticker.remove(raf);
            lenis.destroy();
          });
        }

        if (!reduce) {
          const TA = "play none none reverse";

          // headline splits — per-word mask wipe, reverses on scroll back
          qa("[data-split]").forEach((h) => {
            if (!SplitText) {
              gsap.fromTo(
                h,
                { yPercent: 40, autoAlpha: 0 },
                {
                  yPercent: 0,
                  autoAlpha: 1,
                  duration: 0.7,
                  ease: "power3.out",
                  scrollTrigger: { trigger: h, start: "top 84%", toggleActions: TA },
                },
              );
              return;
            }
            const split = new SplitText(h, {
              type: "words,chars",
              charsClass: "rz-char",
              wordsClass: "rz-word",
            });
            disposers.push(() => split.revert());
            gsap.fromTo(
              split.chars,
              { yPercent: 115 },
              {
                yPercent: 0,
                stagger: 0.018,
                duration: 0.62,
                ease: "power4.out",
                scrollTrigger: { trigger: h, start: "top 85%", toggleActions: TA },
              },
            );
          });

          // reveals — fade + rise on the way down, undo on the way back up
          qa("[data-reveal]").forEach((el) => {
            gsap.fromTo(
              el,
              { y: 26, autoAlpha: 0 },
              {
                y: 0,
                autoAlpha: 1,
                duration: 0.6,
                ease: "power2.out",
                scrollTrigger: { trigger: el, start: "top 90%", toggleActions: TA },
              },
            );
          });

          // terminal panels — lines type in, reverse on scroll back
          qa("[data-term]").forEach((panel) => {
            const lines = Array.from(panel.querySelectorAll<HTMLElement>("[data-tl]"));
            if (!lines.length) return;
            gsap.fromTo(
              lines,
              { autoAlpha: 0, x: -14 },
              {
                autoAlpha: 1,
                x: 0,
                stagger: 0.05,
                duration: 0.34,
                ease: "power2.out",
                scrollTrigger: { trigger: panel, start: "top 82%", toggleActions: TA },
              },
            );
          });

          // parallax — layers drift at different rates as you scroll
          qa("[data-parallax]").forEach((el) => {
            gsap.fromTo(
              el,
              { yPercent: 10 },
              {
                yPercent: -10,
                ease: "none",
                scrollTrigger: {
                  trigger: el,
                  start: "top bottom",
                  end: "bottom top",
                  scrub: 0.7,
                },
              },
            );
          });

          // hero wordmark drifts up slowly behind the fold
          const wm = root.querySelector<HTMLElement>("[data-wm] svg");
          const hero = root.querySelector<HTMLElement>("#top");
          if (wm && hero) {
            gsap.to(wm, {
              yPercent: -24,
              ease: "none",
              scrollTrigger: {
                trigger: hero,
                start: "top top",
                end: "bottom top",
                scrub: true,
              },
            });
          }
        }

        // anchor links through Lenis
        qa('a[href^="#"]').forEach((a) => {
          const handler = (e: Event) => {
            const href = a.getAttribute("href");
            if (!href || href === "#") return;
            const t = root.querySelector<HTMLElement>(href);
            if (!t) return;
            e.preventDefault();
            if (lenis) lenis.scrollTo(t, { offset: -20 });
            else t.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
          };
          a.addEventListener("click", handler);
          disposers.push(() => a.removeEventListener("click", handler));
        });

        if (document.fonts?.ready) {
          document.fonts.ready.then(() => ScrollTrigger.refresh());
        }
      }, root);

      cleanup = () => {
        ctx.revert();
        disposers.forEach((d) => {
          try {
            d();
          } catch {
            /* ignore */
          }
        });
      };
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [ready, rootRef]);
}
