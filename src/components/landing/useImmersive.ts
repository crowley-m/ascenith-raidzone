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

        /* reveal helper — content stays visible at rest; animates once on enter */
        const revealOnEnter = (
          trigger: Element,
          start: string,
          run: () => void,
        ) => {
          ScrollTrigger.create({ trigger, start, once: true, onEnter: run });
        };

        if (!reduce) {
          qa("[data-panel]").forEach((p) => {
            const h2 = p.querySelector<HTMLElement>("[data-split]");
            const metas = Array.from(p.querySelectorAll("[data-meta]"));
            let chars: Element[] = [];
            if (SplitText && h2) {
              const split = new SplitText(h2, { type: "words,chars", charsClass: "rz-char" });
              chars = split.chars;
              disposers.push(() => split.revert());
            }
            revealOnEnter(p, "top 80%", () => {
              if (chars.length) {
                gsap.fromTo(
                  chars,
                  { yPercent: 60, rotateX: -55, transformOrigin: "50% 100%" },
                  {
                    yPercent: 0,
                    rotateX: 0,
                    stagger: 0.02,
                    duration: 0.8,
                    ease: "power3.out",
                  },
                );
              } else if (h2) {
                gsap.fromTo(h2, { y: 34 }, { y: 0, duration: 0.8, ease: "power3.out" });
              }
              if (metas.length) {
                gsap.fromTo(
                  metas,
                  { y: 28 },
                  { y: 0, stagger: 0.08, duration: 0.7, ease: "power2.out" },
                );
              }
            });
          });

          const finale = q("#enlist");
          const finBits = qa("[data-fin]");
          const finSplits = finBits.map((f) => {
            if (!SplitText) return null;
            const split = new SplitText(f, { type: "chars", charsClass: "rz-char" });
            disposers.push(() => split.revert());
            return split;
          });
          const finMetas = qa("#enlist [data-meta]");
          revealOnEnter(finale ?? root, "top 68%", () => {
            finBits.forEach((f, i) => {
              const split = finSplits[i];
              if (split) {
                gsap.fromTo(
                  split.chars,
                  { yPercent: 70, rotateX: -55, transformOrigin: "50% 100%" },
                  {
                    yPercent: 0,
                    rotateX: 0,
                    stagger: 0.03,
                    duration: 0.8,
                    ease: "power3.out",
                    delay: i * 0.12,
                  },
                );
              } else {
                gsap.fromTo(f, { y: 34 }, { y: 0, duration: 0.8, ease: "power3.out" });
              }
            });
            if (finMetas.length) {
              gsap.fromTo(
                finMetas,
                { y: 26 },
                { y: 0, stagger: 0.1, duration: 0.7, ease: "power2.out", delay: 0.2 },
              );
            }
          });
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
