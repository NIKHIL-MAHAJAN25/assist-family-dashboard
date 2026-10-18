import React from 'react';

// Each part of the day gets its own sky, so the card itself says what time it was:
// a peach dawn, a clear afternoon, a pink-lilac dusk, and a navy night with stars and a crescent moon.
// (Brought back from the Linen design, 419c033, onto the Atria part-of-day tiles.)
export const SKIES = {
  Morning: {
    bg: 'linear-gradient(180deg, #FFE3C7 0%, #FFF1E2 55%, #FFF9F2 100%)',
    sun: { x: '86%', y: 168, color: '#FDBA74', glow: 'rgba(251,146,60,0.38)' },
  },
  Afternoon: {
    bg: 'linear-gradient(180deg, #CFE6FF 0%, #E6F2FF 55%, #F7FBFF 100%)',
    sun: { x: '62%', y: 4, color: '#FDE68A', glow: 'rgba(250,204,21,0.42)' },
  },
  Evening: {
    bg: 'linear-gradient(180deg, #F6C9D8 0%, #EBDCF6 55%, #F8F4FC 100%)',
    sun: { x: '93%', y: 172, color: '#FB923C', glow: 'rgba(244,114,182,0.42)' },
  },
  Night: {
    bg: 'linear-gradient(180deg, #0B1530 0%, #14234A 60%, #1B2C55 100%)',
    dark: true,
  },
};

const STARS = [
  [8, 22], [17, 64], [26, 34], [35, 88], [44, 16], [56, 54], [63, 30], [72, 80], [80, 58], [88, 24], [94, 70], [50, 104],
];

/** Decorative sky behind a card's content. The card must be `relative overflow-hidden`. */
export function SkyBackdrop({ part }) {
  const sky = SKIES[part];
  if (!sky) return null;
  if (sky.dark) {
    return (
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {STARS.map(([x, y], i) => (
          <span
            key={i}
            className="sky-star absolute rounded-full bg-white"
            style={{
              left: `${x}%`,
              top: y,
              width: i % 3 === 0 ? 2.5 : 1.5,
              height: i % 3 === 0 ? 2.5 : 1.5,
              animationDuration: `${2.5 + (i % 5) * 0.6}s`,
              animationDelay: `${i * 0.3}s`,
            }}
          />
        ))}
        {/* crescent: a pale disc with a night-coloured disc offset over it */}
        <span className="absolute bottom-5 right-6 h-9 w-9 rounded-full bg-[#F4EFD8] shadow-[0_0_34px_10px_rgba(244,239,216,0.20)]">
          <span className="absolute -right-1.5 -top-1.5 h-8 w-8 rounded-full bg-[#0D1834]" />
        </span>
      </div>
    );
  }
  const { sun } = sky;
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <span
        className="absolute h-[150px] w-[150px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ left: sun.x, top: sun.y, background: `radial-gradient(circle, ${sun.glow} 0%, transparent 68%)` }}
      />
      <span
        className="absolute h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ left: sun.x, top: sun.y, background: sun.color, boxShadow: `0 0 24px 6px ${sun.glow}` }}
      />
    </div>
  );
}
