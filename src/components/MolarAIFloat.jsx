import { useState, useRef, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MolarChat from './MolarChat';
import { chatWithMolarAI, chatWithGroundedTodoFacts } from '../services/geminiService';
import { supabase } from '../lib/supabase';
import { isTaskMutationRequest } from '../aiExperience/dataChat/router/isTaskMutationRequest';
import { classifyTodoDataIntent } from '../aiExperience/dataChat/router/classifyTodoDataIntent';
import { resolveTodoDataQuery } from '../aiExperience/dataChat/resolver/resolveTodoDataQuery';
import {
  buildUnsupportedParameterMessage,
  buildUnsupportedScopeMessage,
} from '../aiExperience/dataChat/utils/unsupportedParameterMessage';
import { formatGroundedTodoFallback } from '../aiExperience/dataChat/utils/formatGroundedTodoFallback';
import { composeGroundedTodoResponse } from '../aiExperience/dataChat/utils/composeGroundedTodoResponse';

/**
 * Self-contained floating Molar AI button + chat panel.
 * Drop this anywhere in the layout.
 */
export default function MolarAIFloat({ userContext, disabled = false, onPetToggle, tasks = [], taskDataStatus = 'loading' }) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [badgeText, setBadgeText] = useState('Meow! 🐾');

  useEffect(() => {
    const texts = disabled 
      ? ['Log In', 'Get Started']
      : ['Ask Me', 'Try Me!', 'SNAI'];
    
    let i = 0;
    setBadgeText(texts[0]);

    const interval = setInterval(() => {
      i = (i + 1) % texts.length;
      setBadgeText(texts[i]);
    }, 2000);
    return () => clearInterval(interval);
  }, [disabled]);

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (disabled) return;
    const msg = chatInput.trim();
    if (!msg || isChatLoading) return;

    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', parts: [{ text: msg }] }]);
    setIsChatLoading(true);

    try {
      // ── Phase-3 Data-Driven Chat (read-only pilot) ──────────────────
      // Runs BEFORE the existing predefined-response/General Chat
      // pipeline below, and is fully separate from it: a matched request
      // here never calls the DB-backed predefined-keyword lookup or
      // `chatWithMolarAI`, and its output is never scanned for the
      // fenced ```json action block / never reaches
      // `window.__MOLAR_ACTIONS__`. See src/aiExperience/dataChat/ for
      // the deterministic router/provider/resolver pipeline this reuses.

      // 1. Explicit task MUTATION requests are intercepted with a
      // deterministic refusal — zero Gemini calls, zero mutation. This is
      // defense-in-depth: `window.__MOLAR_ACTIONS__` is unwired today
      // (see isTaskMutationRequest.ts's file header), but the read-only
      // guarantee must not depend on that remaining true forever.
      if (isTaskMutationRequest(msg)) {
        setChatHistory(prev => [
          ...prev,
          { role: 'model', parts: [{ text: "This data chat can check your to-do information, but it can't make task changes." }] },
        ]);
        // `finally` below still runs setIsChatLoading(false) + the scroll.
        return;
      }

      // 2. Deterministic LOCAL intent classification (no Gemini call).
      const dataRoute = classifyTodoDataIntent(msg);

      if (dataRoute.kind === 'unsupported_scope') {
        setChatHistory(prev => [
          ...prev,
          { role: 'model', parts: [{ text: buildUnsupportedScopeMessage(dataRoute.reason) }] },
        ]);
        return;
      }

      if (dataRoute.kind === 'unsupported_parameter') {
        setChatHistory(prev => [
          ...prev,
          { role: 'model', parts: [{ text: buildUnsupportedParameterMessage(dataRoute.reason) }] },
        ]);
        return;
      }

      if (dataRoute.kind === 'matched') {
        const result = resolveTodoDataQuery(dataRoute.intent, tasks, taskDataStatus);

        let dataChatResponseText;
        if (result.status === 'unavailable') {
          // Unknown/unavailable task state is never reinterpreted as a
          // zero-result answer, and a matched grounded intent owns this
          // request even when its provider is temporarily unavailable —
          // it does not fall through to General Chat.
          dataChatResponseText = "I couldn't check your to-do data right now.";
        } else {
          try {
            // 3. Grounded Gemini phrasing — receives ONLY the question,
            // the approved intent, and the already-minimized, title-free
            // facts. Plain text only; never scanned for action blocks.
            // Gemini supplies only the generic overview/header; the
            // authoritative sanitized task list is always appended locally
            // afterward (composeGroundedTodoResponse is a no-op for
            // non-list intents like todo_summary) — success and failure
            // paths must render the SAME local task-detail layer.
            const modelOverview = await chatWithGroundedTodoFacts(msg, result.intent, result.facts);
            dataChatResponseText = composeGroundedTodoResponse(result.intent, modelOverview, result.localDisplay);
          } catch (groundedErr) {
            // Mandatory deterministic fallback — never falls through to
            // General Chat on a Gemini failure at this stage. Builds
            // BOTH the summary wording and the sanitized local task list
            // from local structured data only.
            console.error('Grounded todo response failed:', groundedErr);
            dataChatResponseText = formatGroundedTodoFallback(result.intent, result.facts, result.localDisplay);
          }
        }

        setChatHistory(prev => [
          ...prev,
          { role: 'model', parts: [{ text: dataChatResponseText }] },
        ]);
        return;
      }
      // ── End Phase-3 Data-Driven Chat (dataRoute.kind === 'no_match') ─

      let response = null;

      // 1. Check custom responses first
      const { data: apps } = await supabase
        .from('aiboard_response_target_apps')
        .select('response_id')
        .in('app_name', ['To-Do Manager', 'All']);

      if (apps && apps.length > 0) {
        const responseIds = apps.map(a => a.response_id);
        const { data: keywords } = await supabase
          .from('aiboard_response_keywords')
          .select('keyword, response_id')
          .in('response_id', responseIds);

        if (keywords && keywords.length > 0) {
          const matchedKeyword = keywords.find(k => msg.toLowerCase().includes(k.keyword.toLowerCase()));

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

      // 2. Fallback to Gemini
      if (!response) {
        response = await chatWithMolarAI(chatHistory, msg, userContext || '');
      }
      
      // Parse actions from backticks if present
      let cleanResponse = response;
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/```\s*(\{[\s\S]*?\})\s*```/);
      
      if (jsonMatch) {
         try {
            const actionObj = JSON.parse(jsonMatch[1]);
            cleanResponse = response.replace(jsonMatch[0], '').trim();
            
            if (actionObj.action && window.__MOLAR_ACTIONS__) {
               const handlers = window.__MOLAR_ACTIONS__;
               const { action, data, id } = actionObj;
               
               console.log('[MolarAI] Executing action:', action, data);
               
               switch(action) {
                  case 'ADD_TASK': handlers.addTask?.(data); break;
                  case 'UPDATE_TASK': handlers.updateTask?.(id, data); break;
                  case 'COMPLETE_TASK': handlers.completeTask?.(id); break;
                  case 'DELETE_TASK': handlers.deleteTask?.(id); break;
                  default: console.warn('[MolarAI] Unknown action:', action);
               }
            }
         } catch (e) {
            console.error('[MolarAI] Action parse failed:', e);
         }
      }

      setChatHistory(prev => [...prev, { role: 'model', parts: [{ text: cleanResponse || "SNAI: Action executed." }] }]);
    } catch (error) {
      setChatHistory(prev => [...prev, { role: 'model', parts: [{ text: "SNAI Error: Unable to process request." }] }]);
    } finally {
      setIsChatLoading(false);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  const handleOpenChat = () => {
    if (disabled) return;
    setIsChatOpen(true);
  };

  const handleClearChat = () => setChatHistory([]);

  return (
    <>
      {/* Floating trigger button - SuperApp Style */}
      {!isChatOpen && (
        <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-center group">
          <div className="relative flex items-center justify-center">
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-[70] pointer-events-none">
              <AnimatePresence mode="wait">
                <motion.div
                  key={badgeText}
                  initial={{ opacity: 0, y: 5, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -5, scale: 0.9 }}
                  className="bg-white text-emerald-500 text-[10px] sm:text-[12px] font-bold tracking-wider px-2 py-0.5 rounded-full shadow-lg shadow-emerald-500/20 whitespace-nowrap"
                >
                  {badgeText}
                </motion.div>
              </AnimatePresence>
            </div>
            <button
              onClick={() => setIsChatOpen(true)}
              disabled={disabled}
              className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-105 hover:shadow-xl transition-all shadow-[#1F7A6F]/30 relative overflow-hidden ${disabled ? 'bg-slate-300 grayscale cursor-not-allowed opacity-70' : 'bg-[#1F7A6F]'}`}
            >
              
              <img 
                src="/images/ai_logo.png" 
                alt="Molar AI" 
                className={`w-10 h-10 object-contain drop-shadow-sm transition-transform ${disabled ? 'brightness-80' : ''}`} 
              />
            </button>
          </div>
        </div>
      )}

      <MolarChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        chatHistory={chatHistory}
        isChatLoading={isChatLoading}
        chatInput={chatInput}
        setChatInput={setChatInput}
        onSendMessage={handleSendMessage}
        onClearChat={handleClearChat}
        onPetToggle={onPetToggle}
        chatEndRef={chatEndRef}
      />


    </>
  );
}
