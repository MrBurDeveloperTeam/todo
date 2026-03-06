import { useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { WhiteboardNote } from '@/src/hooks/types';
import { supabase } from '@/src/lib/supabaseClient';
import { toDbRow } from '@/src/features/whiteboard/utils/toDbRow';
import { fromDbRow } from '@/src/features/whiteboard/utils/fromDbRow';
import { WHITEBOARD_ID } from '@/src/features/whiteboard/constants/whiteboard.constants';
import { WhiteboardDrawing, WhiteboardSnapshot } from '@/src/features/whiteboard/types/whiteboard.types';

interface UseWhiteboardDataParams {
  notes: WhiteboardNote[];
  setNotes: React.Dispatch<React.SetStateAction<WhiteboardNote[]>>;
  setSelectedNoteIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  userId: string | null;
  isOffline?: boolean;
  whiteboardId?: string;
  canShare: boolean;
  highestZIndex: React.MutableRefObject<number>;
}

function isValidUUID(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export function useWhiteboardData({
  notes,
  setNotes,
  setSelectedNoteIds,
  userId,
  isOffline,
  whiteboardId,
  canShare,
  highestZIndex,
}: UseWhiteboardDataParams) {
  const saveTimers = useRef<Record<string, number>>({});
  const drawingSaveTimers = useRef<Record<string, number>>({});
  const [effectiveWhiteboardId, setEffectiveWhiteboardId] = useState<string>(whiteboardId ?? WHITEBOARD_ID);
  const [whiteboardReady, setWhiteboardReady] = useState(false);
  // Use null for guest users (user_id is nullable)
  const writeUserId = (userId && isValidUUID(userId)) ? userId : null;

  const [drawings, setDrawings] = useState<WhiteboardDrawing[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penColor, setPenColor] = useState('black');
  const [penThickness, setPenThickness] = useState(3);
  const currentPathRef = useRef<{ x: number; y: number }[]>([]);
  const drawingsRef = useRef<typeof drawings>([]);
  const currentDrawingIdRef = useRef<string | null>(null);
  const cancelCurrentDrawingRef = useRef(false);

  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareQrDataUrl, setShareQrDataUrl] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  const [history, setHistory] = useState<WhiteboardSnapshot[]>([]);
  const [future, setFuture] = useState<WhiteboardSnapshot[]>([]);

  const upsertNote = useCallback(async (note: WhiteboardNote) => {
    if (isOffline) return;
    if (!whiteboardReady) return;

    const row = toDbRow(note, effectiveWhiteboardId, writeUserId);
    try {
      const { error } = await supabase
        .from('whiteboard_notes')
        .upsert(row, { onConflict: 'id' });
      if (error) throw error;
    } catch (error) {
      console.error('upsertNote error:', error, row);
    }
  }, [isOffline, writeUserId, whiteboardReady, effectiveWhiteboardId]);

  const deleteNoteFromDb = useCallback(async (id: string) => {
    if (isOffline) return;
    if (!whiteboardReady) return;
    try {
      const { error } = await supabase.from('whiteboard_notes').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  }, [isOffline, writeUserId, whiteboardReady]);

  useEffect(() => {
    if (whiteboardId) {
      setEffectiveWhiteboardId(whiteboardId);
      return;
    }
    if (!userId || !isValidUUID(userId)) return;

    const fetchBoard = async () => {
      try {
        const { data, error } = await supabase
          .from('whiteboards')
          .select('id')
          .eq('user_id', userId)
          .limit(1);

        if (error) throw error;
        const first = data?.[0];
        if (first?.id) setEffectiveWhiteboardId(first.id as string);
      } catch (error) {
        console.error('Error fetching user whiteboards:', error);
      }
    };

    void fetchBoard();
  }, [whiteboardId, userId]);

  useEffect(() => {
    const ensureWhiteboardExists = async () => {
      if (isOffline) return;
      if (!userId) return;

      // If whiteboardId was explicitly passed (shared page), the board already
      // exists on the owner's side.  Skip the select/insert check which would
      // fail for guest users due to RLS.
      if (whiteboardId) {
        setWhiteboardReady(true);
        return;
      }

      if (!isValidUUID(userId) || !isValidUUID(effectiveWhiteboardId)) return;

      setWhiteboardReady(false);

      let board = null;
      try {
        const { data, error } = await supabase
          .from('whiteboards')
          .select('id')
          .eq('id', effectiveWhiteboardId)
          .maybeSingle();
        if (error) throw error;
        board = data ?? null;
      } catch (error) {
        console.error('whiteboards select error:', error);
        return;
      }

      if (!board) {
        try {
          const { error } = await supabase.from('whiteboards').insert({
            id: effectiveWhiteboardId,
            title: 'My Whiteboard',
            user_id: userId,
          });
          if (error) throw error;
        } catch (error) {
          console.error('Failed to create whiteboard:', error);
          return;
        }
      }
      setWhiteboardReady(true);
    };

    void ensureWhiteboardExists();
  }, [userId, isOffline, effectiveWhiteboardId, whiteboardId]);

  useEffect(() => {
    const fetchNotes = async () => {
      if (isOffline) return;
      if (!userId || !isValidUUID(effectiveWhiteboardId) || !whiteboardReady) return;

      try {
        const { data, error } = await supabase
          .from('whiteboard_notes')
          .select('*')
          .eq('whiteboard_id', effectiveWhiteboardId);
        if (error) throw error;
        const notesData = data ?? [];
        const mappedNotes: WhiteboardNote[] = notesData.map(fromDbRow);
        const maxZ = Math.max(...mappedNotes.map((n) => n.zIndex), 10);
        highestZIndex.current = maxZ;
        setNotes(mappedNotes);
      } catch (error) {
        console.error('Error fetching notes:', error);
      }
    };

    void fetchNotes();
  }, [userId, whiteboardReady, isOffline, setNotes, effectiveWhiteboardId, highestZIndex]);

  // Polling for shared boards — refetch notes & drawings every 3s
  // This is the reliable sync path for unauthenticated phone users
  useEffect(() => {
    if (!whiteboardId || !whiteboardReady || isOffline) return;
    if (!userId || !isValidUUID(effectiveWhiteboardId)) return;

    const poll = async () => {
      try {
        // Fetch notes
        const { data: notesData } = await supabase
          .from('whiteboard_notes')
          .select('*')
          .eq('whiteboard_id', effectiveWhiteboardId);
        if (notesData) {
          const mapped: WhiteboardNote[] = notesData.map(fromDbRow);
          const maxZ = Math.max(...mapped.map((n) => n.zIndex), 10);
          highestZIndex.current = maxZ;
          setNotes(mapped);
        }

        // Fetch drawings (skip if user is actively drawing)
        if (!currentDrawingIdRef.current) {
          const { data: drawData } = await supabase
            .from('whiteboard_drawings')
            .select('*')
            .eq('whiteboard_id', effectiveWhiteboardId);
          if (drawData) {
            const normalized: WhiteboardDrawing[] = drawData.map((d: any) => ({
              ...d,
              thickness: Number(d?.stroke_width ?? d?.thickness ?? 3),
            }));
            setDrawings(normalized);
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    };

    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [whiteboardId, whiteboardReady, isOffline, userId, effectiveWhiteboardId, setNotes, setDrawings, highestZIndex, currentDrawingIdRef]);

  const scheduleSaveNote = useCallback((note: WhiteboardNote) => {
    const id = note.id;
    if (saveTimers.current[id]) {
      window.clearTimeout(saveTimers.current[id]);
    }
    saveTimers.current[id] = window.setTimeout(() => {
      void upsertNote(note);
      delete saveTimers.current[id];
    }, 400);
  }, [upsertNote]);

  useEffect(() => {
    drawingsRef.current = drawings;
  }, [drawings]);

  useEffect(() => {
    const fetchDrawings = async () => {
      if (!userId || !isValidUUID(effectiveWhiteboardId)) return;
      try {
        const { data, error } = await supabase
          .from('whiteboard_drawings')
          .select('*')
          .eq('whiteboard_id', effectiveWhiteboardId);
        if (error) throw error;
        const drawingsData = data ?? [];
        const normalized: WhiteboardDrawing[] = drawingsData.map((d: any) => ({
          ...d,
          thickness: Number(d?.stroke_width ?? d?.thickness ?? 3),
        }));
        setDrawings(normalized);
      } catch (error) {
        console.error('Error fetching drawings:', error);
      }
    };
    void fetchDrawings();
  }, [userId, effectiveWhiteboardId]);

  useEffect(() => {
    if (isOffline || !isValidUUID(effectiveWhiteboardId) || !whiteboardReady) return;

    const channel = supabase
      .channel(`rt_whiteboard_${effectiveWhiteboardId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'whiteboard_notes', filter: `whiteboard_id=eq.${effectiveWhiteboardId}` },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newNote = fromDbRow(payload.new as any);
            setNotes((prev) => {
              const idx = prev.findIndex((n) => n.id === newNote.id);
              if (idx !== -1) {
                const next = [...prev];
                // Only update if it actually changed to avoid unnecessary re-renders
                // but for simplicity we replace it
                next[idx] = newNote;
                return next;
              }
              return [...prev, newNote];
            });
          } else if (payload.eventType === 'DELETE') {
            setNotes((prev) => prev.filter((n) => n.id !== payload.old.id));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'whiteboard_drawings', filter: `whiteboard_id=eq.${effectiveWhiteboardId}` },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const row = payload.new as any;
            const newDrawing: WhiteboardDrawing = {
              ...row,
              thickness: Number(row?.stroke_width ?? row?.thickness ?? 3),
            };
            setDrawings((prev) => {
              // don't overwrite the stroke the current user is actively drawing
              if (currentDrawingIdRef.current === newDrawing.id) return prev;
              const idx = prev.findIndex((d) => d.id === newDrawing.id);
              if (idx !== -1) {
                const copy = [...prev];
                copy[idx] = newDrawing;
                return copy;
              }
              return [...prev, newDrawing];
            });
          } else if (payload.eventType === 'DELETE') {
            setDrawings((prev) => {
              if (currentDrawingIdRef.current === payload.old.id) return prev;
              return prev.filter((d) => d.id !== payload.old.id);
            });
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isOffline, effectiveWhiteboardId, whiteboardReady, currentDrawingIdRef, setNotes, setDrawings]);

  const saveDrawing = useCallback(async (drawing: WhiteboardDrawing) => {
    if (drawing.path_points.length < 2) return;
    const withStrokeWidth = {
      id: drawing.id,
      whiteboard_id: effectiveWhiteboardId,
      user_id: writeUserId,
      path_points: drawing.path_points,
      color: drawing.color,
      stroke_width: drawing.thickness ?? 3,
    };
    const withoutStrokeWidth = {
      id: drawing.id,
      whiteboard_id: effectiveWhiteboardId,
      user_id: writeUserId,
      path_points: drawing.path_points,
      color: drawing.color,
    };
    try {
      const { error } = await supabase
        .from('whiteboard_drawings')
        .upsert(withStrokeWidth, { onConflict: 'id' });
      if (error) throw error;
    } catch (error) {
      try {
        const { error: fallbackError } = await supabase
          .from('whiteboard_drawings')
          .upsert(withoutStrokeWidth, { onConflict: 'id' });
        if (fallbackError) throw fallbackError;
      } catch (fallbackError) {
        console.error('Error saving drawing:', fallbackError);
      }
    }
  }, [writeUserId, effectiveWhiteboardId]);

  const scheduleSaveDrawing = useCallback((drawing: WhiteboardDrawing) => {
    const id = drawing.id;
    if (drawingSaveTimers.current[id]) {
      window.clearTimeout(drawingSaveTimers.current[id]);
    }
    drawingSaveTimers.current[id] = window.setTimeout(() => {
      void saveDrawing(drawing);
      delete drawingSaveTimers.current[id];
    }, 1000);
  }, [saveDrawing]);

  const deleteDrawing = useCallback(async (id: string) => {
    setDrawings((prev) => prev.filter((d) => d.id !== id));
    try {
      const { error } = await supabase.from('whiteboard_drawings').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting drawing:', error);
    }
  }, []);

  const upsertDrawing = useCallback(async (drawing: WhiteboardDrawing) => {
    if (isOffline) return;
    if (!userId) return;
    if (!whiteboardReady) return;

    const withStrokeWidth = {
      id: drawing.id,
      whiteboard_id: effectiveWhiteboardId,
      user_id: userId,
      path_points: drawing.path_points,
      color: drawing.color,
      stroke_width: drawing.thickness ?? 3,
    };
    const withoutStrokeWidth = {
      id: drawing.id,
      whiteboard_id: effectiveWhiteboardId,
      user_id: userId,
      path_points: drawing.path_points,
      color: drawing.color,
    };

    try {
      const { error } = await supabase
        .from('whiteboard_drawings')
        .upsert(withStrokeWidth, { onConflict: 'id' });
      if (error) throw error;
    } catch (error) {
      try {
        const { error: fallbackError } = await supabase
          .from('whiteboard_drawings')
          .upsert(withoutStrokeWidth, { onConflict: 'id' });
        if (fallbackError) throw fallbackError;
      } catch (fallbackError) {
        console.error('Error upserting drawing:', fallbackError);
      }
    }
  }, [isOffline, userId, whiteboardReady, effectiveWhiteboardId]);

  const buildSnapshot = useCallback((): WhiteboardSnapshot => ({
    notes: notes.map((n) => ({ ...n })),
    drawings: drawings.map((d) => ({
      ...d,
      path_points: d.path_points.map((p) => ({ ...p })),
    })),
  }), [notes, drawings]);

  const saveHistorySnapshot = useCallback(() => {
    setHistory((prev) => [...prev, buildSnapshot()].slice(-50));
    setFuture([]);
  }, [buildSnapshot]);

  const clearPendingNoteSaves = useCallback(() => {
    Object.values(saveTimers.current).forEach((timerId) => window.clearTimeout(timerId));
    saveTimers.current = {};
  }, []);

  const syncSnapshotToDb = useCallback(async (from: WhiteboardSnapshot, to: WhiteboardSnapshot) => {
    if (isOffline) return;
    if (!userId) return;
    if (!whiteboardReady) return;

    const fromNoteIds = new Set(from.notes.map((n) => n.id));
    const toNoteIds = new Set(to.notes.map((n) => n.id));
    const noteIdsToDelete = Array.from(fromNoteIds).filter((id) => !toNoteIds.has(id));

    const fromDrawingIds = new Set(from.drawings.map((d) => d.id));
    const toDrawingIds = new Set(to.drawings.map((d) => d.id));
    const drawingIdsToDelete = Array.from(fromDrawingIds).filter((id) => !toDrawingIds.has(id));

    await Promise.all([
      ...to.notes.map((note) => upsertNote(note)),
      ...noteIdsToDelete.map((id) => deleteNoteFromDb(id)),
      ...to.drawings.map((drawing) => upsertDrawing(drawing)),
      ...drawingIdsToDelete.map((id) => supabase.from('whiteboard_drawings').delete().eq('id', id)),
    ]);
  }, [isOffline, userId, whiteboardReady, upsertNote, deleteNoteFromDb, upsertDrawing]);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const current = buildSnapshot();
    const previous = history[history.length - 1];
    clearPendingNoteSaves();
    setFuture((prev) => [current, ...prev]);
    setHistory((prev) => prev.slice(0, -1));
    setNotes(previous.notes);
    setDrawings(previous.drawings);
    setSelectedNoteIds(new Set());
    void syncSnapshotToDb(current, previous);
  }, [history, buildSnapshot, clearPendingNoteSaves, setNotes, setSelectedNoteIds, syncSnapshotToDb]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const current = buildSnapshot();
    const next = future[0];
    clearPendingNoteSaves();
    setHistory((prev) => [...prev, current]);
    setFuture((prev) => prev.slice(1));
    setNotes(next.notes);
    setDrawings(next.drawings);
    setSelectedNoteIds(new Set());
    void syncSnapshotToDb(current, next);
  }, [future, buildSnapshot, clearPendingNoteSaves, setNotes, setSelectedNoteIds, syncSnapshotToDb]);

  const clearAllDrawings = useCallback(async () => {
    const drawingIds = drawingsRef.current.map((drawing) => drawing.id);
    if (drawingIds.length === 0) return;
    saveHistorySnapshot();

    setDrawings([]);
    cancelCurrentDrawingRef.current = true;
    setIsDrawing(false);
    currentPathRef.current = [];
    currentDrawingIdRef.current = null;

    try {
      await Promise.all(
        drawingIds.map((id) => supabase.from('whiteboard_drawings').delete().eq('id', id))
      );
    } catch (error) {
      console.error('Error clearing all drawings:', error);
    }
  }, [saveHistorySnapshot]);

  const checkEraserCollision = useCallback((x: number, y: number) => {
    const ERASER_RADIUS = 10;
    const idsToDelete: string[] = [];

    if (currentDrawingIdRef.current && currentPathRef.current.length > 0) {
      const hitCurrent = currentPathRef.current.some((p) => {
        const dist = Math.sqrt(Math.pow(p.x - x, 2) + Math.pow(p.y - y, 2));
        return dist <= ERASER_RADIUS;
      });
      if (hitCurrent) {
        cancelCurrentDrawingRef.current = true;
        setIsDrawing(false);
        currentPathRef.current = [];
        const idToRemove = currentDrawingIdRef.current;
        currentDrawingIdRef.current = null;
        setDrawings((prev) => prev.filter((d) => d.id !== idToRemove));
        return;
      }
    }

    drawingsRef.current.forEach((drawing) => {
      for (const p of drawing.path_points) {
        const dist = Math.sqrt(Math.pow(p.x - x, 2) + Math.pow(p.y - y, 2));
        if (dist <= ERASER_RADIUS) {
          idsToDelete.push(drawing.id);
          break;
        }
      }
    });

    if (idsToDelete.length > 0) {
      idsToDelete.forEach((id) => {
        void deleteDrawing(id);
      });
    }

    if (currentDrawingIdRef.current && idsToDelete.includes(currentDrawingIdRef.current)) {
      cancelCurrentDrawingRef.current = true;
      setIsDrawing(false);
      currentPathRef.current = [];
      currentDrawingIdRef.current = null;
    }
  }, [deleteDrawing]);

  const openShare = useCallback(async () => {
    if (!canShare) return;
    setShareLoading(true);
    setShareError(null);
    try {
      let baseUrl = (import.meta as any).env?.VITE_PUBLIC_BASE_URL || window.location.origin;
      // Strip any path component — we only need the origin (protocol + host + port)
      try {
        const parsed = new URL(baseUrl);
        baseUrl = parsed.origin;
      } catch {
        // fallback: already just an origin
      }
      if (baseUrl.includes('localhost')) {
        baseUrl = baseUrl.replace('localhost', '192.168.0.123');
      }
      const { data: existingData, error: existingError } = await supabase
        .from('whiteboard_shares')
        .select('id')
        .eq('whiteboard_id', effectiveWhiteboardId)
        .limit(1);
      if (existingError) throw existingError;
      let shareId = existingData?.[0]?.id as string | undefined;
      if (!shareId) {
        shareId = uuidv4();
        const { error } = await supabase.from('whiteboard_shares').insert({
          id: shareId,
          whiteboard_id: effectiveWhiteboardId,
        });
        if (error) throw error;
      }

      const url = `${baseUrl.replace(/\/$/, '')}/share/${shareId}`;
      setShareUrl(url);
      const dataUrl = await QRCode.toDataURL(url, { width: 220, margin: 1 });
      setShareQrDataUrl(dataUrl);
      setIsShareOpen(true);
    } catch (e) {
      console.error('Share error:', e);
      setShareError('Failed to create share link.');
    } finally {
      setShareLoading(false);
    }
  }, [canShare, effectiveWhiteboardId]);

  return {
    effectiveWhiteboardId,
    whiteboardReady,
    drawings,
    setDrawings,
    isDrawing,
    setIsDrawing,
    penColor,
    setPenColor,
    penThickness,
    setPenThickness,
    currentPathRef,
    drawingsRef,
    currentDrawingIdRef,
    cancelCurrentDrawingRef,
    upsertNote,
    deleteNoteFromDb,
    scheduleSaveNote,
    saveDrawing,
    scheduleSaveDrawing,
    upsertDrawing,
    clearAllDrawings,
    checkEraserCollision,
    saveHistorySnapshot,
    history,
    future,
    undo,
    redo,
    openShare,
    isShareOpen,
    setIsShareOpen,
    shareUrl,
    shareQrDataUrl,
    shareLoading,
    shareError,
  };
}
