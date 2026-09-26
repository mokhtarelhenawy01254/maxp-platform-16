/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#09090b',
        surface: '#121214',
        'surface-highlight': '#18181b',
        border: 'rgba(255, 255, 255, 0.08)',
        primary: {
          DEFAULT: '#6366f1',
          hover: '#4f46e5',
        },
      },
    },
  },
  plugins: [],
}
