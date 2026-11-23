'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  role: string;
};

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('demo.admin@rtinfra.local');
  const [password, setPassword] = useState('1234');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const isEmail = identifier.includes('@');
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [isEmail ? 'email' : 'mobile']: identifier.trim(),
          password,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError('The email/mobile number or password is incorrect.');
        } else if (response.status === 404) {
          setError('The sign-in service is not configured on this API. Contact your administrator.');
        } else if (response.status >= 500) {
          setError('Sign-in is temporarily unavailable. Please try again shortly.');
        } else {
          setError('Please check your details and try again.');
        }
        return;
      }

      const result = await response.json() as LoginResponse;
      if (!result.accessToken || !result.refreshToken) {
        setError('The sign-in service returned an invalid response. Please contact your administrator.');
        return;
      }

      sessionStorage.setItem('accessToken', result.accessToken);
      sessionStorage.setItem('refreshToken', result.refreshToken);
      sessionStorage.setItem('userRole', result.role);
      sessionStorage.setItem('userEmail', identifier.trim());
      router.replace('/dashboard');
    } catch {
      setError('Unable to connect to the sign-in service. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-brand-panel">
        <div className="login-brand">
          <Image src="/brand/lotus-emblem.jpg" alt="" width={54} height={54} priority />
          <div><strong>RAMAKRISHNAN THIRUMALAI</strong><span>(INDIA) LLP</span></div>
        </div>
        <div className="login-brand-content">
          <span className="login-kicker">CONSTRUCTION OPERATIONS PLATFORM</span>
          <h1>Building a stronger tomorrow.</h1>
          <p>One workspace for your people, projects and equipment—keeping every operation moving forward.</p>
        </div>
        <div className="login-services">ROADS <i /> BUILDING <i /> PILE FOUNDATION <i /> BRIDGES</div>
        <div className="login-brand-footer"><ShieldCheck size={16} /> Secure company access</div>
      </section>

      <section className="login-form-panel">
        <div className="login-card">
          <div className="login-mobile-logo">
            <Image src="/brand/lotus-emblem.jpg" alt="" width={48} height={48} priority />
            <strong>Ramakrishnan Thirumalai</strong>
          </div>
          <div className="login-heading">
            <span className="login-welcome">WELCOME BACK</span>
            <h2>Sign in to your account</h2>
            <p>Enter your company account details to continue.</p>
          </div>

          <form onSubmit={handleSubmit}>
            <label className="login-label" htmlFor="identifier">Work email or mobile number</label>
            <div className="login-input-wrap">
              <Mail size={18} aria-hidden="true" />
              <input
                autoComplete="username"
                id="identifier"
                name="identifier"
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="name@company.com or mobile"
                required
                value={identifier}
              />
            </div>

            <div className="login-password-label">
              <label className="login-label" htmlFor="password">Password</label>
            </div>
            <div className="login-input-wrap">
              <LockKeyhole size={18} aria-hidden="true" />
              <input
                autoComplete="current-password"
                id="password"
                name="password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                required
                type={passwordVisible ? 'text' : 'password'}
                value={password}
              />
              <button
                aria-label={passwordVisible ? 'Hide password' : 'Show password'}
                className="password-toggle"
                onClick={() => setPasswordVisible((visible) => !visible)}
                type="button"
              >
                {passwordVisible ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>

            {error && <p className="login-error" role="alert">{error}</p>}

            <button className="login-submit" disabled={submitting} type="submit">
              {submitting ? <><span className="login-spinner" />Signing in…</> : 'Sign in'}
            </button>
          </form>

          <p className="login-help">Need access? Contact your company administrator.</p>
          <div className="login-privacy"><LockKeyhole size={13} /> Your account is protected with secure authentication</div>
        </div>
        <footer className="login-copyright">© {new Date().getFullYear()} Ramakrishnan Thirumalai (India) LLP</footer>
      </section>
    </main>
  );
}
