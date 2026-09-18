import { createTodoSNAIService } from '@mrburdeveloperteam/pet-function/apps/todo';
import { supabase } from '../lib/supabase';
export const { chatWithMolarAI, chatWithGroundedTodoFacts, routeTodoCapability } = createTodoSNAIService(supabase);
export type CapabilityRouteResult = Awaited<ReturnType<typeof routeTodoCapability>>;
