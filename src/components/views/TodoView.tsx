import React, { useState } from 'react';
import {
  Check,
  Calendar,
  Plus,
  MapPin,
  Edit2,
  Trash2,
  RefreshCw,
  CheckCircle2,
  ChevronRight,
  Info,
  ChevronDown
} from 'lucide-react';
import { TaskItem, ItemType, Priority } from '../../types';
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
  handleSaveTaskDescription: (id: string, desc: string) => Promise<void>;
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
  handleSaveTaskDescription,
  userLists,
  defaultListId
}: TodoViewProps) {
  const [isCompletedCollapsed, setIsCompletedCollapsed] = useState(true);
  const [isOverdueCollapsed, setIsOverdueCollapsed] = useState(true);
  const standardFilters = ['all', 'task', 'event', 'reminder', 'today', 'overdue', 'upcoming'];

  const getValidTaskListId = (candidate?: string) => {
    const fallbackListId = userLists.some((list) => list.id === defaultListId)
      ? defaultListId
      : (userLists[0]?.id || 'personal');

    if (!candidate || standardFilters.includes(candidate)) {
      return fallbackListId;
    }

    return userLists.some((list) => list.id === candidate) ? candidate : fallbackListId;
  };

  const getTypeBadgeClass = (type: TaskItem['type']) => {
    if (type === 'task') {
      return 'bg-transparent text-[#2563eb] border border-[#bfdbfe] dark:bg-transparent dark:text-accent dark:border-accent/30';
    }
    if (type === 'event') {
      return 'bg-transparent text-[#b42318] border border-[#fca5a5] dark:bg-transparent dark:text-red-400 dark:border-red-500/30';
    }
    return 'bg-transparent text-[#78350f] border border-[#f59e0b] dark:bg-transparent dark:text-amber-400 dark:border-amber-500/30';
  };

  const filteredTasks = tasks.filter((t) => {
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

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);
  const activeCategoryLabel = currentFilter === 'all'
    ? 'All Tasks'
    : userLists.find((list) => list.id === currentFilter)?.name
      || currentFilter.charAt(0).toUpperCase() + currentFilter.slice(1);

  const mobileCategoryOptions = [
    { id: 'all', label: 'All Tasks' },
    { id: 'task', label: 'Task' },
    { id: 'event', label: 'Event' },
    { id: 'reminder', label: 'Reminder' },
    { id: 'today', label: 'Today' },
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'overdue', label: 'Overdue' },
    ...userLists.map((list) => ({ id: list.id, label: list.name })),
  ].filter((option, index, array) => array.findIndex((item) => item.id === option.id) === index);

  const renderSelectedTaskDetail = () => {
    if (!selectedTask) {
      return (
        <div className="flex flex-col items-center justify-center py-10 text-[var(--text3)] opacity-50 px-4 text-center">
          <Plus size={40} className="mb-2" />
          <p className="text-sm font-medium">Select a task</p>
          <small className="text-xs">Click any task to see its details here</small>
        </div>
      );
    }

    return (
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
                setTasks((prev) => prev.map((t) => t.id === selectedTask.id ? { ...t, desc: newVal } : t));
              }}
              onBlur={(e) => {
                void handleSaveTaskDescription(selectedTask.id, e.target.value);
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

          <div className="flex flex-wrap gap-2 pt-4 border-t border-[var(--border)]">
            <button
              className="flex-1 min-w-[120px] py-2 rounded-lg bg-accent text-white text-[12.5px] font-medium flex items-center justify-center gap-1 hover:brightness-110 active:scale-95 transition"
              onClick={() => openEditModal(selectedTask)}
            >
              <Edit2 size={12} /> Edit
            </button>
            <button
              className="flex-1 min-w-[120px] py-2 rounded-lg border border-[var(--border)] text-[12.5px] font-medium flex items-center justify-center gap-1 hover:bg-[var(--accent-subtle)] hover:text-accent transition"
              onClick={() => handleToggleDone(selectedTask.id)}
            >
              {selectedTask.done ? <RefreshCw size={12} /> : <Check size={12} />}
              {selectedTask.done ? 'Reopen' : 'Done'}
            </button>
            <button
              className="w-full sm:w-auto p-2 px-3 rounded-lg border border-[var(--border)] text-[var(--text3)] hover:text-[var(--priority-high)] hover:bg-red-50 transition flex items-center justify-center gap-1"
              onClick={() => handleDeleteTask(selectedTask.id)}
            >
              <Trash2 size={12} />
              <span className="sm:hidden">Delete</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const taskItemHTML = (t: TaskItem) => {
    const category = userLists.find((l) => l.id === t.list);
    const categoryColor = category ? category.color : '#3b82f6';
    const rgb = hexToRgb(categoryColor);
    const isOverdue = t.date && t.date < todayStr() && !t.done;
    const priColor = { high: 'var(--priority-high)', med: 'var(--priority-med)', low: 'var(--priority-low)', none: 'transparent' }[t.priority];
    const isSelected = t.id === selectedTaskId;

    return (
      <div
        key={t.id}
        className={`rounded-lg bg-[var(--surface)] border border-[var(--border)] mb-1 transition-all hover:border-accent hover:shadow-[0_2px_8px_var(--accent-subtle)] group ${t.done ? 'opacity-70' : ''} ${isSelected ? 'border-accent bg-[var(--accent-light)]' : ''}`}
        onClick={() => { setSelectedTaskId(isSelected ? null : t.id); }}
      >
        <div className="flex items-start gap-3 p-3 cursor-pointer">
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

        {isSelected && (
          <div className="border-t border-[var(--border)] px-3 pb-3 pt-3 lg:hidden space-y-3">
            <div>
              <label className="text-[11px] font-bold text-[var(--text4)] uppercase block mb-1">Notes / Description</label>
              <textarea
                className="w-full text-xs text-[var(--text2)] bg-[var(--bg2)] border border-[var(--border)] p-3 rounded-lg leading-relaxed whitespace-pre-wrap focus:ring-2 focus:ring-[var(--accent-subtle)] focus:border-accent outline-none min-h-[110px] transition-all resize-none"
                placeholder="Add a note or detailed description..."
                value={t.desc || ''}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  const newVal = e.target.value;
                  setTasks((prev) => prev.map((task) => task.id === t.id ? { ...task, desc: newVal } : task));
                }}
                onBlur={(e) => {
                  void handleSaveTaskDescription(t.id, e.target.value);
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-[var(--text4)] uppercase block mb-1">Due Date</label>
                <div className="text-xs text-[var(--text)]">{formatDate(t.date)} {t.time && `at ${formatTime(t.time)}`}</div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-[var(--text4)] uppercase block mb-1">Priority</label>
                <div className="text-xs flex items-center gap-1 capitalize">
                  {t.priority !== 'none' && <div className={`w-2 h-2 rounded-full bg-[var(--priority-${t.priority})]`}></div>}
                  {t.priority || 'None'}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                className="flex-1 min-w-[110px] py-2 rounded-lg bg-accent text-white text-[12.5px] font-medium flex items-center justify-center gap-1 hover:brightness-110 active:scale-95 transition"
                onClick={(e) => {
                  e.stopPropagation();
                  openEditModal(t);
                }}
              >
                <Edit2 size={12} /> Edit
              </button>
              <button
                className="flex-1 min-w-[110px] py-2 rounded-lg border border-[var(--border)] text-[12.5px] font-medium flex items-center justify-center gap-1 hover:bg-[var(--accent-subtle)] hover:text-accent transition"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleDone(t.id);
                }}
              >
                {t.done ? <RefreshCw size={12} /> : <Check size={12} />}
                {t.done ? 'Reopen' : 'Done'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col md:flex-row gap-5 h-full overflow-hidden">
      <div className="flex-1 flex flex-col min-w-0">
        <div className="mb-3 hidden sm:flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text4)]">Current Category</span>
          <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-[11px] font-bold text-accent">
            {activeCategoryLabel}
          </span>
        </div>

        <div className="mb-3 sm:hidden">
          <label className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text4)] block mb-2">Current Category</label>
          <div className="relative">
            <select
              value={currentFilter}
              onChange={(e) => {
                setCurrentFilter(e.target.value);
                if (currentView !== 'todo') setCurrentView('todo');
              }}
              className="w-full appearance-none rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 pr-10 text-[13px] font-bold text-accent outline-none focus:border-accent"
            >
              {mobileCategoryOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text4)]" />
          </div>
        </div>

        <div className="flex flex-col mb-4">
          <div className="flex gap-2">
            <input
              id="quick-task-input"
              name="quickTask"
              type="text"
              placeholder="Add a task... press Enter to save"
              className="flex-1 px-3 py-2 rounded-lg border border-[var(--input-border)] bg-[var(--surface)] text-[13.5px] outline-none focus:border-accent focus:ring-2 focus:ring-[var(--accent-subtle)]"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  const listCategory = getValidTaskListId(currentFilter);

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
            <span>Tasks created here are automatically assigned to the <strong className="text-[var(--text3)] uppercase">{getValidTaskListId(currentFilter)}</strong> list</span>
          </div>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 mini-scrollbar">
          {['all', 'task', 'event', 'reminder', 'today', 'upcoming', 'overdue'].map((f) => (
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
            const overdue = filteredTasks.filter((t) => !t.done && t.date && t.date < todayStr());
            const active = filteredTasks.filter((t) => !t.done && !(t.date && t.date < todayStr()));
            const completed = filteredTasks.filter((t) => t.done);

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
                    {!isOverdueCollapsed && overdue.map((t) => taskItemHTML(t))}
                  </div>
                )}

                <div className="space-y-1">
                  {(currentFilter === 'overdue' ? filteredTasks.filter((t) => !t.done) : active).map((t) => taskItemHTML(t))}
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
                    {!isCompletedCollapsed && completed.map((t) => taskItemHTML(t))}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>

      <div className="hidden lg:block w-80 flex-shrink-0 overflow-auto">
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 sticky top-0 min-h-[300px]">
          {renderSelectedTaskDetail()}
        </div>
      </div>
    </div>
  );
}
