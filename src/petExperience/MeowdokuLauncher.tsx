import { SharedMeowdokuLauncher } from '@mrburdeveloperteam/pet-function/pet';
import { supabase } from '../lib/supabase';
import { todoPetRepository } from './todoPetRepository';

export default function MeowdokuLauncher(props: { isOpen: boolean; onClose: () => void; userId: string }) {
  if (!supabase) return null;
  return <SharedMeowdokuLauncher key={props.userId} {...props} repository={todoPetRepository} rpcClient={supabase} />;
}
