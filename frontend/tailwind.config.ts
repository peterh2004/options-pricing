import type { Config } from "tailwindcss";

// `ink` is wired to CSS variables (see globals.css) so the entire UI surface
// switches between dark and light themes by toggling the `.dark` class on <html>.
// Semantic colors (up/down/warn/accent) stay hex. Green means green in both modes.
const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "monospace"],
      },
      colors: {
        ink: {
          950: "rgb(var(--ink-950) / <alpha-value>)",
          900: "rgb(var(--ink-900) / <alpha-value>)",
          850: "rgb(var(--ink-850) / <alpha-value>)",
          800: "rgb(var(--ink-800) / <alpha-value>)",
          700: "rgb(var(--ink-700) / <alpha-value>)",
          600: "rgb(var(--ink-600) / <alpha-value>)",
          500: "rgb(var(--ink-500) / <alpha-value>)",
          400: "rgb(var(--ink-400) / <alpha-value>)",
          300: "rgb(var(--ink-300) / <alpha-value>)",
          200: "rgb(var(--ink-200) / <alpha-value>)",
          100: "rgb(var(--ink-100) / <alpha-value>)",
          50: "rgb(var(--ink-50) / <alpha-value>)",
        },
        up: { 500: "#10b981", 400: "#34d399", 600: "#059669", 950: "#04231b" },
        down: { 500: "#ef4444", 400: "#f87171", 600: "#dc2626", 950: "#2a0a0c" },
        warn: { 500: "#f59e0b", 400: "#fbbf24" },
        accent: { 500: "#3b82f6", 400: "#60a5fa", 600: "#2563eb" },
      },
      fontSize: {
        "2xs": ["10px", { lineHeight: "14px", letterSpacing: "0.04em" }],
      },
      borderColor: {
        DEFAULT: "rgb(var(--ink-700))",
      },
      keyframes: {
        pulseGreen: {
          "0%": { boxShadow: "0 0 0 0 rgba(16,185,129,0.5)" },
          "70%": { boxShadow: "0 0 0 6px rgba(16,185,129,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(16,185,129,0)" },
        },
        ticker: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        skeleton: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.7" },
        },
      },
      animation: {
        "pulse-green": "pulseGreen 2s infinite",
        ticker: "ticker 80s linear infinite",
        skeleton: "skeleton 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
