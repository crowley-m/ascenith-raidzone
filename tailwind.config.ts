import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ASCENITH RAIDZONE (site pages) — true black, near-white, one crimson accent.
        // The landing keeps its own warm palette in landing.module.css.
        void: "#0a0a0b",
        panel: "#141416",
        "panel-2": "#1d1d20",
        edge: "#2c2c31",
        cream: {
          DEFAULT: "#ededef",
          dim: "#b4b4bb",
        },
        // neutral grey ramp — existing text-slate-* classes recolor in place
        slate: {
          100: "#f4f4f5",
          200: "#e4e4e7",
          300: "#c9c9ce",
          400: "#9a9aa3",
          500: "#71717a",
          600: "#52525b",
          700: "#3f3f46",
          800: "#27272a",
          900: "#18181b",
        },
        // `teal` kept as the accent token name so existing classes recolor in place
        teal: {
          DEFAULT: "#e5484d",
          dim: "#c13a40",
          deep: "#7a1c26",
        },
        ember: "#e0a13a",
      },
      fontFamily: {
        // `poster` and `display` both resolve to Anton — one display face app-wide.
        poster: ["var(--font-anton)", "Oswald", "Arial Narrow", "sans-serif"],
        display: ["var(--font-anton)", "Oswald", "Arial Narrow", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-space-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        DEFAULT: "0px",
        md: "0px",
        lg: "0px",
        xl: "2px",
        full: "9999px",
      },
    },
  },
  plugins: [],
} satisfies Config;
