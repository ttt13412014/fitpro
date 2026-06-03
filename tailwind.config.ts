/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#0a0a0f',
          card: '#111118',
          elevated: '#16161f',
          hover: '#1c1c28',
        },
        accent: {
          primary: '#6c63ff',
          secondary: '#ff6584',
          green: '#22d3a5',
          yellow: '#f59e0b',
          red: '#ef4444',
          blue: '#3b82f6',
        },
        text: {
          primary: '#f0f0ff',
          secondary: '#8888aa',
          muted: '#55556a',
        },
        border: {
          subtle: '#1e1e2e',
          default: '#2a2a3e',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'card': '0 0 0 1px rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.4)',
        'glow-purple': '0 0 40px rgba(108,99,255,0.15)',
        'glow-green': '0 0 40px rgba(34,211,165,0.15)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
};
