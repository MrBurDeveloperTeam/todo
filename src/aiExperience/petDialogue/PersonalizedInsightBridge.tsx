// Smallest bridge to get the already-resolved Phase-2A/2B InsightCandidate
// from Home.tsx (where useTodoPersonalizedInsight actually runs) across to
// CatMascot.jsx. Unlike Content Studio, Home and CatMascot are direct
// SIBLINGS already, both rendered from the same App.tsx return block — so
// this Provider simply wraps that existing fragment. No new Supabase query,
// no polling, no realtime — this is a pure read-only React Context relay of
// a value Home already computed. Mirrors the exact same three-way
// readiness contract already browser-validated in the E-Learning and
// Content Studio repos' own PersonalizedInsightBridge.tsx.
//
// THREE-WAY STATE: the context value is `PersonalizedInsightBridgeState |
// null`, where `null` specifically means "no publisher currently mounted"
// (off-Home route — this app doesn't have client-side routing away from
// Home while logged in today, but the contract stays symmetric with the
// other two apps regardless) — distinct from `{status:'not_ready'}`, which
// means "Home IS mounted and is actively telling us its Phase-2 source
// (tasks) is still resolving."
//
// READINESS SOURCE: App.tsx already owns an authoritative `TaskDataStatus`
// ('loading' | 'ready' | 'error') — the exact same signal already piped to
// MolarAIFloat for Phase-3 Data Chat's own readiness gate (see
// App.tsx's `taskDataStatus` state and resolveTodoDataQuery.ts's
// `taskDataStatus !== 'ready'` short-circuit). Home.tsx now receives this
// same status as a prop (previously only `tasks` was passed) and derives
// this bridge's not_ready/ready state from it — zero new query, reusing
// exactly the same state App.tsx already fetches/maintains.
//
// Deliberately route-scoped, not global: a non-`null` state only ever
// exists while Home is mounted and publishing (see
// usePublishPersonalizedInsight below, called only from Home.tsx).

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { InsightCandidate } from '../contracts/insightCandidate';

export type PersonalizedInsightBridgeState =
  | { status: 'not_ready' }
  | {
      status: 'ready';
      candidate: InsightCandidate<unknown> | null;
      /** Additive (starvation fix): ordered dialogue pool across Overdue
       *  High > High Today > Normal Tasks Today > Nothing Today — see
       *  buildTodoDialoguePool.ts. `candidates[0] ?? null` is always
       *  identical to `candidate` above when no suppression applies. Cat
       *  scans this via selectFirstEligibleDialogueCandidate instead of
       *  only ever seeing the single inline winner; the inline banner
       *  keeps reading `candidate` only, unaffected. */
      candidates: InsightCandidate<unknown>[];
      /** Home's own existing action logic (setCurrentView via
       *  candidate.action.view) — reused verbatim, never reimplemented
       *  here. Takes the candidate to act on explicitly (rather than
       *  closing over whichever candidate resolveTodoInsight most recently
       *  picked) so a caller — Cat included — always executes the action
       *  belonging to the exact candidate it is currently showing, even
       *  when that differs from the inline banner's own current winner
       *  (e.g. Cat is showing a dismissal-revealed second overdue task
       *  while the inline banner still shows the first). */
      onAction: (candidate: InsightCandidate<unknown>) => void;
    };

interface PersonalizedInsightBridgeContextValue {
  entry: PersonalizedInsightBridgeState | null;
  publish: (entry: PersonalizedInsightBridgeState | null) => void;
}

const PersonalizedInsightBridgeContext = createContext<PersonalizedInsightBridgeContextValue | null>(null);

export function PersonalizedInsightBridgeProvider({ children }: { children: ReactNode }) {
  const [entry, setEntry] = useState<PersonalizedInsightBridgeState | null>(null);
  return (
    <PersonalizedInsightBridgeContext.Provider value={{ entry, publish: setEntry }}>
      {children}
    </PersonalizedInsightBridgeContext.Provider>
  );
}

/** Home calls this with its current readiness state (not_ready while
 *  App.tsx's taskDataStatus is 'loading' or 'error', ready+candidate once
 *  resolveTodoInsight has actually run on real task data). Publishes on
 *  change, reverts to `null` (publisher absent) on unmount. */
export function usePublishPersonalizedInsight(state: PersonalizedInsightBridgeState): void {
  const ctx = useContext(PersonalizedInsightBridgeContext);
  useEffect(() => {
    if (!ctx) return;
    ctx.publish(state);
    return () => ctx.publish(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, state]);
}

/** CatMascot calls this — read-only, never publishes. `null` = no
 *  publisher mounted. */
export function usePersonalizedInsightBridge(): PersonalizedInsightBridgeState | null {
  const ctx = useContext(PersonalizedInsightBridgeContext);
  return ctx?.entry ?? null;
}
