import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { v4 as uuidv4 } from 'uuid';
import { Task } from '../hooks/types';

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  initialDate?: Date;
  initialTask?: Task | null;
}

const NewTaskModal: React.FC<NewTaskModalProps> = ({ isOpen, onClose, onSave, onDelete, initialDate, initialTask }) => {
  const [type, setType] = useState<'task' | 'event'>('task');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('blue');
  const [urgency, setUrgency] = useState<Task['urgency']>('Normal');

  // Date & Time Management
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isUrgencyMenuOpen, setIsUrgencyMenuOpen] = useState(false);
  const [pickerView, setPickerView] = useState<'calendar' | 'time'>('calendar');
  const [pickerViewDate, setPickerViewDate] = useState(new Date());
  const datePickerRef = useRef<HTMLDivElement>(null);
  const urgencyMenuRef = useRef<HTMLDivElement>(null);

  const duration = '1h'; // Default duration hidden

  useEffect(() => {
    if (isOpen) {
      if (initialTask) {
        setType(initialTask.type);
        setTitle(initialTask.title);
        setDescription(initialTask.description || '');
        setColor(initialTask.color || 'blue');
        setUrgency(initialTask.urgency);
        setDate(initialTask.date);
        setTime(initialTask.time || '');
        setPickerViewDate(new Date(initialTask.date));
      } else {
        setType('task');
        setTitle('');
        setDescription('');
        setColor('blue');
        setUrgency('Normal');
        const d = initialDate || new Date();
        const offsetDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
        setDate(offsetDate.toISOString().split('T')[0]);
        setTime('');
        setPickerViewDate(new Date());
      }
      setPickerView('calendar');
      setIsDatePickerOpen(false);
      setIsUrgencyMenuOpen(false);
    }
  }, [isOpen, initialDate, initialTask]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setIsDatePickerOpen(false);
      }
      if (urgencyMenuRef.current && !urgencyMenuRef.current.contains(event.target as Node)) {
        setIsUrgencyMenuOpen(false);
      }
    };
    if (isDatePickerOpen || isUrgencyMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDatePickerOpen, isUrgencyMenuOpen]);

  const handleTypeChange = (newType: 'task' | 'event') => {
    setType(newType);
  };

  const urgencies: Task['urgency'][] = ['Low', 'Normal', 'Medium', 'High'];

  const getUrgencyStyles = (value: Task['urgency']) => {
    switch (value) {
      case 'High':
        return 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
      case 'Medium':
        return 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800';
      case 'Low':
        return 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800';
      default:
        return 'bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
    }
  };

  const colors = [
    { id: 'blue', class: 'bg-blue-500', ring: 'ring-blue-500' },
    { id: 'red', class: 'bg-red-500', ring: 'ring-red-500' },
    { id: 'green', class: 'bg-emerald-500', ring: 'ring-emerald-500' },
    { id: 'amber', class: 'bg-amber-500', ring: 'ring-amber-500' },
    { id: 'violet', class: 'bg-violet-500', ring: 'ring-violet-500' },
    { id: 'pink', class: 'bg-pink-500', ring: 'ring-pink-500' },
    { id: 'cyan', class: 'bg-cyan-500', ring: 'ring-cyan-500' },
    { id: 'slate', class: 'bg-slate-500', ring: 'ring-slate-500' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const finalTime = time;
    const finalDuration = duration;
    const finalUrgency = type === 'event' ? 'Normal' : urgency;

    const newTask: Task = {
      id: initialTask?.id || uuidv4(),
      title,
      description: description.trim() || undefined,
      category: 'Deep Work',
      type,
      color,
      urgency: finalUrgency,
      date,
      time: finalTime,
      duration: finalDuration,
      status: initialTask?.status || 'todo',
      progress: initialTask?.progress,
    };
    onSave(newTask);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (initialTask && onDelete) {
      onDelete(initialTask.id);
      onClose();
    }
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return 'Date';
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPickerViewDate(new Date(pickerViewDate.getFullYear(), pickerViewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPickerViewDate(new Date(pickerViewDate.getFullYear(), pickerViewDate.getMonth() + 1, 1));
  };

  const handleDateClick = (d: number) => {
    const newDate = new Date(pickerViewDate.getFullYear(), pickerViewDate.getMonth(), d);
    const offsetDate = new Date(newDate.getTime() - newDate.getTimezoneOffset() * 60000);
    setDate(offsetDate.toISOString().split('T')[0]);
  };

  const selectPreset = (preset: 'tomorrow' | 'nextWeek' | 'nextWeekend') => {
    const today = new Date();
    let targetDate = new Date();

    switch (preset) {
      case 'tomorrow':
        targetDate.setDate(today.getDate() + 1);
        break;
      case 'nextWeek':
        targetDate.setDate(today.getDate() + ((1 + 7 - today.getDay()) % 7 || 7));
        break;
      case 'nextWeekend':
        targetDate.setDate(today.getDate() + ((6 + 7 - today.getDay()) % 7 || 7));
        break;
    }
    const offsetDate = new Date(targetDate.getTime() - targetDate.getTimezoneOffset() * 60000);
    setDate(offsetDate.toISOString().split('T')[0]);
  };

  const renderCalendarGrid = () => {
    const year = pickerViewDate.getFullYear();
    const month = pickerViewDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;

    const grid = [];
    for (let i = 0; i < startOffset; i++) {
      grid.push(<div key={`empty-${i}`} className="w-8 h-8"></div>);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      const dStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
      const isSelected = date === dStr;
      const isToday = new Date().toDateString() === new Date(year, month, i).toDateString();

      grid.push(
        <button
          key={i}
          type="button"
          onClick={(e) => { e.stopPropagation(); handleDateClick(i); }}
          className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium transition-colors relative
                      ${isSelected ? 'bg-blue-600 text-white shadow-md' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'}
                  `}
        >
          {i}
          {isToday && !isSelected && (
            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full"></span>
          )}
        </button>
      );
    }
    return grid;
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" role="dialog" aria-modal>
      <div className="w-full max-w-md bg-white dark:bg-surface-dark rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <form onSubmit={handleSubmit} className="p-6 space-y-6 text-left">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">Task</p>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{initialTask ? 'Edit Task' : 'New Task'}</h2>
            </div>
            <button type="button" onClick={onClose} className="size-10 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 flex items-center justify-center text-slate-500">
              <span className="material-symbols-outlined text-[22px]">close</span>
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-white/5 p-1 rounded-xl">
              {['task', 'event'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTypeChange(t as 'task' | 'event')}
                  className={`py-2 rounded-lg text-sm font-semibold capitalize transition-colors ${type === t
                      ? 'bg-white dark:bg-slate-800 shadow-sm text-primary'
                      : 'text-slate-600 dark:text-slate-300'
                    }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Title</span>
              <input
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="What needs to be done?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                autoFocus
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Description</span>
              <textarea
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent min-h-[84px] resize-y"
                placeholder="Add details..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2" ref={datePickerRef}>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">When</span>
                <button
                  type="button"
                  onClick={() => setIsDatePickerOpen((v) => !v)}
                  className="w-full flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">event</span>
                    {formatDateDisplay(date)}
                  </span>
                  <span className="material-symbols-outlined text-[18px]">expand_more</span>
                </button>

                {isDatePickerOpen && (
                  <div className="absolute mt-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg space-y-3 z-50">
                    <div className="flex items-center justify-between">
                      <button type="button" onClick={handlePrevMonth} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10">
                        <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                      </button>
                      <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {pickerViewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                      </div>
                      <button type="button" onClick={handleNextMonth} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10">
                        <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                      {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d) => (
                        <div key={d} className="text-center py-1">{d}</div>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-sm">
                      {renderCalendarGrid()}
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                      <button
                        type="button"
                        onClick={() => selectPreset('tomorrow')}
                        className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-white/10"
                      >
                        Tomorrow
                      </button>
                      <button
                        type="button"
                        onClick={() => selectPreset('nextWeek')}
                        className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-white/10"
                      >
                        Week
                      </button>
                      <button
                        type="button"
                        onClick={() => selectPreset('nextWeekend')}
                        className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-white/10"
                      >
                        Weekend
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Time</span>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            {type === 'task' && (
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Urgency</span>
                <div className="relative" ref={urgencyMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsUrgencyMenuOpen((v) => !v)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-bold border uppercase tracking-wide flex items-center justify-between shadow-sm transition-all ${getUrgencyStyles(urgency)}`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className={`material-symbols-outlined text-[16px] ${urgency !== 'Normal' ? 'filled' : ''}`}>flag</span>
                      <span className="font-black tracking-wider">{urgency}</span>
                    </span>
                    <span className="material-symbols-outlined text-[16px] opacity-70">expand_more</span>
                  </button>

                  {isUrgencyMenuOpen && (
                    <div className="absolute top-full left-0 mt-2 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-1.5 z-50">
                      {urgencies.map((u) => {
                        const isSelected = urgency === u;
                        return (
                          <button
                            key={u}
                            type="button"
                            onClick={() => {
                              setUrgency(u);
                              setIsUrgencyMenuOpen(false);
                            }}
                            className={`w-full px-2 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide border flex items-center justify-between transition-colors mb-1 last:mb-0 ${getUrgencyStyles(u)} ${isSelected ? 'ring-1 ring-slate-400/40 dark:ring-slate-500/40' : 'hover:brightness-95'}`}
                          >
                            <span>{u}</span>
                            {isSelected && <span className="material-symbols-outlined text-[14px]">check</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </label>
            )}

            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Color</span>
              <div className="flex gap-2">
                {colors.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColor(c.id)}
                    className={`size-9 rounded-full border-2 transition-all ${color === c.id ? `${c.ring} border-2 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900` : 'border-transparent hover:border-slate-200'}`}
                  >
                    <span className={`block size-full rounded-full ${c.class}`}></span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            {initialTask && onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-2 text-sm font-semibold text-red-500 hover:text-red-600"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
                Delete
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white shadow-sm hover:bg-primary-dark"
              >
                {initialTask ? 'Save' : 'Add Task'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default NewTaskModal;
