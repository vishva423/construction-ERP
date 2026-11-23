'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, Building2,
  Check, ChevronLeft, ChevronRight, HardHat, Layers3, Menu, ShieldCheck,
  X,
} from 'lucide-react';

const services = [
  {
    title: 'Roads & highways',
    shortTitle: 'Roads & highways',
    description: 'Infrastructure built for reliable movement and lasting performance.',
    detail: 'Road and highway work connects places, people and commerce. Delivery starts with understanding the corridor, site conditions and project scope, then coordinating the work through to review and handover.',
    scope: ['Road and corridor construction', 'Site and work-sequence coordination', 'Field progress and handover review'],
    applications: 'Road networks, access routes and essential transport infrastructure.',
    icon: Layers3,
    kind: 'road',
    number: '01',
  },
  {
    title: 'Building construction',
    shortTitle: 'Buildings',
    description: 'Practical building delivery grounded in thoughtful planning and execution.',
    detail: 'Building delivery brings scope, people, materials and site activity together. Clear coordination helps teams work through the planned sequence and keep project decisions visible.',
    scope: ['Building project coordination', 'Site activity and milestone tracking', 'Quality-minded review and handover'],
    applications: 'Building and civil construction delivered to the agreed project scope.',
    icon: Building2,
    kind: 'building',
    number: '02',
  },
  {
    title: 'Pile foundation',
    shortTitle: 'Pile foundations',
    description: 'Foundation works planned around demanding project and site conditions.',
    detail: 'Foundation work begins with the project requirements and site context. Teams coordinate the planned work, equipment and reporting so progress can be reviewed as the foundation scope advances.',
    scope: ['Foundation scope coordination', 'Worksite and equipment sequencing', 'Milestone-based progress review'],
    applications: 'Foundation packages supporting larger building and infrastructure works.',
    icon: HardHat,
    kind: 'foundation',
    number: '03',
  },
  {
    title: 'Bridges & infrastructure',
    shortTitle: 'Bridges',
    description: 'Connected infrastructure delivered with care at every stage.',
    detail: 'Bridge and infrastructure packages call for careful coordination across project stages. Scope, worksite activity and progress checkpoints are kept aligned through delivery.',
    scope: ['Bridge and infrastructure works', 'Multi-stage site coordination', 'Progress review through handover'],
    applications: 'Bridge structures and connected civil infrastructure.',
    icon: ArrowUpRight,
    kind: 'bridge',
    number: '04',
  },
] as const;

const process = [
  ['01', 'Understand', 'Align on scope, site conditions and project priorities.'],
  ['02', 'Plan', 'Coordinate people, equipment, sequence and delivery needs.'],
  ['03', 'Execute', 'Keep field teams and project activity moving together.'],
  ['04', 'Review', 'Follow progress, resolve issues and prepare for handover.'],
];

const navItems = [
  { label: 'Capabilities', href: '#capabilities' },
  { label: 'Our approach', href: '#approach' },
  { label: 'Our principles', href: '#principles' },
  { label: 'Project workspace', href: '#projects' },
];

function ServiceIllustration({ kind }: { kind: string }) {
  return (
    <svg className={`service-illustration illustration-${kind}`} viewBox="0 0 540 330" fill="none" role="img" aria-label={`${kind} engineering illustration`}>
      <defs>
        <linearGradient id={`warm-${kind}`} x1="120" y1="50" x2="420" y2="290" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F4B089" />
          <stop offset="1" stopColor="#D87547" />
        </linearGradient>
        <pattern id={`grid-${kind}`} width="22" height="22" patternUnits="userSpaceOnUse">
          <path d="M22 0H0V22" stroke="#E8E2DA" strokeWidth="1" />
        </pattern>
      </defs>
      <rect x="38" y="26" width="464" height="274" rx="18" fill={`url(#grid-${kind})`} opacity=".9" />
      {kind === 'road' && <>
        <path d="M58 258 211 72h121l150 186H58Z" fill="#EEEAE4" stroke="#C9C4BB" strokeWidth="2" />
        <path d="M142 258 243 72h45l106 186H142Z" fill={`url(#warm-${kind})`} opacity=".86" />
        <path d="m226 258 25-186h13l27 186h-65Z" fill="#FBF8F3" />
        <path d="m185 246 10-19m8-18 10-19m8-17 9-17m9-17 8-16m8-16 7-14" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
        <path d="M58 258h424" stroke="#343633" strokeWidth="3" />
        <path d="m75 232 24 6m14-23 23 7m284 10 23-7m-11 24 25-7" stroke="#91928B" strokeWidth="2" strokeLinecap="round" />
        <circle cx="163" cy="111" r="13" fill="#E8F0E7" stroke="#7D9C82" strokeWidth="2" /><path d="M163 105v12m-5-6h10" stroke="#67866D" strokeWidth="2" strokeLinecap="round" />
        <circle cx="368" cy="112" r="13" fill="#FFF2E9" stroke="#D87547" strokeWidth="2" /><path d="M368 106v12m-5-6h10" stroke="#C46B43" strokeWidth="2" strokeLinecap="round" />
      </>}
      {kind === 'building' && <>
        <path d="m115 131 155-76 155 76-155 79-155-79Z" fill="#F9F4ED" stroke="#C9BFB2" strokeWidth="2" />
        <path d="M145 145v100l125 65 125-65V145l-125 65-125-65Z" fill="#FBFAF7" stroke="#A9A69D" strokeWidth="2" />
        <path d="M270 210v100m-125-65 125 65 125-65" stroke="#AAA69C" strokeWidth="2" />
        <path d="m173 153 38-20v40l-38 20v-40Zm76-39 38-19v40l-38 20v-41Zm76 39 38-20v40l-38 20v-40Z" fill="#F1C0A2" stroke="#D87547" strokeWidth="2" />
        <path d="m177 214 36 18v48l-36-19v-47Zm77 38 36 18v40l-36-19v-39Zm77-37 36-19v46l-36 19v-46Z" fill="#EEE8DF" stroke="#B6AFA4" strokeWidth="2" />
        <path d="M113 246h314" stroke="#343633" strokeWidth="3" />
      </>}
      {kind === 'foundation' && <>
        <path d="M86 89h369v30H86z" fill="#E7E1D8" stroke="#AAA59B" strokeWidth="2" />
        <path d="M105 118h333v36H105z" fill="#F3EDE5" stroke="#AAA59B" strokeWidth="2" />
        <path d="m136 154 12 118m52-118 6 118m57-118v118m58-118-6 118m58-118-12 118" stroke={`url(#warm-${kind})`} strokeWidth="13" strokeLinecap="round" />
        <path d="M86 272h369" stroke="#343633" strokeWidth="3" />
        <path d="m72 282 36-20m60 20 34-20m63 20 33-20m64 20 35-20m28 20 36-20" stroke="#ABA69D" strokeWidth="2" />
        <path d="M108 74h324" stroke="#6D756E" strokeWidth="2" strokeDasharray="7 7" />
        <path d="M174 51v26m132-26v26m-132-15h132" stroke="#6D756E" strokeWidth="2" />
        <circle cx="174" cy="51" r="5" fill="#7D9C82" /><circle cx="306" cy="51" r="5" fill="#7D9C82" />
      </>}
      {kind === 'bridge' && <>
        <path d="M63 212h414" stroke="#363834" strokeWidth="4" />
        <path d="m94 207 54-23 58-19 60-10 57 10 60 19 63 23" stroke={`url(#warm-${kind})`} strokeWidth="7" strokeLinecap="round" />
        <path d="M111 212v62m75-81v81m82-111v111m82-92v92m75-62v62" stroke="#9D9C92" strokeWidth="4" />
        <path d="M83 274h374" stroke="#777970" strokeWidth="3" />
        <path d="m111 212 75 62m-75-62 82 0m-82 0 82-19m-82 19 164 62m-82-81 82 81m0-111v111m0-111 82 111m-82-111 82 19m0 0 75 62m-75-62 75 0" stroke="#CAC5BB" strokeWidth="1.5" />
        <path d="M58 285h424" stroke="#343633" strokeWidth="3" />
        <circle cx="130" cy="196" r="6" fill="#D87547" /><circle cx="270" cy="156" r="6" fill="#D87547" /><circle cx="411" cy="196" r="6" fill="#D87547" />
      </>}
    </svg>
  );
}

export default function CompanyHome() {
  const [selectedService, setSelectedService] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('top');
  const [scrolled, setScrolled] = useState(false);
  const [serviceCount, setServiceCount] = useState(0);
  const heroImageRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const modalRef = useRef<HTMLElement>(null);

  const closeService = useCallback(() => setSelectedService(null), []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeService();
        setMobileMenuOpen(false);
      }
      if (selectedService !== null && event.key === 'ArrowRight') {
        setSelectedService((selectedService + 1) % services.length);
      }
      if (selectedService !== null && event.key === 'ArrowLeft') {
        setSelectedService((selectedService + services.length - 1) % services.length);
      }
    };

    let frame = 0;
    const updateScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const scrollable = document.documentElement.scrollHeight - window.innerHeight;
        const progress = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
        document.documentElement.style.setProperty('--site-scroll-progress', `${progress}%`);
        setScrolled(window.scrollY > 560);
        if (heroImageRef.current) {
          heroImageRef.current.style.setProperty('--hero-parallax', `${Math.min(window.scrollY * 0.12, 72)}px`);
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', updateScroll, { passive: true });
    updateScroll();
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', updateScroll);
      cancelAnimationFrame(frame);
    };
  }, [closeService, selectedService]);

  useEffect(() => {
    if (selectedService === null) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = 'hidden';
    modalRef.current?.querySelector<HTMLElement>('.service-modal-close')?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [selectedService]);

  useEffect(() => {
    if (selectedService === null) return;
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !modalRef.current) return;
      const focusable = Array.from(modalRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      ));
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener('keydown', trapFocus);
    return () => window.removeEventListener('keydown', trapFocus);
  }, [selectedService]);

  useEffect(() => {
    const observed = document.querySelectorAll<HTMLElement>('.reveal-on-scroll');
    const revealObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      }
    }, { threshold: 0.16 });
    observed.forEach((element) => revealObserver.observe(element));

    const navSections = ['top', 'capabilities', 'approach', 'principles', 'projects']
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);
    const navObserver = new IntersectionObserver((entries) => {
      const current = entries.filter((entry) => entry.isIntersecting)
        .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];
      if (current) setActiveSection(current.target.id);
    }, { rootMargin: '-18% 0px -65% 0px', threshold: [0, 0.15, 0.4] });
    navSections.forEach((section) => navObserver.observe(section));

    const countObserver = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setServiceCount(services.length);
        countObserver.disconnect();
      }
    }, { threshold: 0.3 });
    const countTarget = document.getElementById('company-snapshot');
    if (countTarget) countObserver.observe(countTarget);

    return () => {
      revealObserver.disconnect();
      navObserver.disconnect();
      countObserver.disconnect();
    };
  }, []);

  const showService = (index: number) => setSelectedService(index);
  const selected = selectedService === null ? null : services[selectedService];

  return (
    <main className="company-site" id="top">
      <div className="site-scroll-progress" aria-hidden="true" />
      <header className="site-header">
        <Link className="site-brand" href="/" aria-label="Ramakrishnan Thirumalai home" onClick={() => setMobileMenuOpen(false)}>
          <Image src="/brand/lotus-emblem.jpg" alt="" width={46} height={46} priority />
          <span><strong>RAMAKRISHNAN THIRUMALAI</strong><small>(INDIA) LLP</small></span>
        </Link>
        <button className="site-mobile-toggle" aria-label={mobileMenuOpen ? 'Close website navigation' : 'Open website navigation'} aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen((open) => !open)} type="button">
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <nav className={`site-nav${mobileMenuOpen ? ' is-open' : ''}`} aria-label="Website navigation">
          {navItems.map(({ label, href }) => {
            const id = href.slice(1);
            return <a className={activeSection === id ? 'active' : ''} href={href} key={href} onClick={() => setMobileMenuOpen(false)}>{label}</a>;
          })}
        </nav>
        <Link className="site-header-cta" href="/login">Team sign in <ArrowRight size={15} /></Link>
      </header>

      <section className="site-hero">
        <div className="site-hero-image" ref={heroImageRef} role="img" aria-label="Ramakrishnan Thirumalai company infrastructure banner" />
        <div className="site-hero-shade" />
        <div className="site-hero-content">
          <span className="site-eyebrow"><i /> ENGINEERING & CONSTRUCTION</span>
          <h1>Building a<br /><em>stronger tomorrow.</em></h1>
          <p>Ramakrishnan Thirumalai (India) LLP delivers construction and infrastructure works across roads, buildings, pile foundations and bridges.</p>
          <div className="site-hero-actions"><a className="site-primary-cta" href="#capabilities">Explore our capabilities <ArrowRight size={17} /></a><a className="site-secondary-cta" href="#approach">How we work <ArrowDown size={16} /></a></div>
          <div className="site-hero-caption"><span className="caption-line" />Infrastructure. Built with purpose.</div>
        </div>
        <div className="site-hero-tag"><span>OUR WORK</span><strong>Built for the long run</strong></div>
        <a className="hero-scroll-cue" href="#company-snapshot" aria-label="Scroll to company information"><span />Scroll to explore</a>
      </section>

      <section className="company-snapshot section-wrap reveal-on-scroll" id="company-snapshot">
        <div className="snapshot-copy"><span className="site-eyebrow dark">A CLEAR VIEW OF OUR WORK</span><h2>Focused on the<br /><em>work that matters.</em></h2></div>
        <p>One engineering and contracting practice. Four areas of work. A coordinated path from project scope through site delivery and handover.</p>
        <div className="snapshot-stat"><strong>{serviceCount}<span> areas</span></strong><small>of construction capability</small></div>
      </section>

      <section className="site-intro section-wrap reveal-on-scroll">
        <div><span className="site-eyebrow dark">WHO WE ARE</span><h2>Grounded in engineering.<br /><em>Focused on delivery.</em></h2></div>
        <p>We are an engineering and contracting company working across essential infrastructure and civil construction. Our focus is clear coordination—from early planning through field execution and project handover.</p>
      </section>

      <section className="site-capabilities section-wrap" id="capabilities">
        <div className="site-section-heading reveal-on-scroll"><div><span className="site-eyebrow dark">WHAT WE DO</span><h2>Capabilities that connect<br />communities and commerce.</h2></div><p>Choose an area to explore its scope and applications.</p></div>
        <div className="service-grid">
          {services.map(({ title, description, icon: Icon, number, kind }, index) => (
            <button className="service-card service-card-button reveal-on-scroll" key={number} onClick={() => showService(index)} type="button" aria-haspopup="dialog" aria-label={`Explore ${title}`}>
              <span className={`service-card-art art-${kind}`}><ServiceIllustration kind={kind} /></span>
              <span className="service-card-top"><span>{number} / CAPABILITY</span><Icon size={20} strokeWidth={1.7} /></span>
              <span className="service-card-copy"><strong>{title}</strong><span>{description}</span></span>
              <span className="service-card-open"><span>Explore capability</span><ArrowUpRight size={17} /></span>
            </button>
          ))}
        </div>
      </section>

      <section className="site-approach" id="approach">
        <div className="section-wrap approach-inner">
          <div className="site-section-heading approach-heading reveal-on-scroll"><div><span className="site-eyebrow">HOW WE WORK</span><h2>A considered path<br />from scope to site.</h2></div><p>Good delivery comes from clear priorities, coordinated teams and consistent review at every stage.</p></div>
          <div className="approach-steps">
            {process.map(([number, title, description]) => <article className="approach-step reveal-on-scroll" key={number}><span className="approach-number">{number}</span><div className="approach-marker" /><h3>{title}</h3><p>{description}</p></article>)}
          </div>
        </div>
      </section>

      <section className="site-principles section-wrap" id="principles">
        <div className="principle-copy reveal-on-scroll"><span className="site-eyebrow dark">OUR COMMITMENT</span><h2>Every detail matters<br />on the way to <em>done.</em></h2><p>We value disciplined planning, responsible site coordination and clear communication—so teams can focus on the work that matters.</p><Link className="principle-link" href="/progress">Explore project progress <ArrowRight size={16} /></Link></div>
        <div className="principle-card reveal-on-scroll"><div className="principle-emblem"><ShieldCheck size={26} /></div><span>THE WAY WE WORK</span><h3>Built around the worksite.</h3><ul><li>People and responsibilities clearly coordinated</li><li>Project activity reviewed with care</li><li>Progress kept visible to the team</li><li>Quality and safety considered throughout</li></ul></div>
      </section>

      <section className="public-projects" id="projects">
        <div className="section-wrap public-projects-inner reveal-on-scroll">
          <div className="public-projects-heading">
            <div><span className="site-eyebrow">CAPABILITY CONCEPTS</span><h2>Built around the work that matters.</h2></div>
            <p>Explore illustrative construction concepts across our areas of work. These are visual examples, not photographs or claims of completed company projects.</p>
          </div>
          <div className="public-concept-gallery" aria-label="Illustrative construction capability concepts">
            {services.map(({ title, shortTitle, kind, icon: Icon }, index) => (
              <button className="public-concept-card" key={kind} type="button" onClick={() => showService(index)} aria-haspopup="dialog" aria-label={`View ${title} concept details`}>
                <span className={`public-concept-art art-${kind}`}><ServiceIllustration kind={kind} /><span className="public-concept-label">ILLUSTRATIVE CONCEPT</span></span>
                <span className="public-concept-copy"><span><Icon size={16} /><small>{String(index + 1).padStart(2, '0')} / CAPABILITY</small></span><strong>{shortTitle}</strong><span className="public-concept-action">View concept details <ArrowUpRight size={14} /></span></span>
              </button>
            ))}
          </div>
          <div className="public-workspace-link"><span>Looking for verified project records?</span><Link href="/login">Open the company workspace <ArrowUpRight size={15} /></Link></div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="site-footer-main"><Link className="site-brand footer-brand" href="/"><Image src="/brand/lotus-emblem.jpg" alt="" width={44} height={44} /><span><strong>RAMAKRISHNAN THIRUMALAI</strong><small>(INDIA) LLP</small></span></Link><p>Roads&nbsp; | &nbsp;Building&nbsp; | &nbsp;Pile Foundation&nbsp; | &nbsp;Bridges</p><Link className="footer-login" href="/login">Team sign in <ArrowUpRight size={15} /></Link></div>
        <div className="site-footer-bottom"><span>© {new Date().getFullYear()} Ramakrishnan Thirumalai (India) LLP</span><a href="#top">Back to top <ArrowUp size={13} /></a><span>Building a Stronger Tomorrow</span></div>
      </footer>

      {scrolled && <button className="back-to-top" type="button" aria-label="Back to top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}><ArrowUp size={18} /></button>}

      {selected && selectedService !== null && (
        <div className="service-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeService(); }}>
          <section ref={modalRef} className="service-modal" role="dialog" aria-modal="true" aria-labelledby="service-modal-title" onTouchStart={(event) => { touchStartX.current = event.touches[0]?.clientX ?? null; }} onTouchEnd={(event) => {
            if (touchStartX.current === null) return;
            const difference = event.changedTouches[0]!.clientX - touchStartX.current;
            if (Math.abs(difference) > 65) setSelectedService((selectedService + (difference < 0 ? 1 : services.length - 1)) % services.length);
            touchStartX.current = null;
          }}>
            <div className="service-modal-art"><ServiceIllustration kind={selected.kind} /><span className="modal-image-caption">ILLUSTRATIVE ENGINEERING DIAGRAM · NOT A PROJECT PHOTOGRAPH</span></div>
            <div className="service-modal-content">
              <div className="service-modal-topline"><span>{selected.number} / {selected.shortTitle.toUpperCase()}</span><button className="service-modal-close" onClick={closeService} type="button" aria-label="Close capability details"><X size={19} /></button></div>
              <h2 id="service-modal-title">{selected.title}</h2>
              <p className="service-modal-description">{selected.detail}</p>
              <div className="service-modal-details">
                <div><h3>Project scope</h3><ul>{selected.scope.map((item) => <li key={item}><Check size={14} />{item}</li>)}</ul></div>
                <div><h3>Applications</h3><p>{selected.applications}</p><small>Exact deliverables and technologies are defined for each project scope.</small></div>
              </div>
              <div className="service-modal-footer">
                <div className="service-modal-pagination"><button type="button" onClick={() => setSelectedService((selectedService + services.length - 1) % services.length)} aria-label="Previous capability"><ChevronLeft size={17} /></button><span>{String(selectedService + 1).padStart(2, '0')} <i>/</i> {String(services.length).padStart(2, '0')}</span><button type="button" onClick={() => setSelectedService((selectedService + 1) % services.length)} aria-label="Next capability"><ChevronRight size={17} /></button></div>
                <Link className="site-primary-cta" href="/login" onClick={closeService}>View project workspace <ArrowRight size={16} /></Link>
              </div>
            </div>
          </section>
          <button className="service-modal-prev" type="button" aria-label="Previous capability" onClick={() => setSelectedService((selectedService + services.length - 1) % services.length)}><ArrowLeft size={18} /></button>
          <button className="service-modal-next" type="button" aria-label="Next capability" onClick={() => setSelectedService((selectedService + 1) % services.length)}><ArrowRight size={18} /></button>
        </div>
      )}
    </main>
  );
}
