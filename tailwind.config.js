/** @type {import('tailwindcss').Config} */

// "Clear" — a utility look: one sans family, neutral greys, and colour that only ever
// means status (green = fine, amber = worth a glance, red = act now). Brand colour is
// deliberately absent from the chrome so a red badge is the loudest thing on any page.
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // "Linen": every neutral shares one warm tint, so page, cards and text read as one family.
        ground: '#ECE7DF',
        surface: '#FBF9F6',
        subtle: '#F3EFE9',
        line: { DEFAULT: '#E5DFD5', strong: '#D4CCBF' },
        ink: {
          DEFAULT: '#2A2622',
          2: '#4F4943',
          3: '#7D756B',
          4: '#A9A094',
        },
        accent: { DEFAULT: '#3D6B63', soft: '#E4EEEA' },
        // Status, toned down from traffic-light primaries to earthy ones so red still leads but doesn't shout.
        ok: { DEFAULT: '#4D7C5A', soft: '#EAF1EA', line: '#C8DCCB' },
        watch: { DEFAULT: '#AD772A', soft: '#F7EEDD', line: '#E9D3AC' },
        act: { DEFAULT: '#B4503C', soft: '#F6E5DF', line: '#E9C3B6' },
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
        pop: '0 12px 32px -12px rgba(62,46,30,0.28), 0 2px 6px rgba(62,46,30,0.06)',
        card: '0 1px 2px rgba(62,46,30,0.04), 0 12px 32px -16px rgba(62,46,30,0.16)',
        lift: '0 2px 4px rgba(62,46,30,0.05), 0 20px 44px -20px rgba(62,46,30,0.26)',
      },
    },
  },
  plugins: [],
};
