import s from "./landing.module.css";

const FONT =
  'var(--font-anton), "Arial Narrow", "Oswald", "Impact", system-ui, sans-serif';

/**
 * RAIDZONE hero wordmark — an SVG halftone dot-screen render of the word.
 * Calm treatment: wipes in on load, the dot field drifts slowly (SMIL),
 * and it drifts up on scroll. Pure SVG + CSS; no JS, no WebGL.
 */
export function Wordmark() {
  return (
    <div className={s.wm} data-wm>
      <svg
        className={s.wmSvg}
        viewBox="0 0 1440 460"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="RAIDZONE"
      >
        <defs>
          <pattern
            id="rzHalftone"
            width="9"
            height="9"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="4.5" cy="4.5" r="2.5" fill="#ffffff" />
            <animateTransform
              attributeName="patternTransform"
              type="translate"
              values="0 0; 2.4 -3; -2 1.6; 1 2; 0 0"
              keyTimes="0; 0.25; 0.55; 0.8; 1"
              dur="11s"
              calcMode="spline"
              keySplines="0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1"
              repeatCount="indefinite"
            />
          </pattern>
        </defs>
        <text
          x="720"
          y="372"
          textAnchor="middle"
          textLength="1400"
          lengthAdjust="spacingAndGlyphs"
          fontFamily={FONT}
          fontSize="392"
          fontWeight={400}
          fill="url(#rzHalftone)"
        >
          RAIDZONE
        </text>
      </svg>
    </div>
  );
}
