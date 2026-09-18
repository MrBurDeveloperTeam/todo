import { createTodoMolarAIFloat } from '@mrburdeveloperteam/pet-function/apps/todo';
import { supabase } from '../lib/supabase';
import { chatWithMolarAI, chatWithGroundedTodoFacts, routeTodoCapability } from '../services/geminiService';
const MolarAIFloat = createTodoMolarAIFloat({ supabase, chatWithMolarAI, chatWithGroundedTodoFacts, routeTodoCapability });
export default MolarAIFloat;
