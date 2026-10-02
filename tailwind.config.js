/** @type {import('tailwindcss').Config} */

// "Clear" — a utility look: one sans family, neutral greys, and colour that only ever
// means status (green = fine, amber = worth a glance, red = act now). Brand colour is
// deliberately absent from the chrome so a red badge is the loudest thing on any page.
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ground: '#F5F4F1',
        surface: '#FFFFFF',
        subtle: '#F8F9FA',
        line: { DEFAULT: '#E4E6EA', strong: '#D1D5DB' },
        ink: {
          DEFAULT: '#111418',
          2: '#3D434C',
          3: '#6B7280',
          4: '#9CA3AF',
        },
        accent: { DEFAULT: '#1D4ED8', soft: '#EEF2FF' },
        ok: { DEFAULT: '#15803D', soft: '#ECFDF3', line: '#BBF7D0' },
        watch: { DEFAULT: '#B45309', soft: '#FFF7ED', line: '#FED7AA' },
        act: { DEFAULT: '#C81E1E', soft: '#FEF2F2', line: '#FECACA' },
      },
      fontFamily: {
        sans: ['"Public Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      fontSize: {
        // [size, line-height]; display sizes get tighter leading
        xs: ['12px', '16px'],
        sm: ['13px', '18px'],
        base: ['14px', '20px'],
        md: ['15px', '22px'],
        lg: ['17px', '24px'],
        xl: ['20px', '28px'],
        '2xl': ['26px', '32px'],
        '3xl': ['34px', '40px'],
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '8px',
        md: '10px',
        lg: '14px',
      },
      boxShadow: {
        pop: '0 12px 32px -12px rgba(17,20,24,0.25), 0 2px 6px rgba(17,20,24,0.06)',
        card: '0 1px 2px rgba(17,20,24,0.04), 0 10px 30px -14px rgba(17,20,24,0.14)',
        lift: '0 2px 4px rgba(17,20,24,0.05), 0 18px 40px -18px rgba(17,20,24,0.22)',
      },
    },
  },
  plugins: [],
};
