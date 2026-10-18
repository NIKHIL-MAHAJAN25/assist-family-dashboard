import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client.js';
import { Icon, cx } from '../ui';

// Batch C cards in the Assistant: "tell me when…" watch rules (#8) and the bedtime story (#18).
// Like every action, nothing happens until the family member confirms.

const ACTIVITIES = [
  ['eating', 'eating'],
  ['taking_medication', 'taking medication'],
  ['up', 'up and about'],
  ['sleeping', 'sleeping'],
  ['resting', 'resting'],
  ['watching_tv', 'watching TV'],
  ['getting_ready_to_leave', 'getting ready to go out'],
];

export const RULE_TEMPLATES = [
  { kind: 'arrives_home', text: (n) => `Tell me when ${n} gets home`, fields: [] },
  { kind: 'leaves_home', text: (n) => `Tell me if ${n} leaves the house after…`, fields: ['after'] },
  { kind: 'not_seen_by', text: (n) => `Tell me if ${n} hasn’t been seen … by …`, fields: ['activity', 'by'] },
  { kind: 'still_at', text: (n) => `Tell me if ${n} is still … at …`, fields: ['activity', 'at'] },
  { kind: 'seen', text: (n) => `Tell me when ${n} is seen …`, fields: ['activity'] },
  { kind: 'quiet_for', text: (n) => `Tell me if there’s no sign of ${n} for…`, fields: ['minutes'] },
];

const field = 'rounded-[12px] border border-black/10 bg-white px-3 py-2 text-[14px] outline-none focus:border-ink';

export function RuleCard({ patientId, firstName, initial }) {
  const [kind, setKind] = useState(initial?.kind || 'arrives_home');
  const [params, setParams] = useState(initial?.params || { activity: 'eating', by: '14:00', at: '09:00', after: '20:00', minutes: 120 });
  const [repeat, setRepeat] = useState(initial?.repeat || 'once');
  const [state, setState] = useState({ phase: 'draft' });
  const qc = useQueryClient();
  const tpl = RULE_TEMPLATES.find((t) => t.kind === kind);

  async function save() {
    setState({ phase: 'saving' });
    const p = Object.fromEntries(tpl.fields.map((f) => [f, f === 'minutes' ? Number(params.minutes) : params[f]]));
    try {
      const { data } = await apiClient.post(`/api/patients/${patientId}/rules`, { kind, params: p, repeat });
      setState({ phase: 'saved', label: data.label });
      qc.invalidateQueries({ queryKey: ['rules'] });
    } catch (e) {
      setState({ phase: 'error', error: e?.response?.data?.error || 'Could not save.' });
    }
  }

  if (state.phase === 'dismissed') return <p className="text-[12px] text-ink-3">Not set.</p>;
  return (
    <div className="overflow-hidden rounded-[18px] bg-[linear-gradient(135deg,#FFF3D6_0%,#EAF4FF_100%)] p-4 ring-1 ring-black/[0.04]">
      <div className="flex items-center gap-2 text-[12px] font-semibold text-ink-2">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-white"><Icon name="bell" size={15} /></span>
        Watch for this
      </div>
      {state.phase === 'saved' ? (
        <>
          <p className="mt-3 font-serif text-[20px] leading-snug">{state.label}</p>
          <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-[#D9F26B] px-2.5 py-1 text-[12px] font-semibold"><Icon name="check" size={12} /> Watching — you’ll get a notification</span>
        </>
      ) : (
        <>
          <select value={kind} onChange={(e) => setKind(e.target.value)} className={cx(field, 'mt-3 w-full')}>
            {RULE_TEMPLATES.map((t) => <option key={t.kind} value={t.kind}>{t.text(firstName)}</option>)}
          </select>
          <div className="mt-2 flex flex-wrap gap-2">
            {tpl.fields.includes('activity') && (
              <select value={params.activity} onChange={(e) => setParams({ ...params, activity: e.target.value })} className={field}>
                {ACTIVITIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            )}
            {tpl.fields.includes('by') && <input type="time" value={params.by} onChange={(e) => setParams({ ...params, by: e.target.value })} className={field} aria-label="By" />}
            {tpl.fields.includes('at') && <input type="time" value={params.at} onChange={(e) => setParams({ ...params, at: e.target.value })} className={field} aria-label="At" />}
            {tpl.fields.includes('after') && <input type="time" value={params.after} onChange={(e) => setParams({ ...params, after: e.target.value })} className={field} aria-label="After" />}
            {tpl.fields.includes('minutes') && (
              <select value={params.minutes} onChange={(e) => setParams({ ...params, minutes: e.target.value })} className={field}>
                {[30, 60, 90, 120, 180, 240].map((m) => <option key={m} value={m}>{m < 60 ? `${m} minutes` : `${m / 60} hour${m > 60 ? 's' : ''}`}</option>)}
              </select>
            )}
            <select value={repeat} onChange={(e) => setRepeat(e.target.value)} className={field}>
              <option value="once">Once</option>
              <option value="daily">Every day</option>
            </select>
          </div>
          <p className="mt-2 text-[12px] text-ink-3">Checked every 30 seconds against her location and the camera. You get a notification when it happens.</p>
          {state.error && <p className="mt-2 text-[12px] text-act">{state.error}</p>}
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={save} disabled={state.phase === 'saving'} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-white hover:bg-black disabled:opacity-40">
              <Icon name="bell" size={14} /> {state.phase === 'saving' ? 'Saving…' : 'Start watching'}
            </button>
            <button type="button" onClick={() => setState({ phase: 'dismissed' })} className="rounded-full px-3 py-2 text-[13px] text-ink-3 hover:text-ink">Not now</button>
          </div>
        </>
      )}
    </div>
  );
}

export function StoryCard({ patientId, firstName }) {
  const [state, setState] = useState({ phase: 'draft' });
  async function send() {
    setState({ phase: 'writing' });
    try {
      const { data } = await apiClient.post(`/api/patients/${patientId}/story`, {}, { timeout: 100000 });
      setState({ phase: 'sent', ...data });
    } catch (e) {
      setState({ phase: 'error', error: e?.response?.data?.error || 'Could not write it just now.' });
    }
  }
  if (state.phase === 'dismissed') return <p className="text-[12px] text-ink-3">Not sent.</p>;
  return (
    <div className="overflow-hidden rounded-[18px] bg-[linear-gradient(160deg,#1B2C55_0%,#3B3F78_100%)] p-4 text-white">
      <div className="flex items-center gap-2 text-[12px] font-semibold text-white/80">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-white/15"><Icon name="heart" size={15} /></span>
        Bedtime story for {firstName}
      </div>
      {state.phase === 'sent' ? (
        <>
          <p className="mt-3 font-serif text-[18px] leading-relaxed">{state.text}</p>
          <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-[#D9F26B] px-2.5 py-1 text-[12px] font-semibold text-ink"><Icon name="check" size={12} /> Sent — her phone reads it aloud</span>
        </>
      ) : (
        <>
          <p className="mt-3 text-[14px] text-white/80">A helper writes a few warm sentences about {firstName}’s own day (“Today you…”) from the journal — only the good parts — and her phone reads it to her.</p>
          {state.phase === 'writing' && <p className="mt-3 text-[13px] text-white/70">Writing her story…</p>}
          {state.error && <p className="mt-2 text-[12px] text-[#F8B4A2]">{state.error}</p>}
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={send} disabled={state.phase === 'writing'} className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-ink disabled:opacity-50">
              <Icon name="heart" size={14} /> {state.phase === 'writing' ? 'Writing…' : 'Write and send'}
            </button>
            <button type="button" onClick={() => setState({ phase: 'dismissed' })} className="rounded-full px-3 py-2 text-[13px] text-white/60 hover:text-white">Not now</button>
          </div>
        </>
      )}
    </div>
  );
}
