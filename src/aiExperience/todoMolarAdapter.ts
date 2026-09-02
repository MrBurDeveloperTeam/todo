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
import type { GroundedConversationContext } from './dataChat/context/groundedConversationContext';
import type { TaskItem } from '../types';
import type { TaskDataStatus } from './dataChat/contracts/groundedDataResult';

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
        const result = resolveTodoDataQuery(dataRoute.intent, tasks, taskDataStatus);

        if (result.status === 'unavailable') {
          // Unknown/unavailable task state is never reinterpreted as a
          // zero-result answer, and a matched grounded intent owns this
          // request even when its provider is temporarily unavailable —
          // it does not fall through to General Chat.
          return { text: "I couldn't check your to-do data right now.", meta: { source: 'fallback' as const } };
        }

        // A new explicit grounded question always starts a fresh
        // conversation context (Section 5B) — never merged with whatever
        // was active before, even if the previous intent was also a list
        // intent.
        groundedContext = {
          appId: 'todo',
          lastIntent: result.intent,
          presentedOrder: 'display',
          lastUserQuestion: msg,
          generation: (groundedContext?.generation ?? 0) + 1,
          createdAt: new Date().toISOString(),
        };

        try {
          // 3. Grounded Gemini phrasing — receives ONLY the question, the
          // approved intent, and the already-minimized, title-free facts.
          // Gemini supplies only the generic overview/header; the
          // authoritative sanitized task list is always appended locally
          // afterward (composeGroundedTodoResponse is a no-op for
          // non-list intents) — success and failure paths render the
          // SAME local task-detail layer.
          const modelOverview = await chatWithGroundedTodoFacts(msg, result.intent, result.facts);
          const text = composeGroundedTodoResponse(result.intent, modelOverview, result.localDisplay);
          return { text, meta: { source: 'data-chat' as const } };
        } catch (groundedErr) {
          // Mandatory deterministic fallback — never falls through to
          // General Chat on a Gemini failure at this stage. Builds BOTH
          // the summary wording and the sanitized local task list from
          // local structured data only.
          console.error('Grounded todo response failed:', groundedErr);
          return { text: formatGroundedTodoFallback(result.intent, result.facts, result.localDisplay), meta: { source: 'fallback' as const } };
        }
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
