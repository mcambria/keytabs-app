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
          'bg-hover': '#2d2d2d',
          'bg-hover-hover': '#3d3d3d',
          text: {
            DEFAULT: '#a9b7c6',
            muted: '#606366',
            accent: {
              primary: '#b48ead',    // Muted purple for main accents
              secondary: '#c586c0',  // Slightly brighter purple for hover states
              highlight: '#d8a0c9',  // Soft pink for highlights
              subtle: '#9d7fad',     // Very muted purple for secondary text
            }
          },
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