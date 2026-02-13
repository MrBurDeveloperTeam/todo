import { useMemo } from 'react';
import { Task } from '../../../hooks/types';
import { TaskBoardGroup, TaskFilters } from '../types/taskBoard.types';

interface UseTaskGroupingParams {
  tasks: Task[];
  filters: TaskFilters;
  numColumns: number;
}

export const useTaskGrouping = ({ tasks, filters, numColumns }: UseTaskGroupingParams) => {
  const filteredTasks = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('en-CA');

    return tasks.filter((task) => {
      if (filters.status === 'active' && task.status === 'completed') return false;
      if (filters.status === 'completed' && task.status !== 'completed') return false;

      if (filters.type !== 'all' && task.type !== filters.type) return false;
      if (filters.urgency !== 'all' && task.urgency !== filters.urgency) return false;

      if (filters.timeframe === 'past' && task.date >= todayStr) return false;
      if (filters.timeframe === 'today' && task.date !== todayStr) return false;
      if (filters.timeframe === 'upcoming' && task.date <= todayStr) return false;

      return true;
    });
  }, [tasks, filters]);

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter((value) => value !== 'all').length,
    [filters],
  );

  const boardGroups = useMemo(() => {
    const today = new Date();
    const todayStr = today.toLocaleDateString('en-CA');
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toLocaleDateString('en-CA');

    const groups: TaskBoardGroup[] = [];
    const datesToShow = new Set<string>();

    if (filters.timeframe === 'all' || filters.timeframe === 'today' || filters.timeframe === 'upcoming') {
      if (filters.timeframe !== 'upcoming') datesToShow.add(todayStr);
      if (filters.timeframe !== 'today') datesToShow.add(tomorrowStr);
    }

    filteredTasks.forEach((task) => datesToShow.add(task.date));

    Array.from(datesToShow)
      .sort()
      .forEach((dateStr, index) => {
        const dateTasks = filteredTasks
          .filter((task) => task.date === dateStr)
          .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

        let label = '';
        const isOverdue = dateStr < todayStr;

        if (dateStr === todayStr) label = 'Today';
        else if (dateStr === tomorrowStr) label = 'Tomorrow';
        else {
          const [year, month, day] = dateStr.split('-').map(Number);
          const dateObj = new Date(year, month - 1, day);
          label = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
        }

        groups.push({
          id: dateStr,
          label,
          dateStr,
          tasks: dateTasks,
          isOverdue,
          index,
        });
      });

    return groups;
  }, [filteredTasks, filters.timeframe]);

  const distributedGroups = useMemo(() => {
    const columns: TaskBoardGroup[][] = Array.from({ length: numColumns }, () => []);
    boardGroups.forEach((group, index) => {
      columns[index % numColumns].push(group);
    });
    return columns;
  }, [boardGroups, numColumns]);

  return {
    filteredTasks,
    activeFilterCount,
    boardGroups,
    distributedGroups,
  };
};
