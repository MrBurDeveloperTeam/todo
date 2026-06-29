import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TaskItem, AppUser } from './types';
import { toLocalDateStr, todayStr, updateThemeIcon } from './utils';
import { supabase } from './lib/supabase';
import { LandingPage } from './pages/LandingPage';
import { Home } from './pages/Home';
import { api, checkSession } from './lib/api';
import CatMascot from './components/CatMascot.jsx';
import MolarAIFloat from './components/MolarAIFloat.jsx';
import { VirtualPetContainer } from '../VirtualPet/VirtualPetContainer';
import {
  normalizeTheme,
  readStoredTheme,
  readThemeCookie,
  writeThemeCookie,
  writeStoredTheme,
  applyThemeToDocument,
  resolveTheme,
  broadcastTheme,
  syncThemeFromOdoo,
  pushThemeToOdoo,
  THEME_SYNC,
  type ThemePreference,
} from './lib/themeSync';

const SEED_DATA: TaskItem[] = [
  {
    id: '1',
    type: 'task',
    title: 'Review Q3 performance report',
    desc: 'Go through all metrics in the dashboard and prepare a summary for the team meeting.',
    date: toLocalDateStr(new Date(Date.now() + 86400000)),
    time: '09:00',
    priority: 'high',
    list: 'work',
    done: false,
    created: Date.now()
  },
  {
    id: '2',
    type: 'event',
    title: 'Team standup meeting',
    desc: 'Daily 15-minute sync with the engineering team.',
    date: todayStr(),
    time: '10:00',
    endtime: '10:15',
    priority: 'med',
    list: 'work',
    done: false,
    created: Date.now()
  },
  {
    id: '3',
    type: 'reminder',
    title: 'Pay electricity bill',
    desc: 'Due on the 15th of each month.',
    date: todayStr(),
    time: '18:00',
    priority: 'high',
    list: 'personal',
    done: false,
    created: Date.now()
  }
];

const DEFAULT_USER: AppUser = {
  user_id: '123e4567-e89b-12d3-a456-426614174000',
  name: 'Alex Carter',
  email: 'alex@todomanager.com',
  account_type: 'individual',
  phone: '+1 234 567 890',
  position: 'Product Designer',
  company_name: 'MrBur Studio',
  avatar_url: null,
  background_url: null,
  status: 'active',
  plan: 'pro'
};

export default function App() {
  // Snabbb theme inheritance: Worker-injected value/cookie first, mini-app fallback second.
  const [theme, setTheme] = useState<ThemePreference>(() => readStoredTheme() || 'light');

  useEffect(() => {
    const normalized = normalizeTheme(theme) || 'light';
    applyThemeToDocument(normalized);
    updateThemeIcon(resolveTheme(normalized));
  }, [theme]);

  useEffect(() => {
    syncThemeFromOdoo((odooTheme) => {
      setTheme((current) => (current === odooTheme ? current : odooTheme));
    });
  }, []);

  useEffect(() => {
    const handleStorageSync = (event: StorageEvent) => {
      if (event.key !== THEME_SYNC.localStorageKey && event.key !== 'snabbb-theme') return;
      const next = normalizeTheme(event.newValue);
      if (next) setTheme((current) => (current === next ? current : next));
    };

    const handleMessageSync = (event: MessageEvent) => {
      const data = event.data;
      if (!data || data.type !== THEME_SYNC.messageType) return;
      if (data.source === THEME_SYNC.appSource) return;

      const next = normalizeTheme(data.theme);
      if (next) setTheme((current) => (current === next ? current : next));
    };

    const handleSystemThemeChange = () => {
      setTheme((current) => {
        if (current === 'system') applyThemeToDocument('system');
        return current;
      });
    };

    let lastCookie = readThemeCookie();
    const cookieInterval = window.setInterval(() => {
      const currentCookie = readThemeCookie();
      if (currentCookie && currentCookie !== lastCookie) {
        lastCookie = currentCookie;
        setTheme((current) => (current === currentCookie ? current : currentCookie));
      }
    }, 1000);

    const mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)');

    window.addEventListener('storage', handleStorageSync);
    window.addEventListener('message', handleMessageSync);
    mediaQuery?.addEventListener?.('change', handleSystemThemeChange);
    mediaQuery?.addListener?.(handleSystemThemeChange);

    return () => {
      window.removeEventListener('storage', handleStorageSync);
      window.removeEventListener('message', handleMessageSync);
      mediaQuery?.removeEventListener?.('change', handleSystemThemeChange);
      mediaQuery?.removeListener?.(handleSystemThemeChange);
      window.clearInterval(cookieInterval);
    };
  }, []);

  const handleSetTheme = (newTheme: ThemePreference) => {
    const normalized = normalizeTheme(newTheme) || 'light';
    setTheme(normalized);
    writeThemeCookie(normalized);
    writeStoredTheme(normalized);
    broadcastTheme(normalized);
    void pushThemeToOdoo(normalized);
  };
  // State
  const [tasks, setTasks] = useState<TaskItem[]>(SEED_DATA);
  const [user, setUser] = useState<AppUser>(DEFAULT_USER);

  const [session, setSession] = useState<any>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isVirtualPetOpen, setIsVirtualPetOpen] = useState(false);
  const [isAuthFormActive, setIsAuthFormActive] = useState(false);

  const aiContext = useMemo(() => {
    const pendingTasks = tasks.filter(task => !task.done);
    const completedTasks = tasks.filter(task => task.done);
    const overdueTasks = pendingTasks.filter(task => task.date && task.date < todayStr());
    const todayTasks = pendingTasks.filter(task => task.date === todayStr());
    const upcomingTasks = pendingTasks
      .filter(task => task.date && task.date > todayStr())
      .sort((a, b) => `${a.date || ''} ${a.time || ''}`.localeCompare(`${b.date || ''} ${b.time || ''}`))
      .slice(0, 8);

    return [
      `Module: To-Do Manager`,
      `User: ${user.name}`,
      `Email: ${user.email}`,
      `Total items: ${tasks.length}`,
      `Pending items: ${pendingTasks.length}`,
      `Completed items: ${completedTasks.length}`,
      `Due today: ${todayTasks.length}`,
      `Overdue: ${overdueTasks.length}`,
      `Upcoming items: ${upcomingTasks.map(task => `${task.title} (${task.date}${task.time ? ` ${task.time}` : ''})`).join('; ') || 'None'}`,
    ].join('\n');
  }, [tasks, user]);

  // Persistence removed (no localStorage)

  // Auth Sync
  useEffect(() => {
    const client = supabase;
    if (!client) {
      setIsAuthChecking(false);
      return;
    }

    let isMounted = true;
    let initialCheckDone = false;

    const syncUserAndDataFromDatabase = async () => {
      try {
        // Use the SSO exchange from api.ts
        const session = await checkSession(!initialCheckDone);
        initialCheckDone = true;

        if (!session) {
          if (isMounted) {
            setSession(null);
            setUser(DEFAULT_USER);
            setTasks(SEED_DATA);
            setIsAuthChecking(false);
          }
          return;
        }

        const authUser = session.user;
        const fallbackName =
          authUser.user_metadata?.name ||
          authUser.user_metadata?.full_name ||
          authUser.email?.split('@')[0] ||
          DEFAULT_USER.name;

        let nextUser: AppUser = {
          ...DEFAULT_USER,
          user_id: authUser.id,
          email: authUser.email || DEFAULT_USER.email,
          name: fallbackName,
        };

        const { data: profile } = await client
          .from('profiles')
          .select('name,email,phone,position,company_name,account_type,avatar_url,background_url,status,plan,default_list_id,task_theme,accent')
          .eq('user_id', authUser.id)
          .maybeSingle();

        if (profile) {
          nextUser = {
            ...nextUser,
            name: profile.name || nextUser.name,
            email: profile.email || nextUser.email,
            phone: profile.phone || nextUser.phone,
            position: profile.position || nextUser.position,
            company_name: profile.company_name || nextUser.company_name,
            account_type: profile.account_type || nextUser.account_type,
            avatar_url: profile.avatar_url ?? nextUser.avatar_url,
            background_url: profile.background_url ?? nextUser.background_url,
            status: profile.status || nextUser.status,
            plan: profile.plan || nextUser.plan,
            default_list_id: profile.default_list_id || nextUser.default_list_id,
            task_theme: profile.task_theme || nextUser.task_theme,
            accent: profile.accent || nextUser.accent,
          };
        }

        // FETCH TASKS
        const { data: taskData, error: taskError } = await client
          .from('tasks')
          .select('*')
          .eq('user_id', authUser.id)
          .order('created_at', { ascending: false });

        if (taskData && !taskError) {
          const mappedTasks = taskData.map((t: any) => ({
            id: t.id,
            type: t.type || 'task',
            title: t.title,
            desc: t.description || '',
            date: t.date,
            time: t.time || '',
            enddate: t.enddate,
            endtime: t.endtime,
            location: t.location,
            priority: (t.urgency?.toLowerCase() as any) || 'none',
            list: t.list_id_text || 'personal',
            done: t.status === 'done' || t.is_completed === true,
            created: new Date(t.created_at).getTime(),
          }));
          if (isMounted) setTasks(mappedTasks);
        }

        if (isMounted) {
          setUser(nextUser);
          setSession(session);
        }
      } catch (err) {
        console.error('[auth] Error in syncUserAndDataFromDatabase:', err);
      } finally {
        if (isMounted) {
          setIsAuthChecking(false);
        }
      }
    };

    syncUserAndDataFromDatabase();

    const { data: authListener } = client.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      setSession(session);
      if (!session) {
        setUser(DEFAULT_USER);
        setIsAuthChecking(false);
        return;
      }
      syncUserAndDataFromDatabase();
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    // 1. Annihilate all shared cookies across main site and current site immediately
    const host = window.location.hostname.replace(/^www\./, '');
    const isLocal = host === 'localhost' || host === '127.0.0.1';

    const cookiesToClear = ['session_id', 'mrbur_sso'];
    cookiesToClear.forEach(cookie => {
      document.cookie = `${cookie}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
      if (!isLocal && host) {
        document.cookie = `${cookie}=; path=/; domain=.${host}; expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
        document.cookie = `${cookie}=; path=/; domain=${host}; expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
        const domainParts = host.split('.');
        if (domainParts.length > 2) {
          const rootDomain = domainParts.slice(-2).join('.');
          document.cookie = `${cookie}=; path=/; domain=.${rootDomain}; expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
        }
      }
    });

    try {
      // 2. Send logout request to backend just in case we need to clear HTTP-only sessions
      await api.post('/logout').catch(() => { });
    } catch (err) {
      console.warn('[auth] Error logging out from backend:', err);
    }

    // 3. Clear local Supabase session
    if (supabase) {
      // Supabase signOut might throw a 400 Invalid Refresh Token error if the session is already revoked.
      // This is normal and harmless, as it still clears local storage tokens.
      await supabase.auth.signOut().catch(() => { });
    }

    setSession(null);
    setUser(DEFAULT_USER);
    setTasks(SEED_DATA);
  };

  if (isAuthChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-bold text-slate-500 animate-pulse">Initializing Workspace...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <>
        <LandingPage
          onStart={() => { }}
          onAuthFormActiveChange={setIsAuthFormActive}
        />
        <div className={isAuthFormActive ? 'hidden' : 'contents'}>
          <CatMascot disabled />
          <MolarAIFloat disabled />
        </div>
      </>
    );
  }

  return (
    <>
      <Home
        tasks={tasks}
        setTasks={setTasks}
        user={user}
        setUser={setUser}
        handleLogout={handleLogout}
        theme={theme}
        setTheme={handleSetTheme}
      />
      <div className={isVirtualPetOpen ? 'hidden' : 'contents'}>
        <CatMascot onCatClick={() => setIsVirtualPetOpen(true)} />
        <MolarAIFloat
          userContext={aiContext}
          onPetToggle={() => setIsVirtualPetOpen(true)}
        />
      </div>
      <VirtualPetContainer
        isOpen={isVirtualPetOpen}
        onClose={() => setIsVirtualPetOpen(false)}
      />
    </>
  );
}
