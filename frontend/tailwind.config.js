/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        elderly: {
          dark: '#0f172a',
          card: '#1e293b',
          border: '#334155',
          text: '#f8fafc',
          subtext: '#94a3b8',
          accent: '#38bdf8',
          yellow: '#fde047',
          green: '#4ade80',
          red: '#f87171',
        }
      }
    },
  },
  plugins: [],
}

