import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient, buildCloudinaryUrl } from '../api/client.js';
import { sentence } from '../lib/story.js';
import { formatDayLabel, formatTime } from '../utils/datetime.js';
import RouteReplay from './RouteReplay.jsx';
import { Icon, cx } from '../ui';

// Batch D cards in the Assistant: where an object was last seen (#20), a walk replay (#11), the family
// photo album on the phone (#21), and the doctor's report (#22).

const when = (d) => {
  const label = formatDayLabel(d);
  return `${label === 'Today' ? 'Today' : label} at ${formatTime(new Date(d))}`;
};

/** " — while Margaret was reading the paper" for an -ing activity, otherwise " — reading paper". */
function doing(activity, firstName) {
  const a = sentence(activity).replace(/\.$/, '');
  const lower = a.charAt(0).toLowerCase() + a.slice(1);
  return /^[a-z]+ing/.test(lower) ? ` — while ${firstName} was ${lower}` : ` — ${lower}`;
}

export function FindCard({ patientId, object, firstName }) {
  const q = useQuery({
    queryKey: ['find', patientId, object],
    queryFn: async () => (await apiClient.get(`/api/patients/${patientId}/find`, { params: { q: object } })).data,
    staleTime: 30000,
  });
  const [broken, setBroken] = useState(false);
  if (q.isLoading) return <p className="ai-shimmer text-[14px]">Looking through the camera’s moments…</p>;
  const s = q.data?.sightings || [];
  if (!s.length) {
    return (
      <div className="rounded-[18px] bg-white p-4 ring-1 ring-black/[0.05]">
        <p className="text-[14px] font-semibold">No sign of “{object}” on the camera in the last week.</p>
        <p className="mt-1 text-[12px] text-ink-3">The camera only sees one room, and only notes things it can make out clearly.</p>
      </div>
    );
  }
  const best = s.find((x) => x.image_public_id) || s[0];
  return (
    <figure className="overflow-hidden rounded-[18px] bg-white ring-1 ring-black/[0.05]">
      {best.image_public_id && !broken && (
        <img src={buildCloudinaryUrl(best.image_public_id)} alt={`Where the ${object} were last seen`} onError={() => setBroken(true)} className="h-auto max-w-full" />
      )}
      <figcaption className="px-4 py-3">
        <p className="text-[12px] font-semibold text-ink-3">Last seen</p>
        <p className="font-serif text-[22px] leading-tight">{when(s[0].at)}</p>
        <p className="mt-1 text-[14px] text-ink-2">
          {s[0].matched}{s[0].activity ? doing(s[0].activity, firstName) : ''}
        </p>
        {s[0].objects?.length > 1 && (
          <p className="mt-2 flex flex-wrap gap-1">
            {s[0].objects.map((o) => <span key={o} className={cx('rounded-full px-2 py-0.5 text-[11px]', o === s[0].matched ? 'bg-[#D9F26B] font-semibold' : 'bg-black/[0.05]')}>{o}</span>)}
          </p>
        )}
        {s.length > 1 && (
          <p className="mt-3 text-[12px] text-ink-3">Also seen: {s.slice(1).map((x) => when(x.at)).join(' · ')}</p>
        )}
        {best !== s[0] && <p className="mt-1 text-[11px] text-ink-3">Photo from {when(best.at)} — the latest sighting has no photo.</p>}
      </figcaption>
    </figure>
  );
}

export function ReplayCard({ firstName, window }) {
  return (
    <div className="h-[380px]">
      <RouteReplay firstName={firstName} initialWindow={window} height={260} compact autoPlay />
    </div>
  );
}

export function AlbumCard({ patientId, firstName }) {
  const album = useQuery({ queryKey: ['memories', patientId], queryFn: async () => (await apiClient.get(`/api/patients/${patientId}/memories`)).data });
  const [state, setState] = useState({ phase: 'draft' });
  const cmd = useQuery({
    queryKey: ['commands', patientId],
    queryFn: async () => (await apiClient.get(`/api/patients/${patientId}/commands`)).data,
    enabled: Boolean(state.id),
    refetchInterval: 3000,
  });
  const live = state.id ? cmd.data?.find((c) => c.id === state.id) : null;
  const list = album.data || [];

  async function send() {
    setState({ phase: 'sending' });
    try {
      const { data } = await apiClient.post(`/api/patients/${patientId}/album`, {});
      setState({ phase: 'sent', id: data.id });
    } catch (e) {
      setState({ phase: 'error', error: e?.response?.data?.error || 'Could not send it.' });
    }
  }

  if (state.phase === 'dismissed') return <p className="text-[12px] text-ink-3">Not sent.</p>;
  const step = !live ? 1 : live.status === 'done' ? 3 : live.status === 'delivered' ? 2 : 1;
  return (
    <div className="overflow-hidden rounded-[18px] bg-[linear-gradient(135deg,#FFF1E6_0%,#F3ECFB_100%)] p-4 ring-1 ring-black/[0.04]">
      <div className="flex items-center gap-2 text-[12px] font-semibold text-ink-2">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-white"><Icon name="image" size={15} /></span>
        Family photo album for {firstName}
      </div>
      {album.isLoading ? (
        <p className="mt-3 text-[13px] text-ink-3">Opening the album…</p>
      ) : !list.length ? (
        <p className="mt-3 text-[14px]">
          The album is empty. <Link to="/memory#album" className="font-semibold underline decoration-black/20 underline-offset-4">Add a few photos with a line each</Link> — then {firstName}’s phone can show them, one by one, read aloud.
        </p>
      ) : (
        <>
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
            {list.slice(0, 8).map((m) => (
              <img key={m.id} src={m.image_url} alt={m.caption} title={m.caption} className="h-20 w-20 shrink-0 rounded-[12px] object-cover" />
            ))}
          </div>
          <p className="mt-2 text-[13px] text-ink-2">{list.length} photo{list.length > 1 ? 's' : ''}, each shown full screen and read aloud in a warm voice. {firstName} can go back, forward or stop.</p>
          {state.phase === 'sent' ? (
            <div className="mt-3 flex items-center gap-1.5 text-[12px] font-semibold">
              {['Sent', 'On the phone', 'Shown'].map((label, i) => (
                <span key={label} className={cx('rounded-full px-2.5 py-1', i < step ? 'bg-[#D9F26B]' : 'bg-white/70 text-ink-3')}>{label}</span>
              ))}
            </div>
          ) : (
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={send} disabled={state.phase === 'sending'} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-white hover:bg-black disabled:opacity-40">
                <Icon name="play" size={13} /> {state.phase === 'sending' ? 'Sending…' : `Show on ${firstName}’s phone`}
              </button>
              <button type="button" onClick={() => setState({ phase: 'dismissed' })} className="rounded-full px-3 py-2 text-[13px] text-ink-3 hover:text-ink">Not now</button>
            </div>
          )}
          {state.error && <p className="mt-2 text-[12px] text-act">{state.error}</p>}
        </>
      )}
    </div>
  );
}

export function ReportCard({ patientId, days, firstName }) {
  const q = useQuery({
    queryKey: ['report', patientId, days],
    queryFn: async () => (await apiClient.get(`/api/patients/${patientId}/report`, { params: { days } })).data,
    staleTime: 60000,
  });
  const t = q.data?.totals;
  const weeks = days === 7 ? '1 week' : days === 28 ? '4 weeks' : '2 weeks';
  return (
    <div className="rounded-[18px] bg-white p-4 ring-1 ring-black/[0.05]">
      <div className="flex items-center gap-2 text-[12px] font-semibold text-ink-2">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-[#EAF4FF]"><Icon name="report" size={15} /></span>
        Doctor’s report · last {weeks}
      </div>
      {q.isLoading ? (
        <p className="ai-shimmer mt-3 text-[14px]">Counting the days…</p>
      ) : t ? (
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          {[
            [t.meals_per_day, 'meals seen / day'],
            [t.quiz_pct != null ? `${t.quiz_pct}%` : '—', 'quiz right'],
            [t.left_safe_places, 'times left safe places'],
          ].map(([v, l]) => (
            <div key={l} className="rounded-[12px] bg-black/[0.03] px-2 py-2">
              <p className="font-serif text-[22px] leading-none">{v}</p>
              <p className="mt-1 text-[11px] text-ink-3">{l}</p>
            </div>
          ))}
        </div>
      ) : null}
      <Link to={`/report?days=${days}`} className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-white hover:bg-black">
        <Icon name="report" size={14} /> Open {firstName}’s report
      </Link>
    </div>
  );
}
