import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        setIsDarkMode(document.documentElement.classList.contains('dark'));
        const observer = new MutationObserver(() => {
            setIsDarkMode(document.documentElement.classList.contains('dark'));
        });
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    return (
        <div className="min-h-[100dvh] bg-slate-50 dark:bg-[#0f172a] text-slate-900 dark:text-slate-50 overflow-x-hidden selection:bg-blue-200 dark:selection:bg-blue-900/50 flex flex-col font-sans relative">
            <style>{`
                @keyframes drawFade {
                    0% { stroke-dashoffset: 1000; opacity: 0; }
                    20% { opacity: 1; }
                    80% { stroke-dashoffset: 0; opacity: 1; }
                    100% { stroke-dashoffset: 0; opacity: 0; }
                }
                .animate-draw {
                    stroke-dasharray: 1000;
                    stroke-dashoffset: 1000;
                    animation: drawFade 6s ease-in-out infinite;
                }
                @keyframes drawFadeLong {
                    0% { stroke-dashoffset: 100; opacity: 0; }
                    20% { opacity: 1; }
                    80% { stroke-dashoffset: 0; opacity: 1; }
                    100% { stroke-dashoffset: 0; opacity: 0; }
                }
                .animate-draw-long {
                    stroke-dasharray: 100;
                    stroke-dashoffset: 100;
                    animation: drawFadeLong 8s ease-in-out infinite;
                }
                @keyframes float-slow {
                    0%, 100% { transform: translateY(0) rotate(-2deg); }
                    50% { transform: translateY(-10px) rotate(2deg); }
                }
                .animate-float-slow {
                    animation: float-slow 10s ease-in-out infinite;
                }
            `}</style>
            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 bg-white/70 dark:bg-[#0f172a]/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 transition-all">
                <div className="w-full max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img
                            src={isDarkMode ? '/Logo/snabbb-white.png' : '/Logo/snabbb-teal.png'}
                            alt="Productivity Pro"
                            className="h-10 w-auto drop-shadow-[0_2px_10px_rgba(0,0,0,0.22)] select-none"
                            draggable={false}
                        />
                        <span
                            className={`text-xl font-bold tracking-tight drop-shadow-[0_1px_6px_rgba(0,0,0,0.25)] ${
                                isDarkMode ? 'text-white' : 'text-primary'
                            }`}
                        >
                            Productivity Pro
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link to="/login" className="hidden sm:inline-flex px-5 py-2.5 rounded-xl font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                            Log In
                        </Link>
                        <Link to="/signup" className="px-5 py-2.5 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20 active:scale-95 transition-all">
                            Sign Up <span className="hidden sm:inline">&nbsp;Free</span>
                        </Link>
                    </div>
                </div>
            </nav>

            <main className="flex-1 w-full flex flex-col pt-20 relative z-10">
                {/* Hero */}
                <section className="relative px-6 py-20 lg:py-32 flex flex-col items-center justify-center text-center max-w-7xl mx-auto w-full">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 dark:bg-blue-500/20 blur-[100px] rounded-full point-events-none"></div>

                    {/* Large Background Drawing */}
                    <div className="absolute inset-0 w-full h-[1800px] md:h-[2200px] pointer-events-none overflow-hidden z-0">
                        <svg className="w-full max-w-[1440px] h-full absolute top-10 left-1/2 -translate-x-1/2 text-blue-500 opacity-60 dark:opacity-70 animate-float-slow" viewBox="0 0 1440 2200" fill="none" preserveAspectRatio="xMidYMin slice" stroke="currentColor">
                            <path
                                d="M 200,100 C 600,-100 1200,200 1000,600 S 200,900 400,1300 S 1200,1600 900,2000"
                                strokeWidth="24"
                                strokeLinecap="round"
                                className="animate-draw-long"
                                pathLength="100"
                            />
                        </svg>
                    </div>

                    {/* Small Animated Background Drawings */}
                    <div className="absolute top-20 left-10 md:left-20 xl:left-40 opacity-40 dark:opacity-50 pointer-events-none animate-float-slow z-0">
                        <svg width="120" height="120" viewBox="0 0 100 100" fill="none" stroke="currentColor" className="text-blue-500">
                            <path d="M10,50 Q30,20 50,50 T90,50" strokeWidth="4" strokeLinecap="round" className="animate-draw" />
                        </svg>
                    </div>
                    <div className="absolute bottom-20 right-10 md:right-20 xl:right-40 opacity-40 dark:opacity-50 pointer-events-none animate-float-slow z-0" style={{ animationDelay: '2s' }}>
                        <svg width="100" height="150" viewBox="0 0 100 150" fill="none" stroke="currentColor" className="text-indigo-500">
                            <path d="M50,10 Q20,50 80,80 Q20,110 50,140" strokeWidth="4" strokeLinecap="round" className="animate-draw" />
                        </svg>
                    </div>
                    <div className="absolute top-40 right-20 xl:right-60 opacity-40 dark:opacity-50 pointer-events-none animate-float-slow z-0" style={{ animationDelay: '4s' }}>
                        <svg width="80" height="80" viewBox="0 0 100 100" fill="none" stroke="currentColor" className="text-purple-500">
                            <circle cx="50" cy="50" r="40" strokeWidth="4" className="animate-draw" />
                        </svg>
                    </div>

                    <div className="relative z-10 max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 fill-mode-both">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 font-medium text-sm transition-transform hover:scale-105">
                            <span className="relative flex size-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full size-2 bg-blue-500"></span>
                            </span>
                            Real-time Syncing Now Live
                        </div>

                        <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-[5rem] font-extrabold tracking-tight leading-[1.1]">
                            Organize your goals, <br className="hidden md:block" />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-500 pr-2">
                                simplify your life.
                            </span>
                        </h1>

                        <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
                            Experience the perfect blend of task management and dynamic visual collaboration. Do your best work with an intuitive workspace designed for speed and clarity.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
                            <Link to="/signup" className="group w-full sm:w-auto px-8 py-4 rounded-full font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-xl shadow-blue-500/20 transition-all hover:shadow-blue-500/40 hover:-translate-y-1 flex items-center justify-center gap-2 text-lg">
                                Get Started for Free
                                <span className="material-symbols-outlined text-lg transition-transform group-hover:translate-x-1">arrow_forward</span>
                            </Link>
                        </div>
                    </div>

                    {/* Pricing Section */}
                    <div className="relative z-10 w-full max-w-5xl mx-auto mt-32 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300 fill-mode-both" id="pricing">
                        <div className="text-center mb-16">
                            <h2 className="text-4xl md:text-5xl font-bold mb-4">Simple, transparent pricing</h2>
                            <p className="text-lg text-slate-600 dark:text-slate-400">Start for free, upgrade when you need more power.</p>
                        </div>
                        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                            {/* Free Tier */}
                            <div className="bg-white dark:bg-slate-800/80 rounded-[2rem] p-8 md:p-10 border border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col relative overflow-hidden group hover:border-blue-300 dark:hover:border-blue-500/50 transition-colors">
                                <div className="mb-8">
                                    <h3 className="text-2xl font-bold mb-2">Basic</h3>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-5xl font-extrabold">$0</span>
                                        <span className="text-slate-500 dark:text-slate-400 font-medium">/ forever</span>
                                    </div>
                                    <p className="text-slate-600 dark:text-slate-400 mt-4 h-12">Perfect for individuals getting started with visual organization.</p>
                                </div>
                                <ul className="space-y-4 mb-8 flex-1">
                                    {['Up to 3 Whiteboards', 'Basic Task Management', 'Standard Drag & Drop', '7-day sync history'].map((text, i) => (
                                        <li key={i} className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                                            <span className="material-symbols-outlined text-green-500 text-[20px]">check_circle</span>
                                            {text}
                                        </li>
                                    ))}
                                </ul>
                                <Link to="/signup" className="w-full py-4 rounded-xl font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-center">
                                    Get Started
                                </Link>
                            </div>

                            {/* Pro Tier */}
                            <div className="bg-gradient-to-b from-blue-600 to-indigo-700 rounded-[2rem] p-8 md:p-10 border border-blue-500 shadow-2xl shadow-blue-600/20 flex flex-col relative overflow-hidden transform md:-translate-y-4">
                                <div className="absolute top-0 right-0 px-4 py-1 bg-white/20 backdrop-blur-md rounded-bl-2xl text-white text-sm font-bold">
                                    MOST POPULAR
                                </div>
                                <div className="mb-8 text-white">
                                    <h3 className="text-2xl font-bold mb-2 text-blue-100">Pro</h3>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-5xl font-extrabold">$8</span>
                                        <span className="text-blue-200 font-medium">/ month</span>
                                    </div>
                                    <p className="text-blue-100 mt-4 h-12">Unleash your full potential with infinite canvases.</p>
                                </div>
                                <ul className="space-y-4 mb-8 flex-1 text-white">
                                    {['Unlimited Whiteboards', 'Advanced Task Workflows', 'Custom Backgrounds', 'Real-time Cross-device Sync', 'Priority Support'].map((text, i) => (
                                        <li key={i} className="flex items-center gap-3">
                                            <span className="material-symbols-outlined text-blue-300 text-[20px]">check_circle</span>
                                            {text}
                                        </li>
                                    ))}
                                </ul>
                                <Link to="/signup" className="w-full py-4 rounded-xl font-bold bg-white text-blue-600 hover:bg-blue-50 transition-colors shadow-lg shadow-black/10 text-center">
                                    Start 14-Day Free Trial
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Feature grid */}
                <section className="bg-white/40 dark:bg-slate-900/40 border-y border-slate-200/50 dark:border-slate-800/50 backdrop-blur-sm relative py-20 px-6 mt-8">
                    <div className="max-w-6xl mx-auto">
                        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
                            {/* Features Section */}
                            <div className="group bg-white dark:bg-slate-800/60 rounded-[2rem] p-10 border border-slate-200 dark:border-slate-700/50 shadow-xl shadow-slate-200/50 hover:-translate-y-2 dark:shadow-none hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-500 flex flex-col justify-between overflow-hidden relative ring-1 ring-inset ring-slate-100/10 dark:ring-white/5">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[90px] rounded-full group-hover:bg-blue-500/20 group-hover:scale-110 transition-all duration-700 pointer-events-none"></div>
                                <div className="absolute bottom-[-20%] left-[-10%] w-48 h-48 bg-indigo-500/10 blur-[80px] rounded-full group-hover:bg-indigo-500/20 group-hover:scale-125 transition-all duration-700 pointer-events-none"></div>

                                <div className="relative z-10 mb-8">
                                    <div className="size-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 text-white flex items-center justify-center mb-6 ring-2 ring-white/20 dark:ring-blue-500/30 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500">
                                        <span className="material-symbols-outlined text-[32px]">checklist</span>
                                    </div>
                                    <h3 className="text-3xl font-extrabold mb-4 text-slate-900 dark:text-white tracking-tight">Powerful Tasks</h3>
                                    <p className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed mb-8">
                                        Smart categorization, urgency indicators, and fluid interactions keep your momentum going without the mental friction.
                                    </p>
                                    <ul className="space-y-5">
                                        {['Sort by status and urgency', 'Drag and drop priorities', 'Effortless quick-add'].map((text, i) => (
                                            <li key={i} className="flex flex-row items-center gap-4 text-slate-800 dark:text-slate-200 font-medium text-lg">
                                                <span className="size-7 shrink-0 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200/50 dark:border-blue-400/30 shadow-sm">
                                                    <span className="material-symbols-outlined text-sm font-bold">check</span>
                                                </span>
                                                {text}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            <div className="group bg-white dark:bg-slate-800/60 rounded-[2rem] p-10 border border-slate-200 dark:border-slate-700/50 shadow-xl shadow-slate-200/50 hover:-translate-y-2 dark:shadow-none hover:shadow-2xl hover:shadow-indigo-500/20 transition-all duration-500 flex flex-col justify-between overflow-hidden relative ring-1 ring-inset ring-slate-100/10 dark:ring-white/5">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[90px] rounded-full group-hover:bg-indigo-500/20 group-hover:scale-110 transition-all duration-700 pointer-events-none"></div>
                                <div className="absolute bottom-[-20%] left-[-10%] w-48 h-48 bg-purple-500/10 blur-[80px] rounded-full group-hover:bg-purple-500/20 group-hover:scale-125 transition-all duration-700 pointer-events-none"></div>

                                <div className="relative z-10 mb-8">
                                    <div className="size-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30 text-white flex items-center justify-center mb-6 ring-2 ring-white/20 dark:ring-indigo-500/30 group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-500">
                                        <span className="material-symbols-outlined text-[32px]">dashboard_customize</span>
                                    </div>
                                    <h3 className="text-3xl font-extrabold mb-4 text-slate-900 dark:text-white tracking-tight">Infinite Whiteboard</h3>
                                    <p className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed mb-8">
                                        When lists aren't enough, map out your ideas spatially. An infinite canvas for diagrams, sticky notes, and brainstorming.
                                    </p>
                                    <ul className="space-y-5">
                                        {['Real-time cross-device sync', 'Sticky notes and connectors', 'Scan a QR to share with mobile'].map((text, i) => (
                                            <li key={i} className="flex flex-row items-center gap-4 text-slate-800 dark:text-slate-200 font-medium text-lg">
                                                <span className="size-7 shrink-0 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/50 dark:border-indigo-400/30 shadow-sm">
                                                    <span className="material-symbols-outlined text-sm font-bold">check</span>
                                                </span>
                                                {text}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="py-12 border-t border-slate-200 dark:border-slate-800 text-center relative z-10 bg-white/50 dark:bg-[#0f172a]/50">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-3">
                            <img
                                src={isDarkMode ? '/Logo/snabbb-white.png' : '/Logo/snabbb-teal.png'}
                                alt="Productivity Pro"
                                className="h-8 w-auto drop-shadow-[0_2px_10px_rgba(0,0,0,0.22)] select-none"
                                draggable={false}
                            />
                            <span
                                className={`font-bold tracking-tight text-lg drop-shadow-[0_1px_6px_rgba(0,0,0,0.25)] ${
                                    isDarkMode ? 'text-white' : 'text-primary'
                                }`}
                            >
                                Productivity Pro
                            </span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">
                            &copy; {new Date().getFullYear()} Productivity Pro. All rights reserved.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
