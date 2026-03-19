import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Task } from '../hooks/types';

interface DayTasksPageProps {
  tasks: Task[];
  onToggleTaskStatus: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
}

const DayTasksPage: React.FC<DayTasksPageProps> = ({ tasks, onToggleTaskStatus, onDeleteTask }) => {
  const { date } = useParams<{ date: string }>();
  const dayKey = date || '';

  const dayTasks = useMemo(
    () => tasks.filter((t) => t.date === dayKey).sort((a, b) => (a.time || '23:59').localeCompare(b.time || '23:59')),
    [tasks, dayKey]
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-slate-500 font-semibold">Day view</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{formatFriendly(dayKey)}</div>
          <div className="text-sm text-slate-500">{dayTasks.length} item{dayTasks.length === 1 ? '' : 's'}</div>
        </div>
        <Link
          to="/"
          className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 hover:-translate-y-[1px] transition"
        >
          Back to calendar
        </Link>
      </div>

      {dayTasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-4 text-sm text-slate-500">
          No tasks for this day.
        </div>
      ) : (
        <div className="space-y-3">
          {dayTasks.map((task) => (
            <div
              key={task.id}
              className={`p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start gap-3 transition ${
                task.status === 'completed'
                  ? 'opacity-35 grayscale saturate-50'
                  : ''
              }`}
            >
              <div
                className={`mt-1 size-2.5 rounded-full ${
                  task.type === 'event'
                    ? 'bg-emerald-500'
                    : task.time
                      ? 'bg-blue-500'
                      : 'bg-amber-500'
                }`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-300">
                  {task.time && <span>{task.time}</span>}
                  <span>{task.type === 'event' ? 'Event' : task.time ? 'Task' : 'Reminder'}</span>
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                  {task.title}
                </div>
                {task.description && (
                  <div className="text-xs text-slate-500 line-clamp-2">{task.description}</div>
                )}
                <div className="flex items-center justify-between mt-2 text-[12px]">
                  <div className="flex gap-2">
                    <button
                      onClick={() => onDeleteTask(task.id)}
                      className="px-2 py-1 rounded-lg border border-red-200 dark:border-red-700 text-red-600 dark:text-red-300 hover:-translate-y-[1px] transition cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                  <label className="flex items-center gap-2 select-none cursor-pointer">
                    <span className="text-slate-700 dark:text-slate-200">
                      {task.status === 'completed' ? 'Completed' : 'Mark as done'}
                    </span>
                    <input
                      type="checkbox"
                      checked={task.status === 'completed'}
                      onChange={() => onToggleTaskStatus(task.id)}
                      className="h-5 w-5 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DayTasksPage;
function formatFriendly(dateStr: string) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
