import React from 'react';
import { Task } from '../../../hooks/types';
import { fireTaskConfetti } from '../utils/taskEffects';
import { getTaskStyles, getUrgencyStyles, urgencyOptions } from '../utils/taskStyles';

interface TaskCardProps {
  task: Task;
  onDragStart: (e: React.DragEvent, taskId: string) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onToggleTaskStatus: (taskId: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onSetTaskUrgency: (task: Task, urgency: Task['urgency']) => void;
  openUrgencyTaskId: string | null;
  setOpenUrgencyTaskId: (taskId: string | null) => void;
  urgencyMenuRef: React.RefObject<HTMLDivElement | null>;
  editingTitleTaskId: string | null;
  editingTitleValue: string;
  setEditingTitleValue: (value: string) => void;
  setEditingTitleTaskId: (taskId: string | null) => void;
  onStartTitleEdit: (task: Task) => void;
  onSaveTitleEdit: (task: Task) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onDragStart,
  onDragEnd,
  onToggleTaskStatus,
  onEdit,
  onDelete,
  onSetTaskUrgency,
  openUrgencyTaskId,
  setOpenUrgencyTaskId,
  urgencyMenuRef,
  editingTitleTaskId,
  editingTitleValue,
  setEditingTitleValue,
  setEditingTitleTaskId,
  onStartTitleEdit,
  onSaveTitleEdit,
}) => {
  const styles = getTaskStyles(task);
  const urgencyClass = getUrgencyStyles(task.urgency);
  const isUrgencyOpen = openUrgencyTaskId === task.id;
  const isActive = task.status === 'active';
  const isCompleted = task.status === 'completed';
  const isEvent = task.type === 'event';

  return (
    <div
      key={task.id}
      draggable="true"
      onDragStart={(e) => onDragStart(e, task.id)}
      onDragEnd={onDragEnd}
      className={`group relative border rounded-2xl p-4 transition-all duration-200 cursor-grab active:cursor-grabbing
        ${styles.bg}
        ${isActive ? 'border-primary shadow-md shadow-primary/5' : `${styles.border} hover:border-primary/30 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-black/30`}
        ${isUrgencyOpen ? 'z-[200]' : 'z-0'}
        ${isCompleted ? 'opacity-60' : ''}
      `}
    >
      <div className="flex items-center gap-4">
        {!isEvent ? (
          <button
            onClick={(e) => {
              if (!isCompleted) fireTaskConfetti(e.clientX, e.clientY);
              onToggleTaskStatus(task.id);
            }}
            className={`shrink-0 w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center
              ${isCompleted
                ? 'bg-primary border-primary text-white'
                : isActive
                  ? 'border-primary text-primary'
                  : 'border-slate-300 dark:border-slate-600 text-transparent hover:border-primary'
              }`}
          >
            <span className={`material-symbols-outlined text-[16px] font-bold ${isCompleted ? 'scale-100' : 'scale-0'}`}>check</span>
          </button>
        ) : (
          <div className="shrink-0 w-6 h-6 flex items-center justify-center text-slate-400">
            <span className="material-symbols-outlined text-[20px]">event</span>
          </div>
        )}

        <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex flex-col items-start gap-1 mb-1">
              {editingTitleTaskId === task.id ? (
                <input
                  value={editingTitleValue}
                  onChange={(e) => setEditingTitleValue(e.target.value)}
                  onBlur={() => onSaveTitleEdit(task)}
                  onPointerDown={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      onSaveTitleEdit(task);
                    }
                    if (e.key === 'Escape') {
                      setEditingTitleTaskId(null);
                    }
                  }}
                  className="text-base font-bold w-full max-w-[320px] bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-0.5 focus:ring-2 focus:ring-primary"
                  autoFocus
                />
              ) : (
                <button
                  type="button"
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    onStartTitleEdit(task);
                  }}
                  className={`text-left text-base font-bold transition-colors whitespace-normal break-words leading-tight ${isCompleted ? 'line-through text-slate-400' : 'text-slate-900 dark:text-white'}`}
                  title="Double-click to rename"
                >
                  {task.title}
                </button>
              )}
              {isEvent && (
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded">
                  Event
                </span>
              )}
            </div>
            {task.description && (
              <p className={`text-xs leading-relaxed mb-1 line-clamp-2 ${isCompleted ? 'text-slate-400' : 'text-slate-600 dark:text-slate-300'}`}>
                {task.description}
              </p>
            )}
            <div className="flex items-center gap-3 text-xs font-medium text-slate-500 dark:text-slate-400">
              {task.time && (
                <span className={`flex items-center gap-1 ${isCompleted ? 'text-slate-400' : 'text-slate-600 dark:text-slate-300'}`}>
                  <span className="material-symbols-outlined text-[16px]">schedule</span>
                  {task.time}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto mt-2 sm:mt-0">
            <div className="relative z-[210]" ref={isUrgencyOpen ? urgencyMenuRef : null}>
              <button
                type="button"
                onClick={() => setOpenUrgencyTaskId(openUrgencyTaskId === task.id ? null : task.id)}
                className={`z-auto px-2.5 py-1 rounded-xl text-xs font-bold border uppercase tracking-wide flex items-center gap-1.5 shadow-sm transition-all ${urgencyClass} ${isCompleted ? 'opacity-50' : 'hover:shadow-md hover:scale-[1.01]'}`}
                title="Set urgency"
              >
                <span className={`material-symbols-outlined text-[16px] ${task.urgency !== 'Normal' ? 'filled' : ''}`}>flag</span>
                <span className="font-black tracking-wider">{task.urgency}</span>
                <span className="material-symbols-outlined text-[14px] opacity-70">expand_more</span>
              </button>

              {isUrgencyOpen && (
                <div className="absolute top-full right-0 mt-2 w-36 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-1.5 z-[220]">
                  {urgencyOptions.map((urgency) => {
                    const optionClass = getUrgencyStyles(urgency);
                    const isSelected = task.urgency === urgency;
                    return (
                      <button
                        key={urgency}
                        type="button"
                        onClick={() => onSetTaskUrgency(task, urgency)}
                        className={`w-full px-2 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide border flex items-center justify-between transition-colors mb-1 last:mb-0 ${optionClass} ${isSelected ? 'ring-1 ring-slate-400/40 dark:ring-slate-500/40' : 'hover:brightness-95'}`}
                      >
                        <span>{urgency}</span>
                        {isSelected && (
                          <span className="material-symbols-outlined text-[14px]">check</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onEdit(task)}
                className="p-2 text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                title="Edit"
              >
                <span className="material-symbols-outlined text-[20px]">edit</span>
              </button>
              <button
                onClick={() => onDelete(task.id)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Delete"
              >
                <span className="material-symbols-outlined text-[20px]">delete</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
