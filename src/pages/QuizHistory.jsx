import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchQuizHistory } from '../api/quiz';
import { useAuth } from '../context/AuthContext.jsx';
import { PageHeader, Card, Chip, LoadingBanner, ErrorBanner, EmptyState } from '../ui';
import { formatTime, formatDayLabel } from '../utils/datetime.js';

function groupByDate(questions) {
  const groups = new Map();
  for (const q of questions) {
    const dateKey = q.date ? new Date(q.date).toLocaleDateString() : 'Unknown date';
    if (!groups.has(dateKey)) groups.set(dateKey, []);
    groups.get(dateKey).push(q);
  }
  return Array.from(groups.entries()).sort(
    (a, b) => new Date(b[1][0]?.date || 0) - new Date(a[1][0]?.date || 0)
  );
}

function dayScore(items) {
  const total = items.length;
  const totalAttempts = items.reduce((sum, q) => sum + (q.attempts || []).length, 0);
  const correctCount = items.filter((q) => (q.attempts || []).some((a) => a.correct)).length;
  const tone = totalAttempts === 0 ? 'neutral' : correctCount === total ? 'ok' : 'attend';
  return { text: `${correctCount} of ${total} correct`, tone };
}

function questionAccent(q) {
  const attempts = q.attempts || [];
  if (attempts.length === 0) return 'quiet';
  return attempts.some((a) => a.correct) ? 'ok' : 'attend';
}

function AttemptRow({ attempt }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="min-w-0 truncate text-[15px] text-ink">{attempt.answered}</span>
      <div className="flex shrink-0 items-center gap-3">
        {attempt.correct ? (
          <Chip tone="ok" dot>Correct</Chip>
        ) : (
          <Chip tone="alert" dot>Not quite</Chip>
        )}
        <time className="text-[13px] text-ink-faint">{formatTime(attempt.timestamp)}</time>
      </div>
    </div>
  );
}

export default function QuizHistory() {
  const { user } = useAuth();
  const patientId = user?.patient_id;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['quiz-history', patientId],
    queryFn: () => fetchQuizHistory(patientId),
    enabled: Boolean(patientId),
  });

  const questions = data || [];
  const grouped = groupByDate(questions);

  return (
    <div>
      <PageHeader
        eyebrow="Engagement"
        title="Daily quiz"
        description="Each question is built from what actually happened that day, not generic trivia — so a right or wrong answer says something real about how the day is going."
      />

      {isLoading && <LoadingBanner label="Loading quiz history…" />}
      {isError && <ErrorBanner error={error} label="Could not load quiz history" />}
      {!isLoading && !isError && questions.length === 0 && (
        <EmptyState
          icon="spark"
          label="No questions yet"
          hint="Once the day's activity is recorded, a daily recall question will show up here."
        />
      )}

      <div className="space-y-8">
        {grouped.map(([dateKey, items]) => {
          const score = dayScore(items);
          return (
            <div key={dateKey}>
              <div className="mb-3 flex items-center gap-4">
                <h2 className="shrink-0 font-display text-[17px] font-semibold text-ink">
                  {formatDayLabel(items[0]?.date)}
                </h2>
                <div className="h-px flex-1 bg-line" aria-hidden="true" />
                <Chip tone={score.tone}>{score.text}</Chip>
              </div>
              <div className="space-y-3">
                {items.map((q) => (
                  <Card key={q.id} accent={questionAccent(q)}>
                    <p className="font-display text-[18px] font-semibold text-ink">{q.question}</p>
                    <p className="mt-1 text-[14px] text-ink-faint">
                      Correct answer: <span className="font-bold text-ink">{q.correctAnswer}</span>
                    </p>
                    <div className="av-divider my-3" />
                    {(q.attempts || []).length === 0 ? (
                      <p className="text-[14px] text-ink-faint">No attempts yet.</p>
                    ) : (
                      q.attempts.map((attempt) => <AttemptRow key={attempt.id} attempt={attempt} />)
                    )}
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
