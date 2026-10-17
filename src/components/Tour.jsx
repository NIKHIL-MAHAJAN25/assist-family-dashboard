import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const seen = (id) => {
  try {
    return localStorage.getItem(`tour:${id}`) === 'done';
  } catch {
    return false;
  }
};
const markSeen = (id) => {
  try {
    localStorage.setItem(`tour:${id}`, 'done');
  } catch {
    /* private window: the tour just shows again next time */
  }
};

const EASE = 'cubic-bezier(.65,0,.35,1)';
const TIP_W = 300;

/**
 * Coachmarks. A welcome card asks first; then the page dims and a spotlight glides between
 * elements marked `data-tour="<target>"`, with a tip beside each. A floating ? replays it.
 * Steps: { target, key, color, title, body } — `{name}` in title/body becomes the patient's name.
 */
export default function Tour({ id, steps, who, name }) {
  const [phase, setPhase] = useState(() => (seen(id) ? 'off' : 'welcome'));
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);
  const [tip, setTip] = useState({ top: 0, left: 0, side: 'right' });
  const tipRef = useRef(null);
  const fill = (s) => s.replaceAll('{name}', name || 'they');

  const step = steps[i];
  const el = () => document.querySelector(`[data-tour="${step?.target}"]`);

  const place = useCallback(() => {
    const node = el();
    if (!node) return;
    const r = node.getBoundingClientRect();
    const pad = 8;
    setRect({ top: r.top - pad, left: r.left - pad, width: r.width + pad * 2, height: r.height + pad * 2 });
    const th = tipRef.current?.offsetHeight || 190;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gap = 18;
    let top;
    let left;
    let side;
    if (vw < 640) {
      // Phones: the tip sits below (or above) the element, full width.
      side = r.bottom + gap + th < vh ? 'bottom' : 'top';
      top = side === 'bottom' ? r.bottom + gap : r.top - gap - th;
      left = 16;
    } else if (r.right + gap + TIP_W < vw) {
      side = 'right';
      left = r.right + gap;
      top = r.top + Math.min(r.height / 2, 110) - 40;
    } else if (r.left - gap - TIP_W > 0) {
      side = 'left';
      left = r.left - gap - TIP_W;
      top = r.top + Math.min(r.height / 2, 110) - 40;
    } else if (r.bottom + gap + th < vh) {
      side = 'bottom';
      top = r.bottom + gap;
      left = r.left + 24;
    } else {
      side = 'top';
      top = r.top - gap - th;
      left = r.left + 24;
    }
    top = Math.max(12, Math.min(top, vh - th - 12));
    left = Math.max(12, Math.min(left, vw - Math.min(TIP_W, vw - 32) - 12));
    setTip({ top, left, side });
  }, [i, step]); // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    if (phase !== 'on') return undefined;
    const node = el();
    if (!node) return undefined;
    node.scrollIntoView({ block: 'center', behavior: 'smooth' });
    place();
    const t = setTimeout(place, 380);
    const t2 = setTimeout(place, 700);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [phase, i, place]); // eslint-disable-line react-hooks/exhaustive-deps

  const end = () => {
    markSeen(id);
    setPhase('off');
  };
  const next = () => (i < steps.length - 1 ? setI(i + 1) : end());
  const back = () => i > 0 && setI(i - 1);
  const start = () => {
    setI(0);
    setPhase('on');
  };

  useEffect(() => {
    if (phase === 'off') return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') end();
      if (phase !== 'on') return;
      if (e.key === 'ArrowRight' || e.key === 'Enter') next();
      if (e.key === 'ArrowLeft') back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const arrow = {
    right: { left: -6, top: 34 },
    left: { right: -6, top: 34 },
    bottom: { top: -6, left: 28 },
    top: { bottom: -6, left: 28 },
  }[tip.side];

  return createPortal(
    <>
      <button
        type="button"
        onClick={start}
        title="Show me around"
        aria-label="Show me around this page"
        className="fixed bottom-24 right-4 z-[950] grid h-11 w-11 place-items-center rounded-full bg-ink text-[17px] font-semibold text-white shadow-lift transition hover:scale-105 lg:bottom-6 lg:right-6"
      >
        ?
      </button>

      {phase === 'welcome' && (
        <div className="fixed inset-0 z-[1200] grid place-items-center bg-ink/60 p-4">
          <div className="w-[380px] max-w-full rounded-[26px] bg-surface p-7 text-center shadow-pop">
            <div className="flex justify-center gap-2">
              <span className="h-9 w-9 rounded-xl bg-sage" />
              <span className="h-9 w-9 rounded-full bg-butter" />
              <span className="h-9 w-9 rounded-xl bg-rose" />
              <span className="h-9 w-9 rounded-full bg-sky" />
            </div>
            <h3 className="mt-4 text-[24px] font-semibold tracking-[-0.03em]">Welcome{who ? `, ${who}` : ''}</h3>
            <p className="mt-2 text-[14px] leading-relaxed text-ink-2">
              This page answers one question first: <b>is {name || 'your person'} okay?</b> Everything else is one glance
              away. Want a 40-second tour?
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <button type="button" onClick={end} className="rounded-full px-5 py-2.5 text-[14px] font-semibold text-ink-3 hover:text-ink">
                Maybe later
              </button>
              <button type="button" onClick={start} className="rounded-full bg-ink px-5 py-2.5 text-[14px] font-semibold text-white">
                Show me around
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === 'on' && rect && (
        <>
          {/* clicks outside the spotlight are swallowed so the tour can't be lost mid-way */}
          <div className="fixed inset-0 z-[1200]" onClick={(e) => e.stopPropagation()} />
          <div
            aria-hidden="true"
            className="pointer-events-none fixed z-[1201] rounded-[26px]"
            style={{
              ...rect,
              boxShadow: '0 0 0 9999px rgba(30,28,26,.62)',
              transition: `all .45s ${EASE}`,
            }}
          >
            <span className="absolute -inset-1.5 animate-[tourpulse_1.8s_ease-out_infinite] rounded-[30px] border-2 border-rose" />
          </div>
          <div
            ref={tipRef}
            role="dialog"
            aria-label={fill(step.title)}
            className="fixed z-[1202] rounded-[20px] bg-surface px-[18px] pb-3.5 pt-[18px] shadow-pop"
            style={{
              top: tip.top,
              left: tip.left,
              width: `min(${TIP_W}px, calc(100vw - 32px))`,
              transition: `top .45s ${EASE}, left .45s ${EASE}`,
            }}
          >
            <span className="absolute h-3.5 w-3.5 rotate-45 rounded-[3px] bg-surface" style={arrow} />
            <button type="button" onClick={end} className="absolute right-3 top-3.5 px-1 text-[12px] text-ink-3 hover:text-ink">
              Skip tour
            </button>
            <span className="inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: step.color }}>
              {i + 1} of {steps.length} · {step.key}
            </span>
            <h4 className="mb-1.5 mt-2.5 text-[17px] font-semibold tracking-[-0.01em]">{fill(step.title)}</h4>
            <p className="text-[13px] leading-relaxed text-ink-2">{fill(step.body)}</p>
            <div className="mt-4 flex items-center gap-2">
              <div className="mr-auto flex gap-[5px]">
                {steps.map((s, j) => (
                  <i
                    key={s.target}
                    className={j === i ? 'h-1.5 w-[18px] rounded-full bg-ink' : 'h-1.5 w-1.5 rounded-full bg-line-strong'}
                    style={{ transition: 'width .3s' }}
                  />
                ))}
              </div>
              {i > 0 && (
                <button type="button" onClick={back} className="rounded-full px-3 py-2 text-[13px] font-semibold text-ink-3 hover:text-ink">
                  Back
                </button>
              )}
              <button type="button" onClick={next} className="rounded-full bg-ink px-3.5 py-2 text-[13px] font-semibold text-white">
                {i === steps.length - 1 ? 'Got it' : 'Next'}
              </button>
            </div>
          </div>
        </>
      )}
    </>,
    document.body
  );
}
