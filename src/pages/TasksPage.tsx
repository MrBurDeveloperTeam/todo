import React from 'react';
import { Task } from '../hooks/types';
import TaskFormModal from '../features/tasks/modals/TaskFormModal';
import TaskCard from '../features/tasks/components/TaskCard';
import { useTaskBoardState } from '../features/tasks/hooks/useTaskBoardState';
import { useTaskGrouping } from '../features/tasks/hooks/useTaskGrouping';
import { DEFAULT_TASK_FILTERS } from '../features/tasks/types/taskBoard.types';
import { getDayColumnStyle } from '../features/tasks/utils/taskStyles';

interface TasksPageProps {
  toggleTheme: () => void;
  isDarkMode: boolean;
  tasks: Task[];
  onToggleTaskStatus: (taskId: string) => void;
  onAddTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  userId: string;
}

const TasksPage: React.FC<TasksPageProps> = ({
  toggleTheme: _toggleTheme,
  isDarkMode: _isDarkMode,
  tasks,
  onToggleTaskStatus,
  onAddTask,
  onEditTask,
  onDeleteTask,
  userId: _userId,
}) => {
  const {
    isTaskModalOpen,
    setIsTaskModalOpen,
    editingTask,
    selectedDateForNewTask,
    draggedTaskId,
    dragOverDateStr,
    numColumns,
    isFilterOpen,
    setIsFilterOpen,
    openUrgencyTaskId,
    setOpenUrgencyTaskId,
    editingTitleTaskId,
    setEditingTitleTaskId,
    editingTitleValue,
    setEditingTitleValue,
    filters,
    setFilters,
    filterRef,
    urgencyMenuRef,
    handleAddNew,
    handleAddNewForDate,
    handleEdit,
    handleSaveTask,
    handleDelete,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDateDrop,
    setTaskUrgency,
    startTitleEdit,
    saveTitleEdit,
  } = useTaskBoardState({
    tasks,
    onAddTask,
    onEditTask,
    onDeleteTask,
  });

  const { activeFilterCount, distributedGroups } = useTaskGrouping({
    tasks,
    filters,
    numColumns,
  });

  return (
    <>
      <TaskFormModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSave={handleSaveTask}
        initialTask={editingTask}
        initialDate={selectedDateForNewTask}
        onDelete={onDeleteTask}
      />

      <div className="flex-1 flex flex-col relative overflow-hidden bg-slate-50/50 dark:bg-transparent">
        <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
          <div className="px-6 pt-5 pb-0 flex flex-col sm:flex-row items-center justify-end gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={handleAddNew}
                className="h-10 px-5 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-bold shadow-sm hover:bg-primary-dark flex items-center justify-center gap-2 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
                <span>Add Event</span>
              </button>

              <div className="relative" ref={filterRef}>
                <button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold border transition-all ${isFilterOpen || activeFilterCount > 0
                    ? 'bg-primary text-white border-primary'
                    : 'bg-slate-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-transparent hover:border-slate-200 dark:hover:border-gray-700'
                    }`}
                >
                  <span className="material-symbols-outlined text-[18px]">filter_list</span>
                  Filter
                  {activeFilterCount > 0 && (
                    <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                {isFilterOpen && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-[#1E1E1E] rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 p-5 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-slate-900 dark:text-white">Filters</h3>
                      {activeFilterCount > 0 && (
                        <button
                          onClick={() => setFilters(DEFAULT_TASK_FILTERS)}
                          className="text-xs text-primary font-bold hover:underline"
                        >
                          Reset
                        </button>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Time</label>
                        <div className="grid grid-cols-2 gap-2">
                          {['all', 'past', 'today', 'upcoming'].map((timeframe) => (
                            <button
                              key={timeframe}
                              onClick={() => setFilters({ ...filters, timeframe: timeframe as any })}
                              className={`py-1.5 text-xs font-bold rounded-lg border transition-all capitalize ${filters.timeframe === timeframe
                                ? 'bg-primary/10 border-primary text-primary'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                                }`}
                            >
                              {timeframe}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</label>
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                          {['all', 'active', 'completed'].map((status) => (
                            <button
                              key={status}
                              onClick={() => setFilters({ ...filters, status: status as any })}
                              className={`flex-1 py-1.5 text-xs font-bold rounded-md capitalize transition-all ${filters.status === status
                                ? 'bg-white dark:bg-surface-dark shadow-sm text-slate-900 dark:text-white'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Type</label>
                        <div className="flex gap-2">
                          {['all', 'task', 'event'].map((type) => (
                            <button
                              key={type}
                              onClick={() => setFilters({ ...filters, type: type as any })}
                              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all capitalize ${filters.type === type
                                ? 'bg-primary/10 border-primary text-primary'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                                }`}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Urgency</label>
                        <div className="flex flex-wrap gap-2">
                          {['all', 'High', 'Medium', 'Low', 'Normal'].map((urgency) => (
                            <button
                              key={urgency}
                              onClick={() => setFilters({ ...filters, urgency: urgency as any })}
                              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${filters.urgency === urgency
                                ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-900 border-transparent'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                                }`}
                            >
                              {urgency}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 p-6">
            <div className="h-full">
              <div className="flex gap-6 pb-20 items-start">
                {distributedGroups.map((colGroups, colIndex) => (
                  <div key={colIndex} className="flex-1 flex flex-col gap-6">
                    {colGroups.map((group) => {
                      const columnStyle = group.isOverdue
                        ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20'
                        : getDayColumnStyle(group.index);
                      const hasOpenUrgencyInGroup = group.tasks.some((task) => task.id === openUrgencyTaskId);

                      return (
                        <div
                          key={group.id}
                          onDragOver={(e) => handleDragOver(e, group.dateStr)}
                          onDrop={(e) => handleDateDrop(e, group.dateStr)}
                          className={`relative w-full h-fit rounded-[2rem] p-5 border ${columnStyle} transition-all shadow-sm flex flex-col ${
                            hasOpenUrgencyInGroup ? 'z-[110]' : 'z-0'
                          }`}
                        >
                          <h3 className={`text-xl font-bold mb-4 px-2 ${group.isOverdue ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-100'}`}>
                            {group.label}
                          </h3>

                          <div className={`space-y-3 ${draggedTaskId ? 'min-h-[100px]' : ''} ${dragOverDateStr === group.dateStr ? 'bg-black/5 dark:bg-white/5 rounded-xl transition-all' : ''}`}>
                            {group.tasks.length === 0 && !draggedTaskId && (
                              <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-sm italic">
                                No tasks
                              </div>
                            )}

                            {group.tasks.map((task) => (
                              <TaskCard
                                key={task.id}
                                task={task}
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                                onToggleTaskStatus={onToggleTaskStatus}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                onSetTaskUrgency={setTaskUrgency}
                                openUrgencyTaskId={openUrgencyTaskId}
                                setOpenUrgencyTaskId={setOpenUrgencyTaskId}
                                urgencyMenuRef={urgencyMenuRef}
                                editingTitleTaskId={editingTitleTaskId}
                                editingTitleValue={editingTitleValue}
                                setEditingTitleValue={setEditingTitleValue}
                                setEditingTitleTaskId={setEditingTitleTaskId}
                                onStartTitleEdit={startTitleEdit}
                                onSaveTitleEdit={saveTitleEdit}
                              />
                            ))}
                          </div>

                          {!group.isOverdue && (
                            <button
                              onClick={() => {
                                const [year, month, day] = group.dateStr.split('-').map(Number);
                                handleAddNewForDate(new Date(year, month - 1, day));
                              }}
                              className="mt-4 flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors px-2 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 w-full -ml-1"
                            >
                              <span className="material-symbols-outlined text-[20px]">add</span>
                              New Task
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TasksPage;
