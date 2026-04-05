/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        warm: {
          50: "#fdf8f0",
          100: "#faecd8",
          200: "#f5d6b0",
          300: "#efba7e",
          400: "#e8964a",
          500: "#e27a28",
          600: "#d3611e",
          700: "#af491a",
          800: "#8c3b1d",
          900: "#72321b",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
