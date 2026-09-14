/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ubi: {
          50: "#f0f3fa",
          100: "#e0e6f5",
          200: "#c6d0ed",
          300: "#9fb0e0",
          400: "#7189d0",
          500: "#4e67be",
          600: "#384da6",
          700: "#2a398c",
          800: "#191b82", // UsefulBI official brand navy
          900: "#141669",
          950: "#0d0e45",
        },
      },
    },
  },
  plugins: [],
}
