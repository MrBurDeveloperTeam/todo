// Minimal deterministic local resolver for this first Phase-2A slice.
//
// Local priority: Overdue High Task > High Task Today — an explicit,
// unconditional precedence check (mirrors the Gallery reference's own
// `unhandledExpired ?? unhandledOverdueTask` pattern for same-tier
// candidates), never Promise timing, object iteration, or query order.
// Both evaluators are pure/synchronous here (no network calls — see
// overdueHighTaskProvider.ts), so there is no async race to guard against
// in the first place.
//
// This is intentionally NOT the Gallery global resolver (resolveDialogue.ts)
// and does not import it — Gallery's global cross-app priority
// (Expired Inventory > Overdue High Task > Appointment Within 2 Hours > ...)
// is untouched and unrelated to this local, To-Do-only ranking.

import { evaluateOverdueHighTask } from '../providers/overdueHighTaskProvider';
import { evaluateHighTaskToday } from '../providers/highTaskTodayProvider';
import type { InsightCandidate } from '../contracts/insightCandidate';
import type { TaskItem } from '../../types';

export function resolveTodoInsight(tasks: TaskItem[]): InsightCandidate<unknown> | null {
  const overdue = evaluateOverdueHighTask(tasks);
  if (overdue) return overdue;

  const highToday = evaluateHighTaskToday(tasks);
  if (highToday) return highToday;

  // Neither exists in this first slice — no fallback yet (Normal Tasks
  // Today / Nothing Today are explicitly out of scope here; see the next
  // slice notes in the implementation report).
  return null;
}
