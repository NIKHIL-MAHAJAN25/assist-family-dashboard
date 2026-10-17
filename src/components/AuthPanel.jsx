import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login as loginRequest } from '../api/auth.js';
import { joinWithInvite, previewInvite, prettyCode, signup } from '../api/accounts.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Icon, Logo, Spinner } from '../ui';

const DEMO = { email: 'caregiver@example.com', password: 'caregiver123' };

function serverError(err, fallback) {
  if (!err?.response) return "Can't reach the server. Is the backend running?";
  return err.response.data?.error || fallback;
}

function Input({ label, hint, ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink-2">{label}</span>
      <input className="input h-12 text-md" {...props} />
      {hint && <span className="mt-1 block text-xs text-ink-3">{hint}</span>}
    </label>
  );
}

function Password({ value, onChange, autoComplete, label = 'Password', hint }) {
  const [show, setShow] = useState(false);
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink-2">{label}</span>
      <span className="relative block">
        <input
          className="input h-12 pr-16 text-md"
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          required
          minLength={autoComplete === 'new-password' ? 8 : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button type="button" onClick={() => setShow((s) => !s)} className="absolute inset-y-0 right-3 text-sm font-semibold text-ink-3 hover:text-ink">
          {show ? 'Hide' : 'Show'}
        </button>
      </span>
      {hint && <span className="mt-1 block text-xs text-ink-3">{hint}</span>}
    </label>
  );
}

function Submit({ busy, children }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="group flex h-12 w-full items-center justify-center gap-2 rounded-md bg-ink text-md font-semibold text-white transition hover:bg-ink-2 disabled:opacity-60"
    >
      {busy ? <Spinner /> : children}
      {!busy && <Icon name="chevronRight" size={17} className="transition group-hover:translate-x-0.5" />}
    </button>
  );
}

function ErrorLine({ error }) {
  if (!error) return null;
  return (
    <p className="flex items-center gap-2 text-sm text-act">
      <Icon name="warning" size={15} /> {error}
    </p>
  );
}

function Switch({ children, onClick }) {
  return (
    <button type="button" onClick={onClick} className="font-semibold text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink">
      {children}
    </button>
  );
}

/**
 * The right half of the login page: sign in, create an account (caregiver + the person they look
 * after), or join an existing family circle with an invite code. /join/:code opens the last one.
 */
export default function AuthPanel({ initialMode = 'signin', initialCode = '' }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState(initialMode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [patientName, setPatientName] = useState('');
  const [dob, setDob] = useState('');
  const [code, setCode] = useState(initialCode);
  const [invite, setInvite] = useState(null);

  // Look the code up as it's typed, so the form can say whose circle it joins.
  useEffect(() => {
    if (mode !== 'join') return undefined;
    const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setInvite(null);
    if (clean.length !== 6) return undefined;
    let live = true;
    previewInvite(clean)
      .then((d) => live && (setInvite(d), setError(null)))
      .catch((e) => live && setError(serverError(e, 'That code is not valid')));
    return () => {
      live = false;
    };
  }, [code, mode]);

  function go(next) {
    setMode(next);
    setError(null);
  }

  async function run(fn) {
    setError(null);
    setBusy(true);
    try {
      const data = await fn();
      login(data.token, data.user);
      navigate(mode === 'signin' ? '/today' : '/settings?welcome=1', { replace: true });
    } catch (err) {
      setError(
        mode === 'signin' && err?.response?.status === 401
          ? "That email and password don't match."
          : serverError(err, 'Something went wrong — try again.')
      );
    } finally {
      setBusy(false);
    }
  }

  const header = {
    signin: ['Welcome back', 'Check in on the people you care for.'],
    signup: ['Create your account', "You'll set up the person you look after, then invite the rest of the family."],
    join: ['Join your family', 'Enter the code someone in the family shared with you.'],
  }[mode];

  return (
    <div className="w-full max-w-[380px]">
      <div className="mb-10 flex items-center gap-2.5 lg:hidden">
        <Logo size={28} />
        <span className="text-lg font-bold">Assist</span>
      </div>

      <h2 className="text-[32px] font-bold leading-tight tracking-[-0.02em]">{header[0]}</h2>
      <p className="mt-2 text-md text-ink-3">{header[1]}</p>

      {mode === 'signin' && (
        <>
          <form className="mt-9 space-y-5" onSubmit={(e) => { e.preventDefault(); run(() => loginRequest(email.trim(), password)); }}>
            <Input label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@family.com" />
            <Password value={password} onChange={setPassword} autoComplete="current-password" />
            <ErrorLine error={error} />
            <Submit busy={busy}>Sign in</Submit>
          </form>

          <div className="my-7 flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-ink-4">
            <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={() => { setEmail(DEMO.email); setPassword(DEMO.password); run(() => loginRequest(DEMO.email, DEMO.password)); }}
            className="flex w-full items-center gap-3 rounded-md border border-line-strong p-3 text-left transition hover:border-ink-4 hover:bg-subtle"
          >
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#E0E7FF] text-sm font-bold text-[#3730A3]">M</span>
            <span className="flex-1">
              <span className="block text-base font-semibold">Use the demo account</span>
              <span className="block text-sm text-ink-3">See a day with Margaret, including one incident</span>
            </span>
            <Icon name="chevronRight" size={17} className="text-ink-3" />
          </button>

          <div className="mt-8 grid grid-cols-2 gap-3">
            <button type="button" onClick={() => go('signup')} className="rounded-md border border-line p-3 text-left transition hover:border-ink-4 hover:bg-subtle">
              <span className="block text-sm font-semibold">New here?</span>
              <span className="block text-xs text-ink-3">Create an account</span>
            </button>
            <button type="button" onClick={() => go('join')} className="rounded-md border border-line p-3 text-left transition hover:border-ink-4 hover:bg-subtle">
              <span className="block text-sm font-semibold">Got a code?</span>
              <span className="block text-xs text-ink-3">Join your family</span>
            </button>
          </div>
        </>
      )}

      {mode === 'signup' && (
        <form
          className="mt-8 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => signup({ name: name.trim(), email: email.trim(), password, patient_name: patientName.trim(), patient_dob: dob || undefined }));
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-4">The person you look after</p>
          <Input label="Their name" required value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="e.g. Margaret Lewis" />
          <Input label="Date of birth" type="date" value={dob} onChange={(e) => setDob(e.target.value)} hint="Optional" />
          <p className="pt-2 text-xs font-semibold uppercase tracking-wider text-ink-4">You</p>
          <Input label="Your name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Password value={password} onChange={setPassword} autoComplete="new-password" hint="At least 8 characters" />
          <ErrorLine error={error} />
          <Submit busy={busy}>Create account</Submit>
          <p className="pt-2 text-sm text-ink-3">
            Already have an account? <Switch onClick={() => go('signin')}>Sign in</Switch>
          </p>
        </form>
      )}

      {mode === 'join' && (
        <form
          className="mt-8 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => joinWithInvite({ code, name: name.trim(), email: email.trim(), password }));
          }}
        >
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-ink-2">Invite code</span>
            <input
              className="input h-14 text-center font-mono text-2xl uppercase tracking-[0.3em]"
              required
              maxLength={7}
              value={code.length === 6 && !code.includes('-') ? prettyCode(code.toUpperCase()) : code.toUpperCase()}
              onChange={(e) => setCode(e.target.value)}
              placeholder="ABC-123"
              autoFocus={!initialCode}
            />
          </label>
          {invite && (
            <div className="flex items-center gap-3 rounded-md bg-ok-soft p-3 text-sm text-ok">
              <Icon name="check" size={17} />
              <span>
                {invite.invited_by} invited you to help look after <strong>{invite.patient_first_name}</strong>.
              </span>
            </div>
          )}
          <Input label="Your name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Password value={password} onChange={setPassword} autoComplete="new-password" hint="At least 8 characters" />
          <ErrorLine error={error} />
          <Submit busy={busy}>Join</Submit>
          <p className="pt-2 text-sm text-ink-3">
            Already have an account? <Switch onClick={() => go('signin')}>Sign in</Switch>
          </p>
        </form>
      )}
    </div>
  );
}
