import type { Config } from 'tailwindcss';

/**
 * Token del sistema "Glass Over Iron" (DESIGN.md).
 * FERRO = superfici opache del contenuto. VETRO = livello dei controlli.
 * I SEGNALI portano significato: blu azione · menta fatto · ambra sforzo ·
 * rosa record · viola AI · ciano corpo.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        void: '#06080D',
        background: '#0C1017',
        card: '#151A24',
        surface: '#151A24',
        'card-hover': '#1E2531',
        raised: '#1E2531',
        border: '#2A3241',
        line: '#2A3241',
        accent: { DEFAULT: '#0A84FF', hover: '#3D9BFF', deep: '#0060DF' },
        mint: '#32D74B',
        amber: '#FF9F0A',
        rose: '#FF375F',
        violet: '#BF5AF2',
        cyan: '#64D2FF',
        success: '#32D74B',
        warning: '#FF9F0A',
        danger: '#FF375F',
        'text-primary': '#FFFFFF',
        'text-secondary': '#9BA6B8',
        'text-tertiary': '#6B7688',
      },
      borderRadius: {
        xs: '10px',
        sm: '14px',
        md: '18px',
        lg: '26px',
        xl: '26px',
        '2xl': '34px',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Text',
          'SF Pro Display',
          'system-ui',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        rounded: ['SF Pro Rounded', 'ui-rounded', '-apple-system', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0,0,0,0.45)',
        sheet: '0 -12px 48px rgba(0,0,0,0.60)',
      },
      keyframes: {
        rise: {
          from: { opacity: '0', transform: 'translateY(12px) scale(.99)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        rise: 'rise .55s cubic-bezier(.22,1,.36,1) both',
      },
    },
  },
  plugins: [],
};

export default config;
