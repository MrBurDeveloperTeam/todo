import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { Task } from '../hooks/types';

type QuickKind = 'task' | 'event' | 'reminder';
type CalendarView = 'week' | 'month' | 'year' | 'list';
type CountryCode = 'US' | 'UK' | 'MY';

interface TasksPageProps {
  toggleTheme: () => void;
  isDarkMode: boolean;
  tasks: Task[];
  onToggleTaskStatus: (taskId: string) => void;
  onAddTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  userId: string;
  upcomingCount: number;
  countryCode: CountryCode;
}

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const todayKey = formatDateKey(new Date());

const quickDefaults = {
  title: '',
  description: '',
  date: todayKey,
  time: '09:00',
  kind: 'task' as QuickKind,
};

type TaskCardProps = {
  task: Task;
  statusLabel: (t: Task) => string;
  isHoliday: (t: Task) => boolean;
  onToggle?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  actionMenuId: string | null;
  setActionMenuId: (id: string | null) => void;
  compact?: boolean;
  hideActions?: boolean;
};

type DraftRowProps = {
  idx: number;
  text: string;
  date: string;
  selected: boolean;
  onToggle: (idx: number, checked: boolean) => void;
  onTextChange: (idx: number, value: string) => void;
  onDateChange: (idx: number, value: string) => void;
  selectedDate: string;
};

const DraftSuggestionRow = React.memo(
  function DraftSuggestionRow({
    idx,
    text,
    date,
    selected,
    onToggle,
    onTextChange,
    onDateChange,
    selectedDate,
  }: DraftRowProps) {
    return (
      <div
        className={`flex items-start gap-3 p-3 rounded-xl border ${
          selected ? 'border-blue-400 bg-blue-50 dark:bg-blue-500/10' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
        } transition`}
      >
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onToggle(idx, e.target.checked)}
          className="mt-1"
        />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <span>Suggestion #{idx + 1}</span>
            <input
              type="date"
              value={date || selectedDate}
              onChange={(e) => onDateChange(idx, e.target.value)}
              className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-200"
            />
          </div>
          <input
            value={text}
            onChange={(e) => onTextChange(idx, e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-slate-800 dark:text-slate-50"
          />
        </div>
      </div>
    );
  },
  (prev, next) =>
    prev.text === next.text &&
    prev.date === next.date &&
    prev.selected === next.selected &&
    prev.selectedDate === next.selectedDate
);

const TaskCardMemo = React.memo(function TaskCard({
  task,
  statusLabel,
  isHoliday,
  onToggle,
  onEdit,
  onDelete,
  actionMenuId,
  setActionMenuId,
  compact = false,
  hideActions = false,
}: TaskCardProps) {
  const showActions = !hideActions && !isHoliday(task);
  return (
    <div
      className={`p-3 rounded-xl border ${
        compact ? 'bg-slate-50/60 dark:bg-white/5' : 'bg-white dark:bg-slate-900'
      } border-slate-200 dark:border-slate-800 flex items-start gap-3 ${
        task.status === 'completed' ? 'opacity-60 saturate-75' : ''
      }`}
    >
      <div
        className={`size-2 mt-2 rounded-full ${
          isHoliday(task)
            ? 'bg-rose-500'
            : task.type === 'event'
              ? 'bg-emerald-500'
              : task.time
                ? 'bg-blue-500'
                : 'bg-amber-500'
        }`}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`text-[11px] px-2 py-[2px] rounded-full font-bold text-white ${
              isHoliday(task)
                ? 'bg-rose-500'
                : task.type === 'event'
                  ? 'bg-emerald-500'
                  : task.time
                    ? 'bg-blue-500'
                    : 'bg-amber-500'
            }`}
          >
            {statusLabel(task)}
          </span>
          {task.time && (
            <span className="text-xs font-semibold text-slate-500">
              {task.time}
            </span>
          )}
        </div>
        <div
          onDoubleClick={() => onEdit?.()}
          className={`text-sm font-bold text-slate-900 dark:text-white leading-tight mt-1 ${
            onEdit ? 'cursor-pointer' : ''
          }`}
          title={onEdit ? 'Double-click to edit' : undefined}
        >
          {task.title}
        </div>
        {task.description && (
          <div className="text-xs text-slate-500 line-clamp-2">{task.description}</div>
        )}
        {task.status === 'completed' && !compact && (
          <span className="text-emerald-600 font-semibold">Done</span>
        )}
      </div>
      {showActions && onToggle && (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className={`mt-1 size-5 rounded-full border flex items-center justify-center ${
              task.status === 'completed'
                ? 'bg-emerald-500 border-emerald-500 text-white'
                : 'border-slate-300 dark:border-slate-700 text-slate-400'
            }`}
            aria-label="Toggle done"
          >
            {task.status === 'completed' && (
              <span className="material-symbols-outlined text-[14px]">check</span>
            )}
          </button>
          {!hideActions && (
            <div className="relative" data-menu-root>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActionMenuId(actionMenuId === task.id ? null : task.id);
                }}
                className="size-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center"
                aria-label="Task actions"
              >
                <span className="material-symbols-outlined text-[18px]">more_horiz</span>
              </button>
              {actionMenuId === task.id && (
                <div className="absolute right-0 mt-1 w-32 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg overflow-hidden z-30">
                  <button
                    onClick={() => {
                      onEdit?.();
                      setActionMenuId(null);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      onDelete?.();
                      setActionMenuId(null);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

function formatDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const weekdayIndex: Record<string, number> = {
  sunday: 0, sun: 0,
  monday: 1, mon: 1,
  tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3,
  thursday: 4, thu: 4, thurs: 4,
  friday: 5, fri: 5,
  saturday: 6, sat: 6,
};

function parseNaturalDate(input: string, baseDate: Date): { dates: string[] } {
  const text = input.trim().toLowerCase();
  const dates: string[] = [];

  // Weekday names -> next occurrence
  const wdMatch = text.match(/\b(sun(day)?|mon(day)?|tue(s|sday)?|wed(nesday)?|thu(rs|rsday)?|fri(day)?|sat(urday)?)\b/);
  if (wdMatch) {
    const target = weekdayIndex[wdMatch[1]];
    const d = new Date(baseDate);
    const diff = (target - d.getDay() + 7) % 7 || 7; // next occurrence, not today
    d.setDate(d.getDate() + diff);
    dates.push(formatDateKey(d));
  }

  // Day Month patterns (e.g., 21 feb, feb 21)
  const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec'];
  const monthIndex = (m: string) => {
    const idx = monthNames.findIndex((x) => x === m.slice(0, 3));
    return idx;
  };

  const dm = text.match(/(\d{1,2})\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*/);
  const md = text.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s*(\d{1,2})/);
  const addDate = (day: number, monIdx: number) => {
    if (monIdx < 0) return;
    const candidate = new Date(baseDate.getFullYear(), monIdx, day);
    if (candidate < baseDate) {
      candidate.setFullYear(candidate.getFullYear() + 1);
    }
    dates.push(formatDateKey(candidate));
  };
  if (dm) {
    addDate(parseInt(dm[1], 10), monthIndex(dm[2]));
  }
  if (md) {
    addDate(parseInt(md[2], 10), monthIndex(md[1]));
  }

  return { dates: Array.from(new Set(dates)) };
}

function buildMonthGrid(cursor: Date) {
  const firstOfMonth = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const startWeekday = firstOfMonth.getDay(); // Sunday = 0
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();

  const cells: Array<Date | null> = [];
  for (let i = 0; i < startWeekday; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) {
    cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function buildWeekDates(anchor: string) {
  const date = new Date(anchor + 'T00:00:00');
  const start = new Date(date);
  start.setDate(date.getDate() - start.getDay()); // Sunday as start
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function friendlyDateLabel(dateStr: string) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function TasksPage({
  tasks,
  onToggleTaskStatus,
  onAddTask,
  onEditTask,
  onDeleteTask,
  userId: _userId,
  upcomingCount,
  countryCode,
}: TasksPageProps) {
  const [monthCursor, setMonthCursor] = useState<Date>(new Date());
  const [visibleMonth, setVisibleMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(todayKey);
  const [quickAdd, setQuickAdd] = useState(quickDefaults);
  const [isQuickOpen, setIsQuickOpen] = useState(false);
  const [view, setView] = useState<CalendarView>('month');
  const [paragraphText, setParagraphText] = useState('');
  const quickRef = useRef<HTMLDivElement | null>(null);
  const calendarScrollRef = useRef<HTMLDivElement | null>(null);
  const currentMonthRef = useRef<HTMLDivElement | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [quickTab, setQuickTab] = useState<'form' | 'paragraph'>('form');
  const [isTypeMenuOpen, setIsTypeMenuOpen] = useState(false);
  const typeMenuRef = useRef<HTMLDivElement | null>(null);
  const [draftTasks, setDraftTasks] = useState<string[]>([]);
  const [draftDates, setDraftDates] = useState<Record<number, string>>({});
  const [draftSelection, setDraftSelection] = useState<Record<number, boolean>>({});
  const handleDraftToggle = useCallback((idx: number, checked: boolean) => {
    setDraftSelection((prev) => ({ ...prev, [idx]: checked }));
  }, []);
  const handleDraftText = useCallback((idx: number, value: string) => {
    setDraftTasks((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  }, []);
  const handleDraftDate = useCallback((idx: number, value: string) => {
    setDraftDates((prev) => ({ ...prev, [idx]: value }));
  }, []);
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const [secondaryDateSuggestion, setSecondaryDateSuggestion] = useState<string | null>(null);
  const [dateHelperText, setDateHelperText] = useState<string>('');
  const [isParsingParagraph, setIsParsingParagraph] = useState(false);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  const today = useMemo(() => new Date(), []);
  const earliestMonth = useMemo(() => new Date(today.getFullYear() - 5, 0, 1), [today]);
  const latestMonth = useMemo(() => new Date(today.getFullYear() + 5, 11, 1), [today]);

  const setMonthCursorClamped = useCallback((date: Date) => {
    const normalized = new Date(date.getFullYear(), date.getMonth(), 1);
    if (normalized < earliestMonth) {
      setMonthCursor(earliestMonth);
      setVisibleMonth(earliestMonth);
      return;
    }
    if (normalized > latestMonth) {
      setMonthCursor(latestMonth);
      setVisibleMonth(latestMonth);
      return;
    }
    setMonthCursor(normalized);
    setVisibleMonth(normalized);
  }, [earliestMonth, latestMonth]);

  const monthLabel = visibleMonth.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const monthsList = useMemo(() => {
    // Render the full year for the current cursor year (Jan–Dec).
    const year = monthCursor.getFullYear();
    return Array.from({ length: 12 }, (_, i) => new Date(year, i, 1)).filter(
      (d) =>
        d >= new Date(earliestMonth.getFullYear(), earliestMonth.getMonth(), 1) &&
        d <= new Date(latestMonth.getFullYear(), latestMonth.getMonth(), 1)
    );
  }, [monthCursor, earliestMonth, latestMonth]);
  const weekDates = useMemo(() => buildWeekDates(selectedDate), [selectedDate]);

  const displayTasks = useMemo(() => tasks, [tasks]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    displayTasks.forEach((task) => {
      const key = task.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    });
    map.forEach((list) =>
      list.sort((a, b) => (a.time || '23:59') > (b.time || '23:59') ? 1 : -1)
    );
    return map;
  }, [displayTasks]);

  const selectedDayItems = tasksByDate.get(selectedDate) || [];

  const upcoming = useMemo(() => {
    const now = new Date();
    const nowKey = formatDateKey(now);
    const oneWeekOut = formatDateKey(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000));
    return displayTasks
      .filter((t) => t.status !== 'completed' && t.date >= nowKey && t.date <= oneWeekOut)
      .sort((a, b) => {
        if (a.date === b.date) return (a.time || '23:59').localeCompare(b.time || '23:59');
        return a.date.localeCompare(b.date);
      });
  }, [displayTasks]);

  const isHoliday = useCallback((_: Task) => false, []);

  const handleQuickAdd = () => {
    if (!quickAdd.title.trim()) return;
    const date = quickAdd.date || selectedDate;
    const type: Task['type'] = quickAdd.kind === 'event' ? 'event' : 'task';
    const color =
      quickAdd.kind === 'event' ? 'green' : quickAdd.kind === 'reminder' ? 'amber' : 'blue';

    const payload: Task = {
      id: editingTaskId ?? uuidv4(),
      title: quickAdd.title.trim(),
      description: quickAdd.description?.trim() || '',
      category: quickAdd.kind === 'event' ? 'Meeting' : 'Personal',
      type,
      urgency: 'Normal',
      duration: '30m',
      date,
      time: quickAdd.time || undefined,
      status: editingTaskId
        ? displayTasks.find((t) => t.id === editingTaskId)?.status ?? 'todo'
        : 'todo',
      color,
    };

    if (editingTaskId) {
      onEditTask(payload);
    } else {
      onAddTask(payload);
    }

    setQuickAdd({ ...quickDefaults, date });
    setEditingTaskId(null);
    setQuickTab('form');
  };

  const startEditTask = (task: Task) => {
    if (isHoliday(task)) return;
    setEditingTaskId(task.id);
    setQuickAdd({
      title: task.title,
      description: task.description || '',
      date: task.date,
      time: task.time || '',
      kind: task.type === 'event' ? 'event' : task.time ? 'task' : 'reminder',
    });
    setIsQuickOpen(true);
    setQuickTab('form');
    setSecondaryDateSuggestion(null);
    setDateHelperText('');
  };

  useEffect(() => {
    if (isQuickOpen && quickRef.current) {
      quickRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isQuickOpen]);

  const scrollToCurrentMonth = (behavior: ScrollBehavior = 'smooth') => {
    if (!currentMonthRef.current) return;
    // Use scrollIntoView on the month block to avoid accidentally aligning to a specific day
    requestAnimationFrame(() => {
      currentMonthRef.current?.scrollIntoView({ behavior, block: 'start' });
    });
  };

  useEffect(() => {
    if (view !== 'month') return;
    scrollToCurrentMonth();
  }, [monthCursor, view]);

  // Track which month is currently at/after the top of the scroll container
  useEffect(() => {
    const container = calendarScrollRef.current;
    if (!container) return;
    let ticking = false;

    const updateVisibleMonth = () => {
      ticking = false;
      const nodes = Array.from(container.querySelectorAll<HTMLElement>('[data-month-key]'));
      if (nodes.length === 0) return;
      const scrollTop = container.scrollTop;
      let candidate: HTMLElement | null = null;
      let minPositive = Infinity;
      nodes.forEach((node) => {
        const delta = node.offsetTop - scrollTop;
        if (delta >= 0 && delta < minPositive) {
          minPositive = delta;
          candidate = node;
        }
      });
      if (!candidate) {
        // fallback to last node (near bottom)
        candidate = nodes[nodes.length - 1];
      }
      const key = candidate?.dataset.monthKey;
      if (!key) return;
      const [yearStr, monthStr] = key.split('-');
      const nextVisible = new Date(Number(yearStr), Number(monthStr), 1);
      setVisibleMonth((prev) =>
        prev.getFullYear() === nextVisible.getFullYear() && prev.getMonth() === nextVisible.getMonth()
          ? prev
          : nextVisible
      );
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(updateVisibleMonth);
      }
    };

    container.addEventListener('scroll', onScroll);
    // initialize once
    updateVisibleMonth();
    return () => container.removeEventListener('scroll', onScroll);
  }, [monthCursor, view]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (typeMenuRef.current && !typeMenuRef.current.contains(e.target as Node)) {
        setIsTypeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const closeMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-menu-root]')) {
        setActionMenuId(null);
      }
    };
    document.addEventListener('mousedown', closeMenu);
    return () => document.removeEventListener('mousedown', closeMenu);
  }, []);

  const statusLabel = (task: Task) => {
    if (isHoliday(task)) return 'Holiday';
    if (task.type === 'event') return 'Event';
    if (!task.time) return 'Reminder';
    return 'Task';
  };

  const generateTasksFromParagraph = async () => {
    if (!paragraphText.trim()) return;
    setIsParsingParagraph(true);
    const fallbackLocalSplit = () => {
      const rawChunks = paragraphText
        .split(/[\.\!\?\n;]/)
        .map((c) => c.trim())
        .filter(Boolean);

      const expanded: string[] = [];
      rawChunks.forEach((chunk) => {
        if (chunk.split(' ').length <= 6) {
          expanded.push(chunk);
          return;
        }
        const parts = chunk.split(/,/).map((p) => p.trim()).filter(Boolean);
        if (parts.length > 1) {
          expanded.push(...parts);
        } else {
          expanded.push(chunk);
        }
      });

      const uniqueChunks = Array.from(new Set(expanded))
        .map((c) => c.replace(/^\-+\s*/, '').trim())
        .filter((c) => c.split(' ').length >= 2)
        .slice(0, 12);

      const selection: Record<number, boolean> = {};
      const dates: Record<number, string> = {};
      uniqueChunks.forEach((_, i) => {
        selection[i] = true;
        dates[i] = selectedDate;
      });

      setDraftTasks(uniqueChunks);
      setDraftSelection(selection);
      setDraftDates(dates);
    };

    try {
      const geminiKey = (import.meta as any).env?.VITE_GEMINI_KEY as string | undefined;
      // Skip remote call when running locally to avoid noisy 404s during dev; rely on fallback instead.
      if (geminiKey && !(import.meta as any).env?.DEV) {
        const prompt = `Split the following paragraph into concise to-do items (max 12). Return one task per line without bullets or numbering. Keep each line under 10 words. Text:\n${paragraphText}`;
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
            }),
          }
        );
        if (!res.ok) {
          console.info('Gemini unavailable, falling back to local splitter. Status:', res.status);
          fallbackLocalSplit();
          return;
        }
        const data = await res.json();
        const text: string =
          data?.candidates?.[0]?.content?.parts?.[0]?.text ??
          data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).join('\n') ??
          '';
        const lines = text
          .split(/\r?\n/)
          .map((line: string) => line.replace(/^[\-\*\d\.\)\s]+/, '').trim())
          .filter(Boolean)
          .slice(0, 12);

        if (lines.length > 0) {
          const selection: Record<number, boolean> = {};
          const dates: Record<number, string> = {};
          lines.forEach((_, i) => {
            selection[i] = true;
            dates[i] = selectedDate;
          });
          setDraftTasks(lines);
          setDraftSelection(selection);
          setDraftDates(dates);
          return;
        }
      } else {
        fallbackLocalSplit();
        return;
      }
      // Fallback if no key or empty response
      fallbackLocalSplit();
    } catch (err) {
      console.error('Gemini split failed, using fallback', err);
      fallbackLocalSplit();
    } finally {
      setIsParsingParagraph(false);
    }
  };

  const commitDraftTasks = () => {
    const picked = draftTasks
      .map((phrase, i) => ({ phrase, idx: i }))
      .filter(({ idx }) => draftSelection[idx]);
    picked.forEach(({ phrase, idx }) => {
      const payload: Task = {
        id: uuidv4(),
        title: phrase.slice(0, 80),
        description: '',
        category: 'Deep Work',
        type: 'task',
        urgency: 'Normal',
        duration: '30m',
        date: draftDates[idx] || selectedDate,
        status: 'todo',
        color: 'blue',
      };
      onAddTask(payload);
    });
    setDraftTasks([]);
    setDraftSelection({});
    setDraftDates({});
    setParagraphText('');
    setIsQuickOpen(false);
  };

  const shiftWeekMemo = useCallback(
    (delta: number) => {
      const next = new Date(selectedDate + 'T00:00:00');
      next.setDate(next.getDate() + 7 * delta);
      const key = formatDateKey(next);
      setSelectedDate(key);
      setMonthCursorClamped(next);
    },
    [selectedDate]
  );

  const goToThisWeek = useCallback(() => {
    const now = new Date();
    setSelectedDate(formatDateKey(now));
    setMonthCursorClamped(now);
  }, []);

  const formatWeekRange = (week: Date[]) => {
    const start = week[0];
    const end = week[week.length - 1];
    const startText = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const endText = end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return `${startText} - ${endText} ${end.getFullYear()}`;
  };

  return (
    <>
    <div className="w-full space-y-4">
      <div className="rounded-3xl bg-white/70 dark:bg-[#0f172a]/70 backdrop-blur-xl border border-slate-200/70 dark:border-slate-800/70 shadow-xl p-5 flex flex-col gap-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[28px] text-blue-500">event</span>
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-slate-500 font-semibold">
                Calendar
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                Upcoming ({upcomingCount})
              </div>
            </div>
          </div>
            <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 text-xs font-bold">
              {(['week', 'month', 'year'] as CalendarView[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setView(mode)}
                  className={`px-3 py-1.5 rounded-lg capitalize transition ${
                    view === mode
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setQuickAdd((prev) => ({ ...prev, date: selectedDate }));
                setEditingTaskId(null);
                setQuickTab('form');
                setIsQuickOpen((v) => !v);
              }}
              className="size-11 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 hover:bg-blue-700 transition"
              aria-label="Add item"
            >
              <span className="material-symbols-outlined text-[24px]">
                {isQuickOpen ? 'close' : 'add'}
              </span>
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-4 items-start min-h-0">
          {/* Calendar area */}
          <div
            ref={calendarScrollRef}
            className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-white/5 p-0 max-h-[70vh] overflow-y-auto no-scrollbar lg:col-span-7"
          >
            {view === 'week' && (
              <div className="px-3 pb-3 space-y-4">
                <div className="flex items-center justify-between sticky top-0 z-10 bg-slate-50/60 dark:bg-white/5 py-2 border-b border-slate-200/70 dark:border-slate-800/50">
                  <div className="flex flex-col">
                    <div className="text-lg font-black text-slate-900 dark:text-white">
                      {formatWeekRange(weekDates)}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                      {weekDates[0].toLocaleDateString(undefined, {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                      })}{' '}
                      ?{' '}
                      {weekDates[6].toLocaleDateString(undefined, {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => shiftWeekMemo(-1)}
                      className="size-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center"
                      aria-label="Previous week"
                    >
                      <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                    </button>
                    <button
                      onClick={goToThisWeek}
                      className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
                    >
                      This week
                    </button>
                    <button
                      onClick={() => shiftWeekMemo(1)}
                      className="size-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center"
                      aria-label="Next week"
                    >
                      <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {weekDates.map((date) => {
                    const key = formatDateKey(date);
                    const dayItems = tasksByDate.get(key) || [];
                    const isToday = key === todayKey;
                    const isSelected = key === selectedDate;
                    const isExpanded = expandedDays[key] ?? false;
                    const preview = dayItems.slice(0, 2);
                    return (
                      <div
                        key={key}
                        className={`rounded-2xl border p-3 bg-white/90 dark:bg-slate-900 transition cursor-pointer ${
                          isSelected
                            ? 'border-blue-500 shadow-[0_12px_30px_rgba(37,99,235,0.18)]'
                            : 'border-slate-200 dark:border-slate-800 hover:-translate-y-[1px] hover:shadow-sm'
                        }`}
                        onClick={() => {
                          setSelectedDate(key);
                          setMonthCursorClamped(date);
                          setExpandedDays((prev) => ({ ...prev, [key]: !isExpanded }));
                        }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                              {weekdayLabels[date.getDay()]}
                            </span>
                            <span className="text-lg font-black text-slate-900 dark:text-white">
                              {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            {isToday && (
                              <span className="text-[11px] px-2 py-[2px] rounded-full bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-100">
                                Today
                              </span>
                            )}
                            <span
                              className={`size-2 rounded-full ${
                                isToday
                                  ? 'bg-blue-500'
                                  : dayItems.length > 0
                                    ? 'bg-emerald-500'
                                    : 'bg-slate-300 dark:bg-slate-700'
                              }`}
                            />
                            <span className="ml-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                              {dayItems.length} item{dayItems.length === 1 ? '' : 's'}
                            </span>
                            <span className="material-symbols-outlined text-[18px] text-slate-500">
                              {isExpanded ? 'expand_less' : 'expand_more'}
                            </span>
                          </div>
                        </div>
                        {dayItems.length === 0 && (
                          <div className="text-xs text-slate-500 dark:text-slate-400">No items</div>
                        )}
                        {!isExpanded && dayItems.length > 0 && (
                          <div className="flex flex-wrap gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                            {preview.map((task) => (
                              <span
                                key={task.id}
                                className="px-2 py-1 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                              >
                                {task.time ? `${task.time} ? ` : ''}
                                {task.title}
                              </span>
                            ))}
                            {dayItems.length > preview.length && (
                              <span className="text-slate-500 dark:text-slate-400">
                                +{dayItems.length - preview.length} more (tap to expand)
                              </span>
                            )}
                          </div>
                        )}
                        {isExpanded && dayItems.length > 0 && (
                          <div className="space-y-2 mt-2">
                            {dayItems.map((task) => (
                              <div
                                key={task.id}
                                className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start gap-2"
                              >
                                <div
                                  className={`mt-1 size-2 rounded-full ${
                                    isHoliday(task)
                                      ? 'bg-rose-500'
                                      : task.type === 'event'
                                        ? 'bg-emerald-500'
                                        : task.time
                                          ? 'bg-blue-500'
                                          : 'bg-amber-500'
                                  }`}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    {task.time && (
                                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                                        {task.time}
                                      </span>
                                    )}
                                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                      {statusLabel(task)}
                                    </span>
                                  </div>
                                  <div className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                                    {task.title}
                                  </div>
                                  {task.description && (
                                    <div className="text-[11px] text-slate-500 line-clamp-2">
                                      {task.description}
                                    </div>
                                  )}
                                </div>
                                {!isHoliday(task) && (
                                  <label
                                    className="ml-2 flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 select-none"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={task.status === 'completed'}
                                      onChange={() => onToggleTaskStatus(task.id)}
                                      className="h-5 w-5 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500"
                                    />
                                    Done
                                  </label>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

                                    {view === 'month' && (
              <div className="space-y-4">
                <div className="px-3 flex items-center justify-between sticky top-0 bg-slate-50/60 dark:bg-white/5 py-2 z-10 border-b border-slate-200/70 dark:border-slate-800/50">
                  <div className="text-lg font-black text-slate-900 dark:text-white">{monthLabel}</div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const prev = new Date(monthCursor.getFullYear() - 1, monthCursor.getMonth(), 1);
                        setMonthCursorClamped(prev);
                      }}
                      className="size-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:-translate-y-[1px] transition"
                      aria-label="Previous year"
                    >
                      <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                    </button>
                    <button
                      onClick={() => {
                        const now = new Date();
                        setView('month');
                        setMonthCursorClamped(now);
                        setSelectedDate(formatDateKey(now));
                        // wait for render commit then scroll to the month block
                        setTimeout(() => scrollToCurrentMonth(), 80);
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
                    >
                      Today
                    </button>
                    <button
                      onClick={() => {
                        const next = new Date(monthCursor.getFullYear() + 1, monthCursor.getMonth(), 1);
                        setMonthCursorClamped(next);
                      }}
                      className="size-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:-translate-y-[1px] transition"
                      aria-label="Next year"
                    >
                      <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                    </button>
                  </div>
                </div>

                <div className="px-3 pb-3 space-y-6">
                  {monthsList.map((monthDate) => {
                    const calendarCells = buildMonthGrid(monthDate);
                    const label = monthDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
                    const monthKey = `${monthDate.getFullYear()}-${monthDate.getMonth()}`;
                    return (
                      <div
                        key={monthKey}
                        ref={monthKey === `${monthCursor.getFullYear()}-${monthCursor.getMonth()}` ? currentMonthRef : undefined}
                        data-month-key={monthKey}
                        className="space-y-2"
                      >
                        <div className="text-sm font-black text-slate-900 dark:text-white">{label}</div>
                        <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                          {weekdayLabels.map((label) => (
                            <div key={label} className="py-2">
                              {label}
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-7 gap-[5px]">
                          {calendarCells.map((cell, idx) => {
                            if (!cell) {
                              return <div key={idx} className="h-16 rounded-xl bg-transparent" />;
                            }
                            const key = formatDateKey(cell);
                            const isToday = key === todayKey;
                            const isSelected = key === selectedDate;
                            const dayItems = tasksByDate.get(key) || [];
                            return (
                              <button
                                key={key}
                                onClick={() => setSelectedDate(key)}
                                onDoubleClick={() => {
                                  setSelectedDate(key);
                                  setMonthCursorClamped(cell);
                                  setView('week');
                                }}
                                className={`h-16 rounded-xl border text-left p-2 transition-all relative overflow-hidden ${
                                  isSelected
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/15 shadow-[0_8px_30px_rgba(37,99,235,0.18)]'
                                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:-translate-y-[1px] hover:shadow-sm'
                                }`}
                              >
                                <div className="flex flex-col items-center gap-2">
                                  <div className="relative flex items-center justify-center">
                                    <span
                                      className={`flex items-center justify-center size-7 rounded-full text-sm font-bold ${
                                        isSelected
                                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                                          : isToday
                                            ? 'border border-blue-500 text-blue-600 dark:text-blue-200'
                                            : 'text-slate-800 dark:text-slate-100'
                                      }`}
                                    >
                                      {cell.getDate()}
                                    </span>
                                    {isToday && !isSelected && (
                                      <span className="absolute inset-0 rounded-full ring-1 ring-blue-500/60"></span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {dayItems.slice(0, 2).map((item) => (
                                      <span
                                        key={item.id}
                                        className={`size-2.5 rounded-full ${
                                          isHoliday(item)
                                            ? 'bg-rose-500'
                                            : item.type === 'event'
                                              ? 'bg-emerald-500'
                                              : item.time
                                                ? 'bg-blue-500'
                                                : 'bg-amber-500'
                                        }`}
                                        title={item.title}
                                      />
                                    ))}
                                    {dayItems.length > 2 && (
                                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                        +{dayItems.length - 2}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {view === 'year' && (
              <div className="px-3 pb-3 space-y-3">
                <div className="flex items-center justify-between sticky top-0 z-10 bg-slate-50/60 dark:bg-white/5 py-2 border-b border-slate-200/70 dark:border-slate-800/50">
                  <div className="text-lg font-black text-slate-900 dark:text-white">
                    {monthCursor.getFullYear()}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setMonthCursorClamped(
                          new Date(monthCursor.getFullYear() - 1, monthCursor.getMonth(), 1)
                        )
                      }
                      className="size-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                    </button>
                    <button
                      onClick={() =>
                        setMonthCursorClamped(
                          new Date(monthCursor.getFullYear() + 1, monthCursor.getMonth(), 1)
                        )
                      }
                      className="size-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                    </button>
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-3">
                  {Array.from({ length: 12 }).map((_, idx) => {
                    const monthDate = new Date(monthCursor.getFullYear(), idx, 1);
                    const label = monthDate.toLocaleDateString(undefined, {
                      month: 'short',
                    });
                    const cells = buildMonthGrid(monthDate);
                    return (
                      <div
                        key={idx}
                        className="border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-white dark:bg-slate-900 hover:border-blue-400 transition cursor-pointer"
                        onClick={() => {
                          setMonthCursorClamped(monthDate);
                          setView('month');
                          setSelectedDate(formatDateKey(monthDate));
                        }}
                      >
                        <div className="text-sm font-black text-slate-900 dark:text-white mb-2">
                          {label}
                        </div>
                        <div className="grid grid-cols-7 gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                          {weekdayLabels.map((d) => (
                            <div key={d} className="text-center">
                              {d[0]}
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1 mt-1">
                          {cells.map((cell, i) => {
                            if (!cell) return <div key={i} className="h-5" />;
                            const key = formatDateKey(cell);
                            const hasItem = (tasksByDate.get(key) || []).length > 0;
                            return (
                              <div
                                key={key}
                                className={`h-5 text-[10px] flex items-center justify-center rounded ${hasItem ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-100' : 'text-slate-600 dark:text-slate-300'
                                  }`}
                              >
                                {cell.getDate()}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {view === 'list' && (
              <div className="px-3 pb-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-lg font-black text-slate-900 dark:text-white">All scheduled</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Chronological</div>
                </div>
              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1 custom-scrollbar">
                  {upcoming.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start gap-3"
                      onClick={() => {
                        setSelectedDate(task.date);
                        const dt = new Date(task.date + 'T00:00:00');
                        setMonthCursorClamped(dt);
                      }}
                    >
                      <div
                        className={`size-2 mt-2 rounded-full ${
                          task.type === 'event'
                            ? 'bg-emerald-500'
                            : task.time
                              ? 'bg-blue-500'
                              : 'bg-amber-500'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-500">
                            {friendlyDateLabel(task.date)}
                          </span>
                          {task.time && (
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              {task.time}
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                          {task.title}
                        </div>
                        {task.description && (
                          <div className="text-xs text-slate-500 line-clamp-2">{task.description}</div>
                        )}
                      </div>
                      {!isHoliday(task) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleTaskStatus(task.id);
                          }}
                          className="size-8 rounded-lg bg-slate-900 text-white flex items-center justify-center text-[18px] hover:bg-slate-800 transition"
                          title="Mark done"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {task.status === 'completed' ? 'undo' : 'check'}
                          </span>
                        </button>
                      )}
                    </div>
                  ))}
                  {upcoming.length === 0 && (
                    <div className="text-sm text-slate-500">No items scheduled.</div>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-wrap justify-center gap-2 text-xs mt-2">
              <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-100">
                Task
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-100">
                Event
              </span>
              <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-100">
                Reminder
              </span>
            </div>
          </div>

          {/* Sidebar: summary + next up */}
          <div className="w-full space-y-3 min-h-0 lg:col-span-5">
            <div className="h-64 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-black text-slate-900 dark:text-white">
                    {friendlyDateLabel(selectedDate)}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {selectedDayItems.length} item{selectedDayItems.length === 1 ? '' : 's'}
                  </div>
                </div>
                <a
                  className="text-[11px] font-semibold text-blue-600 hover:underline"
                  href={`/day/${selectedDate}`}
                >
                  View more
                </a>
              </div>
              {selectedDayItems.length === 0 ? (
                <div className="text-sm text-slate-500 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex-1">
                  Nothing planned. Add something!
                </div>
              ) : (
                <div className="space-y-2 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                  {selectedDayItems.map((task) => (
                    <TaskCardMemo
                      key={task.id}
                      task={task}
                      statusLabel={statusLabel}
                      isHoliday={isHoliday}
                      onToggle={() => onToggleTaskStatus(task.id)}
                      onEdit={() => startEditTask(task)}
                      onDelete={() => onDeleteTask(task.id)}
                      actionMenuId={actionMenuId}
                      setActionMenuId={setActionMenuId}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="h-64 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-black text-slate-900 dark:text-white">Next up</div>
                <div className="text-[11px] text-slate-500">Sorted by date & time</div>
              </div>
              {upcoming.length === 0 ? (
                <div className="text-sm text-slate-500 flex-1">No upcoming items.</div>
              ) : (
                <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                  {Object.entries(
                    upcoming.reduce((acc: Record<string, typeof upcoming>, task) => {
                      acc[task.date] = acc[task.date] || [];
                      acc[task.date].push(task);
                      return acc;
                    }, {})
                  ).map(([date, list]) => (
                    <div key={date} className="space-y-2">
                      <div className="text-xs font-bold text-slate-500 dark:text-slate-300">
                        {friendlyDateLabel(date)}
                      </div>
                      <div className="space-y-2">
                        {list.map((task) => (
                          <TaskCardMemo
                            key={task.id}
                            task={task}
                            statusLabel={statusLabel}
                            isHoliday={isHoliday}
                            onToggle={() => onToggleTaskStatus(task.id)}
                            onEdit={() => startEditTask(task)}
                            onDelete={() => onDeleteTask(task.id)}
                            actionMenuId={actionMenuId}
                            setActionMenuId={setActionMenuId}
                            compact
                            hideActions
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

        {isQuickOpen && (
          <div className="fixed inset-0 z-40 flex items-center justify-center px-4">
            <div
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => {
                setIsQuickOpen(false);
                setEditingTaskId(null);
              }}
            />
            <div
              ref={quickRef}
              className="relative w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-90"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.3em] text-slate-500 font-semibold">
                    {editingTaskId ? 'Edit item' : 'Quick add'}
                  </div>
                  <div className="text-xl font-black text-slate-900 dark:text-white">
                    {editingTaskId ? 'Update this item' : 'Add to calendar'}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsQuickOpen(false);
                    setEditingTaskId(null);
                    setQuickTab('form');
                  }}
                  className="size-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                  aria-label="Close quick add"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="flex items-center gap-2 text-[11px] flex-wrap">
                <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                  {(['form', 'paragraph'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setQuickTab(tab)}
                      className={`px-3 py-1.5 rounded-lg font-bold capitalize transition ${
                        quickTab === tab
                          ? 'bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-white'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {tab === 'form' ? 'Add' : 'Paragraph'}
                    </button>
                  ))}
                </div>
                {quickTab === 'form' && (
                  <div className="flex items-center gap-2 text-xs" ref={typeMenuRef}>
                    <label className="text-slate-500 dark:text-slate-300 font-semibold">Type:</label>
                    <div className="relative w-40">
                      <button
                        onClick={() => setIsTypeMenuOpen((v) => !v)}
                        className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/40"
                      >
                        <span className="flex items-center gap-2 font-semibold">
                          <span className="material-symbols-outlined text-[16px]">
                            {quickAdd.kind === 'event'
                              ? 'event'
                              : quickAdd.kind === 'reminder'
                                ? 'notifications'
                                : 'check_circle'}
                          </span>
                          {quickAdd.kind === 'task'
                            ? 'Task'
                            : quickAdd.kind === 'event'
                              ? 'Event'
                              : 'Reminder'}
                        </span>
                      <span className="material-symbols-outlined text-[16px] text-slate-400">expand_more</span>
                      </button>
                      {isTypeMenuOpen && (
                        <div className="absolute left-0 right-0 top-full mt-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg overflow-hidden z-50">
                          {(['task', 'event', 'reminder'] as QuickKind[]).map((kind) => (
                            <button
                              key={kind}
                              onClick={() => {
                                setQuickAdd((prev) => ({ ...prev, kind }));
                                setIsTypeMenuOpen(false);
                              }}
                              className={`w-full px-4 py-2 flex items-center gap-3 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 ${
                                quickAdd.kind === kind
                                  ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-100 font-semibold'
                                  : 'text-slate-700 dark:text-slate-100'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                {kind === 'event' ? 'event' : kind === 'reminder' ? 'notifications' : 'check_circle'}
                              </span>
                              <span className="capitalize">{kind}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {quickTab === 'form' && (
                <>
                  <input
                    value={quickAdd.title}
                    onChange={(e) => setQuickAdd({ ...quickAdd, title: e.target.value })}
                    placeholder="Title"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                  <textarea
                    value={quickAdd.description}
                    onChange={(e) => setQuickAdd({ ...quickAdd, description: e.target.value })}
                    placeholder="Description (optional)"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm h-20"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1 text-sm">
                      <label className="text-[11px] font-semibold text-slate-500">Date</label>
                      <input
                        type="date"
                        value={quickAdd.date}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
                            setQuickAdd({ ...quickAdd, date: val });
                            setDateHelperText('');
                            setSecondaryDateSuggestion(null);
                            return;
                          }
                          const { dates } = parseNaturalDate(val, new Date());
                          if (dates.length > 0) {
                            setQuickAdd({ ...quickAdd, date: dates[0] });
                            setDateHelperText(`Parsed "${val}" -> ${dates[0]}`);
                            setSecondaryDateSuggestion(dates[1] ?? null);
                          } else {
                            setQuickAdd({ ...quickAdd, date: val });
                            setDateHelperText('Could not parse, please use YYYY-MM-DD');
                            setSecondaryDateSuggestion(null);
                          }
                        }}
                        className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                      {dateHelperText && (
                        <div className="text-[11px] text-slate-500 mt-1">{dateHelperText}</div>
                      )}
                      {secondaryDateSuggestion && (
                        <div className="mt-2 text-[11px] text-slate-500 space-y-1">
                          <div>Also detected: {secondaryDateSuggestion}</div>
                          <button
                            type="button"
                            className="px-2 py-1 rounded-lg bg-blue-600 text-white text-[11px] font-bold hover:bg-blue-700 transition"
                            onClick={() => {
                              // Create an extra task clone with second date
                              const payload: Task = {
                                id: uuidv4(),
                                title: quickAdd.title || 'New task',
                                description: quickAdd.description || '',
                                category: 'Personal',
                                type: quickAdd.kind === 'event' ? 'event' : 'task',
                                urgency: 'Normal',
                                duration: '30m',
                                date: secondaryDateSuggestion,
                                time: quickAdd.time || undefined,
                                status: 'todo',
                                color:
                                  quickAdd.kind === 'event'
                                    ? 'green'
                                    : quickAdd.kind === 'reminder'
                                      ? 'amber'
                                      : 'blue',
                              };
                              onAddTask(payload);
                              setSecondaryDateSuggestion(null);
                            }}
                          >
                            Add second task on {secondaryDateSuggestion}
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 text-sm">
                      <label className="text-[11px] font-semibold text-slate-500">Time</label>
                      <input
                        type="time"
                        value={quickAdd.time}
                        onChange={(e) => setQuickAdd({ ...quickAdd, time: e.target.value })}
                        className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleQuickAdd}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    {editingTaskId ? 'Save changes' : 'Add to calendar'}
                  </button>
                </>
              )}

              {quickTab === 'paragraph' && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-black text-slate-900 dark:text-white">
                      Turn a paragraph into tasks
                    </div>
                    <span className="text-[11px] text-slate-500">Creates tasks for {selectedDate}</span>
                  </div>
                  <textarea
                    value={paragraphText}
                    onChange={(e) => setParagraphText(e.target.value)}
                    placeholder="Paste a paragraph or bullet list. Each sentence or comma-separated phrase becomes a task."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm h-28"
                  />
                  <button
                    onClick={generateTasksFromParagraph}
                    disabled={isParsingParagraph}
                    className={`w-full py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition ${
                      isParsingParagraph
                        ? 'bg-slate-500 cursor-not-allowed'
                        : 'bg-slate-900 hover:bg-slate-800'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">format_list_bulleted</span>
                    {isParsingParagraph ? 'Splitting...' : 'Split paragraph into tasks'}
                  </button>
                  {draftTasks.length > 0 && (
                    <div className="space-y-3 mt-3">
                      <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto pr-1">
                  {draftTasks.map((t, idx) => (
                    <DraftSuggestionRow
                      key={idx}
                      idx={idx}
                      text={t}
                      date={draftDates[idx] || selectedDate}
                      selected={!!draftSelection[idx]}
                      selectedDate={selectedDate}
                      onToggle={handleDraftToggle}
                      onTextChange={handleDraftText}
                      onDateChange={handleDraftDate}
                    />
                  ))}
                      </div>
                      <button
                        onClick={commitDraftTasks}
                        className="w-full py-2.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition"
                      >
                        Add selected to calendar
                      </button>
                    </div>
                  )}
                  <div className="text-[11px] text-slate-500">
                    We split sentences/phrases, cap at 12 tasks, and default them to "todo" on the selected date.
                  </div>
                </>
              )}
            </div>
          </div>
        )}

      </div>
    </>
  );
}

export default TasksPage;

/* hide scrollbars while preserving scrollability */
const style = document.createElement('style');
style.innerHTML = `
.no-scrollbar {
  scrollbar-width: none;
}
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
`;
document.head.appendChild(style);






















