import React, { useState } from 'react';
import { 
  Check, 
  Calendar, 
  Clock, 
  Search, 
  Bell, 
  Plus, 
  MapPin, 
  Edit2, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  ChevronRight,
  Info 
} from 'lucide-react';
import { TaskItem, ItemType, Priority, ListType } from '../../types';
import { todayStr, formatDate, formatTime } from '../../utils';

interface TodoViewProps {
  tasks: TaskItem[];
  setTasks: React.Dispatch<React.SetStateAction<TaskItem[]>>;
  currentFilter: string;
  setCurrentFilter: (filter: string) => void;
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;
  handleToggleDone: (id: string) => void;
  handleDeleteTask: (id: string) => void;
  openEditModal: (task: TaskItem) => void;
  currentView: string;
  setCurrentView: (view: any) => void;
  showCompleted: boolean;
  handleQuickAddTask: (title: string, list: string, type?: ItemType) => void;
  userLists: { id: string; name: string; color: string }[];
  defaultListId: string;
}

export function TodoView({
  tasks,
  setTasks,
  currentFilter,
  setCurrentFilter,
  selectedTaskId,
  setSelectedTaskId,
  handleToggleDone,
  handleDeleteTask,
  openEditModal,
  currentView,
  setCurrentView,
  showCompleted,
  handleQuickAddTask,
  userLists,
  defaultListId
}: TodoViewProps) {
  const [isCompletedCollapsed, setIsCompletedCollapsed] = useState(true);
  const [isOverdueCollapsed, setIsOverdueCollapsed] = useState(true);

  const getTypeBadgeClass = (type: TaskItem['type']) => {
    if (type === 'task') {
      return 'bg-[#eff6ff] text-[#2563eb] border border-[#bfdbfe] dark:bg-[var(--accent-light)] dark:text-accent dark:border-accent/10';
    }
    if (type === 'event') {
      return 'bg-[#fee2e2] text-[#b42318] border border-[#fca5a5] dark:bg-red-900/20 dark:text-red-400 dark:border-red-500/20';
    }
    return 'text-[#92400e] border border-[#fcd34d] dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-500/20';
  };
  
  const filteredTasks = tasks.filter(t => {
    if (currentFilter === 'all') return true;
    if (currentFilter === 'today') return t.date === todayStr();
    if (currentFilter === 'overdue') return t.date && t.date < todayStr() && !t.done;
    if (currentFilter === 'upcoming') {
      const now = new Date(todayStr());
      const end = new Date(todayStr());
      end.setDate(end.getDate() + 7);
      if (!t.date) return false;
      const tDate = new Date(t.date);
      return tDate >= now && tDate <= end;
    }
    if (t.list === currentFilter) return true;
    return t.type === currentFilter;
  }).sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const pMap = { high: 3, med: 2, low: 1, none: 0 };
    if (pMap[a.priority] !== pMap[b.priority]) return pMap[b.priority] - pMap[a.priority];
    return b.created - a.created;
  });

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0, 120, 212';
  };

  const taskItemHTML = (t: TaskItem) => {
    const category = userLists.find(l => l.id === t.list);
    const categoryColor = category ? category.color : '#3b82f6';
    const rgb = hexToRgb(categoryColor);

    const isOverdue = t.date && t.date < todayStr() && !t.done;
    const priColor = { high: 'var(--priority-high)', med: 'var(--priority-med)', low: 'var(--priority-low)', none: 'transparent' }[t.priority];
    
    return (
      <div 
        key={t.id}
        className={`flex items-start gap-3 p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)] mb-1 cursor-pointer transition-all hover:border-accent hover:shadow-[0_2px_8px_var(--accent-subtle)] group ${t.done ? 'opacity-70' : ''} ${t.id === selectedTaskId ? 'border-accent bg-[var(--accent-light)]' : ''}`}
        onClick={() => { setSelectedTaskId(t.id); }}
      >
        <div 
          className={`w-4.5 h-4.5 rounded-full border-2 border-[var(--border2)] flex-shrink-0 mt-0.5 flex items-center justify-center transition-all hover:border-accent hover:bg-[var(--accent-subtle)] ${t.done ? 'bg-accent border-accent' : ''}`}
          onClick={(e) => { e.stopPropagation(); handleToggleDone(t.id); }}
        >
          {t.done && <Check size={10} strokeWidth={4} color="white" />}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className={`text-[13.5px] font-medium text-[var(--text)] leading-tight ${t.done ? 'line-through text-[var(--task-done)]' : ''}`}>
            {t.title}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {t.date && (
              <span className={`text-[11px] flex items-center gap-1 ${isOverdue ? 'text-[var(--priority-high)]' : 'text-[var(--text3)]'}`}>
                <Calendar size={10} />
                {formatDate(t.date)}
                {t.time && ` · ${formatTime(t.time)}`}
              </span>
            )}
            {t.list && (
              <span 
                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                style={{ 
                  backgroundColor: `rgba(${rgb}, 0.1)`, 
                  color: categoryColor,
                  border: `1px solid rgba(${rgb}, 0.15)`
                }}
              >
                {t.list}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${getTypeBadgeClass(t.type)}`}>
            {t.type}
          </span>
          {t.priority !== 'none' && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: priColor }}></div>}
        </div>
      </div>
    );
  };

  const selectedTask = tasks.find(t => t.id === selectedTaskId);

  return (
    <div className="flex flex-col md:flex-row gap-5 h-full overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex flex-col mb-4">
          <div className="flex gap-2">
            <input 
              id="quick-task-input"
              name="quickTask"
              type="text" 
              placeholder="Add a task… press Enter to save" 
              className="flex-1 px-3 py-2 rounded-lg border border-[var(--input-border)] bg-[var(--surface)] text-[13.5px] outline-none focus:border-accent focus:ring-2 focus:ring-[var(--accent-subtle)]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  const standardFilters = ['all', 'task', 'event', 'reminder', 'today', 'overdue', 'upcoming'];
                  const listCategory = !standardFilters.includes(currentFilter) ? currentFilter : defaultListId;
                  
                  let type: ItemType = 'task';
                  if (currentFilter === 'event') type = 'event';
                  if (currentFilter === 'reminder') type = 'reminder';

                  handleQuickAddTask(e.currentTarget.value.trim(), listCategory, type);
                  e.currentTarget.value = '';
                }
              }}
            />
          </div>
          <div className="mt-1 px-2 text-[10px] text-[var(--text4)] flex items-center gap-1 opacity-80">
            <Info size={10} className="text-accent" />
            <span>Tasks created here are automatically assigned to the <strong className="text-[var(--text3)] uppercase">{currentFilter === 'all' ? 'Unclassified' : currentFilter}</strong> filter</span>
          </div>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 mini-scrollbar">
          {['all', 'task', 'event', 'reminder', 'today', 'upcoming', 'overdue'].map(f => (
            <button
              key={f}
              onClick={() => {
                setCurrentFilter(f);
                if (currentView !== 'todo') setCurrentView('todo');
              }}
              className={`px-3 py-1 rounded-full text-[12.5px] font-medium border border-[var(--border)] whitespace-nowrap transition-all ${currentFilter === f ? 'bg-accent text-white border-accent' : 'bg-[var(--surface)] text-[var(--text2)] hover:border-accent hover:text-accent'}`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto pr-1">
          {filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-[var(--text3)]">
              <CheckCircle2 size={48} strokeWidth={1} className="mb-3 opacity-30" />
              <p className="text-sm">No tasks found</p>
              <small className="text-xs opacity-70">Add a new task to get started</small>
            </div>
          ) : (() => {
            const overdue = filteredTasks.filter(t => !t.done && t.date && t.date < todayStr());
            const active = filteredTasks.filter(t => !t.done && !(t.date && t.date < todayStr()));
            const completed = filteredTasks.filter(t => t.done);

            return (
              <>
                {currentFilter !== 'overdue' && overdue.length > 0 && (
                  <div className="mb-6">
                    <div 
                      className="text-[11px] font-bold text-red-500 uppercase tracking-widest mb-3 flex items-center gap-2 cursor-pointer hover:opacity-70 transition-all select-none bg-red-500/5 py-1.5 px-2 rounded-md border border-red-500/10"
                      onClick={() => setIsOverdueCollapsed(!isOverdueCollapsed)}
                    >
                      <ChevronRight size={12} strokeWidth={3} className={`transition-transform duration-200 ${isOverdueCollapsed ? '' : 'rotate-90'}`} />
                      Overdue List ({overdue.length})
                    </div>
                    {!isOverdueCollapsed && overdue.map(t => taskItemHTML(t))}
                  </div>
                )}

                <div className="space-y-1">
                  {(currentFilter === 'overdue' ? filteredTasks.filter(t => !t.done) : active).map(t => taskItemHTML(t))}
                </div>
                
                {showCompleted && completed.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-[var(--border)] border-dashed">
                    <div 
                      className="text-[11px] font-bold text-[var(--text4)] uppercase tracking-widest mb-3 flex items-center gap-2 cursor-pointer hover:opacity-70 transition-all select-none"
                      onClick={() => setIsCompletedCollapsed(!isCompletedCollapsed)}
                    >
                      <ChevronRight size={12} strokeWidth={3} className={`transition-transform duration-200 ${isCompletedCollapsed ? '' : 'rotate-90'}`} />
                      Completed tasks ({completed.length})
                    </div>
                    {!isCompletedCollapsed && completed.map(t => taskItemHTML(t))}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* DETAIL PANEL */}
      <div className="hidden lg:block w-80 flex-shrink-0 overflow-auto">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 sticky top-0 min-h-[300px]">
          {selectedTask ? (
            <div className="animate-fade-in">
              <h3 className="text-base font-bold text-[var(--text)] mb-4 pb-2 border-b border-[var(--border)]">{selectedTask.title}</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-[var(--text4)] uppercase block mb-1">Type</label>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${getTypeBadgeClass(selectedTask.type)}`}>
                    {selectedTask.type}
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[var(--text4)] uppercase block mb-1">Notes / Description</label>
                  <textarea 
                    className="w-full text-xs text-[var(--text2)] bg-[var(--bg2)] border border-[var(--border)] p-3 rounded-lg leading-relaxed whitespace-pre-wrap focus:ring-2 focus:ring-[var(--accent-subtle)] focus:border-accent outline-none min-h-[120px] transition-all resize-none"
                    placeholder="Add a note or detailed description..."
                    value={selectedTask.desc || ''}
                    onChange={(e) => {
                      const newVal = e.target.value;
                      setTasks(prev => prev.map(t => t.id === selectedTask.id ? { ...t, desc: newVal } : t));
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-[var(--text4)] uppercase block mb-1">Due Date</label>
                    <div className="text-xs text-[var(--text)]">{formatDate(selectedTask.date)} {selectedTask.time && `at ${formatTime(selectedTask.time)}`}</div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[var(--text4)] uppercase block mb-1">Priority</label>
                    <div className="text-xs flex items-center gap-1 capitalize">
                      {selectedTask.priority !== 'none' && <div className={`w-2 h-2 rounded-full bg-[var(--priority-${selectedTask.priority})]`}></div>}
                      {selectedTask.priority || 'None'}
                    </div>
                  </div>
                </div>

                {selectedTask.location && (
                  <div>
                    <label className="text-[11px] font-bold text-[var(--text4)] uppercase block mb-1">Location</label>
                    <div className="text-xs text-[var(--text)] flex items-center gap-1"><MapPin size={12} className="text-accent" /> {selectedTask.location}</div>
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t border-[var(--border)]">
                  <button 
                    className="flex-1 py-1.5 rounded-lg bg-accent text-white text-[12.5px] font-medium flex items-center justify-center gap-1 hover:brightness-110 active:scale-95 transition"
                    onClick={() => openEditModal(selectedTask)}
                  >
                    <Edit2 size={12} /> Edit
                  </button>
                  <button 
                    className="flex-1 py-1.5 rounded-lg border border-[var(--border)] text-[12.5px] font-medium flex items-center justify-center gap-1 hover:bg-[var(--accent-subtle)] hover:text-accent transition"
                    onClick={() => handleToggleDone(selectedTask.id)}
                  >
                    {selectedTask.done ? <RefreshCw size={12} /> : <Check size={12} />}
                    {selectedTask.done ? 'Reopen' : 'Done'}
                  </button>
                  <button 
                    className="p-1 px-2 rounded-lg border border-[var(--border)] text-[var(--text3)] hover:text-[var(--priority-high)] hover:bg-red-50 transition"
                    onClick={() => handleDeleteTask(selectedTask.id)}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-[var(--text3)] opacity-50 px-4 text-center">
              <Plus size={40} className="mb-2" />
              <p className="text-sm font-medium">Select a task</p>
              <small className="text-xs">Click any task to see its details here</small>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
