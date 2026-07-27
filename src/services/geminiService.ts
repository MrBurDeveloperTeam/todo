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
