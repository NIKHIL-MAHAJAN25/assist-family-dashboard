import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { login as loginRequest } from '../api/auth.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Icon, Logo, Spinner, cx } from '../ui';

// ---------------------------------------------------------------------------
// The left half is the product itself: a week of someone's life as seven woven
// 24-hour strips. It's illustrative (static, invented), never real data.
// ---------------------------------------------------------------------------

const COLORS = {
  sleep: '#26324A',
  meal: '#60A5FA',
  rest: '#64748B',
  leisure: '#A78BFA',
  out: '#34D399',
  away: '#EF4444',
};

// [start hour, end hour, kind] — each day varies a little, the way real days do.
const BASE = [
  [0, 6.8, 'sleep'], [6.8, 8, 'meal'], [8, 10.2, 'rest'], [10.2, 11.4, 'out'],
  [11.4, 13, 'leisure'], [13, 13.8, 'meal'], [13.8, 16, 'rest'], [16, 16.7, 'meal'],
  [16.7, 19.5, 'leisure'], [19.5, 20.3, 'meal'], [20.3, 22.2, 'leisure'], [22.2, 24, 'sleep'],
];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function dayFor(i) {
  const shift = [0, 0.3, -0.2, 0.1, 0.4, -0.3, 0.2][i];
  const segs = BASE.map(([a, b, k], j) => [
    j === 0 ? 0 : a + shift * (j % 3 === 0 ? 1 : -0.5),
    j === BASE.length - 1 ? 24 : b + shift * ((j + 1) % 3 === 0 ? 1 : -0.5),
    k,
  ]);
  if (i === 3) {
    // Thursday: the walk ran long and went past the safe zones.
    segs.splice(3, 1, [10.2, 10.9, 'out'], [10.9, 11.6, 'away'], [11.6, 12, 'out']);
  }
  if (i === 5) segs.splice(3, 1, [10.2, 12.4, 'out']);
  return segs;
}

const MOMENTS = [
  ['07:42', 'Made breakfast — toast and tea'],
  ['10:15', 'Walked to the park'],
  ['11:02', 'Back home, sitting in the living room'],
  ['13:20', 'Had lunch at the table'],
  ['16:05', 'Remembered 2 of 3 quiz questions'],
  ['18:30', 'Watching television'],
];

function WeekWeave() {
  const days = useMemo(() => DAYS.map((_, i) => dayFor(i)), []);
  const now = new Date();
  const nowPct = ((now.getHours() + now.getMinutes() / 60) / 24) * 100;
  return (
    <div className="relative">
      <div className="space-y-[7px]">
        {days.map((segs, d) => {
          const today = d === 6;
          return (
            <div key={d} className="flex items-center gap-3">
              <span className={cx('w-8 text-[11px] font-semibold uppercase tracking-wider', today ? 'text-white' : 'text-white/35')}>
                {DAYS[d]}
              </span>
              <div className="relative h-[22px] flex-1 overflow-hidden rounded-[5px] bg-white/[0.04]">
                {segs.map(([a, b, k], j) => {
                  const end = today ? Math.min(b, (nowPct / 100) * 24) : b;
                  if (end <= a) return null;
                  return (
                    <span
                      key={j}
                      className="weave-seg absolute inset-y-0"
                      style={{
                        left: `${(a / 24) * 100}%`,
                        width: `calc(${((end - a) / 24) * 100}% - 2px)`,
                        background: COLORS[k],
                        animationDelay: `${d * 90 + j * 35}ms`,
                      }}
                    >
                      {k === 'away' && <span className="weave-ping absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />}
                    </span>
                  );
                })}
                {today && (
                  <span className="absolute inset-y-[-3px] w-[2px] bg-white" style={{ left: `${nowPct}%` }}>
                    <span className="absolute -top-0 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-white" />
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between pl-11 text-[10px] font-medium text-white/30">
        <span>midnight</span>
        <span>6 am</span>
        <span>noon</span>
        <span>6 pm</span>
        <span>midnight</span>
      </div>
    </div>
  );
}

function Ticker() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((x) => (x + 1) % MOMENTS.length), 2600);
    return () => clearInterval(id);
  }, []);
  const [t, text] = MOMENTS[i];
  return (
    <div className="flex h-7 items-center gap-3 overflow-hidden text-[15px]">
      <span className="font-mono text-white/40">{t}</span>
      <span key={i} className="ticker-in text-white/85">
        {text}
      </span>
    </div>
  );
}

const DEMO = { email: 'caregiver@example.com', password: 'caregiver123' };

export default function Login() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (isAuthenticated) return <Navigate to="/today" replace />;

  async function signIn(creds) {
    setError(null);
    setBusy(true);
    try {
      const data = await loginRequest(creds.email.trim(), creds.password);
      login(data.token, data.user);
      navigate('/today', { replace: true });
    } catch (err) {
      setError(
        err?.response?.status === 401
          ? "That email and password don't match."
          : "Can't reach the server. Is the backend running?"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-full bg-[#0B0F17] lg:grid-cols-[1.2fr_1fr]">
      <style>{`
        @keyframes weave-in { from { transform: scaleX(0); opacity: 0 } to { transform: scaleX(1); opacity: 1 } }
        .weave-seg { transform-origin: left; animation: weave-in .7s cubic-bezier(.2,.8,.2,1) both; border-radius: 3px }
        @keyframes ticker-in { from { transform: translateY(70%); opacity: 0 } to { transform: none; opacity: 1 } }
        .ticker-in { animation: ticker-in .45s ease-out both }
        @keyframes weave-ping { 0% { box-shadow: 0 0 0 0 rgba(239,68,68,.7) } 100% { box-shadow: 0 0 0 10px rgba(239,68,68,0) } }
        .weave-ping { animation: weave-ping 1.6s ease-out infinite }
      `}</style>

      {/* The product, as the welcome */}
      <section className="relative hidden flex-col overflow-hidden px-14 py-12 text-white lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_20%_10%,rgba(96,165,250,0.12),transparent),radial-gradient(50%_40%_at_90%_90%,rgba(52,211,153,0.10),transparent)]" />
        <div className="relative flex items-center gap-2.5">
          <Logo size={28} inverse />
          <span className="text-lg font-bold">Assist</span>
        </div>

        <div className="relative my-auto max-w-[640px]">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-emerald-300/80">
            One week, quietly understood
          </p>
          <h1 className="text-[46px] font-bold leading-[1.05] tracking-[-0.035em]">
            You can't be there
            <br />
            every hour.
            <span className="block text-white/40">Now you don't have to guess.</span>
          </h1>

          <div className="mt-12 rounded-xl border border-white/[0.08] bg-white/[0.025] p-6 backdrop-blur-sm">
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm font-semibold text-white/80">Margaret's week</p>
              <div className="flex gap-3 text-[11px] text-white/45">
                {[['sleep', 'Sleep'], ['meal', 'Meals'], ['out', 'Out'], ['leisure', 'TV & radio']].map(([k, l]) => (
                  <span key={k} className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-sm" style={{ background: COLORS[k] }} />
                    {l}
                  </span>
                ))}
              </div>
            </div>
            <WeekWeave />
            <p className="mt-4 flex items-center gap-2 text-[13px] text-white/60">
              <span className="h-2 w-2 rounded-full bg-[#EF4444]" />
              Thursday, 10:54 — walked past the safe zones. Family was alerted; back home in 42 minutes.
            </p>
            <div className="mt-6 border-t border-white/[0.07] pt-4">
              <Ticker />
            </div>
          </div>
        </div>

        <p className="relative text-xs text-white/35">
          Camera and watch readings, turned into plain sentences. Illustrative data.
        </p>
      </section>

      {/* Sign in */}
      <main className="flex items-center justify-center bg-surface px-6 py-12 lg:rounded-l-[28px]">
        <div className="w-full max-w-[360px]">
          <div className="mb-10 flex items-center gap-2.5 lg:hidden">
            <Logo size={28} />
            <span className="text-lg font-bold">Assist</span>
          </div>

          <h2 className="text-[32px] font-bold leading-tight tracking-[-0.02em]">Welcome back</h2>
          <p className="mt-2 text-md text-ink-3">Check in on the people you care for.</p>

          <form
            className="mt-9 space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              signIn({ email, password });
            }}
          >
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-ink-2">Email</span>
              <input
                className="input h-12 text-md"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@family.com"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-ink-2">Password</span>
              <span className="relative block">
                <input
                  className="input h-12 pr-16 text-md"
                  type={show ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute inset-y-0 right-3 text-sm font-semibold text-ink-3 hover:text-ink"
                >
                  {show ? 'Hide' : 'Show'}
                </button>
              </span>
            </label>

            {error && (
              <p className="flex items-center gap-2 text-sm text-act">
                <Icon name="warning" size={15} /> {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="group flex h-12 w-full items-center justify-center gap-2 rounded-md bg-ink text-md font-semibold text-white transition hover:bg-ink-2 disabled:opacity-60"
            >
              {busy ? <Spinner /> : 'Sign in'}
              {!busy && <Icon name="chevronRight" size={17} className="transition group-hover:translate-x-0.5" />}
            </button>
          </form>

          <div className="my-7 flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-ink-4">
            <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setEmail(DEMO.email);
              setPassword(DEMO.password);
              signIn(DEMO);
            }}
            className="flex w-full items-center gap-3 rounded-md border border-line-strong p-3 text-left transition hover:border-ink-4 hover:bg-subtle"
          >
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#E0E7FF] text-sm font-bold text-[#3730A3]">M</span>
            <span className="flex-1">
              <span className="block text-base font-semibold">Use the demo account</span>
              <span className="block text-sm text-ink-3">See a day with Margaret, including one incident</span>
            </span>
            <Icon name="chevronRight" size={17} className="text-ink-3" />
          </button>

          <p className="mt-10 text-sm text-ink-3">
            New here? Accounts are set up by the person's care coordinator — ask them for an invite.
          </p>
        </div>
      </main>
    </div>
  );
}
