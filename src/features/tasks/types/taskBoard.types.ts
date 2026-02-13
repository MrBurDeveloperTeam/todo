import { Task } from '../../../hooks/types';

export interface TaskFilters {
  status: 'all' | 'active' | 'completed';
  type: 'all' | 'task' | 'event';
  urgency: 'all' | Task['urgency'];
  timeframe: 'all' | 'past' | 'today' | 'upcoming';
}

export interface TaskBoardGroup {
  id: string;
  label: string;
  dateStr: string;
  tasks: Task[];
  isOverdue?: boolean;
  index: number;
}

export const DEFAULT_TASK_FILTERS: TaskFilters = {
  status: 'all',
  type: 'all',
  urgency: 'all',
  timeframe: 'all',
};
