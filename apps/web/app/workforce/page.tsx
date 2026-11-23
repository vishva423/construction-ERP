'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import {
  ArrowDown, ArrowUp, ChevronLeft, ChevronRight, CircleAlert, Download,
  FilePlus2, LoaderCircle, Search, Upload, Users, X,
} from 'lucide-react';

type Assignment = {
  id: string;
  site: { id: string; name: string; project?: { id: string; name: string } };
};
type Employee = {
  id: string;
  employeeCode: string;
  fullName: string;
  mobile: string;
  designation: string | null;
  department: string | null;
  status: string;
  createdAt: string;
  profilePhotoUrl?: string | null;
  assignments: Assignment[];
};
type EmployeePage = { items: Employee[]; total: number; page: number; pageSize: number };
type SortKey = 'fullName' | 'employeeCode' | 'department' | 'status';

const apiBase = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1').replace(/\/+$/, '');
const pageSize = 10;

async function apiRequest<T>(path: string, token: string, init?: RequestInit): Promise<T> {
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
    throw new Error(body?.message ?? (response.status === 401 ? 'Session expired. Sign in again to continue.' : 'The employee request could not be completed.'));
  }
  return response.json() as Promise<T>;
}

function messageOf(reason: unknown) {
  return reason instanceof Error ? reason.message : 'The request could not be completed.';
}

function downloadCsv(rows: Employee[]) {
  const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const content = [
    ['Employee code', 'Name', 'Mobile', 'Designation', 'Department', 'Status', 'Assigned sites'],
    ...rows.map((employee) => [
      employee.employeeCode, employee.fullName, employee.mobile, employee.designation ?? '',
      employee.department ?? '', employee.status, employee.assignments.map(({ site }) => site.name).join('; '),
    ]),
  ].map((row) => row.map(quote).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'rt-infratech-workforce.csv';
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function WorkforcePage() {
  const [records, setRecords] = useState<EmployeePage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<SortKey>('fullName');
  const [sortAsc, setSortAsc] = useState(true);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [role, setRole] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoSaving, setPhotoSaving] = useState(false);
  const requestSequence = useRef(0);

  const loadEmployees = useCallback(async () => {
    const requestId = ++requestSequence.current;
    const token = sessionStorage.getItem('accessToken');
    if (!token) {
      setRecords(null);
      setError('Sign in to view your company workforce.');
      if (requestId === requestSequence.current) setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        search,
        status: statusFilter === 'ALL' ? '' : statusFilter,
        sortBy: sortKey,
        sortOrder: sortAsc ? 'asc' : 'desc',
      });
      const result = await apiRequest<EmployeePage>(`/employees?${params}`, token);
      if (requestId === requestSequence.current) setRecords(result);
    } catch (reason) {
      if (requestId === requestSequence.current) {
        setError(messageOf(reason));
        setRecords(null);
      }
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }, [page, reloadKey, search, sortAsc, sortKey, statusFilter]);

  useEffect(() => {
    setRole(sessionStorage.getItem('userRole') ?? '');
  }, []);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview('');
      return;
    }
    const previewUrl = URL.createObjectURL(photoFile);
    setPhotoPreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [photoFile]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setPage(1);
      setSearch(query.trim());
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    void loadEmployees();
    return () => { requestSequence.current += 1; };
  }, [loadEmployees]);

  useEffect(() => {
    if (!selected && !showCreate) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeButton = document.querySelector<HTMLElement>('.module-drawer-close');
    closeButton?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelected(null);
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

  const canManage = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'HR_MANAGER', 'PROJECT_MANAGER'].includes(role);
  const sortedItems = records?.items ?? [];
  const totalPages = Math.max(1, Math.ceil((records?.total ?? 0) / pageSize));

  function changeSort(key: SortKey) {
    setPage(1);
    if (sortKey === key) setSortAsc((value) => !value);
    else { setSortKey(key); setSortAsc(true); }
  }

  function filterByStatus(status: string) {
    setStatusFilter(status);
    setPage(1);
  }

  async function openEmployee(employee: Employee) {
    setSelected(employee);
    const token = sessionStorage.getItem('accessToken');
    if (!token) return;
    try {
      const fullRecord = await apiRequest<Employee>(`/employees/${employee.id}`, token);
      setSelected(fullRecord);
    } catch (reason) {
      setNotice(messageOf(reason));
    }
  }

  async function createEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = sessionStorage.getItem('accessToken');
    if (!token) { setError('Sign in to create an employee record.'); return; }
    const form = new FormData(event.currentTarget);
    const selectedPhoto = form.get('profilePhoto');
    const imageFile = selectedPhoto instanceof File && selectedPhoto.size ? selectedPhoto : null;
    if (imageFile && (!['image/jpeg', 'image/png', 'image/webp'].includes(imageFile.type) || imageFile.size > 5 * 1024 * 1024)) {
      setError('Choose a JPEG, PNG, or WebP photo no larger than 5 MB.');
      return;
    }
    const payload: Record<string, string> = {};
    form.forEach((value, key) => { if (typeof value === 'string' && value !== '') payload[key] = value; });
    setSaving(true);
    setError('');
    try {
      const employee = await apiRequest<Employee>('/employees', token, { method: 'POST', body: JSON.stringify(payload) });
      let photoMessage = '';
      if (imageFile) {
        const upload = new FormData();
        upload.append('file', imageFile);
        upload.append('purpose', 'employee-photo');
        upload.append('employeeId', employee.id);
        try {
          await apiRequest('/uploads/image', token, { method: 'POST', body: upload });
        } catch (reason) {
          photoMessage = ` Employee saved, but the photo could not be uploaded: ${messageOf(reason)}`;
        }
      }
      setShowCreate(false);
      setNotice(`Employee record created.${photoMessage}`);
      setPhotoFile(null);
      setPage(1);
      setSearch('');
      setQuery('');
      setStatusFilter('ALL');
      setReloadKey((key) => key + 1);
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setSaving(false);
    }
  }

  async function uploadProfilePhoto(event: FormEvent<HTMLFormElement>, employee: Employee) {
    event.preventDefault();
    const token = sessionStorage.getItem('accessToken');
    const form = event.currentTarget;
    const input = form.elements.namedItem('profilePhoto') as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) { setNotice('Choose a profile photo to upload.'); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setNotice('Choose a JPEG, PNG, or WebP photo no larger than 5 MB.');
      return;
    }
    if (!token) { setNotice('Sign in again before uploading a photo.'); return; }
    const upload = new FormData();
    upload.append('file', file);
    upload.append('purpose', 'employee-photo');
    upload.append('employeeId', employee.id);
    setPhotoSaving(true);
    try {
      const result = await apiRequest<{ url: string }>('/uploads/image', token, { method: 'POST', body: upload });
      const updatedEmployee = { ...employee, profilePhotoUrl: result.url };
      setSelected(updatedEmployee);
      setRecords((current) => current ? {
        ...current,
        items: current.items.map((item) => item.id === employee.id ? updatedEmployee : item),
      } : current);
      setNotice('Employee profile photo uploaded securely.');
      form.reset();
    } catch (reason) {
      setNotice(`Photo upload failed: ${messageOf(reason)}`);
    } finally {
      setPhotoSaving(false);
    }
  }

  return (
    <div className="module-workspace">
      <header className="module-heading">
        <div><p className="module-eyebrow">PEOPLE & ORGANISATION</p><h1>Workforce</h1><p>Company employee directory and current site assignments.</p></div>
        <div className="module-heading-actions">
          <button className="module-secondary-button" type="button" onClick={() => records && downloadCsv(sortedItems)} disabled={!sortedItems.length}><Download size={15} />Export filtered page</button>
          {canManage && <button className="module-primary-button" type="button" onClick={() => setShowCreate(true)}><FilePlus2 size={15} />Add employee</button>}
        </div>
      </header>

      {notice && <div className="module-notice" role="status">{notice}<button type="button" onClick={() => setNotice('')} aria-label="Dismiss message"><X size={15} /></button></div>}
      {error && <div className="module-error" role="alert"><CircleAlert size={17} /><span>{error}</span>{/sign in|session expired/i.test(error) && <a href="/login">Sign in</a>}<button type="button" onClick={() => void loadEmployees()}>Retry</button></div>}

      <section className="module-kpis" aria-label="Workforce summary">
        <button className="module-kpi" type="button" onClick={() => { setQuery(''); setSearch(''); setPage(1); setStatusFilter('ALL'); }}>
          <span className="module-kpi-icon orange"><Users size={18} /></span><span className="module-kpi-label">Matching records</span><strong>{loading ? '…' : records?.total ?? '—'}</strong><small>Company directory · current filters</small>
        </button>
        <button className="module-kpi" type="button" onClick={() => filterByStatus(statusFilter === 'ACTIVE' ? 'ALL' : 'ACTIVE')}>
          <span className="module-kpi-icon green"><Users size={18} /></span><span className="module-kpi-label">Active matches</span><strong>{statusFilter === 'ACTIVE' ? (loading ? '…' : records?.total ?? '—') : '—'}</strong><small>{statusFilter === 'ACTIVE' ? 'Across current search · click to clear' : 'Click to filter active records'}</small>
        </button>
        <button className="module-kpi" type="button" onClick={() => setQuery('')}>
          <span className="module-kpi-icon blue"><Search size={18} /></span><span className="module-kpi-label">Current page</span><strong>{records?.items.length ?? (loading ? '…' : '0')}</strong><small>Showing page {page} of {totalPages}</small>
        </button>
      </section>

      <section className="module-panel">
        <div className="module-panel-heading">
          <div><h2>Employee directory</h2><p>{records ? `${records.total} matching employee record${records.total === 1 ? '' : 's'}` : 'Search and open company employee records'}</p></div>
          <div className="module-list-controls"><label className="module-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, code or mobile" aria-label="Search workforce" /><kbd>⌘ K</kbd></label><select aria-label="Filter employees by status" value={statusFilter} onChange={(event) => filterByStatus(event.target.value)}><option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></div>
        </div>
        <div className="module-table-wrap">
          <table className="module-table">
            <thead><tr>
              {([['fullName', 'Employee'], ['employeeCode', 'Employee code'], ['department', 'Department'], ['status', 'Status']] as const).map(([key, title]) => (
                <th key={key}><button className="table-sort" onClick={() => changeSort(key)} type="button">{title}{sortKey === key ? sortAsc ? <ArrowUp size={12} /> : <ArrowDown size={12} /> : null}</button></th>
              ))}
              <th>Site assignments</th><th><span className="sr-only">Open profile</span></th>
            </tr></thead>
            <tbody>
              {loading ? Array.from({ length: 5 }, (_, index) => <tr className="module-skeleton-row" key={index}><td colSpan={6}><span /></td></tr>) :
                sortedItems.map((employee) => <tr className="module-row-clickable" key={employee.id} onClick={() => void openEmployee(employee)} tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); void openEmployee(employee); } }}>
                  <td><span className="employee-name-cell"><span className="employee-avatar">{employee.profilePhotoUrl ? <Image src={employee.profilePhotoUrl} alt="" width={32} height={32} unoptimized /> : <Image src="/images/avatar-placeholder.svg" alt="" width={32} height={32} />}</span><span><strong>{employee.fullName}</strong><small>{employee.designation || 'Designation not set'}</small></span></span></td>
                  <td>{employee.employeeCode}</td><td>{employee.department || '—'}</td>
                  <td><span className={`module-status-badge ${employee.status.toLowerCase()}`}>{employee.status.replaceAll('_', ' ')}</span></td>
                  <td>{employee.assignments.length ? `${employee.assignments.length} site${employee.assignments.length === 1 ? '' : 's'}` : 'No sites assigned'}</td>
                  <td><button className="module-row-open" type="button" aria-label={`Open ${employee.fullName} profile`} onClick={(event) => { event.stopPropagation(); void openEmployee(employee); }}>›</button></td>
                </tr>)}
            </tbody>
          </table>
          {!loading && !error && !sortedItems.length && <div className="module-empty"><Users size={23} /><strong>{search || statusFilter !== 'ALL' ? 'No matching employees' : 'No employee records yet'}</strong><span>{search || statusFilter !== 'ALL' ? 'Try a different search or status filter.' : 'Create an employee record to begin building your workforce directory.'}</span>{!search && statusFilter === 'ALL' && canManage && <button className="module-primary-button" onClick={() => setShowCreate(true)} type="button"><FilePlus2 size={14} />Add employee</button>}</div>}
        </div>
        <footer className="module-table-footer"><span>{records ? `Page ${page} · ${records.total} total records` : 'Employee records are loaded from your company account.'}</span><div><button type="button" aria-label="Previous page" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft size={16} /></button><strong>{page} / {totalPages}</strong><button type="button" aria-label="Next page" disabled={page >= totalPages || loading} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}><ChevronRight size={16} /></button></div></footer>
      </section>

      {selected && <div className="module-drawer-layer" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
        <aside className="module-drawer" role="dialog" aria-modal="true" aria-labelledby="employee-drawer-title">
          <div className="module-drawer-header"><div><p className="module-eyebrow">EMPLOYEE PROFILE</p><button className="module-drawer-close" type="button" onClick={() => setSelected(null)} aria-label="Close employee profile"><X size={18} /></button></div>
            <div className="employee-profile-summary"><span className="employee-avatar large">{selected.profilePhotoUrl ? <Image src={selected.profilePhotoUrl} alt="" width={44} height={44} unoptimized /> : <Image src="/images/avatar-placeholder.svg" alt="" width={44} height={44} />}</span><span><h2 id="employee-drawer-title">{selected.fullName}</h2><small>{selected.designation || 'Designation not set'} · {selected.employeeCode}</small></span></div>
            <span className={`module-status-badge ${selected.status.toLowerCase()}`}>{selected.status.replaceAll('_', ' ')}</span>
          </div>
          <div className="module-drawer-content">
            <section><h3>Contact and organisation</h3><dl className="employee-details"><div><dt>Mobile</dt><dd>{selected.mobile}</dd></div><div><dt>Department</dt><dd>{selected.department || 'Not recorded'}</dd></div><div><dt>Created</dt><dd>{new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(selected.createdAt))}</dd></div></dl></section>
            <section><h3>Profile photo</h3><form className="employee-photo-upload" onSubmit={(event) => void uploadProfilePhoto(event, selected)}><label>Choose a new photo<input name="profilePhoto" type="file" accept="image/jpeg,image/png,image/webp" /></label><small>Private upload · JPEG, PNG, or WebP · max 5 MB</small><button className="module-secondary-button" type="submit" disabled={photoSaving}>{photoSaving ? <LoaderCircle className="module-spin" size={14} /> : <Upload size={14} />}{photoSaving ? 'Uploading…' : 'Upload photo'}</button></form></section>
            <section><h3>Site assignments <span>{selected.assignments.length}</span></h3>{selected.assignments.length ? <div className="employee-assignment-list">{selected.assignments.map(({ id, site }) => <article key={id}><span className="assignment-marker" /><span><strong>{site.name}</strong><small>{site.project?.name ?? 'Project not available'}</small></span></article>)}</div> : <p className="module-inline-empty">No site assignments are recorded for this employee.</p>}</section>
            <section><h3>Other records</h3><p className="module-inline-empty">Attendance history, salary, personal documents and approval timelines are not available in the current API.</p></section>
          </div>
          <footer className="module-drawer-footer"><button className="module-secondary-button" type="button" onClick={() => setSelected(null)}>Close profile</button></footer>
        </aside>
      </div>}

      {showCreate && <div className="module-modal-layer" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setShowCreate(false); }}>
        <section className="module-form-modal" role="dialog" aria-modal="true" aria-labelledby="employee-create-title">
          <header><div><p className="module-eyebrow">WORKFORCE DIRECTORY</p><h2 id="employee-create-title">Add employee</h2><p>Create a persistent employee record for this company.</p></div><button className="module-drawer-close" type="button" onClick={() => setShowCreate(false)} aria-label="Close form" disabled={saving}><X size={18} /></button></header>
          <form onSubmit={createEmployee}>
            <label>Employee code<input name="employeeCode" required maxLength={50} /></label><label>Full name<input name="fullName" required maxLength={120} /></label>
            <label>Mobile<input name="mobile" required maxLength={30} inputMode="tel" /></label><label>Designation<input name="designation" maxLength={120} /></label>
            <label>Department<input name="department" maxLength={120} /></label>
            <label className="employee-photo-create">Profile photo (optional)<input name="profilePhoto" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)} /><small>JPEG, PNG, or WebP · max 5 MB</small>{photoPreview && <Image src={photoPreview} alt="Selected employee profile photo" width={72} height={72} unoptimized />}</label>
            {error && <p className="module-form-error" role="alert">{error}</p>}
            <footer><button className="module-secondary-button" type="button" onClick={() => setShowCreate(false)} disabled={saving}>Cancel</button><button className="module-primary-button" type="submit" disabled={saving}>{saving ? <LoaderCircle className="module-spin" size={15} /> : <FilePlus2 size={15} />}{saving ? 'Saving…' : 'Create employee'}</button></footer>
          </form>
        </section>
      </div>}
    </div>
  );
}
