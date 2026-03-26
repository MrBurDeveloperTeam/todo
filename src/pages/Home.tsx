import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle2, 
  Calendar as CalendarIcon, 
  Clock, 
  Search, 
  Settings as SettingsIcon, 
  Menu, 
  X, 
  Plus, 
  LayoutGrid, 
  PanelLeftClose, 
  PanelLeftOpen, 
  Activity
} from 'lucide-react';
import { TaskItem, AppUser, ViewType, ItemType } from '../types';
import { NavItem } from '../components/NavItem';
import { TodoView } from '../components/views/TodoView';
import { CalendarView } from '../components/views/CalendarView';
import { SettingsView } from '../components/views/SettingsView';
import { Modal } from '../components/Modal';
import { ConfirmModal } from '../components/ConfirmModal';
import { todayStr, ACCENTS, updateThemeIcon } from '../utils';
import { supabase } from '../supabase';

const DEFAULT_CATEGORIES = [
  { id: 'work', name: 'Work', color: '#3b82f6' },
  { id: 'personal', name: 'Personal', color: '#a855f7' },
  { id: 'events', name: 'Events', color: '#ef4444' }
];
const DEFAULT_CATEGORY_IDS = DEFAULT_CATEGORIES.map(c => c.id);


interface HomeProps {
  tasks: TaskItem[];
  setTasks: React.Dispatch<React.SetStateAction<TaskItem[]>>;
  user: AppUser;
  setUser: React.Dispatch<React.SetStateAction<AppUser>>;
  handleLogout: () => void;
}

export function Home({ tasks, setTasks, user, setUser, handleLogout }: HomeProps) {
  const [currentView, setCurrentView] = useState<ViewType>('todo');
  const [currentFilter, setCurrentFilter] = useState<string>('all');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [modalType, setModalType] = useState<ItemType>('task');
  const [newTask, setNewTask] = useState<Partial<TaskItem>>({});

  // Confirmation state
  const [confirmState, setConfirmState] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });
  
  // Theme state
  const [theme, setTheme] = useState(() => localStorage.getItem('tf_theme') || 'light');
  const [accent, setAccent] = useState(() => localStorage.getItem('tf_accent') || 'tiffany');
  const [showCompleted, setShowCompleted] = useState(() => localStorage.getItem('tf_show_completed') === 'true');

  const [isAddingList, setIsAddingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListColor, setNewListColor] = useState('#3b82f6');
  const [userLists, setUserLists] = useState<{id: string, name: string, color: string}[]>([]);


  useEffect(() => {
    if (!supabase) return;
    const fetchCategories = async () => {
      if (!supabase) return;
      const { data: catData, error: catError } = await supabase
        .from('task-categories')
        .select('*')
        .eq('user_id', user.user_id);
      
      const combined = [...DEFAULT_CATEGORIES];
      if (catData && !catError) {
        catData.forEach((cat: any) => {
          if (!DEFAULT_CATEGORY_IDS.includes(cat.id)) {
            combined.push(cat);
          }
        });
      } else {
        const saved = localStorage.getItem('tf_user_lists');
        if (saved) {
          JSON.parse(saved).forEach((cat: any) => {
            if (!DEFAULT_CATEGORY_IDS.includes(cat.id)) {
              combined.push(cat);
            }
          });
        }
      }
      setUserLists(combined);
    };
    fetchCategories();
  }, [user.user_id]);

  const saveCategory = async (cat: {id: string, name: string, color: string}) => {
    if (!supabase) return;
    await supabase.from('task-categories').upsert({
      ...cat,
      user_id: user.user_id
    });
  };

  const deleteCategoryDB = async (id: string) => {
    if (!supabase) return;
    await supabase.from('task-categories').delete().eq('id', id);
  };

  useEffect(() => {
    localStorage.setItem('tf_user_lists', JSON.stringify(userLists));
  }, [userLists]);

  // Calendar state
  const [calDate, setCalDate] = useState(new Date());
  const [calView, setCalView] = useState('month');
  const brandLogo = theme === 'dark' ? '/Logo/snabbb-white.png' : '/Logo/snabbb-teal.png';

  useEffect(() => {
    localStorage.setItem('tf_theme', theme);
    localStorage.setItem('tf_accent', accent);
    localStorage.setItem('tf_show_completed', String(showCompleted));
    updateThemeIcon(theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.setAttribute('data-theme', theme);
    
    // Update CSS variables for accent
    const accentData = (ACCENTS as any)[accent] || { main: accent, light: `${accent}15`, hover: accent };
    document.documentElement.style.setProperty('--accent', accentData.main);
    document.documentElement.style.setProperty('--accent-rgb', accentData.main.startsWith('#') ? hexToRgb(accentData.main) : '0, 120, 212');
    document.documentElement.style.setProperty('--accent-light', accentData.light || `${accentData.main}15`);
    document.documentElement.style.setProperty('--accent-subtle', theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)');
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

  const handleToggleDone = async (id: string) => {
    if (!supabase) return;
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const nextDone = !task.done;
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: nextDone } : t));
    
    await supabase.from('tasks').update({ 
      status: nextDone ? 'done' : 'todo',
      is_completed: nextDone 
    }).eq('id', id);
  };

  const handleDeleteTask = async (id: string) => {
    if (!supabase) return;
    const taskToDelete = tasks.find(t => t.id === id);
    if (!taskToDelete) return;

    setConfirmState({
      show: true,
      title: 'Delete Task?',
      message: `Are you sure you want to delete "${taskToDelete.title}"? This cannot be undone.`,
      onConfirm: async () => {
        setTasks((prev: TaskItem[]) => prev.filter(t => t.id !== id));
        if (selectedTaskId === id) setSelectedTaskId(null);
        if (supabase) {
          await supabase.from('tasks').delete().eq('id', id);
        }
      }
    });
  };

  const openAddModal = (type: ItemType = 'task') => {
    const standardFilters = ['all', 'task', 'event', 'reminder', 'today', 'overdue', 'upcoming'];
    const initialList = !standardFilters.includes(currentFilter) ? currentFilter : 'personal';

    setEditingTask(null);
    setNewTask({
      type,
      priority: 'none',
      list: initialList,
      date: todayStr(),
    });
    setIsModalOpen(true);
  };

  const openEditModal = (task: TaskItem) => {
    setEditingTask(task);
    setNewTask(task);
    setIsModalOpen(true);
  };

  const handleSaveTask = async () => {
    if (!newTask.title || !supabase) return;

    if (editingTask) {
      const updated = { ...editingTask, ...newTask } as TaskItem;
      setTasks(prev => prev.map(t => t.id === editingTask.id ? updated : t));
      
      await supabase.from('tasks').update({
        title: updated.title,
        description: updated.desc,
        type: updated.type,
        date: updated.date,
        time: updated.time,
        enddate: updated.enddate,
        endtime: updated.endtime,
        location: updated.location,
        urgency: updated.priority === 'none' ? null : (updated.priority === 'med' ? 'MEDIUM' : updated.priority.toUpperCase()),
        list_id_text: updated.list || 'personal',
        status: updated.done ? 'done' : 'todo',
        is_completed: updated.done
      }).eq('id', editingTask.id);
    } else {
      const id = crypto.randomUUID();
      const item: TaskItem = {
        id,
        type: newTask.type || 'task',
        title: newTask.title || '',
        desc: newTask.desc || '',
        date: newTask.date || todayStr(),
        time: newTask.time || '',
        enddate: newTask.enddate || todayStr(),
        endtime: newTask.endtime || '',
        location: newTask.location || '',
        priority: newTask.priority || 'none',
        list: newTask.list || 'personal',
        done: false,
        created: Date.now(),
      };
      setTasks(prev => [item, ...prev]);
      setSelectedTaskId(item.id);

      const { error } = await supabase.from('tasks').insert({
        id,
        user_id: user.user_id,
        title: item.title,
        description: item.desc || null,
        type: item.type,
        date: item.date || todayStr(),
        time: item.time || null,
        enddate: item.enddate || null,
        endtime: item.endtime || null,
        location: item.location || null,
        urgency: item.priority === 'none' ? 'NORMAL' : (item.priority === 'med' ? 'MEDIUM' : item.priority.toUpperCase()),
        list_id_text: item.list || 'personal',
        status: 'todo',
        is_completed: false,
        color: getListColorName(item.list)
      });
      if (error) {
        console.error('SUPABASE MODAL INSERT ERROR:', error);
      }
    }

    setIsModalOpen(false);
  };

  const handleQuickAddTask = async (title: string, list: string) => {
    if (!title || !supabase) return;
    const id = crypto.randomUUID();
    const item: TaskItem = {
      id,
      type: 'task',
      title,
      desc: '',
      date: todayStr(),
      time: '',
      enddate: todayStr(),
      endtime: '',
      location: '',
      priority: 'none',
      list,
      done: false,
      created: Date.now(),
    };
    setTasks(prev => [item, ...prev]);
    setSelectedTaskId(item.id);

    const { error } = await supabase.from('tasks').insert({
      id,
      user_id: user.user_id,
      title: item.title,
      description: item.desc || null,
      type: item.type,
      date: item.date || todayStr(),
      time: item.time || null,
      enddate: item.enddate || null,
      endtime: item.endtime || null,
      location: item.location || null,
      urgency: item.priority === 'none' ? 'NORMAL' : (item.priority === 'med' ? 'MEDIUM' : item.priority.toUpperCase()),
      list_id_text: item.list || 'personal',
      status: 'todo',
      is_completed: false,
      color: getListColorName(item.list)
    });
    if (error) {
      console.error('SUPABASE INSERT ERROR:', error);
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case 'todo':
      case 'today':
      case 'upcoming':
        return (
          <TodoView 
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
            userLists={userLists}
            theme={theme}
          />
        );
      case 'calendar':
        return (
          <CalendarView 
            tasks={tasks}
            calDate={calDate}
            setCalDate={setCalDate}
            calView={calView}
            setCalView={setCalView}
            setSelectedTaskId={setSelectedTaskId}
            setCurrentView={setCurrentView}
            openAddModal={openAddModal}
            theme={theme}
          />
        );
      case 'settings':
        return (
          <SettingsView 
            user={user}
            setUser={setUser}
            theme={theme}
            setTheme={setTheme}
            accent={accent}
            setAccent={setAccent}
            showCompleted={showCompleted}
            setShowCompleted={setShowCompleted}
            handleLogout={handleLogout}
            setTasks={setTasks}
          />
        );
      default:
        return <div className="p-10 text-center font-bold opacity-50">View not implemented</div>;
    }
  };

  return (
    <div className={`flex h-screen w-full transition-colors duration-200 overflow-hidden ${theme === 'dark' ? 'bg-[#1a1a1a] text-white' : 'bg-[#f5f5f5] text-[#1a1a1a]'}`} data-theme={theme}>
      {/* MOBILE OVERLAY */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm lg:hidden" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-[var(--sidebar-bg)] border-r border-[var(--border)] transition-all lg:static ${isSidebarCollapsed ? 'w-[52px]' : 'w-[240px]'} ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex h-[52px] items-center px-3.5 border-b border-[var(--border)] cursor-pointer hover:bg-[var(--sidebar-hover)] transition-colors" onClick={() => { setCurrentView('todo'); setCurrentFilter('all'); }}>
          <div className="flex items-center gap-2.5 overflow-hidden">
            <img src={brandLogo} alt="To-do manager" className="h-7 w-auto flex-shrink-0 object-contain" />
            {!isSidebarCollapsed && (
              <span className="text-[15px] font-bold text-[var(--text)] whitespace-nowrap overflow-hidden">
                To-do <span className="text-accent">manager</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2 space-y-2 no-scrollbar">
          <div className="px-1.5 space-y-0.5">
            {!isSidebarCollapsed && <div className="px-2 text-[10px] font-semibold uppercase tracking-[0.8px] text-[var(--text4)] mb-1 mt-2">Menu</div>}
            <NavItem icon={<CheckCircle2 size={16} />} label="My Tasks" active={currentView === 'todo'} onClick={() => { setCurrentView('todo'); setIsMobileMenuOpen(false); }} collapsed={isSidebarCollapsed} badge={tasks.filter(t => !t.done && t.type === 'task').length} />
            <NavItem icon={<CalendarIcon size={16} />} label="Calendar" active={currentView === 'calendar'} onClick={() => { setCurrentView('calendar'); setIsMobileMenuOpen(false); }} collapsed={isSidebarCollapsed} />
            <NavItem icon={<Clock size={16} />} label="Today" active={currentView === 'today'} onClick={() => { setCurrentView('today'); setIsMobileMenuOpen(false); }} collapsed={isSidebarCollapsed} />
            <NavItem icon={<Activity size={16} />} label="Upcoming" active={currentView === 'upcoming'} onClick={() => { setCurrentView('upcoming'); setIsMobileMenuOpen(false); }} collapsed={isSidebarCollapsed} />
          </div>

          <div className="px-1.5 space-y-0.5 pt-4">
             {!isSidebarCollapsed && (
               <div className="px-2 text-[10px] font-semibold uppercase tracking-[0.8px] text-[var(--text4)] mb-2 flex items-center justify-between group">
                 <span>Lists</span>
                 <button 
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
                         const newList = { 
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
                           const newList = { 
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

             {userLists.map(list => (
               <div key={list.id} className="group/list relative pr-1 flex items-center">
                 <NavItem 
                   icon={<div className="w-2 h-2 rounded-full" style={{ backgroundColor: list.color }} />} 
                   label={list.name} 
                   active={currentView === 'todo' && currentFilter === list.id} 
                   onClick={() => { setCurrentView('todo'); setCurrentFilter(list.id); setIsMobileMenuOpen(false); }} 
                   collapsed={isSidebarCollapsed} 
                 />
                 {!isSidebarCollapsed && !DEFAULT_CATEGORY_IDS.includes(list.id) && (
                   <button 
                     onClick={(e) => {
                       e.stopPropagation();
                       setConfirmState({
                         show: true,
                         title: 'Delete List?',
                         message: `Delete "${list.name}" list? Your tasks will be moved to 'Unclassified'.`,
                         onConfirm: async () => {
                           setUserLists(prev => prev.filter(l => l.id !== list.id));
                           deleteCategoryDB(list.id);
                           setTasks(prev => prev.map(t => t.list === list.id ? { ...t, list: '' } : t));
                           if (currentFilter === list.id) setCurrentFilter('all');
                         }
                       });
                     }}
                     className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/list:opacity-100 p-1 hover:bg-red-500/10 hover:text-red-500 rounded transition-all text-[var(--text4)]"
                   >
                     <X size={10} strokeWidth={3} />
                   </button>
                 )}
               </div>
             ))}
          </div>
        </div>

        <div className="sidebar-bottom pt-2 pb-3 px-1.5 border-t border-[var(--border)]">
          <NavItem icon={<SettingsIcon size={16} />} label="Settings" active={currentView === 'settings'} onClick={() => { setCurrentView('settings'); setIsMobileMenuOpen(false); }} collapsed={isSidebarCollapsed} />
          
          <div className={`mt-3 flex items-center gap-2.5 px-2 py-2.5 rounded-lg bg-[var(--bg3)] overflow-hidden ${isSidebarCollapsed ? 'justify-center' : ''}`}>
            <div className="h-7 w-7 flex-shrink-0 rounded-full bg-accent flex items-center justify-center text-white font-bold text-xs uppercase">
              {user.name.charAt(0)}
            </div>
            {!isSidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-[var(--text)] truncate">{user.name}</p>
                <div className="flex items-center gap-1 opacity-60">
                   <p className="text-[10px] truncate">{user.plan || 'Free Plan'}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col min-w-0 relative h-full">
        <header className="h-[52px] flex-shrink-0 flex items-center gap-3 px-5 border-b border-[var(--border)] bg-[var(--header-bg)] sticky top-0 z-40">
          <button id="toggle-sidebar" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="h-8 w-8 items-center justify-center flex hover:bg-[var(--bg3)] text-[var(--text3)] hover:text-[var(--text)] rounded-md transition-all">
            <Menu size={16} />
          </button>
          
          <h1 className="text-base font-semibold text-[var(--text)] whitespace-nowrap">
            {currentView === 'todo' ? 'My Tasks' : (currentView === 'today' ? 'Today' : (currentView === 'upcoming' ? 'Upcoming' : currentView))}
          </h1>

          <div className="flex-1 max-w-[360px] mx-auto relative hidden sm:block">
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text4)]">
              <Search size={13} strokeWidth={2.5} />
            </div>
            <input type="text" placeholder="Search tasks, events, reminders..." className="w-full h-8 pl-8 pr-4 bg-[var(--bg3)] border border-[var(--border)] rounded-md text-[13px] text-[var(--text)] focus:border-accent focus:bg-[var(--surface)] outline-none transition-all placeholder:text-[var(--text4)]" />
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <button 
              onClick={() => openAddModal('task')}
              className="h-8 flex items-center gap-1.5 px-3.5 bg-accent text-white rounded-md text-[13px] font-medium hover:bg-[var(--accent-hover)] transition-all active:scale-[0.97]"
            >
              <Plus size={14} strokeWidth={2.5} /> 
              <span>New Task</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-5 py-5 sm:px-10 scroll-smooth no-scrollbar">
          {renderContent()}
        </main>
      </div>

      <Modal 
        show={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        newTask={newTask}
        setNewTask={setNewTask}
        onSubmit={handleSaveTask}
        isEdit={!!editingTask}
        availableLists={userLists}
      />

      <ConfirmModal 
        show={confirmState.show}
        onClose={() => setConfirmState({ ...confirmState, show: false })}
        onConfirm={confirmState.onConfirm}
        title={confirmState.title}
        message={confirmState.message}
        confirmText="Confirm Delete"
      />
    </div>
  );
}
