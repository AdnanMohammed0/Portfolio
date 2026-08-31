/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#000000',
          900: '#0a0a0a',
          850: '#0d0d0d',
          teal: '#324444',
        },
        accent: {
          blue: '#1e3a8a',
        },
      },
      fontFamily: {
        sans: ["'Futura Md BT Medium'", 'system-ui', '-apple-system', 'sans-serif'],
      },
      maxWidth: {
        shell: '1400px',
      },
      letterSpacing: {
        tightest: '-0.045em',
      },
      keyframes: {
        rise: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fade: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        drift: {
          '0%,100%': { transform: 'translate3d(0,0,0)' },
          '50%': { transform: 'translate3d(0,-10px,0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        rise: 'rise 0.9s cubic-bezier(0.16,1,0.3,1) forwards',
        fade: 'fade 1.2s ease forwards',
        drift: 'drift 9s ease-in-out infinite',
        shimmer: 'shimmer 1.6s linear infinite',
      },
    },
  },
  plugins: [],
};
