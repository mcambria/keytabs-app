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
          bg: '#21252b',
          panel: '#1c2025',
          highlight: '#2c3e50',
          kbd: '#252b33',
          'bg-hover': '#252b33',
          'bg-hover-hover': '#2c3e50',
          text: {
            DEFAULT: '#cbd5e0',
            muted: '#94a3b8',
            accent: '#c4a777',
            destructive: '#b91c1c'
          },
          cursor: '#e2b93b',
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