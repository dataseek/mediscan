import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#010B14",
        panel: "#0D1B2A",
        panelSoft: "#152535",
        panelMuted: "#1a2d42",
        medical: "#107C56",
        medicalHover: "#0f6b4c"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        softPulse: {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "1" }
        }
      },
      animation: {
        fadeIn: "fadeIn 420ms ease-out both",
        softPulse: "softPulse 1.35s ease-in-out infinite"
      }
    }
  },
  plugins: []
};

export default config;
