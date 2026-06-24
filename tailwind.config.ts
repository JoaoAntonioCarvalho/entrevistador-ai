import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['Geist', 'system-ui', 'sans-serif'],
        display: ['Geist', 'system-ui', 'sans-serif'],
        mono:    ['Geist Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        muted: {
          DEFAULT: 'var(--muted)',
          fg:      'var(--muted-fg)',
        },
        border: {
          DEFAULT: 'var(--border)',
          strong:  'var(--border-strong)',
        },
        card: {
          DEFAULT: 'var(--card)',
          hover:   'var(--card-hover)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover:   'var(--accent-hover)',
          light:   'var(--accent-light)',
          fg:      'var(--accent-fg)',
        },
      },
      letterSpacing: {
        display:      '-0.03em',
        heading:      '-0.02em',
        'heading-sm': '-0.015em',
        eyebrow:      '0.12em',
      },
      boxShadow: {
        'card':      '0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-hover': '0 4px 8px -2px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.04)',
        'modal':     '0 20px 40px -8px rgb(0 0 0 / 0.12), 0 8px 16px -4px rgb(0 0 0 / 0.07)',
        'focus':     '0 0 0 3px rgb(146 64 14 / 0.20)',
      },
      animation: {
        'fade-in':     'fadeIn 0.4s ease forwards',
        'slide-right': 'slideInRight 0.3s ease forwards',
        'pulse-ring':  'pulse-ring 1.5s ease-out infinite',
      },
    },
  },
  plugins: [],
}

export default config
