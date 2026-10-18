import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { buildCloudinaryUrl } from '../api/client.js';
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

/** Thumbnail of a camera photo (plain crop, no AI steps). */
function thumbUrl(imagePublicId, w, h) {
  const url = buildCloudinaryUrl(imagePublicId);
  return url ? url.replace('/upload/', `/upload/c_fill,w_${w},h_${h},g_auto/q_auto/`) : null;
}

/** "12:47:41 AM" for photos seconds apart, "12:47 AM" otherwise. */
function photoTime(t, withSeconds) {
  return new Date(t).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', ...(withSeconds && { second: '2-digit' }), hour12: true });
}

function seenList(objects, max = 5) {
  const list = (objects || []).slice(0, max);
  if (!list.length) return '';
  const more = (objects || []).length - list.length;
  return list.join(', ') + (more > 0 ? ` and ${more} more` : '');
}

export function MomentCard({ m, onToggleSave }) {
  // Every photo in the stretch, newest first, each with what the camera noticed in it.
  const photos = (m.entries || [])
    .filter((e) => e.imagePublicId)
    .map((e) => ({ id: e.id, image: e.imagePublicId, t: new Date(e.timestamp).getTime(), objects: (e.payload?.objects_of_note || []).map((o) => String(o).toLowerCase()) }))
    .reverse();
  const [pick, setPick] = useState(0);
  const [broken, setBroken] = useState(false);
  const current = photos[Math.min(pick, photos.length - 1)];
  const url = current && buildCloudinaryUrl(current.image);
  const mins = Math.round((m.end - m.start) / 60000);
  const short = m.end - m.start < 5 * 60000;
  const seen = seenList(m.objects);

  let line = '';
  if (m.kind === 'place') line = "From the phone's location.";
  else if (m.quiet) line = seen ? `No one in front of the camera. It saw ${seen}.` : 'No one in front of the camera.';
  else line = [m.detail && `${m.detail}.`, seen && `Also in view: ${seen}.`].filter(Boolean).join(' ');

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-3">
        <span className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-full', avatar(m))}>
          <Icon name={icon(m)} size={17} />
        </span>
        <h3 className="min-w-0 flex-1 font-serif text-[22px] leading-tight">{m.title}</h3>
        {onToggleSave && photos.length > 0 ? (
          <KeepButton m={m} onToggleSave={onToggleSave} />
        ) : (
          <GoButton to="/log" label="Open in the log" />
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-ink-3">
        <span>
          <Icon name="calendar" size={13} className="mr-1 inline -mt-0.5" />
          <b className="font-medium text-ink">
            {formatTime(m.start)}
            {formatTime(m.end) !== formatTime(m.start) ? ` – ${formatTime(m.end)}` : ''}
          </b>
          {mins >= 2 && <span> · {mins} min</span>}
        </span>
        {m.count > 1 && <span>{m.count} {m.kind === 'place' ? 'location readings' : 'photos'}</span>}
      </div>
      {line && <p className="mt-3 text-[13px] leading-relaxed text-ink-2">{line}</p>}

      {url && !broken && (
        <figure className="mt-4">
          <img key={current.image} src={url} alt="" onError={() => setBroken(true)} className="h-auto max-w-full rounded-2xl" />
          {photos.length > 1 && (
            <figcaption className="mt-2 text-[12px] text-ink-3">
              <b className="font-medium text-ink">{photoTime(current.t, short)}</b>
              {current.objects.length > 0 ? ` · ${seenList(current.objects, 4)}` : ' · nothing particular noticed'}
            </figcaption>
          )}
        </figure>
      )}

      {photos.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]" aria-label="All photos in this moment">
          {photos.map((ph, i) => (
            <button
              key={ph.id}
              type="button"
              onClick={() => { setPick(i); setBroken(false); }}
              title={`${photoTime(ph.t, short)}${ph.objects.length ? ` — ${ph.objects.join(', ')}` : ''}`}
              className={cx('shrink-0 overflow-hidden rounded-xl transition', i === pick ? 'ring-2 ring-ink ring-offset-2 ring-offset-paper' : 'opacity-75 hover:opacity-100')}
            >
              <img src={thumbUrl(ph.image, 112, 84)} alt="" className="block h-[63px] w-[84px] object-cover" loading="lazy" />
              <span className="block bg-white/80 px-1 py-0.5 text-center text-[10px] tabular-nums text-ink-2">{photoTime(ph.t, short).replace(/\s?[AP]M$/i, '')}</span>
            </button>
          ))}
        </div>
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

