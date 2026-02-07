import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Design tokens - Board themes
        board: {
          light: 'var(--color-board-light)',
          dark: 'var(--color-board-dark)',
        },
        // Design tokens - Primary
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        // Design tokens - Surface
        surface: {
          DEFAULT: 'var(--color-surface)',
          elevated: 'var(--color-surface-elevated)',
          overlay: 'var(--color-surface-overlay)',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      spacing: {
        'board': 'var(--board-size)',
        'square': 'var(--square-size)',
      },
      borderRadius: {
        'board': 'var(--board-radius, 0.5rem)',
      },
      boxShadow: {
        'board': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        'piece': '0 2px 4px rgba(0, 0, 0, 0.2)',
        'piece-hover': '0 4px 8px rgba(0, 0, 0, 0.3)',
      },
    },
  },
  plugins: [],
};

export default config;
