import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client.js';
import { Icon, cx } from '../ui';

// Reminiscence (#21): the family's photo album. Each photo gets one line in the family's own words
// ("This is your wedding day, 1974, at St Mary's"). "Show on the phone" sends them as a slow slideshow
// that the phone reads aloud one by one — long-held memories are often the best preserved.

/** Downscales a picked photo to ≤1600 px JPEG in the browser, so uploads stay small. */
async function shrink(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.86);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function FamilyAlbum({ patientId, firstName }) {
  const qc = useQueryClient();
  const album = useQuery({ queryKey: ['memories', patientId], queryFn: async () => (await apiClient.get(`/api/patients/${patientId}/memories`)).data, enabled: Boolean(patientId) });
  const [draft, setDraft] = useState(null); // { image (data URL), caption }
  const [busy, setBusy] = useState(null);
  const [msg, setMsg] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const fileRef = useRef(null);
  const list = album.data || [];
  const here = useRef(null);
  // Opened from the Assistant's "add a few photos" link: bring the album into view.
  useEffect(() => {
    if (window.location.hash === '#album' && !album.isLoading) here.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [album.isLoading]);

  async function pick(e) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setMsg(null);
    try {
      setDraft({ image: await shrink(f), caption: '' });
    } catch {
      setMsg({ ok: false, text: 'That file doesn’t look like a photo.' });
    }
  }

  async function save() {
    setBusy('save');
    try {
      await apiClient.post(`/api/patients/${patientId}/memories`, { image: draft.image, caption: draft.caption }, { timeout: 60000 });
      setDraft(null);
      qc.invalidateQueries({ queryKey: ['memories'] });
    } catch (e) {
      setMsg({ ok: false, text: e?.response?.data?.error || 'Could not add the photo.' });
    } finally {
      setBusy(null);
    }
  }

  async function remove(id) {
    setConfirm(null);
    await apiClient.delete(`/api/patients/${patientId}/memories/${id}`).catch(() => {});
    qc.invalidateQueries({ queryKey: ['memories'] });
  }

  async function play() {
    setBusy('play');
    setMsg(null);
    try {
      const { data } = await apiClient.post(`/api/patients/${patientId}/album`, {});
      setMsg({ ok: true, text: `Sent ${data.slides} photo${data.slides > 1 ? 's' : ''} — ${firstName}’s phone shows them one by one, read aloud.` });
    } catch (e) {
      setMsg({ ok: false, text: e?.response?.data?.error || 'Could not send the album.' });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section id="album" ref={here} className="mb-8 scroll-mt-28 overflow-hidden rounded-[22px] bg-[linear-gradient(135deg,#FFF1E6_0%,#F3ECFB_100%)] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">Reminiscence</p>
          <h2 className="font-serif text-[28px] leading-tight">Family photo album</h2>
          <p className="mt-1 max-w-[62ch] text-[14px] text-ink-2">
            Old photos with a line each, in your own words. {firstName}’s phone shows them full screen, one at a time, and reads each line aloud.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[13px] font-semibold ring-1 ring-black/10 hover:ring-black/25">
            <Icon name="plus" size={14} /> Add a photo
          </button>
          <button type="button" onClick={play} disabled={!list.length || busy === 'play'} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-white hover:bg-black disabled:opacity-40">
            <Icon name="play" size={13} /> {busy === 'play' ? 'Sending…' : `Show on ${firstName}’s phone`}
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pick} />
      </div>

      {msg && <p className={cx('mt-4 rounded-[14px] px-4 py-2.5 text-[13px]', msg.ok ? 'bg-[#EEF8C4]' : 'bg-[#F8D9CF] text-[#9A3B24]')}>{msg.text}</p>}

      {draft && (
        <div className="mt-4 grid gap-4 rounded-[18px] bg-white p-4 sm:grid-cols-[200px_1fr]">
          <img src={draft.image} alt="New photo" className="aspect-square w-full rounded-[14px] object-cover" />
          <div className="flex flex-col">
            <label className="text-[12px] font-semibold text-ink-2" htmlFor="album-caption">What should {firstName} hear?</label>
            <textarea
              id="album-caption"
              value={draft.caption}
              onChange={(e) => setDraft({ ...draft, caption: e.target.value })}
              maxLength={200}
              rows={3}
              autoFocus
              placeholder={`This is your wedding day in 1974, at St Mary’s. You wore your mother’s pearls.`}
              className="mt-1 w-full flex-1 resize-none rounded-[12px] border border-black/10 px-3 py-2 text-[15px] outline-none focus:border-ink"
            />
            <p className="mt-1 text-[11px] text-ink-3">Speak to {firstName} directly, name the people and the place. One or two sentences.</p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={save} disabled={!draft.caption.trim() || busy === 'save'} className="rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-40">
                {busy === 'save' ? 'Adding…' : 'Add to the album'}
              </button>
              <button type="button" onClick={() => setDraft(null)} className="rounded-full px-3 py-2 text-[13px] text-ink-3 hover:text-ink">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {album.isLoading ? (
        <p className="mt-4 text-[13px] text-ink-3">Opening the album…</p>
      ) : list.length ? (
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {list.map((m) => (
            <li key={m.id} className="group overflow-hidden rounded-[16px] bg-white ring-1 ring-black/[0.05]">
              <img src={m.image_url} alt={m.caption} className="aspect-square w-full object-cover" />
              <div className="p-3">
                <p className="line-clamp-3 text-[13px] leading-snug">{m.caption}</p>
                <div className="mt-2 flex items-center justify-between text-[11px] text-ink-3">
                  <span>Added by {m.added_by}</span>
                  {confirm === m.id ? (
                    <span className="flex gap-2">
                      <button type="button" onClick={() => remove(m.id)} className="font-semibold text-act">Remove</button>
                      <button type="button" onClick={() => setConfirm(null)}>Keep</button>
                    </span>
                  ) : (
                    <button type="button" onClick={() => setConfirm(m.id)} className="opacity-0 transition hover:text-act group-hover:opacity-100 focus:opacity-100" aria-label="Remove photo">
                      <Icon name="trash" size={14} />
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : !draft ? (
        <p className="mt-5 rounded-[16px] border border-dashed border-black/15 p-6 text-center text-[13px] text-ink-3">
          No photos yet. Start with one {firstName} knows well — a wedding, a first home, the grandchildren.
        </p>
      ) : null}
    </section>
  );
}
