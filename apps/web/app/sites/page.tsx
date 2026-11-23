'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Building2, CircleAlert, MapPin, Plus, Search, X } from 'lucide-react';
import { readLocalRecords, writeLocalRecords } from '../../lib/local-records';

type SiteStatus = 'PLANNED' | 'ACTIVE' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED';
type SiteRecord = {
  id: string;
  name: string;
  location: string;
  status: SiteStatus;
  notes: string;
  demo: boolean;
};

const storageKey = 'rtinfra.local-sites.v1';
const statuses: SiteStatus[] = ['PLANNED', 'ACTIVE', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED'];
const initialExamples: SiteRecord[] = [
  { id: 'demo-site-1', name: 'Northgate Industrial Yard', location: 'North Corridor', status: 'ACTIVE', notes: 'Illustrative equipment staging site.', demo: true },
  { id: 'demo-site-2', name: 'Riverlink Bridge Package', location: 'East Riverfront', status: 'IN_PROGRESS', notes: 'Illustrative bridge construction site.', demo: true },
  { id: 'demo-site-3', name: 'Central Logistics Hub', location: 'Central District', status: 'PLANNED', notes: 'Illustrative logistics facility site.', demo: true },
];

const statusNames: Record<SiteStatus, string> = {
  PLANNED: 'Planned',
  ACTIVE: 'Active',
  IN_PROGRESS: 'In progress',
  ON_HOLD: 'On hold',
  COMPLETED: 'Completed',
};

function isSiteRecord(value: unknown): value is SiteRecord {
  return typeof value === 'object' && value !== null
    && 'id' in value && typeof value.id === 'string'
    && 'name' in value && typeof value.name === 'string'
    && 'location' in value && typeof value.location === 'string'
    && 'status' in value && (value.status === 'PLANNED' || value.status === 'ACTIVE' || value.status === 'IN_PROGRESS' || value.status === 'ON_HOLD' || value.status === 'COMPLETED')
    && 'notes' in value && typeof value.notes === 'string'
    && 'demo' in value && typeof value.demo === 'boolean';
}

export default function SitesPage() {
  const [sites, setSites] = useState<SiteRecord[]>([]);
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved === null) {
        writeLocalRecords(storageKey, initialExamples);
        setSites(initialExamples);
      } else {
        setSites(readLocalRecords(storageKey, isSiteRecord));
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load local site records.');
    }
  }, []);

  const filteredSites = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized
      ? sites.filter((site) => `${site.name} ${site.location} ${statusNames[site.status]}`.toLowerCase().includes(normalized))
      : sites;
  }, [query, sites]);

  function persist(nextSites: SiteRecord[]) {
    try {
      writeLocalRecords(storageKey, nextSites);
      setSites(nextSites);
      setError('');
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save site records in this browser.');
      return false;
    }
  }

  function addSite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const status = String(values.get('status') ?? 'PLANNED');
    const name = String(values.get('name') ?? '').trim();
    const location = String(values.get('location') ?? '').trim();
    if (!name || !location || !statuses.some((item) => item === status)) {
      setError('Enter a site name, location, and valid status.');
      return;
    }
    const site: SiteRecord = {
      id: crypto.randomUUID(),
      name,
      location,
      status: status as SiteStatus,
      notes: String(values.get('notes') ?? '').trim(),
      demo: false,
    };
    if (persist([site, ...sites])) {
      form.reset();
      setShowForm(false);
      setNotice('Site saved on this device.');
    }
  }

  function removeSite(id: string) {
    persist(sites.filter((site) => site.id !== id));
  }

  return (
    <>
      <div className="page-header">
        <div><p className="eyebrow">PROJECT DELIVERY</p><h1>Sites</h1><p>Browse local site examples or add your own site entry.</p></div>
        <button className="button" type="button" onClick={() => setShowForm((open) => !open)}><Plus size={16} /> Add site</button>
      </div>
      <div className="local-data-notice"><CircleAlert size={16} /> Demo entries are illustrative. Sites are stored only in this browser; this page does not use authentication tokens or call the API.</div>
      {error && <div className="local-form-error" role="alert">{error}</div>}
      {notice && <div className="local-form-success" role="status">{notice}</div>}

      {showForm && <form className="panel site-entry-form" onSubmit={addSite}>
        <div className="panel-head"><div><strong>Add a site</strong><small>Saved to this browser only</small></div><Building2 size={17} /></div>
        <div className="site-entry-fields">
          <label>Site name<input className="field" name="name" placeholder="e.g. East District Roadworks" required /></label>
          <label>Location<input className="field" name="location" placeholder="City, district, or area" required /></label>
          <label>Status<select className="field" name="status" defaultValue="PLANNED"><option value="PLANNED">Planned</option><option value="ACTIVE">Active</option><option value="IN_PROGRESS">In progress</option><option value="ON_HOLD">On hold</option><option value="COMPLETED">Completed</option></select></label>
          <label>Notes<input className="field" name="notes" placeholder="Optional description" /></label>
        </div>
        <div className="site-entry-actions"><button className="filter-button" type="button" onClick={() => setShowForm(false)}>Cancel</button><button className="button" type="submit">Save site</button></div>
      </form>}

      <section className="panel site-list-panel">
        <div className="panel-head site-list-head">
          <div><strong>Site register</strong><small>{sites.length} local site{sites.length === 1 ? '' : 's'}</small></div>
          <label className="module-search"><Search size={16} /><input type="search" aria-label="Search local sites" placeholder="Search sites" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        </div>
        {!filteredSites.length ? <div className="empty compact"><strong>{sites.length ? 'No matching sites' : 'No sites added'}</strong><span>{sites.length ? 'Try another name, location, or status.' : 'Add a site to start a local register.'}</span></div> : (
          <div className="site-card-grid">
            {filteredSites.map((site) => (
              <article className="site-record-card" key={site.id}>
                <div className="site-record-card-top"><span className="site-record-icon"><MapPin size={17} /></span><span className={`site-status-pill ${site.status}`}>{statusNames[site.status]}</span></div>
                <h2>{site.name}</h2>
                <p><MapPin size={14} />{site.location}</p>
                {site.notes && <small>{site.notes}</small>}
                <div className="site-record-card-footer">
                  {site.demo && <span className="site-demo-tag">Demo example</span>}
                  {!site.demo && <span className="site-demo-tag">Local entry</span>}
                  <button className="local-delete-button" type="button" aria-label={`Delete ${site.name}`} onClick={() => removeSite(site.id)}><X size={15} /></button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
