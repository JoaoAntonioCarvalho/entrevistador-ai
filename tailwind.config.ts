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
        mono:    ['Geist Mono', 'monospace'],
      },
      colors: {
        accent: {
          DEFAULT: '#1d4ed8',
          hover:   '#1e40af',
          light:   '#eff6ff',
        },
      },
      boxShadow: {
        'card':      '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
        'focus':     '0 0 0 3px rgb(29 78 216 / 0.15)',
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
