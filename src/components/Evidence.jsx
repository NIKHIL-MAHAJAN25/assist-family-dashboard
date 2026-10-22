import React, { useEffect, useRef, useState } from 'react';
import { apiClient, buildCloudinaryUrl } from '../api/client.js';
import { formatTime } from '../utils/datetime.js';
import { sentence } from '../lib/story.js';
import { useZones } from '../lib/hooks.js';
import ZoneMap from './ZoneMap.jsx';
import { Icon, cx } from '../ui';

// Batch E: show where an answer came from and how an alert was decided.
//   ReplyText      the Assistant's reply with each [E#] turned into a tappable chip
//   EvidencePanel  the photo / place behind a chip
//   DecisionTrail  "Claude described → rules said → Drex rated → final", for any alert
//   useSpeech      plays text in the natural voice (POST /api/patients/:id/speech)

const BY = { claude: 'Claude', codex: 'Codex', gemini: 'Gemini' };
const KIND_ICON = { camera: 'camera', place: 'pin', sighting: 'shield' };

/** The same shape the backend's evidenceService builds, from a raw log entry (for the Log page). */
export function decisionFromEntry(e) {
  if (!e) return null;
  const p = e.payload || {};
  const d = p.decision || null;
  return {
    described_by: p.analysed_by || null,
    confidence: typeof p.confidence === 'number' ? p.confidence : null,
    rules: d?.rules ? { alert: Boolean(d.rules.notify) } : { alert: Boolean(e.requiresAttention) },
    drex: d?.drex ? (d.drex.error ? { error: 'unavailable' } : { alert: Boolean(d.drex.notify), probability: d.drex.notify_p ?? null, urgency: d.drex.urgency ?? null }) : null,
    mode: d?.mode || null,
    decided_by: d?.decided_by || 'rules',
    final: e.requiresAttention ? 'alert' : 'logged',
    kind: e.entryType,
  };
}

const URGENCY = { routine: 'routine', check_in: 'worth a check-in', act_now: 'act now' };

function Step({ n, title, children, tone }) {
  return (
    <li className="relative flex gap-3 pb-3 last:pb-0">
      <span className={cx('z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold', tone === 'act' ? 'bg-[#F4A48C]' : tone === 'ok' ? 'bg-[#D2F27C]' : 'bg-white ring-1 ring-black/10')}>{n}</span>
      <div className="min-w-0 pt-0.5">
        <p className="text-[12.5px] font-semibold text-ink">{title}</p>
        {children && <p className="text-[12px] leading-snug text-ink-2">{children}</p>}
      </div>
    </li>
  );
}

/** How the system decided whether to tell the family: one line per step, in the order it happened. */
export function DecisionTrail({ decision, compact }) {
  if (!decision) return null;
  const steps = [];
  if (decision.kind === 'geofence' || (!decision.described_by && decision.kind !== 'frame')) {
    steps.push(['Phone location', 'The phone reported it was outside every safe place.']);
  } else {
    const who = BY[decision.described_by] || 'The AI';
    const sure = decision.confidence != null ? ` It was ${Math.round(decision.confidence * 100)}% sure.` : '';
    steps.push([`${who} described the photo`, `It wrote what it saw using the fixed list of activities.${sure}`]);
  }
  steps.push([`Safety rules: ${decision.rules?.alert ? 'alert' : 'no alert'}`, decision.rules?.alert ? 'This matches a rule that always tells the family.' : 'Nothing here matches an alert rule.', decision.rules?.alert ? 'act' : 'ok']);
  if (decision.drex) {
    if (decision.drex.error) steps.push(['Drex: no answer', 'The second opinion was unavailable, so the rules decided.']);
    else {
      const pct = decision.drex.probability != null ? ` (${Math.round(decision.drex.probability * 100)}% likely)` : '';
      const urg = decision.drex.urgency ? `, ${URGENCY[decision.drex.urgency] || decision.drex.urgency}` : '';
      steps.push([`Drex: ${decision.drex.alert ? 'alert' : 'no alert'}${pct}`, `A second opinion from a separate decision model${urg}.`, decision.drex.alert ? 'act' : 'ok']);
    }
  } else {
    steps.push(['Drex: no second opinion', 'None was recorded for this one, so the rules decided on their own.']);
  }
  const final = decision.final === 'alert';
  const by = decision.decided_by === 'drex' ? 'Drex (with the rules as a safety net)' : 'the safety rules';
  steps.push([final ? 'Family alerted' : 'Logged quietly', `Decided by ${by}${decision.mode === 'shadow' ? '; Drex is in comparison mode and can’t change the outcome yet' : ''}.`, final ? 'act' : 'ok']);

  return (
    <div className={cx('rounded-[16px] bg-white/80 ring-1 ring-black/[0.05]', compact ? 'p-3' : 'p-4')}>
      <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3">
        <Icon name="brain" size={13} /> How it decided
      </p>
      <ol className="relative before:absolute before:bottom-3 before:left-[11px] before:top-3 before:w-px before:bg-black/10">
        {steps.map(([t, body, tone], i) => (
          <Step key={i} n={i + 1} title={t} tone={tone}>{body}</Step>
        ))}
      </ol>
    </div>
  );
}

function timeOf(item) {
  const a = formatTime(new Date(item.from));
  const b = formatTime(new Date(item.to));
  return a === b ? a : `${a} – ${b}`;
}

/** The photo or place behind one citation. */
export function EvidencePanel({ item, onClose }) {
  const [broken, setBroken] = useState(false);
  const zones = useZones();
  const url = item.image_public_id && buildCloudinaryUrl(item.image_public_id);
  return (
    <div className="rounded-[18px] bg-[#F7F6F1] p-3 ring-1 ring-black/[0.05]">
      <div className="mb-2 flex items-center gap-2 text-[12px]">
        <span className={cx('grid h-6 w-6 place-items-center rounded-full', item.flagged ? 'bg-[#F4A48C]' : 'bg-[#EAF4FF]')}>
          <Icon name={KIND_ICON[item.kind] || 'dot'} size={12} />
        </span>
        <b className="font-semibold">{timeOf(item)}</b>
        <span className="min-w-0 flex-1 truncate text-ink-2">{sentence(item.label)}{item.count > 1 ? ` · ${item.count} photos` : ''}</span>
        {onClose && (
          <button type="button" onClick={onClose} className="grid h-6 w-6 place-items-center rounded-full text-ink-3 hover:bg-black/[0.06]" aria-label="Close">
            <Icon name="x" size={12} />
          </button>
        )}
      </div>
      <div className={cx('grid gap-3', item.decision && 'md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]')}>
        {url && !broken ? (
          <img src={url} alt={item.label} onError={() => setBroken(true)} className="h-auto max-h-[260px] w-full rounded-[14px] object-cover" />
        ) : item.lat != null && item.lng != null ? (
          <div className="overflow-hidden rounded-[14px]">
            <ZoneMap zones={zones.data || []} current={{ lat: item.lat, lng: item.lng }} currentLabel={item.flagged ? 'Here' : 'Back'} interactive={false} style={{ height: 230 }} />
          </div>
        ) : (
          <p className="rounded-[14px] bg-white/70 px-3 py-6 text-center text-[12px] text-ink-3">
            {item.kind === 'camera' ? 'No photo kept for this moment.' : item.kind === 'place' ? 'From the phone’s location.' : 'From the emergency tag page.'}
          </p>
        )}
        {item.decision && <DecisionTrail decision={item.decision} compact />}
      </div>
    </div>
  );
}

/** The reply with "[E4]" markers replaced by small chips (time + icon) that open the evidence. */
export function ReplyText({ text, evidence, openId, onOpen }) {
  const byId = new Map((evidence || []).map((it) => [it.id, it]));
  const parts = String(text || '').split(/(\s?\[E\d{1,3}\])/g);
  return (
    <p className="max-w-[68ch] text-[15px] leading-relaxed text-ink">
      {parts.map((part, i) => {
        const m = part.match(/\[(E\d{1,3})\]/);
        if (!m) return <React.Fragment key={i}>{part}</React.Fragment>;
        const it = byId.get(m[1]);
        if (!it) return null;
        const on = openId === it.id;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onOpen(on ? null : it.id)}
            title={`${timeOf(it)} · ${it.label}`}
            className={cx(
              'mx-0.5 inline-flex translate-y-[-1px] items-center gap-1 rounded-full px-2 py-0.5 align-middle text-[11px] font-semibold transition',
              on ? 'bg-ink text-white' : it.flagged ? 'bg-[#FBE1D9] text-ink hover:bg-[#F4A48C]' : 'bg-[#EAF4FF] text-ink hover:bg-[#D2E7FB]'
            )}
          >
            <Icon name={KIND_ICON[it.kind] || 'dot'} size={11} />
            {formatTime(new Date(it.from))}
          </button>
        );
      })}
    </p>
  );
}

/** Plays text in the server's natural voice. One clip at a time; `playing` is the key being read. */
export function useSpeech(patientId) {
  const audio = useRef(null);
  const [playing, setPlaying] = useState(null);
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => () => audio.current?.pause(), []);

  function stop() {
    audio.current?.pause();
    audio.current = null;
    setPlaying(null);
  }

  async function play(key, text) {
    if (playing === key) return stop();
    stop();
    setError(null);
    setLoading(key);
    try {
      const { data } = await apiClient.post(`/api/patients/${patientId}/speech`, { text }, { timeout: 40000 });
      const a = new Audio(data.url);
      audio.current = a;
      a.onended = () => setPlaying((k) => (k === key ? null : k));
      await a.play();
      setPlaying(key);
    } catch (e) {
      setError(e?.response?.data?.error || 'Couldn’t play the voice just now.');
    } finally {
      setLoading(null);
    }
  }

  return { play, stop, playing, loading, error };
}
