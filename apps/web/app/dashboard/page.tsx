'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowRight, ArrowUpRight, BadgeCheck, Building2, CalendarDays,
  CheckCircle2, CircleAlert, ClipboardList, HardHat, Layers3, MapPin,
  RefreshCw, Search, ShieldCheck, Truck, Users, WalletCards, Wrench,
} from 'lucide-react';

type Project = {
  id: string;
  name: string;
  status: string;
  sites: { id: string; name: string }[];
};

type ProjectProgress = {
  summary: { milestoneCount: number; completedCount: number; averageProgress: number };
};

type LoadState<T> = { value: T | null; error: string; loading: boolean };
type ProjectResponse = { items: Project[]; total: number };
type EmployeeResponse = { items: unknown[]; total: number };
type SiteRecord = { id: string; name: string };

const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1').replace(/\/+$/, '');

function request<T>(path: string, token: string): Promise<T> {
  return fetch(`${apiBase}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then(async (response) => {
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { message?: string } | null;
      throw new Error(body?.message ?? (response.status === 401
        ? 'Your session expired. Sign in again to refresh company records.'
        : 'Could not load this company record.'));
    }
    return response.json() as Promise<T>;
  });
}

function countLabel(value: number | null, loading: boolean) {
  if (loading) return 'Loading';
  return value === null ? '—' : new Intl.NumberFormat('en-IN').format(value);
}

function todayLabel() {
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date());
}

export default function Overview() {
  const [projects, setProjects] = useState<LoadState<ProjectResponse>>({ value: null, error: '', loading: true });
  const [employees, setEmployees] = useState<LoadState<EmployeeResponse>>({ value: null, error: '', loading: true });
  const [sites, setSites] = useState<LoadState<SiteRecord[]>>({ value: null, error: '', loading: true });
  const [progressByProject, setProgressByProject] = useState<Record<string, ProjectProgress>>({});
  const [progressError, setProgressError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [refreshKey, setRefreshKey] = useState(0);

  const loadRecords = useCallback(async () => {
    const token = sessionStorage.getItem('accessToken');
    if (!token) {
      const message = 'Sign in to view your company’s live project and workforce records.';
      setProjects({ value: null, error: message, loading: false });
      setEmployees({ value: null, error: message, loading: false });
      setSites({ value: null, error: message, loading: false });
      return;
    }

    setProjects((current) => ({ ...current, loading: true, error: '' }));
    setEmployees((current) => ({ ...current, loading: true, error: '' }));
    setSites((current) => ({ ...current, loading: true, error: '' }));
    setProgressError('');

    const [projectResult, employeeResult, siteResult] = await Promise.allSettled([
      request<ProjectResponse>('/projects?page=1&pageSize=100', token),
      request<EmployeeResponse>('/employees?page=1&pageSize=1', token),
      request<SiteRecord[]>('/sites', token),
    ]);

    if (projectResult.status === 'fulfilled') {
      setProjects({ value: projectResult.value, error: '', loading: false });
      const selectedProjects = projectResult.value.items.slice(0, 6);
      const progressResults = await Promise.allSettled(
        selectedProjects.map((project) => request<ProjectProgress>(`/projects/${project.id}/progress`, token)),
      );
      const nextProgress: Record<string, ProjectProgress> = {};
      let failedProgress = false;
      progressResults.forEach((result, index) => {
        if (result.status === 'fulfilled') nextProgress[selectedProjects[index].id] = result.value;
        else failedProgress = true;
      });
      setProgressByProject(nextProgress);
      if (failedProgress) setProgressError('Progress data is unavailable for one or more projects.');
    } else {
      setProjects({
        value: null,
        error: projectResult.reason instanceof Error ? projectResult.reason.message : 'Could not load projects.',
        loading: false,
      });
      setProgressByProject({});
    }

    if (siteResult.status === 'fulfilled') {
      setSites({ value: siteResult.value, error: '', loading: false });
    } else {
      setSites({
        value: null,
        error: siteResult.reason instanceof Error ? siteResult.reason.message : 'Could not load site records.',
        loading: false,
      });
    }

    if (employeeResult.status === 'fulfilled') {
      setEmployees({ value: employeeResult.value, error: '', loading: false });
    } else {
      setEmployees({
        value: null,
        error: employeeResult.reason instanceof Error ? employeeResult.reason.message : 'Could not load workforce records.',
        loading: false,
      });
    }
  }, [refreshKey]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  const projectItems = projects.value?.items ?? [];
  const activeProjects = projects.value?.items.filter((project) => !['COMPLETED', 'CANCELLED', 'CLOSED'].includes(project.status.toUpperCase())).length ?? null;
  const siteCount = sites.value?.length ?? null;
  const visibleProjects = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return projectItems.filter((project) => {
      const matchesSearch = !query || [project.name, project.status, ...project.sites.map((site) => site.name)]
        .some((value) => value.toLocaleLowerCase().includes(query));
      const matchesStatus = statusFilter === 'ALL' || project.status.toUpperCase() === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projectItems, search, statusFilter]);
  const projectStatuses = useMemo(
    () => [...new Set(projectItems.map((project) => project.status.toUpperCase()))].sort(),
    [projectItems],
  );

  const metrics = [
    { label: 'Employees', value: countLabel(employees.value?.total ?? null, employees.loading), note: employees.error || 'Company employee records', icon: Users, tone: 'orange', href: '/workforce', unavailable: !employees.value && !employees.loading },
    { label: 'Active projects', value: countLabel(activeProjects, projects.loading), note: projects.error || (projects.value && projects.value.total > 100 ? 'Active among first 100 project records' : 'From your project portfolio'), icon: Building2, tone: 'charcoal', href: '/projects', unavailable: !projects.value && !projects.loading },
    { label: 'Project sites', value: countLabel(siteCount, sites.loading), note: sites.error || 'All company site records', icon: MapPin, tone: 'green', href: '/sites', unavailable: !sites.value && !sites.loading },
    { label: 'Present today', value: 'Not connected', note: 'Attendance records are not available yet', icon: ClipboardList, tone: 'blue', href: '/attendance', unavailable: true },
    { label: 'Machines operating', value: 'Not connected', note: 'Live fleet telemetry is not available yet', icon: Truck, tone: 'violet', href: '/machines', unavailable: true },
    { label: 'Project expenses', value: 'Not connected', note: 'Financial records are not available yet', icon: WalletCards, tone: 'amber', href: '/finance', unavailable: true },
    { label: 'Pending verification', value: 'Not connected', note: 'Verification counts are not available yet', icon: BadgeCheck, tone: 'rose', href: '/verification', unavailable: true },
    { label: 'Maintenance due', value: 'Not connected', note: 'Maintenance records are not available yet', icon: Wrench, tone: 'slate', href: '/maintenance', unavailable: true },
  ];

  return (
    <div className="executive-dashboard">
      <section className="executive-hero">
        <div className="executive-hero-copy">
          <div className="executive-breadcrumb"><span>Workspace</span><span>/</span><strong>Overview</strong></div>
          <p className="executive-kicker"><i /> CONSTRUCTION OPERATIONS</p>
          <h1>Build with clarity.<br /><em>Deliver with confidence.</em></h1>
          <p className="executive-intro">A considered view of your projects, teams and work sites—grounded in the records your organisation has connected.</p>
          <div className="executive-hero-actions">
            <Link className="executive-primary-action" href="/projects">Explore projects <ArrowRight size={16} /></Link>
            <Link className="executive-secondary-action" href="/progress">Project progress <ArrowUpRight size={16} /></Link>
          </div>
          <div className="executive-date"><CalendarDays size={15} />{todayLabel()}<span className="executive-live-tag"><i /> LIVE RECORDS</span></div>
        </div>
        <div className="executive-visual" aria-label="Illustration of connected construction project sites" role="img">
          <div className="visual-topline"><span>PROJECT DELIVERY</span><span>FIELD OVERVIEW <ArrowUpRight size={13} /></span></div>
          <div className="blueprint-grid" />
          <svg className="blueprint-art" viewBox="0 0 540 310" fill="none" aria-hidden="true">
            <path d="M37 239 174 158l111 61 108-88 110 63" stroke="rgba(255,255,255,.32)" strokeWidth="2" strokeDasharray="5 7" />
            <path d="m140 192 51-30 55 31v62l-55 31-51-31v-63Z" stroke="#f4a16d" strokeWidth="2" />
            <path d="m191 162 55 31-55 31-51-32 51-30Z" fill="rgba(244,161,109,.2)" stroke="#f4a16d" strokeWidth="2" />
            <path d="M191 224v62m-51-94 51 31 55-31" stroke="#f4a16d" strokeWidth="2" />
            <path d="m320 144 47-27 53 30v58l-53 30-47-28v-63Z" stroke="rgba(255,255,255,.7)" strokeWidth="2" />
            <path d="m367 117 53 30-53 30-47-33 47-27Z" fill="rgba(255,255,255,.12)" stroke="rgba(255,255,255,.7)" strokeWidth="2" />
            <path d="M367 177v58m-47-91 47 33 53-30" stroke="rgba(255,255,255,.7)" strokeWidth="2" />
            <path d="m55 126 36-21 39 22v42l-39 23-36-22v-44Z" stroke="rgba(255,255,255,.5)" strokeWidth="2" />
            <path d="m91 105 39 22-39 22-36-23 36-21Z" fill="rgba(255,255,255,.1)" stroke="rgba(255,255,255,.5)" strokeWidth="2" />
            <path d="M91 149v43m-36-65 36 22 39-22" stroke="rgba(255,255,255,.5)" strokeWidth="2" />
            <circle cx="191" cy="193" r="7" fill="#f4a16d" /><circle cx="367" cy="148" r="6" fill="white" />
            <circle cx="91" cy="127" r="5" fill="#b9d1c5" />
            <path d="M191 193v-40h62" stroke="#f4a16d" strokeWidth="1.5" />
            <path d="M367 148V91h62" stroke="rgba(255,255,255,.6)" strokeWidth="1.5" />
          </svg>
          <div className="visual-label label-one"><span className="visual-label-dot orange" /><span><strong>Projects</strong><small>Portfolio overview</small></span></div>
          <div className="visual-label label-two"><span className="visual-label-dot green" /><span><strong>Sites</strong><small>Connected locations</small></span></div>
          <div className="visual-bottomline"><span>PLANNING</span><i /><span>FIELD DELIVERY</span><i /><span>HANDOVER</span></div>
        </div>
      </section>

      <section className="executive-section">
        <div className="executive-section-heading">
          <div><p className="executive-section-kicker">AT A GLANCE</p><h2>Operations overview</h2><p>Live totals where company records are connected.</p></div>
          <button className="executive-refresh" onClick={() => setRefreshKey((key) => key + 1)} type="button" disabled={projects.loading || employees.loading}>
            <RefreshCw size={15} className={projects.loading || employees.loading ? 'refresh-spinning' : ''} /> Refresh
          </button>
        </div>
        <div className="executive-kpi-grid">
          {metrics.map(({ label, value, note, icon: Icon, tone, href, unavailable }) => (
            <Link className={`executive-kpi ${unavailable ? 'is-unavailable' : ''}`} href={href} key={label}>
              <span className={`executive-kpi-icon ${tone}`}><Icon size={18} strokeWidth={1.8} /></span>
              <span className="executive-kpi-label">{label}</span>
              <strong className={value === 'Not connected' ? 'executive-kpi-unavailable' : ''}>{value}</strong>
              <small>{note}</small>
              <ArrowUpRight className="executive-kpi-arrow" size={15} />
            </Link>
          ))}
        </div>
      </section>

      <section className="executive-main-grid">
        <div className="executive-panel project-portfolio">
          <div className="executive-panel-heading">
            <div><p className="executive-section-kicker">YOUR WORK IN MOTION</p><h2>Project portfolio</h2><p>Project status and milestone progress from your records.</p></div>
            <Link href="/projects" className="executive-text-link">All projects <ArrowRight size={14} /></Link>
          </div>
          <div className="portfolio-controls">
            <label className="portfolio-search"><Search size={16} /><input aria-label="Search projects" onChange={(event) => setSearch(event.target.value)} placeholder="Search projects or sites" value={search} /></label>
            <select aria-label="Filter projects by status" onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
              <option value="ALL">All statuses</option>
              {projectStatuses.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}
            </select>
          </div>
          {projects.loading ? (
            <div className="portfolio-state"><span className="dashboard-spinner" />Loading live project records…</div>
          ) : projects.error ? (
            <div className="portfolio-state portfolio-state-error"><CircleAlert size={18} /><div><strong>Project records could not be loaded</strong><span>{projects.error}</span></div>{/sign in|session expired/i.test(projects.error) && <Link href="/login">Sign in</Link>}</div>
          ) : visibleProjects.length ? (
            <div className="portfolio-list">
              {visibleProjects.slice(0, 6).map((project) => {
                const progress = progressByProject[project.id];
                const percent = progress?.summary.averageProgress;
                return (
                  <article className="portfolio-project" key={project.id}>
                    <div className="portfolio-project-mark"><Building2 size={18} /></div>
                    <div className="portfolio-project-info">
                      <div className="portfolio-project-title"><h3>{project.name}</h3><span className={`project-status status-${project.status.toLowerCase().replaceAll('_', '-')}`}>{project.status.replaceAll('_', ' ')}</span></div>
                      <p><MapPin size={13} />{project.sites.length ? project.sites.map((site) => site.name).join(' · ') : 'No sites linked yet'}</p>
                      {progress ? <div className="portfolio-progress"><div className="portfolio-progress-track"><i style={{ width: `${Math.min(100, Math.max(0, percent ?? 0))}%` }} /></div><span>{Math.round(percent ?? 0)}% <small>milestone progress</small></span></div> : <div className="portfolio-progress-unavailable">{progressError || 'Progress updates not available'}</div>}
                    </div>
                    <Link href={`/progress?projectId=${encodeURIComponent(project.id)}`} className="portfolio-project-link" aria-label={`View project progress for ${project.name}`}><ArrowUpRight size={17} /></Link>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="portfolio-empty">
              {projects.value?.items.length ? <><Search size={22} /><strong>No projects match these filters</strong><span>Try another project name or status.</span></> : <><Layers3 size={22} /><strong>No projects have been added</strong><span>Create your first project to start coordinating sites and field teams.</span><Link href="/projects">Open projects <ArrowRight size={14} /></Link></>}
            </div>
          )}
          {!projects.loading && !projects.error && projects.value && projects.value.total > 100 && <div className="portfolio-footnote">Showing the first 100 of {projects.value.total} projects. Open the projects workspace to browse the full list.</div>}
        </div>

        <aside className="executive-insights">
          <div className="insights-heading"><div className="insights-orb"><Activity size={19} /></div><div><p>INTELLIGENCE</p><h2>Field signals</h2></div><span className="insights-status">DATA-LED</span></div>
          <p className="insights-intro">Insights will appear when the underlying operational data is connected. No simulated forecasts or live telemetry are shown here.</p>
          <div className="insight-availability">
            <div><span className="insight-icon orange"><HardHat size={16} /></span><span><strong>Workforce verification</strong><small>Verification records not connected</small></span><span className="insight-unavailable">—</span></div>
            <div><span className="insight-icon amber"><Truck size={16} /></span><span><strong>Fleet and fuel</strong><small>Machine telemetry not connected</small></span><span className="insight-unavailable">—</span></div>
            <div><span className="insight-icon green"><ShieldCheck size={16} /></span><span><strong>Safety and quality</strong><small>Incident data not connected</small></span><span className="insight-unavailable">—</span></div>
          </div>
          <div className="insights-footnote"><CheckCircle2 size={15} />Live project and site records remain available in the portfolio.</div>
          <Link className="insights-link" href="/reports">Open reports workspace <ArrowRight size={15} /></Link>
        </aside>
      </section>

      <section className="executive-bottom-grid">
        <article className="executive-data-note">
          <div className="data-note-icon"><Users size={19} /></div>
          <div><p className="executive-section-kicker">WORKFORCE</p><h2>People behind the project</h2><p>{employees.error || (employees.value ? `${new Intl.NumberFormat('en-IN').format(employees.value.total)} employee records are available in your workforce.` : employees.loading ? 'Loading company workforce records…' : 'Workforce records are not available for this account.')}</p></div>
          <Link href="/workforce" aria-label="Open workforce"><ArrowUpRight size={17} /></Link>
        </article>
        <article className="executive-data-note financial-note">
          <div className="data-note-icon"><WalletCards size={19} /></div>
          <div><p className="executive-section-kicker">FINANCE & RESOURCES</p><h2>Operational costs</h2><p>Expense, budget, inventory and procurement records are not connected to this dashboard yet.</p></div>
          <Link href="/finance" aria-label="Open finance"><ArrowUpRight size={17} /></Link>
        </article>
      </section>
    </div>
  );
}
