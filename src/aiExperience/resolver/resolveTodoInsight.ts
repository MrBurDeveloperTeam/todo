// Minimal deterministic local resolver, now covering both Phase-2A To-Do
// slices.
//
// Local priority: Overdue High Task > High Task Today > Normal Tasks Today
// > Nothing Today — an explicit, unconditional precedence check (mirrors
// the Gallery reference's own `unhandledExpired ?? unhandledOverdueTask`
// pattern for same-tier candidates), never Promise timing, object
// iteration, or query order. Every evaluator here is pure/synchronous (no
// network calls — see each provider), so there is no async race to guard
// against in the first place.
//
// Nothing Today is NOT unconditionally constructed as a final fallback —
// evaluateNothingToday itself applies a truthfulness guard (zero incomplete
// tasks with a valid date <= today, regardless of priority) before ever
// returning a candidate. If that guard fails (e.g. a non-HIGH overdue task
// exists with no other candidate covering it), this resolver correctly
// returns `null` overall rather than fabricating a false "all caught up"
// claim — see nothingTodayProvider.ts for the exact rule.
//
// This is intentionally NOT the Gallery global resolver (resolveDialogue.ts)
// and does not import it — Gallery's global cross-app priority
// (Expired Inventory > Overdue High Task > Appointment Within 2 Hours > ...)
// is untouched and unrelated to this local, To-Do-only ranking.

import { evaluateOverdueHighTask } from '../providers/overdueHighTaskProvider';
import { evaluateHighTaskToday } from '../providers/highTaskTodayProvider';
import { evaluateNormalTasksToday } from '../providers/normalTasksTodayProvider';
import { evaluateNothingToday } from '../providers/nothingTodayProvider';
import type { InsightCandidate } from '../contracts/insightCandidate';
import type { TaskItem } from '../../types';

export function resolveTodoInsight(tasks: TaskItem[]): InsightCandidate<unknown> | null {
  const overdue = evaluateOverdueHighTask(tasks);
  if (overdue) return overdue;

  const highToday = evaluateHighTaskToday(tasks);
  if (highToday) return highToday;

  const normalToday = evaluateNormalTasksToday(tasks);
  if (normalToday) return normalToday;

  // May itself return null (truthfulness guard failed) — that is a valid,
  // intentional "no candidate at all" outcome, not an error.
  return evaluateNothingToday(tasks);
}
