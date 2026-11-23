'use client';

import { useRouter } from 'next/navigation';
import { Building2, ClipboardList, LogOut, MapPin, ShieldCheck, Users } from 'lucide-react';

const sampleProjects = [
  { name: 'Example Road Upgrade', site: 'Sample Site A', status: 'In progress', progress: 68 },
  { name: 'Example Bridge Works', site: 'Sample Site B', status: 'Planning', progress: 24 },
  { name: 'Example Building Works', site: 'Sample Site C', status: 'In progress', progress: 43 },
];

export default function DemoPage() {
  const router = useRouter();

  function signOut() {
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('userRole');
    sessionStorage.removeItem('userEmail');
    sessionStorage.removeItem('demoMode');
    router.replace('/login');
  }

  return (
    <main className="demo-preview">
      <header className="demo-preview-header">
        <div className="demo-preview-brand">
          <Building2 size={21} />
          <div><strong>Construction ERP</strong><span>Workspace preview</span></div>
        </div>
        <div className="demo-preview-actions">
          <span className="demo-readonly-badge"><ShieldCheck size={14} /> Read-only demo</span>
          <button type="button" onClick={signOut}><LogOut size={15} /> Exit demo</button>
        </div>
      </header>

      <section className="demo-preview-content">
        <div className="demo-preview-intro">
          <p className="eyebrow">OPERATIONS OVERVIEW</p>
          <h1>Welcome to the workspace preview</h1>
          <p>This public demo uses illustrative sample information. It is not connected to company records or APIs.</p>
        </div>

        <div className="demo-sample-notice">
          <ShieldCheck size={19} />
          <div><strong>Read-only access</strong><span>Sample content only. No account data, API access, or changes are available in this demo.</span></div>
        </div>

        <section className="demo-metrics" aria-label="Illustrative sample metrics">
          <article className="demo-metric-card">
            <span><Building2 size={18} /> Sample projects</span><strong>03</strong><small>Illustrative only</small>
          </article>
          <article className="demo-metric-card">
            <span><MapPin size={18} /> Sample sites</span><strong>03</strong><small>Illustrative only</small>
          </article>
          <article className="demo-metric-card">
            <span><Users size={18} /> Workforce</span><strong>—</strong><small>No worker records shown</small>
          </article>
        </section>

        <section className="demo-projects panel" aria-labelledby="demo-projects-title">
          <div className="panel-head">
            <div><strong id="demo-projects-title">Example project list</strong><small>Fictional placeholder entries</small></div>
            <ClipboardList size={18} aria-hidden="true" />
          </div>
          <div className="demo-project-list">
            {sampleProjects.map((project) => (
              <article className="demo-project-row" key={project.name}>
                <div className="demo-project-name"><strong>{project.name}</strong><span>{project.site}</span></div>
                <span className="demo-project-status">{project.status}</span>
                <div className="demo-project-progress" aria-label={`${project.progress}% illustrative progress`}>
                  <span><i style={{ width: `${project.progress}%` }} /></span><small>{project.progress}%</small>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
