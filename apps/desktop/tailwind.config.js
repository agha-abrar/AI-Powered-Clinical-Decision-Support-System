/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        clinical: {
          blue: "#2563eb",
          indigo: "#4f46e5",
          teal: "#0d9488",
          purple: "#7c3aed",
          danger: "#dc2626",
          warning: "#d97706",
          safe: "#16a34a",
          info: "#2563eb",
        },
      },
      transitionDuration: { 150: "150ms", 200: "200ms", 250: "250ms", 400: "400ms" },
    },
  },
  plugins: [],
};
