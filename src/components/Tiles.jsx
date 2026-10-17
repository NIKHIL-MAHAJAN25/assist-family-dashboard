import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { buildCloudinaryUrl, enhancedPhoto } from '../api/client.js';
import { formatTime } from '../utils/datetime.js';
import { Icon, cx } from '../ui';

// Shared pieces of the "Atria" look: off-white tiles, serif titles, black pill and arrow
// buttons, status chips, and the one blue→lime gradient. Used by Today and Log.

export const GRADIENT = 'bg-[linear-gradient(135deg,#9FD0F7_0%,#C6EBA0_55%,#D9F57E_100%)]';

export function Tile({ children, className, tour }) {
  return (
    <section data-tour={tour} className={cx('min-w-0 rounded-[20px] bg-paper p-5 sm:p-6', className)}>
      {children}
    </section>
  );
}

export function TileHead({ title, children }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-serif text-[24px] leading-tight">{title}</h2>
      {children}
    </div>
  );
}

export function Pill({ to, children, dark }) {
  const cls = cx(
    'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] transition',
    dark ? 'bg-ink text-white hover:bg-black' : 'border border-black/10 bg-white/85 hover:bg-white'
  );
  return to ? <Link to={to} className={cls}>{children}</Link> : <span className={cls}>{children}</span>;
}

export function GoButton({ to, label }) {
  return (
    <Link to={to} aria-label={label} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-white transition hover:scale-105">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M7 17L17 7M9 7h8v8" /></svg>
    </Link>
  );
}

// Lime = fine, sand = worth a look, coral = act. The chip is the only place status colour appears.
export const CHIP = { ok: 'bg-[#D2F27C]', watch: 'bg-[#F6D38B]', act: 'bg-[#F4A48C]', none: 'bg-[#E4E4DE]' };

const KIND_LABEL = { meal: 'Meal', rest: 'Resting', leisure: 'Leisure', out: 'Out', unseen: 'Not visible', other: 'Quiet' };
const AVATAR = { meal: 'bg-[#CDE6FA]', rest: 'bg-[#E6F7B4]', leisure: 'bg-[#A9D4F5]', out: 'bg-[#D2F27C]', unseen: 'bg-[#F4A48C]', other: 'bg-[#E4E4DE]' };
const ICON = { meal: 'clock', rest: 'home', leisure: 'heart', out: 'walk', unseen: 'warning', other: 'dot' };

export const label = (m) => (m.kind === 'place' ? 'Place' : m.kind === 'vitals' ? 'Watch' : KIND_LABEL[m.category] || 'Moment');
export const avatar = (m) => (m.flagged ? 'bg-[#F4A48C]' : m.kind === 'place' ? (m.inside ? 'bg-[#D2F27C]' : 'bg-[#F4A48C]') : AVATAR[m.category] || 'bg-[#E4E4DE]');
export const icon = (m) => (m.kind === 'place' ? 'pin' : m.kind === 'vitals' ? 'heartPulse' : ICON[m.category] || 'dot');

export function MomentCard({ m, onToggleSave }) {
  const [stage, setStage] = useState(0);
  const url = m.image && buildCloudinaryUrl(m.image);
  const photo = enhancedPhoto(m.image, 720, 320);
  const mins = Math.round((m.end - m.start) / 60000);
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-3">
        <span className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-full', avatar(m))}>
          <Icon name={icon(m)} size={17} />
        </span>
        <h3 className="min-w-0 flex-1 font-serif text-[22px] leading-tight">{m.title}</h3>
        {onToggleSave && m.entries?.some((e) => e.imagePublicId) ? (
          <KeepButton m={m} onToggleSave={onToggleSave} />
        ) : (
          <GoButton to="/log" label="Open in the log" />
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-ink-3">
        <span>
          <Icon name="calendar" size={13} className="mr-1 inline -mt-0.5" />
          <b className="font-medium text-ink">{formatTime(m.start)}{mins >= 2 ? ` – ${formatTime(m.end)}` : ''}</b>
        </span>
        <span>Kind <b className="font-medium text-ink">{label(m)}</b></span>
        {m.confidence != null && (
          <span>Camera <b className="font-medium text-ink">{m.confidence >= 0.8 ? 'sure' : m.confidence >= 0.6 ? 'fairly sure' : 'unsure'}</b></span>
        )}
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-ink-2">
        {m.detail || (m.kind === 'place' ? 'Location reading from the watch or phone.' : 'No further detail.')}
        {m.objects?.length > 0 && ` Seen: ${m.objects.slice(0, 4).join(', ')}.`}
      </p>
      {url && stage < 2 && (
        <img
          key={m.image}
          src={stage === 0 ? photo.src : photo.fallback}
          alt=""
          onError={() => setStage((x) => x + 1)}
          className="mt-4 h-[180px] w-full rounded-2xl object-cover"
        />
      )}
    </div>
  );
}


/** Photos expire after 7 days; this keeps (or releases) every photo in the moment. */
function KeepButton({ m, onToggleSave }) {
  const saved = m.entries.some((e) => e.isSaved);
  return (
    <button
      type="button"
      onClick={() => onToggleSave(m, !saved)}
      title={saved ? 'Photo kept — click to let it expire' : 'Keep this photo past 7 days'}
      className={cx('inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12px] font-medium transition', saved ? 'bg-[#D2F27C]' : 'bg-ink text-white')}
    >
      <Icon name="bookmark" size={13} fill={saved ? 'currentColor' : 'none'} /> {saved ? 'Kept' : 'Keep photo'}
    </button>
  );
}

