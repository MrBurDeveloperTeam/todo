import { createTodoMolarAdapter as createSharedAdapter, type CreateTodoMolarAdapterDeps } from '@mrburdeveloperteam/pet-function/apps/todo';
import { supabase as supabaseClient } from '../lib/supabase';
import { chatWithMolarAI, chatWithGroundedTodoFacts, routeTodoCapability } from '../services/geminiService';
export function createTodoMolarAdapter(deps: Omit<CreateTodoMolarAdapterDeps, 'supabase' | 'chatWithMolarAI' | 'chatWithGroundedTodoFacts' | 'routeTodoCapability'>) {
  const supabase = supabaseClient as NonNullable<typeof supabaseClient>;
  return createSharedAdapter({ ...deps, supabase, chatWithMolarAI, chatWithGroundedTodoFacts, routeTodoCapability });
}
