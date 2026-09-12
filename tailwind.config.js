/** @type {import('tailwindcss').Config} */

// ---------------------------------------------------------------------------
// "Assist Sage" — the shared design language across the family dashboard and
// the companion app. Every colour below is either lifted directly from the
// SellerApp Android theme (app/src/main/res/values/colors.xml) or derived from
// it; the hex values marked [SellerApp] are byte-for-byte the same so the two
// products read as one family.
// ---------------------------------------------------------------------------

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Grounds
        paper: '#F9F8F4',        // [SellerApp] bg — warm paper, the page ground
        surface: {
          DEFAULT: '#FFFFFF',    // raised card
          sunken: '#F0EFEA',     // [SellerApp] bgslight — inset / secondary panel
          fill: '#DCE2D8',       // [SellerApp] bgdark — input + chip + bottom-bar fill
        },
        line: {
          DEFAULT: '#E5E3DB',    // warm hairline
          sage: '#C6D2C4',       // sage hairline, for emphasised cards
        },

        // Brand
        sage: {
          50: '#F4F7F3',
          100: '#E9EFE7',
          200: '#D3E0D1',
          300: '#AFC4AE',
          400: '#8AA88B',
          DEFAULT: '#698B6A',    // [SellerApp] darkgreen — the brand accent
          600: '#5B7A5C',
          700: '#4E6B50',        // text-on-fill safe: 5.8:1 against white
          800: '#3C5340',
          900: '#2C3E2F',
        },

        // Text
        ink: {
          DEFAULT: '#2A312A',    // primary text
          soft: '#495048',       // [SellerApp] secondary text / headings
          faint: '#6B746A',      // meta, timestamps, captions (4.6:1 on paper)
        },

        // Status — deliberately kept inside the warm family. A caregiver
        // dashboard that screams in pure red all day trains people to ignore it.
        ok: { fg: '#3B6D11', bg: '#E8F5E9', line: '#C6E2C8' }, // [SellerApp] chip colours
        attend: { fg: '#8A4B12', bg: '#F6E9DF', line: '#E7CDB4' }, // clay
        alert: { fg: '#96392C', bg: '#F7E3DF', line: '#EFC7BF' },  // brick, never #F00
        info: { fg: '#3F5F6B', bg: '#E4EDEF', line: '#C9DCE0' },   // slate-teal
      },

      fontFamily: {
        // Fraunces: warm old-style variable serif, used only for display sizes.
        display: ['Fraunces', 'Iowan Old Style', 'Georgia', 'serif'],
        // Atkinson Hyperlegible: Braille Institute's legibility-first face.
        sans: ['"Atkinson Hyperlegible"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Cascadia Mono', 'Consolas', 'monospace'],
      },

      borderRadius: {
        field: '999px',   // [SellerApp] 40dp pill text fields
        pill: '999px',
        card: '20px',     // [SellerApp] 16dp card, nudged up for screen
        panel: '28px',    // [SellerApp] 30dp bottom-sheet corners
      },

      boxShadow: {
        card: '0 1px 2px rgba(42,49,42,0.04), 0 8px 24px -14px rgba(42,49,42,0.14)',
        lift: '0 2px 6px rgba(42,49,42,0.06), 0 18px 36px -20px rgba(42,49,42,0.22)',
        focus: '0 0 0 4px rgba(105,139,106,0.22)',
        bar: '0 -8px 24px -16px rgba(42,49,42,0.30)',
      },

      keyframes: {
        'rise-in': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        breathe: {
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        'rise-in': 'rise-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) both',
        breathe: 'breathe 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
