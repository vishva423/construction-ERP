'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  Building2,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  CircleGauge,
  Fuel,
  HardHat,
  LayoutDashboard,
  Menu,
  Search,
  Settings,
  Truck,
  UserCheck,
  Users,
  Wrench,
  X,
} from 'lucide-react';

const publicRoutes = new Set(['/', '/login']);

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Projects', href: '/projects', icon: Building2 },
  { label: 'Sites', href: '/sites', icon: MapPinIcon },
  { label: 'Workforce', href: '/workforce', icon: Users },
  { label: 'Employees', href: '/employees', icon: HardHat },
  { label: 'Attendance', href: '/attendance', icon: UserCheck },
  { label: 'Machines', href: '/machines', icon: Truck },
  { label: 'Equipment', href: '/equipment', icon: Wrench },
  { label: 'Maintenance', href: '/maintenance', icon: CalendarCheck },
  { label: 'Fuel', href: '/fuel', icon: Fuel },
  { label: 'Progress', href: '/progress', icon: CircleGauge },
  { label: 'Reports', href: '/reports', icon: Search },
  { label: 'Settings', href: '/settings', icon: Settings },
];

function MapPinIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return query ? navItems.filter(({ label }) => label.toLowerCase().includes(query)) : navItems;
  }, [searchQuery]);

  useEffect(() => {
    const isDemoMode = sessionStorage.getItem('demoMode') === 'true';
    setDemoMode(isDemoMode);
    if (isDemoMode && pathname !== '/demo' && !publicRoutes.has(pathname)) {
      router.replace('/demo');
    }
  }, [pathname, router]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      } else if (event.key === 'Escape') {
        setSearchOpen(false);
        setSearchQuery('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    searchInputRef.current?.focus();
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (event.target instanceof Node && !searchContainerRef.current?.contains(event.target)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [searchOpen]);

  if (pathname === '/demo' || publicRoutes.has(pathname) || pathname.startsWith('/(auth)')) {
    return <>{children}</>;
  }

  if (demoMode) {
    return <main className="demo-access-notice">Read-only demo access only. <Link href="/demo">Return to demo</Link></main>;
  }

  return (
    <div className="admin-shell" style={collapsed ? { gridTemplateColumns: '72px minmax(0, 1fr)' } : undefined}>
      <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
        <div className="brand">
          <Image
            className="brand-logo"
            src="/brand/lotus-emblem.jpg"
            width={40}
            height={40}
            alt="RT Infratech"
          />
          {!collapsed && (
            <span className="brand-name">
              <strong>RT Infratech</strong>
              <span>CONSTRUCTION ERP</span>
            </span>
          )}
        </div>

        <nav className="nav" aria-label="Primary navigation">
          {navItems.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={pathname === href || pathname.startsWith(`${href}/`) ? 'active' : undefined}
              title={collapsed ? label : undefined}
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <button className="collapse" type="button" onClick={() => setCollapsed((value) => !value)}>
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          <span>{collapsed ? 'Expand' : 'Collapse'}</span>
        </button>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <div className="topbar-title">RT Infratech</div>
            <div className="topbar-meta">Construction operations</div>
          </div>
          <div className="topbar-actions">
            <div className="workspace-search" ref={searchContainerRef}>
              <button
                className="search-button"
                type="button"
                aria-label="Search workspace pages"
                aria-expanded={searchOpen}
                onClick={() => setSearchOpen((open) => !open)}
              >
                <Search size={15} />
                <span>Search</span>
                <kbd>Ctrl K</kbd>
              </button>
              {searchOpen && (
                <div className="workspace-search-popover" role="dialog" aria-label="Search workspace pages">
                  <label className="workspace-search-input">
                    <Search size={15} aria-hidden="true" />
                    <input
                      ref={searchInputRef}
                      type="search"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Search pages..."
                      aria-label="Search pages"
                    />
                    <button
                      type="button"
                      className="icon-button"
                      aria-label="Close search"
                      onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                    >
                      <X size={14} />
                    </button>
                  </label>
                  <span className="search-section-label">{searchQuery.trim() ? 'RESULTS' : 'QUICK LINKS'}</span>
                  <div className="workspace-search-results">
                    {searchResults.length ? searchResults.map(({ label, href, icon: Icon }) => (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                      >
                        <Icon size={15} />
                        <span>{label}</span>
                      </Link>
                    )) : <p>No pages match “{searchQuery}”.</p>}
                  </div>
                </div>
              )}
            </div>
            <button className="icon-button" type="button" aria-label="Notifications">
              <Bell size={16} />
              <span className="notification-dot" />
            </button>
            <button className="profile-button" type="button" aria-label="Open profile">
              <span className="avatar">RT</span>
              <span className="profile-copy">
                <strong>Super admin</strong>
                <small>Local demo access</small>
              </span>
              <Menu size={14} />
            </button>
          </div>
        </header>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}
