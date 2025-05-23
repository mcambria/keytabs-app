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
          bg: '#282c34',
          panel: '#21252b',
          highlight: '#394e75',
          kbd: '#2b2b2b',
          'bg-hover': '#282c34',
          'bg-hover-hover': '#394e75',
          text: {
            DEFAULT: '#9ab5c3',
            muted: '#8e99ae',
            accent: '#bcb37f',
            destructive: '#af6a75'
          },
          cursor: '#dbb62d',
        },
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        }
      },
      animation: {
        blink: 'blink 1s step-end infinite',
      },
    },
  },
  plugins: [],
} 