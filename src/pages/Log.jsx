import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateLogEntrySaved } from '../api/logEntries.js';
import { useEntries, useNow, useZones } from '../lib/hooks.js';
import { buildIncidents, buildMoments, dayBounds, ribbonSegments } from '../lib/story.js';
import { formatDayLabel } from '../utils/datetime.js';
import DayRibbon from '../components/DayRibbon.jsx';
import MomentList from '../components/MomentList.jsx';
import IncidentCard from '../components/IncidentCard.jsx';
import WeekStrip from '../components/WeekStrip.jsx';
import DayPicker from '../components/DayPicker.jsx';
import { Empty, ErrorNote, Loading, PageTitle, Panel, Segmented } from '../ui';

const toKey = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};
const fromKey = (k) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export default function Log() {
  const [params, setParams] = useSearchParams();
  const now = useNow();
  const todayKey = toKey(now);
  const dayKey = params.get('day') || todayKey;
  const filter = params.get('show') || 'all';
  const [dayStart, dayEnd] = dayBounds(fromKey(dayKey));
  const isToday = dayKey === todayKey;

  const entries = useEntries({ from: dayStart, to: dayEnd - 1 });
  const zones = useZones();
  const qc = useQueryClient();

  const save = useMutation({
    mutationFn: ({ ids, value }) => Promise.all(ids.map((id) => updateLogEntrySaved(id, value))),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['entries'] }),
  });

  const { moments, incidents, segments, raw } = useMemo(() => {
    const list = entries.data || [];
    const z = zones.data || [];
    const m = buildMoments(list, z);
    return {
      raw: list.length,
      moments: m,
      incidents: buildIncidents(list, z),
      segments: ribbonSegments(m, dayStart, dayEnd, isToday ? now : dayEnd),
    };
  }, [entries.data, zones.data, dayStart, dayEnd, now, isToday]);

  const shown = moments.filter((m) =>
    filter === 'all'
      ? true
      : filter === 'activity'
        ? m.kind === 'activity'
        : filter === 'places'
          ? m.kind === 'place'
          : m.flagged
  );

  const go = (deltaDays) => {
    const d = fromKey(dayKey);
    d.setDate(d.getDate() + deltaDays);
    const next = new URLSearchParams(params);
    next.set('day', toKey(d));
    setParams(next);
  };
  const setFilter = (v) => {
    const next = new URLSearchParams(params);
    next.set('show', v);
    setParams(next);
  };

  return (
    <>
      <PageTitle
        title={formatDayLabel(dayStart)}
        subtitle={
          entries.isLoading
            ? ' '
            : raw
              ? `${raw} readings from the camera and watch, merged into ${moments.length} moments.`
              : 'Nothing was recorded on this day.'
        }
        actions={
          <DayPicker
            value={dayKey}
            max={todayKey}
            onStep={go}
            onChange={(k) => setParams({ day: k, show: filter })}
            onToday={() => setParams({ show: filter })}
          />
        }
      />

      <div className="mb-6">
        <WeekStrip
          selected={fromKey(dayKey)}
          today={new Date(now)}
          onSelect={(d) => {
            const next = new URLSearchParams(params);
            next.set('day', toKey(d));
            setParams(next);
          }}
        />
      </div>

      {entries.isError && <ErrorNote error={entries.error} />}
      {entries.isLoading ? (
        <Loading />
      ) : (
        <div className="space-y-6">
          {raw > 0 && (
            <Panel>
              <div className="pt-5">
                <DayRibbon
                  segments={segments}
                  incidents={incidents}
                  dayStart={dayStart}
                  now={now}
                  isToday={isToday}
                />
              </div>
            </Panel>
          )}

          {incidents.length > 0 && (
            <div className="space-y-3">
              {incidents.map((i) => (
                <IncidentCard key={i.id} incident={i} />
              ))}
            </div>
          )}

          <Panel
            title="Moments"
            action={
              <Segmented
                value={filter}
                onChange={setFilter}
                options={[
                  { value: 'all', label: 'All', count: moments.length },
                  { value: 'activity', label: 'Activity', count: moments.filter((m) => m.kind === 'activity').length },
                  { value: 'places', label: 'Places', count: moments.filter((m) => m.kind === 'place').length },
                  { value: 'flagged', label: 'Flagged', count: moments.filter((m) => m.flagged).length },
                ]}
              />
            }
          >
            {shown.length ? (
              <MomentList
                moments={shown}
                showObjects
                onToggleSave={(m, value) =>
                  save.mutate({ ids: m.entries.filter((e) => e.imagePublicId).map((e) => e.id), value })
                }
              />
            ) : (
              <Empty icon="inbox" title="Nothing to show">
                {raw ? 'No moments match this filter.' : 'Try an earlier day.'}
              </Empty>
            )}
          </Panel>
          <p className="text-center text-sm text-ink-4">
            Photos are deleted after 7 days. Hover a moment with a photo and click the bookmark to keep it.
          </p>
        </div>
      )}
    </>
  );
}
