/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // ── Design tokens ──────────────────────────────────────────────
      // Background layers (warm off-white, not pure white)
      //   canvas   : page background
      //   surface  : card / panel background
      //   sunken   : recessed / table-row-alt background
      //   border   : default dividing line
      //
      // Accent 1 — deep teal (navigation, primary actions, highlights)
      // Accent 2 — muted terracotta (warnings, elevated risk, emphasis)
      // Danger    — deep crimson (critical risk only)
      // Success   — forest green (normal / good state)
      colors: {
        canvas:  "#F7F5F0",
        surface: "#EFEDE7",
        sunken:  "#E8E5DE",
        border:  "#D8D4CB",
        ink: {
          DEFAULT: "#1E1C18",   // headings / primary text
          muted:   "#5C5850",   // secondary text
          faint:   "#9C968C",   // placeholder / disabled
        },
        teal: {
          50:  "#EBF6F5",
          100: "#C4E8E5",
          200: "#8DD1CC",
          300: "#57BAB4",
          400: "#2DA39D",
          500: "#1A8C86",   // primary action
          600: "#12706B",   // hover
          700: "#0C5450",
          800: "#083C39",
          900: "#052826",
        },
        terra: {
          50:  "#FBF2EE",
          100: "#F5DDD3",
          200: "#E8B9A6",
          300: "#D98D73",
          400: "#C96A4A",   // elevated / warning accent
          500: "#B5512D",
          600: "#904022",
          700: "#6C3019",
          800: "#4A2010",
          900: "#301508",
        },
        danger: {
          light: "#FDECEA",
          mid:   "#E57373",
          DEFAULT:"#C62828",   // critical risk only
          dark:  "#8B1A1A",
        },
        good: {
          light: "#EDF7ED",
          mid:   "#66BB6A",
          DEFAULT:"#2E7D32",   // normal / healthy state
          dark:  "#1B5E20",
        },
      },

      fontFamily: {
        // Inter for body; Sora for headings — both available via Google Fonts
        // (loaded in layout.tsx).  System fallback chain is safe.
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Sora", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },

      fontSize: {
        "2xs": ["0.65rem", { lineHeight: "1rem" }],
      },

      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)",
        "card-md": "0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.04)",
        "inner-sm": "inset 0 1px 2px 0 rgb(0 0 0 / 0.05)",
      },

      borderRadius: {
        "4xl": "2rem",
      },
    },
  },
  plugins: [],
};
