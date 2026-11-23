'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Database, LogOut, Server, ShieldCheck, UserRound } from 'lucide-react';

const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1').replace(/\/+$/, '');

export default function SettingsPage() {
  const router = useRouter();
  const [email, setEmail] = useState('Not signed in');
  const [role, setRole] = useState('—');
  const [apiStatus, setApiStatus] = useState('Checking connection…');
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');

  useEffect(() => {
    setEmail(sessionStorage.getItem('userEmail') ?? 'Not signed in');
    setRole(sessionStorage.getItem('userRole') ?? '—');
    const controller = new AbortController();
    fetch(`${apiBase}/health`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Health check failed');
        setApiStatus('Reachable · health endpoint only');
      })
      .catch((reason: unknown) => {
        if (reason instanceof Error && reason.name === 'AbortError') return;
        setApiStatus('Not reachable');
      });
    return () => controller.abort();
  }, []);

  async function signOut() {
    setSigningOut(true);
    setSignOutError('');
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) throw new Error('The sign-out request was rejected.');
    } catch {
      setSigningOut(false);
      setSignOutError('Could not end the session. Please try again.');
      return;
    }
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('userRole');
    sessionStorage.removeItem('userEmail');
    sessionStorage.removeItem('demoMode');
    router.replace('/login');
  }

  return (
    <>
      <div className="page-header">
        <div><p className="eyebrow">ADMINISTRATION</p><h1>Settings</h1><p>Account, security, and workspace information.</p></div>
      </div>

      <div className="settings-card-grid">
        <section className="panel settings-card">
          <div className="settings-card-icon"><UserRound size={19} /></div>
          <div><p className="eyebrow">ACCOUNT</p><h2>Signed-in account</h2></div>
          <dl className="settings-detail-list">
            <div><dt>Email</dt><dd>{email}</dd></div>
            <div><dt>Role</dt><dd><span className="settings-role">{role.replaceAll('_', ' ')}</span></dd></div>
            <div><dt>Session</dt><dd>{email === 'Not signed in' ? 'Not active' : 'Active in this browser'}</dd></div>
          </dl>
        </section>

        <section className="panel settings-card">
          <div className="settings-card-icon"><Server size={19} /></div>
          <div><p className="eyebrow">SERVICES</p><h2>API connection</h2></div>
          <p className="settings-status"><span className={apiStatus.startsWith('Reachable') ? 'settings-status-dot online' : 'settings-status-dot'} />{apiStatus}</p>
          <p className="settings-card-note">Project, equipment, maintenance, and fuel APIs are not connected in this scaffold yet.</p>
        </section>

        <section className="panel settings-card">
          <div className="settings-card-icon"><Database size={19} /></div>
          <div><p className="eyebrow">LOCAL DATA</p><h2>Browser storage</h2></div>
          <p className="settings-card-note">Maintenance and fuel entries are saved only in this browser. They are not shared with other users or devices.</p>
        </section>

        <section className="panel settings-card settings-security-card">
          <div className="settings-card-icon"><ShieldCheck size={19} /></div>
          <div><p className="eyebrow">SECURITY</p><h2>Session controls</h2></div>
          <p className="settings-card-note">Signing out clears this browser’s authentication tokens and returns you to the sign-in page.</p>
          {signOutError && <p className="login-error" role="alert">{signOutError}</p>}
          <button className="settings-signout-button" type="button" disabled={signingOut} onClick={signOut}>
            <LogOut size={16} />{signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </section>
      </div>
    </>
  );
}
