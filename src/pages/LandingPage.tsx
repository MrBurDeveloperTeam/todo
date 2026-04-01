import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowRight, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  Search, 
  Plus, 
  Mail, 
  Briefcase, 
  User,
  Star,
  Layers,
  Zap,
  Shield,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  Menu,
  Activity,
  Sparkles,
  Command,
  Monitor
} from 'lucide-react';
import { AuthForm } from '../components/AuthForm';

export function LandingPage({ onStart }: { onStart: () => void }) {
  const [authMode, setAuthMode] = useState<'landing' | 'login' | 'signup'>('landing');
  const [activeAccent, setActiveAccent] = useState('blue');
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    localStorage.getItem('tf_theme') === 'dark' ? 'dark' : 'light'
  );
  const [scrollProgress, setScrollProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const winScroll = document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = (winScroll / height) * 100;
      setScrollProgress(scrolled);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Reveal Observer
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          observer.unobserve(e.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    const reveals = document.querySelectorAll('.reveal');
    reveals.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, [authMode]);

  useEffect(() => {
    const nextTheme = localStorage.getItem('tf_theme') === 'dark' ? 'dark' : 'light';
    setTheme(nextTheme);
  }, [authMode]);

  if (authMode !== 'landing') {
    return (
      <div className="min-h-screen w-full bg-[#f5f5f5]">
        <AuthForm
          mode={authMode === 'signup' ? 'signup' : 'login'}
          onBack={() => setAuthMode('landing')}
          onSwitchMode={(nextMode) => setAuthMode(nextMode)}
        />
      </div>
    );
  }

  const ACCENT_COLORS = [
    { name: 'blue', color: '#0078d4' },
    { name: 'teal', color: '#00897b' },
    { name: 'purple', color: '#6b35c8' },
    { name: 'green', color: '#1a7f4e' },
    { name: 'rose', color: '#c42b45' },
    { name: 'orange', color: '#d15000' },
  ];

  const activeAccentColor =
    ACCENT_COLORS.find((accent) => accent.name === activeAccent)?.color ?? ACCENT_COLORS[0].color;
  const brandLogo = theme === 'dark' ? '/Logo/snabbb-white.png' : '/Logo/snabbb-teal.png';

  const THEME_VARS = theme === 'dark' ? {
    paper: '#0e0e0f',
    paper2: '#18181b',
    paper3: '#27272a',
    nav: 'rgba(18, 23, 30, 0.92)',
    navBorder: 'rgba(255, 255, 255, 0.08)',
    navText: '#f5f7fa',
    navMuted: '#b8c2cf',
    howBg: '#14181f',
    howCard: '#1b222c',
    howBorder: 'rgba(255, 255, 255, 0.08)',
    howText: '#f3f6fa',
    howMuted: '#aab5c2',
    themesBg: '#10161d',
    themesCard: '#1a212b',
    themesBorder: 'rgba(255, 255, 255, 0.08)',
    themesText: '#f3f6fa',
    themesMuted: '#aab5c2',
    themesLabel: '#d9e1ea',
    themesRing: '#f3f6fa',
    themesRingOffset: '#10161d',
    footerBg: '#0d1319',
    footerBorder: 'rgba(255, 255, 255, 0.08)',
    footerText: '#f3f6fa',
    footerMuted: '#aab5c2',
    ink: '#fafafa',
    ink2: '#e4e4e7',
    ink3: '#a1a1aa',
    ink4: '#71717a',
  } : {
    paper: '#f4ead7',
    paper2: '#eadcc4',
    paper3: '#cdb89a',
    nav: 'rgba(244, 234, 215, 0.9)',
    navBorder: '#cdb89a',
    navText: '#142331',
    navMuted: '#55697c',
    howBg: '#eadcc4',
    howCard: '#f4ead7',
    howBorder: '#cdb89a',
    howText: '#142331',
    howMuted: '#55697c',
    themesBg: '#eadcc4',
    themesCard: '#f4ead7',
    themesBorder: '#cdb89a',
    themesText: '#142331',
    themesMuted: '#55697c',
    themesLabel: '#2c4256',
    themesRing: '#142331',
    themesRingOffset: '#eadcc4',
    footerBg: '#f1e4cf',
    footerBorder: '#cdb89a',
    footerText: '#142331',
    footerMuted: '#55697c',
    ink: '#142331',
    ink2: '#2c4256',
    ink3: '#55697c',
    ink4: '#7f91a2',
  };

  return (
    <div
      ref={containerRef}
      className={`relative min-h-screen w-full font-sans transition-colors duration-700 overflow-x-hidden ${theme === 'dark' ? 'dark' : ''}`}
      style={{
        backgroundColor: THEME_VARS.paper,
        color: THEME_VARS.ink,
        ['--landing-paper' as string]: THEME_VARS.paper,
        ['--landing-paper2' as string]: THEME_VARS.paper2,
        ['--landing-paper3' as string]: THEME_VARS.paper3,
        ['--landing-nav' as string]: THEME_VARS.nav,
        ['--landing-nav-border' as string]: THEME_VARS.navBorder,
        ['--landing-nav-text' as string]: THEME_VARS.navText,
        ['--landing-nav-muted' as string]: THEME_VARS.navMuted,
        ['--landing-how-bg' as string]: THEME_VARS.howBg,
        ['--landing-how-card' as string]: THEME_VARS.howCard,
        ['--landing-how-border' as string]: THEME_VARS.howBorder,
        ['--landing-how-text' as string]: THEME_VARS.howText,
        ['--landing-how-muted' as string]: THEME_VARS.howMuted,
        ['--landing-themes-bg' as string]: THEME_VARS.themesBg,
        ['--landing-themes-card' as string]: THEME_VARS.themesCard,
        ['--landing-themes-border' as string]: THEME_VARS.themesBorder,
        ['--landing-themes-text' as string]: THEME_VARS.themesText,
        ['--landing-themes-muted' as string]: THEME_VARS.themesMuted,
        ['--landing-themes-label' as string]: THEME_VARS.themesLabel,
        ['--landing-themes-ring' as string]: THEME_VARS.themesRing,
        ['--landing-themes-ring-offset' as string]: THEME_VARS.themesRingOffset,
        ['--landing-footer-bg' as string]: THEME_VARS.footerBg,
        ['--landing-footer-border' as string]: THEME_VARS.footerBorder,
        ['--landing-footer-text' as string]: THEME_VARS.footerText,
        ['--landing-footer-muted' as string]: THEME_VARS.footerMuted,
        ['--landing-ink' as string]: THEME_VARS.ink,
        ['--landing-ink2' as string]: THEME_VARS.ink2,
        ['--landing-ink3' as string]: THEME_VARS.ink3,
        ['--landing-ink4' as string]: THEME_VARS.ink4,
        ['--accent' as string]: activeAccentColor,
      }}
    >
      {/* SCROLL PROGRESS */}
      <div className="scroll-progress" style={{ transform: `scaleX(${scrollProgress / 100})` }} />

      {/* NOISE & GRAIN */}
      <div className="pointer-events-none fixed inset-0 z-50 noise-texture opacity-5" />

      {/* NAV */}
      <nav
        className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-6 md:px-12 py-5 backdrop-blur-2xl border-b transition-all duration-300"
        style={{
          backgroundColor: 'var(--landing-nav)',
          borderColor: 'var(--landing-nav-border)',
          boxShadow: theme === 'dark' ? '0 12px 40px rgba(0, 0, 0, 0.28)' : '0 8px 24px rgba(20, 35, 49, 0.06)',
        }}
      >
        <a href="https://app.snabbb.com/" className="flex items-center gap-2 group">
          <img
            src={brandLogo}
            alt="To-do manager"
            className="h-8 w-auto object-contain drop-shadow-sm transition-transform group-hover:scale-105"
          />
          <span className="text-lg font-bold tracking-tight" style={{ color: 'var(--landing-nav-text)' }}>To-do <span style={{ color: 'var(--accent)' }}>manager</span></span>
        </a>
        
        <div className="hidden md:flex items-center gap-8">
          {['Features', 'Calendar', 'Themes', 'Reviews'].map(item => (
            <a key={item} href={`#${item.toLowerCase()}`} 
               className="text-sm font-bold tracking-tight uppercase hover:opacity-100 transition-all opacity-40 hover:scale-105" 
               style={{ color: 'var(--landing-nav-text)' }}>
              {item}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setAuthMode('login')}
            className="px-4 py-2 text-sm font-semibold transition-all"
            style={{ color: 'var(--landing-nav-muted)' }}
          >
            Sign in
          </button>
          <button onClick={() => setAuthMode('signup')} className="hidden sm:flex items-center gap-2 px-5 py-2.5 text-white rounded-lg text-sm font-bold shadow-lg shadow-black/10 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all" style={{ backgroundColor: 'var(--accent)' }}>
            Join Us
            <ArrowRight size={14} />
          </button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section id="hero" className="relative pt-28 md:pt-40 pb-20 px-6 overflow-hidden">
        {/* Geometric Background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="landing-sky-gradient absolute inset-0" />
          <div className="absolute inset-0 hero-grid-pattern opacity-40 [mask-image:radial-gradient(ellipse_80%_60%_at_50%_50%,black_40%,transparent_100%)]" />
          <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full blur-[120px] opacity-[0.08]" style={{ backgroundColor: 'var(--accent)' }} />
          <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-[#00897b] blur-[100px] opacity-10" />
          <div className="absolute top-[30%] right-[10%] w-[300px] h-[300px] rounded-full bg-[#e67e00] blur-[80px] opacity-[0.05]" />
          {theme === 'dark' ? (
            <div className="landing-night absolute inset-0">
              <span className="landing-moon" />
              <span className="landing-star landing-star-a" />
              <span className="landing-star landing-star-b" />
              <span className="landing-star landing-star-c" />
              <span className="landing-star landing-star-d" />
              <span className="landing-star landing-star-e" />
              <span className="landing-star landing-star-f" />
            </div>
          ) : (
            <div className="landing-clouds absolute inset-0">
              <span className="landing-cloud landing-cloud-a" />
              <span className="landing-cloud landing-cloud-b" />
              <span className="landing-cloud landing-cloud-c" />
            </div>
          )}
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-paper border border-paper3 text-xs font-semibold text-ink3 shadow-sm mb-10 animate-reveal">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_0_2px_rgba(16,185,129,0.2)]" />
            Now available — completely free
          </div>

          <h1 className="font-serif text-[clamp(40px,7vw,90px)] leading-[1.1] tracking-tighter mb-8 animate-reveal [animation-delay:200ms]" style={{ color: 'var(--landing-ink)' }}>
            Your tasks, <em className="font-serif-italic" style={{ color: 'var(--accent)' }}>your calendar,</em> one place.
          </h1>

          <p className="max-w-xl text-lg md:text-xl font-medium leading-relaxed mb-12 animate-reveal [animation-delay:400ms]" style={{ color: 'var(--landing-ink3)' }}>
            To-do manager brings together tasks, events, and reminders in a single beautiful workspace. High-fidelity calendar. In-depth rich descriptions. Your own aesthetic.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 animate-reveal [animation-delay:600ms]">
            <button onClick={() => setAuthMode('signup')} className="w-full sm:w-auto h-16 px-10 text-white rounded-xl text-base font-bold shadow-2xl shadow-ink/20 hover:-translate-y-1 hover:shadow-3xl active:translate-y-0 transition-all flex items-center justify-center gap-3" style={{ backgroundColor: 'var(--accent)' }}>
              Join Us <ArrowRight size={20} />
            </button>
            <a href="#features" className="w-full sm:w-auto h-16 px-10 bg-white/80 border-2 border-paper3 rounded-xl text-base font-semibold text-ink hover:border-ink4 transition-all flex items-center justify-center gap-3 backdrop-blur-sm">
              Explore Demo
            </a>
          </div>

          <p className="mt-8 text-xs font-semibold text-ink4 italic animate-reveal [animation-delay:800ms]">
            No account needed · Runs in your browser · Data stays on your device
          </p>
        </div>

        {/* HERO MOCKUP */}
        <div className="mt-20 max-w-5xl mx-auto w-full relative z-10 animate-reveal [animation-delay:1000ms]">
           <div className="bg-white rounded-2xl overflow-hidden shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_24px_80px_rgba(0,0,0,0.14),0_8px_32px_rgba(0,0,0,0.08)]">
              {/* Browser Bar */}
              <div className="bg-paper2 px-4 py-3 flex items-center gap-2 border-b border-paper3">
                 <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                    <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
                    <div className="h-3 w-3 rounded-full bg-[#28c840]" />
                 </div>
                 <div className="flex-1 max-w-md mx-auto bg-paper border border-paper3 rounded-md py-1 text-[11px] text-ink3 text-center">
                    to-do-manager.app/my-tasks
                 </div>
              </div>

              {/* Mock App Interface */}
              <div className="grid grid-cols-[220px_1fr] h-[520px] bg-paper">
                 {/* Sidebar */}
                  <div className="border-r border-paper3 p-3 flex flex-col gap-1 w-[220px]" style={{ backgroundColor: 'var(--landing-paper2)' }}>
                     <div className="flex items-center gap-2 px-2 py-3">
                        <div className="h-6 w-6 rounded-md flex items-center justify-center text-white font-serif italic text-xs" style={{ backgroundColor: 'var(--landing-ink)' }}>T</div>
                        <span className="text-sm font-bold truncate" style={{ color: 'var(--landing-ink)' }}>To-do manager</span>
                     </div>
                     {[
                       { icon: <Mail size={14} />, label: 'My Tasks', active: true, badge: '12' },
                       { icon: <Calendar size={14} />, label: 'Upcoming' },
                       { icon: <Briefcase size={14} />, label: 'Projects' },
                       { icon: <User size={14} />, label: 'Inbox', badge: '5' },
                     ].map((item) => (
                       <div key={item.label} 
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all ${item.active ? 'shadow-lg flex-shrink-0 scale-[1.02]' : 'hover:opacity-100'}`}
                            style={item.active ? { backgroundColor: 'var(--landing-paper)', color: 'var(--accent)' } : { color: 'var(--landing-ink3)', opacity: 0.6 }}>
                          <div style={item.active ? { color: 'var(--accent)' } : {}}>{item.icon}</div>
                          <span>{item.label}</span>
                          {item.badge && <span className="ml-auto text-white text-[9px] px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--accent)' }}>{item.badge}</span>}
                       </div>
                     ))}
                     <div className="h-px bg-paper3 my-2 mx-1" />
                     <div className="px-3 text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--landing-ink4)' }}>Categories</div>
                     <div className="flex items-center gap-3 px-3 py-1.5 text-xs" style={{ color: 'var(--landing-ink3)' }}>
                        <div className="h-2 w-2 rounded-full bg-blue-400" /> Personal
                     </div>
                     <div className="flex items-center gap-3 px-3 py-1.5 text-xs" style={{ color: 'var(--landing-ink3)' }}>
                        <div className="h-2 w-2 rounded-full bg-purple-400" /> Work
                     </div>
                  </div>

                 {/* Main Content Area */}
                 <div className="flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--landing-paper)' }}>
                    <div className="h-12 border-b border-paper3 flex items-center justify-between px-5">
                       <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>My Tasks</span>
                       <div className="flex items-center gap-4">
                          <div className="h-7 px-3 border border-paper3 rounded-lg text-[10px] flex items-center" style={{ backgroundColor: 'var(--landing-paper2)', color: 'var(--landing-ink4)' }}>Search tasks...</div>
                          <button className="h-7 px-3 text-white rounded-lg text-[10px] font-bold flex items-center gap-1.5" style={{ backgroundColor: 'var(--accent)' }}>
                             <Plus size={12} /> New Item
                          </button>
                       </div>
                    </div>

                    <div className="flex-1 grid grid-cols-[1fr_280px] p-5 gap-5">
                       <div className="flex flex-col gap-2">
                          <div className="flex gap-2 mb-2">
                             <div className="px-3 py-1 bg-[#0078d4] text-white text-xs font-bold rounded-full">All</div>
                             <div className="px-3 py-1 bg-white border border-paper3 text-ink3 text-xs font-bold rounded-full">Tasks</div>
                             <div className="px-3 py-1 bg-white border border-paper3 text-ink3 text-xs font-bold rounded-full">Events</div>
                          </div>
                          {[
                            { title: 'Review Q3 performance report', type: 'Task', date: 'Tomorrow', active: true },
                            { title: 'Team standup meeting', type: 'Event', date: '10:00 AM' },
                            { title: 'Pay bills', type: 'Reminder', date: 'Overdue', red: true },
                            { title: 'Doctor appointment', type: 'Event', date: 'Thu 14:00' },
                          ].map(t => (
                            <div key={t.title} className={`p-3 rounded-xl border flex items-center gap-3 shadow-sm ${t.active ? 'border-[#0078d4] bg-[#f0f7ff]' : 'border-paper3 bg-paper'}`}>
                               <div className="h-4 w-4 rounded-full border border-ink/20" />
                               <span className="text-xs font-semibold flex-1" style={{ color: t.active ? '#16324a' : '#20384c' }}>{t.title}</span>
                               <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${t.type === 'Task' ? 'text-blue-600' : 'bg-[#fce8e6] text-red-600'}`} style={t.type === 'Task' ? { backgroundColor: 'color-mix(in srgb, var(--accent), transparent 85%)', color: 'var(--accent)' } : {}}>{t.type}</span>
                               <span className="text-[10px] font-bold" style={{ color: t.red ? '#dc2626' : t.active ? '#35526a' : 'var(--landing-ink3)' }}>{t.date}</span>
                            </div>
                          ))}
                       </div>
                       
                       <div className="bg-paper border border-paper3 rounded-xl p-5 shadow-inner">
                          <div className="text-sm font-bold mb-4 border-b border-paper3 pb-3" style={{ color: 'var(--accent)' }}>Performance Audit</div>
                          <div className="space-y-4">
                             <div>
                                <div className="text-[10px] font-bold uppercase tracking-widest text-ink4 mb-1">Details</div>
                                <div className="text-[11px] leading-relaxed text-ink2 bg-white/50 p-3 rounded-lg border border-paper3">
                                   Full review of conversion metrics and user retention strategies.
                                </div>
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                   <div className="text-[10px] font-bold uppercase tracking-widest text-ink4 mb-1">Priority</div>
                                   <div className="text-xs font-bold flex items-center gap-2" style={{ color: '#20384c' }}><div className="h-2 w-2 rounded-full bg-red-500" /> High</div>
                                </div>
                                <div>
                                   <div className="text-[10px] font-bold uppercase tracking-widest text-ink4 mb-1">Due Date</div>
                                   <div className="text-xs font-bold" style={{ color: '#20384c' }}>May 12, 2026</div>
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </section>

      {/* STATS BAND */}
      <div className="relative py-16 bg-[#0e0e0f] text-white overflow-hidden">
         <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,#fff2,transparent_40px,#fff2_41px)] opacity-[0.05]" />
         <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 lg:grid-cols-4 gap-12 relative z-10 w-full">
            {[
              { num: '3', suffix: 'in1', label: 'Tasks, Events & Reminders' },
              { num: '∞', label: 'Unlimited tasks, forever free' },
              { num: '6+', label: 'Accent colors to choose from' },
              { num: '0', suffix: 'kb', label: 'Server uploads — private data' },
            ].map(div => (
               <div key={div.label} className="text-center group">
                 <div className="font-serif text-5xl md:text-6xl text-white group-hover:scale-110 transition-transform duration-500">
                   {div.num}<span className="italic" style={{ color: 'var(--accent)' }}>{div.suffix}</span>
                 </div>
                 <div className="mt-3 text-xs md:text-sm font-semibold tracking-wide text-white/40 uppercase">{div.label}</div>
               </div>
            ))}
         </div>
      </div>

      {/* FEATURES SECTION */}
      <section id="features" className="py-12 md:py-20 px-6 max-w-7xl mx-auto">
         <div className="reveal">
            <div className="text-xs font-bold uppercase tracking-[0.2em] mb-2" style={{ color: 'var(--accent)' }}>Core Ecosystem</div>
             <h2 className="font-serif text-3xl md:text-5xl leading-[1.1] mb-4" style={{ color: 'var(--landing-ink)' }}>Built for the way <em className="italic opacity-80">you actually work</em></h2>
             <p className="text-base max-w-lg" style={{ color: 'var(--landing-ink3)' }}>No bloated feature sets. Just the tools that matter, executed beautifully.</p>
         </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: '📋', title: 'Efficient Task List Style', desc: 'A clean two-panel layout — task list on the left, rich detail panel on the right. Browse and inspect without leaving.', color: '#e8f0fe' },
              { icon: '📅', title: 'Strategic Dynamic Calendar', desc: 'Month, Week, and Day views — navigate with mini calendar, drill in, and see everything at a glance.', color: '#fce8e6' },
              { icon: '🔔', title: 'Intelligent Reminders', desc: 'Set time-based reminders that show overdue alerts directly in your list. Never miss a deadline with visual indicators.', color: '#fef9e7' },
              { icon: '✍️', title: 'Comprehensive Descriptions', desc: 'Add detailed notes, links, and context to every item. One description field — no multi-step wizards.', color: '#e8f5e9' },
              { icon: '⚡', title: 'Quick Add Engine', desc: "Type a task and hit Enter. added instantly. No modal, no friction. Use the full form when you need the details.", color: '#f3e8fd' },
              { icon: '🎨', title: 'Theme Personalization', desc: 'Light or dark mode. Six accent colors. Your preferences are saved locally so it looks exactly how you like it.', color: '#fff3e0' },
            ].map((f, i) => (
               <div key={f.title} className="reveal group p-6 bg-paper border border-paper3 rounded-2xl hover:shadow-xl transition-all duration-500">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform" style={{ backgroundColor: f.color }}>{f.icon}</div>
                  <h3 className="text-lg font-bold mb-1.5" style={{ color: '#000000' }}>{f.title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--landing-ink3)' }}>{f.desc}</p>
              </div>
            ))}
         </div>
      </section>

      {/* HOW IT WORKS */}
      <section
        id="how"
        className="py-24 md:py-32 px-6 transition-colors duration-500"
        style={{ backgroundColor: 'var(--landing-how-bg)' }}
      >
         <div className="max-w-6xl mx-auto">
            <div className="text-center reveal mb-20">
               <div className="text-xs font-bold uppercase tracking-[0.2em] mb-4" style={{ color: 'var(--accent)' }}>Operations</div>
               <h2 className="font-serif text-4xl md:text-5xl" style={{ color: 'var(--landing-how-text)' }}>Simple as it gets</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 relative">
               <div className="hidden lg:block absolute top-12 left-[12%] right-[12%] h-[1.5px] bg-gradient-to-r from-paper3 via-[var(--accent)] to-paper3 z-0" />
               {[
                 { step: '1', title: 'Open Workspace', desc: 'No signup, no login requirement. Open the app and start organizing instantly.' },
                 { step: '2', title: 'Add Missions', desc: 'Use quick-add for speed or full forms for strategic tasks with data and dates.' },
                 { step: '3', title: 'Sync Calendar', desc: 'Watch your schedule auto-populate across Month, Week and Day views.' },
                 { step: '4', title: 'Execute', desc: 'Keep your momentum high with overdue alerts and velocity tracking indicators.' },
               ].map(s => (
                 <div key={s.step} className="reveal text-center relative z-10 group">
                    <div
                      className="h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg group-hover:scale-110 transition-transform duration-500 font-serif italic text-3xl"
                      style={{
                        backgroundColor: 'var(--landing-how-card)',
                        border: '1px solid var(--landing-how-border)',
                        color: 'var(--accent)',
                      }}
                    >
                       {s.step}
                    </div>
                    <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--landing-how-text)' }}>{s.title}</h3>
                    <p className="text-sm leading-relaxed px-4" style={{ color: 'var(--landing-how-muted)' }}>{s.desc}</p>
                 </div>
               ))}
            </div>
         </div>
      </section>

      {/* CALENDAR PREVIEW SECTION */}
      <section id="calendar" className="py-24 md:py-32 px-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
         <div className="reveal">
            <div className="text-xs font-bold uppercase tracking-[0.2em] mb-4" style={{ color: 'var(--accent)' }}>Visibility</div>
            <h2 className="font-serif text-5xl md:text-7xl leading-[1.05] mb-8">Strategic quality,<br /> <em className="italic opacity-70">zero friction.</em></h2>
            <p className="text-lg text-ink3 mb-10 max-w-md">Navigate your schedule with surgical precision. month, week, or day — it is built for elite output.</p>
            
            <div className="space-y-4">
               {[
                 'Month, Week & Day high-density views',
                 'Mini-navigator sidebar integration',
                 'Strategic priority color mapping',
                 'Direct-slot item creation engine'
               ].map(benefit => (
                 <div key={benefit} className="flex items-center gap-4 text-ink2 font-medium">
                    <div className="h-6 w-6 rounded-full bg-[#0078d4] flex items-center justify-center flex-shrink-0">
                       <CheckCircle2 size={14} className="text-white" />
                    </div>
                    {benefit}
                 </div>
               ))}
            </div>
         </div>

         <div className="relative reveal [animation-delay:300ms]">
            <div className="bg-white rounded-2xl p-8 shadow-[0_4px_32px_rgba(0,0,0,0.09),0_0_0_1px_rgba(0,0,0,0.05)]">
               <div className="flex items-center justify-between mb-8">
                  <span className="text-lg font-bold">March 2026</span>
                  <div className="flex gap-2">
                     <button className="h-10 w-10 rounded-lg border border-paper3 flex items-center justify-center hover:bg-paper3 transition-colors text-ink3"><ChevronLeft size={16} /></button>
                     <button className="h-10 w-10 rounded-lg border border-paper3 flex items-center justify-center hover:bg-paper3 transition-colors text-ink3"><ChevronRight size={16} /></button>
                  </div>
               </div>

               <div className="grid grid-cols-7 gap-1">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                    <div key={d} className="text-center text-[10px] font-bold text-ink4 uppercase py-3">{d}</div>
                  ))}
                  {[...Array(14)].map((_, i) => {
                    const day = i + 23;
                    const isToday = day === 24;
                    const isMarch = day <= 31;
                    return (
                      <div key={i} className={`min-h-[70px] p-2 rounded-xl transition-colors border-2 border-transparent ${isMarch ? 'hover:bg-paper2' : 'opacity-30'}`} style={isToday ? { borderColor: 'var(--accent)' } : {}}>
                         <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold mb-2 ${isToday ? 'text-white' : 'text-ink2'}`} style={isToday ? { backgroundColor: 'var(--accent)' } : {}}>
                            {day > 31 ? day - 31 : day}
                         </div>
                         {day === 24 && <div className="text-[9px] font-bold py-1 px-2 rounded-md bg-blue-100 text-blue-700 truncate">Standup</div>}
                         {day === 27 && <div className="text-[9px] font-bold py-1 px-2 rounded-md bg-red-100 text-red-700 truncate">Audit</div>}
                      </div>
                    );
                  })}
               </div>
            </div>

            {/* Floating Context Cards */}
            <div className="absolute -top-10 -right-10 w-48 bg-white p-5 rounded-2xl shadow-xl border border-paper3 animate-bounce-slow hidden md:block">
               <div className="text-[10px] font-black tracking-widest text-ink4 uppercase mb-2">Weekly Velocity</div>
               <div className="text-lg font-bold text-ink">92% Done</div>
               <div className="mt-3 h-1.5 w-full bg-paper3 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '92%' }} />
               </div>
            </div>

            <div className="absolute -bottom-10 -left-10 w-52 bg-white p-5 rounded-2xl shadow-xl border border-paper3 animate-bounce-slow hidden md:block" style={{ animationDelay: '1s' }}>
                <div className="text-[10px] font-black tracking-widest text-ink4 uppercase mb-2">Upcoming Node</div>
                <div className="text-md font-bold text-ink">Product Sync</div>
                <div className="text-[11px] text-ink3 mt-1">10:00 AM · 40m remaining</div>
            </div>
         </div>
      </section>

      {/* APPEARANCE / THEMES */}
      <section
        id="themes"
        className="pt-12 pb-24 md:pt-16 md:pb-32 px-6 transition-colors duration-500"
        style={{ backgroundColor: 'var(--landing-themes-bg)' }}
      >
         <div className="max-w-7xl mx-auto">
            <div className="reveal mb-10 text-center max-w-2xl mx-auto">
               <div className="text-xs font-bold uppercase tracking-[0.2em] mb-4" style={{ color: 'var(--accent)' }}>Identity</div>
               <h2 className="font-serif text-4xl md:text-6xl leading-tight mb-6" style={{ color: 'var(--landing-themes-text)' }}>Your app, <em className="italic opacity-80">your style.</em></h2>
               <p className="text-lg" style={{ color: 'var(--landing-themes-muted)' }}>Switch modes. pick colors. Personalize your focus environment. it all persists instantly.</p>
            </div>

            <div className="flex flex-col items-center gap-12 reveal">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-6xl">
                  {[
                     { title: 'Morning Light', bg: '#dff1ff', accent: 'blue', side: '#b8daf8', t: 'light' },
                     { title: 'Afternoon Glow', bg: '#c28d63', accent: 'orange', side: '#8f603b', t: 'light' },
                     { title: 'Midnight Engine', bg: '#1a1a1a', accent: 'blue', side: '#222', t: 'dark', dark: true },
                   ].map(p => (
                     <div key={p.title} className="group cursor-pointer flex flex-col items-center" onClick={() => {
                       setTheme(p.t as any);
                       setActiveAccent(p.accent);
                       localStorage.setItem('tf_theme', p.t);
                     }}>
                        <div
                          className="rounded-2xl overflow-hidden shadow-xl transition-all duration-500 group-hover:-translate-y-2 group-hover:shadow-3xl w-full"
                          style={{
                            backgroundColor: 'var(--landing-themes-card)',
                            border: '1px solid var(--landing-themes-border)',
                          }}
                        >
                           <div className="h-40 relative flex overflow-hidden" style={{ backgroundColor: p.bg }}>
                              <div
                                className="w-1/3 shadow-sm"
                                style={{
                                  backgroundColor: p.side,
                                  borderRight: '1px solid var(--landing-themes-border)',
                                }}
                              />
                              <div className="flex-1 p-4 space-y-2">
                                 {/* Mock Reacting Accent */}
                                 <div className="h-4 w-full rounded-md" style={{ 
                                   backgroundColor: p.accent === 'blue' ? ACCENT_COLORS[0].color : (p.accent === 'teal' ? ACCENT_COLORS[1].color : ACCENT_COLORS[0].color) + '15',
                                   border: `1px solid ${p.accent === 'blue' ? ACCENT_COLORS[0].color : (p.accent === 'teal' ? ACCENT_COLORS[1].color : ACCENT_COLORS[0].color)}` 
                                 }} />
                                 <div className="h-4 w-2/3 rounded-md bg-paper3/50" />
                              </div>
                              <div
                                className="absolute inset-x-0 bottom-0 h-10 px-4 flex items-center backdrop-blur-md"
                                style={{
                                  backgroundColor: p.dark ? 'rgba(8, 12, 18, 0.68)' : 'rgba(255, 255, 255, 0.12)',
                                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                                }}
                              >
                                 <span className="text-[10px] font-bold" style={{ color: p.dark ? '#ffffff' : '#142331' }}>{p.title}</span>
                              </div>
                           </div>
                        </div>
                     </div>
                   ))}
               </div>
            </div>
            <div className="mt-16 reveal flex flex-col items-center">
               <span className="text-xs font-bold uppercase tracking-widest mb-6" style={{ color: 'var(--landing-themes-muted)' }}>Accent Color Palette —</span>
               <div className="flex flex-wrap justify-center gap-4">
                  {ACCENT_COLORS.map(a => (
                    <button 
                      key={a.name}
                      onClick={() => setActiveAccent(a.name)}
                      className="h-12 w-12 rounded-full transition-all duration-300 hover:scale-110 flex items-center justify-center"
                      style={{
                        backgroundColor: a.color,
                        ...(activeAccent === a.name
                          ? {
                              boxShadow: '0 0 0 4px var(--landing-themes-ring)',
                              outline: '4px solid var(--landing-themes-ring-offset)',
                            }
                          : {}),
                      }}
                    >
                      {activeAccent === a.name && <div className="h-2 w-2 rounded-full bg-white" />}
                    </button>
                  ))}
               </div>
            </div>
         </div>
      </section>

      {/* REVIEWS */}
      <section id="reviews" className="py-24 md:py-32 px-6 max-w-7xl mx-auto">
         <div className="text-center reveal mb-20">
            <div className="text-xs font-bold uppercase tracking-[0.2em] mb-4" style={{ color: 'var(--accent)' }}>Feedback</div>
            <h2 className="font-serif text-4xl md:text-6xl" style={{ color: 'var(--landing-ink)' }}>Elite reviews</h2>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { author: 'Amirah Hassan', role: 'Ops Director', quote: 'Finally a workspace that respects my focus. The Outlook calendar experience is unmatched.', initials: 'AH', color: '#0078d4' },
              { author: 'Kevin Marsh', role: 'Engineer', quote: "The teal mode is perfect. No account required means zero friction for my fast-moving workflow.", initials: 'KM', color: '#6b35c8' },
              { author: 'Serena Li', role: 'Designer', quote: 'The spatial engine and the description logic are just like Atlas. It helps me think better.', initials: 'SL', color: '#1a7f4e' },
            ].map((r, i) => (
              <div key={r.author} className="reveal p-10 bg-paper border border-paper3 rounded-3xl hover:border-ink4 transition-all duration-300">
                 <div className="flex gap-0.5 text-amber-500 mb-6 font-bold tracking-tight">★★★★★</div>
                 <p className="text-ink2 leading-[1.8] mb-10 italic">"{r.quote}"</p>
                 <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full flex items-center justify-center font-serif text-white text-sm italic" style={{ backgroundColor: r.color }}>{r.initials}</div>
                    <div>
                       <div className="text-sm font-bold text-ink">{r.author}</div>
                       <div className="text-xs text-ink4">{r.role}</div>
                    </div>
                 </div>
              </div>
            ))}
         </div>
      </section>

      {/* FINAL CTA */}
      <section id="cta" className="mx-6 md:mx-12 mb-20">
         <div className="relative overflow-hidden bg-ink rounded-[2.5rem] py-24 md:py-36 text-center px-10">
            <div className="absolute inset-0 pointer-events-none opacity-20">
               <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_20%_50%,rgba(0,120,212,0.3)_0%,transparent_60%)]" />
               <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_80%_50%,rgba(0,137,123,0.3)_0%,transparent_60%)]" />
               <div className="absolute inset-0 noise-texture opacity-10" />
            </div>

            <div className="relative z-10">
               <h2 className="font-serif text-5xl md:text-8xl text-white tracking-tight leading-none mb-10">Ready to get<br /><em className="italic text-white/40">organized?</em></h2>
               <p className="text-white/50 text-xl font-medium max-w-lg mx-auto mb-14">Open your workspace right now. No signup. No friction. Pure execution.</p>
               <button onClick={() => setAuthMode('signup')} className="h-20 px-12 bg-white text-ink rounded-2xl text-xl font-black shadow-3xl hover:-translate-y-2 hover:shadow-white/10 transition-all flex items-center justify-center gap-4 mx-auto" style={{ border: '2px solid var(--accent)' }}>
                  Join Us <ArrowRight size={24} style={{ color: 'var(--accent)' }} />
               </button>
               <p className="mt-8 text-sm text-white/20 font-bold tracking-widest uppercase">Free session · Local persistence · 100% Privacy</p>
            </div>
         </div>
      </section>

      {/* FOOTER */}
      <footer
        className="px-6 md:px-12 py-12 border-t flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left transition-colors duration-500"
        style={{
          backgroundColor: 'var(--landing-footer-bg)',
          borderColor: 'var(--landing-footer-border)',
        }}
      >
          <a href="https://app.snabbb.com/" className="flex items-center gap-2">
            <img src={brandLogo} alt="To-do manager" className="h-6 w-auto object-contain" />
            <span className="text-md font-bold tracking-tight uppercase" style={{ color: 'var(--landing-footer-text)' }}>To-do manager</span>
          </a>
          
          <div className="flex gap-8 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--landing-footer-muted)' }}>
             <a href="#features" className="transition-colors" style={{ color: 'var(--landing-footer-muted)' }}>Features</a>
             <a href="#calendar" className="transition-colors" style={{ color: 'var(--landing-footer-muted)' }}>Calendar</a>
             <a href="#themes" className="transition-colors" style={{ color: 'var(--landing-footer-muted)' }}>Themes</a>
             <button onClick={() => setAuthMode('login')} className="transition-colors" style={{ color: 'var(--landing-footer-muted)' }}>Open App</button>
          </div>

          <div className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: 'var(--landing-footer-muted)' }}>
            © 2026 Hei Systems.
          </div>
      </footer>
    </div>
  );
}
