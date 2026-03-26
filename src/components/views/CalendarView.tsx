import React from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock 
} from 'lucide-react';
import { TaskItem, ViewType } from '../../types';
import { toLocalDateStr, todayStr, formatTime } from '../../utils';

interface CalendarViewProps {
  tasks: TaskItem[];
  calDate: Date;
  setCalDate: React.Dispatch<React.SetStateAction<Date>>;
  calView: string;
  setCalView: React.Dispatch<React.SetStateAction<string>>;
  setSelectedTaskId: (id: string | null) => void;
  setCurrentView: (view: any) => void;
  openAddModal: (type?: any) => void;
  theme: string;
}

export function CalendarView({
  tasks,
  calDate,
  setCalDate,
  calView,
  setCalView,
  setSelectedTaskId,
  setCurrentView,
  openAddModal,
  theme
}: CalendarViewProps) {
  const y = calDate.getFullYear();
  const m = calDate.getMonth();
  const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(calDate);

  const getTypeBadgeClass = (type: TaskItem['type']) => {
    if (type === 'task') {
      return 'bg-[#eff6ff] text-[#2563eb] border-[#bfdbfe]';
    }
    if (type === 'event') {
      return 'bg-[#fee2e2] text-[#b42318] border-[#fca5a5]';
    }
    return theme === 'dark'
      ? 'bg-amber-900/20 text-amber-400 border-amber-500/20'
      : 'bg-white text-[#92400e] border-[#fcd34d]';
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
      <div className="border border-[var(--border)] rounded-lg overflow-hidden bg-[var(--border)]">
        <div className="grid grid-cols-7 gap-px">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="bg-[var(--surface2)] text-center py-2 text-[10px] font-black text-[var(--text4)] uppercase tracking-widest">{d}</div>
          ))}
        </div>

        <div className="space-y-px bg-[var(--border)]">
          {weeks.map((week, weekIndex) => {
            const weekStart = toLocalDateStr(week[0].date);
            const weekEnd = toLocalDateStr(week[6].date);

            const spanningEvents = tasks
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
                          className={`grid w-full grid-cols-7 gap-1 text-left`}
                          onClick={() => { setSelectedTaskId(task.id); setCurrentView('todo'); }}
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
                    const hasTasks = tasks.filter((t) => occursOnDate(t, dateS));
                    const cellItems = hasTasks.filter((t) => !isMultiDayEvent(t)).slice(0, 2);
                    const hiddenCount = hasTasks.length - cellItems.length;
                    const isToday = dateS === todayStr();

                    return (
                      <div
                        key={`${weekIndex}-${dayIndex}`}
                        className={`bg-[var(--surface)] min-h-[108px] p-2 hover:bg-[var(--surface2)] cursor-pointer transition ${!cell.current ? 'opacity-40 bg-[var(--bg)]' : ''} ${isToday ? 'bg-[var(--accent-light)]/30' : ''}`}
                        onClick={() => {
                          if (hasTasks.length > 0) { setSelectedTaskId(hasTasks[0].id); setCurrentView('todo'); }
                          else { setCalDate(cell.date); setCalView('day'); }
                        }}
                      >
                        <div className={`text-[12px] font-black mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-accent text-white' : 'text-[var(--text2)]'}`}>{cell.day}</div>
                        <div className="space-y-1">
                          {cellItems.map((t) => (
                            <div key={t.id} className={`text-[9px] px-1.5 py-0.5 rounded truncate font-bold border ${getTypeBadgeClass(t.type)}`}>
                              {t.time && formatTime(t.time)} {t.title}
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
      <div className="flex border border-[var(--border)] rounded-lg overflow-hidden bg-[var(--surface)] h-full min-h-[500px]">
        <div className="w-16 border-r border-[var(--border)] flex flex-col bg-[var(--surface2)]">
          <div className="h-10 border-b border-[var(--border)]"></div>
          {Array.from({ length: 24 }).map((_, h) => (
            <div key={h} className="h-20 border-b border-[var(--border)] text-[9px] text-[var(--text4)] p-1 text-right font-bold">
              {h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}
            </div>
          ))}
        </div>
        <div className="flex-1 flex overflow-x-auto">
          {days.map((day, di) => {
            const ds = toLocalDateStr(day);
            const isToday = ds === todayStr();
            const dayTasks = tasks.filter(t => occursOnDate(t, ds) && t.time);
            
            return (
              <div key={di} className="flex-1 min-w-[120px] border-r border-[var(--border)] last:border-r-0">
                <div className={`h-10 border-b border-[var(--border)] flex flex-col items-center justify-center ${isToday ? 'bg-[var(--accent-light)]' : 'bg-[var(--surface2)]'}`}>
                  <span className="text-[9px] font-black text-[var(--text4)] uppercase">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day.getDay()]}</span>
                  <span className={`text-xs font-black ${isToday ? 'text-accent' : ''}`}>{day.getDate()}</span>
                </div>
                <div className="relative">
                  {Array.from({ length: 24 }).map((_, h) => (
                    <div key={h} className="h-20 border-b border-[var(--border)] hover:bg-[var(--bg3)] transition-colors cursor-pointer" onClick={() => openAddModal('task')}></div>
                  ))}
                  {dayTasks.map(t => {
                    if (!t.time) return null;
                    const [h, m] = t.time.split(':').map(Number);
                    const top = (h * 80) + (m / 60 * 80);
                    return (
                      <div 
                        key={t.id}
                        className={`absolute left-1 right-1 p-1 rounded border shadow-sm cursor-pointer hover:brightness-105 transition overflow-hidden ${getTypeBadgeClass(t.type)}`}
                        style={{ top: `${top}px`, height: '40px', fontSize: '9px', fontWeight: 'bold' }}
                        onClick={(e) => { e.stopPropagation(); setSelectedTaskId(t.id); setCurrentView('todo'); }}
                      >
                        {formatTime(t.time)} {t.title}
                      </div>
                    );
                  })}
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
    const items = tasks.filter(t => occursOnDate(t, ds));
    const isToday = ds === todayStr();
    
    return (
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden h-full flex flex-col">
        <div className="p-4 border-b border-[var(--border)] bg-[var(--surface2)]">
          <h3 className={`text-lg font-black ${isToday ? 'text-accent' : ''}`}>
            {calDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </h3>
        </div>
        <div className="flex-1 overflow-auto p-4 space-y-2">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-[var(--text3)] opacity-40">
              <Clock size={48} strokeWidth={1} className="mb-2" />
              <p>Enjoy your free day!</p>
            </div>
          ) : (
            items.sort((a,b) => (a.time || '23:59').localeCompare(b.time || '23:59')).map(t => (
              <div key={t.id} className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border)] hover:border-accent group cursor-pointer transition" onClick={() => { setSelectedTaskId(t.id); setCurrentView('todo'); }}>
                 <div className="text-xs font-black text-[var(--text3)] min-w-[60px]">{t.time ? formatTime(t.time) : 'All-day'}</div>
                 <div className={`w-1 h-10 rounded-full ${getTypeAccentBarClass(t.type)}`}></div>
                 <div className="flex-1">
                   <div className="text-[15px] font-bold">{t.title}</div>
                   <div className="text-xs text-[var(--text3)]">{t.list} {t.location && `· 📍 ${t.location}`}</div>
                 </div>
                 <div className="ml-auto opacity-0 group-hover:opacity-100 transition"><ChevronRight size={18} className="text-accent" /></div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4 bg-[var(--surface)] p-3 rounded-xl border border-[var(--border)] flex-wrap">
        <div className="flex items-center gap-1">
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
        <button className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs font-black hover:bg-accent hover:text-white transition active:scale-95" onClick={() => setCalDate(new Date())}>Today</button>
        <h2 className="text-[17px] font-black ml-2 text-[var(--text)]">
          {calView === 'month' ? monthLabel : 
           calView === 'week' ? `Week of ${calDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` :
           calDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
        </h2>
        <div className="ml-auto flex gap-1 p-1 bg-[var(--bg3)] rounded-lg">
          {['month', 'week', 'day'].map(v => (
            <button 
              key={v}
              className={`px-3 py-1.2 text-[10px] font-black uppercase tracking-wider rounded-md transition-all ${calView === v ? 'bg-[var(--surface)] text-accent shadow-sm' : 'text-[var(--text4)] hover:text-[var(--text2)]'}`}
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
