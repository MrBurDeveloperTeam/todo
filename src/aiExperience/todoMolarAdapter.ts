// PHASE 5C (Molar AI extraction): the shared Molar AI presentation +
// generic chat lifecycle now live in
// @mrburdeveloperteam/molar-experience/ai's <SharedMolarAI>. This file is
// the LOCAL AI orchestration adapter — every piece of To-Do business/data
// logic that lived inline in the old MolarAIFloat.jsx's handleSendMessage
// is UNCHANGED in content here, only relocated and wrapped as
// `AIAdapter.sendMessage({ text, history }) => Promise<{ text, meta }>`.
// The shared UI never sees any of: the mutation guard, the Data Chat
// classifier/resolver/response-composer, the AIBoard keyword-response
// lookup, or the Gemini calls — it only ever receives the final resolved
// text.
//
// The one outer try/catch that used to wrap the whole send pipeline (to
// render "SNAI Error: Unable to process request.") is intentionally NOT
// reproduced here — SharedMolarAI itself catches any rejection from
// `adapter.sendMessage` and renders that exact same fallback text, so
// this function is free to simply throw/let errors propagate for that
// generic case. The one INNER try/catch that existed for a deliberate,
// non-generic fallback (grounded Gemini phrasing failing over to a
// deterministic formatted answer, still rendered through the SAME local
// sanitized-task-list layer as the success path) is preserved exactly,
// since that is business behavior, not generic error UI.
//
// The dead `window.__MOLAR_ACTIONS__` fenced-JSON action-block parser
// that used to wrap the General Chat response is NOT ported — confirmed
// via a fresh repo-wide grep (Phase 5C step 12) that zero assignment to
// `window.__MOLAR_ACTIONS__` exists anywhere in this repo (only this
// dead consumer + doc-comment references), so removing it loses no live
// behavior.

import { chatWithMolarAI, chatWithGroundedTodoFacts } from '../services/geminiService';
import { supabase } from '../lib/supabase';
import { isTaskMutationRequest } from './dataChat/router/isTaskMutationRequest';
import { classifyTodoDataIntent } from './dataChat/router/classifyTodoDataIntent';
import { resolveTodoDataQuery } from './dataChat/resolver/resolveTodoDataQuery';
import {
  buildUnsupportedParameterMessage,
  buildUnsupportedScopeMessage,
} from './dataChat/utils/unsupportedParameterMessage';
import { formatGroundedTodoFallback } from './dataChat/utils/formatGroundedTodoFallback';
import { composeGroundedTodoResponse } from './dataChat/utils/composeGroundedTodoResponse';
import { resolveTodoFollowUp } from './dataChat/router/resolveTodoFollowUp';
import { matchTodoCapability } from './dataChat/semantic/matchTodoCapability';
import type { GroundedConversationContext } from './dataChat/context/groundedConversationContext';
import type { TaskItem } from '../types';
import type { TaskDataStatus, TodoDataIntent } from './dataChat/contracts/groundedDataResult';

const CLARIFICATION_LABEL: Record<TodoDataIntent, string> = {
  todo_overdue_high: 'overdue high-priority tasks',
  todo_overdue: 'overdue tasks',
  todo_high_today: "today's high-priority tasks",
  todo_today: "today's tasks",
  todo_summary: 'a summary of your tasks',
  todo_upcoming: 'upcoming tasks',
};

interface CreateTodoMolarAdapterDeps {
  tasks: unknown[];
  taskDataStatus: string;
  userContext: string;
}

export function createTodoMolarAdapter({ tasks, taskDataStatus, userContext }: CreateTodoMolarAdapterDeps) {
  // Grounded conversation context — lives only inside this closure (one
  // per `useMemo`-created adapter instance; see
  // dataChat/context/groundedConversationContext.ts's header for why this
  // already gives session scoping and account-switch isolation for free).
  let groundedContext: GroundedConversationContext | null = null;

  // Shared by both the fast-path classifier match AND the semantic
  // capability matcher below — a matched capability is executed
  // identically regardless of which tier selected it, and always starts
  // a FRESH conversation context (Section 5B/19: a new grounded question
  // always replaces whatever follow-up context was active before).
  async function executeGroundedIntent(intent: TodoDataIntent, msg: string) {
    const result = resolveTodoDataQuery(intent, tasks, taskDataStatus);

    if (result.status === 'unavailable') {
      return { text: "I couldn't check your to-do data right now.", meta: { source: 'fallback' as const } };
    }

    groundedContext = {
      appId: 'todo',
      lastIntent: result.intent,
      presentedOrder: 'display',
      lastUserQuestion: msg,
      generation: (groundedContext?.generation ?? 0) + 1,
      createdAt: new Date().toISOString(),
    };

    try {
      const modelOverview = await chatWithGroundedTodoFacts(msg, result.intent, result.facts);
      const text = composeGroundedTodoResponse(result.intent, modelOverview, result.localDisplay);
      return { text, meta: { source: 'data-chat' as const } };
    } catch (groundedErr) {
      console.error('Grounded todo response failed:', groundedErr);
      return { text: formatGroundedTodoFallback(result.intent, result.facts, result.localDisplay), meta: { source: 'fallback' as const } };
    }
  }

  return {
    reset: () => {
      groundedContext = null;
    },
    sendMessage: async ({ text: msg, history }: { text: string; history: { role: 'user' | 'model'; text: string }[] }) => {
      // ── Phase-3 Data-Driven Chat (read-only pilot) ──────────────────
      // Runs BEFORE the legacy General Chat pipeline below, fully
      // separate from it — unchanged in content from the pre-extraction
      // implementation.

      // 1. Explicit task mutation requests are intercepted with a
      // deterministic refusal — zero Gemini calls, zero mutation.
      if (isTaskMutationRequest(msg)) {
        return {
          text: "This data chat can check your to-do information, but it can't make task changes.",
          meta: { source: 'fallback' as const },
        };
      }

      // 2. Deterministic LOCAL intent classification (no Gemini call).
      const dataRoute = classifyTodoDataIntent(msg);

      if (dataRoute.kind === 'unsupported_scope') {
        return { text: buildUnsupportedScopeMessage(dataRoute.reason), meta: { source: 'fallback' as const } };
      }

      if (dataRoute.kind === 'unsupported_parameter') {
        return { text: buildUnsupportedParameterMessage(dataRoute.reason), meta: { source: 'fallback' as const } };
      }

      if (dataRoute.kind === 'matched') {
        return executeGroundedIntent(dataRoute.intent, msg);
      }

      // ── Tier C: Grounded conversational follow-up ───────────────────
      // Tried BEFORE falling through to General Chat — a question like
      // "which one should I do first?" or "what about the second one?"
      // never matches classifyTodoDataIntent's own phrase tables (it
      // isn't a NEW grounded question), but is answerable deterministically
      // from the active groundedContext, revalidated against the CURRENT
      // live `tasks` array (see resolveTodoFollowUp.ts).
      const followUp = resolveTodoFollowUp(msg, groundedContext, tasks as TaskItem[], taskDataStatus as TaskDataStatus);
      if (followUp && groundedContext) {
        groundedContext = {
          ...groundedContext,
          presentedOrder: followUp.presentedOrder,
          lastUserQuestion: msg,
          generation: groundedContext.generation + 1,
        };
        return { text: followUp.text, meta: { source: 'data-chat' as const } };
      }
      // ── Tier D: Semantic capability router ───────────────────────────
      // The fast-path phrase table above (classifyTodoDataIntent) is an
      // optimization/compatibility layer, not the only entry point — a
      // question that means the same thing in different words (e.g. "Is
      // there any up coming task?", "Anything I've been putting off?")
      // is matched here by keyword-overlap scoring against the
      // capability registry (see semantic/matchTodoCapability.ts's
      // header for why this is a LOCAL, network-free matcher rather than
      // a Gemini-based router). Never receives live task data — only the
      // message and the static capability descriptions.
      const semanticRoute = matchTodoCapability(msg);
      if (semanticRoute.type === 'grounded_capability') {
        return executeGroundedIntent(semanticRoute.capability, msg);
      }
      if (semanticRoute.type === 'clarification') {
        const [a, b] = semanticRoute.candidates;
        return {
          text: `Do you mean ${CLARIFICATION_LABEL[a]} or ${CLARIFICATION_LABEL[b]}?`,
          meta: { source: 'fallback' as const },
        };
      }
      // ── End Phase-3 Data-Driven Chat (dataRoute.kind === 'no_match') ─

      // 1. Check custom AIBoard responses first
      const { data: apps } = await supabase
        .from('aiboard_response_target_apps')
        .select('response_id')
        .in('app_name', ['To-Do Manager', 'All']);

      let response: string | null = null;
      if (apps && apps.length > 0) {
        const responseIds = apps.map((a: { response_id: string }) => a.response_id);
        const { data: keywords } = await supabase
          .from('aiboard_response_keywords')
          .select('keyword, response_id')
          .in('response_id', responseIds);

        if (keywords && keywords.length > 0) {
          const matchedKeyword = keywords.find((k: { keyword: string }) => msg.toLowerCase().includes(k.keyword.toLowerCase()));

          if (matchedKeyword) {
            const { data: respData } = await supabase
              .from('aiboard_responses')
              .select('response')
              .eq('id', matchedKeyword.response_id)
              .single();

            if (respData) {
              response = respData.response;
            }
          }
        }
      }

      // 2. Fallback to Gemini — reconstruct the Gemini SDK's own
      // {role, parts:[{text}]} shape from the shared AIMessage[] history
      // (the shared package's canonical shape is {role, text}).
      if (!response) {
        const geminiHistory = history.map((m) => ({ role: m.role, parts: [{ text: m.text }] }));
        response = await chatWithMolarAI(geminiHistory, msg, userContext || '');
      }

      return { text: response, meta: { source: 'general' as const } };
    },
  };
}
