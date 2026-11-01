/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        swiggy: {
          orange: '#FC8019',
          orangeHover: '#E06A0B',
          orangeLight: '#FFF4EB',
          dark: '#1C1C1C',
        },
        zepto: {
          purple: '#7C3AED',
          purpleLight: '#F3E8FF',
          violet: '#6D28D9',
        },
        instamart: {
          green: '#0C831F',
          greenLight: '#E8F5E9',
          emerald: '#10B981',
        },
        rais: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'swiggy': '0 4px 20px rgba(40, 44, 63, 0.08)',
        'swiggy-hover': '0 8px 28px rgba(40, 44, 63, 0.14)',
        'card': '0 2px 12px rgba(0, 0, 0, 0.06)',
      }
    },
  },
  plugins: [],
}
