// Client-side transport layer only. This file must NEVER import
// @google/genai, construct a GoogleGenAI client, read
// VITE_GEMINI_API_KEY, or call generateContent directly — all of that now
// lives exclusively in the server-only Supabase Edge Function at
// supabase/functions/molar-chat/index.ts, which this file calls via
// supabase.functions.invoke(). That invocation automatically carries the
// browser's current authenticated Supabase session as the Authorization
// bearer token — no token is ever placed into the request body/prompt
// here. Public function signatures are preserved so
// src/aiExperience/todoMolarAdapter.ts requires no change.
import { supabase } from '../lib/supabase';

type ChatPart = { text: string };
type ChatMessage = { role: 'user' | 'model'; parts: ChatPart[] };

async function invokeMolarChat(payload: Record<string, unknown>): Promise<string> {
  if (!supabase) {
    throw new Error('AI service is not configured');
  }

  const { data, error } = await supabase.functions.invoke('molar-chat', {
    body: payload,
  });

  if (error || !data?.ok) {
    throw new Error(data?.error || error?.message || 'AI service request failed');
  }

  return data.text;
}

export async function chatWithMolarAI(
  history: ChatMessage[],
  message: string,
  userContext = ''
) {
  try {
    return await invokeMolarChat({ mode: 'general', history, message, userContext });
  } catch (error) {
    console.error('Gemini Chat Error:', error);
    return "I'm having trouble connecting to the Snabbb Assistant Intelligent servers right now. Please try again shortly.";
  }
}

// ─────────────────────────────────────────────────────────────
// DATA-DRIVEN CHAT — grounded response phrasing ONLY.
//
// Architecturally SEPARATE from `chatWithMolarAI` above: this function is
// called only AFTER a deterministic local intent router + deterministic
// task-state provider have already produced minimized, model-safe facts
// (see src/aiExperience/dataChat/). The Edge Function this calls NEVER
// decides which tasks are overdue/high-priority/due today, never computes
// counts, never picks the intent, and never receives the full `aiContext`
// string `chatWithMolarAI` does (which includes user name/email and raw
// upcoming task titles) — only the user's question, the approved intent
// name, and the already-computed, title-free facts.
//
// CRITICAL: unlike `chatWithMolarAI`, this function THROWS on failure
// (missing/invalid request, network error, empty response) rather than
// swallowing it into a friendly fallback string — the caller needs to
// distinguish success from failure so it can render a deterministic
// facts-only fallback instead (see
// src/aiExperience/dataChat/utils/formatGroundedTodoFallback.ts) rather
// than ever falling through to the full General Chat pipeline.
export async function chatWithGroundedTodoFacts(
  question: string,
  intent: string,
  facts: unknown
): Promise<string> {
  return invokeMolarChat({ mode: 'grounded', question, intent, facts });
}
