// Minimal hook wiring the local resolver into React.
//
// Deliberately NOT sessionStorage-deduped, NOT timer/cooldown-gated: per the
// completed Phase-2A design pass (§11/§29), Gallery's Cat Dialogue
// sessionStorage dedupe exists because the same proactive INTERRUPTING
// bubble should not repeatedly re-show; this is a persistent landing-page
// banner, not an interruption — it should always reflect current task
// state whenever Home renders, so a resolved/no-longer-overdue task
// disappears from the banner the moment `tasks` changes, and a
// newly-overdue task appears the same way. No new sessionStorage key, no
// cooldown, no persistent read state.
//
// Deliberately NOT polling and NOT subscribing to Supabase realtime: `tasks`
// is already kept current by App.tsx's existing create/update/delete
// handlers and its own auth-driven refetch — `useMemo` below simply
// re-derives the candidate whenever that already-current array reference
// changes, exactly the same re-evaluation trigger React already uses
// elsewhere in this codebase (e.g. App.tsx's own `aiContext` useMemo).

import { useMemo } from 'react';
import { resolveTodoInsight } from '../resolver/resolveTodoInsight';
import type { InsightCandidate } from '../contracts/insightCandidate';
import type { TaskItem } from '../../types';

export function useTodoPersonalizedInsight(tasks: TaskItem[]): InsightCandidate<unknown> | null {
  return useMemo(() => {
    try {
      return resolveTodoInsight(tasks);
    } catch (err) {
      // A provider failure must never produce a fabricated personalized
      // claim or a raw error surfaced to the user — see the design pass's
      // §31 loading/error/empty-state rule. Since evaluation here is pure
      // (no network call), this is only a last-resort guard against a
      // malformed task row; the safe behavior is simply "no insight this
      // render", identical to the "neither exists" case.
      console.warn('[aiExperience] personalized insight evaluation failed:', err);
      return null;
    }
  }, [tasks]);
}
