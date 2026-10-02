import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { updateLogEntryAcknowledged } from '../api/logEntries.js';
import { formatTime, formatDateTime } from '../utils/datetime.js';
import { Badge, Button, Icon, cx } from '../ui';

function lasted(a, b) {
  const m = Math.round((b - a) / 60000);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}

export default function IncidentCard({ incident, showDate, defaultOpen = false }) {
  const [expanded, setExpanded] = useState(defaultOpen);
  const qc = useQueryClient();
  const ack = useMutation({
    mutationFn: (value) =>
      Promise.all(incident.entries.map((e) => updateLogEntryAcknowledged(e.id, value))),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entries'] });
      qc.invalidateQueries({ queryKey: ['status'] });
    },
  });

  const open = !incident.acknowledged;
  const tone = open ? (incident.resolved ? 'watch' : 'act') : 'neutral';

  return (
    <article
      className={cx(
        'overflow-hidden rounded-2xl border bg-white/85 shadow-card backdrop-blur-xl',
        open ? (incident.resolved ? 'border-watch-line' : 'border-act-line') : 'border-white/80'
      )}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className={cx(
          'flex w-full flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 text-left transition-colors',
          open ? (incident.resolved ? 'bg-watch-soft hover:brightness-[0.98]' : 'bg-act-soft hover:brightness-[0.98]') : 'hover:bg-subtle'
        )}
      >
        <span
          className={cx(
            'grid h-8 w-8 place-items-center rounded-full text-white',
            open ? (incident.resolved ? 'bg-watch' : 'bg-act') : 'bg-ink-4'
          )}
        >
          <Icon name="warning" size={16} strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-md font-bold text-ink">{incident.title}</p>
          <p className="text-sm text-ink-2">
            {showDate ? formatDateTime(incident.start) : formatTime(incident.start)}
            {incident.resolved
              ? ` · back safe after ${lasted(incident.start, incident.resolved.at)}`
              : ' · still ongoing'}
          </p>
        </div>
        {open ? (
          <Badge tone={tone} dot>
            {incident.resolved ? 'Resolved — needs a look' : 'Needs attention now'}
          </Badge>
        ) : (
          <Badge>Handled</Badge>
        )}
        <Icon
          name="chevronDown"
          size={18}
          className={cx('text-ink-3 transition-transform duration-200', expanded && 'rotate-180')}
        />
      </button>

      {expanded && (
      <>
        <ol className="flex flex-wrap gap-y-3 px-4 pb-1 pt-4">
          {incident.steps.map((s, i) => (
            <li key={i} className="flex min-w-[150px] flex-1 items-start">
              <div className="flex flex-col items-center">
                <span
                  className={cx(
                    'mt-1 h-2.5 w-2.5 rounded-full',
                    s.kind === 'resolved' ? 'bg-ok' : 'bg-act'
                  )}
                />
              </div>
              <div className="ml-2 mr-3 min-w-0">
                <p className="text-xs font-semibold text-ink-3">
                  {formatTime(s.at)}
                  {s.until && `–${formatTime(s.until)}`}
                  {s.count > 1 && <span className="font-normal"> · {s.count} readings</span>}
                </p>
                <p className="text-sm text-ink">{s.text}</p>
              </div>
              {i < incident.steps.length - 1 && (
                <span className="mr-3 mt-2 hidden h-px flex-1 bg-line sm:block" />
              )}
            </li>
          ))}
        </ol>

      <div className="flex flex-wrap items-center justify-end gap-2 px-4 py-3">
        {incident.lastFix && (
          <Link to="/places">
            <Button size="sm" variant="ghost" icon="map">
              View on map
            </Button>
          </Link>
        )}
        {open ? (
          <Button
            size="sm"
            variant="primary"
            icon="check"
            loading={ack.isPending}
            onClick={() => ack.mutate(true)}
          >
            Mark as checked
          </Button>
        ) : (
          <Button size="sm" variant="ghost" loading={ack.isPending} onClick={() => ack.mutate(false)}>
            Reopen
          </Button>
        )}
      </div>
      </>
      )}
    </article>
  );
}
