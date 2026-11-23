'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { CalendarClock, CircleAlert, ClipboardCheck, Wrench, X } from 'lucide-react';
import { readLocalRecords, writeLocalRecords } from '../../lib/local-records';

type MaintenanceStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';
type MaintenanceRecord = {
  id: string;
  asset: string;
  category: string;
  service: string;
  dueDate: string;
  cost: number;
  status: MaintenanceStatus;
  notes: string;
};

const storageKey = 'rtinfra.local-maintenance.v1';
const statuses: MaintenanceStatus[] = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'];

function isMaintenanceRecord(value: unknown): value is MaintenanceRecord {
  return typeof value === 'object' && value !== null
    && 'id' in value && typeof value.id === 'string'
    && 'asset' in value && typeof value.asset === 'string'
    && 'category' in value && typeof value.category === 'string'
    && 'service' in value && typeof value.service === 'string'
    && 'dueDate' in value && typeof value.dueDate === 'string'
    && 'cost' in value && typeof value.cost === 'number'
    && 'status' in value && (value.status === 'SCHEDULED' || value.status === 'IN_PROGRESS' || value.status === 'COMPLETED')
    && 'notes' in value && typeof value.notes === 'string';
}

function currency(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`));
}

export default function MaintenancePage() {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    try {
      setRecords(readLocalRecords(storageKey, isMaintenanceRecord));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load local maintenance records.');
    }
  }, []);

  const plannedSpend = records.filter((record) => record.status !== 'COMPLETED').reduce((total, record) => total + record.cost, 0);
  const openCount = records.filter((record) => record.status !== 'COMPLETED').length;
  const dueSoon = records.filter((record) => {
    if (record.status === 'COMPLETED') return false;
    const remaining = new Date(`${record.dueDate}T00:00:00`).getTime() - Date.now();
    return remaining <= 30 * 24 * 60 * 60 * 1000;
  }).length;

  const monthlyPlan = useMemo(() => {
    const totals = new Map<string, number>();
    records.filter((record) => record.status !== 'COMPLETED').forEach((record) => {
      const month = record.dueDate.slice(0, 7);
      totals.set(month, (totals.get(month) ?? 0) + record.cost);
    });
    return [...totals.entries()].sort(([first], [second]) => first.localeCompare(second));
  }, [records]);
  const maxPlan = Math.max(1, ...monthlyPlan.map(([, cost]) => cost));

  function persist(nextRecords: MaintenanceRecord[]) {
    try {
      writeLocalRecords(storageKey, nextRecords);
      setRecords(nextRecords);
      setError('');
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save maintenance records in this browser.');
      return false;
    }
  }

  function addRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const cost = Number(values.get('cost'));
    const record: MaintenanceRecord = {
      id: crypto.randomUUID(),
      asset: String(values.get('asset') ?? '').trim(),
      category: String(values.get('category') ?? ''),
      service: String(values.get('service') ?? '').trim(),
      dueDate: String(values.get('dueDate') ?? ''),
      cost,
      status: String(values.get('status') ?? 'SCHEDULED') as MaintenanceStatus,
      notes: String(values.get('notes') ?? '').trim(),
    };
    if (!record.asset || !record.service || !record.dueDate || !Number.isFinite(cost) || cost < 0 || !statuses.includes(record.status)) {
      setError('Enter an asset, service, due date, and a valid non-negative estimated cost.');
      return;
    }
    if (persist([record, ...records])) {
      form.reset();
      setNotice('Maintenance item saved on this device.');
    }
  }

  function updateStatus(id: string, status: MaintenanceStatus) {
    persist(records.map((record) => record.id === id ? { ...record, status } : record));
  }

  function removeRecord(id: string) {
    persist(records.filter((record) => record.id !== id));
  }

  return (
    <>
      <div className="page-header">
        <div><p className="eyebrow">FLEET & RESOURCES</p><h1>Maintenance</h1><p>Schedule service and track estimated maintenance costs.</p></div>
      </div>
      <div className="local-data-notice"><CircleAlert size={16} /> These entries are stored only in this browser. Shared maintenance records require the API.</div>
      {error && <div className="local-form-error" role="alert">{error}</div>}
      {notice && <div className="local-form-success" role="status">{notice}</div>}

      <section className="local-metric-grid" aria-label="Maintenance summary">
        <article className="local-metric-card"><span>Open items</span><strong>{openCount}</strong><small>Scheduled or in progress</small></article>
        <article className="local-metric-card"><span>Due in 30 days</span><strong>{dueSoon}</strong><small>Includes overdue items</small></article>
        <article className="local-metric-card"><span>Planned cost</span><strong>{currency(plannedSpend)}</strong><small>From open maintenance items</small></article>
      </section>

      <div className="local-workspace-grid">
        <form className="panel local-record-form" onSubmit={addRecord}>
          <div className="panel-head"><div><strong>Schedule maintenance</strong><small>Create a service item for a machine</small></div><Wrench size={17} /></div>
          <label>Asset ID<input className="field" name="asset" placeholder="e.g. EX-001" required /></label>
          <label>Equipment category<select className="field" name="category" defaultValue="Excavator"><option>Backhoe loader</option><option>Excavator</option><option>Crane</option><option>Wheel loader</option><option>Bulldozer</option><option>Dumper</option></select></label>
          <label>Service required<input className="field" name="service" placeholder="e.g. Engine oil and filter" required /></label>
          <div className="local-form-row">
            <label>Due date<input className="field" name="dueDate" type="date" required /></label>
            <label>Estimated cost (₹)<input className="field" name="cost" type="number" min="0" step="1" placeholder="0" required /></label>
          </div>
          <label>Status<select className="field" name="status" defaultValue="SCHEDULED"><option value="SCHEDULED">Scheduled</option><option value="IN_PROGRESS">In progress</option><option value="COMPLETED">Completed</option></select></label>
          <label>Notes<textarea className="local-textarea" name="notes" rows={3} placeholder="Optional service notes" /></label>
          <button className="button" type="submit"><CalendarClock size={15} /> Save maintenance item</button>
        </form>

        <section className="panel local-chart-panel">
          <div className="panel-head"><div><strong>Planned maintenance cost</strong><small>Grouped by due month from your local entries</small></div><ClipboardCheck size={17} /></div>
          {!monthlyPlan.length ? <div className="empty compact"><strong>No scheduled costs yet</strong><span>Add maintenance items to build this chart.</span></div> : (
            <div className="local-bar-chart" role="img" aria-label="Planned maintenance costs by due month">
              {monthlyPlan.map(([month, cost]) => (
                <div className="local-bar-column" key={month} title={`${month}: ${currency(cost)}`}>
                  <strong>{currency(cost)}</strong>
                  <i style={{ height: `${Math.max(6, (cost / maxPlan) * 100)}%` }} />
                  <span>{new Intl.DateTimeFormat('en-IN', { month: 'short', year: '2-digit' }).format(new Date(`${month}-01T00:00:00`))}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="panel local-table-panel">
        <div className="panel-head"><div><strong>Maintenance register</strong><small>{records.length} locally saved item{records.length === 1 ? '' : 's'}</small></div></div>
        {!records.length ? <div className="empty compact"><strong>No maintenance items recorded</strong><span>Scheduled service will appear here after you add it.</span></div> : (
          <div className="local-table-scroll">
            <table className="local-record-table">
              <thead><tr><th>Asset</th><th>Service</th><th>Due</th><th>Estimate</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>{records.map((record) => (
                <tr key={record.id}>
                  <td><strong>{record.asset}</strong><small>{record.category}</small></td>
                  <td><strong>{record.service}</strong>{record.notes && <small>{record.notes}</small>}</td>
                  <td>{dateLabel(record.dueDate)}</td>
                  <td>{currency(record.cost)}</td>
                  <td><select className={`local-status-select ${record.status}`} aria-label={`Status for ${record.asset}`} value={record.status} onChange={(event) => updateStatus(record.id, event.target.value as MaintenanceStatus)}><option value="SCHEDULED">Scheduled</option><option value="IN_PROGRESS">In progress</option><option value="COMPLETED">Completed</option></select></td>
                  <td><button className="local-delete-button" type="button" aria-label={`Delete ${record.asset} maintenance item`} onClick={() => removeRecord(record.id)}><X size={15} /></button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
