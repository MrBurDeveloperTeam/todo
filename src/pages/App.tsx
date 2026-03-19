import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import TasksPage from './TasksPage';
import DayTasksPage from './DayTasksPage';
import LoginPage from './LoginPage';
import SignupPage from './SignupPage';
import LandingPage from './LandingPage';
import PwaQrPage from './PwaQr';
import { Task } from '../hooks/types';

import { apiFetch, checkSession } from '../lib/api';
import { supabase } from '../lib/supabaseClient';

// Seed data to showcase the views without a backend
const seedTasks: Task[] = [
  {
    id: 't1',
    title: 'Draft product brief',
    category: 'Product',
    type: 'task',
    color: 'blue',
    urgency: 'High',
    duration: '1h',
    date: new Date().toLocaleDateString('en-CA'),
    time: '10:00',
    status: 'active',
  },
  {
    id: 't2',
    title: '1:1 with design lead',
    category: 'Meeting',
    type: 'event',
    color: 'green',
    urgency: 'Normal',
    duration: '30m',
    date: new Date().toLocaleDateString('en-CA'),
    time: '15:30',
    status: 'todo',
  },
  {
    id: 't3',
    title: 'Plan Q1 roadmap',
    category: 'Deep Work',
    type: 'task',
    color: 'amber',
    urgency: 'Medium',
    duration: '2h',
    date: new Date(Date.now() + 86400000).toLocaleDateString('en-CA'),
    status: 'todo',
  },
];

function MainApp() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  /* const [tasks, setTasks] = useState<Task[]>(seedTasks); */
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [qrUrl, setQrUrl] = useState('');
  const [isProfileClosing, setIsProfileClosing] = useState(false);
  const [isQrClosing, setIsQrClosing] = useState(false);
  const [countryCode, setCountryCode] = useState<'US' | 'UK' | 'MY'>('US');
  const [isCountryMenuOpen, setIsCountryMenuOpen] = useState(false);
  const countryMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    checkSession();
    let mounted = true;

    const initSession = async () => {
      if (!mounted) return;
      setLoading(true);

      const { data: { session }, error } = await supabase.auth.getSession();

      if (mounted) {
        setUserId(session?.user?.id || null);
        setLoading(false);
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (mounted) {
          setUserId(session?.user?.id || null);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setQrUrl(window.location.href);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (countryMenuRef.current && !countryMenuRef.current.contains(e.target as Node)) {
        setIsCountryMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('name,email,country')
        .eq('user_id', userId)
        .single();
      if (!error && data) {
        setProfileName(data.name || '');
        setProfileEmail(data.email || '');
        if (data.country && ['US', 'UK', 'MY'].includes(data.country)) {
          // sync country selector with profile
          setCountryCode(data.country as 'US' | 'UK' | 'MY');
        }
      }
    };
    fetchProfile();
  }, [userId]);

  // Initialize theme from storage/system
  useEffect(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'dark') {
      setIsDarkMode(true);
    } else if (stored === 'light') {
      setIsDarkMode(false);
    } else {
      setIsDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
  }, []);

  // Sync dark mode
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const saveProfile = async () => {
    if (typeof window === 'undefined') return;
    if (userId) {
      await supabase.from('profiles').upsert(
        {
          user_id: userId,
          name: profileName.trim() || null,
          email: profileEmail.trim() || null,
        },
        { onConflict: 'user_id' }
      );
    }
    setIsProfileOpen(false);
    setIsProfileClosing(false);
  };

  const closeProfile = () => {
    setIsProfileClosing(true);
    setTimeout(() => {
      setIsProfileOpen(false);
      setIsProfileClosing(false);
    }, 250);
  };

  const closeQr = () => {
    setIsQrClosing(true);
    setTimeout(() => {
      setIsQrOpen(false);
      setIsQrClosing(false);
    }, 250);
  };

  const toggleTheme = () => setIsDarkMode((v) => !v);

  // apiFetch is shared in src/lib/api.ts

  // Handlers moved to bottom

  const upcomingCount = useMemo(() => tasks.filter((t) => t.status !== 'completed').length, [tasks]);

  // --- Task Persistence ---
  // 1. Fetch Tasks
  useEffect(() => {
    const fetchTasks = async () => {
      console.log('fetchTasks: Triggered', { userId });
      if (!userId) return;

      try {
        const result = await apiFetch(`/tasks?user_id=${userId}`, { method: 'GET' });
        const data = result?.tasks ?? [];
        console.log('fetchTasks: Data received', data.length);
        const mappedTasks: Task[] = data.map((t: any) => ({
          id: t.id,
          title: t.title,
          description: t.description || '',
          category: t.category || 'Deep Work',
          type: t.type,
          color: t.color,
          urgency: t.urgency,
          duration: t.duration || '1h',
          date: t.date,
          time: t.time,
          status: t.status,
          progress: t.progress || 0
        }));
        setTasks(mappedTasks);
      } catch (error) {
        console.error('Error fetching tasks:', error);
      }
    };

    fetchTasks();
  }, [userId]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!userId && !loading) {
    return <LandingPage />;
  }

  // 3. Handlers
  // 3. Handlers
  const handleAddTask = async (task: Task) => {
    if (!userId) return;

    // Optimistic UI update
    setTasks((prev) => [...prev, task]);

    try {
      await apiFetch('/tasks', {
        method: 'POST',
        body: JSON.stringify({
          id: task.id,
          title: task.title,
          description: task.description || '',
          category: task.category || 'Deep Work',
          date: task.date,
          time: task.time,
          status: task.status,
          type: task.type,
          urgency: task.urgency,
          color: task.color,
          duration: task.duration || '1h',
          progress: task.progress || 0,
        }),
      });
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const handleEditTask = async (updated: Task) => {
    if (!userId) return;

    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));

    try {
      await apiFetch(`/tasks/${updated.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: updated.title,
          description: updated.description || '',
          category: updated.category,
          date: updated.date,
          time: updated.time,
          status: updated.status,
          type: updated.type,
          urgency: updated.urgency,
          color: updated.color,
          duration: updated.duration,
          progress: updated.progress,
        }),
      });
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!userId) return;

    setTasks((prev) => prev.filter((t) => t.id !== taskId));

    try {
      await apiFetch(`/tasks/${taskId}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleToggleTaskStatus = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const newStatus = task.status === 'completed' ? 'todo' : 'completed';

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      await apiFetch(`/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (error) {
      console.error('Error toggling task status:', error);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-50`}>
      <header className="sticky top-0 z-20 bg-white/70 dark:bg-[#0f172a]/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 transition-all duration-300">
        <div className="mx-auto w-full max-w-5xl px-4 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src="/Logo/todo_tiffany.png"
                alt="Logo"
                className="h-10 w-10 shadow-lg shadow-blue-500/20 object-contain"
              />
            <div className="flex flex-col">
              <span className="text-base font-black text-slate-900 dark:text-white leading-tight">Personal Calendar</span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={toggleTheme}
              className="size-10 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-all duration-300"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              <span className="material-symbols-outlined text-[22px]">
                {isDarkMode ? 'light_mode' : 'dark_mode'}
              </span>
            </button>
            <button
              onClick={() => setIsProfileOpen(true)}
              className="px-2 py-2 rounded-xl flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-white/5 transition"
              title="Profile & settings"
            >
              <span className="h-9 w-9 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white font-black flex items-center justify-center shadow-md shadow-blue-500/30">
                {(profileName || 'U').slice(0, 1).toUpperCase()}
              </span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full flex flex-col">
        <Routes>
          <Route
            path="/"
            element={
              <div className="mx-auto max-w-5xl w-full px-3 pb-8 pt-3">
                <TasksPage
                  toggleTheme={toggleTheme}
                  isDarkMode={isDarkMode}
                  tasks={tasks}
                  onToggleTaskStatus={handleToggleTaskStatus}
                  onAddTask={handleAddTask}
                  onEditTask={handleEditTask}
                  onDeleteTask={handleDeleteTask}
                  userId={userId || ''}
                  upcomingCount={upcomingCount}
                  countryCode={countryCode}
                />
              </div>
            }
          />
          <Route
            path="/day/:date"
            element={
              <div className="mx-auto max-w-6xl w-full px-4 pb-12 pt-4">
                <DayTasksPage
                  tasks={tasks}
                  onToggleTaskStatus={handleToggleTaskStatus}
                  onDeleteTask={handleDeleteTask}
                />
              </div>
            }
          />
        </Routes>
      </main>

      {isProfileOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={closeProfile}
          />
          <div
            className={`relative h-full w-full max-w-sm rounded-l-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6 space-y-4 overflow-y-auto will-change-transform ${
              isProfileClosing
                ? 'animate-[slideOutSide_0.25s_ease_forwards]'
                : 'animate-[slideInSide_0.3s_ease_forwards]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-slate-500 font-semibold">
                  Profile
                </div>
                <div className="text-xl font-black text-slate-900 dark:text-white">
                  Your settings
                </div>
              </div>
              <button
                onClick={closeProfile}
                className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                aria-label="Close profile"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-[0.2em]">
                    Holidays region
                  </div>
                <div ref={countryMenuRef} className="relative">
                  <button
                    onClick={() => setIsCountryMenuOpen((v) => !v)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold text-slate-800 dark:text-slate-100 cursor-pointer flex items-center justify-between hover:border-blue-300 dark:hover:border-blue-500/60 transition"
                  >
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-blue-500">public</span>
                      {countryCode === 'US' ? 'United States' : countryCode === 'UK' ? 'United Kingdom' : 'Malaysia'}
                    </span>
                    <span className="material-symbols-outlined text-[18px] text-slate-400">
                      {isCountryMenuOpen ? 'expand_less' : 'expand_more'}
                    </span>
                  </button>
                  {isCountryMenuOpen && (
                    <div className="absolute left-0 right-0 mt-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg overflow-hidden z-20">
                      {[
                        { code: 'US', label: 'United States' },
                        { code: 'UK', label: 'United Kingdom' },
                        { code: 'MY', label: 'Malaysia' },
                      ].map((opt) => (
                        <button
                          key={opt.code}
                          onClick={() => {
                            setCountryCode(opt.code as 'US' | 'UK' | 'MY');
                            setIsCountryMenuOpen(false);
                          }}
                          className={`w-full px-4 py-3 text-left flex items-center gap-3 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 ${
                            countryCode === opt.code
                              ? 'bg-blue-50 dark:bg-blue-500/10 font-bold text-blue-700 dark:text-blue-100'
                              : 'text-slate-800 dark:text-slate-100'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {countryCode === opt.code ? 'check_circle' : 'language'}
                          </span>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Used to show public holiday markers in your calendar.
                </div>
              </div>
              <button
                onClick={() => setIsQrOpen(true)}
                className="w-full py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 font-bold flex items-center justify-center gap-2 hover:-translate-y-[1px] transition"
              >
                <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
                Phone QR
              </button>
            </div>

            <button
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = '/login';
              }}
              className="w-full py-3 rounded-xl border border-red-200 dark:border-red-700 text-red-600 dark:text-red-300 bg-white dark:bg-slate-900 font-bold flex items-center justify-center gap-2 hover:-translate-y-[1px] transition"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              Sign Out
            </button>
          </div>
        </div>
      )}
      {isQrOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={closeQr}
          />
          <div
            className={`relative h-full w-full max-w-sm rounded-l-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6 space-y-4 overflow-y-auto will-change-transform ${
              isQrClosing
                ? 'animate-[slideOutSide_0.25s_ease_forwards]'
                : 'animate-[slideInSide_0.3s_ease_forwards]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-slate-500 font-semibold">
                  Open on phone
                </div>
                <div className="text-xl font-black text-slate-900 dark:text-white">
                  Scan this QR code
                </div>
              </div>
              <button
                onClick={closeQr}
                className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                aria-label="Close QR code"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="flex justify-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(qrUrl || '')}`}
                alt="QR code to open this page on your phone"
                className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white p-3"
              />
            </div>
            <div className="text-[12px] text-slate-500 dark:text-slate-400 text-center">
              Point your phone camera at the code to open this page.
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes slideInSide {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/pwa-qr" element={<PwaQrPage />} />
      <Route path="/*" element={<MainApp />} />
    </Routes>
  );
}
