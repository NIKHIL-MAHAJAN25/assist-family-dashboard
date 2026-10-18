import React, { useState } from 'react';
import { apiClient } from '../api/client';
import { Tile, TileHead } from './Tiles.jsx';
import { Spinner, cx } from '../ui';

const RANGES = [
  ['today', 'Today'],
  ['morning', 'This morning'],
  ['week', 'This week'],
];

const BY = { claude: 'Claude', codex: 'Codex', gemini: 'Gemini' };

/**
 * "In a few words": a helper on the server reads the day journal and writes 3–5 plain sentences.
 * Asked for on demand (it costs an AI call); the server caches it until the journal changes.
 */
export default function SummaryTile({ patientId, firstName }) {
  const [range, setRange] = useState('today');
  const [state, setState] = useState({}); // range -> { loading, data, error }
  const cur = state[range] || {};

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

  return (
    <Tile tour="summary">
      <TileHead title="In a few words">
        <div className="flex flex-wrap gap-1 rounded-full bg-white/70 p-1" role="group" aria-label="Summary period">
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
      </TileHead>

      <div className="mt-4 min-h-[72px]">
        {cur.loading && (
          <p className="flex items-center gap-2.5 text-[14px] text-ink-3">
            <Spinner /> A helper is reading {firstName}'s journal… usually 10–20 seconds.
          </p>
        )}
        {cur.error && <p className="text-[14px] text-act">{cur.error}</p>}
        {cur.data && (
          <>
            <p className="max-w-[68ch] text-[15px] leading-relaxed text-ink">{cur.data.summary}</p>
            <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-3">
              {cur.data.provider && <span>Written by {BY[cur.data.provider] || cur.data.provider}</span>}
              {cur.data.journal_lines != null && <span>from {cur.data.journal_lines} journal lines</span>}
              <button type="button" onClick={() => write(true)} className="font-semibold text-ink-2 underline decoration-black/20 underline-offset-4 hover:text-ink">
                Write again
              </button>
            </p>
          </>
        )}
        {!cur.loading && !cur.data && !cur.error && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[14px] text-ink-3">A short, plain-English update on {firstName}'s {range === 'week' ? 'week' : range === 'morning' ? 'morning' : 'day'}.</p>
            <button type="button" onClick={() => write()} className="rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-black">
              Write summary
            </button>
          </div>
        )}
      </div>
    </Tile>
  );
}
