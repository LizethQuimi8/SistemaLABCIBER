/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          darkest: '#052a18',
          dark:    '#0e6b3c',
          mid:     '#16874c',
          light:   '#f3faf6',
          gold:    '#c9a227',
        },
      },
    },
  },
  plugins: [],
}
