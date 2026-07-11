import type { Config } from 'tailwindcss';

/**
 * Token del design system "Executive Control Room" (docs/08-DESIGN-SYSTEM.md).
 * Palette corporate all-blue: navy sfondi, Electric Blue accenti, avio grafici,
 * celeste bordi. Rosso/ambra SOLO come stati funzionali.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#070D1A',
        card: '#0D1626',
        'card-hover': '#12203A',
        border: '#22314F',
        accent: { DEFAULT: '#38BDF8', hover: '#0EA5E9', deep: '#1D4ED8' },
        avio: '#2E6BE0',
        celeste: '#9CD9FF',
        success: '#38BDF8',
        warning: '#F59E0B',
        danger: '#EF4444',
        'text-primary': '#FFFFFF',
        'text-secondary': '#8FA3C0',
      },
      borderRadius: {
        xl: '0.875rem',
      },
      keyframes: {
        rise: {
          from: { opacity: '0', transform: 'translateY(14px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        rise: 'rise .5s cubic-bezier(.2,.8,.3,1) both',
      },
    },
  },
  plugins: [],
};

export default config;
