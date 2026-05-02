/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        hud: {
          bg: '#070b14',
          panel: '#0d1321',
          card: '#111827',
          border: '#1e2d40',
          'border-lit': '#2a4060',

          safe: '#10b981',
          'safe-dim': '#064e3b',
          warn: '#f59e0b',
          'warn-dim': '#451a03',
          danger: '#ef4444',
          'danger-dim': '#450a0a',
          accent: '#3b82f6',
          'accent-dim': '#1e3a5f',

          primary: '#f0f4f8',
          secondary: '#8ba3be',
          dim: '#4a6080',

          'alt-floor': '#7f1d1d',
          'alt-window': '#14532d',
          'alt-ceiling': '#7f1d1d',
        }
      },

      fontFamily: {
        hud: ["'Rajdhani'", "'Orbitron'", "monospace"],
        mono: ["'JetBrains Mono'", "'Fira Code'", "monospace"],
        label: ["'Barlow Condensed'", "'Rajdhani'", "sans-serif"],
      },

      animation: {
        'blink-danger': 'blink-danger 0.6s ease-in-out infinite',
        'blink-warn': 'blink-warn 1.2s ease-in-out infinite',
        'pulse-safe': 'pulse-safe 2s ease-in-out infinite',
        'glow-safe': 'glow-safe 2.5s ease-in-out infinite',
        'flash-update': 'flash-update 0.15s ease-out',
      },

      keyframes: {
        'blink-danger': {
          '0%, 100%': { backgroundColor: '#450a0a', borderColor: '#7f1d1d' },
          '50%': { backgroundColor: '#991b1b', borderColor: '#ef4444' },
        },
        'blink-warn': {
          '0%, 100%': { backgroundColor: '#451a03', borderColor: '#78350f' },
          '50%': { backgroundColor: '#92400e', borderColor: '#f59e0b' },
        },
        'pulse-safe': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        'glow-safe': {
          '0%, 100%': { boxShadow: '0 0 4px rgba(16, 185, 129, 0.3)' },
          '50%': { boxShadow: '0 0 16px rgba(16, 185, 129, 0.7)' },
        },
        'flash-update': {
          '0%': { backgroundColor: 'rgba(59, 130, 246, 0.3)' },
          '100%': { backgroundColor: 'transparent' },
        },
      },

      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '88': '22rem',
        '112': '28rem',
      },
    },
  },
  plugins: [],
}

