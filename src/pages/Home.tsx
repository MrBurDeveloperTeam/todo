import { todoRequest, todoTaskPayload, mapTodoTask, type TodoWorkspace } from '../lib/todoWorkspace';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useProfileImage } from '../hooks/useProfileImage';
import { 
  CheckCircle2, 
  Calendar as CalendarIcon, 
  Clock, 
  Search, 
  Settings as SettingsIcon, 
  Menu, 
  X, 
  Plus, 
  Pin,
  LayoutGrid, 
  PanelLeftClose, 
  PanelLeftOpen, 
  Activity,
  LogOut,
  Palette,
  Check
} from 'lucide-react';
import { TaskItem, AppUser, ViewType, ItemType } from '../types';
import { NavItem } from '../components/NavItem';
import { TodoView } from '../components/views/TodoView';
import { CalendarView } from '../components/views/CalendarView';
import { SettingsView } from '../components/views/SettingsView';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { Toast } from '../components/Toast';
import { toLocalDateStr, todayStr, ACCENTS, updateThemeIcon } from '../utils';
import { resolveTheme, type ThemePreference } from '../lib/themeSync';
import { supabase } from '../lib/supabase';
import { logActivityToOdoo } from '../lib/logActivityToOdoo';
import usePageDurationTracker, { type PageViewLogMeta } from '../hooks/usePageDurationTracker';
import useSessionDurationTracker from '../hooks/useSessionDurationTracker';
import type { TaskDataStatus } from '../aiExperience/dataChat/contracts/groundedDataResult';
import { buildTodoDialoguePool } from '../aiExperience/petDialogue/buildTodoDialoguePool';
import { usePublishPersonalizedInsight, type PersonalizedInsightBridgeState } from '../aiExperience/petDialogue/PersonalizedInsightBridge';
import type { InsightCandidate } from '@mrburdeveloperteam/pet-function/apps/todo';

const VIEW_LABELS: Record<ViewType, string> = {
  todo: 'My Tasks',
  calendar: 'Calendar',
  today: 'Today',
  upcoming: 'Upcoming',
  settings: 'Settings',
};

const DEFAULT_CATEGORIES = [
  { id: 'work', name: 'Work', color: '#3b82f6' },
  { id: 'personal', name: 'Personal', color: '#a855f7' },
  { id: 'events', name: 'Events', color: '#ef4444' }
];
const DEFAULT_CATEGORY_IDS = DEFAULT_CATEGORIES.map(c => c.id);
type UserList = { id: string; name: string; color: string; pinned?: boolean };
type CompletionToastState = { taskId: string; message: string };


interface HomeProps {
  workspace: TodoWorkspace | null;
  workspaceError: string;
  tasks: TaskItem[];
  setTasks: React.Dispatch<React.SetStateAction<TaskItem[]>>;
  user: AppUser;
  setUser: React.Dispatch<React.SetStateAction<AppUser>>;
  handleLogout: () => void;
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
  taskDataStatus: TaskDataStatus;
}

export function Home({ workspace, workspaceError, tasks, setTasks, user, setUser, handleLogout, theme, setTheme, taskDataStatus }: HomeProps) {
  const company = workspace?.workspaceType === 'company';
  const canManageEvents = workspace?.canManageEvents === true;
  const [mutationError, setMutationError] = useState('');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const canEditTask = (task: TaskItem) => Boolean(workspace) && (task.type !== 'event' || canManageEvents);
  const [currentView, setCurrentView] = useState<ViewType>('todo');
  const [currentFilter, setCurrentFilter] = useState<string>('all');
  const dialoguePool = useMemo(
    () => taskDataStatus === 'ready' ? buildTodoDialoguePool(tasks) : [],
    [tasks, taskDataStatus]
  );
  const handleDialogueAction = useCallback((candidate: InsightCandidate<unknown>) => {
    if (candidate.action?.view === 'overdue') {
      setCurrentView('todo');
      setCurrentFilter('overdue');
    } else if (candidate.action?.view === 'today') {
      setCurrentView('today');
    }
  }, []);
  const dialogueState = useMemo<PersonalizedInsightBridgeState>(
    () => taskDataStatus === 'ready'
      ? { status: 'ready', candidates: dialoguePool, onAction: handleDialogueAction }
      : { status: 'not_ready' },
    [taskDataStatus, dialoguePool, handleDialogueAction]
  );
  usePublishPersonalizedInsight(dialogueState);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAccentPickerOpen, setIsAccentPickerOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [modalType, setModalType] = useState<ItemType>('task');
  const [newTask, setNewTask] = useState<Partial<TaskItem>>({});
  const { profileImageUrl } = useProfileImage(true);

  // Confirmation state
  const [confirmState, setConfirmState] = useState<{
    show: boolean;
    title: string;
    message: string;
    confirmText?: string;
    onConfirm: () => void;
  }>({
    show: false,
    title: '',
    message: '',
    confirmText: 'Confirm Delete',
    onConfirm: () => {}
  });
  // Theme is inherited from Snabbb and controlled by the app-level theme sync.
  const [accent, setAccent] = useState(user.accent || 'tiffany');
  const [showCompleted, setShowCompleted] = useState(false);
  const [defaultListId, setDefaultListId] = useState(() => company ? 'work' : user.default_list_id || 'personal');
  const [completionToast, setCompletionToast] = useState<CompletionToastState | null>(null);
  const completionToastTimeoutRef = useRef<number | null>(null);
  const accentPickerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isAccentPickerOpen) return;

    const closePicker = (event: MouseEvent) => {
      if (!accentPickerRef.current?.contains(event.target as Node)) {
        setIsAccentPickerOpen(false);
      }
    };
    const closePickerOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsAccentPickerOpen(false);
    };

    document.addEventListener('mousedown', closePicker);
    document.addEventListener('keydown', closePickerOnEscape);
    return () => {
      document.removeEventListener('mousedown', closePicker);
      document.removeEventListener('keydown', closePickerOnEscape);
    };
  }, [isAccentPickerOpen]);

  const clearCompletionToast = () => {
    if (completionToastTimeoutRef.current) {
      window.clearTimeout(completionToastTimeoutRef.current);
      completionToastTimeoutRef.current = null;
    }
    setCompletionToast(null);
  };

  const showCompletionToast = (taskId: string, message: string) => {
    if (completionToastTimeoutRef.current) {
      window.clearTimeout(completionToastTimeoutRef.current);
    }
    setCompletionToast({ taskId, message });
    completionToastTimeoutRef.current = window.setTimeout(() => {
      setCompletionToast(null);
      completionToastTimeoutRef.current = null;
    }, 6000);
  };

  useEffect(() => {
    if (user.accent) setAccent(user.accent);
  }, [user.accent]);

  const updateThemeDB = async (t: ThemePreference) => {
    setTheme(t);
    setUser(prev => ({ ...prev, task_theme: t }));
    if (supabase) {
      await supabase.from('profiles').update({ task_theme: t, updated_at: new Date().toISOString() }).eq('user_id', user.user_id);
    }
  };

  const updateAccentDB = async (a: string) => {
    setAccent(a);
    setUser(prev => ({ ...prev, accent: a }));
    if (supabase) {
      await supabase.from('profiles').update({ accent: a, updated_at: new Date().toISOString() }).eq('user_id', user.user_id);
    }
  };

  // Best-effort: every task/list mutation also gets pushed to Odoo (see
  // lib/logActivityToOdoo.ts + TODO_ACTIVITY_TRACKER_ODOO_SYNC.md), mirroring
  // the same sync built for the inventory and appointment apps. Fire-and-
  // forget so a slow/unreachable worker or Odoo instance never blocks or
  // fails the local Supabase write, which stays the source of truth either way.
  const logTodoActivity = (
    action: string,
    details: string,
    meta: { pagePath?: string; pageDurationSeconds?: number; sessionDurationSeconds?: number; useBeacon?: boolean } = {}
  ) => {
    logActivityToOdoo({
      logId: crypto.randomUUID(),
      actorEmail: user.email || null,
      actorName: user.name || null,
      supabaseUserId: user.user_id || null,
      action,
      details,
      occurredAt: new Date().toISOString(),
      pagePath: meta.pagePath ?? null,
      pageDurationSeconds: meta.pageDurationSeconds ?? null,
      sessionDurationSeconds: meta.sessionDurationSeconds ?? null,
      useBeacon: meta.useBeacon,
    });
  };

  // Logs how long the user spent on each view (My Tasks, Calendar, Today,
  // Upcoming, Settings) as a "page_view" activity once they navigate away,
  // hide the tab, or leave the page — see hooks/usePageDurationTracker.ts.
  usePageDurationTracker(
    currentView,
    VIEW_LABELS[currentView],
    Boolean(user.email),
    (description: string, pageMeta: PageViewLogMeta) => {
      logTodoActivity('page_view', description, {
        pagePath: pageMeta.pagePath,
        pageDurationSeconds: pageMeta.pageDurationSeconds,
      });
    }
  );

  // Logs a "session_end" (with the session's total duration) when the user
  // logs out, closes/leaves the page, or hides the tab — same event the
  // inventory app sends. See hooks/useSessionDurationTracker.ts.
  const endSession = useSessionDurationTracker(
    Boolean(user.email),
    (details: string, durationSeconds: number, useBeacon: boolean) => {
      logTodoActivity('session_end', details, {
        sessionDurationSeconds: durationSeconds,
        useBeacon,
      });
    }
  );

  // Record the session end BEFORE the logout tears the user/session down.
  const handleLogoutWithSessionEnd = () => {
    endSession();
    handleLogout();
  };

  const [isAddingList, setIsAddingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListColor, setNewListColor] = useState('#3b82f6');
  const [userLists, setUserLists] = useState<UserList[]>([]);
  const [pinnedListIds, setPinnedListIds] = useState<string[]>([]);


  const categoryStorageKey = `snabbb.todo.personalLists.${user.user_id}`;
  useEffect(() => {
    if (company) {
      setUserLists(DEFAULT_CATEGORIES.filter(list => workspace?.actorType === 'owner' || list.id !== 'personal'));
      setPinnedListIds([]);
      return;
    }
    let stored: UserList[] = [];
    try {
      const parsed = JSON.parse(localStorage.getItem(categoryStorageKey) || '[]');
      if (Array.isArray(parsed)) stored = parsed.filter(cat => cat && typeof cat.id === 'string' && typeof cat.name === 'string' && typeof cat.color === 'string');
    } catch { /* Start with standard lists if browser storage is unavailable. */ }
    const lists: UserList[] = [...DEFAULT_CATEGORIES.map(cat => stored.find(item => item.id === cat.id) || cat),
      ...stored.filter(cat => !DEFAULT_CATEGORY_IDS.includes(cat.id))];
    // Recover list labels referenced by existing personal tasks without a categories table.
    for (const task of tasks) {
      if (task.list && !lists.some(list => list.id === task.list)) {
        lists.push({ id: task.list, name: task.list, color: '#3b82f6' });
      }
    }
    setUserLists(lists);
    setPinnedListIds(lists.filter(cat => cat.pinned).map(cat => cat.id));
  }, [categoryStorageKey, company, tasks]);

  useEffect(() => () => {
    if (completionToastTimeoutRef.current) {
      window.clearTimeout(completionToastTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    if (user.accent) setAccent(user.accent);
    if (typeof user.show_completed === 'boolean') setShowCompleted(user.show_completed);
  }, [user.accent, user.show_completed]);


  const saveCategory = async (cat: UserList) => {
    if (company) return;
    const next = [...userLists.filter(item => item.id !== cat.id), cat];
    try {
      localStorage.setItem(categoryStorageKey, JSON.stringify(next));
      logTodoActivity('list_updated', `Saved list: ${cat.name}`);
    } catch { setMutationError('Unable to save lists in this browser.'); }
  };
  const deleteCategory = async (id: string) => {
    if (company) return;
    localStorage.setItem(categoryStorageKey, JSON.stringify(userLists.filter(item => item.id !== id)));
    logTodoActivity('list_deleted', `Deleted list: ${id}`);
  };

  // Persistence removed (no localStorage)

  // Calendar state
  const [calDate, setCalDate] = useState(new Date());
  const [calView, setCalView] = useState('month');
  const resolvedTheme = resolveTheme(theme);
  const brandLogo = resolvedTheme === 'dark' ? '/Logo/snabbb-white.png' : '/Logo/snabbb-teal.png';
  const sortedLists = [...userLists].sort((a, b) => {
    const aPinned = pinnedListIds.includes(a.id) ? 1 : 0;
    const bPinned = pinnedListIds.includes(b.id) ? 1 : 0;
    if (aPinned !== bPinned) return bPinned - aPinned;
    return a.name.localeCompare(b.name);
  });
  const standardFilters = ['all', 'task', 'event', 'reminder', 'today', 'overdue', 'upcoming'];
  const getValidTaskListId = (candidate?: string) => {
    if (company && !canManageEvents && (candidate?.toLowerCase() === 'events' || userLists.find(list => list.id === candidate)?.name.toLowerCase() === 'events')) return 'work';
    const fallbackListId = userLists.some((list) => list.id === defaultListId)
      ? defaultListId
      : (userLists[0]?.id || 'personal');

    if (!candidate || standardFilters.includes(candidate)) {
      return fallbackListId;
    }

    return userLists.some((list) => list.id === candidate) ? candidate : fallbackListId;
  };
  const resolveTaskListId = (candidate?: string) => getValidTaskListId(candidate || currentFilter);
    const updateDefaultListDB = async (listId: string) => {
      if (!supabase) return;
      await supabase
        .from('profiles')
        .update({ default_list_id: listId, updated_at: new Date().toISOString() })
        .eq('user_id', user.user_id);
      
      setUser({ ...user, default_list_id: listId });
    };

    const handleSetDefaultList = (listId: string) => {
      setDefaultListId(listId);
      if (!company) updateDefaultListDB(listId);
    };

  const handleSetShowCompleted = async (show: boolean) => {
    setShowCompleted(show);
    setUser(prev => ({ ...prev, show_completed: show }));
    if (!supabase) return;
    await supabase
      .from('profiles')
      .update({ show_completed: show, updated_at: new Date().toISOString() })
      .eq('user_id', user.user_id);
  };

  useEffect(() => {
    const resolved = resolveTheme(theme);
    updateThemeIcon(resolved);
    document.documentElement.classList.toggle('dark', resolved === 'dark');
    document.documentElement.setAttribute('data-theme', resolved);
    document.documentElement.dataset.themePreference = theme;
    document.documentElement.style.colorScheme = resolved;
    
    // Update CSS variables for accent
    const accentData = (ACCENTS as any)[accent] || { main: accent, light: `${accent}15`, hover: accent };
    document.documentElement.style.setProperty('--accent', accentData.main);
    document.documentElement.style.setProperty('--accent-rgb', accentData.main.startsWith('#') ? hexToRgb(accentData.main) : '0, 120, 212');
    document.documentElement.style.setProperty('--accent-light', accentData.light || `${accentData.main}15`);
    document.documentElement.style.setProperty('--accent-subtle', resolved === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)');
  }, [theme, accent]);

  function hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0, 120, 212';
  }

  const getListColorName = (listId: string) => {
    const list = userLists.find(l => l.id === listId);
    const hex = list ? list.color : '#3b82f6';
    const mapping: Record<string, string> = {
      '#3b82f6': 'blue',
      '#a855f7': 'violet',
      '#ef4444': 'red',
      '#10b981': 'green',
      '#f59e0b': 'amber',
      '#ec4899': 'pink',
      '#06b6d4': 'cyan',
      '#64748b': 'slate'
    };
    return mapping[hex] || 'blue';
  };

  const runMutation = async (action: () => Promise<void>) => {
    if (!workspace || taskDataStatus !== 'ready' || savingRef.current) return false;
    savingRef.current = true;
    setSaving(true);
    setMutationError('');
    try {
      await action();
      return true;
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : 'Unable to save changes.');
      // Restore server data after errors, including a partially completed bulk action.
      try {
        const result = await todoRequest('/tasks', 'GET', undefined, workspace);
        setTasks(result.tasks.map(mapTodoTask));
      } catch { /* Keep the explicit error visible; never fall back to another workspace. */ }
      return false;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const assertEditable = (task: TaskItem) => {
    if (!canEditTask(task)) throw new Error('Only the company owner or manager can change company events.');
  };
  const patchTask = async (task: TaskItem, changes: Record<string, unknown>) => {
    assertEditable(task);
    const result = await todoRequest(`/tasks/${task.id}`, 'PATCH', changes, workspace!);
    setTasks(prev => prev.map(item => item.id === task.id ? mapTodoTask(result.task) : item));
  };
  const handleToggleDone = async (id: string) => {
    const task = tasks.find(item => item.id === id);
    if (!task) return;
    await runMutation(async () => {
      await patchTask(task, { status: task.done ? 'todo' : 'done', is_completed: !task.done });
      if (!task.done) showCompletionToast(id, `"${task.title}" has been completed.`);
      logTodoActivity(task.done ? 'task_reopened' : 'task_completed', task.title);
    });
  };
  const handleUndoCompletedTask = async () => {
    const task = tasks.find(item => item.id === completionToast?.taskId);
    if (!task) return;
    await runMutation(async () => {
      await patchTask(task, { status: 'todo', is_completed: false });
      clearCompletionToast();
    });
  };
  const deleteTasks = async (items: TaskItem[]) => {
    items.forEach(assertEditable);
    for (const task of items) {
      await todoRequest(`/tasks/${task.id}`, 'DELETE', undefined, workspace!);
      setTasks(prev => prev.filter(item => item.id !== task.id));
    }
  };
  const handleDeleteTask = async (id: string) => {
    const task = tasks.find(item => item.id === id);
    if (!task || !canEditTask(task)) return;
    setConfirmState({ show: true, title: 'Delete Task?',
      message: `Delete "${task.title}"? This cannot be undone.`,
      onConfirm: () => { void runMutation(async () => {
        await deleteTasks([task]);
        if (selectedTaskId === id) setSelectedTaskId(null);
        logTodoActivity('task_deleted', task.title);
      }); },
    });
  };
  const openAddModal = (type: ItemType = 'task', defaults: Partial<TaskItem> = {}) => {
    if (!workspace || saving || (type === 'event' && !canManageEvents)) {
      setMutationError('Only the company owner or manager can create company events.');
      return;
    }
    const date = currentView === 'calendar' ? toLocalDateStr(calDate) : todayStr();
    setEditingTask(null);
    setNewTask({ type, priority: 'none', list: getValidTaskListId(currentFilter), date,
      enddate: type === 'event' ? date : '', ...defaults });
    setIsModalOpen(true);
  };
  const openEditModal = (task: TaskItem) => {
    if (!canEditTask(task) || saving) return;
    setEditingTask(task);
    setNewTask(task);
    setIsModalOpen(true);
  };
  const createTask = async (draft: Partial<TaskItem>) => {
    const item: TaskItem = {
      id: crypto.randomUUID(), type: draft.type || 'task', title: draft.title!.trim(),
      desc: draft.desc || '', date: draft.date || todayStr(), time: draft.time || '',
      enddate: draft.enddate || '', endtime: draft.endtime || '', location: draft.location || '',
      priority: draft.priority || 'none', list: resolveTaskListId(draft.list), done: false, created: Date.now(),
    };
    assertEditable(item);
    const result = await todoRequest('/tasks', 'POST', {
      ...todoTaskPayload(item), id: item.id, color: getListColorName(item.list),
    }, workspace!);
    setTasks(prev => [mapTodoTask(result.task), ...prev]);
    setSelectedTaskId(result.task.id);
    logTodoActivity(`${item.type}_added`, item.title);
  };
  const handleSaveTask = async () => {
    if (!newTask.title?.trim()) return;
    const saved = await runMutation(async () => {
      if (editingTask) {
        const updated = { ...editingTask, ...newTask, list: resolveTaskListId(newTask.list) } as TaskItem;
        assertEditable(updated);
        await patchTask(editingTask, todoTaskPayload(updated));
        logTodoActivity('task_updated', updated.title);
      } else await createTask(newTask);
    });
    if (saved) setIsModalOpen(false);
  };
  const handleQuickAddTask = async (title: string, list: string, type: ItemType = 'task') => {
    if (!title.trim()) return false;
    return runMutation(() => createTask({ title, list, type, date: todayStr() }));
  };
  const handleSaveTaskDescription = async (id: string, desc: string) => {
    const task = tasks.find(item => item.id === id);
    if (task) await runMutation(() => patchTask(task, { description: desc || null }));
  };
  const handleMoveTask = async (id: string, updates: Partial<TaskItem>) => {
    const task = tasks.find(item => item.id === id);
    if (task) await runMutation(() => patchTask(task, { date: updates.date, time: updates.time || null }));
  };
  const clearWorkspaceTasks = async () => {
    return runMutation(async () => {
      await deleteTasks(tasks.filter(canEditTask));
      // Company members keep events they cannot manage. Personal categories are separate.
      if (!company) {
        localStorage.removeItem(categoryStorageKey);
        setUserLists(DEFAULT_CATEGORIES);
      }
      setSelectedTaskId(null);
    });
  };

  const handleOpenTaskFromCalendar = (task: TaskItem) => {
    const nextFilter = task.list || task.type || 'all';
    setSelectedTaskId(task.id);
    setCurrentFilter(nextFilter);
    setCurrentView('todo');
  };

  const renderContent = () => {
    if (!workspace || taskDataStatus !== 'ready') return <div role="status" className="p-8 text-center">{workspaceError || 'Loading workspace�'}{workspaceError && <button className="block mx-auto mt-4 underline" onClick={() => location.reload()}>Retry</button>}</div>;
    switch (currentView) {
      case 'todo':
      case 'today':
      case 'upcoming':
        return (
          <TodoView
            workspace={workspace!}
            canEditTask={canEditTask}
            tasks={tasks}
            setTasks={setTasks}
            currentFilter={currentView === 'todo' ? currentFilter : currentView}
            setCurrentFilter={setCurrentFilter}
            selectedTaskId={selectedTaskId}
            setSelectedTaskId={setSelectedTaskId}
            handleToggleDone={handleToggleDone}
            handleDeleteTask={handleDeleteTask}
            openEditModal={openEditModal}
            currentView={currentView}
            setCurrentView={setCurrentView}
            showCompleted={showCompleted}
            handleQuickAddTask={handleQuickAddTask}
            handleSaveTaskDescription={handleSaveTaskDescription}
            userLists={userLists}
            defaultListId={defaultListId}
          />
        );
      case 'calendar':
        return (
          <CalendarView
            canEditTask={canEditTask}
            tasks={tasks}
            calDate={calDate}
            setCalDate={setCalDate}
            calView={calView}
            setCalView={setCalView}
            onOpenTask={handleOpenTaskFromCalendar}
            onMoveTask={handleMoveTask}
            openAddModal={openAddModal}
            theme={resolvedTheme}
          />
        );
      case 'settings':
        return (
          <SettingsView
            clearWorkspaceTasks={clearWorkspaceTasks}
            company={company}
            canManageEvents={canManageEvents}
            user={user}
            setUser={setUser}
            theme={theme}
            setTheme={updateThemeDB}
            accent={accent}
            setAccent={updateAccentDB}
            showCompleted={showCompleted}
            setShowCompleted={handleSetShowCompleted}
            handleLogout={handleLogoutWithSessionEnd}
            setTasks={setTasks}
            defaultListId={defaultListId}
            setDefaultListId={handleSetDefaultList}
            userLists={userLists}
            setUserLists={setUserLists}
          />
        );
      default:
        return <div className="p-10 text-center font-bold opacity-50">View not implemented</div>;
    }
  };

  const handleToggleSidebar = () => {
    if (window.innerWidth < 1024) {
      setIsMobileMenuOpen((prev) => !prev);
      return;
    }
    setIsSidebarCollapsed((prev) => !prev);
  };

  return (
    <div className={`flex h-screen w-full transition-colors duration-200 overflow-hidden ${resolvedTheme === 'dark' ? 'bg-[#1a1a1a] text-white' : 'bg-[#f5f5f5] text-[#1a1a1a]'}`} data-theme={resolvedTheme} data-theme-preference={theme}>
      {/* MOBILE OVERLAY */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm lg:hidden" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-[70] flex flex-col bg-[var(--sidebar-bg)] border-r border-[var(--border)] transition-all lg:static ${isSidebarCollapsed ? 'w-[52px]' : 'w-[240px]'} ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <a href="https://app.snabbb.com/" className="flex h-[52px] items-center px-3.5 border-b border-[var(--border)] cursor-pointer hover:bg-[var(--sidebar-hover)] transition-colors">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <img src={brandLogo} alt="To-do manager" className="h-7 w-auto flex-shrink-0 object-contain" />
            {/* {!isSidebarCollapsed && (
              <span className="text-[15px] font-bold text-[var(--text)] whitespace-nowrap overflow-hidden">
                To-do <span className="text-accent">manager</span>
              </span>
            )} */}
          </div>
        </a>

        <div className="px-1.5 py-2 border-b border-[var(--border)]">
          <div className="space-y-0.5">
            {!isSidebarCollapsed && <div className="px-2 text-[10px] font-semibold uppercase tracking-[0.8px] text-[var(--text4)] mb-1 mt-2">Menu</div>}
            <NavItem icon={<CheckCircle2 size={16} />} label="My Tasks" active={currentView === 'todo'} onClick={() => { setCurrentView('todo'); setIsMobileMenuOpen(false); }} collapsed={isSidebarCollapsed} badge={tasks.filter(t => !t.done && t.type === 'task').length} />
            <NavItem icon={<CalendarIcon size={16} />} label="Calendar" active={currentView === 'calendar'} onClick={() => { setCurrentView('calendar'); setIsMobileMenuOpen(false); }} collapsed={isSidebarCollapsed} />
            <NavItem icon={<Clock size={16} />} label="Today" active={currentView === 'today'} onClick={() => { setCurrentView('today'); setIsMobileMenuOpen(false); }} collapsed={isSidebarCollapsed} />
            <NavItem icon={<Activity size={16} />} label="Upcoming" active={currentView === 'upcoming'} onClick={() => { setCurrentView('upcoming'); setIsMobileMenuOpen(false); }} collapsed={isSidebarCollapsed} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-1.5 py-2 no-scrollbar">
          <div className="space-y-0.5 pt-2">
             {!isSidebarCollapsed && (
               <div className="px-2 text-[10px] font-semibold uppercase tracking-[0.8px] text-[var(--text4)] mb-2 flex items-center justify-between group">
                 <span>Lists</span>
                 <button 
                   disabled={company}
                   title={company ? "Custom lists are available in Personal workspace" : "Add list"}
                   onClick={() => setIsAddingList(!isAddingList)}
                   className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-[var(--sidebar-hover)] rounded transition-all text-accent"
                 >
                   <Plus size={10} strokeWidth={3} />
                 </button>
               </div>
             )}
             
             {isAddingList && !isSidebarCollapsed && (
               <div className="px-2 mb-3 animate-fade-in">
                 <div className="flex flex-col gap-2 p-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg shadow-sm">
                   <input 
                     autoFocus
                     type="text" 
                     placeholder="List name..." 
                     className="bg-transparent text-[11px] outline-none border-b border-[var(--border)] pb-1"
                     value={newListName}
                     onChange={e => setNewListName(e.target.value)}
                     onKeyDown={e => {
                       if (e.key === 'Enter' && newListName.trim()) {
                         const newList: UserList = { 
                           id: newListName.toLowerCase().replace(/\s+/g, '-'), 
                           name: newListName, 
                           color: newListColor 
                         };
                         setUserLists(prev => [...prev, newList]);
                         saveCategory(newList);
                         setNewListName('');
                         setIsAddingList(false);
                       }
                     }}
                   />
                   <div className="flex justify-between items-center">
                     <div className="flex gap-1.5">
                       {['#3b82f6', '#a855f7', '#ef4444', '#10b981', '#f59e0b', '#ec4899'].map(c => (
                         <button 
                           key={c}
                           className={`w-3 h-3 rounded-full transition-transform ${newListColor === c ? 'ring-1 ring-offset-1 ring-accent scale-125' : 'hover:scale-110'}`}
                           style={{ backgroundColor: c }}
                           onClick={() => setNewListColor(c)}
                         />
                       ))}
                     </div>
                     <button 
                       className="text-[9px] font-bold text-accent uppercase hover:opacity-70"
                       onClick={() => {
                         if (newListName.trim()) {
                           const newList: UserList = { 
                             id: newListName.toLowerCase().replace(/\s+/g, '-'), 
                             name: newListName, 
                             color: newListColor 
                           };
                           setUserLists(prev => [...prev, newList]);
                           saveCategory(newList);
                           setNewListName('');
                           setIsAddingList(false);
                         }
                       }}
                     >
                       Add
                     </button>
                   </div>
                 </div>
               </div>
             )}

             {sortedLists.map(list => (
               <div key={list.id} className="group/list relative pr-1 flex items-center">
                 <NavItem 
                   icon={
                     <div className="flex items-center gap-1.5">
                       <div className="w-2 h-2 rounded-full" style={{ backgroundColor: list.color }} />
                       {!isSidebarCollapsed && pinnedListIds.includes(list.id) && <Pin size={10} className="text-accent" fill="currentColor" />}
                     </div>
                   } 
                   label={list.name} 
                   active={currentView === 'todo' && currentFilter === list.id} 
                   onClick={() => { setCurrentView('todo'); setCurrentFilter(list.id); setIsMobileMenuOpen(false); }} 
                   collapsed={isSidebarCollapsed} 
                 />
                 {!isSidebarCollapsed && !company && (
                   <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover/list:opacity-100 transition-all">
                     <button
                       onClick={(e) => {
                         e.stopPropagation();
                         const nextPinned = !pinnedListIds.includes(list.id);
                         setPinnedListIds((prev) =>
                           nextPinned ? [list.id, ...prev] : prev.filter((id) => id !== list.id)
                         );
                         void saveCategory({ id: list.id, name: list.name, color: list.color, pinned: nextPinned });
                       }}
                       className={`p-1 rounded transition-all ${pinnedListIds.includes(list.id) ? 'text-accent bg-accent/10' : 'text-[var(--text4)] hover:bg-[var(--sidebar-hover)] hover:text-accent'}`}
                       title={pinnedListIds.includes(list.id) ? 'Unpin list' : 'Pin list'}
                     >
                       <Pin size={10} strokeWidth={2.5} fill={pinnedListIds.includes(list.id) ? 'currentColor' : 'none'} />
                     </button>
                     {!DEFAULT_CATEGORY_IDS.includes(list.id) && (
                       <button 
                         onClick={(e) => {
                           e.stopPropagation();
                           const tasksInList = tasks.filter(t => t.list === list.id);
                           const taskCount = tasksInList.length;

                           setConfirmState({
                             show: true,
                             title: 'Delete List?',
                             message: taskCount > 0 
                               ? `Delete "${list.name}" list? This will also permanently delete ${taskCount} task${taskCount > 1 ? 's' : ''} inside it.`
                               : `Delete "${list.name}" list? This action cannot be undone.`,
                             onConfirm: () => { void runMutation(async () => {
                               await deleteTasks(tasks.filter(t => t.list === list.id || t.list === list.name));
                               await deleteCategory(list.id);
                               setUserLists(prev => prev.filter(l => l.id !== list.id));
                               setPinnedListIds(prev => prev.filter(id => id !== list.id));
                               if (currentFilter === list.id) setCurrentFilter('all');
                             }); }

                           });
                         }}
                         className="p-1 hover:bg-red-500/10 hover:text-red-500 rounded transition-all text-[var(--text4)]"
                       >
                         <X size={10} strokeWidth={3} />
                       </button>
                     )}
                   </div>
                 )}
               </div>
             ))}
          </div>
        </div>

        <div className="sidebar-bottom pt-2 pb-3 px-1.5 border-t border-[var(--border)]">
          <NavItem
            icon={<SettingsIcon size={16} />}
            label="Settings"
            active={false}
            onClick={() => {
              setIsMobileMenuOpen(false);
              window.location.assign('https://app.snabbb.com/profile-settings');
            }}
            collapsed={isSidebarCollapsed}
          />
          
          <div className={`mt-3 flex items-center gap-2.5 px-2 py-2.5 rounded-lg bg-[var(--bg3)] overflow-hidden ${isSidebarCollapsed ? 'justify-center' : ''}`}>
            <div className="h-7 w-7 flex-shrink-0 rounded-full bg-accent flex items-center justify-center text-white font-bold text-xs uppercase">
              {profileImageUrl ? (
                <img
                  src={profileImageUrl}
                  alt={`${user.name} profile`}
                  className="h-full w-full object-cover"
                />
              ) : (
                user.name.charAt(0)
              )}
            </div>
            {!isSidebarCollapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-[var(--text)] truncate">{user.name}</p>
                  <div className="flex items-center gap-1 opacity-60">
                     <p className="text-[10px] truncate">{user.plan || 'Free Plan'}</p>
                  </div>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmState({
                      show: true,
                      title: 'Log Out',
                      message: 'Are you sure you want to log out from your account?',
                      confirmText: 'Log Out',
                      onConfirm: () => {
                        handleLogoutWithSessionEnd();
                      }
                    });
                  }}
                  className="flex-shrink-0 h-7 w-7 flex items-center justify-center text-[var(--text4)] hover:text-red-500 hover:bg-red-500/10 rounded-md transition-all"
                  title="Log out"
                >
                  <LogOut size={15} />
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0 relative h-full">
        <header className="h-[52px] flex-shrink-0 flex items-center gap-3 px-5 border-b border-[var(--border)] bg-[var(--header-bg)] sticky top-0 z-40">
          <button 
            id="toggle-sidebar" 
            onClick={() => {
              if (window.innerWidth < 1024) {
                setIsMobileMenuOpen(true);
              } else {
                setIsSidebarCollapsed(!isSidebarCollapsed);
              }
            }} 
            className="h-8 w-8 items-center justify-center flex hover:bg-[var(--bg3)] text-[var(--text3)] hover:text-[var(--text)] rounded-md transition-all"
          >
            <Menu size={16} />
          </button>
          
          <h1 className="min-w-0 text-sm font-semibold text-[var(--text)] whitespace-nowrap sm:text-base">
            {currentView === 'todo' ? 'My Tasks' : (currentView === 'today' ? 'Today' : (currentView === 'upcoming' ? 'Upcoming' : currentView))}
          </h1>

          <div className="flex-1 max-w-[360px] mx-auto relative hidden sm:block">
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text4)]">
              <Search size={13} strokeWidth={2.5} />
            </div>
            <input type="text" placeholder="Search tasks, events, reminders..." className="w-full h-8 pl-8 pr-4 bg-[var(--bg3)] border border-[var(--border)] rounded-md text-[13px] text-[var(--text)] focus:border-accent focus:bg-[var(--surface)] outline-none transition-all placeholder:text-[var(--text4)]" />
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <div className="relative" ref={accentPickerRef}>
              <button
                type="button"
                onClick={() => setIsAccentPickerOpen((open) => !open)}
                className="h-8 w-8 flex items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface)] text-accent hover:bg-[var(--accent-light)] transition-all active:scale-[0.97]"
                aria-label="Change accent color"
                aria-haspopup="dialog"
                aria-expanded={isAccentPickerOpen}
                title="Change color"
              >
                <Palette size={16} />
              </button>

              {isAccentPickerOpen && (
                <div
                  role="dialog"
                  aria-label="Choose accent color"
                  className="absolute right-0 top-full z-50 mt-2 w-[244px] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-lg)]"
                >
                  <p className="mb-3 text-[12px] font-semibold text-[var(--text)]">Accent color</p>
                  <div className="grid grid-cols-7 gap-2">
                    {Object.entries(ACCENTS).map(([name, color]) => (
                      <button
                        type="button"
                        key={name}
                        onClick={() => void updateAccentDB(name)}
                        className="flex h-7 w-7 items-center justify-center rounded-full border-2 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-[var(--surface)]"
                        style={{
                          backgroundColor: color.main,
                          borderColor: accent === name ? 'var(--text)' : 'transparent',
                        }}
                        aria-label={`Use ${name} accent color`}
                        title={name.charAt(0).toUpperCase() + name.slice(1)}
                      >
                        {accent === name && <Check size={14} className="text-white drop-shadow" strokeWidth={3} />}
                      </button>
                    ))}
                  </div>
                  <label className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-3 text-[11px] font-medium text-[var(--text2)]">
                    Custom color
                    <span className="relative h-7 w-9 overflow-hidden rounded-md border border-[var(--border)]">
                      <input
                        type="color"
                        value={accent.startsWith('#') ? accent : (ACCENTS as Record<string, { main: string }>)[accent]?.main || '#0078d4'}
                        onChange={(event) => void updateAccentDB(event.target.value)}
                        className="absolute -inset-2 h-12 w-14 cursor-pointer border-0 bg-transparent"
                        aria-label="Choose a custom accent color"
                      />
                    </span>
                  </label>
                </div>
              )}
            </div>
            <button 
              disabled={!workspace || saving}
              onClick={() => openAddModal('task')}
              className="h-8 flex items-center gap-1.5 px-2.5 sm:px-3.5 bg-accent text-white rounded-md text-[12px] sm:text-[13px] font-medium hover:bg-[var(--accent-hover)] transition-all active:scale-[0.97]"
            >
              <Plus size={14} strokeWidth={2.5} /> 
              <span className="hidden sm:inline">New Task</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-3 py-3 sm:px-5 sm:py-5 lg:px-10 scroll-smooth no-scrollbar">
          <fieldset disabled={saving} className="h-full min-w-0">{renderContent()}</fieldset>
        </main>
      </div>

      <Modal 
        show={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        newTask={newTask}
        setNewTask={setNewTask}
        onSubmit={handleSaveTask}
        isEdit={!!editingTask}
        canManageEvents={canManageEvents}
        saving={saving}
        availableLists={userLists}
      />

      <ConfirmModal 
        show={confirmState.show}
        onClose={() => setConfirmState({ ...confirmState, show: false })}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText || "Confirm Delete"}
      />

      {mutationError && <div role="alert" className="fixed bottom-4 left-4 right-4 z-[250] bg-red-50 text-red-800 border border-red-300 p-4 rounded-lg">{mutationError}<button className="ml-4 underline" onClick={() => setMutationError('')}>Dismiss</button></div>}
      {completionToast && (
        <div className="pointer-events-none fixed bottom-4 left-3 right-3 z-[120] sm:left-auto sm:right-5 sm:bottom-5">
          <Toast
            message={completionToast.message}
            onUndo={handleUndoCompletedTask}
            onClose={clearCompletionToast}
          />
        </div>
      )}
    </div>
  );
}
