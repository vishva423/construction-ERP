'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { ArrowDownToLine, CircleAlert, Clock3, MapPin, RotateCw, ShieldCheck } from 'lucide-react';

type Site = { id: string; name: string };
type AttendanceEvent = {
  id: string;
  type: string;
  correctedType?: string | null;
  occurredAt: string;
  geofenceStatus: string;
  correctionNote?: string | null;
  employee?: { fullName: string; employeeCode: string };
  site?: Site;
  workShift?: { name: string } | null;
};
type Employee = { id: string; fullName: string; employeeCode: string };
type Current = { latest: { type: string; siteId: string } | null; sites: Site[] };
type EmployeeList = { items: Employee[] };

const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1').replace(/\/+$/, '');

async function request<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(body?.message ?? `Request failed (${response.status}).`);
  }
  return response.json() as Promise<T>;
}

function position(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('This browser does not provide GPS location.')); return; }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      (error) => reject(new Error(error.message || 'GPS location permission is required.')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}

function errorText(reason: unknown) {
  return reason instanceof Error ? reason.message : 'Attendance could not be updated.';
}

export default function AttendanceWorkspace() {
  const [token, setToken] = useState('');
  const [role, setRole] = useState('');
  const [events, setEvents] = useState<AttendanceEvent[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [current, setCurrent] = useState<Current | null>(null);
  const [siteId, setSiteId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [correctionOpen, setCorrectionOpen] = useState(false);

  const load = useCallback(async (accessToken: string, userRole: string) => {
    const [attendance, siteData] = await Promise.all([
      request<AttendanceEvent[]>('/attendance', accessToken),
      userRole === 'WORKER'
        ? request<Current>('/attendance/current', accessToken)
        : request<Site[]>('/sites', accessToken),
    ]);
    setEvents(attendance);
    if (userRole === 'WORKER') {
      const state = siteData as Current;
      setCurrent(state);
      setSites(state.sites);
      setSiteId((value) => value || state.sites[0]?.id || '');
    } else {
      setSites(siteData as Site[]);
    }
    if (['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'SITE_SUPERVISOR'].includes(userRole)) {
      const result = await request<EmployeeList>('/employees?page=1&pageSize=100&status=ACTIVE', accessToken);
      setEmployees(result.items);
    }
  }, []);

  useEffect(() => {
    const accessToken = sessionStorage.getItem('accessToken') ?? '';
    const userRole = sessionStorage.getItem('userRole') ?? '';
    setToken(accessToken);
    setRole(userRole);
    if (!accessToken) { setError('Sign in to view and record attendance.'); return; }
    void load(accessToken, userRole).catch((reason) => setError(errorText(reason)));
  }, [load]);

  async function record(action: 'check-in' | 'check-out' | 'breaks/start' | 'breaks/end') {
    if (!token || !siteId) { setError('Choose an assigned site before recording attendance.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const coordinates = await position();
      const payload = { siteId, ...coordinates };
      if (action === 'check-in') {
        const geofence = await request<{ configured: boolean; inside: boolean | null }>('/attendance/geofence-check', token, {
          method: 'POST', body: JSON.stringify(payload),
        });
        if (!geofence.configured) throw new Error('This site has no configured geofence. Ask an administrator to configure the boundary.');
        if (!geofence.inside) throw new Error('You are outside this site geofence. Check-in was not recorded.');
      }
      await request(`/attendance/${action}`, token, { method: 'POST', body: JSON.stringify(payload) });
      setNotice(`${action.replaceAll('/', ' ').replaceAll('-', ' ')} recorded with GPS location.`);
      await load(token, role);
    } catch (reason) { setError(errorText(reason)); }
    finally { setBusy(false); }
  }

  async function correct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setBusy(true); setError(''); setNotice('');
    const form = new FormData(event.currentTarget);
    const occurredAt = String(form.get('occurredAt'));
    const body = {
      employeeId: String(form.get('employeeId')),
      siteId: String(form.get('siteId')),
      eventType: String(form.get('eventType')),
      occurredAt: new Date(occurredAt).toISOString(),
      reason: String(form.get('reason')),
    };
    try {
      await request('/attendance/manual-correction', token, { method: 'POST', body: JSON.stringify(body) });
      setNotice('Manual correction added to the attendance history.');
      setCorrectionOpen(false);
      await load(token, role);
    } catch (reason) { setError(errorText(reason)); }
    finally { setBusy(false); }
  }

  const latest = current?.latest?.type;
  const isCheckedIn = latest === 'CHECK_IN' || latest === 'BREAK_START' || latest === 'BREAK_END';
  const isOnBreak = latest === 'BREAK_START';
  const canCorrect = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'SITE_SUPERVISOR'].includes(role);

  return (
    <div className="module-workspace">
      <header className="module-heading">
        <div><p className="module-eyebrow">FIELD PEOPLE OPERATIONS</p><h1>Attendance</h1><p>GPS-validated attendance events and supervisor corrections.</p></div>
        {canCorrect && <button className="module-secondary-button" type="button" onClick={() => setCorrectionOpen((open) => !open)}>Add manual correction</button>}
      </header>
      {error && <div className="module-error" role="alert"><CircleAlert size={16} /><span>{error}</span><button type="button" onClick={() => { setError(''); if (token) void load(token, role).catch((reason) => setError(errorText(reason))); }}>Retry</button></div>}
      {notice && <div className="module-notice" role="status"><ShieldCheck size={16} />{notice}<button type="button" onClick={() => setNotice('')}>Dismiss</button></div>}
      {role === 'WORKER' && <section className="attendance-action-panel">
        <div><p className="module-eyebrow">YOUR SHIFT</p><h2>{isCheckedIn ? (isOnBreak ? 'On break' : 'Checked in') : 'Not checked in'}</h2><p>Location is requested only when you record an attendance event. Check-in and breaks require a configured site boundary.</p></div>
        <label className="attendance-site-select">Assigned site<select value={siteId} onChange={(event) => setSiteId(event.target.value)}><option value="">Select a site</option>{sites.map((site) => <option value={site.id} key={site.id}>{site.name}</option>)}</select></label>
        <div className="attendance-action-buttons">
          {!isCheckedIn ? <button className="module-primary-button" disabled={busy || !siteId} onClick={() => void record('check-in')} type="button"><MapPin size={15} />{busy ? 'Checking location…' : 'Check in'}</button> :
            <><button className="module-secondary-button" disabled={busy || !siteId} onClick={() => void record(isOnBreak ? 'breaks/end' : 'breaks/start')} type="button"><Clock3 size={15} />{isOnBreak ? 'End break' : 'Start break'}</button><button className="module-primary-button" disabled={busy || !siteId || isOnBreak} onClick={() => void record('check-out')} type="button"><ArrowDownToLine size={15} />Check out</button></>}
        </div>
      </section>}
      {correctionOpen && canCorrect && <form className="attendance-correction-form" onSubmit={(event) => void correct(event)}>
        <h2>Supervisor correction</h2><p>Corrections are appended as attributed events; original entries are not overwritten.</p>
        <label>Employee<select name="employeeId" required defaultValue=""><option value="" disabled>Select employee</option>{employees.map((employee) => <option value={employee.id} key={employee.id}>{employee.fullName} · {employee.employeeCode}</option>)}</select></label>
        <label>Site<select name="siteId" required defaultValue=""><option value="" disabled>Select site</option>{sites.map((site) => <option value={site.id} key={site.id}>{site.name}</option>)}</select></label>
        <label>Corrected event<select name="eventType" required defaultValue="CHECK_IN"><option>CHECK_IN</option><option>CHECK_OUT</option><option>BREAK_START</option><option>BREAK_END</option></select></label>
        <label>Correct event time<input name="occurredAt" type="datetime-local" required /></label>
        <label className="attendance-correction-reason">Reason<input name="reason" maxLength={500} required /></label>
        <button className="module-primary-button" disabled={busy} type="submit">{busy ? 'Saving…' : 'Save correction'}</button>
      </form>}
      <section className="module-panel">
        <div className="module-panel-heading"><div><h2>Attendance history</h2><p>Latest 100 events · GPS coordinates are stored when provided</p></div><button className="module-secondary-button" type="button" onClick={() => token && void load(token, role).catch((reason) => setError(errorText(reason)))}><RotateCw size={14} />Refresh</button></div>
        <div className="module-table-wrap"><table className="module-table"><thead><tr><th>Event</th><th>Employee</th><th>Site</th><th>Time</th><th>Location status</th><th>Note</th></tr></thead>
          <tbody>{events.map((item) => <tr key={item.id}><td><span className={`module-status-badge ${item.geofenceStatus === 'INSIDE' ? 'active' : ''}`}>{item.correctedType ? `Correction · ${item.correctedType.replaceAll('_', ' ')}` : item.type.replaceAll('_', ' ')}</span></td><td>{item.employee?.fullName ?? 'You'}</td><td>{item.site?.name ?? '—'}</td><td>{new Date(item.occurredAt).toLocaleString()}</td><td>{item.geofenceStatus.replaceAll('_', ' ')}</td><td>{item.correctionNote ?? item.workShift?.name ?? '—'}</td></tr>)}</tbody>
        </table>{!events.length && !error && <div className="module-empty"><Clock3 size={22} /><strong>No attendance events yet</strong><span>Events will appear here after a valid check-in or supervisor correction.</span></div>}</div>
      </section>
    </div>
  );
}
