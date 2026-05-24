import type { Config } from 'tailwindcss'

export default {
  content: [
    './app.vue',
    './pages/**/*.vue',
    './components/**/*.vue',
    './layouts/**/*.vue',
    './plugins/**/*.ts',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          50: '#f8fafc',
          900: '#0b141a',
          800: '#111b21',
          700: '#1b2838',
          600: '#202c33',
        },
        border: {
          dark: '#222e35',
          darker: '#444c56',
          light: '#e2e8f0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
    },
  },
  plugins: [],
} satisfies Config
