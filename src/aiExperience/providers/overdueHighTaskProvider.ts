// Pure evaluator over the already-loaded `tasks` state Home.tsx/App.tsx
// already own — no Supabase query here, per the Phase-2A design pass's
// explicit recommendation to reuse already-RLS-scoped state rather than
// duplicate a fetch.
//
// Eligibility mirrors the Gallery reference's validated Overdue High Task
// rule (features/petDialogue/providers/overdueTaskProvider.ts +
// todoTaskFilters.ts in the Gallery repo): incomplete, urgency HIGH, due
// date strictly before local today.
//
// This repo's own App.tsx already normalizes completion and urgency onto
// `TaskItem` at load time (see App.tsx's `syncUserAndDataFromDatabase`):
// `done: t.status === 'done' || t.is_completed === true` (both existing
// completion representations already merged into one boolean — this
// provider does not need to know `status`/`is_completed` separately) and
// `priority: t.urgency?.toLowerCase()` (Supabase `urgency='HIGH'` becomes
// client-side `priority: 'high'`). This provider consumes exactly that
// already-normalized `TaskItem` shape, not raw Supabase columns.

import type { TaskItem } from '../../types';
import { todayStr } from '../../utils';
import type { InsightCandidate } from '../contracts/insightCandidate';
import { sanitizeTaskTitle } from '../sanitizeTaskTitle';

export interface OverdueHighTaskFacts {
  taskId: string;
  title: string | null;
  dueDate: string;
  urgency: 'high';
}

/** Oldest due date wins first, then earliest created, then task id —
 *  mirrors the Gallery reference's deterministic tie-break
 *  (compareByCreatedTimeThenTaskId), never array/query order. */
function compareForSelection(a: TaskItem, b: TaskItem): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  if (a.created !== b.created) return a.created - b.created;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function evaluateOverdueHighTask(tasks: TaskItem[]): InsightCandidate<OverdueHighTaskFacts> | null {
  const today = todayStr();

  const qualifying = tasks.filter(
    (t) => !t.done && t.priority === 'high' && !!t.date && t.date < today
  );

  if (qualifying.length === 0) return null;

  const winner = [...qualifying].sort(compareForSelection)[0];
  const safeTitle = sanitizeTaskTitle(winner.title);
  const message = safeTitle ? `Your urgent task "${safeTitle}" is overdue.` : 'You have an overdue urgent task.';

  const facts: OverdueHighTaskFacts = {
    taskId: winner.id,
    title: safeTitle,
    dueDate: winner.date,
    urgency: 'high',
  };

  return {
    app: 'todo',
    triggerId: 'todo_overdue_high',
    priority: 'HIGH',
    facts,
    messageTemplate: 'Your urgent task "{title}" is overdue.',
    message,
    action: { label: 'View Today', view: 'today' },
    dedupeKey: `todo_overdue_high:${winner.id}:date:${winner.date}`,
    sourceRecordId: winner.id,
    evaluatedAt: new Date().toISOString(),
  };
}
