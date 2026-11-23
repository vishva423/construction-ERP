'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { CircleAlert, Fuel as FuelIcon, Gauge, IndianRupee, X } from 'lucide-react';
import { readLocalRecords, writeLocalRecords } from '../../lib/local-records';

type FuelRecord = {
  id: string;
  date: string;
  asset: string;
  project: string;
  liters: number;
  pricePerLiter: number;
  meterReading: number | null;
};

const storageKey = 'rtinfra.local-fuel.v1';

function isFuelRecord(value: unknown): value is FuelRecord {
  return typeof value === 'object' && value !== null
    && 'id' in value && typeof value.id === 'string'
    && 'date' in value && typeof value.date === 'string'
    && 'asset' in value && typeof value.asset === 'string'
    && 'project' in value && typeof value.project === 'string'
    && 'liters' in value && typeof value.liters === 'number'
    && 'pricePerLiter' in value && typeof value.pricePerLiter === 'number'
    && 'meterReading' in value && (typeof value.meterReading === 'number' || value.meterReading === null);
}

function currency(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`));
}

export default function FuelPage() {
  const [records, setRecords] = useState<FuelRecord[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    try {
      setRecords(readLocalRecords(storageKey, isFuelRecord));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load local fuel records.');
    }
  }, []);

  const totalLiters = records.reduce((total, record) => total + record.liters, 0);
  const totalCost = records.reduce((total, record) => total + record.liters * record.pricePerLiter, 0);
  const averagePrice = totalLiters ? totalCost / totalLiters : 0;
  const monthlyCost = useMemo(() => {
    const totals = new Map<string, number>();
    records.forEach((record) => {
      const month = record.date.slice(0, 7);
      totals.set(month, (totals.get(month) ?? 0) + record.liters * record.pricePerLiter);
    });
    return [...totals.entries()].sort(([first], [second]) => first.localeCompare(second));
  }, [records]);
  const maxCost = Math.max(1, ...monthlyCost.map(([, cost]) => cost));

  function persist(nextRecords: FuelRecord[]) {
    try {
      writeLocalRecords(storageKey, nextRecords);
      setRecords(nextRecords);
      setError('');
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save fuel records in this browser.');
      return false;
    }
  }

  function addRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const liters = Number(values.get('liters'));
    const pricePerLiter = Number(values.get('pricePerLiter'));
    const rawMeter = String(values.get('meterReading') ?? '').trim();
    const record: FuelRecord = {
      id: crypto.randomUUID(),
      date: String(values.get('date') ?? ''),
      asset: String(values.get('asset') ?? '').trim(),
      project: String(values.get('project') ?? '').trim(),
      liters,
      pricePerLiter,
      meterReading: rawMeter ? Number(rawMeter) : null,
    };

    if (!record.date || !record.asset || !Number.isFinite(liters) || liters <= 0
      || !Number.isFinite(pricePerLiter) || pricePerLiter < 0
      || (record.meterReading !== null && (!Number.isFinite(record.meterReading) || record.meterReading < 0))) {
      setError('Enter an asset, date, positive fuel quantity, and valid price and meter reading.');
      return;
    }
    if (persist([record, ...records])) {
      form.reset();
      setNotice('Fuel entry saved on this device.');
    }
  }

  function removeRecord(id: string) {
    persist(records.filter((record) => record.id !== id));
  }

  return (
    <>
      <div className="page-header">
        <div><p className="eyebrow">FLEET & RESOURCES</p><h1>Fuel management</h1><p>Record fuel usage and review costs by asset and month.</p></div>
      </div>
      <div className="local-data-notice"><CircleAlert size={16} /> These entries are stored only in this browser. Shared fuel records require the API.</div>
      {error && <div className="local-form-error" role="alert">{error}</div>}
      {notice && <div className="local-form-success" role="status">{notice}</div>}

      <section className="local-metric-grid" aria-label="Fuel summary">
        <article className="local-metric-card"><span>Total fuel used</span><strong>{new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 }).format(totalLiters)} L</strong><small>From entered fuel logs</small></article>
        <article className="local-metric-card"><span>Total fuel cost</span><strong>{currency(totalCost)}</strong><small>Liters × price per liter</small></article>
        <article className="local-metric-card"><span>Average price</span><strong>{currency(averagePrice)}<small className="local-metric-unit"> / L</small></strong><small>Weighted by usage</small></article>
      </section>

      <div className="local-workspace-grid">
        <form className="panel local-record-form" onSubmit={addRecord}>
          <div className="panel-head"><div><strong>Record fuel usage</strong><small>Enter a receipt or equipment refueling</small></div><FuelIcon size={17} /></div>
          <label>Asset ID<input className="field" name="asset" placeholder="e.g. EX-001" required /></label>
          <label>Project or site<input className="field" name="project" placeholder="Optional project/site name" /></label>
          <div className="local-form-row">
            <label>Date<input className="field" name="date" type="date" required /></label>
            <label>Fuel used (L)<input className="field" name="liters" type="number" min="0.01" step="0.01" placeholder="0.00" required /></label>
          </div>
          <div className="local-form-row">
            <label>Price per liter (₹)<input className="field" name="pricePerLiter" type="number" min="0" step="0.01" placeholder="0.00" required /></label>
            <label>Meter reading<input className="field" name="meterReading" type="number" min="0" step="1" placeholder="Optional" /></label>
          </div>
          <div className="local-cost-preview"><IndianRupee size={16} /><span>Entry cost is calculated as liters × price per liter.</span><Gauge size={16} /></div>
          <button className="button" type="submit"><FuelIcon size={15} /> Save fuel entry</button>
        </form>

        <section className="panel local-chart-panel">
          <div className="panel-head"><div><strong>Fuel cost by month</strong><small>Calculated from your local entries</small></div><IndianRupee size={17} /></div>
          {!monthlyCost.length ? <div className="empty compact"><strong>No fuel entries yet</strong><span>Add usage records to build this chart.</span></div> : (
            <div className="local-bar-chart" role="img" aria-label="Fuel cost by month">
              {monthlyCost.map(([month, cost]) => (
                <div className="local-bar-column" key={month} title={`${month}: ${currency(cost)}`}>
                  <strong>{currency(cost)}</strong>
                  <i style={{ height: `${Math.max(6, (cost / maxCost) * 100)}%` }} />
                  <span>{new Intl.DateTimeFormat('en-IN', { month: 'short', year: '2-digit' }).format(new Date(`${month}-01T00:00:00`))}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="panel local-table-panel">
        <div className="panel-head"><div><strong>Fuel usage register</strong><small>{records.length} locally saved entr{records.length === 1 ? 'y' : 'ies'}</small></div></div>
        {!records.length ? <div className="empty compact"><strong>No fuel usage recorded</strong><span>Add a fuel entry to track liters and costs.</span></div> : (
          <div className="local-table-scroll">
            <table className="local-record-table">
              <thead><tr><th>Date</th><th>Asset / project</th><th>Fuel used</th><th>Price / L</th><th>Total cost</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>{records.map((record) => (
                <tr key={record.id}>
                  <td>{dateLabel(record.date)}</td>
                  <td><strong>{record.asset}</strong><small>{record.project || 'No project specified'}{record.meterReading !== null ? ` · Meter ${new Intl.NumberFormat('en-IN').format(record.meterReading)}` : ''}</small></td>
                  <td>{new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 }).format(record.liters)} L</td>
                  <td>{currency(record.pricePerLiter)}</td>
                  <td><strong>{currency(record.liters * record.pricePerLiter)}</strong></td>
                  <td><button className="local-delete-button" type="button" aria-label={`Delete fuel entry for ${record.asset}`} onClick={() => removeRecord(record.id)}><X size={15} /></button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
