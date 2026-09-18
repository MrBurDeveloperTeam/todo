import { createTodoVirtualPet } from '@mrburdeveloperteam/pet-function/apps/todo';
import { supabase as supabaseClient } from '../lib/supabase';
import { todoPetRepository } from './todoPetRepository';
const supabase = supabaseClient as NonNullable<typeof supabaseClient>;
const TodoVirtualPet = createTodoVirtualPet(supabase, todoPetRepository);
export default TodoVirtualPet;
