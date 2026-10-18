import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { formatTime } from '../utils/datetime.js';
import { Icon, cx } from '../ui';

// Family notifications: polls the feed (alerts, Margaret's answers, failed actions, family notes),
// shows a bell with unread count, a toast for anything new, and a real desktop notification when
// the browser allows it — so an alert reaches you even with the tab in the background.

const SEEN = (pid) => `notif-seen:${pid}`;
const KIND = {
  alert: { icon: 'warning', tone: 'bg-[#F8D9CF] text-[#9A3B24]' },
  reply: { icon: 'spark', tone: 'bg-[#EAF4FF] text-ink' },
  failed: { icon: 'info', tone: 'bg-[#F8EBD0] text-[#8A5A12]' },
  note: { icon: 'people', tone: 'bg-[#EEF8C4] text-ink' },
};

function readSeen(pid) {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN(pid)) || '[]'));
  } catch {
    return new Set();
  }
}
function writeSeen(pid, set) {
  try {
    localStorage.setItem(SEEN(pid), JSON.stringify([...set].slice(-300)));
  } catch {
    /* private window */
  }
}

export function useNotificationFeed() {
  const { user } = useAuth();
  const pid = user?.patient_id;
  const q = useQuery({
    queryKey: ['notifications', pid],
    queryFn: async () => (await apiClient.get(`/api/patients/${pid}/notifications`)).data.items,
    enabled: Boolean(pid),
    refetchInterval: 8000,
    refetchIntervalInBackground: true,
  });
  return { pid, items: q.data || [] };
}

export default function NotificationCenter() {
  const { pid, items } = useNotificationFeed();
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(() => (pid ? readSeen(pid) : new Set()));
  const [toasts, setToasts] = useState([]);
  const announced = useRef(null); // ids already present when the page loaded are not re-announced
  const [perm, setPerm] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported');
  const box = useRef(null);

  // Announce new items: toast + desktop notification (own notes are never announced to yourself).
  useEffect(() => {
    if (!items.length) return;
    if (announced.current === null) {
      announced.current = new Set(items.map((i) => i.id));
      return;
    }
    const fresh = items.filter((i) => !announced.current.has(i.id) && !i.mine);
    items.forEach((i) => announced.current.add(i.id));
    if (!fresh.length) return;
    setToasts((t) => [...fresh.slice(0, 3).map((i) => ({ ...i, key: `${i.id}-${Date.now()}` })), ...t].slice(0, 4));
    if (perm === 'granted') {
      fresh.slice(0, 3).forEach((i) => {
        try {
          const n = new Notification(i.title, { body: i.body, tag: i.id, requireInteraction: i.kind === 'alert' });
          n.onclick = () => window.focus();
        } catch {
          /* some browsers only allow notifications from a service worker */
        }
      });
    }
  }, [items, perm]);

  // Answers and notes fade after 9 s; alerts stay until dismissed.
  useEffect(() => {
    const fading = [...toasts].reverse().find((t) => t.kind !== 'alert');
    if (!fading) return undefined;
    const id = setTimeout(() => setToasts((t) => t.filter((x) => x.key !== fading.key)), 9000);
    return () => clearTimeout(id);
  }, [toasts]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => box.current && !box.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const unread = items.filter((i) => !seen.has(i.id) && !i.mine).length;
  function openPanel() {
    setOpen((o) => !o);
    if (!open && pid) {
      const next = new Set([...seen, ...items.map((i) => i.id)]);
      setSeen(next);
      writeSeen(pid, next);
    }
  }
  async function allow() {
    if (typeof Notification === 'undefined') return;
    setPerm(await Notification.requestPermission());
  }

  return (
    <>
      <div ref={box} className="relative">
        <button
          type="button"
          onClick={openPanel}
          aria-label={unread ? `${unread} new notifications` : 'Notifications'}
          className="relative grid h-10 w-10 place-items-center rounded-full text-ink transition hover:bg-black/[0.05]"
        >
          <Icon name="bell" size={16} />
          {unread > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#E5533D] px-1 text-[9px] font-semibold text-white">{unread > 9 ? '9+' : unread}</span>}
        </button>
        {open && (
          <div className="absolute right-0 top-12 z-[950] w-[360px] max-w-[calc(100vw-24px)] overflow-hidden rounded-[20px] bg-paper shadow-[0_24px_60px_-20px_rgba(20,30,50,0.45)] ring-1 ring-black/[0.06]">
            <div className="flex items-center justify-between px-4 py-3">
              <p className="font-serif text-[18px]">Notifications</p>
              {perm === 'default' && (
                <button type="button" onClick={allow} className="rounded-full bg-ink px-3 py-1 text-[11px] font-semibold text-white">Get desktop alerts</button>
              )}
              {perm === 'denied' && <span className="text-[11px] text-ink-3">Desktop alerts blocked in this browser</span>}
              {perm === 'granted' && <span className="text-[11px] text-ink-3">Desktop alerts on</span>}
            </div>
            <ul className="no-scrollbar max-h-[420px] overflow-y-auto px-2 pb-2">
              {items.length === 0 && <li className="px-3 py-6 text-center text-[13px] text-ink-3">Nothing in the last 24 hours.</li>}
              {items.map((i) => (
                <li key={i.id} className="flex gap-3 rounded-[14px] px-2 py-2.5 hover:bg-black/[0.03]">
                  <span className={cx('grid h-8 w-8 shrink-0 place-items-center rounded-full', KIND[i.kind]?.tone)}><Icon name={KIND[i.kind]?.icon || 'dot'} size={14} /></span>
                  <div className="min-w-0 flex-1">
                    <p className={cx('text-[13px] leading-snug', !seen.has(i.id) && !i.mine ? 'font-semibold' : '')}>{i.title}</p>
                    {i.body && <p className="mt-0.5 line-clamp-2 text-[12px] text-ink-3">{i.body}</p>}
                    <p className="mt-0.5 text-[11px] text-ink-4">{formatTime(new Date(i.at))}{i.kind === 'alert' && i.acknowledged ? ' · seen' : ''}</p>
                  </div>
                </li>
              ))}
            </ul>
            <Link to="/log?show=flagged" onClick={() => setOpen(false)} className="block border-t border-black/[0.05] px-4 py-2.5 text-center text-[12px] font-semibold text-ink-2 hover:bg-black/[0.03]">
              See all alerts in the log
            </Link>
          </div>
        )}
      </div>

      {/* toasts */}
      <div className="pointer-events-none fixed bottom-24 right-4 z-[1000] flex w-[340px] max-w-[calc(100vw-32px)] flex-col gap-2 lg:bottom-6">
        {toasts.map((t) => (
          <div key={t.key} className="toast-in pointer-events-auto flex gap-3 rounded-[18px] bg-paper p-3.5 shadow-[0_20px_50px_-18px_rgba(20,30,50,0.5)] ring-1 ring-black/[0.06]">
            <span className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-full', KIND[t.kind]?.tone)}><Icon name={KIND[t.kind]?.icon || 'dot'} size={15} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-semibold leading-snug">{t.title}</p>
              {t.body && <p className="mt-0.5 line-clamp-2 text-[12px] text-ink-3">{t.body}</p>}
            </div>
            <button type="button" aria-label="Dismiss" onClick={() => setToasts((x) => x.filter((y) => y.key !== t.key))} className="self-start text-ink-3 hover:text-ink">
              <Icon name="x" size={14} />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
