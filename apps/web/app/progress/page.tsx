'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, CalendarDays, CheckCircle2, CircleAlert, LayoutGrid, List, LoaderCircle, Plus, RefreshCw, TrendingUp } from 'lucide-react';

type Project = { id: string; name: string };
type Milestone = {
  id: string;
  title: string;
  description?: string | null;
  sequence: number;
  plannedStart?: string | null;
  plannedFinish?: string | null;
  progressPercent: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD' | 'DELAYED';
  site?: { id: string; name: string } | null;
};
type ProgressUpdate = {
  id: string;
  summary: string;
  progressPercent?: number | null;
  reportedAt: string;
  milestone?: { id: string; title: string } | null;
  author: { role: string };
};
type ProgressData = {
  summary: { milestoneCount: number; completedCount: number; averageProgress: number };
  milestones: Milestone[];
  updates: ProgressUpdate[];
};

const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1').replace(/\/+$/, '');
const statusNames: Record<Milestone['status'], string> = {
  NOT_STARTED: 'Not started',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  ON_HOLD: 'On hold',
  DELAYED: 'Delayed',
};
const milestoneStatuses: Milestone['status'][] = ['NOT_STARTED', 'IN_PROGRESS', 'ON_HOLD', 'DELAYED', 'COMPLETED'];

function formValues(form: HTMLFormElement) {
  const values: Record<string, string> = {};
  new FormData(form).forEach((value, key) => {
    if (typeof value === 'string' && value !== '') values[key] = value;
  });
  return values;
}

function displayDate(value?: string | null) {
  if (!value) return 'Not scheduled';
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

export default function ProjectProgressPage() {
  const [token, setToken] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState('');
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [milestoneView, setMilestoneView] = useState<'timeline' | 'board'>('timeline');

  const request = useCallback(async (path: string, init?: RequestInit) => {
    const response = await fetch(`${apiBase}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { message?: string } | null;
      throw new Error(body?.message ?? (response.status === 401 ? 'Your session expired. Please sign in again.' : 'The request could not be completed.'));
    }
    return response.json();
  }, [token]);

  const loadProjectData = useCallback(async (id: string, accessToken: string) => {
    if (!id || !accessToken) return;
    setError('');
    try {
      const response = await fetch(`${apiBase}/projects/${id}/progress`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { message?: string } | null;
        throw new Error(body?.message ?? 'Could not load this project’s progress.');
      }
      setProgress(await response.json() as ProgressData);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load project progress.');
      setProgress(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const accessToken = sessionStorage.getItem('accessToken');
    if (!accessToken) {
      setLoading(false);
      setError('Sign in to view project progress.');
      return;
    }
    setToken(accessToken);
    fetch(`${apiBase}/projects?page=1&pageSize=100`, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load projects. Check your connection and try again.');
        return response.json() as Promise<{ items: Project[] }>;
      })
      .then((result) => {
        setProjects(result.items);
        const requestedProjectId = new URLSearchParams(window.location.search).get('projectId');
        const initialProject = result.items.find((project) => project.id === requestedProjectId) ?? result.items[0];
        if (initialProject) {
          setProjectId(initialProject.id);
          void loadProjectData(initialProject.id, accessToken);
        } else {
          setLoading(false);
        }
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : 'Could not load projects.');
        setLoading(false);
      });
  }, [loadProjectData]);

  async function submitMilestone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId) return;
    const form = event.currentTarget;
    setSaving(true);
    setNotice('');
    setError('');
    const data = formValues(form);
    try {
      await request(`/projects/${projectId}/milestones`, { method: 'POST', body: JSON.stringify(data) });
      form.reset();
      setShowMilestoneForm(false);
      setNotice('Milestone added.');
      await loadProjectData(projectId, token);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not create milestone.');
    } finally {
      setSaving(false);
    }
  }

  async function submitUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!projectId) return;
    const form = event.currentTarget;
    setSaving(true);
    setNotice('');
    setError('');
    const data = formValues(form);
    const progressPercent = data.progressPercent ? Number(data.progressPercent) : undefined;
    try {
      await request(`/projects/${projectId}/progress-updates`, {
        method: 'POST',
        body: JSON.stringify({ ...data, ...(progressPercent !== undefined ? { progressPercent } : {}) }),
      });
      form.reset();
      setNotice('Progress update recorded.');
      await loadProjectData(projectId, token);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save progress update.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <div><p className="eyebrow">PROJECT DELIVERY</p><h1>Project progress</h1><p>Plan milestones, track completion and record field updates.</p></div>
        <div className="progress-actions">
          {projects.length > 0 && <select aria-label="Select project" className="field" onChange={(event) => { setProjectId(event.target.value); setLoading(true); void loadProjectData(event.target.value, token); }} value={projectId}>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>}
          {projectId && <button className="button" onClick={() => setShowMilestoneForm((value) => !value)}><Plus size={16} /> Add milestone</button>}
        </div>
      </div>

      {error && <div className="progress-alert" role="alert"><CircleAlert size={18} /><span>{error}{error.includes('Sign in') && <> <Link href="/login">Sign in</Link></>}</span><button aria-label="Retry" onClick={() => projectId ? void loadProjectData(projectId, token) : window.location.reload()}><RefreshCw size={15} /></button></div>}
      {notice && <div className="progress-success" role="status"><CheckCircle2 size={17} />{notice}</div>}

      {!token && !error && <div className="progress-loading"><LoaderCircle size={20} />Loading session…</div>}
      {token && loading && <div className="progress-loading"><LoaderCircle size={20} />Loading project progress…</div>}

      {token && !loading && projects.length === 0 && !error && (
        <section className="progress-empty"><div className="progress-empty-icon"><Activity size={23} /></div><h2>No projects to track yet</h2><p>Create a project first, then add milestones and record progress updates here.</p><Link className="button" href="/projects">Go to projects <TrendingUp size={15} /></Link></section>
      )}

      {progress && !loading && (
        <>
          <div className="progress-metrics">
            <article className="progress-metric"><span>Total milestones</span><strong>{progress.summary.milestoneCount}</strong><small>In this project plan</small></article>
            <article className="progress-metric"><span>Completed</span><strong>{progress.summary.completedCount}<small className="metric-denominator"> / {progress.summary.milestoneCount}</small></strong><small>Milestones finished</small></article>
            <article className="progress-metric"><span>Average progress</span><strong>{progress.summary.averageProgress}%</strong><div className="progress-meter"><i style={{ width: `${progress.summary.averageProgress}%` }} /></div></article>
          </div>

          {progress.milestones.length > 0 && <section className="panel progress-chart-panel">
            <div className="panel-head"><div><strong>Milestone completion chart</strong><small>Progress percentages from this project’s recorded milestones</small></div><TrendingUp size={17} /></div>
            <div className="progress-chart-scroll">
              <div className="progress-chart" role="img" aria-label="Milestone completion percentages">
                {progress.milestones.map((milestone) => {
                  const percentage = Math.min(100, Math.max(0, milestone.progressPercent));
                  return <div className="progress-chart-column" key={milestone.id} title={`${milestone.title}: ${percentage}%`}>
                    <strong>{percentage}%</strong>
                    <i style={{ height: `${Math.max(4, percentage)}%` }} />
                    <span>{milestone.title}</span>
                  </div>;
                })}
              </div>
            </div>
          </section>}

          {showMilestoneForm && <form className="progress-form panel" onSubmit={submitMilestone}>
            <div className="panel-head"><div><strong>New milestone</strong><small>Add a planned stage to this project</small></div></div>
            <div className="progress-form-grid">
              <label>Milestone name<input className="field" name="title" placeholder="e.g. Foundation complete" required /></label>
              <label>Planned start<input className="field" name="plannedStart" type="date" /></label>
              <label>Planned finish<input className="field" name="plannedFinish" type="date" /></label>
              <label className="progress-description">Description<input className="field" name="description" placeholder="Optional scope or completion notes" /></label>
            </div>
            <div className="progress-form-actions"><button className="filter-button" onClick={() => setShowMilestoneForm(false)} type="button">Cancel</button><button className="button" disabled={saving} type="submit">{saving ? 'Saving…' : 'Save milestone'}</button></div>
          </form>}

          <div className="progress-content-grid">
            <section className="panel">
              <div className="panel-head milestone-panel-head">
                <div><strong>Project milestones</strong><small>Planned delivery stages and completion</small></div>
                <div className="milestone-view-switch" role="group" aria-label="Milestone layout">
                  <button aria-pressed={milestoneView === 'timeline'} className={milestoneView === 'timeline' ? 'active' : ''} onClick={() => setMilestoneView('timeline')} title="Timeline layout" type="button"><List size={15} /><span>Timeline</span></button>
                  <button aria-pressed={milestoneView === 'board'} className={milestoneView === 'board' ? 'active' : ''} onClick={() => setMilestoneView('board')} title="Board layout" type="button"><LayoutGrid size={15} /><span>Board</span></button>
                </div>
              </div>
              {!progress.milestones.length ? <div className="empty compact"><strong>No milestones yet</strong><span>Add the project’s first milestone to begin tracking planned versus actual progress.</span></div> : milestoneView === 'board' ? (
                <div className="milestone-board">
                  {milestoneStatuses.map((status) => {
                    const milestones = progress.milestones.filter((milestone) => milestone.status === status);
                    return <section className="milestone-board-column" key={status}>
                      <header><span className={`milestone-board-dot ${status}`} /><strong>{statusNames[status]}</strong><span className="milestone-board-count">{milestones.length}</span></header>
                      <div className="milestone-board-cards">
                        {milestones.length ? milestones.map((milestone) => <article className="milestone-board-card" key={milestone.id}>
                          <div className="milestone-board-card-title"><strong>{milestone.title}</strong><span>{milestone.progressPercent}%</span></div>
                          <div className="progress-meter"><i style={{ width: `${milestone.progressPercent}%` }} /></div>
                          {milestone.description && <p>{milestone.description}</p>}
                          <small><CalendarDays size={12} />{displayDate(milestone.plannedFinish)}</small>
                          {milestone.site && <small><Activity size={12} />{milestone.site.name}</small>}
                        </article>) : <p className="milestone-board-empty">No milestones</p>}
                      </div>
                    </section>;
                  })}
                </div>
              ) : <div className="milestone-list">
                {progress.milestones.map((milestone) => <article className="milestone-row" key={milestone.id}>
                  <div className={`milestone-mark ${milestone.status}`}><span /></div>
                  <div className="milestone-body">
                    <div className="milestone-title-row"><div><strong>{milestone.title}</strong>{milestone.site && <small>{milestone.site.name}</small>}</div><span className={`milestone-status ${milestone.status}`}>{statusNames[milestone.status]}</span></div>
                    {milestone.description && <p>{milestone.description}</p>}
                    <div className="milestone-dates"><span><CalendarDays size={13} />{displayDate(milestone.plannedStart)} – {displayDate(milestone.plannedFinish)}</span><strong>{milestone.progressPercent}%</strong></div>
                    <div className="progress-meter"><i style={{ width: `${milestone.progressPercent}%` }} /></div>
                  </div>
                </article>)}
              </div>}
            </section>

            <section className="panel">
              <div className="panel-head"><div><strong>Field progress updates</strong><small>Time-stamped project reporting</small></div></div>
              <form className="field-update-form" onSubmit={submitUpdate}>
                <label>Update note<textarea name="summary" placeholder="What changed on site today?" required rows={3} /></label>
                <div className="field-update-row">
                  <select aria-label="Related milestone" className="field" name="milestoneId"><option value="">Project-wide update</option>{progress.milestones.map((milestone) => <option key={milestone.id} value={milestone.id}>{milestone.title}</option>)}</select>
                  <input aria-label="Milestone completion percent" className="field" max="100" min="0" name="progressPercent" placeholder="%" type="number" />
                </div>
                <button className="button" disabled={saving} type="submit">{saving ? 'Saving…' : 'Record update'}</button>
              </form>
              <div className="update-history">
                {!progress.updates.length ? <div className="empty compact"><strong>No field updates</strong><span>Project updates will appear here after they are submitted.</span></div> : progress.updates.map((update) => <article className="update-item" key={update.id}>
                  <span className="update-dot" /><div><div className="update-item-head"><strong>{update.milestone?.title ?? 'Project update'}</strong><time>{displayDate(update.reportedAt)}</time></div><p>{update.summary}</p><small>{update.author.role.replaceAll('_', ' ').toLowerCase()}{update.progressPercent !== null && update.progressPercent !== undefined ? ` · ${update.progressPercent}% reported` : ''}</small></div>
                </article>)}
              </div>
            </section>
          </div>
        </>
      )}
    </>
  );
}
