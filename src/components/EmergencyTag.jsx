import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchTag, rotateTag, updateTag } from '../api/tag.js';
import { Button, ErrorNote, Field, Icon, Loading, Panel, cx } from '../ui';

const EMPTY = { name: '', relation: '', phone: '' };

/**
 * The emergency NFC tag: what a stranger sees when they tap it, and the link to write onto the
 * sticker (with a QR fallback for phones without NFC).
 */
export default function EmergencyTag({ patientId, patientName }) {
  const qc = useQueryClient();
  const tag = useQuery({ queryKey: ['tag', patientId], queryFn: () => fetchTag(patientId), enabled: Boolean(patientId) });
  const [form, setForm] = useState(null);
  const [qr, setQr] = useState(null);
  const [copied, setCopied] = useState(false);
  const [confirmRotate, setConfirmRotate] = useState(false);

  useEffect(() => {
    if (!tag.data) return;
    setForm({
      note: tag.data.note || '',
      home_label: tag.data.home_label || '',
      show_home: tag.data.show_home,
      contacts: tag.data.contacts.length ? tag.data.contacts.map((c) => ({ ...EMPTY, ...c, relation: c.relation || '' })) : [{ ...EMPTY }],
    });
    QRCode.toDataURL(tag.data.url, { margin: 1, width: 360, color: { dark: '#2A2622', light: '#FBF9F6' } }).then(setQr);
  }, [tag.data]);

  const save = useMutation({
    mutationFn: () =>
      updateTag(patientId, {
        note: form.note,
        home_label: form.home_label,
        show_home: form.show_home,
        contacts: form.contacts.filter((c) => c.name.trim() && c.phone.trim()),
      }),
    onSuccess: (data) => qc.setQueryData(['tag', patientId], data),
  });
  const rotate = useMutation({
    mutationFn: () => rotateTag(patientId),
    onSuccess: (data) => { qc.setQueryData(['tag', patientId], data); setConfirmRotate(false); },
  });

  if (tag.isLoading || !form) return <Panel title="Emergency tag"><Loading /></Panel>;
  if (tag.isError) return <Panel title="Emergency tag"><ErrorNote error={tag.error} /></Panel>;

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); save.reset(); };
  const setContact = (i, k, v) => set('contacts', form.contacts.map((c, j) => (j === i ? { ...c, [k]: v } : c)));
  const dirty = JSON.stringify(form) !== JSON.stringify({
    note: tag.data.note || '', home_label: tag.data.home_label || '', show_home: tag.data.show_home,
    contacts: tag.data.contacts.length ? tag.data.contacts.map((c) => ({ ...EMPTY, ...c, relation: c.relation || '' })) : [{ ...EMPTY }],
  });
  const local = /localhost|127\.0\.0\.1|192\.168\.|10\.\d+\./.test(tag.data.url);

  return (
    <Panel title="Emergency tag" className="lg:col-span-2" action={<span className="text-sm text-ink-3">If {patientName || 'they'} gets lost</span>}>
      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        {/* The link, as a sticker would carry it */}
        <div>
          <div className="glass rounded-2xl p-4 text-center">
            {qr && <img src={qr} alt="QR code for the emergency page" className="mx-auto w-full max-w-[220px] rounded-xl" />}
            <p className="mt-3 truncate font-mono text-xs text-ink-3" title={tag.data.url}>{tag.data.url}</p>
            <div className="mt-3 flex justify-center gap-2">
              <Button size="sm" icon={copied ? 'check' : 'copy'} onClick={() => { navigator.clipboard?.writeText(tag.data.url); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
                {copied ? 'Copied' : 'Copy link'}
              </Button>
              <a href={tag.data.url} target="_blank" rel="noreferrer"><Button size="sm" variant="ghost" icon="info">Preview</Button></a>
            </div>
          </div>
          {local && (
            <p className="mt-3 flex gap-2 text-xs text-watch">
              <Icon name="warning" size={14} className="mt-0.5 shrink-0" />
              This link only works on your own network. Set PUBLIC_BASE_URL on the server to a public address before writing the sticker.
            </p>
          )}
          <ol className="mt-4 space-y-1.5 text-sm text-ink-3">
            <li>1. Install <strong className="text-ink-2">NFC Tools</strong> on an Android phone.</li>
            <li>2. Write → Add a record → URL → paste the link.</li>
            <li>3. Hold the sticker to the back of the phone. Done.</li>
          </ol>
          <div className="mt-4">
            {confirmRotate ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-ink-2">Old sticker stops working.</span>
                <Button size="sm" variant="ghost" onClick={() => setConfirmRotate(false)}>Keep</Button>
                <Button size="sm" variant="danger" loading={rotate.isPending} onClick={() => rotate.mutate()}>New link</Button>
              </div>
            ) : (
              <button type="button" className="text-sm font-semibold text-ink-3 hover:text-ink" onClick={() => setConfirmRotate(true)}>
                Sticker lost? Make a new link
              </button>
            )}
          </div>
        </div>

        {/* What a stranger sees */}
        <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
          <Field label="Message to whoever finds them" hint="Shown first, in large type. Only the first name is ever shown.">
            <textarea className="input min-h-[84px] resize-y" maxLength={400} value={form.note} onChange={(e) => set('note', e.target.value)} />
          </Field>

          <div>
            <p className="label">Who to call</p>
            <div className="space-y-2">
              {form.contacts.map((c, i) => (
                <div key={i} className="grid grid-cols-[1fr_110px_1fr_auto] gap-2">
                  <input className="input" placeholder="Name" value={c.name} onChange={(e) => setContact(i, 'name', e.target.value)} />
                  <input className="input" placeholder="Relation" value={c.relation} onChange={(e) => setContact(i, 'relation', e.target.value)} />
                  <input className="input" placeholder="+91 …" inputMode="tel" value={c.phone} onChange={(e) => setContact(i, 'phone', e.target.value)} />
                  <button type="button" aria-label="Remove contact" className="grid w-9 place-items-center rounded text-ink-4 hover:text-act"
                    onClick={() => set('contacts', form.contacts.length > 1 ? form.contacts.filter((_, j) => j !== i) : [{ ...EMPTY }])}>
                    <Icon name="x" size={16} />
                  </button>
                </div>
              ))}
            </div>
            {form.contacts.length < 5 && (
              <button type="button" className="mt-2 text-sm font-semibold text-accent" onClick={() => set('contacts', [...form.contacts, { ...EMPTY }])}>
                + Add someone
              </button>
            )}
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input type="checkbox" className="h-4 w-4 accent-[#2A2622]" checked={form.show_home} onChange={(e) => set('show_home', e.target.checked)} />
              <span className="text-base text-ink-2">Show directions home</span>
            </label>
            <div className={cx(!form.show_home && 'pointer-events-none opacity-40')}>
              <Field label="Area to show" hint={tag.data.has_home_zone ? 'Directions use the “Home” safe place. Show an area, not the full address.' : 'Add a safe place called “Home” for directions to work.'}>
                <input className="input" placeholder="e.g. Indiranagar, Bengaluru" value={form.home_label} onChange={(e) => set('home_label', e.target.value)} />
              </Field>
            </div>
          </div>

          {save.isError && <ErrorNote error={save.error} />}
          <div className="flex items-center gap-3">
            <Button type="submit" variant="primary" disabled={!dirty} loading={save.isPending}>Save</Button>
            {save.isSuccess && !dirty && <span className="flex items-center gap-1.5 text-sm text-ok"><Icon name="check" size={15} /> Saved — the sticker shows this now</span>}
          </div>
        </form>
      </div>
    </Panel>
  );
}
