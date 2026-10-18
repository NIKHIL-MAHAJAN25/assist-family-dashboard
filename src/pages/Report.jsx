import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Icon, cx } from '../ui';

// Doctor's report (#22): one printable page covering 1, 2 or 4 weeks — routine, meals, medication, rest,
// leaving the safe places, falls and the memory quiz — plus a short note written by a helper from the
// same numbers. Everything is counted from what the camera, phone and quiz recorded; nothing is guessed.

const RANGES = [
  [7, '1 week'],
  [14, '2 weeks'],
  [28, '4 weeks'],
];

const fmtDate = (d, o = { day: 'numeric', month: 'short' }) => new Date(d).toLocaleDateString('en-GB', o);
const fmtTime = (d) => (d ? new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase() : '—');
const age = (dob) => {
  if (!dob) return null;
  const d = new Date(dob);
  const n = new Date();
  return n.getFullYear() - d.getFullYear() - (n < new Date(n.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0);
};

function Stat({ value, label, hint, tone }) {
  return (
    <div className="rounded-[16px] bg-white px-4 py-3 ring-1 ring-black/[0.06] print:rounded-none print:ring-black/20">
      <p className={cx('font-serif text-[30px] leading-none', tone === 'act' && 'text-act', tone === 'watch' && 'text-[#AD772A]')}>{value}</p>
      <p className="mt-1.5 text-[12px] font-semibold text-ink-2">{label}</p>
      {hint && <p className="text-[11px] text-ink-3">{hint}</p>}
    </div>
  );
}

/** Small bar chart, one bar per day. */
function Bars({ daily, value, max, label, color = '#1E1C1A', fmt = (v) => v }) {
  const W = 640;
  const H = 86;
  const bw = W / daily.length;
  return (
    <figure className="rounded-[16px] bg-white p-4 ring-1 ring-black/[0.06] print:break-inside-avoid print:rounded-none print:ring-black/20">
      <figcaption className="mb-2 text-[12px] font-semibold text-ink-2">{label}</figcaption>
      <svg viewBox={`0 0 ${W} ${H + 16}`} className="h-auto w-full" role="img" aria-label={label}>
        <line x1="0" y1={H} x2={W} y2={H} stroke="#000" strokeOpacity="0.12" />
        {daily.map((d, i) => {
          const v = value(d);
          const h = v == null ? 0 : Math.max(2, (v / max) * (H - 14));
          return (
            <g key={d.date}>
              {v == null ? (
                <text x={i * bw + bw / 2} y={H - 4} textAnchor="middle" fontSize="9" fill="#999">–</text>
              ) : (
                <>
                  <rect x={i * bw + bw * 0.18} y={H - h} width={bw * 0.64} height={h} rx="3" fill={color} opacity={d.recorded ? 0.85 : 0.2} />
                  {daily.length <= 14 && v > 0 && <text x={i * bw + bw / 2} y={H - h - 3} textAnchor="middle" fontSize="9" fill="#555">{fmt(v)}</text>}
                </>
              )}
              {(daily.length <= 14 || i % 7 === 0) && (
                <text x={i * bw + bw / 2} y={H + 12} textAnchor="middle" fontSize="9" fill="#777">{new Date(d.date).getDate()}</text>
              )}
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

export default function Report() {
  const { user } = useAuth();
  const pid = user?.patient_id;
  const [params, setParams] = useSearchParams();
  const days = [7, 14, 28].includes(Number(params.get('days'))) ? Number(params.get('days')) : 14;

  const r = useQuery({
    queryKey: ['report', pid, days],
    queryFn: async () => (await apiClient.get(`/api/patients/${pid}/report`, { params: { days } })).data,
    enabled: Boolean(pid),
  });
  const note = useQuery({
    queryKey: ['report-note', pid, days],
    queryFn: async () => (await apiClient.get(`/api/patients/${pid}/report/note`, { params: { days }, timeout: 70000 })).data,
    enabled: Boolean(pid && r.data?.days_recorded),
    staleTime: 5 * 60000,
    retry: false,
  });

  if (r.isLoading) return <p className="ai-shimmer p-10 text-center text-[15px]">Counting the days…</p>;
  if (r.isError) return <p className="p-10 text-center text-act">Couldn’t build the report just now.</p>;
  const d = r.data;
  const t = d.totals;
  const first = (d.patient.name || 'Them').split(' ')[0];
  const years = age(d.patient.dob);
  const quizTrend = t.quiz_pct_first_half != null && t.quiz_pct_second_half != null ? t.quiz_pct_second_half - t.quiz_pct_first_half : null;
  const [lead, ...rest] = String(note.data?.note || '').split(/\n\s*Worth discussing:?\s*\n?/i);
  const bullets = (rest.join('\n') || '').split('\n').map((l) => l.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);

  return (
    <div className="mx-auto max-w-[920px] space-y-4 pb-10 print:max-w-none print:space-y-3 print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex gap-1 rounded-full bg-white p-1 ring-1 ring-black/[0.06]">
          {RANGES.map(([n, label]) => (
            <button key={n} type="button" onClick={() => setParams({ days: String(n) })} className={cx('rounded-full px-4 py-1.5 text-[13px] font-semibold', days === n ? 'bg-ink text-white' : 'text-ink-2 hover:text-ink')}>
              {label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-black">
          <Icon name="printer" size={15} /> Print or save as PDF
        </button>
      </div>

      <header className="rounded-[22px] bg-paper p-6 print:rounded-none print:bg-white print:p-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">Home monitoring report</p>
        <h1 className="mt-1 font-serif text-[36px] leading-tight">{d.patient.name}{years ? <span className="text-ink-3">, {years}</span> : null}</h1>
        <p className="mt-1 text-[14px] text-ink-2">
          {fmtDate(d.from, { day: 'numeric', month: 'long' })} – {fmtDate(d.to, { day: 'numeric', month: 'long', year: 'numeric' })} · {d.days_recorded} of {d.days} days recorded · prepared {fmtDate(d.generated_at, { day: 'numeric', month: 'short' })}
        </p>
        <p className="mt-3 max-w-[80ch] text-[12px] text-ink-3">
          From a home camera that recognises everyday activities in one room, the phone’s location, and a short daily memory quiz.
          “Seen” means the camera saw it — it can’t see every room, so a missing meal may simply have been eaten elsewhere.
        </p>
        {d.includes_simulated && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#FFF1D6] px-3 py-1 text-[12px] font-semibold text-[#8A5A12]">
            <Icon name="info" size={13} /> Includes simulated demo history
          </p>
        )}
      </header>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat value={t.usual_first_up || '—'} label="Usually up by" hint={t.usual_last_seen ? `last seen around ${t.usual_last_seen}` : null} />
        <Stat value={t.meals_per_day} label="Meals seen per day" hint={t.days_without_meal_seen ? `${t.days_without_meal_seen} day${t.days_without_meal_seen > 1 ? 's' : ''} with none seen` : 'a meal seen every day'} tone={t.days_without_meal_seen > 1 ? 'watch' : null} />
        <Stat value={`${t.medication_days}/${d.days_recorded}`} label="Days medication seen" />
        <Stat value={`${t.daytime_rest_min_per_day} min`} label="Daytime rest per day" hint="10 am – 7 pm" />
        <Stat value={t.left_safe_places} label="Times left the safe places" hint={t.outside_min ? `${t.outside_min} min outside in all` : null} tone={t.left_safe_places ? 'watch' : null} />
        <Stat value={t.falls} label="Possible falls" hint={t.fall_escalated ? `${t.fall_escalated} needed help` : t.falls ? 'all answered “I’m okay”' : null} tone={t.falls ? 'act' : null} />
        <Stat value={t.distressed} label="Moments of visible distress" tone={t.distressed ? 'watch' : null} />
        <Stat value={t.quiz_pct != null ? `${t.quiz_pct}%` : '—'} label="Memory quiz right" hint={quizTrend != null ? `${t.quiz_pct_first_half}% → ${t.quiz_pct_second_half}% (first vs second half)` : null} tone={quizTrend != null && quizTrend <= -15 ? 'watch' : null} />
      </section>

      <section className="rounded-[22px] bg-[linear-gradient(135deg,#F3FBDF_0%,#EAF4FF_100%)] p-5 print:break-inside-avoid print:rounded-none print:bg-white print:ring-1 print:ring-black/20">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[12px] font-semibold text-ink-2">Note for the doctor</p>
          {note.data && !note.isFetching && (
            <button type="button" onClick={() => note.refetch()} className="text-[12px] text-ink-3 hover:text-ink print:hidden">Write again</button>
          )}
        </div>
        {note.isFetching ? (
          <p className="ai-shimmer mt-2 text-[15px]">A helper is reading {d.days} days of notes…</p>
        ) : note.isError ? (
          <p className="mt-2 text-[14px] text-act">Couldn’t write the note just now. <button type="button" onClick={() => note.refetch()} className="underline">Try again</button></p>
        ) : note.data ? (
          <>
            <p className="mt-2 max-w-[80ch] text-[15px] leading-relaxed">{lead}</p>
            {bullets.length > 0 && (
              <>
                <p className="mt-3 text-[13px] font-semibold">Worth discussing</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-[14px]">{bullets.map((b) => <li key={b}>{b}</li>)}</ul>
              </>
            )}
            <p className="mt-3 text-[11px] text-ink-3">Written by {note.data.provider === 'claude' ? 'Claude' : note.data.provider === 'codex' ? 'Codex' : 'Gemini'} from the numbers on this page. Not a diagnosis.</p>
          </>
        ) : null}
      </section>

      <section className="grid gap-2 sm:grid-cols-2 print:grid-cols-2">
        <Bars daily={d.daily} value={(x) => (x.recorded ? x.meals : null)} max={Math.max(3, ...d.daily.map((x) => x.meals))} label="Meals seen each day" color="#4D7C5A" />
        <Bars daily={d.daily} value={(x) => (x.quiz_total ? Math.round((x.quiz_correct / x.quiz_total) * 100) : null)} max={100} label="Memory quiz, % right" color="#3B5BA9" fmt={(v) => `${v}`} />
        <Bars daily={d.daily} value={(x) => (x.recorded ? x.daytime_rest_min : null)} max={Math.max(60, ...d.daily.map((x) => x.daytime_rest_min))} label="Daytime rest (minutes)" color="#8C6BB1" />
        <Bars daily={d.daily} value={(x) => (x.recorded ? x.outside_min : null)} max={Math.max(30, ...d.daily.map((x) => x.outside_min))} label="Minutes outside the safe places" color="#E2856C" />
      </section>

      <section className="overflow-hidden rounded-[22px] bg-white ring-1 ring-black/[0.06] print:break-before-page print:rounded-none">
        <p className="px-5 pt-4 text-[12px] font-semibold text-ink-2">Day by day</p>
        <div className="overflow-x-auto">
          <table className="mt-2 w-full min-w-[640px] text-left text-[13px] tabular-nums">
            <thead className="text-[11px] uppercase tracking-[0.06em] text-ink-3">
              <tr className="border-b border-black/[0.06]">
                {['Day', 'Up', 'Last seen', 'Meals', 'Meds', 'Rest', 'Out', 'Falls', 'Quiz'].map((h) => <th key={h} className="px-3 py-2 font-semibold first:pl-5">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {[...d.daily].reverse().map((x) => (
                <tr key={x.date} className={cx('border-b border-black/[0.04] last:border-0', !x.recorded && 'text-ink-3')}>
                  <td className="px-3 py-2 pl-5 font-semibold">{fmtDate(x.date, { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                  {x.recorded ? (
                    <>
                      <td className="px-3 py-2">{fmtTime(x.first_up)}</td>
                      <td className="px-3 py-2">{fmtTime(x.last_seen)}</td>
                      <td className={cx('px-3 py-2', x.meals === 0 && 'font-semibold text-[#AD772A]')}>{x.meals}</td>
                      <td className="px-3 py-2">{x.medication ? '✓' : '—'}</td>
                      <td className="px-3 py-2">{x.daytime_rest_min ? `${x.daytime_rest_min} min` : '—'}</td>
                      <td className={cx('px-3 py-2', x.left_safe_places > 0 && 'font-semibold text-act')}>{x.left_safe_places ? `${x.left_safe_places}× · ${x.outside_min} min` : '—'}</td>
                      <td className={cx('px-3 py-2', x.falls > 0 && 'font-semibold text-act')}>{x.falls ? `${x.falls}${x.fall_escalated ? ' (help)' : ''}` : '—'}</td>
                      <td className="px-3 py-2">{x.quiz_total ? `${x.quiz_correct}/${x.quiz_total}` : '—'}</td>
                    </>
                  ) : (
                    <td colSpan={8} className="px-3 py-2">Nothing recorded</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-center text-[11px] text-ink-3">Prepared by Assist for {first}’s family. Shared with the family’s consent.</p>
    </div>
  );
}
