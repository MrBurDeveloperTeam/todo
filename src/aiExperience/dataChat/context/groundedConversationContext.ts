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
