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
        // Cream page, paper cards: flat, so the colour blocks below carry the page.
        ground: '#F7F1E5',
        surface: '#FBF7EE',
        subtle: '#EFE7D8',
        paper: '#EFE7D8',
        line: { DEFAULT: '#E4DACA', strong: '#D3C8B5' },
        ink: {
          DEFAULT: '#1E1C1A',
          2: '#4A4540',
          3: '#7E766B',
          4: '#A89F92',
        },
        // Colour blocks: one per kind of thing, never for status (status keeps ok/watch/act).
        butter: { DEFAULT: '#FFD951', deep: '#F5C518' },
        rose: { DEFAULT: '#F2B8CF', deep: '#E79AB9' },
        sage: { DEFAULT: '#A3B57A', deep: '#8A9E62' },
        sky: { DEFAULT: '#B3C6EA', deep: '#93ABDB' },
        coral: { DEFAULT: '#F29A82', deep: '#E57A5E' },
        accent: { DEFAULT: '#1E1C1A', soft: '#F2B8CF' },
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
