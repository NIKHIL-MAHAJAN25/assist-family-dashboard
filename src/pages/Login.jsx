import React, { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { login as loginRequest } from '../api/auth';
import { useAuth } from '../context/AuthContext.jsx';
import { Button, Field, Icon, Brandmark, ErrorBanner } from '../ui';

// Reference screen for the Assist Sage system. Two motifs carried straight
// from SellerApp's activity_login.xml: the display headline stacked across
// its own lines ("Hey, / Welcome / Back"), and pill text fields on a muted
// sage fill with no visible stroke until focus.

const PROMISES = [
  { icon: 'timeline', text: 'A plain-language record of the day, not raw camera footage.' },
  { icon: 'shield', text: 'Safe zones you draw yourself, with an alert only when they matter.' },
  { icon: 'spark', text: 'A daily recall quiz built from what actually happened.' },
];

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const mutation = useMutation({
    mutationFn: () => loginRequest(email, password),
    onSuccess: (data) => {
      login(data.token, data.user);
      const redirectTo = location.state?.from?.pathname || '/today';
      navigate(redirectTo, { replace: true });
    },
  });

  if (isAuthenticated) {
    return <Navigate to="/today" replace />;
  }

  function handleSubmit(e) {
    e.preventDefault();
    mutation.mutate();
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-paper px-4 py-8 sm:px-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(60rem 30rem at 15% 0%, rgba(105,139,106,0.16), transparent 60%), radial-gradient(45rem 28rem at 95% 100%, rgba(220,226,216,0.85), transparent 65%)',
        }}
      />

      <div className="relative grid w-full max-w-[1020px] overflow-hidden rounded-panel border border-line bg-surface shadow-lift lg:grid-cols-[1.02fr_1fr]">
        {/* Editorial panel. The one deeply saturated surface in the product —
            it exists so the sign-in page has a colour anchor, and it never
            reappears once you're inside. */}
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-sage-900 p-11 text-paper lg:flex">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(28rem 22rem at 85% 8%, rgba(175,196,174,0.30), transparent 62%)',
            }}
          />
          <div className="relative">
            <Brandmark size={52} />
            <p className="mt-6 text-[12px] font-bold uppercase tracking-[0.18em] text-sage-300">
              Assist
            </p>
            <p className="mt-3 font-display text-[30px] font-semibold leading-[1.18] tracking-tight">
              Quietly watching over
              <br />
              someone you love.
            </p>
          </div>

          <ul className="relative mt-10 space-y-5">
            {PROMISES.map((item) => (
              <li key={item.text} className="flex items-start gap-3.5">
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-white/10 text-sage-200">
                  <Icon name={item.icon} size={18} />
                </span>
                <p className="text-[14.5px] leading-relaxed text-sage-100/90">{item.text}</p>
              </li>
            ))}
          </ul>

          <p className="relative mt-10 text-[12.5px] leading-relaxed text-sage-300/80">
            Built around one person: someone with mild-to-moderate memory impairment, living
            semi-independently.
          </p>
        </aside>

        {/* Form */}
        <div className="flex flex-col justify-center p-8 sm:p-11">
          <div className="mb-8 lg:hidden">
            <Brandmark size={44} />
          </div>

          <h1 className="font-display text-[42px] font-semibold leading-[1.04] tracking-tight text-ink sm:text-[46px]">
            Welcome
            <br />
            back.
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-faint">
            Sign in with your caregiver account.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
            <Field
              label="Email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="caregiver@example.com"
            />
            <Field
              label="Password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />

            {mutation.isError && (
              <ErrorBanner
                error={mutation.error}
                label="We couldn't sign you in"
              />
            )}

            <Button
              type="submit"
              size="lg"
              loading={mutation.isPending}
              className="w-full"
              iconAfter={mutation.isPending ? undefined : 'chevronRight'}
            >
              {mutation.isPending ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-7 flex items-start gap-2.5 rounded-card bg-surface-sunken px-4 py-3 text-[13px] leading-relaxed text-ink-faint">
            <span className="mt-px shrink-0 text-sage-700">
              <Icon name="info" size={16} />
            </span>
            This dashboard is for family caregivers. If you're the person the system looks after,
            use the companion app on your phone instead.
          </p>
        </div>
      </div>
    </div>
  );
}
