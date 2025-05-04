/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ide: {
          bg: '#1e1e1e',
          panel: '#1e1e1e',
          highlight: '#2d2d2d',
          kbd: '#2b2b2b',
          text: {
            DEFAULT: '#a9b7c6',
            muted: '#606366',
          },
        },
      },
    },
  },
  plugins: [],
} 