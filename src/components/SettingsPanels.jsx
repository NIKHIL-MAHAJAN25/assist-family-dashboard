import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createInvite, getDecisions, listCaregivers, listInvites, prettyCode, revokeInvite } from '../api/accounts.js';
import { apiClient } from '../api/client.js';
import { Badge, Button, ErrorNote, Panel } from '../ui';

function untilText(iso) {
  const h = Math.max(0, Math.round((new Date(iso) - Date.now()) / 3600000));
  return h >= 48 ? `${Math.round(h / 24)} days` : h >= 1 ? `${h} h` : 'under an hour';
}

function firstName(name, fallback) {
  return (name || '').split(' ')[0] || fallback;
}

/** A big, read-aloud-able code with copy buttons. */
function CodeCard({ invite, link, onRevoke, revoking }) {
  const [copied, setCopied] = useState(null);
  const copy = (what, text) => {
    navigator.clipboard?.writeText(text);
    setCopied(what);
    setTimeout(() => setCopied(null), 1600);
  };
  return (
    <div className="rounded-[16px] bg-subtle p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="font-mono text-[30px] font-semibold tracking-[0.18em] text-ink">{prettyCode(invite.code)}</span>
        <div className="flex gap-2">
          <Button size="sm" icon={copied === 'code' ? 'check' : 'copy'} onClick={() => copy('code', invite.code)}>
            {copied === 'code' ? 'Copied' : 'Code'}
          </Button>
          {link && (
            <Button size="sm" icon={copied === 'link' ? 'check' : 'copy'} onClick={() => copy('link', link)}>
              {copied === 'link' ? 'Copied' : 'Link'}
            </Button>
          )}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-sm text-ink-3">
        <span>Works once · expires in {untilText(invite.expires_at)}</span>
        <button type="button" onClick={onRevoke} disabled={revoking} className="font-semibold text-ink-3 hover:text-act">
          Cancel code
        </button>
      </div>
    </div>
  );
}

function useInvites(patientId) {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ['invites', patientId] });
  const invites = useQuery({ queryKey: ['invites', patientId], queryFn: () => listInvites(patientId), enabled: !!patientId });
  const create = useMutation({ mutationFn: (kind) => createInvite(patientId, kind), onSuccess: refresh });
  const revoke = useMutation({ mutationFn: (code) => revokeInvite(patientId, code), onSuccess: refresh });
  return { invites, create, revoke };
}

export function FamilyCircle({ patientId, patientName }) {
  const first = firstName(patientName, 'them');
  const people = useQuery({ queryKey: ['caregivers', patientId], queryFn: () => listCaregivers(patientId), enabled: !!patientId });
  const { invites, create, revoke } = useInvites(patientId);
  const live = invites.data?.find((i) => i.kind === 'caregiver');
  const link = live ? `${window.location.origin}/join/${live.code}` : null;

  return (
    <Panel title="Family circle">
      <p className="mb-4 text-sm text-ink-3">Everyone here sees {first}'s day and gets the same alerts.</p>
      <ul className="mb-5 space-y-3">
        {(people.data || []).map((p) => (
          <li key={p.id} className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-butter text-sm font-bold text-ink">{p.name[0]}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-base font-semibold">
                {p.name} {p.is_you && <span className="font-normal text-ink-3">(you)</span>}
              </span>
              <span className="block truncate text-sm text-ink-3">{p.email}</span>
            </span>
          </li>
        ))}
      </ul>
      {live ? (
        <>
          <p className="mb-2 text-sm text-ink-2">Send this code or link to the person you want to add:</p>
          <CodeCard invite={live} link={link} onRevoke={() => revoke.mutate(live.code)} revoking={revoke.isPending} />
        </>
      ) : (
        <Button icon="plus" variant="primary" loading={create.isPending} onClick={() => create.mutate('caregiver')}>
          Invite someone
        </Button>
      )}
      {create.isError && <ErrorNote error={create.error} />}
    </Panel>
  );
}

export function PairPhone({ patientId, patientName }) {
  const first = firstName(patientName, 'the');
  const { invites, create, revoke } = useInvites(patientId);
  const live = invites.data?.find((i) => i.kind === 'device');
  const steps = [
    `Install the Assist app on ${first}'s phone and open it.`,
    "Choose “I'm being looked after”.",
    'Type in this code. The phone pairs itself, then relays the home camera and its own location.',
  ];
  return (
    <Panel title={`Set up ${first}'s phone`}>
      <ol className="mb-4 space-y-3 text-base text-ink-2">
        {steps.map((t, i) => (
          <li key={i} className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink text-xs font-bold text-white">{i + 1}</span>
            {t}
          </li>
        ))}
      </ol>
      {live ? (
        <CodeCard invite={live} onRevoke={() => revoke.mutate(live.code)} revoking={revoke.isPending} />
      ) : (
        <Button icon="plus" variant="primary" loading={create.isPending} onClick={() => create.mutate('device')}>
          Get a pairing code
        </Button>
      )}
      {create.isError && <ErrorNote error={create.error} />}
    </Panel>
  );
}

const MODE_TEXT = {
  off: 'Off — alerts come from the built-in rules only.',
  shadow: 'Shadow mode — Drex answers alongside the rules so you can compare. The rules still decide.',
  live: 'Live — Drex decides, with the rules as a safety net. Leaving the safe places always alerts.',
};

export function DecisionLayer({ patientId }) {
  const q = useQuery({
    queryKey: ['decisions', patientId],
    queryFn: () => getDecisions(patientId),
    enabled: !!patientId,
    refetchInterval: 30000,
  });
  const d = q.data;
  return (
    <Panel title="Alert decisions">
      {q.isLoading && <p className="text-sm text-ink-3">Loading…</p>}
      {d && (
        <>
          <p className="text-sm text-ink-2">{MODE_TEXT[d.mode]}</p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              ['Checked', d.summary.decisions],
              ['Agreement', d.summary.agreement == null ? '—' : `${d.summary.agreement}%`],
              ['Median time', d.summary.median_ms == null ? '—' : `${(d.summary.median_ms / 1000).toFixed(1)} s`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-[14px] bg-subtle p-3">
                <div className="font-serif text-[26px] leading-none">{v}</div>
                <div className="mt-1 text-xs text-ink-3">{k}</div>
              </div>
            ))}
          </div>
          {d.recent.length > 0 ? (
            <ul className="mt-4 divide-y divide-line">
              {d.recent.slice(0, 6).map((r) => (
                <li key={r.log_entry_id} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className="w-12 shrink-0 font-mono text-ink-3">{new Date(r.timestamp).toTimeString().slice(0, 5)}</span>
                  <span className="min-w-0 flex-1 truncate">{r.what}</span>
                  <span className="hidden shrink-0 text-ink-3 sm:inline">Rules {r.rules?.notify ? 'alert' : 'quiet'}</span>
                  <Badge tone={r.drex?.error ? 'neutral' : r.agree ? 'ok' : 'watch'}>
                    {r.drex?.error ? 'Drex n/a' : `Drex ${r.drex?.notify ? 'alert' : 'quiet'}`}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-ink-3">Nothing to compare yet — decisions appear as the camera and phone send events.</p>
          )}
          <p className="mt-3 text-xs text-ink-4">Model: {d.model}</p>
        </>
      )}
      {q.isError && <ErrorNote error={q.error} />}
    </Panel>
  );
}

export function BedtimeStory({ patientId, patientName }) {
  const first = firstName(patientName, 'them');
  const q = useQuery({ queryKey: ['story-settings', patientId], queryFn: async () => (await apiClient.get(`/api/patients/${patientId}/story-settings`)).data, enabled: !!patientId });
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: async (at) => (await apiClient.put(`/api/patients/${patientId}/story-settings`, { at })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['story-settings', patientId] }),
  });
  const at = q.data?.at;
  return (
    <Panel title="Bedtime story">
      <p className="text-sm text-ink-2">Every evening a helper writes a few warm sentences about {first}’s own day and her phone reads them to her.</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input type="time" value={at || ''} disabled={!at} onChange={(e) => e.target.value && save.mutate(e.target.value)} className="input w-36" aria-label="Bedtime" />
        <Button onClick={() => save.mutate(at ? null : '21:00')} loading={save.isPending}>{at ? 'Turn off' : 'Turn on (9 pm)'}</Button>
        <span className="text-sm text-ink-3">{at ? `Sent daily at ${at}` : 'Off'}</span>
      </div>
    </Panel>
  );
}

export function Welcome({ name }) {
  const first = firstName(name, '');
  const steps = [
    ['Set up the phone', `Get a pairing code below and type it into ${first}'s phone.`, null],
    ['Add the safe places', 'Home first — alerts start when the phone leaves them.', '/places'],
    ['Invite the family', 'Share a code so others can see the day too.', null],
  ];
  return (
    <div className="mb-6 rounded-[20px] bg-butter p-5">
      <p className="font-serif text-[26px] leading-tight">You're all set up.</p>
      <p className="mt-1 text-sm text-ink-2">Three things make Assist useful for {first}:</p>
      <ol className="mt-4 grid gap-3 sm:grid-cols-3">
        {steps.map(([t, b, to], i) => {
          const inner = (
            <>
              <span className="text-xs font-bold text-ink-3">{i + 1}</span>
              <span className="block text-base font-semibold">{t}</span>
              <span className="block text-sm text-ink-2">{b}</span>
            </>
          );
          return (
            <li key={t} className="rounded-[14px] bg-white/70 p-3">
              {to ? <Link to={to} className="block">{inner}</Link> : inner}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
