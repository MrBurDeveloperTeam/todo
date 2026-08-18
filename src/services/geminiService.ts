import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
const modelId = 'gemini-3-flash-preview';

type ChatPart = { text: string };
type ChatMessage = { role: 'user' | 'model'; parts: ChatPart[] };

export async function chatWithMolarAI(
  history: ChatMessage[],
  message: string,
  userContext = ''
) {
  try {
    const hasContext = userContext.trim().length > 30;
    const systemInstruction = `
You are SNAI (Snabbb Assistant Intelligent), the AI assistant for the Snabbb To-Do Manager.

Your role:
- Help users manage tasks, reminders, events, lists, priorities, deadlines, calendar planning, and productivity workflows.
- Use the to-do manager context when available.
- Give concise, operational guidance.
- Do not invent tasks, lists, deadlines, or database records that are not present in the context.
- If a user asks to change data, guide them to the relevant To-Do Manager area unless an explicit UI action handler is available.

Useful UI guidance:
- Tasks are managed in My Tasks.
- Calendar items are managed in Calendar.
- Today and Upcoming views help users focus by date.
- Lists, default list, theme, accent, and completed-task display are managed in Settings.

${hasContext ? `--- TO-DO MANAGER CONTEXT ---\n${userContext}\n--- END CONTEXT ---` : ''}

Current date: ${new Date().toISOString().split('T')[0]}
`;

    const contents = [
      { role: 'user' as const, parts: [{ text: systemInstruction }] },
      { role: 'model' as const, parts: [{ text: 'I am SNAI, ready to help with task planning.' }] },
      ...history,
      { role: 'user' as const, parts: [{ text: message }] },
    ];

    const response = await ai.models.generateContent({
      model: modelId,
      contents,
      config: { responseMimeType: 'text/plain' },
    });

    const text = response.text;
    if (!text) throw new Error('No response from Gemini');
    return text;
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
// (see src/aiExperience/dataChat/). Gemini here NEVER decides which tasks
// are overdue/high-priority/due today, never computes counts, never picks
// the intent, and never receives the full `aiContext` string
// `chatWithMolarAI` does (which includes user name/email and raw upcoming
// task titles) — only the user's question, the approved intent name, and
// the already-computed, title-free facts.
//
// CRITICAL: unlike `chatWithMolarAI`, this function THROWS on failure
// (network error, empty response) rather than swallowing it into a
// friendly fallback string — the caller needs to distinguish success from
// failure so it can render a deterministic facts-only fallback instead
// (see src/aiExperience/dataChat/utils/formatGroundedTodoFallback.ts)
// rather than ever falling through to the full General Chat pipeline.
//
// The returned text is plain assistant text ONLY. It is never scanned for
// fenced ` ```json ` action blocks and the system instruction explicitly
// forbids emitting any — this function has no path to
// `window.__MOLAR_ACTIONS__` or any task mutation, even if the model
// unexpectedly tried to emit one.
export async function chatWithGroundedTodoFacts(
  question: string,
  intent: string,
  facts: unknown
): Promise<string> {
  const systemInstruction = `
You are answering ONE specific To-Do data question using ONLY the structured facts provided below.

Approved intent: ${intent}
Facts (JSON, already computed by deterministic code — do not recompute or second-guess any number):
${JSON.stringify(facts)}

Rules — follow ALL of these exactly:
- Only state facts present in the JSON above. Do not invent counts, due dates, or reasons.
- Task titles are intentionally NOT provided to you. Do not invent task names or descriptions. Do not refer to "Task A"/"Task 1" as if it were a real title — the local UI will attach real task details separately.
- For list-type questions, provide ONLY a brief overview/count sentence. Do NOT produce a numbered or bulleted list of tasks, and do NOT create any per-task line, label, or placeholder — local application code appends the authoritative task list after your response.
- Do not calculate, estimate, or infer any new count or date beyond what is given.
- Do not infer or claim task completion status beyond what the facts state.
- Do not claim any task was created, changed, or deleted — you cannot make changes, only report data.
- Do NOT output a \`\`\`json code block or any similar machine-readable tag under any circumstance.
- If the JSON's "count" is greater than "shownCount", you MUST clearly say only some matching tasks are shown (e.g. "Showing 5 of 12").
- If "count" (or the relevant total) is 0, clearly state that no matching tasks were found — do not imply otherwise.
- Be concise — a sentence or two at most.
`;

  const contents = [
    { role: 'user' as const, parts: [{ text: systemInstruction }] },
    { role: 'model' as const, parts: [{ text: 'Understood — I will use only the provided facts and no task titles.' }] },
    { role: 'user' as const, parts: [{ text: question }] },
  ];

  const response = await ai.models.generateContent({
    model: modelId,
    contents,
    config: { responseMimeType: 'text/plain' },
  });

  const text = response.text;
  if (!text || !text.trim()) throw new Error('Empty grounded response from Gemini');

  return text.trim();
}
