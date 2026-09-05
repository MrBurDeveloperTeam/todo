// Structured grounded-conversation memory for follow-up questions (see
// SNABBB-CROSS-APP-MOLAR-AI-CONVERSATIONAL-CONTINUITY-ENHANCEMENT).
//
// DELIBERATELY NOT the raw rendered assistant message — a follow-up like
// "which one should I do first?" must resolve against the STRUCTURED
// intent/dataset that produced the previous answer, never by re-parsing
// text. Holds no task titles/facts itself; a follow-up handler always
// re-resolves the same `lastIntent` against the CURRENT live `tasks`
// array (see resolveTodoFollowUp.ts), so an answer is always revalidated
// against present state, never a stale snapshot.
//
// LIFETIME: lives only inside the adapter closure created by
// `createTodoMolarAdapter` (one closure per `useMemo` in MolarAIFloat,
// re-created whenever its deps — including the authenticated user id —
// change). This gives session scoping and account-switch isolation for
// free, with no extra code: a user switch already produces a brand new
// adapter closure with a fresh `context = null`. Explicit reset (the
// user clicking "Clear conversation") is wired via the shared package's
// new optional `AIAdapter.reset()` hook.

import type { TodoDataIntent } from '../contracts/groundedDataResult';

export interface GroundedConversationContext {
  appId: 'todo';
  lastIntent: TodoDataIntent;
  /** Which ordering a follow-up's ordinal reference ("the second one")
   *  should resolve against — the intent's own default display order,
   *  or a ranking order established by a prior "which one first?"-style
   *  answer within this same context. */
  presentedOrder: 'display' | 'ranked';
  lastUserQuestion: string;
  generation: number;
  createdAt: string;
}

// TODO-SHARED-MOLAR-PRODUCTION-INTEGRATION-1: this file's own header above
// (LIFETIME) assumed the adapter's `useMemo` deps in MolarAIFloat.jsx
// already included the authenticated user id, giving "account-switch
// isolation for free" purely from ordinary adapter recreation. Confirmed
// false — MolarAIFloat.jsx's `useMemo` deps are `[tasks, taskDataStatus,
// userContext]`, which change on nearly every task list refresh, so a
// closure-local `let groundedContext` (the pre-integration design) was
// destroyed far more often than intended, breaking mid-conversation
// follow-ups. Host-owned (App.tsx `useRef`) store so the grounded context
// survives `createTodoMolarAdapter` being rebuilt on ordinary data
// refreshes — the same architecture already proven for Inventory and
// Appointment. Only the store's own `clear()` (wired to explicit reset +
// the identity-keyed remount boundary on MolarAIFloat, see App.tsx) ever
// drops the context, never adapter recreation.
export interface GroundedContextStore {
  get(): GroundedConversationContext | null;
  set(ctx: GroundedConversationContext | null): void;
  clear(): void;
}

export function createGroundedContextStore(): GroundedContextStore {
  let current: GroundedConversationContext | null = null;
  return {
    get: () => current,
    set: (ctx) => { current = ctx; },
    clear: () => { current = null; },
  };
}
