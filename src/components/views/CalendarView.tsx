import React, { useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { TaskItem } from '../../types';
import { toLocalDateStr, todayStr, formatTime } from '../../utils';

interface CalendarViewProps {
  tasks: TaskItem[];
  calDate: Date;
  setCalDate: React.Dispatch<React.SetStateAction<Date>>;
  calView: string;
  setCalView: React.Dispatch<React.SetStateAction<string>>;
  onOpenTask: (task: TaskItem) => void;
  onMoveTask: (taskId: string, updates: Partial<TaskItem>) => Promise<void>;
  openAddModal: (type?: any, defaults?: Partial<TaskItem>) => void;
  theme: string;
}

export function CalendarView({
  tasks,
  calDate,
  setCalDate,
  calView,
  setCalView,
  onOpenTask,
  onMoveTask,
  openAddModal,
  theme,
}: CalendarViewProps) {
  const visibleTasks = tasks.filter((task) => !task.done);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);
  const [hoveredWeekDate, setHoveredWeekDate] = useState<string | null>(null);
  const [expandedWeekDate, setExpandedWeekDate] = useState<string | null>(null);
  const [openOverflowId, setOpenOverflowId] = useState<string | null>(null);
  const y = calDate.getFullYear();
  const m = calDate.getMonth();
  const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(calDate);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => window.clearInterval(intervalId);
  }, []);

  const getTypeBadgeClass = (type: TaskItem['type']) => {
    if (type === 'task') {
      return 'bg-transparent text-[#2563eb] border-[#bfdbfe]';
    }
    if (type === 'event') {
      return 'bg-transparent text-[#b42318] border-[#fca5a5]';
    }
    return theme === 'dark'
      ? 'bg-transparent text-amber-400 border-amber-500/30'
      : 'bg-transparent text-[#78350f] border-[#f59e0b]';
  };

  const getTypeAccentBarClass = (type: TaskItem['type']) => {
    if (type === 'task') return 'bg-[#1d4ed8]';
    if (type === 'event') return 'bg-[#b42318]';
    return 'bg-[#a16207]';
  };

  const getEventRange = (item: TaskItem) => {
    const start = item.date;
    const end = item.type === 'event' && item.enddate ? item.enddate : item.date;
    return start <= end ? { start, end } : { start: end, end: start };
  };

  const occursOnDate = (item: TaskItem, dateS: string) => {
    const { start, end } = getEventRange(item);
    return dateS >= start && dateS <= end;
  };

  const isMultiDayEvent = (item: TaskItem) => item.type === 'event' && !!item.enddate && item.enddate !== item.date;
  const getHourSlotTime = (hour: number) => `${String(hour).padStart(2, '0')}:00`;
  const finishDropToTime = async (droppedTaskId: string | null, date: string, time: string) => {
    setHoveredHour(null);
    setHoveredWeekDate(null);
    setDragTaskId(null);
    if (!droppedTaskId) return;
    await onMoveTask(droppedTaskId, { date, time });
  };

  const renderMonth = () => {
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const prevMonthLastDay = new Date(y, m, 0).getDate();

    const cells = [];
    for (let i = firstDay - 1; i >= 0; i--) {
      cells.push({ day: prevMonthLastDay - i, current: false, date: new Date(y, m - 1, prevMonthLastDay - i) });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ day: d, current: true, date: new Date(y, m, d) });
    }
    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i++) {
      cells.push({ day: i, current: false, date: new Date(y, m + 1, i) });
    }

    const weeks = Array.from({ length: 6 }, (_, weekIndex) => cells.slice(weekIndex * 7, (weekIndex + 1) * 7));

    return (
      <div className="border border-[var(--border)] rounded-lg overflow-x-auto bg-[var(--border)]">
        <div className="min-w-[700px]">
        <div className="grid grid-cols-7 gap-px">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="bg-[var(--surface2)] text-center py-2 text-[10px] font-black text-[var(--text4)] uppercase tracking-widest">{d}</div>
          ))}
        </div>

        <div className="space-y-px bg-[var(--border)]">
          {weeks.map((week, weekIndex) => {
            const weekStart = toLocalDateStr(week[0].date);
            const weekEnd = toLocalDateStr(week[6].date);

            const spanningEvents = visibleTasks
              .filter((task) => task.type === 'event' && isMultiDayEvent(task))
              .filter((task) => {
                const { start, end } = getEventRange(task);
                return start <= weekEnd && end >= weekStart;
              })
              .map((task) => {
                const { start, end } = getEventRange(task);
                const startIndex = week.findIndex((cell) => toLocalDateStr(cell.date) >= start);
                const rawEndIndex = [...week].reverse().findIndex((cell) => toLocalDateStr(cell.date) <= end);
                const endIndex = rawEndIndex === -1 ? 6 : 6 - rawEndIndex;
                return {
                  task,
                  startIndex: startIndex === -1 ? 0 : startIndex,
                  endIndex,
                };
              })
              .sort((a, b) => a.startIndex - b.startIndex || a.task.title.localeCompare(b.task.title));

            return (
              <div key={weekIndex} className="bg-[var(--surface)]">
                {spanningEvents.length > 0 && (
                  <div className="grid grid-cols-7 gap-px bg-[var(--border)] border-b border-[var(--border)]">
                    <div className="col-span-7 bg-[var(--surface)] px-1.5 py-1.5 space-y-1">
                      {spanningEvents.slice(0, 3).map(({ task, startIndex, endIndex }) => (
                        <button
                          key={`${task.id}-${weekIndex}`}
                          className="grid w-full grid-cols-7 gap-1 text-left"
                          onClick={() => onOpenTask(task)}
                        >
                          <span
                            className={`text-[9px] px-2 py-1 rounded font-bold border truncate ${getTypeBadgeClass(task.type)}`}
                            style={{ gridColumn: `${startIndex + 1} / ${endIndex + 2}` }}
                            title={`${task.title} (${task.date}${task.enddate ? ` to ${task.enddate}` : ''})`}
                          >
                            {task.title}
                          </span>
                        </button>
                      ))}
                      {spanningEvents.length > 3 && <div className="text-[9px] text-accent font-black pl-1">+{spanningEvents.length - 3} more spanning events</div>}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-7 gap-px bg-[var(--border)]">
                  {week.map((cell, dayIndex) => {
                    const dateS = toLocalDateStr(cell.date);
                    const hasTasks = visibleTasks.filter((task) => occursOnDate(task, dateS));
                    const cellItems = hasTasks.filter((task) => !isMultiDayEvent(task)).slice(0, 2);
                    const hiddenCount = hasTasks.length - cellItems.length;
                    const isToday = dateS === todayStr();

                    return (
                      <div
                        key={`${weekIndex}-${dayIndex}`}
                        className={`bg-[var(--surface)] min-h-[108px] p-2 hover:bg-[var(--surface2)] cursor-pointer transition ${!cell.current ? 'opacity-40 bg-[var(--bg)]' : ''} ${isToday ? 'bg-[var(--accent-light)]/30' : ''}`}
                        onClick={() => {
                          if (hasTasks.length > 0) {
                            onOpenTask(hasTasks[0]);
                          } else {
                            setCalDate(cell.date);
                            setCalView('day');
                          }
                        }}
                      >
                        <div className={`text-[12px] font-black mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-accent text-white' : 'text-[var(--text2)]'}`}>{cell.day}</div>
                        <div className="space-y-1">
                          {cellItems.map((task) => (
                            <div key={task.id} className={`text-[9px] px-1.5 py-0.5 rounded truncate font-bold border ${getTypeBadgeClass(task.type)}`}>
                              {task.time && formatTime(task.time)} {task.title}
                            </div>
                          ))}
                          {hiddenCount > 0 && <div className="text-[9px] text-accent font-black pl-1">+{hiddenCount} more</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        </div>
      </div>
    );
  };

  const renderWeek = () => {
    const startOfWeek = new Date(calDate);
    startOfWeek.setDate(calDate.getDate() - calDate.getDay());
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return d;
    });

    return (
      <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--surface)] min-h-[500px]">
        <div className="divide-y divide-[var(--border)]">
          {days.map((day, di) => {
            const ds = toLocalDateStr(day);
            const isToday = ds === todayStr();
            const dayItems = visibleTasks
              .filter((task) => occursOnDate(task, ds))
              .sort((a, b) => (a.time || '23:59').localeCompare(b.time || '23:59'));
            const weekVisibleLimit = 4;
            const isWeekExpanded = expandedWeekDate === ds;
            const visibleWeekItems = isWeekExpanded ? dayItems : dayItems.slice(0, weekVisibleLimit);
            const hiddenWeekCount = Math.max(0, dayItems.length - visibleWeekItems.length);

            return (
              <div
                key={di}
                className={`grid grid-cols-1 md:grid-cols-[170px_minmax(0,1fr)] ${isToday ? 'bg-[var(--accent-light)]/20' : 'bg-[var(--surface)]'}`}
              >
                <button
                  className="border-b md:border-b-0 md:border-r border-[var(--border)] px-4 py-4 text-left hover:bg-[var(--surface2)] transition"
                  onClick={() => {
                    openAddModal('event', { date: ds, enddate: ds });
                  }}
                >
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text4)]">
                    {day.toLocaleDateString('en-US', { weekday: 'long' })}
                  </div>
                  <div className={`mt-1 text-lg font-black ${isToday ? 'text-accent' : 'text-[var(--text)]'}`}>
                    {day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <div className="mt-2 text-[11px] text-[var(--text3)]">
                    {dayItems.length} item{dayItems.length === 1 ? '' : 's'}
                  </div>
                </button>

                <div
                  className={`px-4 py-4 transition-colors ${hoveredWeekDate === ds ? 'bg-[var(--accent-light)]/10' : ''}`}
                  onClick={() => openAddModal('event', { date: ds, enddate: ds })}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragTaskId) {
                      setHoveredWeekDate(ds);
                    }
                  }}
                  onDragLeave={() => {
                    if (hoveredWeekDate === ds) {
                      setHoveredWeekDate(null);
                    }
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    const droppedTaskId = e.dataTransfer.getData('text/task-id') || dragTaskId;
                    const draggedTask = tasks.find((task) => task.id === droppedTaskId);
                    await finishDropToTime(droppedTaskId, ds, draggedTask?.time || '00:00');
                  }}
                >
                  {dayItems.length === 0 ? (
                    <button
                      className="w-full rounded-xl border border-dashed border-[var(--border)] px-4 py-5 text-left text-sm text-[var(--text3)] hover:border-accent hover:text-accent hover:bg-[var(--surface2)] transition"
                      onClick={() => {
                        openAddModal('event', { date: ds, enddate: ds });
                      }}
                    >
                      No items scheduled
                    </button>
                  ) : (
                    <div
                      className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2"
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (dragTaskId) {
                          setHoveredWeekDate(ds);
                        }
                      }}
                      onDrop={async (e) => {
                        e.preventDefault();
                        const droppedTaskId = e.dataTransfer.getData('text/task-id') || dragTaskId;
                        const draggedTask = tasks.find((task) => task.id === droppedTaskId);
                        await finishDropToTime(droppedTaskId, ds, draggedTask?.time || '00:00');
                      }}
                    >
                      {visibleWeekItems.map((task) => (
                        <button
                          key={task.id}
                          className={`min-w-0 max-w-full rounded-xl border px-3 py-2 text-left transition hover:border-accent hover:bg-[var(--surface2)] ${getTypeBadgeClass(task.type)}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenTask(task);
                          }}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/task-id', task.id);
                            e.dataTransfer.effectAllowed = 'move';
                            setDragTaskId(task.id);
                          }}
                          onDragEnd={() => {
                            setDragTaskId(null);
                            setHoveredHour(null);
                            setHoveredWeekDate(null);
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                          }}
                          onDrop={async (e) => {
                            e.preventDefault();
                            const droppedTaskId = e.dataTransfer.getData('text/task-id') || dragTaskId;
                            if (!droppedTaskId || droppedTaskId === task.id) return;
                            await finishDropToTime(droppedTaskId, ds, task.time || '00:00');
                          }}
                        >
                          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text4)]">
                            {task.time ? formatTime(task.time) : 'All-day'}
                          </div>
                          <div className="mt-1 text-[13px] font-bold leading-tight">{task.title}</div>
                          <div className="mt-1 text-[11px] text-[var(--text3)]">{task.list}</div>
                        </button>
                      ))}
                      {hiddenWeekCount > 0 && (
                        <button
                          className="min-w-0 max-w-full rounded-xl border border-dashed border-[var(--border)] px-3 py-2 text-left text-[var(--text3)] transition hover:border-accent hover:text-accent hover:bg-[var(--surface2)]"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedWeekDate(isWeekExpanded ? null : ds);
                          }}
                        >
                          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text4)]">More</div>
                          <div className="mt-1 text-[13px] font-bold text-accent">+{hiddenWeekCount} more</div>
                        </button>
                      )}
                      {isWeekExpanded && dayItems.length > weekVisibleLimit && (
                        <button
                          className="min-w-0 max-w-full rounded-xl border border-[var(--border)] px-3 py-2 text-left text-[var(--text3)] transition hover:border-accent hover:text-accent hover:bg-[var(--surface2)]"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedWeekDate(null);
                          }}
                        >
                          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text4)]">View</div>
                          <div className="mt-1 text-[13px] font-bold">Show less</div>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDay = () => {
    const ds = toLocalDateStr(calDate);
    const items = visibleTasks
      .filter((task) => occursOnDate(task, ds))
      .sort((a, b) => (a.time || '23:59').localeCompare(b.time || '23:59'));
    const isToday = ds === todayStr();
    const currentTimeTop = ((currentTime.getHours() * 60) + currentTime.getMinutes()) / 60 * 80;
    const timedItems = items.filter((task) => !!task.time);
    const allDayItems = items.filter((task) => !task.time);
    const cardHeight = 56;
    const dayCardLayouts = timedItems.map((task) => {
      const [hour, minute] = task.time.split(':').map(Number);
      const top = (hour * 80) + (minute / 60 * 80);
      return { task, top, bottom: top + cardHeight };
    });

    const overlapGroups: Array<{ indices: number[]; maxBottom: number }> = [];
    dayCardLayouts.forEach((layout, index) => {
      const currentGroup = overlapGroups[overlapGroups.length - 1];
      if (!currentGroup || layout.top >= currentGroup.maxBottom) {
        overlapGroups.push({ indices: [index], maxBottom: layout.bottom });
        return;
      }
      currentGroup.indices.push(index);
      currentGroup.maxBottom = Math.max(currentGroup.maxBottom, layout.bottom);
    });

    const maxVisibleColumns = 3;
    const layoutByTaskId = new Map<string, { top: number; left: string; width: string }>();
    const hiddenTaskIds = new Set<string>();
    const overflowIndicators: Array<{ id: string; top: number; left: string; width: string; count: number; tasks: TaskItem[] }> = [];
    overlapGroups.forEach((group) => {
      const columns = group.indices.length;
      const visibleColumns = Math.min(columns, maxVisibleColumns);
      const visibleTaskCount = columns > maxVisibleColumns ? maxVisibleColumns - 1 : columns;
      const gapPx = 12;
      const totalGapPx = gapPx * (visibleColumns - 1);
      const width = `calc((100% - 24px - ${totalGapPx}px) / ${visibleColumns})`;
      const getLeft = (columnIndex: number) => `calc(12px + ${columnIndex} * (((100% - 24px - ${totalGapPx}px) / ${visibleColumns}) + ${gapPx}px))`;

      group.indices.forEach((layoutIndex, columnIndex) => {
        const layout = dayCardLayouts[layoutIndex];
        if (columnIndex >= visibleTaskCount) {
          hiddenTaskIds.add(layout.task.id);
          return;
        }
        layoutByTaskId.set(layout.task.id, {
          top: layout.top,
          width,
          left: getLeft(columnIndex),
        });
      });

      if (columns > maxVisibleColumns) {
        const anchorLayout = dayCardLayouts[group.indices[visibleTaskCount]];
        overflowIndicators.push({
          id: `overflow-${anchorLayout.task.id}`,
          top: anchorLayout.top,
          left: getLeft(visibleColumns - 1),
          width,
          count: columns - visibleTaskCount,
          tasks: group.indices.slice(visibleTaskCount).map((layoutIndex) => dayCardLayouts[layoutIndex].task),
        });
      }
    });

    return (
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden h-full flex flex-col">
        <div className="p-4 border-b border-[var(--border)] bg-[var(--surface2)]">
          <h3 className={`text-lg font-black ${isToday ? 'text-accent' : ''}`}>
            {calDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </h3>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="flex min-h-full min-w-[560px] sm:min-w-0">
            <div className="w-14 sm:w-16 border-r border-[var(--border)] flex flex-col bg-[var(--surface2)]">
              {Array.from({ length: 24 }).map((_, h) => (
                <div key={h} className="h-20 border-b border-[var(--border)] text-[9px] text-[var(--text4)] p-1 text-right font-bold">
                  {h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
                </div>
              ))}
            </div>

            <div className="relative flex-1">
              <div
                className="pointer-events-none absolute inset-0 z-0"
                style={{
                  backgroundImage: 'repeating-linear-gradient(to bottom, transparent, transparent 79px, var(--border) 79px, var(--border) 80px)',
                }}
              ></div>

              {Array.from({ length: 24 }).map((_, h) => (
                <div
                  key={h}
                  className={`relative z-10 h-20 border-b border-transparent transition-colors cursor-pointer ${hoveredHour === h ? 'bg-[var(--accent-light)]/40' : 'hover:bg-[var(--bg3)]'}`}
                  onClick={() => openAddModal('task', { date: ds, time: getHourSlotTime(h) })}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragTaskId) {
                      setHoveredHour(h);
                    }
                  }}
                  onDragLeave={() => {
                    if (hoveredHour === h) {
                      setHoveredHour(null);
                    }
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    const droppedTaskId = e.dataTransfer.getData('text/task-id') || dragTaskId;
                    await finishDropToTime(droppedTaskId, ds, getHourSlotTime(h));
                  }}
                ></div>
              ))}

              {isToday && (
                <div
                  className="pointer-events-none absolute left-0 right-0 z-20"
                  style={{ top: `${currentTimeTop}px` }}
                >
                  <div className="relative h-0">
                    <span className="absolute -left-1 -top-1.5 h-3 w-3 rounded-full bg-accent shadow-[0_0_0_3px_var(--surface)]"></span>
                    <div className="h-0.5 w-full bg-accent shadow-[0_0_12px_var(--accent)]"></div>
                  </div>
                </div>
              )}

              {items.length === 0 ? null : (
                <>
                  {allDayItems.map((task, index) => (
                    <button
                      key={task.id}
                      className={`absolute left-3 right-3 z-20 rounded-xl border px-3 py-2 text-left shadow-sm transition hover:border-accent hover:bg-[var(--surface2)] ${getTypeBadgeClass(task.type)}`}
                      style={{ top: `${12 + (index * 64)}px` }}
                      onClick={() => onOpenTask(task)}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/task-id', task.id);
                        e.dataTransfer.effectAllowed = 'move';
                        setDragTaskId(task.id);
                      }}
                      onDragEnd={() => {
                        setDragTaskId(null);
                        setHoveredHour(null);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                      }}
                      onDrop={async (e) => {
                        e.preventDefault();
                        const droppedTaskId = e.dataTransfer.getData('text/task-id') || dragTaskId;
                        if (!droppedTaskId || droppedTaskId === task.id) return;
                        await finishDropToTime(droppedTaskId, ds, task.time || '00:00');
                      }}
                    >
                      <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text4)]">All-day</div>
                      <div className="mt-1 text-[13px] font-bold">{task.title}</div>
                      <div className="mt-1 text-[11px] text-[var(--text3)]">{task.list}</div>
                    </button>
                  ))}
                  {timedItems.map((task) => {
                    if (hiddenTaskIds.has(task.id)) return null;
                    const layout = layoutByTaskId.get(task.id);
                    if (!layout) return null;

                    return (
                    <button
                      key={task.id}
                      className={`absolute z-20 rounded-xl border px-2 sm:px-3 py-2 text-left shadow-sm transition hover:border-accent hover:bg-[var(--surface2)] ${getTypeBadgeClass(task.type)} ${dragTaskId === task.id ? 'opacity-60 shadow-[0_18px_36px_rgba(0,0,0,0.32)]' : ''}`}
                      style={{ top: `${layout.top}px`, left: layout.left, width: layout.width, minHeight: '48px' }}
                        onClick={() => onOpenTask(task)}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/task-id', task.id);
                          e.dataTransfer.effectAllowed = 'move';
                          setDragTaskId(task.id);
                        }}
                        onDragEnd={() => {
                          setDragTaskId(null);
                          setHoveredHour(null);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                        }}
                        onDrop={async (e) => {
                          e.preventDefault();
                          const droppedTaskId = e.dataTransfer.getData('text/task-id') || dragTaskId;
                          if (!droppedTaskId || droppedTaskId === task.id) return;
                          await finishDropToTime(droppedTaskId, ds, task.time);
                        }}
                      >
                        <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text4)]">
                          {formatTime(task.time)}
                        </div>
                        <div className="mt-1 text-[12px] sm:text-[13px] font-bold leading-tight">{task.title}</div>
                        <div className="mt-1 text-[10px] sm:text-[11px] text-[var(--text3)] truncate">{task.list}</div>
                      </button>
                    );
                  })}
                  {overflowIndicators.map((indicator) => (
                    <div
                      key={indicator.id}
                      className="absolute z-20"
                      style={{ top: `${indicator.top}px`, left: indicator.left, width: indicator.width }}
                    >
                      <button
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface2)] px-3 py-2 text-left text-[var(--text3)] shadow-sm transition hover:border-accent"
                        style={{ minHeight: '48px' }}
                        onClick={() => setOpenOverflowId((current) => current === indicator.id ? null : indicator.id)}
                      >
                        <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text4)]">More</div>
                        <div className="mt-1 text-[13px] font-bold text-accent">+{indicator.count} more</div>
                      </button>
                      {openOverflowId === indicator.id && (
                        <div className="mt-2 w-[220px] max-w-[calc(100vw-64px)] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 shadow-[0_18px_40px_rgba(0,0,0,0.18)]">
                          <div className="mb-2 px-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text4)]">
                            Hidden tasks
                          </div>
                          <div className="space-y-1">
                            {indicator.tasks.map((task) => (
                              <button
                                key={task.id}
                                className="w-full rounded-lg border border-[var(--border)] px-2 py-2 text-left transition hover:border-accent hover:bg-[var(--surface2)]"
                                onClick={() => {
                                  setOpenOverflowId(null);
                                  onOpenTask(task);
                                }}
                              >
                                <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--text4)]">
                                  {task.time ? formatTime(task.time) : 'All-day'}
                                </div>
                                <div className="mt-1 text-[12px] font-bold text-[var(--text)]">{task.title}</div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4 bg-[var(--surface)] p-3 rounded-xl border border-[var(--border)] flex-wrap">
        <div className="flex items-center gap-1 shrink-0">
          <button className="p-1.5 rounded-lg hover:bg-[var(--bg3)] text-[var(--text3)] transition" onClick={() => {
            const d = new Date(calDate);
            if (calView === 'month') d.setMonth(d.getMonth() - 1);
            else if (calView === 'week') d.setDate(d.getDate() - 7);
            else d.setDate(d.getDate() - 1);
            setCalDate(d);
          }}><ChevronLeft size={16} /></button>
          <button className="p-1.5 rounded-lg hover:bg-[var(--bg3)] text-[var(--text3)] transition" onClick={() => {
            const d = new Date(calDate);
            if (calView === 'month') d.setMonth(d.getMonth() + 1);
            else if (calView === 'week') d.setDate(d.getDate() + 7);
            else d.setDate(d.getDate() + 1);
            setCalDate(d);
          }}><ChevronRight size={16} /></button>
        </div>
        <button className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs font-black hover:bg-accent hover:text-white transition active:scale-95 shrink-0" onClick={() => setCalDate(new Date())}>Today</button>
        <h2 className="text-[15px] sm:text-[17px] font-black text-[var(--text)] min-w-0 flex-1 order-3 basis-full sm:order-none sm:basis-auto sm:ml-2">
          {calView === 'month' ? monthLabel :
           calView === 'week' ? `Week of ${calDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` :
           calDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
        </h2>
        <div className="ml-auto flex gap-1 p-1 bg-[var(--bg3)] rounded-lg shrink-0">
          {['month', 'week', 'day'].map((v) => (
            <button
              key={v}
              className={`px-2.5 sm:px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${calView === v ? 'bg-[var(--surface)] text-accent shadow-sm' : 'text-[var(--text4)] hover:text-[var(--text2)]'}`}
              onClick={() => setCalView(v)}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {calView === 'month' ? renderMonth() : calView === 'week' ? renderWeek() : renderDay()}
      </div>
    </div>
  );
}
