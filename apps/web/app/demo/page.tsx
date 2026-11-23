'use client';

import { useRouter } from 'next/navigation';
import {
  Activity, Building2, CalendarCheck, CircleGauge, ClipboardList, Fuel, HardHat,
  LayoutDashboard, LogOut, MapPin, Settings, ShieldCheck, Truck, Users, Wrench,
} from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';

type ModuleKey =
  | 'dashboard' | 'projects' | 'sites' | 'workforce' | 'employees'
  | 'attendance' | 'machines' | 'equipment' | 'maintenance' | 'fuel'
  | 'progress' | 'reports' | 'settings';

type DemoRecord = { id: string; name: string; detail: string; status: string };
type DemoData = Record<ModuleKey, DemoRecord[]>;

const storageKey = 'construction-erp-public-demo';
const modules: { key: ModuleKey; label: string; icon: typeof LayoutDashboard; description: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'A sample overview of project operations.' },
  { key: 'projects', label: 'Projects', icon: Building2, description: 'Explore and edit fictional project entries.' },
  { key: 'sites', label: 'Sites', icon: MapPin, description: 'Review sample work locations.' },
  { key: 'workforce', label: 'Workforce', icon: Users, description: 'Manage fictional workforce records.' },
  { key: 'employees', label: 'Employees', icon: HardHat, description: 'Explore sample employee entries.' },
  { key: 'attendance', label: 'Attendance', icon: CalendarCheck, description: 'View illustrative attendance entries.' },
  { key: 'machines', label: 'Machines', icon: Truck, description: 'Browse sample equipment assignments.' },
  { key: 'equipment', label: 'Equipment', icon: Wrench, description: 'Manage fictional equipment entries.' },
  { key: 'maintenance', label: 'Maintenance', icon: Wrench, description: 'Review sample maintenance items.' },
  { key: 'fuel', label: 'Fuel', icon: Fuel, description: 'Explore illustrative fuel records.' },
  { key: 'progress', label: 'Progress', icon: CircleGauge, description: 'Track fictional milestone updates.' },
  { key: 'reports', label: 'Reports', icon: ClipboardList, description: 'Review sample operational summaries.' },
  { key: 'settings', label: 'Settings', icon: Settings, description: 'Demo session and browser storage settings.' },
];

const moduleKeys = modules.map(({ key }) => key);

function makeSamples(prefix: string, names: string[], detail: string): DemoRecord[] {
  return names.map((name, index) => ({
    id: `${prefix}-${index + 1}`,
    name,
    detail,
    status: index === 1 ? 'Planned' : 'In progress',
  }));
}

const initialDemoData: DemoData = {
  dashboard: makeSamples('overview', ['Example Road Upgrade', 'Example Bridge Works', 'Example Building Works'], 'Illustrative project'),
  projects: makeSamples('project', ['Example Road Upgrade', 'Example Bridge Works', 'Example Building Works'], 'Sample Site'),
  sites: makeSamples('site', ['Sample Site A', 'Sample Site B', 'Sample Site C'], 'Illustrative location'),
  workforce: makeSamples('team', ['Sample Civil Crew', 'Sample Survey Team', 'Sample Site Team'], 'Example team'),
  employees: makeSamples('employee', ['Demo Employee 01', 'Demo Employee 02', 'Demo Employee 03'], 'Fictional employee'),
  attendance: makeSamples('attendance', ['Sample shift A', 'Sample shift B'], 'Illustrative entry'),
  machines: makeSamples('machine', ['Sample Excavator', 'Sample Loader'], 'Illustrative equipment'),
  equipment: makeSamples('equipment', ['Sample Crane', 'Sample Dumper'], 'Illustrative equipment'),
  maintenance: makeSamples('maintenance', ['Sample inspection', 'Sample service'], 'Illustrative schedule'),
  fuel: makeSamples('fuel', ['Sample fuel entry 01', 'Sample fuel entry 02'], 'Illustrative entry'),
  progress: makeSamples('milestone', ['Example site preparation', 'Example foundation work'], 'Illustrative milestone'),
  reports: makeSamples('report', ['Sample project summary', 'Sample equipment summary'], 'Illustrative report'),
  settings: [],
};

function isDemoRecord(value: unknown): value is DemoRecord {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === 'string'
    && typeof record.name === 'string'
    && typeof record.detail === 'string'
    && typeof record.status === 'string';
}

function isDemoData(value: unknown): value is DemoData {
  if (typeof value !== 'object' || value === null) return false;
  const data = value as Record<string, unknown>;
  return moduleKeys.every((key) => Array.isArray(data[key]) && data[key].every(isDemoRecord));
}

export default function DemoPage() {
  const router = useRouter();
  const [activeModule, setActiveModule] = useState<ModuleKey>('dashboard');
  const [records, setRecords] = useState<DemoData>(initialDemoData);
  const [newName, setNewName] = useState('');
  const [newDetail, setNewDetail] = useState('');
  const [storageError, setStorageError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (!isDemoData(parsed)) throw new Error('Saved demo data has an invalid format.');
        setRecords(parsed);
      }
    } catch (reason) {
      setStorageError(reason instanceof Error ? reason.message : 'Could not load saved demo data.');
    }
    setReady(true);
  }, []);

  function persist(next: DemoData) {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      setRecords(next);
      setStorageError('');
    } catch {
      setStorageError('Changes could not be saved in this browser.');
    }
  }

  function signOut() {
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('userRole');
    sessionStorage.removeItem('userEmail');
    sessionStorage.removeItem('demoMode');
    router.replace('/login');
  }

  function addRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    const next = {
      ...records,
      [activeModule]: [{
        id: `${activeModule}-${Date.now()}`,
        name,
        detail: newDetail.trim() || 'Added in this browser demo',
        status: 'Planned',
      }, ...records[activeModule]],
    };
    persist(next);
    setNewName('');
    setNewDetail('');
  }

  function toggleStatus(id: string) {
    persist({
      ...records,
      [activeModule]: records[activeModule].map((record) => record.id === id
        ? { ...record, status: record.status === 'Complete' ? 'Planned' : 'Complete' }
        : record),
    });
  }

  function deleteRecord(id: string) {
    persist({
      ...records,
      [activeModule]: records[activeModule].filter((record) => record.id !== id),
    });
  }

  function resetSamples() {
    persist(initialDemoData);
  }

  const currentModule = modules.find(({ key }) => key === activeModule) ?? modules[0];
  const CurrentIcon = currentModule.icon;
  const currentRecords = records[activeModule];

  return (
    <main className="demo-app">
      <aside className="demo-sidebar">
        <div className="demo-brand"><Building2 size={22} /><span><strong>Construction ERP</strong><small>Interactive demo</small></span></div>
        <nav aria-label="Demo modules">
          {modules.map(({ key, label, icon: Icon }) => (
            <button className={activeModule === key ? 'active' : ''} key={key} onClick={() => setActiveModule(key)} type="button">
              <Icon size={17} /><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="demo-sidebar-user"><span>DV</span><div><strong>Demo visitor</strong><small>Browser-only sample workspace</small></div></div>
      </aside>

      <section className="demo-main">
        <header className="demo-topbar">
          <div><strong>Operations workspace</strong><span>Interactive sample environment</span></div>
          <div className="demo-top-actions">
            <span className="demo-readonly-badge"><ShieldCheck size={14} /> No company API access</span>
            <button type="button" onClick={signOut}><LogOut size={15} /> Exit demo</button>
          </div>
        </header>

        <div className="demo-workspace">
          <div className="demo-title-row">
            <div><p className="eyebrow">SAMPLE WORKSPACE</p><h1><CurrentIcon size={24} />{currentModule.label}</h1><p>{currentModule.description}</p></div>
            <span className="demo-mode-chip"><Activity size={14} /> Fictional data</span>
          </div>

          <div className="demo-sample-notice">
            <ShieldCheck size={19} />
            <div><strong>Interactive demo only</strong><span>These sample records and your edits stay in this browser. Nothing is sent to the company API or shared with other visitors.</span></div>
          </div>

          {storageError && <p className="demo-storage-error" role="alert">{storageError}</p>}

          {activeModule === 'settings' ? (
            <section className="demo-settings-card">
              <h2>Browser demo data</h2>
              <p>Changes are stored only in this browser. Reset the sample lists to their original fictional entries at any time.</p>
              <button onClick={resetSamples} type="button">Reset sample data</button>
            </section>
          ) : (
            <>
              <section className="demo-metrics" aria-label="Demo metrics">
                <article><span><ClipboardList size={16} /> {currentModule.label}</span><strong>{currentRecords.length}</strong><small>Sample entries in this browser</small></article>
                <article><span><CircleGauge size={16} /> Complete</span><strong>{currentRecords.filter(({ status }) => status === 'Complete').length}</strong><small>Updated by demo interactions</small></article>
                <article><span><MapPin size={16} /> Connected sites</span><strong>03</strong><small>Illustrative only</small></article>
              </section>

              <section className="demo-record-panel" aria-labelledby="demo-record-heading">
                <div className="demo-record-heading">
                  <div><h2 id="demo-record-heading">{activeModule === 'dashboard' ? 'Sample activity' : `${currentModule.label} records`}</h2><p>Fictional entries · browser storage only</p></div>
                </div>
                <form className="demo-add-form" onSubmit={addRecord}>
                  <label>
                    <span>Add a sample entry</span>
                    <input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder={`New ${currentModule.label.toLowerCase()} entry`} required />
                  </label>
                  <label>
                    <span>Details (optional)</span>
                    <input value={newDetail} onChange={(event) => setNewDetail(event.target.value)} placeholder="Add a note or sample site" />
                  </label>
                  <button type="submit" disabled={!ready}>Add entry</button>
                </form>

                <div className="demo-record-list">
                  {currentRecords.map((record) => (
                    <article className="demo-record" key={record.id}>
                      <div><strong>{record.name}</strong><span>{record.detail}</span></div>
                      <span className={`demo-record-status${record.status === 'Complete' ? ' complete' : ''}`}>{record.status}</span>
                      <div className="demo-record-actions">
                        <button onClick={() => toggleStatus(record.id)} type="button">{record.status === 'Complete' ? 'Reopen' : 'Mark complete'}</button>
                        <button className="delete" onClick={() => deleteRecord(record.id)} type="button">Remove</button>
                      </div>
                    </article>
                  ))}
                  {!currentRecords.length && <p className="demo-empty">No sample entries yet. Add one above to explore the workflow.</p>}
                </div>
              </section>
            </>
          )}

          <footer className="demo-footnote">Demo content is fictional and isolated to this browser. It is not operational company data.</footer>
        </div>
      </section>
    </main>
  );
}
