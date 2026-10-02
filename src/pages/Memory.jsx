import React, { useMemo } from 'react';
import { useQuizHistory } from '../lib/hooks.js';
import { formatDayLabel } from '../utils/datetime.js';
import { Empty, ErrorNote, Icon, Loading, PageTitle, Panel, cx } from '../ui';

function dayKey(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function outcome(q) {
  const a = q.attempts?.[q.attempts.length - 1];
  if (!a) return { state: 'skipped', a };
  return { state: a.correct ? 'right' : 'wrong', a };
}

function Ring({ value, size = 84, stroke = 9 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = value == null ? 0 : value / 100;
  const color = value == null ? '#E4E6EA' : value >= 70 ? '#15803D' : value >= 40 ? '#B45309' : '#C81E1E';
  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EEF0F2" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct)}
        style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(.2,.8,.2,1)' }}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        transform={`rotate(90 ${size / 2} ${size / 2})`}
        className="fill-ink text-[19px] font-bold"
      >
        {value == null ? '—' : `${value}%`}
      </text>
    </svg>
  );
}

export default function Memory() {
  const quiz = useQuizHistory();

  const days = useMemo(() => {
    const map = new Map();
    for (const q of quiz.data || []) {
      const k = dayKey(q.date);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(q);
    }
    return [...map.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([k, qs]) => {
        const res = qs.map(outcome);
        return {
          day: k,
          questions: qs,
          right: res.filter((r) => r.state === 'right').length,
          answered: res.filter((r) => r.state !== 'skipped').length,
          total: qs.length,
        };
      });
  }, [quiz.data]);

  const totals = days.reduce(
    (acc, d) => ({ right: acc.right + d.right, answered: acc.answered + d.answered, total: acc.total + d.total }),
    { right: 0, answered: 0, total: 0 }
  );
  const rate = totals.answered ? Math.round((totals.right / totals.answered) * 100) : null;

  return (
    <>
      <PageTitle
        title="Memory"
        subtitle="Each day's quiz is written from what the camera actually saw — so a right answer is a real recollection, not trivia."
      />

      {quiz.isLoading ? (
        <Loading />
      ) : quiz.isError ? (
        <ErrorNote error={quiz.error} />
      ) : !days.length ? (
        <Panel>
          <Empty icon="brain" title="No quizzes yet">
            The phone app offers a short quiz each day once there's enough activity to ask about.
          </Empty>
        </Panel>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <div className="space-y-4">
            <div className="panel p-5">
              <p className="section-title">Recall rate</p>
              <div className="mt-3 flex items-center gap-4">
                <Ring value={rate} />
                <div>
                  <p className="text-sm font-semibold text-ink-2">
                    {rate == null ? 'No answers yet' : rate >= 70 ? 'Strong recall' : rate >= 40 ? 'Some recall' : 'Recall is low'}
                  </p>
                  <p className="text-xs text-ink-3">Across everything answered</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-ink-3">
                {totals.right} remembered out of {totals.answered} answered, across {days.length} day
                {days.length === 1 ? '' : 's'}.
              </p>
            </div>
            <div className="panel p-5">
              <p className="section-title mb-3">By day</p>
              <ul className="space-y-2.5">
                {days.map((d) => (
                  <li key={d.day} className="flex items-center gap-3 text-sm">
                    <span className="w-24 shrink-0 text-ink-2">{formatDayLabel(d.day)}</span>
                    <span className="flex h-2 flex-1 overflow-hidden rounded-full bg-subtle">
                      <span className="bg-ok" style={{ width: `${(d.right / d.total) * 100}%` }} />
                      <span className="bg-watch" style={{ width: `${((d.answered - d.right) / d.total) * 100}%` }} />
                    </span>
                    <span className="w-9 text-right font-semibold">
                      {d.right}/{d.total}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 flex gap-3 text-xs text-ink-3">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-ok" /> Remembered</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-watch" /> Missed</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-subtle ring-1 ring-line" /> Not answered</span>
              </p>
            </div>
          </div>

          <div className="space-y-5">
            {days.map((d) => (
              <Panel
                key={d.day}
                title={formatDayLabel(d.day)}
                action={<span className="text-sm text-ink-3">{d.right} of {d.total} remembered</span>}
                flush
              >
                <ul className="divide-y divide-line">
                  {d.questions.map((q) => {
                    const { state, a } = outcome(q);
                    return (
                      <li key={q.id} className="flex items-start gap-3 px-4 py-3.5">
                        <span
                          className={cx(
                            'mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-white',
                            state === 'right' ? 'bg-ok' : state === 'wrong' ? 'bg-watch' : 'bg-line-strong'
                          )}
                        >
                          <Icon name={state === 'right' ? 'check' : state === 'wrong' ? 'x' : 'dot'} size={13} strokeWidth={3} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold">{q.question}</p>
                          <div className="mt-1 grid gap-x-6 gap-y-0.5 text-sm sm:grid-cols-2">
                            <p className="text-ink-3">
                              Answered:{' '}
                              <span className={cx('font-semibold', state === 'right' ? 'text-ok' : state === 'wrong' ? 'text-watch' : 'text-ink-4')}>
                                {a ? a.answered : 'not yet'}
                              </span>
                            </p>
                            <p className="text-ink-3">
                              Actually: <span className="font-semibold text-ink-2">{q.correctAnswer}</span>
                            </p>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </Panel>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
