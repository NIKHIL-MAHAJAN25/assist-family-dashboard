import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, buildCloudinaryUrl } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { formatTime } from '../utils/datetime.js';
import { Icon, cx } from '../ui';
import { TEST_CASES } from '../lib/demoCases.js';

// Demo kit: everything needed to show every feature on stage without depending on the real world —
// staged camera scenes replayed through the real AI, a simulated walk away from home, answering as
// Margaret, a one-click reset, and the test-case checklist. Server must run with DEMO_MODE=1.

const SCENE_LABEL = {
  eating: ['Eating', 'Sit at a table with a plate or cup'],
  tv: ['Watching TV', 'Sit facing a screen'],
  resting: ['Resting', 'Sit back in a chair, eyes half closed'],
  leaving: ['Leaving the house', 'Shoes or jacket on, near the door'],
  fall: ['A fall', 'Lie on the floor in view of the camera'],
  empty: ['Empty room', 'Nobody in view'],
};
const CHECKS = (pid) => `demo-checks:${pid}`;

function Section({ n, title, hint, children, right }) {
  return (
    <section className="rounded-[22px] bg-paper p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">Step {n}</p>
          <h2 className="font-serif text-[24px] leading-tight">{title}</h2>
          {hint && <p className="mt-1 max-w-[70ch] text-[13px] text-ink-3">{hint}</p>}
        </div>
        {right}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function Demo() {
  const { user } = useAuth();
  const pid = user?.patient_id;
  const first = (user?.patient_name || '').split(' ')[0] || 'Margaret';
  const qc = useQueryClient();
  const [msg, setMsg] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [custom, setCustom] = useState('');
  const [checks, setChecks] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(CHECKS(pid)) || '{}');
    } catch {
      return {};
    }
  });
  const st = useQuery({ queryKey: ['demo', pid], queryFn: async () => (await apiClient.get(`/api/demo/${pid}`)).data, enabled: Boolean(pid), refetchInterval: 5000 });
  const d = st.data;

  async function call(path, body, done) {
    setMsg(null);
    try {
      const { data } = await apiClient.post(`/api/demo/${pid}${path}`, body || {});
      setMsg({ ok: true, text: done(data) });
      qc.invalidateQueries();
    } catch (e) {
      setMsg({ ok: false, text: e?.response?.data?.error || 'That didn’t work.' });
    }
  }
  function toggle(id) {
    const next = { ...checks, [id]: !checks[id] };
    setChecks(next);
    try {
      localStorage.setItem(CHECKS(pid), JSON.stringify(next));
    } catch {
      /* fine */
    }
  }

  if (d && !d.demo_mode) {
    return (
      <div className="mx-auto max-w-[640px] py-16 text-center">
        <h1 className="font-serif text-[34px]">Demo kit is off</h1>
        <p className="mt-2 text-ink-3">The server runs with DEMO_MODE=0. Set DEMO_MODE=1 in deploy/.env and run the update to turn it on.</p>
      </div>
    );
  }

  const done = TEST_CASES.filter((t) => checks[t.id]).length;

  return (
    <div className="mx-auto grid max-w-[1180px] gap-3">
      <header className="flex flex-wrap items-end justify-between gap-4 rounded-[22px] bg-paper p-5 sm:p-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">For the auction</p>
          <h1 className="font-serif text-[38px] leading-none">Demo kit</h1>
          <p className="mt-2 max-w-[70ch] text-[14px] text-ink-2">
            Stage-proof versions of every feature. Simulated readings go through the same code as real ones, so the
            Assistant, alerts, journal, Drex and the phone react exactly as they would for real.
          </p>
        </div>
        {confirmReset ? (
          <div className="flex items-center gap-2 rounded-full bg-white p-1 pl-4 text-[13px]">
            Clear today’s demo activity?
            <button type="button" onClick={() => { setConfirmReset(false); call('/reset', {}, (r) => `Reset: ${r.commands} phone actions, ${r.broadcasts} family notes, ${r.simulated_readings} simulated readings cleared.`); }} className="rounded-full bg-ink px-3 py-1.5 font-semibold text-white">Reset</button>
            <button type="button" onClick={() => setConfirmReset(false)} className="rounded-full px-3 py-1.5 text-ink-3">Cancel</button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmReset(true)} className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-black">
            <Icon name="refresh" size={15} /> Reset demo
          </button>
        )}
      </header>

      {msg && (
        <p className={cx('rounded-[16px] px-4 py-3 text-[14px]', msg.ok ? 'bg-[#EEF8C4]' : 'bg-[#F8D9CF] text-[#9A3B24]')}>{msg.text}</p>
      )}

      <Section n={1} title="Camera scenes" hint={`Stage each scene once in front of the home camera, then press “Save latest photo”. On stage, “Play” sends that photo through the real AI helpers as if the camera had just taken it.`}>
        {d?.latest_photo ? (
          <div className="mb-4 flex items-center gap-3 rounded-[16px] bg-white/70 p-3">
            <img src={buildCloudinaryUrl(d.latest_photo.image_public_id)} alt="" className="h-14 w-20 rounded-[10px] object-cover" />
            <p className="text-[13px] text-ink-2">Latest camera photo · {formatTime(new Date(d.latest_photo.at))} · <b>{d.latest_photo.activity || '—'}</b></p>
          </div>
        ) : (
          <p className="mb-4 text-[13px] text-ink-3">No camera photo yet. Turn the camera on to stage scenes.</p>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(d?.scene_names || Object.keys(SCENE_LABEL)).map((name) => {
            const sc = d?.scenes?.[name];
            return (
              <div key={name} className="overflow-hidden rounded-[18px] bg-white/80 ring-1 ring-black/[0.04]">
                <div className="aspect-[4/3] bg-[#EFEEEA]">
                  {sc ? <img src={buildCloudinaryUrl(sc.image_public_id)} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-[12px] text-ink-3">Not saved yet</div>}
                </div>
                <div className="p-3">
                  <p className="text-[14px] font-semibold">{SCENE_LABEL[name]?.[0]}</p>
                  <p className="text-[12px] text-ink-3">{SCENE_LABEL[name]?.[1]}</p>
                  <div className="mt-3 flex gap-2">
                    <button type="button" disabled={!sc} onClick={() => call(`/scenes/${name}/play`, {}, () => `“${SCENE_LABEL[name][0]}” sent to the helpers — it appears on Today and in the Log in a few seconds.`)} className="rounded-full bg-ink px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-30">Play</button>
                    <button type="button" disabled={!d?.latest_photo} onClick={() => call(`/scenes/${name}/save`, {}, () => `Saved the latest photo as “${SCENE_LABEL[name][0]}”.`)} className="rounded-full bg-black/[0.05] px-3 py-1.5 text-[12px] font-semibold disabled:opacity-30">Save latest photo</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section
        n={2}
        title={`${first} wanders off`}
        hint="Walks a simulated phone out of Home (about 75 m every 4 s) and back. Alerts, Drex, the journal, the map trail and Guide home all react as for real. The real phone’s location is paused while it runs."
        right={d?.walk_active && <span className="rounded-full bg-[#F8D9CF] px-3 py-1 text-[12px] font-semibold text-[#9A3B24]">Walk in progress</span>}
      >
        {!d?.has_home && <p className="mb-3 text-[13px] text-act">Set up a Home place first on the Places page.</p>}
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={!d?.has_home} onClick={() => call('/walk', { direction: 'away' }, (r) => `Walking away from ${r.home}: ${r.steps} steps, one every ${r.every_s} s. Watch the bell.`)} className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-30"><Icon name="walk" size={15} /> Walk away from home</button>
          <button type="button" disabled={!d?.has_home} onClick={() => call('/walk', { direction: 'home' }, () => 'Walking back home.')} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[13px] font-semibold ring-1 ring-black/10 disabled:opacity-30"><Icon name="home" size={15} /> Walk back home</button>
          <button type="button" onClick={() => call('/walk', { direction: 'stop' }, () => 'Walk stopped; the real phone’s location is back.')} className="rounded-full px-3 py-2 text-[13px] text-ink-3 hover:text-ink">Stop</button>
        </div>
      </Section>

      <Section n={3} title={`Answer as ${first}`} hint="For when her phone isn’t at hand: answers the latest question sent with “Ask her”.">
        {d?.pending_ask ? (
          <div className="rounded-[16px] bg-white/80 p-4">
            <p className="font-serif text-[20px]">{d.pending_ask.question}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(d.pending_ask.quick || ['Yes', 'No']).map((q) => (
                <button key={q} type="button" onClick={() => call('/answer', { reply: q }, (r) => `Answered “${r.reply}”.`)} className="rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-white">{q}</button>
              ))}
              <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="or her own words…" className="min-w-[200px] flex-1 rounded-full border border-black/10 bg-white px-4 py-2 text-[13px] outline-none" />
              <button type="button" disabled={!custom.trim()} onClick={() => { call('/answer', { reply: custom }, (r) => `Answered “${r.reply}”.`); setCustom(''); }} className="rounded-full bg-black/[0.06] px-4 py-2 text-[13px] font-semibold disabled:opacity-30">Answer</button>
            </div>
          </div>
        ) : (
          <p className="text-[13px] text-ink-3">No question is waiting. Send one from the Assistant (“Ask her”).</p>
        )}
      </Section>

      <Section n={4} title="Test cases" hint="Tick each one off in rehearsal. Every case says what to do and what the judges should see." right={<span className="rounded-full bg-white px-3 py-1 text-[12px] font-semibold">{done} / {TEST_CASES.length} rehearsed</span>}>
        <ol className="grid gap-2">
          {TEST_CASES.map((t, i) => (
            <li key={t.id} className={cx('rounded-[16px] p-4 ring-1 ring-black/[0.04]', checks[t.id] ? 'bg-[#F3FBDF]' : 'bg-white/80')}>
              <div className="flex items-start gap-3">
                <button type="button" onClick={() => toggle(t.id)} aria-pressed={!!checks[t.id]} aria-label="Mark rehearsed" className={cx('mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ring-1', checks[t.id] ? 'bg-[#D9F26B] ring-transparent' : 'bg-white ring-black/15')}>
                  {checks[t.id] && <Icon name="check" size={13} />}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-[15px] font-semibold">{i + 1}. {t.title}</p>
                    <span className="text-[11px] text-ink-3">{t.needs}</span>
                  </div>
                  <ol className="mt-2 list-decimal space-y-1 pl-5 text-[13px] text-ink-2">
                    {t.steps.map((s) => <li key={s}>{s}</li>)}
                  </ol>
                  <p className="mt-2 text-[13px]"><span className="font-semibold">Judges see: </span>{t.expect}</p>
                  {t.link && <Link to={t.link} className="mt-2 inline-block text-[12px] font-semibold text-ink-2 underline decoration-black/20 underline-offset-4">Open {t.linkLabel || 'it'} →</Link>}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </Section>
    </div>
  );
}
