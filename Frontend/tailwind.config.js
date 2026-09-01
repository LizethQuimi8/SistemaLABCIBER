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
          darkest: '#0f172a',
          dark:    '#1e293b',
          mid:     '#334155',
          light:   '#f8fafc',
        },
      },
    },
  },
  plugins: [],
}
