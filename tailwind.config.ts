import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "#07070a",
        saturn: "#0b0a0c",
        ivory: "#f4f1ea",
        steel: "#9aa3ad",
        crimson: "#9b1c2e",
        gold: {
          DEFAULT: "#c9a227",
          bright: "#e4c56a",
          deep: "#8a6c12",
        },
        ember: "#e85d04",
        flare: "#c1121f",
        blood: "#7a1220",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        heading: ["var(--font-heading)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        script: ["var(--font-script)", "cursive"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        gold: "0 0 40px rgba(212, 175, 55, 0.25)",
        ember: "0 0 50px rgba(255, 107, 26, 0.28)",
      },
    },
  },
  plugins: [],
};

export default config;
