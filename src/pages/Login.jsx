import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { login as loginRequest } from '../api/auth.js';
import { useAuth } from '../context/AuthContext.jsx';
import { CATEGORIES } from '../lib/story.js';
import { Button, ErrorNote, Field, Icon, Logo } from '../ui';

// A decorative, static day so the sign-in screen shows what the product actually does.
const DEMO_DAY = [
  [7, 8.2, 'meal'],
  [8.2, 10.5, 'leisure'],
  [10.5, 11.6, 'out'],
  [11.6, 12.1, 'unseen'],
  [12.1, 13, 'out'],
  [13, 14.6, 'meal'],
  [14.6, 17.5, 'leisure'],
  [17.5, 18.4, 'rest'],
];

function DemoRibbon() {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.04] p-4">
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="font-semibold text-white">Margaret's Tuesday</span>
        <span className="flex items-center gap-1.5 text-white/60">
          <span className="h-2 w-2 rounded-full bg-emerald-400" /> At home
        </span>
      </div>
      <div className="relative h-7 rounded bg-white/[0.06]">
        {DEMO_DAY.map(([a, b, c], i) => (
          <span
            key={i}
            className="absolute inset-y-0"
            style={{
              left: `${(a / 24) * 100}%`,
              width: `${((b - a) / 24) * 100}%`,
              background: CATEGORIES[c].color,
              opacity: c === 'unseen' ? 1 : 0.85,
            }}
          />
        ))}
        <span className="absolute inset-y-[-4px] w-0.5 bg-white" style={{ left: `${(18.4 / 24) * 100}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-white/40">
        <span>12a</span>
        <span>6a</span>
        <span>12p</span>
        <span>6p</span>
        <span>12a</span>
      </div>
    </div>
  );
}

export default function Login() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (isAuthenticated) return <Navigate to="/today" replace />;

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const data = await loginRequest(email.trim(), password);
      login(data.token, data.user);
      navigate('/today', { replace: true });
    } catch (err) {
      setError(
        err?.response?.status === 401
          ? "That email and password don't match."
          : 'Could not reach the server. Is the backend running?'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-full lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-ink p-12 text-white lg:flex">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-[radial-gradient(closest-side,rgba(52,211,153,0.16),transparent)]" />
        <div className="flex items-center gap-2.5">
          <Logo size={30} inverse />
          <span className="text-xl font-bold">Assist</span>
        </div>
        <div className="relative max-w-[520px]">
          <h1 className="text-[44px] font-bold leading-[1.08] tracking-[-0.03em]">
            Know they're okay
            <br />
            <span className="text-white/50">without hovering.</span>
          </h1>
          <p className="mt-5 text-lg text-white/70">
            A home camera and a watch turn the day into plain sentences. You hear about it only when
            something actually needs you.
          </p>
          <div className="mt-10">
            <DemoRibbon />
          </div>
          <ul className="mt-8 grid grid-cols-3 gap-5 text-sm text-white/70">
            {[
              ['shield', 'Alerts when they leave the places you draw'],
              ['spark', 'A daily memory quiz from what really happened'],
              ['camera', 'Photos expire after 7 days unless you keep them'],
            ].map(([icon, text]) => (
              <li key={text}>
                <Icon name={icon} size={20} className="mb-2 text-emerald-300" />
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-white/40">For families caring for someone with memory loss.</p>
      </aside>

      <main className="flex items-center justify-center bg-surface px-6 py-12">
        <form onSubmit={submit} className="w-full max-w-[380px]">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <Logo size={30} />
            <span className="text-xl font-bold">Assist</span>
          </div>
          <h2 className="text-2xl font-bold tracking-[-0.01em]">Sign in</h2>
          <p className="mt-1 text-md text-ink-3">Use your family caregiver account.</p>
          <div className="mt-8 space-y-4">
            <Field label="Email">
              <input
                className="input h-11"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </Field>
            <Field label="Password">
              <input
                className="input h-11"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            {error && <ErrorNote>{error}</ErrorNote>}
            <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy}>
              Sign in
            </Button>
          </div>
          <p className="mt-8 rounded border border-line bg-subtle px-3 py-2.5 text-sm text-ink-3">
            Demo account: <span className="font-semibold text-ink-2">caregiver@example.com</span> /{' '}
            <span className="font-semibold text-ink-2">caregiver123</span>
          </p>
        </form>
      </main>
    </div>
  );
}
