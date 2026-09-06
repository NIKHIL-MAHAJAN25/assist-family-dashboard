import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchQuizHistory } from '../api/quiz';
import { useAuth } from '../context/AuthContext.jsx';
import { LoadingBanner, ErrorBanner, EmptyState } from '../components/StatusBanner.jsx';

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

function AttemptRow({ attempt }) {
  return (
    <div className="flex items-center justify-between text-sm py-1">
      <span className="text-slate-600">{attempt.answered}</span>
      <div className="flex items-center gap-2">
        <span
          className={
            attempt.correct
              ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700'
              : 'rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700'
          }
        >
          {attempt.correct ? 'Correct' : 'Incorrect'}
        </span>
        <time className="text-xs text-slate-400">
          {attempt.timestamp ? new Date(attempt.timestamp).toLocaleTimeString() : ''}
        </time>
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
      <h1 className="text-xl font-semibold text-slate-800 mb-4">Quiz History</h1>

      {isLoading && <LoadingBanner label="Loading quiz history..." />}
      {isError && <ErrorBanner error={error} label="Could not load quiz history" />}
      {!isLoading && !isError && questions.length === 0 && (
        <EmptyState label="No quiz questions recorded yet." />
      )}

      <div className="space-y-6">
        {grouped.map(([dateLabel, items]) => (
          <div key={dateLabel}>
            <h2 className="text-sm font-semibold text-slate-500 mb-2">{dateLabel}</h2>
            <div className="space-y-2">
              {items.map((q) => (
                <div key={q.id} className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-sm font-medium text-slate-800">{q.question}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Correct answer: <span className="text-slate-700">{q.correctAnswer}</span>
                  </p>
                  <div className="mt-2 border-t border-slate-100 pt-2">
                    {(q.attempts || []).length === 0 ? (
                      <p className="text-xs text-slate-400">No attempts yet.</p>
                    ) : (
                      q.attempts.map((attempt) => <AttemptRow key={attempt.id} attempt={attempt} />)
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
