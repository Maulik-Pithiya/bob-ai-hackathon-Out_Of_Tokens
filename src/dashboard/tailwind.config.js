/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#1d4ed8",
          red: "#dc2626",
          amber: "#d97706",
          green: "#16a34a",
          slate: "#1e293b",
        },
      },
    },
  },
  plugins: [],
};
