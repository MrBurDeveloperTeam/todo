import React, { useState, useEffect } from 'react';
import { TaskItem, AppUser } from './types';
import { toLocalDateStr, todayStr, updateThemeIcon } from './utils';
import { supabase } from './supabase';
import { LandingPage } from './pages/LandingPage';
import { Home } from './pages/Home';

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
  // State
  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    const saved = localStorage.getItem('tf_tasks');
    return saved ? JSON.parse(saved) : SEED_DATA;
  });
  const [user, setUser] = useState<AppUser>(() => {
    const saved = localStorage.getItem('tf_user');
    return saved ? JSON.parse(saved) : DEFAULT_USER;
  });
  
  const [session, setSession] = useState<any>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  useEffect(() => {
    updateThemeIcon(localStorage.getItem('tf_theme') || 'light');
  }, []);

  // Persistence
  useEffect(() => {
    localStorage.setItem('tf_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('tf_user', JSON.stringify(user));
  }, [user]);

  // Auth Sync
  useEffect(() => {
    const client = supabase;
    if (!client) {
      setIsAuthChecking(false);
      return;
    }

    let isMounted = true;

    const syncUserAndDataFromDatabase = async () => {
      const { data, error } = await client.auth.getSession();
      if (error || !data.session) {
        if (isMounted) setIsAuthChecking(false);
        return;
      }

      const authUser = data.session.user;
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
        .select('name,email,phone,position,company_name,account_type,avatar_url,background_url,status,plan')
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
        setTasks(mappedTasks);
      }

      if (isMounted) {
        setUser(nextUser);
        setSession(data.session.user);
        setIsAuthChecking(false);
      }
    };

    syncUserAndDataFromDatabase();

    const { data: authListener } = client.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      setSession(session?.user ?? null);
      if (!session?.user) {
        setUser(DEFAULT_USER);
        setIsAuthChecking(false);
        return;
      }
        syncUserAndDataFromDatabase();
      }
    );

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setUser(DEFAULT_USER);
    localStorage.removeItem('tf_user');
    localStorage.removeItem('tf_tasks');
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
    return <LandingPage onStart={() => {}} />;
  }

  return (
    <Home 
      tasks={tasks} 
      setTasks={setTasks} 
      user={user} 
      setUser={setUser} 
      handleLogout={handleLogout} 
    />
  );
}
