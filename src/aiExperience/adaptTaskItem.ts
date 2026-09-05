// Host integration boundary only — NOT ported from the shared-experience
// branch. Production's own `Task` shape (src/hooks/types.ts) diverged from
// the `TaskItem` shape src/aiExperience/** and src/petExperience/** were
// built against (see src/types.ts). This is a pure, read-only, one-way
// mapping used ONLY to feed Cat/Molar the current task list — it must
// never be used to construct a payload for any actual task mutation
// (those remain Production's own apiFetch('/tasks', ...) calls, using
// `Task` directly, untouched by this file).
import type { Task } from '../hooks/types';
import type { TaskItem, Priority } from '../types';

function toPriority(urgency: Task['urgency']): Priority {
  switch (urgency) {
    case 'High':
      return 'high';
    case 'Medium':
      return 'med';
    case 'Low':
      return 'low';
    default:
      return 'none';
  }
}

export function taskToTaskItem(task: Task): TaskItem {
  return {
    id: task.id,
    type: task.type === 'event' ? 'event' : 'task',
    title: task.title,
    desc: task.description || '',
    date: task.date,
    time: task.time || '',
    priority: toPriority(task.urgency),
    // Production has no list/folder concept for tasks today — every
    // ported provider only sorts/dedupes by id, never groups or filters
    // by `list`, so a single constant is safe (see this repo's own
    // Todo-Shared-Molar-Production-Audit-1 finding).
    list: 'tasks',
    done: task.status === 'completed',
    // Production's `Task` has no creation-timestamp field. `created` is
    // only ever used as a last-resort tie-breaker for otherwise-identical
    // sort order (see e.g. overdueHighTaskProvider.ts's
    // `compareForSelection`) — defaulting every task to the same value
    // just means ties fall back to whatever the next comparator key is,
    // never a correctness issue.
    created: 0,
  };
}

export function tasksToTaskItems(tasks: Task[]): TaskItem[] {
  return tasks.map(taskToTaskItem);
}
