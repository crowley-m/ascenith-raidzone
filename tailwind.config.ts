import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ASCENITH RAIDZONE — deep teal / near-black, matching the Discord server
        void: "#070b0d",
        panel: "#0d1417",
        "panel-2": "#121c20",
        edge: "#1e2e33",
        teal: {
          DEFAULT: "#2fd4c7",
          dim: "#1c8f88",
          deep: "#0c4a45",
        },
        ember: "#ff8a3d",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
