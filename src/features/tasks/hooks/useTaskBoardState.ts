import { useEffect, useRef, useState } from 'react';
import { Task } from '../../../hooks/types';
import { DEFAULT_TASK_FILTERS, TaskFilters } from '../types/taskBoard.types';

interface UseTaskBoardStateParams {
  tasks: Task[];
  onAddTask: (task: Task) => void | Promise<void>;
  onEditTask: (task: Task) => void | Promise<void>;
  onDeleteTask: (taskId: string) => void | Promise<void>;
}

export const useTaskBoardState = ({
  tasks,
  onAddTask,
  onEditTask,
  onDeleteTask,
}: UseTaskBoardStateParams) => {
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedDateForNewTask, setSelectedDateForNewTask] = useState<Date | undefined>(undefined);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverDateStr, setDragOverDateStr] = useState<string | null>(null);
  const [numColumns, setNumColumns] = useState(2);

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [openUrgencyTaskId, setOpenUrgencyTaskId] = useState<string | null>(null);
  const [editingTitleTaskId, setEditingTitleTaskId] = useState<string | null>(null);
  const [editingTitleValue, setEditingTitleValue] = useState('');
  const [filters, setFilters] = useState<TaskFilters>(DEFAULT_TASK_FILTERS);

  const filterRef = useRef<HTMLDivElement>(null);
  const urgencyMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateColumns = () => {
      if (window.innerWidth < 768) setNumColumns(1);
      else setNumColumns(2);
    };

    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
      if (urgencyMenuRef.current && !urgencyMenuRef.current.contains(event.target as Node)) {
        setOpenUrgencyTaskId(null);
      }
    };

    if (isFilterOpen || openUrgencyTaskId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFilterOpen, openUrgencyTaskId]);

  const handleAddNew = () => {
    setEditingTask(null);
    setSelectedDateForNewTask(undefined);
    setIsTaskModalOpen(true);
  };

  const handleAddNewForDate = (date: Date) => {
    setEditingTask(null);
    setSelectedDateForNewTask(date);
    setIsTaskModalOpen(true);
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setSelectedDateForNewTask(undefined);
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = async (task: Task) => {
    if (editingTask) {
      await onEditTask(task);
    } else {
      await onAddTask(task);
    }
    setIsTaskModalOpen(false);
  };

  const handleDelete = async (taskId: string) => {
    await onDeleteTask(taskId);
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }
    setDraggedTaskId(null);
    setDragOverDateStr(null);
  };

  const handleDragOver = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    if (dragOverDateStr !== dateStr) {
      setDragOverDateStr(dateStr);
    }
  };

  const handleDateDrop = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    if (draggedTaskId) {
      const task = tasks.find((t) => t.id === draggedTaskId);
      if (task && task.date !== dateStr) {
        onEditTask({ ...task, date: dateStr });
      }
    }
    setDraggedTaskId(null);
    setDragOverDateStr(null);
  };

  const setTaskUrgency = (task: Task, urgency: Task['urgency']) => {
    if (task.urgency === urgency) return;
    onEditTask({ ...task, urgency });
    setOpenUrgencyTaskId(null);
  };

  const startTitleEdit = (task: Task) => {
    setEditingTitleTaskId(task.id);
    setEditingTitleValue(task.title);
  };

  const saveTitleEdit = (task: Task) => {
    const nextTitle = editingTitleValue.trim();
    setEditingTitleTaskId(null);
    if (!nextTitle || nextTitle === task.title) return;
    onEditTask({ ...task, title: nextTitle });
  };

  return {
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
  };
};
