import { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabaseClient';
import { WhiteboardNote } from './types';
import { fromDbRow } from '@/src/features/whiteboard/utils/fromDbRow';
import { toDbRow } from '@/src/features/whiteboard/utils/toDbRow';


export function useWhiteboard(whiteboardId: string) {
  const [notes, setNotes] = useState<WhiteboardNote[]>([]);
  const [loading, setLoading] = useState(true);

  // Load notes
  useEffect(() => {
    const loadNotes = async () => {
      try {
        const { data, error } = await supabase
          .from('whiteboard_notes')
          .select('*')
          .eq('whiteboard_id', whiteboardId);
        if (error) throw error;
        setNotes((data ?? []).map(fromDbRow));
      } catch (error) {
        console.error('Failed to load whiteboard notes:', error);
      } finally {
        setLoading(false);
      }
    };

    loadNotes();
  }, [whiteboardId]);

  // Save notes (manual for now)
  const saveNotes = async (notesToSave: WhiteboardNote[]) => {
    await Promise.all(
      notesToSave.map((n) =>
        supabase
          .from('whiteboard_notes')
          .upsert(toDbRow(n, whiteboardId), { onConflict: 'id' })
      )
    );
  };


  return { notes, setNotes, saveNotes, loading };
}

