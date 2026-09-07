import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "#050505",
        saturn: "#0b0a0c",
        ivory: "#f6f1e4",
        gold: {
          DEFAULT: "#d4af37",
          bright: "#f0d78c",
          deep: "#a67c1a",
        },
        ember: "#ff6b1a",
        flare: "#ff3b1a",
        blood: "#c1121f",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
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
