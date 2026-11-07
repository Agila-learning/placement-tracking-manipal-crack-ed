/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        fic: {
          navy: '#0F2744',
          'navy-dark': '#0A1B30',
          'navy-light': '#1A3C64',
          blue: '#1E3A8A',
          yellow: '#F59E0B',
          'yellow-light': '#FBBF24',
          'yellow-dark': '#D97706',
          gold: '#EAB308',
          slate: '#F8FAFC',
          border: '#E2E8F0',
          text: '#0F172A',
          muted: '#64748B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

