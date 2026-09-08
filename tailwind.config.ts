import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ASCENITH RAIDZONE — warm near-black, cream, one bruised-crimson accent
        void: "#0c0a08",
        panel: "#161210",
        "panel-2": "#1e1813",
        edge: "#2b2118",
        cream: {
          DEFAULT: "#e9e1d1",
          dim: "#b8ae9c",
        },
        // warm-tinted neutral ramp so existing text-slate-* classes match the theme
        slate: {
          100: "#f0eade",
          200: "#e2dac9",
          300: "#cabfa9",
          400: "#9d9280",
          500: "#7d7364",
          600: "#5f574a",
          700: "#443d33",
          800: "#2b2620",
          900: "#191510",
        },
        // `teal` kept as the accent token name so existing classes recolor in place
        teal: {
          DEFAULT: "#d5303f",
          dim: "#b0242f",
          deep: "#7a1c26",
        },
        ember: "#e0a13a",
      },
      fontFamily: {
        poster: ["var(--font-anton)", "Arial Narrow", "Oswald", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
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
