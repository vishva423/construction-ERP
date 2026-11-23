'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowDown, ArrowRight, ArrowUp, Building2, ChevronLeft,
  ChevronRight, CircleAlert, ClipboardList, Download, FilePlus2, HardHat, Layers3,
  LoaderCircle, MapPin, Search, TrendingUp, Users, WalletCards, X,
} from 'lucide-react';

type Site = { id: string; name: string };
type Project = { id: string; name: string; status: string; createdAt: string; sites: Site[] };
type Milestone = { id: string; title: string; status: string; progressPercent: number; plannedFinish: string | null };
type ProgressUpdate = { id: string; summary: string; reportedAt: string; author: { role: string }; milestone: { title: string } | null };
type ProgressData = {
  summary: { milestoneCount: number; completedCount: number; averageProgress: number };
  milestones: Milestone[];
  updates: ProgressUpdate[];
};
type ProjectDetail = Project & { progress: ProgressData | null; progressError: string };

const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1').replace(/\/+$/, '');
const pageSize = 10;

async function apiRequest<T>(path: string, token: string, init?: RequestInit): Promise<T> {
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
    throw new Error(body?.message ?? (response.status === 401 ? 'Session expired. Sign in again to continue.' : 'The project request could not be completed.'));
  }
  return response.json() as Promise<T>;
}

function messageOf(reason: unknown) {
  return reason instanceof Error ? reason.message : 'The request could not be completed.';
}

function downloadCsv(rows: Project[]) {
  const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const content = [
    ['Project', 'Status', 'Sites', 'Created'],
    ...rows.map((project) => [project.name, project.status, project.sites.map((site) => site.name).join('; '), project.createdAt]),
  ].map((row) => row.map(quote).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'rt-infratech-projects.csv';
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function ProjectsPage() {
  const [records, setRecords] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<'name' | 'status' | 'createdAt'>('createdAt');
  const [sortAsc, setSortAsc] = useState(false);
  const [selected, setSelected] = useState<ProjectDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [role, setRole] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const requestSequence = useRef(0);
  const detailRequestSequence = useRef(0);

  const loadProjects = useCallback(async () => {
    const requestId = ++requestSequence.current;
    const token = sessionStorage.getItem('accessToken');
    if (!token) {
      setRecords([]);
      setTotal(0);
      setError('Sign in to view your company projects.');
      if (requestId === requestSequence.current) setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        search: query.trim(),
        status: statusFilter === 'ALL' ? '' : statusFilter,
        sortBy: sortKey,
        sortOrder: sortAsc ? 'asc' : 'desc',
      });
      const result = await apiRequest<{ items: Project[]; total: number }>(`/projects?${params}`, token);
      if (requestId === requestSequence.current) {
        setRecords(result.items);
        setTotal(result.total);
      }
    } catch (reason) {
      if (requestId === requestSequence.current) {
        setError(messageOf(reason));
        setRecords([]);
        setTotal(0);
      }
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }, [page, query, sortAsc, sortKey, statusFilter]);

  useEffect(() => { setRole(sessionStorage.getItem('userRole') ?? ''); }, []);
  useEffect(() => {
    void loadProjects();
    return () => { requestSequence.current += 1; };
  }, [loadProjects, reloadKey]);

  useEffect(() => {
    if (!selected && !showCreate) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.querySelector<HTMLElement>('.module-drawer-close')?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeProject();
        setShowCreate(false);
      }
      if (event.key !== 'Tab') return;
      const dialog = document.querySelector<HTMLElement>('[role="dialog"][aria-modal="true"]');
      const focusable = dialog ? Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled])')) : [];
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [selected?.id, showCreate]);

  const canManage = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'PROJECT_MANAGER'].includes(role);
  const siteCount = records.reduce((sum, project) => sum + project.sites.length, 0);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const visibleProjects = records;
  const statuses = [...new Set(['ACTIVE', 'PLANNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED', ...records.map((project) => project.status.toUpperCase())])].sort();

  function setFilterStatus(status: string) {
    setStatusFilter(status);
    setPage(1);
  }

  function closeProject() {
    detailRequestSequence.current += 1;
    setSelected(null);
  }

  async function openProject(project: Project) {
    const requestId = ++detailRequestSequence.current;
    setSelected({ ...project, progress: null, progressError: '' });
    setDetailLoading(true);
    const token = sessionStorage.getItem('accessToken');
    if (!token) { setDetailLoading(false); return; }
    try {
      const detail = await apiRequest<Project>(`/projects/${project.id}`, token);
      if (requestId !== detailRequestSequence.current) return;
      setSelected({ ...detail, progress: null, progressError: '' });
      try {
        const progress = await apiRequest<ProgressData>(`/projects/${project.id}/progress`, token);
        if (requestId === detailRequestSequence.current) setSelected({ ...detail, progress, progressError: '' });
      } catch (reason) {
        if (requestId === detailRequestSequence.current) setSelected({ ...detail, progress: null, progressError: messageOf(reason) });
      }
    } catch (reason) {
      if (requestId === detailRequestSequence.current) setNotice(messageOf(reason));
    } finally {
      if (requestId === detailRequestSequence.current) setDetailLoading(false);
    }
  }

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = sessionStorage.getItem('accessToken');
    if (!token) { setError('Sign in to create a project.'); return; }
    const form = new FormData(event.currentTarget);
    const payload: Record<string, string> = {};
    form.forEach((value, key) => { if (typeof value === 'string' && value !== '') payload[key] = value; });
    setSaving(true);
    setError('');
    try {
      await apiRequest<Project>('/projects', token, { method: 'POST', body: JSON.stringify(payload) });
      setShowCreate(false);
      setNotice('Project created and saved.');
      setQuery('');
      setStatusFilter('ALL');
      setPage(1);
      setReloadKey((key) => key + 1);
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="module-workspace">
      <header className="module-heading">
        <div><p className="module-eyebrow">PROJECT DELIVERY</p><h1>Projects</h1><p>Company project portfolio, linked sites and recorded milestone progress.</p></div>
        <div className="module-heading-actions"><button className="module-secondary-button" type="button" onClick={() => downloadCsv(visibleProjects)} disabled={!visibleProjects.length}><Download size={15} />Export filtered</button>{canManage && <button className="module-primary-button" type="button" onClick={() => setShowCreate(true)}><FilePlus2 size={15} />Create project</button>}</div>
      </header>

      {notice && <div className="module-notice" role="status">{notice}<button type="button" onClick={() => setNotice('')} aria-label="Dismiss message"><X size={15} /></button></div>}
      {error && <div className="module-error" role="alert"><CircleAlert size={17} /><span>{error}</span>{/sign in|session expired/i.test(error) && <Link href="/login">Sign in</Link>}<button type="button" onClick={() => void loadProjects()}>Retry</button></div>}

      <section className="module-kpis" aria-label="Project portfolio summary">
        <button className="module-kpi" type="button" onClick={() => setFilterStatus('ALL')}><span className="module-kpi-icon orange"><Building2 size={18} /></span><span className="module-kpi-label">Matching projects</span><strong>{loading ? '…' : error ? '—' : total}</strong><small>Across the company · current filters</small></button>
        <button className="module-kpi" type="button" onClick={() => setFilterStatus(statusFilter === 'ACTIVE' ? 'ALL' : 'ACTIVE')}><span className="module-kpi-icon green"><TrendingUp size={18} /></span><span className="module-kpi-label">Active projects</span><strong>{statusFilter === 'ACTIVE' ? loading ? '…' : error ? '—' : total : '—'}</strong><small>{statusFilter === 'ACTIVE' ? 'Matching active records · clear status filter' : 'Click to filter active records'}</small></button>
        <button className="module-kpi" type="button" onClick={() => setFilterStatus('ALL')}><span className="module-kpi-icon blue"><MapPin size={18} /></span><span className="module-kpi-label">Sites on this page</span><strong>{loading ? '…' : error ? '—' : siteCount}</strong><small>Linked to the visible project page</small></button>
      </section>

      <section className="module-panel">
        <div className="module-panel-heading">
          <div><h2>Project portfolio</h2><p>{loading ? 'Loading company records…' : `${total} matching project${total === 1 ? '' : 's'}`}</p></div>
          <div className="project-list-controls"><label className="module-search"><Search size={16} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search project or site" aria-label="Search projects" /></label><select aria-label="Filter by project status" value={statusFilter} onChange={(event) => setFilterStatus(event.target.value)}><option value="ALL">All statuses</option>{statuses.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}</select><select aria-label="Sort projects by" value={sortKey} onChange={(event) => { setSortKey(event.target.value as 'name' | 'status' | 'createdAt'); setPage(1); }}><option value="createdAt">Newest first</option><option value="name">Name</option><option value="status">Status</option></select><button className="project-sort-direction" type="button" aria-label={`Sort ${sortAsc ? 'descending' : 'ascending'}`} onClick={() => { setSortAsc((value) => !value); setPage(1); }}>{sortAsc ? <ArrowUp size={14} /> : <ArrowDown size={14} />}</button></div>
        </div>
        <div className="project-card-grid">
          {loading && Array.from({ length: 4 }, (_, index) => <div className="project-skeleton-card" key={index}><span /><span /><span /><span /></div>)}
          {!loading && visibleProjects.map((project) => <button className="project-summary-card" key={project.id} type="button" onClick={() => void openProject(project)}>
            <span className="project-summary-art"><Image src="/images/site-banner.svg" alt="" width={560} height={210} /><small>Illustrative site visual</small></span>
            <div className="project-summary-top"><span className="project-summary-icon"><Building2 size={18} /></span><span className={`module-status-badge ${project.status.toLowerCase()}`}>{project.status.replaceAll('_', ' ')}</span></div>
            <strong>{project.name}</strong><span className="project-site-summary"><MapPin size={13} />{project.sites.length ? project.sites.map((site) => site.name).join(' · ') : 'No sites linked yet'}</span>
            <span className="project-card-footer"><span><Layers3 size={13} />{project.sites.length} site{project.sites.length === 1 ? '' : 's'}</span><span>Open workspace <ArrowRight size={13} /></span></span>
          </button>)}
        </div>
        {!loading && !error && !visibleProjects.length && <div className="module-empty"><Image className="module-empty-image" src="/images/site-banner.svg" alt="" width={240} height={90} /><strong>{total === 0 && (query || statusFilter !== 'ALL') ? 'No matching projects' : 'No projects recorded'}</strong><span>{total > 0 ? 'Adjust your search or project status filter.' : 'Create a project record to begin coordinating sites and milestone progress.'}</span>{total === 0 && !query && statusFilter === 'ALL' && canManage && <button className="module-primary-button" type="button" onClick={() => setShowCreate(true)}><FilePlus2 size={14} />Create project</button>}</div>}
        <footer className="module-table-footer"><span>Page {page} of {totalPages}</span><div><button type="button" aria-label="Previous page" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft size={16} /></button><strong>{page} / {totalPages}</strong><button type="button" aria-label="Next page" disabled={page >= totalPages || loading} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}><ChevronRight size={16} /></button></div></footer>
      </section>

      {selected && <div className="module-drawer-layer" onMouseDown={(event) => { if (event.target === event.currentTarget) closeProject(); }}>
        <aside className="module-drawer project-detail-drawer" role="dialog" aria-modal="true" aria-labelledby="project-drawer-title">
          <div className="module-drawer-header"><div><p className="module-eyebrow">PROJECT WORKSPACE</p><button className="module-drawer-close" type="button" onClick={closeProject} aria-label="Close project workspace"><X size={18} /></button></div><div className="project-detail-title"><span className="project-detail-icon"><Building2 size={20} /></span><span><h2 id="project-drawer-title">{selected.name}</h2><small>Created {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(selected.createdAt))}</small></span></div><span className={`module-status-badge ${selected.status.toLowerCase()}`}>{selected.status.replaceAll('_', ' ')}</span></div>
          <div className="project-workspace-tabs"><a className="active" href="#project-progress">Progress</a><a href="#project-sites">Sites</a><a href="#project-updates">Daily updates</a><span className="disabled" title="Not available in the current API">Other modules unavailable</span></div>
          <div className="module-drawer-content">
            {detailLoading ? <div className="module-drawer-loading"><LoaderCircle className="module-spin" size={20} />Loading project workspace…</div> : <>
              <section id="project-progress"><h3>Project progress</h3>{selected.progress ? <div className="project-progress-overview"><div className="project-progress-ring" style={{ '--progress': `${Math.min(100, Math.max(0, selected.progress.summary.averageProgress))}%` } as React.CSSProperties}><span>{Math.round(selected.progress.summary.averageProgress)}<small>%</small></span></div><div><strong>{selected.progress.summary.completedCount} of {selected.progress.summary.milestoneCount} milestones complete</strong><small>Average milestone completion, from recorded updates</small><Link href="/progress">Open progress workspace <ArrowRight size={13} /></Link></div></div> : <p className="module-inline-empty">{selected.progressError || 'No milestone progress is recorded yet.'}</p>}</section>
              <section id="project-sites"><h3>Project sites <span>{selected.sites.length}</span></h3>{selected.sites.length ? <div className="employee-assignment-list">{selected.sites.map((site) => <article key={site.id}><span className="assignment-marker" /><span><strong>{site.name}</strong><small>Site record linked to this project</small></span></article>)}</div> : <p className="module-inline-empty">No sites have been linked to this project.</p>}</section>
              <section><h3>Milestones <span>{selected.progress?.milestones.length ?? 0}</span></h3>{selected.progress?.milestones.length ? <div className="project-milestone-list">{selected.progress.milestones.map((milestone) => <article key={milestone.id}><div><strong>{milestone.title}</strong><span className={`module-status-badge ${milestone.status.toLowerCase()}`}>{milestone.status.replaceAll('_', ' ')}</span></div><div className="project-milestone-meter"><span><i style={{ width: `${Math.min(100, Math.max(0, milestone.progressPercent))}%` }} /></span><small>{milestone.progressPercent}%</small></div></article>)}</div> : <p className="module-inline-empty">Project tasks and milestones will appear here when recorded in Project Progress.</p>}</section>
              <section id="project-updates"><h3>Recent progress updates</h3>{selected.progress?.updates.length ? <div className="project-update-list">{selected.progress.updates.slice(0, 5).map((update) => <article key={update.id}><span className="update-timeline-dot" /><div><strong>{update.milestone?.title ?? 'Project update'}</strong><small>{new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(update.reportedAt))} · {update.author.role.replaceAll('_', ' ')}</small><p>{update.summary}</p></div></article>)}</div> : <p className="module-inline-empty">No daily or progress updates have been recorded.</p>}</section>
              <section><h3>Additional project modules</h3><div className="project-unavailable-grid"><span><Users size={15} />Workforce<small>Not available</small></span><span><HardHat size={15} />Equipment<small>Not available</small></span><span><WalletCards size={15} />Expenses<small>Not available</small></span><span><ClipboardList size={15} />Documents & reports<small>Not available</small></span></div><p className="module-inline-empty">These records are not exposed by the current project API.</p></section>
            </>}
          </div>
        </aside>
      </div>}

      {showCreate && <div className="module-modal-layer" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setShowCreate(false); }}>
        <section className="module-form-modal" role="dialog" aria-modal="true" aria-labelledby="project-create-title">
          <header><div><p className="module-eyebrow">PROJECT PORTFOLIO</p><h2 id="project-create-title">Create project</h2><p>This creates a persistent project record in your company account.</p></div><button className="module-drawer-close" type="button" onClick={() => setShowCreate(false)} aria-label="Close form" disabled={saving}><X size={18} /></button></header>
          <form onSubmit={createProject}><label>Project name<input name="name" required maxLength={160} /></label><label>Initial status<select name="status" defaultValue="ACTIVE"><option value="ACTIVE">Active</option><option value="PLANNED">Planned</option><option value="ON_HOLD">On hold</option></select></label>
            {error && <p className="module-form-error" role="alert">{error}</p>}
            <footer><button className="module-secondary-button" type="button" onClick={() => setShowCreate(false)} disabled={saving}>Cancel</button><button className="module-primary-button" type="submit" disabled={saving}>{saving ? <LoaderCircle className="module-spin" size={15} /> : <FilePlus2 size={15} />}{saving ? 'Saving…' : 'Create project'}</button></footer>
          </form>
        </section>
      </div>}
    </div>
  );
}
