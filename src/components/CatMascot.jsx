import { createTodoCatMascot } from '@mrburdeveloperteam/pet-function/apps/todo';
import { supabase } from '../lib/supabase';
const CatMascot = createTodoCatMascot(supabase);
export default CatMascot;
