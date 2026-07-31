/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6366f1',
          dark: '#4f46e5',
          light: '#818cf8',
        },
        secondary: '#a855f7',
        danger: {
          DEFAULT: '#ef4444',
          glow: 'rgba(239, 68, 68, 0.5)',
        },
        success: {
          DEFAULT: '#10b981',
          glow: 'rgba(16, 185, 129, 0.4)',
        },
        warning: {
          DEFAULT: '#f59e0b',
          glow: 'rgba(245, 158, 11, 0.4)',
        },
        background: {
          primary: '#0B0B0F',
          secondary: '#121218',
          tertiary: '#1A1A24',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Poppins', 'system-ui', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
        '2xl': '40px',
      },
      boxShadow: {
        'glass': '0 4px 30px rgba(0, 0, 0, 0.1)',
        'glow-primary': '0 0 20px rgba(99, 102, 241, 0.4)',
        'glow-danger': '0 0 20px rgba(239, 68, 68, 0.5)',
        'neon': '0 0 10px rgba(99, 102, 241, 0.5), 0 0 20px rgba(99, 102, 241, 0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 3s infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
}
