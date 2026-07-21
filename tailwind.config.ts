import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f2f6fb',
          100: '#e2eaf6',
          200: '#c1d3ea',
          300: '#93b2d9',
          400: '#5f8bc4',
          500: '#3c6bab',
          600: '#2c5290',
          700: '#254374',
          800: '#213a61',
          900: '#0c1f3d',
          950: '#081326'
        }
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem'
      }
    }
  },
  plugins: []
};

export default config;
