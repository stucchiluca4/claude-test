import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Design system dark mode (vedi docs/07-UI-UX-WIREFRAMES.md)
        background: '#0A0E17',
        card: '#111827',
        'card-hover': '#161F31',
        border: '#1F2937',
        accent: { DEFAULT: '#2563EB', hover: '#1D4ED8' },
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
        'text-primary': '#F9FAFB',
        'text-secondary': '#9CA3AF',
      },
      borderRadius: {
        xl: '0.875rem',
      },
    },
  },
  plugins: [],
};

export default config;
