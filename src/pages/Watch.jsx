import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useNow, usePatientId } from '../lib/hooks.js';
import { formatTime } from '../utils/datetime.js';
import { CHIP, GRADIENT, Tile, TileHead } from '../components/Tiles.jsx';
import { Icon, cx } from '../ui';

// The watch on its own tab: the live heart, today's chart, what happened on the wrist, and the
// actions the family can send to it. Vitals are scripted scenarios (spec §8.5), the screen is real-time.

const RANGES = [
  { value: 'today', label: 'Today' },
  { value: '24h', label: '24 h' },
  { value: '7d', label: '7 days' },
];
const MOTION = { resting: 'resting', walking: 'walking', pacing: 'pacing', fall_detected: 'sudden movement', still: 'still', sos: 'asked for help' };
const BAND = { confusion: '#F6D38B', emergency: '#F4A48C' };

function agoText(at, now) {
  if (!at) return null;
  const min = Math.max(0, Math.round((now - new Date(at)) / 60000));
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  return h < 24 ? `${h} h ago` : `${Math.floor(h / 24)} d ago`;
}

function useVitals(range) {
  const patientId = usePatientId();
  return useQuery({
    queryKey: ['vitals', patientId, range],
    queryFn: async () => (await apiClient.get(`/api/patients/${patientId}/vitals`, { params: { range } })).data,
    enabled: Boolean(patientId),
    refetchInterval: 5000,
    placeholderData: (prev) => prev,
  });
}

/** What the hero says: tone for the chip, chip text, one plain sentence. */
function readState(v, first, now) {
  const l = v?.latest;
  if (!v?.device?.paired) return { tone: 'none', chip: 'No watch yet', line: `Pair ${first}'s watch in Settings to see the heart rate here.` };
  if (!l) return { tone: 'none', chip: 'No readings yet', line: 'Waiting for the first reading from the watch.' };
  const quietMin = (now - new Date(l.at)) / 60000;
  if (quietMin > 15) return { tone: 'none', chip: `Not seen for ${agoText(l.at, now).replace(' ago', '')}`, line: `The last reading was ${l.bpm} bpm at ${formatTime(l.at)}.` };
  if (l.scenario === 'emergency') {
    return l.motion === 'sos' || v.events.some((e) => e.kind === 'sos' && now - new Date(e.at) < 30 * 60000)
      ? { tone: 'act', chip: 'Hold for help', line: `${first} pressed Hold for help. The phone is ringing — call now.` }
      : { tone: 'act', chip: 'Emergency', line: `A spike, then still. ${first} is being asked “are you okay?” on the watch and the phone.` };
  }
  if (l.scenario === 'confusion') {
    const band = [...v.bands].reverse().find((b) => b.scenario === 'confusion');
    return { tone: 'watch', chip: 'Unsettled', line: `Seems unsettled${band ? ` since ${formatTime(band.from)}` : ''} — ${MOTION[l.motion] || 'restless'}, around ${l.bpm} bpm.` };
  }
  return {
    tone: 'ok',
    chip: `On the wrist · ${agoText(l.at, now)}`,
    line: `Calm${v.summary.resting_avg ? ` — resting heart rate ${v.summary.resting_avg}` : ''}. ${first} is ${MOTION[l.motion] || 'resting'}.`,
  };
}

function Chip({ tone, children }) {
  return <span className={cx('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium', CHIP[tone] || CHIP.none)}>{children}</span>;
}

// ---- hero ----------------------------------------------------------------------------------------

function LiveStrip({ points }) {
  if (points.length < 2) return <div className="h-[56px]" />;
  const W = 320, H = 56;
  const t0 = new Date(points[0].t).getTime(), t1 = new Date(points[points.length - 1].t).getTime() || t0 + 1;
  const x = (t) => ((new Date(t).getTime() - t0) / Math.max(1, t1 - t0)) * W;
  const y = (b) => H - 4 - ((Math.min(140, Math.max(50, b)) - 50) / 90) * (H - 8);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.bpm).toFixed(1)}`).join(' ');
  const last = points[points.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-[56px] w-full" preserveAspectRatio="none" aria-hidden="true">
      <path d={d} fill="none" stroke="#1D1D1B" strokeWidth="1.6" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={x(last.t)} cy={y(last.bpm)} r="3.5" fill="#F4A48C" />
    </svg>
  );
}

function Hero({ v, first, now }) {
  const s = readState(v, first, now);
  const bpm = v?.latest?.bpm;
  const live = s.tone !== 'none' && bpm;
  const beat = live ? `${(60 / Math.max(40, Math.min(180, bpm))).toFixed(2)}s` : '0s';
  return (
    <Tile className="relative overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-[24px] leading-tight">{first}'s watch</h2>
        <Chip tone={s.tone}>{s.tone === 'act' && <Icon name="warning" size={13} />}{s.chip}</Chip>
      </div>
      <div className="mt-6 flex items-center gap-6 sm:gap-8">
        <span className="relative grid h-[104px] w-[104px] shrink-0 place-items-center">
          {live && <span className="absolute inset-0 rounded-full" style={{ background: s.tone === 'act' ? '#F4A48C' : s.tone === 'watch' ? '#F6D38B' : '#D2F27C', animation: `watch-ring ${beat} ease-out infinite` }} />}
          <span className={cx('relative grid h-[84px] w-[84px] place-items-center rounded-full', s.tone === 'act' ? 'bg-[#F4A48C]' : s.tone === 'watch' ? 'bg-[#F6D38B]' : s.tone === 'ok' ? 'bg-[#D2F27C]' : 'bg-[#E4E4DE]')}>
            <span style={live ? { animation: `watch-beat ${beat} ease-in-out infinite` } : undefined} className="grid place-items-center">
              <Icon name="heart" size={36} fill="currentColor" />
            </span>
          </span>
        </span>
        <div className="min-w-0">
          <p className="font-serif leading-none">
            <span className="text-[72px] tabular-nums sm:text-[88px]">{bpm ?? '—'}</span>
            <span className="ml-2 text-[20px] text-ink-3">bpm</span>
          </p>
          <p className="mt-2 text-[13px] font-medium capitalize text-ink-2">{v?.latest ? MOTION[v.latest.motion] || 'resting' : 'no reading'}</p>
        </div>
      </div>
      <p className="mt-5 text-[15px] leading-relaxed text-ink-2">{s.line}</p>
      <div className="mt-4 border-t border-black/5 pt-3">
        <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.1em] text-ink-3">Last 10 minutes</p>
        <LiveStrip points={v?.recent || []} />
      </div>
    </Tile>
  );
}

// ---- chart ---------------------------------------------------------------------------------------

function HeartChart({ v, range, setRange, now }) {
  // A narrower drawing on phones, so labels stay readable instead of shrinking with the chart.
  const narrow = typeof window !== 'undefined' && window.innerWidth < 640;
  const W = narrow ? 380 : 760, H = narrow ? 240 : 250, L = 30, R = 10, T = 16, B = 26;
  const span = range === '7d' ? 7 * 864e5 : range === '24h' ? 864e5 : null;
  const midnight = new Date(now); midnight.setHours(0, 0, 0, 0);
  const t0 = span ? now - span : Math.min(midnight.getTime(), now - 3600e3);
  const t1 = now;
  const x = (t) => L + ((new Date(t).getTime() - t0) / (t1 - t0)) * (W - L - R);
  const y = (b) => T + (1 - (Math.min(150, Math.max(40, b)) - 40) / 110) * (H - T - B);
  const series = (v?.series || []).filter((p) => new Date(p.t).getTime() >= t0);

  // Smooth line, broken where the watch was quiet.
  const path = useMemo(() => {
    const gap = Math.max(20 * 60e3, ((t1 - t0) / 300) * 4);
    let d = '';
    series.forEach((p, i) => {
      const prev = series[i - 1];
      const px = x(p.t), py = y(p.bpm);
      if (!prev || new Date(p.t) - new Date(prev.t) > gap) d += `M${px.toFixed(1)},${py.toFixed(1)}`;
      else {
        const qx = x(prev.t), qy = y(prev.bpm), mx = (qx + px) / 2;
        d += `C${mx.toFixed(1)},${qy.toFixed(1)} ${mx.toFixed(1)},${py.toFixed(1)} ${px.toFixed(1)},${py.toFixed(1)}`;
      }
    });
    return d;
  }, [series, t0, t1]);

  // Evenings (16–21h), when people living with dementia are often more unsettled.
  const evenings = [];
  for (let d = new Date(t0); d.getTime() < t1; d.setDate(d.getDate() + 1)) {
    const a = new Date(d); a.setHours(16, 0, 0, 0);
    const b = new Date(d); b.setHours(21, 0, 0, 0);
    if (b.getTime() > t0 && a.getTime() < t1) evenings.push([Math.max(a.getTime(), t0), Math.min(b.getTime(), t1)]);
  }
  const ticks = [];
  if (range === '7d') {
    for (let d = new Date(midnight); d.getTime() > t0; d.setDate(d.getDate() - 1)) ticks.push({ t: d.getTime(), label: d.toLocaleDateString(undefined, { weekday: 'short' }) });
  } else {
    const step = ((t1 - t0) / 3600e3 > 12 ? 4 : (t1 - t0) / 3600e3 > 5 ? 2 : 1) * (narrow ? 2 : 1);
    const h = new Date(t0); h.setMinutes(0, 0, 0); h.setHours(h.getHours() + 1);
    for (; h.getTime() < t1; h.setHours(h.getHours() + 1)) if (h.getHours() % step === 0) ticks.push({ t: h.getTime(), label: h.toLocaleTimeString(undefined, { hour: 'numeric' }) });
  }
  const marks = (v?.events || []).filter((e) => ['sos', 'fall_check', 'fall_escalated', 'fall_ok', 'cmd_calm', 'cmd_guide_home'].includes(e.kind) && new Date(e.at).getTime() >= t0);
  const last = series[series.length - 1];

  return (
    <section className={cx('min-w-0 rounded-[20px] p-5 sm:p-6', GRADIENT)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-[24px] leading-tight">Heart rate</h2>
        <div className="flex rounded-full bg-white/60 p-1">
          {RANGES.map((r) => (
            <button key={r.value} type="button" onClick={() => setRange(r.value)} className={cx('rounded-full px-3.5 py-1.5 text-[12px] font-medium transition', range === r.value ? 'bg-ink text-white' : 'text-ink-2 hover:text-ink')}>
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 h-auto w-full" role="img" aria-label="Heart rate chart">
        {evenings.map(([a, b]) => (
          <g key={a}>
            <rect x={x(a)} y={T} width={Math.max(0, x(b) - x(a))} height={H - T - B} fill="#1D1D1B" opacity="0.045" />
            {x(b) - x(a) > 40 && <text x={x(a) + 4} y={T + 11} fontSize="9.5" fill="#1D1D1B" opacity="0.45">evening</text>}
          </g>
        ))}
        <rect x={L} y={y(100)} width={W - L - R} height={y(60) - y(100)} fill="#fff" opacity="0.45" />
        {(v?.bands || []).map((b) => (
          <rect key={b.from} x={x(b.from) - 2} y={T} width={Math.max(4, x(b.to) - x(b.from) + 4)} height={H - T - B} fill={BAND[b.scenario]} opacity="0.75" rx="3" />
        ))}
        {[60, 100, 140].map((b) => (
          <g key={b}>
            <line x1={L} x2={W - R} y1={y(b)} y2={y(b)} stroke="#1D1D1B" strokeOpacity="0.1" strokeDasharray="3 4" />
            <text x={L - 6} y={y(b) + 3} fontSize="10" textAnchor="end" fill="#1D1D1B" opacity="0.55">{b}</text>
          </g>
        ))}
        {ticks.map((t) => (
          <text key={t.t} x={x(t.t)} y={H - 8} fontSize="10" textAnchor="middle" fill="#1D1D1B" opacity="0.55">{t.label}</text>
        ))}
        <path d={path} fill="none" stroke="#1D1D1B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {marks.map((m) => (
          <g key={m.at + m.kind} transform={`translate(${x(m.at)},${T + 4})`}>
            <title>{m.title}</title>
            <circle r="6" fill={m.kind.startsWith('cmd') ? '#9FD0F7' : m.kind === 'fall_ok' ? '#D2F27C' : '#F4A48C'} stroke="#fff" strokeWidth="2" />
          </g>
        ))}
        {last && (
          <g transform={`translate(${x(last.t)},${y(last.bpm)})`}>
            <circle r="5" fill="#1D1D1B" />
            {/* The bubble shifts left near the edge so it is never cut off. */}
            <g transform={`translate(${Math.min(0, W - 2 - 24 - x(last.t))},0)`}>
              <rect x="-24" y="-30" width="48" height="20" rx="10" fill="#1D1D1B" />
              <text y="-16" fontSize="11" fill="#fff" textAnchor="middle">{last.bpm}</text>
            </g>
          </g>
        )}
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-2">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm bg-white/70" /> Usual range 60–100</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm bg-[#F6D38B]" /> Unsettled</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm bg-[#F4A48C]" /> Emergency</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#9FD0F7]" /> Sent to the watch</span>
      </div>
    </section>
  );
}

function Stat({ label, value, hint, tone }) {
  return (
    <div className="rounded-[20px] bg-paper p-5">
      <p className="text-[12px] text-ink-3">{label}</p>
      <p className={cx('mt-2 font-serif text-[34px] leading-none tabular-nums', tone === 'act' && 'text-act')}>{value}</p>
      {hint && <p className="mt-2 text-[12px] text-ink-3">{hint}</p>}
    </div>
  );
}

// ---- actions -------------------------------------------------------------------------------------

function commandStatus(c) {
  if (c.status === 'done') return c.type === 'ask' ? (c.reply ? `Answered “${c.reply}”` : 'Closed') : 'Done on the watch ✓';
  if (c.status === 'delivered') return c.type === 'ask' ? 'On the watch · waiting for an answer' : 'On the watch';
  if (c.status === 'pending') return 'Sent';
  if (c.status === 'expired') return 'Not picked up';
  return c.error || c.status;
}

function SendToWatch({ patientId, first, demo }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState(null); // message | ask
  const [text, setText] = useState('');
  const commands = useQuery({
    queryKey: ['commands', patientId],
    queryFn: async () => (await apiClient.get(`/api/patients/${patientId}/commands`)).data,
    enabled: Boolean(patientId),
    refetchInterval: 2500,
  });
  const send = useMutation({
    mutationFn: async (body) => (await apiClient.post(`/api/patients/${patientId}/commands`, { ...body, target: 'watch' })).data,
    onSuccess: () => {
      setMode(null);
      setText('');
      qc.invalidateQueries({ queryKey: ['commands', patientId] });
      qc.invalidateQueries({ queryKey: ['vitals'] });
    },
  });
  const answer = useMutation({
    mutationFn: async (reply) => (await apiClient.post(`/api/demo/${patientId}/answer`, { reply, via: 'watch' })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['commands', patientId] }),
  });
  const onWatch = (commands.data || []).filter((c) => c.target === 'watch').slice(0, 5);
  const fallAsk = onWatch.find((c) => c.type === 'ask' && c.fall_check && ['pending', 'delivered'].includes(c.status));

  const ACTIONS = [
    { key: 'message', label: 'Message', icon: 'speaker', run: () => setMode('message') },
    { key: 'ask', label: 'Ask', icon: 'mic', run: () => setMode('ask') },
    { key: 'calm', label: 'Breathe now', icon: 'heart', run: () => send.mutate({ type: 'calm' }) },
    { key: 'home', label: 'Guide home', icon: 'home', run: () => send.mutate({ type: 'guide_home' }) },
  ];

  return (
    <Tile>
      <TileHead title="Send to the watch" />
      <p className="mt-1 text-[13px] text-ink-3">A buzz on {first}'s wrist, big text and a natural voice.</p>

      {fallAsk && (
        <div className="mt-4 rounded-2xl bg-[#F4A48C] p-4">
          <p className="text-[13px] font-semibold">The watch is asking “{fallAsk.question}”</p>
          {demo ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-[12px] text-ink-2">Answer as {first} (demo):</span>
              {(fallAsk.quick || []).map((q) => (
                <button key={q} type="button" onClick={() => answer.mutate(q)} disabled={answer.isPending} className="rounded-full bg-white px-3 py-1 text-[12px] font-medium hover:bg-paper">{q}</button>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-[12px] text-ink-2">No answer within 2 minutes rings the phone.</p>
          )}
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        {ACTIONS.map((a) => (
          <button
            key={a.key}
            type="button"
            onClick={a.run}
            disabled={send.isPending}
            className={cx('flex items-center gap-2.5 rounded-2xl px-4 py-3.5 text-left text-[14px] font-medium transition disabled:opacity-50', mode === a.key ? 'bg-ink text-white' : 'bg-white/80 hover:bg-white')}
          >
            <span className={cx('grid h-8 w-8 place-items-center rounded-full', mode === a.key ? 'bg-white/15' : 'bg-[#CDE6FA]')}><Icon name={a.icon} size={15} /></span>
            {a.label}
          </button>
        ))}
      </div>

      {mode && (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return;
            send.mutate(mode === 'ask' ? { type: 'ask', question: text.trim(), quick: ['Yes', 'No', 'Not yet'] } : { type: 'speak', text: text.trim() });
          }}
        >
          <input autoFocus className="input flex-1" value={text} onChange={(e) => setText(e.target.value)} placeholder={mode === 'ask' ? 'Have you had lunch?' : 'Lunch is in the fridge'} />
          <button type="submit" disabled={!text.trim() || send.isPending} className="rounded-full bg-ink px-4 text-[13px] font-medium text-white disabled:opacity-40">Send</button>
        </form>
      )}
      {send.isError && <p className="mt-2 text-[12px] text-act">{send.error?.response?.data?.error || 'Could not send.'}</p>}

      {onWatch.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-black/5 pt-3">
          {onWatch.map((c) => (
            <li key={c.id} className="flex items-start gap-3 text-[13px]">
              <span className={cx('mt-1.5 h-2 w-2 shrink-0 rounded-full', c.status === 'done' ? 'bg-[#9BCB3B]' : c.status === 'delivered' ? 'bg-[#9FD0F7]' : c.status === 'pending' ? 'bg-[#F6D38B]' : 'bg-black/20')} />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{c.type === 'speak' ? `“${c.text}”` : c.type === 'ask' ? c.question : c.type === 'calm' ? 'Breathe with me' : c.type === 'guide_home' ? 'Way home' : c.type}</span>
                <span className="text-[12px] text-ink-3">{commandStatus(c)} · {formatTime(c.created_at)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Tile>
  );
}

// ---- events, device, demo ------------------------------------------------------------------------

const EVENT_ICON = { sos: 'warning', fall_check: 'warning', fall_escalated: 'warning', fall_ok: 'check', unsettled: 'heartPulse', cmd_calm: 'heart', cmd_guide_home: 'home', cmd_speak: 'speaker', cmd_ask: 'mic', cmd_reminder: 'clock' };

function FromTheWrist({ events }) {
  return (
    <Tile>
      <TileHead title="From the wrist" />
      {!events.length ? (
        <p className="mt-4 text-[13px] text-ink-3">Nothing yet in this period. Unsettled spells, fall checks and anything sent to the watch show up here.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {events.slice(0, 8).map((e) => (
            <li key={e.at + e.kind} className="flex items-start gap-3">
              <span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-full', e.severity === 'act' ? 'bg-[#F4A48C]' : e.severity === 'watch' ? 'bg-[#F6D38B]' : e.kind === 'fall_ok' ? 'bg-[#D2F27C]' : 'bg-[#CDE6FA]')}>
                <Icon name={EVENT_ICON[e.kind] || 'dot'} size={15} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium leading-snug">{e.title.replace(/^⚠\s*/, '')}</span>
                <span className="text-[12px] text-ink-3">
                  {new Date(e.at).toDateString() === new Date().toDateString() ? formatTime(e.at) : new Date(e.at).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })}
                  {e.kind.startsWith('cmd_') && e.status ? ` · ${e.reply ? `answered “${e.reply}”` : e.status === 'done' ? 'done' : e.status === 'delivered' ? 'on the watch' : e.status}` : ''}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Tile>
  );
}

function Device({ v, now }) {
  const d = v?.device;
  return (
    <Tile>
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-[#E6F7B4]"><Icon name="watch" size={17} /></span>
        <div className="min-w-0 flex-1">
          <p className="font-medium">{d?.name || 'No watch paired'}</p>
          <p className="text-[12px] text-ink-3">
            {d?.last_seen ? `Last reading ${agoText(d.last_seen, now)}` : 'No readings yet'}
            {d?.paired_at ? ` · paired ${new Date(d.paired_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}` : ''}
            {` · battery ${d?.battery != null ? `${d.battery}%` : '—'}`}
          </p>
        </div>
        <Link to="/settings" className="rounded-full border border-black/10 bg-white/85 px-3.5 py-1.5 text-[12px] hover:bg-white">Settings</Link>
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-ink-3">Heart rate comes from scripted scenarios on the watch (calm, unsettled, emergency), so a demo never depends on the room. Not a medical device.</p>
    </Tile>
  );
}

function DemoStrip({ patientId, v }) {
  const qc = useQueryClient();
  const [note, setNote] = useState(null);
  const call = useMutation({
    mutationFn: async ({ path, body, method = 'post' }) => (await apiClient[method](`/api/demo/${patientId}${path}`, body)).data,
    onSuccess: (r, vars) => {
      setNote(vars.done(r));
      qc.invalidateQueries({ queryKey: ['vitals'] });
      qc.invalidateQueries({ queryKey: ['commands', patientId] });
    },
    onError: (e) => setNote(e?.response?.data?.error || 'That did not work.'),
  });
  const active = v?.device?.simulated;
  const SC = [
    { s: 'normal', label: 'Calm', tone: 'ok' },
    { s: 'confusion', label: 'Unsettled', tone: 'watch' },
    { s: 'emergency', label: 'Emergency', tone: 'act' },
    { s: 'sos', label: 'Hold for help', tone: 'act' },
  ];
  return (
    <section className="rounded-[20px] border border-dashed border-black/15 bg-white/40 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">Demo watch</span>
        {SC.map((x) => (
          <button
            key={x.s}
            type="button"
            disabled={call.isPending}
            onClick={() => call.mutate({ path: '/watch', body: { scenario: x.s }, done: () => `Simulated watch: ${x.label.toLowerCase()}, a reading every 5 s.` })}
            className={cx('rounded-full px-3.5 py-1.5 text-[12px] font-medium transition disabled:opacity-50', active === x.s ? 'bg-ink text-white' : `${CHIP[x.tone]} hover:brightness-95`)}
          >
            {x.label}
          </button>
        ))}
        {active && (
          <button type="button" onClick={() => call.mutate({ path: '/watch', body: { scenario: 'stop' }, done: () => 'Simulated watch stopped.' })} className="rounded-full border border-black/10 bg-white px-3.5 py-1.5 text-[12px]">Stop</button>
        )}
        <button type="button" onClick={() => call.mutate({ path: '/watch/history', body: { days: 7 }, done: (r) => `Added ${r.readings} readings over ${r.days} days.` })} className="ml-auto rounded-full border border-black/10 bg-white px-3.5 py-1.5 text-[12px]">Add a week of history</button>
      </div>
      {note && <p className="mt-2 text-[12px] text-ink-3">{note}</p>}
    </section>
  );
}

export default function Watch() {
  const patientId = usePatientId();
  const { user } = useAuth();
  const first = (user?.patient_name || 'them').split(' ')[0];
  const [range, setRange] = useState('today');
  const now = useNow(5000);
  const vitals = useVitals(range);
  const demo = useQuery({
    queryKey: ['demo', patientId],
    queryFn: async () => (await apiClient.get(`/api/demo/${patientId}`)).data,
    enabled: Boolean(patientId),
    staleTime: 60000,
  });
  const v = vitals.data;
  const s = v?.summary;

  return (
    <div className="space-y-3">
      <style>{`
        @keyframes watch-beat { 0%,100% { transform: scale(1) } 15% { transform: scale(1.22) } 30% { transform: scale(1) } 45% { transform: scale(1.12) } }
        @keyframes watch-ring { 0% { transform: scale(.8); opacity: .7 } 100% { transform: scale(1.25); opacity: 0 } }
        @media (prefers-reduced-motion: reduce) { [style*="watch-beat"], [style*="watch-ring"] { animation: none !important } }
      `}</style>
      {vitals.isError && <p className="rounded-[20px] bg-paper p-5 text-[13px] text-act">Could not load the watch: {vitals.error?.response?.data?.error || vitals.error.message}</p>}
      {demo.data?.demo_mode && <DemoStrip patientId={patientId} v={v} />}
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-3">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Hero v={v} first={first} now={now} />
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Resting average" value={s?.resting_avg ?? '—'} hint="bpm while calm" />
              <Stat label={range === 'today' ? 'Highest today' : 'Highest'} value={s?.max?.bpm ?? '—'} hint={s?.max ? (range === '7d' ? new Date(s.max.at).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' }) : `at ${formatTime(s.max.at)}`) : null} />
              <Stat label="Time unsettled" value={s ? `${s.minutes_unsettled}m` : '—'} hint={s?.minutes_unsettled ? 'raised heart rate, pacing' : 'none in this period'} />
              <Stat label="Emergencies" value={s?.emergencies ?? '—'} tone={s?.emergencies ? 'act' : null} hint={s?.last_emergency ? `last ${new Date(s.last_emergency).toDateString() === new Date().toDateString() ? `today at ${formatTime(s.last_emergency)}` : new Date(s.last_emergency).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })}` : 'none'} />
            </div>
          </div>
          <HeartChart v={v} range={range} setRange={setRange} now={now} />
        </div>
        <div className="min-w-0 space-y-3">
          <SendToWatch patientId={patientId} first={first} demo={demo.data?.demo_mode} />
          <FromTheWrist events={v?.events || []} />
          <Device v={v} now={now} />
        </div>
      </div>
    </div>
  );
}
