import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, buildCloudinaryUrl } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useEntries, useNow, useStatus, useZones } from '../lib/hooks.js';
import { dayBounds, sentence } from '../lib/story.js';
import ZoneMap from '../components/ZoneMap.jsx';
import { formatTime } from '../utils/datetime.js';
import { Icon, cx } from '../ui';

// The family Assistant: talk to an agent that knows the person's day, and let it propose actions.
// Anything that reaches the person (speaking on their phone) is shown as a card the family member
// confirms — the agent never sends on its own. Backend: POST /api/patients/:id/assistant, /commands.

const BY = { claude: 'Claude', codex: 'Codex', gemini: 'Gemini' };
const SOURCE_WORDS = { location: 'location', camera: 'camera', journal: 'journal', alerts: 'alerts', messages: 'messages' };
const STEPS = ['Reading today’s journal', 'Checking where she is', 'Looking at the latest photo', 'Thinking it through'];
const STORE = (pid) => `assistant:${pid}`;
const agoText = (m) => (m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} day${m >= 2880 ? 's' : ''} ago`);

function load(pid) {
  try {
    return JSON.parse(localStorage.getItem(STORE(pid)) || '[]');
  } catch {
    return [];
  }
}
function persist(pid, msgs) {
  try {
    localStorage.setItem(STORE(pid), JSON.stringify(msgs.slice(-40)));
  } catch {
    /* private window: the chat still works for this visit */
  }
}

/* ---------------------------------------------------------------- speech-to-text (browser) */

function useDictation(onText) {
  const [listening, setListening] = useState(false);
  const rec = useRef(null);
  const Supported = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
  function toggle() {
    if (!Supported) return;
    if (listening) {
      rec.current?.stop();
      return;
    }
    const r = new Supported();
    r.lang = navigator.language || 'en-IN';
    r.interimResults = true;
    r.continuous = false;
    r.onresult = (e) => onText(Array.from(e.results).map((x) => x[0].transcript).join(' '));
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rec.current = r;
    setListening(true);
    r.start();
  }
  return { supported: Boolean(Supported), listening, toggle };
}

/* ---------------------------------------------------------------- action cards */

function SpeakCard({ patientId, firstName, initialText, onSent }) {
  const [text, setText] = useState(initialText);
  const [editing, setEditing] = useState(false);
  const [state, setState] = useState({ phase: 'draft' }); // draft | sending | sent | dismissed | error
  const qc = useQueryClient();

  const status = useQuery({
    queryKey: ['command', state.id],
    queryFn: async () => (await apiClient.get(`/api/patients/${patientId}/commands`)).data.find((c) => c.id === state.id),
    enabled: state.phase === 'sent' && Boolean(state.id),
    refetchInterval: (q) => (['done', 'failed', 'expired'].includes(q.state.data?.status) ? false : 2000),
  });

  async function send() {
    setState({ phase: 'sending' });
    try {
      const { data } = await apiClient.post(`/api/patients/${patientId}/commands`, { type: 'speak', text });
      setState({ phase: 'sent', id: data.id });
      qc.invalidateQueries({ queryKey: ['commands'] });
      onSent?.();
    } catch (e) {
      setState({ phase: 'error', error: e?.response?.data?.error || 'Could not send.' });
    }
  }

  if (state.phase === 'dismissed') {
    return <p className="text-[12px] text-ink-3">Not sent.</p>;
  }

  const s = status.data?.status || 'pending';
  const steps = [
    ['Sent', true],
    ['On her phone', ['delivered', 'done'].includes(s)],
    ['Spoken aloud', s === 'done'],
  ];

  return (
    <div className="overflow-hidden rounded-[18px] bg-[linear-gradient(135deg,#E9F3FF_0%,#F1ECFB_100%)] p-4 ring-1 ring-black/[0.04]">
      <div className="flex items-center gap-2 text-[12px] font-semibold text-ink-2">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-white"><Icon name="speaker" size={15} /></span>
        Say on {firstName}’s phone
      </div>
      {editing && state.phase === 'draft' ? (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 280))}
          rows={3}
          autoFocus
          className="mt-3 w-full resize-none rounded-[14px] border border-black/10 bg-white p-3 text-[15px] leading-relaxed outline-none focus:border-ink"
        />
      ) : (
        <p className="mt-3 font-serif text-[20px] leading-snug">“{text}”</p>
      )}
      {state.phase === 'draft' || state.phase === 'sending' || state.phase === 'error' ? (
        <>
          <p className="mt-2 text-[12px] text-ink-3">It will be read aloud and stay on {firstName}’s home screen. Nothing is sent until you press send.</p>
          {state.error && <p className="mt-2 text-[12px] text-act">{state.error}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={send} disabled={!text.trim() || state.phase === 'sending'} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-black disabled:opacity-50">
              <Icon name="speaker" size={14} /> {state.phase === 'sending' ? 'Sending…' : 'Send to her phone'}
            </button>
            <button type="button" onClick={() => setEditing((x) => !x)} className="rounded-full bg-white/80 px-4 py-2 text-[13px] font-semibold hover:bg-white">
              {editing ? 'Done editing' : 'Edit'}
            </button>
            <button type="button" onClick={() => setState({ phase: 'dismissed' })} className="rounded-full px-3 py-2 text-[13px] text-ink-3 hover:text-ink">
              Not now
            </button>
          </div>
        </>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {s === 'expired' || s === 'failed' ? (
            <span className="rounded-full bg-[#F8D9CF] px-3 py-1 text-[12px] font-semibold text-[#9A3B24]">
              {s === 'expired' ? 'Her phone didn’t pick it up in 10 minutes' : 'Her phone couldn’t say it'}
            </span>
          ) : (
            steps.map(([label, ok], i) => (
              <span key={label} className="flex items-center gap-2">
                <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold', ok ? 'bg-[#D9F26B] text-ink' : 'bg-white/70 text-ink-3')}>
                  {ok && <Icon name="check" size={12} />} {label}
                </span>
                {i < steps.length - 1 && <span className="h-px w-3 bg-black/15" />}
              </span>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function MapCard({ status, zones, firstName }) {
  const loc = status?.location;
  const current = loc?.lat != null ? { lat: loc.lat, lng: loc.lng } : null;
  const where = loc?.inside_safe_zone === false ? 'Outside the safe places' : loc?.zone_name ? `At ${loc.zone_name}` : 'Location unknown';
  return (
    <div className="overflow-hidden rounded-[18px] bg-white ring-1 ring-black/[0.05]">
      <ZoneMap zones={zones} current={current} currentLabel={firstName} interactive={false} style={{ height: 220 }} />
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-[13px]">
        <span className={cx('font-semibold', loc?.inside_safe_zone === false && 'text-act')}>{where}</span>
        <span className="text-ink-3">{status?.minutes_since_update != null ? `updated ${agoText(status.minutes_since_update)}` : ''}</span>
      </div>
    </div>
  );
}

function PhotoCard({ latest }) {
  const [broken, setBroken] = useState(false);
  if (!latest?.imagePublicId || broken) {
    return <p className="rounded-[14px] bg-white/70 px-4 py-3 text-[13px] text-ink-3">No camera photo yet today.</p>;
  }
  return (
    <figure className="overflow-hidden rounded-[18px] bg-white ring-1 ring-black/[0.05]">
      <img src={buildCloudinaryUrl(latest.imagePublicId)} alt={latest.payload?.activity || 'Latest photo'} onError={() => setBroken(true)} className="h-auto max-w-full" />
      <figcaption className="flex justify-between gap-3 px-4 py-3 text-[13px]">
        <span className="font-semibold">{sentence(latest.payload?.activity) || 'Latest photo'}</span>
        <span className="text-ink-3">{formatTime(new Date(latest.timestamp))}</span>
      </figcaption>
    </figure>
  );
}

function SummaryAction({ patientId, range }) {
  const q = useQuery({
    queryKey: ['summary', patientId, range],
    queryFn: async () => (await apiClient.get(`/api/patients/${patientId}/summary`, { params: { range }, timeout: 70000 })).data,
    staleTime: 60000,
  });
  return (
    <div className="rounded-[18px] bg-[linear-gradient(135deg,#F3FBDF_0%,#EAF4FF_100%)] p-4 ring-1 ring-black/[0.04]">
      <p className="text-[12px] font-semibold text-ink-2">{range === 'week' ? 'This week' : range === 'morning' ? 'This morning' : 'Today'}, in a few words</p>
      {q.isLoading ? <p className="ai-shimmer mt-2 text-[14px]">Reading the journal…</p> : q.isError ? <p className="mt-2 text-[13px] text-act">Couldn’t write it just now.</p> : <p className="mt-2 text-[15px] leading-relaxed">{q.data.summary}</p>}
    </div>
  );
}

function ActionCard({ a, ctx }) {
  if (a.type === 'speak') return <SpeakCard patientId={ctx.patientId} firstName={ctx.firstName} initialText={a.text} />;
  if (a.type === 'map') return <MapCard status={ctx.status} zones={ctx.zones} firstName={ctx.firstName} />;
  if (a.type === 'photo') return <PhotoCard latest={ctx.latestPhoto} />;
  if (a.type === 'summary') return <SummaryAction patientId={ctx.patientId} range={a.range} />;
  return null;
}

/* ---------------------------------------------------------------- chat pieces */

function Thinking({ since }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((x) => x + 1), 900);
    return () => clearInterval(id);
  }, []);
  const step = STEPS[Math.min(STEPS.length - 1, Math.floor((Date.now() - since) / 2200))];
  return (
    <div className="flex items-center gap-3">
      <span className="ai-orb thinking h-8 w-8 shrink-0" />
      <span className="ai-shimmer text-[14px] font-medium">{step}…</span>
    </div>
  );
}

function Message({ m, ctx }) {
  if (m.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-[20px] rounded-br-[6px] bg-ink px-4 py-2.5 text-[15px] leading-relaxed text-white">{m.text}</div>
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      <span className="ai-orb mt-0.5 h-8 w-8 shrink-0" />
      <div className="min-w-0 flex-1 space-y-3">
        {m.error ? (
          <p className="text-[15px] text-act">{m.text}</p>
        ) : (
          m.text && <p className="max-w-[68ch] text-[15px] leading-relaxed text-ink">{m.text}</p>
        )}
        {m.actions?.map((a, i) => (
          <div key={i} className="max-w-[560px]">
            <ActionCard a={a} ctx={ctx} />
          </div>
        ))}
        {m.provider && (
          <p className="text-[11px] text-ink-3">
            {BY[m.provider] || m.provider}
            {m.sources?.length ? ` · read ${m.sources.map((s) => SOURCE_WORDS[s] || s).join(', ')}` : ''}
            {m.ms ? ` · ${(m.ms / 1000).toFixed(1)} s` : ''}
          </p>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- the live rail */

function LiveRail({ ctx, commands, onAsk }) {
  const { status, firstName } = ctx;
  const loc = status?.location;
  const outside = loc?.inside_safe_zone === false;
  const STATUS = { pending: 'Waiting for her phone', delivered: 'On her phone', done: 'Spoken aloud', failed: 'Couldn’t say it', expired: 'Not picked up' };
  return (
    <aside className="hidden min-w-0 flex-col gap-3 xl:flex xl:h-[calc(100vh-150px)] xl:overflow-y-auto">
      <section className="rounded-[20px] bg-paper p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">Right now</p>
        <div className="mt-3 flex items-center gap-3">
          <span className={cx('grid h-11 w-11 place-items-center rounded-full font-serif text-[18px]', outside ? 'bg-[#F4A48C]' : 'bg-[#D9F26B]')}>{firstName?.[0]}</span>
          <div className="min-w-0">
            <p className="font-serif text-[20px] leading-tight">{outside ? 'Outside the safe places' : loc?.zone_name ? `At ${loc.zone_name}` : 'Location unknown'}</p>
            <p className="truncate text-[13px] text-ink-3">{status?.current_activity ? sentence(status.current_activity) : 'No camera activity yet'}</p>
          </div>
        </div>
        <div className="mt-4 overflow-hidden rounded-[14px]">
          <ZoneMap zones={ctx.zones} current={loc?.lat != null ? { lat: loc.lat, lng: loc.lng } : null} currentLabel={firstName} interactive={false} style={{ height: 150 }} />
        </div>
      </section>

      <section className="rounded-[20px] bg-paper p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">Sent to {firstName}’s phone</p>
        {commands.length ? (
          <ul className="mt-3 space-y-3">
            {commands.slice(0, 4).map((c) => (
              <li key={c.id} className="text-[13px]">
                <p className="line-clamp-2 text-ink">“{c.text}”</p>
                <p className="mt-0.5 text-[11px] text-ink-3">
                  {c.from} · {formatTime(new Date(c.created_at))} · <span className={cx(c.status === 'done' && 'font-semibold text-ink', ['failed', 'expired'].includes(c.status) && 'text-act')}>{STATUS[c.status] || c.status}</span>
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[13px] text-ink-3">Nothing yet. Ask me to say something to {firstName}.</p>
        )}
      </section>

      <section className="rounded-[20px] bg-paper p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">What I can do</p>
        <ul className="mt-3 space-y-2 text-[13px]">
          {[
            ['spark', 'Answer from her day', `How is ${firstName} right now?`],
            ['speaker', 'Speak on her phone', `Tell ${firstName} I'll call at 8`],
            ['pin', 'Show where she is', `Where is ${firstName}?`],
            ['camera', 'Show the latest photo', 'Show me the latest photo'],
            ['calendar', 'Summarise a day or week', 'Summarise her week'],
          ].map(([icon, label, q]) => (
            <li key={label}>
              <button type="button" onClick={() => onAsk(q)} className="flex w-full items-center gap-2.5 rounded-[12px] px-2 py-1.5 text-left transition hover:bg-black/[0.04]">
                <Icon name={icon} size={15} className="text-ink-2" /> {label}
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] text-ink-4">More actions are on the way.</p>
      </section>
    </aside>
  );
}

/* ---------------------------------------------------------------- page */

export default function Assistant() {
  const { user } = useAuth();
  const patientId = user?.patient_id;
  const firstName = (user?.patient_name || '').split(' ')[0] || 'them';
  const now = useNow();
  const status = useStatus();
  const zones = useZones();
  const [dayStart, dayEnd] = dayBounds(new Date(now));
  const entries = useEntries({ from: dayStart, to: dayEnd - 1 });
  const commands = useQuery({
    queryKey: ['commands', patientId],
    queryFn: async () => (await apiClient.get(`/api/patients/${patientId}/commands`)).data,
    enabled: Boolean(patientId),
    refetchInterval: 4000,
  });

  const [msgs, setMsgs] = useState(() => (patientId ? load(patientId) : []));
  const [draft, setDraft] = useState('');
  const [mode, setMode] = useState('ask'); // ask | say
  const [busy, setBusy] = useState(null); // timestamp while waiting
  const endRef = useRef(null);
  const dictation = useDictation((t) => setDraft(t));

  useEffect(() => {
    if (patientId) persist(patientId, msgs);
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [msgs, busy, patientId]);

  const latestPhoto = useMemo(
    () => [...(entries.data || [])].filter((e) => e.entryType === 'frame' && e.imagePublicId).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0],
    [entries.data]
  );
  const ctx = { patientId, firstName, status: status.data, zones: zones.data || [], latestPhoto };

  async function ask(text) {
    const q = text.trim();
    if (!q || busy) return;
    setDraft('');
    if (mode === 'say') {
      // Direct: no AI, straight to a confirm card.
      setMsgs((m) => [...m, { role: 'user', text: `Say to ${firstName}: “${q}”` }, { role: 'assistant', text: 'Here it is — check it and send when you’re ready.', actions: [{ type: 'speak', text: q }] }]);
      return;
    }
    const history = msgs.filter((m) => !m.error && m.text).map((m) => ({ role: m.role, text: m.text }));
    setMsgs((m) => [...m, { role: 'user', text: q }]);
    setBusy(Date.now());
    try {
      const { data } = await apiClient.post(`/api/patients/${patientId}/assistant`, { message: q, history }, { timeout: 70000 });
      setMsgs((m) => [...m, { role: 'assistant', text: data.reply, actions: data.actions, provider: data.provider, sources: data.sources, ms: data.ms }]);
    } catch (e) {
      setMsgs((m) => [...m, { role: 'assistant', error: true, text: e?.response?.data?.error || 'I couldn’t reach the server. Try again in a moment.' }]);
    } finally {
      setBusy(null);
    }
  }

  const suggestions = [
    ['spark', `How is ${firstName} right now?`, 'A quick read of her day'],
    ['speaker', `Tell ${firstName} I’ll call at 8`, 'I’ll write it, you send it'],
    ['pin', `Where is ${firstName}?`, 'Live location and safe places'],
    ['camera', 'Show me the latest photo', 'From the home camera'],
    ['calendar', 'Summarise her day', 'In a few warm sentences'],
    ['clock', 'Has she eaten today?', 'Answered from the journal'],
  ];

  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="flex h-[calc(100vh-128px)] min-h-[520px] min-w-0 flex-col overflow-hidden rounded-[24px] bg-paper sm:h-[calc(100vh-150px)]">
        {/* header */}
        <div className="flex items-center gap-3 border-b border-black/[0.05] px-5 py-4 sm:px-7">
          <span className="ai-orb h-9 w-9" />
          <div className="min-w-0 flex-1">
            <h1 className="font-serif text-[22px] leading-tight">Assistant</h1>
            <p className="truncate text-[12px] text-ink-3">Knows {firstName}’s day · answers from the camera, location and journal · asks before it acts</p>
          </div>
          {msgs.length > 0 && (
            <button type="button" onClick={() => setMsgs([])} className="rounded-full border border-black/10 bg-white/80 px-3.5 py-1.5 text-[12px] font-semibold hover:bg-white">
              New chat
            </button>
          )}
        </div>

        {/* conversation */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7">
          {msgs.length === 0 && !busy ? (
            <div className="mx-auto flex max-w-[760px] flex-col items-center pt-6 text-center sm:pt-12">
              <span className="ai-orb h-24 w-24" />
              <h2 className="mt-7 font-serif text-[34px] leading-tight sm:text-[42px]">What can I do for {firstName}?</h2>
              <p className="mt-2 max-w-[52ch] text-[15px] text-ink-2">Ask about her day, or ask me to say something to her. I’ll always show you what I’m about to send first.</p>
              <div className="mt-8 grid w-full grid-cols-1 gap-2.5 text-left sm:grid-cols-2 lg:grid-cols-3">
                {suggestions.map(([icon, q, hint]) => (
                  <button key={q} type="button" onClick={() => ask(q)} className="group rounded-[18px] bg-white/80 p-4 ring-1 ring-black/[0.04] transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_10px_30px_-16px_rgba(20,30,50,0.35)]">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-[#EAF4FF] text-ink transition group-hover:bg-[#D9F26B]"><Icon name={icon} size={16} /></span>
                    <span className="mt-3 block text-[14px] font-semibold">{q}</span>
                    <span className="mt-0.5 block text-[12px] text-ink-3">{hint}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-[820px] space-y-6">
              {msgs.map((m, i) => (
                <Message key={i} m={m} ctx={ctx} />
              ))}
              {busy && <Thinking since={busy} />}
              <div ref={endRef} />
            </div>
          )}
        </div>

        {/* composer */}
        <div className="border-t border-black/[0.05] px-4 py-4 sm:px-7">
          <div className="mx-auto max-w-[820px]">
            <div className="mb-2 flex gap-1.5">
              {[
                ['ask', 'Ask'],
                ['say', `Say to ${firstName}`],
              ].map(([k, label]) => (
                <button key={k} type="button" onClick={() => setMode(k)} aria-pressed={mode === k} className={cx('rounded-full px-3 py-1 text-[12px] font-semibold transition', mode === k ? 'bg-ink text-white' : 'text-ink-2 hover:bg-black/[0.05]')}>
                  {label}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                ask(draft);
              }}
              className={cx('flex items-end gap-2 rounded-[22px] bg-white p-2 pl-4 shadow-[0_10px_30px_-20px_rgba(20,30,50,0.5)] ring-1 transition', mode === 'say' ? 'ring-[#A9D4F5]' : 'ring-black/[0.06] focus-within:ring-ink/30')}
            >
              <textarea
                id="assistant-input"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    ask(draft);
                  }
                }}
                rows={1}
                placeholder={mode === 'say' ? `What should ${firstName}’s phone say?` : `Ask about ${firstName}, or what to tell her…`}
                className="max-h-40 min-h-[40px] flex-1 resize-none bg-transparent py-2 text-[15px] outline-none placeholder:text-ink-4"
              />
              {dictation.supported && (
                <button type="button" onClick={dictation.toggle} title={dictation.listening ? 'Stop listening' : 'Speak instead of typing'} className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-full transition', dictation.listening ? 'ai-listen bg-[#F19A82] text-ink' : 'bg-black/[0.05] text-ink-2 hover:bg-black/[0.09]')}>
                  <Icon name="mic" size={18} />
                </button>
              )}
              <button type="submit" disabled={!draft.trim() || Boolean(busy)} title="Send" className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink text-white transition hover:bg-black disabled:opacity-30">
                <Icon name="send" size={18} />
              </button>
            </form>
            <p className="mt-2 text-center text-[11px] text-ink-4">
              {dictation.listening ? 'Listening… speak now.' : mode === 'say' ? 'Goes straight to a card you confirm — no AI involved.' : 'Answers come from what the camera, phone and journal recorded. Check anything important.'}
            </p>
          </div>
        </div>
      </section>

      <LiveRail ctx={ctx} commands={commands.data || []} onAsk={(q) => { setMode('ask'); ask(q); }} />
    </div>
  );
}
