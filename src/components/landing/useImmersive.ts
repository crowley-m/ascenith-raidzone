"use client";

import { useEffect, type RefObject } from "react";
import { rzState } from "./state";

/**
 * Lenis smooth-scroll + GSAP ScrollTrigger/SplitText choreography for the landing.
 * Libs are dynamically imported after mount. Everything is cleaned up on unmount,
 * and it no-ops for reduced-motion (the page is then a plain, readable scroll).
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
      const q = <T extends Element = HTMLElement>(sel: string) => root.querySelector<T>(sel);
      const qa = <T extends Element = HTMLElement>(sel: string) =>
        Array.from(root.querySelectorAll<T>(sel));

      const ctx = gsap.context(() => {
        /* smooth scroll */
        let lenis: any = null;
        if (!reduce) {
          lenis = new Lenis({ duration: 1.1, smoothWheel: true });
          const onLenis = () => ScrollTrigger.update();
          lenis.on("scroll", onLenis);
          const raf = (time: number) => lenis.raf(time * 1000);
          gsap.ticker.add(raf);
          gsap.ticker.lagSmoothing(0);
          disposers.push(() => {
            gsap.ticker.remove(raf);
            lenis.destroy();
          });
        }

        /* progress bar + page progress */
        gsap.fromTo(
          "#rz-prog",
          { scaleX: 0 },
          {
            scaleX: 1,
            ease: "none",
            scrollTrigger: { trigger: root, start: "top top", end: "bottom bottom", scrub: 0.3 },
          },
        );
        ScrollTrigger.create({
          trigger: root,
          start: "top top",
          end: "bottom bottom",
          onUpdate: (self: any) => {
            rzState.page = self.progress;
          },
        });

        /* hero — pin + fly into the crystal */
        const hero = q("#top");
        const kin = q("[data-kin]");
        const under = q("[data-hero-under]");

        if (hero && !reduce) {
          ScrollTrigger.create({
            trigger: hero,
            start: "top top",
            end: "+=140%",
            pin: true,
            scrub: 1,
            onUpdate: (self: any) => {
              rzState.hero = self.progress;
            },
          });
          gsap.to(kin, {
            scale: 1.5,
            yPercent: -10,
            filter: "blur(9px)",
            autoAlpha: 0,
            ease: "power1.in",
            scrollTrigger: { trigger: hero, start: "top top", end: "+=110%", scrub: 1 },
          });
          gsap.to(under, {
            autoAlpha: 0,
            y: -30,
            ease: "power1.in",
            scrollTrigger: { trigger: hero, start: "top top", end: "+=70%", scrub: 1 },
          });
        }

        /* hero intro — autoplays, ends on the visible resting state */
        if (!reduce) {
          const tl = gsap.timeline({ delay: 0.15, defaults: { ease: "expo.out" } });
          let chars: Element[] = [];
          if (SplitText && kin) {
            const split = new SplitText(Array.from(kin.querySelectorAll("i")), {
              type: "chars",
              charsClass: "rz-char",
            });
            chars = split.chars;
            disposers.push(() => split.revert());
          }
          if (chars.length) {
            tl.from(chars, {
              yPercent: 130,
              rotationX: -75,
              autoAlpha: 0,
              stagger: 0.045,
              duration: 1.1,
            });
          } else if (kin) {
            tl.from(kin, { autoAlpha: 0, y: 30, duration: 0.8 });
          }
          if (under) {
            tl.from(
              Array.from(under.children),
              { y: 24, autoAlpha: 0, stagger: 0.1, duration: 0.6 },
              "-=0.5",
            );
          }
        }

        /* panels */
        if (!reduce) {
          qa("[data-panel]").forEach((p) => {
            const h2 = p.querySelector<HTMLElement>("[data-split]");
            const metas = Array.from(p.querySelectorAll("[data-meta]"));
            if (SplitText && h2) {
              const split = new SplitText(h2, { type: "words,chars", charsClass: "rz-char" });
              disposers.push(() => split.revert());
              gsap.from(split.chars, {
                yPercent: 120,
                autoAlpha: 0,
                stagger: 0.02,
                duration: 0.9,
                ease: "expo.out",
                scrollTrigger: { trigger: p, start: "top 74%" },
              });
            } else if (h2) {
              gsap.from(h2, {
                y: 40,
                autoAlpha: 0,
                duration: 0.8,
                scrollTrigger: { trigger: p, start: "top 74%" },
              });
            }
            if (metas.length) {
              gsap.from(metas, {
                y: 24,
                autoAlpha: 0,
                stagger: 0.1,
                duration: 0.7,
                ease: "power2.out",
                scrollTrigger: { trigger: p, start: "top 70%" },
              });
            }
          });

          /* finale */
          const finale = q("#enlist");
          qa("[data-fin]").forEach((f) => {
            if (SplitText) {
              const split = new SplitText(f, { type: "chars", charsClass: "rz-char" });
              disposers.push(() => split.revert());
              gsap.from(split.chars, {
                yPercent: 130,
                rotationX: -60,
                autoAlpha: 0,
                stagger: 0.03,
                duration: 0.9,
                ease: "expo.out",
                scrollTrigger: { trigger: finale ?? f, start: "top 62%" },
              });
            } else {
              gsap.from(f, {
                y: 40,
                autoAlpha: 0,
                duration: 0.8,
                scrollTrigger: { trigger: finale ?? f, start: "top 70%" },
              });
            }
          });
          const finMetas = qa("#enlist [data-meta]");
          if (finMetas.length) {
            gsap.from(finMetas, {
              y: 24,
              autoAlpha: 0,
              stagger: 0.12,
              duration: 0.7,
              scrollTrigger: { trigger: finale ?? root, start: "top 52%" },
            });
          }
        }

        /* anchor links */
        qa<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
          const handler = (e: Event) => {
            const href = a.getAttribute("href");
            if (!href) return;
            const t = root.querySelector<HTMLElement>(href);
            if (!t) return;
            e.preventDefault();
            if (lenis) lenis.scrollTo(t, { offset: 0 });
            else t.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
          };
          a.addEventListener("click", handler);
          disposers.push(() => a.removeEventListener("click", handler));
        });

        /* scroll velocity → shader */
        let lastY = window.scrollY;
        let lastT = performance.now();
        const velTick = () => {
          const now = performance.now();
          const y = window.scrollY;
          const dt = Math.max(1, now - lastT);
          rzState.scrollVel = rzState.scrollVel * 0.85 + (Math.abs(y - lastY) / dt) * 0.15;
          lastY = y;
          lastT = now;
        };
        gsap.ticker.add(velTick);
        disposers.push(() => gsap.ticker.remove(velTick));

        if (document.fonts?.ready) {
          document.fonts.ready.then(() => ScrollTrigger.refresh());
        }
        rzState.ready = true;
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
        rzState.ready = false;
      };
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [ready, rootRef]);
}
