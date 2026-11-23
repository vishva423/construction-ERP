'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CircleAlert, LoaderCircle, RefreshCw, ShieldCheck, Wifi, WifiOff } from 'lucide-react';
import { enqueueCapture, pendingCaptureCount, syncPendingCaptures } from './offline-queue';

type Task = {
  id: string;
  status: string;
  assignedAt: string;
  round: { endsAt: string; status: string };
  employee: { fullName: string; employeeCode: string };
  site: { name: string } | null;
  submission: {
    workerSelfieAt: string | null;
    supervisorCapturedAt: string | null;
    workerSelfieUrl: string | null;
    supervisorCaptureUrl: string | null;
  } | null;
};

const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1').replace(/\/+$/, '');
const supervisorRoles = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER', 'SITE_SUPERVISOR'];

async function loadTasks(token: string) {
  const response = await fetch(`${apiBase}/verification/tasks`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(body?.message ?? `Verification tasks could not be loaded (${response.status}).`);
  }
  return response.json() as Promise<Task[]>;
}

function messageOf(reason: unknown) {
  return reason instanceof Error ? reason.message : 'Verification request failed.';
}

export default function VerificationWorkspace() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [token, setToken] = useState('');
  const [role, setRole] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState(true);
  const [queued, setQueued] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async (accessToken: string) => {
    setTasks(await loadTasks(accessToken));
  }, []);

  useEffect(() => {
    const accessToken = sessionStorage.getItem('accessToken') ?? '';
    const userRole = sessionStorage.getItem('userRole') ?? '';
    setToken(accessToken);
    setRole(userRole);
    setOnline(navigator.onLine);
    if (!accessToken) { setError('Sign in to view verification tasks.'); return; }
    void refresh(accessToken).catch((reason) => setError(messageOf(reason)));
    void pendingCaptureCount().then(setQueued).catch((reason) => setError(messageOf(reason)));
    const updateOnline = () => setOnline(navigator.onLine);
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [refresh]);

  useEffect(() => {
    if (online && token) {
      void syncPendingCaptures(apiBase, token)
        .then(async (count) => {
          if (count) { setNotice(`${count} queued capture${count === 1 ? '' : 's'} synced.`); await refresh(token); }
          return pendingCaptureCount();
        })
        .then(setQueued)
        .catch((reason) => setError(messageOf(reason)));
    }
  }, [online, token, refresh]);

  async function startCamera(task: Task) {
    setError(''); setNotice('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera capture requires a secure HTTPS origin or localhost browser session.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = stream;
      setSelectedTask(task);
      setCameraReady(false);
      window.setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().then(() => setCameraReady(true)).catch((reason) => setError(messageOf(reason)));
        }
      }, 0);
    } catch (reason) { setError(`Camera access failed: ${messageOf(reason)}`); }
  }

  function closeCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setSelectedTask(null);
    setCameraReady(false);
  }

  async function capture() {
    if (!selectedTask || !videoRef.current || !cameraReady) return;
    setBusy(true); setError(''); setNotice('');
    let captured: Blob | null = null;
    let capturedLocation: { latitude: number; longitude: number } | null = null;
    const captureType = supervisorRoles.includes(role) ? 'supervisor-capture' : 'selfie';
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      captured = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error('Camera image could not be prepared.')), 'image/jpeg', 0.88));
      if (captured.size > 5 * 1024 * 1024) throw new Error('Captured image exceeds the 5 MB upload limit.');
      capturedLocation = captureType === 'supervisor-capture' ? null : await new Promise<{ latitude: number; longitude: number } | null>((resolve) => {
        if (!navigator.geolocation) { resolve(null); return; }
        navigator.geolocation.getCurrentPosition(({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }), () => resolve(null), { enableHighAccuracy: true, timeout: 8000 });
      });
      if (!navigator.onLine) {
        await enqueueCapture({ taskId: selectedTask.id, captureType, blob: captured, ...capturedLocation });
        setQueued(await pendingCaptureCount());
        setNotice('Saved securely in this browser’s IndexedDB queue; it will sync when online.');
        closeCamera();
        return;
      }
      const form = new FormData();
      form.append('file', captured, `verification-${Date.now()}.jpg`);
      if (capturedLocation) { form.append('latitude', String(capturedLocation.latitude)); form.append('longitude', String(capturedLocation.longitude)); }
      const response = await fetch(`${apiBase}/verification/tasks/${selectedTask.id}/${captureType}`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form,
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { message?: string } | null;
        throw new Error(body?.message ?? `Image upload failed (${response.status}).`);
      }
      setNotice(captureType === 'supervisor-capture' ? 'Supervisor capture stored. No biometric matching is performed.' : 'Selfie stored. No facial recognition or biometric matching is performed.');
      closeCamera();
      await refresh(token);
    } catch (reason) {
      if ((!navigator.onLine || reason instanceof TypeError) && selectedTask && captured) {
        try {
          await enqueueCapture({ taskId: selectedTask.id, captureType, blob: captured, ...capturedLocation });
          setQueued(await pendingCaptureCount());
          setNotice('Network lost during upload; capture saved to the local IndexedDB queue.');
          closeCamera();
        } catch (queueError) { setError(messageOf(queueError)); }
      } else setError(messageOf(reason));
    } finally { setBusy(false); }
  }

  const isSupervisor = supervisorRoles.includes(role);
  const pending = tasks.filter((task) => task.status === 'PENDING');

  return (
    <div className="module-workspace">
      <header className="module-heading">
        <div><p className="module-eyebrow">FIELD REVIEW · HUMAN CAPTURE</p><h1>AI Verification</h1><p>Scheduled camera evidence capture. Images are stored for later person-detection processing only.</p></div>
        <span className={`verification-connectivity ${online ? 'online' : 'offline'}`}>{online ? <Wifi size={14} /> : <WifiOff size={14} />}{online ? 'Online' : 'Offline'} · {queued} queued</span>
      </header>
      {error && <div className="module-error" role="alert"><CircleAlert size={16} /><span>{error}</span><button type="button" onClick={() => token && void refresh(token).catch((reason) => setError(messageOf(reason)))}>Retry</button></div>}
      {notice && <div className="module-notice" role="status"><ShieldCheck size={16} />{notice}<button type="button" onClick={() => setNotice('')}>Dismiss</button></div>}
      <section className="verification-policy"><ShieldCheck size={18} /><div><strong>No facial recognition or biometric matching</strong><span>Submissions store image object keys and capture metadata only. YOLO person-detection is a future Phase 3 capability; no AI result is claimed here.</span></div></section>
      {selectedTask && <section className="verification-camera-panel">
        <div className="verification-camera-header"><div><p className="module-eyebrow">{isSupervisor ? 'SUPERVISOR CAPTURE' : 'WORKER SELFIE'}</p><h2>{selectedTask.employee.fullName} · {selectedTask.site?.name ?? 'Assigned site'}</h2><p>Use the live camera preview below. Gallery and file selection are not available.</p></div><button className="module-secondary-button" type="button" onClick={closeCamera}>Close camera</button></div>
        <div className="verification-camera-frame"><video ref={videoRef} autoPlay muted playsInline aria-label="Live in-app camera preview" />{!cameraReady && <div className="verification-camera-loading"><LoaderCircle size={20} />Starting camera…</div>}</div>
        <div className="verification-camera-actions"><button className="module-primary-button" type="button" disabled={!cameraReady || busy} onClick={() => void capture()}><Camera size={16} />{busy ? 'Saving capture…' : 'Capture now'}</button><span>Max 5 MB · camera only</span></div>
      </section>}
      <section className="module-panel">
        <div className="module-panel-heading"><div><h2>{isSupervisor ? 'Worker verification tasks' : 'Your verification tasks'}</h2><p>{pending.length} pending · selected fairly in three-hour rounds</p></div><button className="module-secondary-button" type="button" onClick={() => token && void refresh(token).catch((reason) => setError(messageOf(reason)))}><RefreshCw size={14} />Refresh</button></div>
        <div className="verification-task-list">{tasks.map((task) => <article className="verification-task-card" key={task.id}>
          <div className="verification-task-status"><span className={`module-status-badge ${task.status === 'SUBMITTED' ? 'active' : ''}`}>{task.status}</span><small>Round ends {new Date(task.round.endsAt).toLocaleString()}</small></div>
          <div><strong>{task.employee.fullName}</strong><span>{task.employee.employeeCode} · {task.site?.name ?? 'Site not assigned'}</span></div>
          <div className="verification-task-evidence">{task.submission?.workerSelfieUrl && <a href={task.submission.workerSelfieUrl} target="_blank" rel="noreferrer">Worker image</a>}{task.submission?.supervisorCaptureUrl && <a href={task.submission.supervisorCaptureUrl} target="_blank" rel="noreferrer">Supervisor image</a>}{!task.submission && <span>No capture submitted</span>}</div>
          {task.status === 'PENDING' && <button className="module-primary-button" type="button" onClick={() => void startCamera(task)}><Camera size={14} />{isSupervisor ? 'Capture for worker' : 'Open camera'}</button>}
        </article>)}
          {!tasks.length && !error && <div className="module-empty"><Camera size={22} /><strong>No verification tasks assigned</strong><span>A scheduler creates rounds every three hours, assigning a fair 25% sample of active linked workers.</span></div>}
        </div>
      </section>
    </div>
  );
}
