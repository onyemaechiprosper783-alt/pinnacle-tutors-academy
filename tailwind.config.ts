import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',

  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],

  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f4f7fb',
          100: '#e7edf5',
          200: '#c9d5e5',
          300: '#9fb1c8',
          400: '#6f86a4',
          500: '#405a7a',
          600: '#1f3a5f',
          700: '#17304f',
          800: '#10243d',
          900: '#091a2f',
        },

        accent: {
          50: '#fffdf5',
          100: '#fff7d6',
          200: '#fbe9a3',
          300: '#f6d66b',
          400: '#e9bc3f',
          500: '#d4a72c',
          600: '#b88916',
          700: '#936a0d',
          800: '#76530b',
          900: '#60430a',
        },
      },

      screens: {
        xs: '375px',
      },
    },
  },

  plugins: [],
};

export default config;
