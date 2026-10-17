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
        // Pale blue page, off-white cards, near-black ink; serif for headings and big numbers.
        ground: '#DCE8F4',
        surface: '#FFFFFF',
        subtle: '#F7F7F4',
        paper: '#F7F7F4',
        line: { DEFAULT: '#E4E4DE', strong: '#D2D2CB' },
        ink: {
          DEFAULT: '#151515',
          2: '#4B4B48',
          3: '#85857F',
          4: '#AEAEA8',
        },
        // Colour blocks: one per kind of thing, never for status (status keeps ok/watch/act).
        // Names are historical: butter = lime, rose = sky blue, sage = fresh green, sky = pale blue.
        butter: { DEFAULT: '#D2F27C', deep: '#BCE04F' },
        rose: { DEFAULT: '#A9D4F5', deep: '#7FBDEB' },
        sage: { DEFAULT: '#BDE58F', deep: '#9ACF63' },
        sky: { DEFAULT: '#CDE6FA', deep: '#A9D4F5' },
        coral: { DEFAULT: '#F4A48C', deep: '#E8846A' },
        accent: { DEFAULT: '#1E1C1A', soft: '#F2B8CF' },
        // Status, toned down from traffic-light primaries to earthy ones so red still leads but doesn't shout.
        ok: { DEFAULT: '#4D7C5A', soft: '#EAF1EA', line: '#C8DCCB' },
        watch: { DEFAULT: '#AD772A', soft: '#F7EEDD', line: '#E9D3AC' },
        act: { DEFAULT: '#B4503C', soft: '#F6E5DF', line: '#E9C3B6' },
      },
      fontFamily: {
        sans: ['"Public Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        serif: ['"DM Serif Display"', 'Georgia', 'serif'],
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
