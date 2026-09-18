import { createTodoMolarAIFloat } from '@mrburdeveloperteam/pet-function/apps/todo';
import { supabase } from '../lib/supabase';
const MolarAIFloat = createTodoMolarAIFloat({ supabase });
export default MolarAIFloat;
