import React, { useState } from 'react';
import { apiClient } from '../api/client';
import { Tile } from './Tiles.jsx';
import { Icon, cx } from '../ui';

const RANGES = [
  ['today', 'Today'],
  ['morning', 'This morning'],
  ['week', 'This week'],
];

const BY = { claude: 'Claude', codex: 'Codex', gemini: 'Gemini' };

// What the helper reads, shown so the family knows the summary is grounded in real readings.
const SOURCES = [
  ['camera', 'Home camera'],
  ['pin', 'Places'],
  ['heartPulse', 'Watch'],
  ['brain', 'Memory quiz'],
  ['inbox', 'Messages'],
];

const PERIOD = { today: 'day', morning: 'morning', week: 'week' };

/**
 * "In a few words": a helper on the server reads the day journal and writes 3–5 plain sentences.
 * Asked for on demand (it costs an AI call); the server caches it until the journal changes.
 */
export default function SummaryTile({ patientId, firstName }) {
  const [range, setRange] = useState('today');
  const [state, setState] = useState({}); // range -> { loading, data, error }
  const [copied, setCopied] = useState(false);
  const cur = state[range] || {};
  const period = PERIOD[range];

  async function write(fresh = false) {
    setState((s) => ({ ...s, [range]: { loading: true } }));
    try {
      const { data } = await apiClient.get(`/api/patients/${patientId}/summary`, {
        params: { range, ...(fresh && { fresh: 1 }) },
        timeout: 70000,
      });
      setState((s) => ({ ...s, [range]: { data } }));
    } catch (err) {
      setState((s) => ({ ...s, [range]: { error: err?.response?.data?.error || "Couldn't reach the server." } }));
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(cur.data.summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked: nothing to do */
    }
  }

  return (
    <Tile tour="summary" className="relative isolate overflow-hidden">
      {/* soft colour wash behind the card, the Assistant's blue → lime */}
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-28 -z-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,#9FD0F7_0%,rgba(159,208,247,0)_70%)] opacity-70 blur-2xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 right-40 -z-10 h-64 w-64 rounded-full bg-[radial-gradient(circle,#D9F57E_0%,rgba(217,245,126,0)_70%)] opacity-60 blur-2xl" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={cx('ai-orb h-10 w-10 shrink-0', cur.loading && 'thinking')} />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">AI briefing</p>
            <h2 className="font-serif text-[24px] leading-tight">In a few words</h2>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 rounded-full bg-white/80 p-1 ring-1 ring-black/[0.04]" role="group" aria-label="Summary period">
          {RANGES.map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setRange(k)}
              aria-pressed={range === k}
              className={cx('rounded-full px-3 py-1 text-[12px] transition', range === k ? 'bg-ink text-white' : 'text-ink-2 hover:bg-white')}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        {cur.loading && (
          <div className="rounded-[18px] bg-white/70 p-5 ring-1 ring-black/[0.04]">
            <p className="ai-shimmer text-[15px] font-semibold">Reading {firstName}’s journal and writing the {period}…</p>
            <div className="mt-4 grid gap-2.5" aria-hidden>
              {['w-[92%]', 'w-[80%]', 'w-[86%]', 'w-[55%]'].map((w) => (
                <span key={w} className={cx('h-3 animate-pulse rounded-full bg-black/[0.06]', w)} />
              ))}
            </div>
            <p className="mt-4 text-[12px] text-ink-3">Usually 10–20 seconds.</p>
          </div>
        )}

        {cur.error && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] bg-[#FDECE8] p-4">
            <p className="text-[14px] text-act">{cur.error}</p>
            <button type="button" onClick={() => write()} className="rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-white hover:bg-black">Try again</button>
          </div>
        )}

        {cur.data && (
          <div className="relative rounded-[18px] bg-white/75 p-5 pl-6 ring-1 ring-black/[0.04] sm:p-6 sm:pl-7">
            <span aria-hidden className="absolute bottom-5 left-0 top-5 w-1 rounded-full bg-[linear-gradient(180deg,#9FD0F7,#C6EBA0,#D9F57E)]" />
            <p className="max-w-[70ch] font-serif text-[19px] leading-[1.55] text-ink sm:text-[21px]">{cur.data.summary}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-[12px]">
              {cur.data.provider && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.05] px-2.5 py-1 font-semibold text-ink-2">
                  <Icon name="spark" size={12} /> Written by {BY[cur.data.provider] || cur.data.provider}
                </span>
              )}
              {cur.data.journal_lines != null && (
                <span className="rounded-full bg-black/[0.05] px-2.5 py-1 text-ink-2">from {cur.data.journal_lines} journal lines</span>
              )}
              <span className="flex-1" />
              <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold text-ink-2 hover:bg-black/[0.05] hover:text-ink">
                <Icon name={copied ? 'check' : 'copy'} size={13} /> {copied ? 'Copied' : 'Copy'}
              </button>
              <button type="button" onClick={() => write(true)} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold text-ink-2 hover:bg-black/[0.05] hover:text-ink">
                <Icon name="refresh" size={13} /> Write again
              </button>
            </div>
          </div>
        )}

        {!cur.loading && !cur.data && !cur.error && (
          <div className="grid items-center gap-5 md:grid-cols-[minmax(0,1fr)_auto]">
            <div>
              <p className="max-w-[46ch] font-serif text-[21px] leading-snug text-ink sm:text-[23px]">
                How was {firstName}’s {period}? Get the whole picture in four calm sentences.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="mr-1 text-[12px] text-ink-3">Reads</span>
                {SOURCES.map(([icon, label]) => (
                  <span key={label} className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-[12px] font-medium text-ink-2 ring-1 ring-black/[0.04]">
                    <Icon name={icon} size={13} /> {label}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-start gap-1.5 md:items-end">
              <button
                type="button"
                onClick={() => write()}
                className="group inline-flex items-center gap-2 rounded-full bg-ink py-3 pl-4 pr-5 text-[14px] font-semibold text-white shadow-[0_10px_30px_-10px_rgba(20,20,20,.45)] transition hover:-translate-y-0.5 hover:bg-black"
              >
                <span className="grid h-6 w-6 place-items-center rounded-full bg-[linear-gradient(135deg,#9FD0F7,#D9F57E)] text-ink">
                  <Icon name="spark" size={14} />
                </span>
                Write the {period === 'day' ? 'day' : period}’s summary
              </button>
              <p className="text-[12px] text-ink-3">About 15 seconds · only you see it</p>
            </div>
          </div>
        )}
      </div>
    </Tile>
  );
}
