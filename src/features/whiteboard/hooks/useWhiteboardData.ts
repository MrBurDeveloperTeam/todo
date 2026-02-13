import { useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { WhiteboardNote } from '@/src/hooks/types';
import { apiFetch } from '@/src/lib/api';
import { toDbRow } from '@/src/features/whiteboard/utils/toDbRow';
import { fromDbRow } from '@/src/features/whiteboard/utils/fromDbRow';
import { WHITEBOARD_ID } from '@/src/features/whiteboard/constants/whiteboard.constants';
import { WhiteboardDrawing, WhiteboardSnapshot } from '@/src/features/whiteboard/types/whiteboard.types';

interface UseWhiteboardDataParams {
  notes: WhiteboardNote[];
  setNotes: React.Dispatch<React.SetStateAction<WhiteboardNote[]>>;
  setSelectedNoteIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  userId: string;
  isOffline?: boolean;
  whiteboardId?: string;
  canShare: boolean;
  highestZIndex: React.MutableRefObject<number>;
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
  const [effectiveWhiteboardId, setEffectiveWhiteboardId] = useState<string>(whiteboardId ?? WHITEBOARD_ID);
  const [whiteboardReady, setWhiteboardReady] = useState(false);

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

  const apiFetchFn = useCallback(async (path: string, options: RequestInit = {}) => {
    return await apiFetch(path, options);
  }, []);

  const upsertNote = useCallback(async (note: WhiteboardNote) => {
    if (isOffline) return;
    if (!userId) return;
    if (!whiteboardReady) return;

    const row = toDbRow(note, effectiveWhiteboardId);
    try {
      await apiFetchFn(`/whiteboard-notes/${note.id}`, {
        method: 'PUT',
        body: JSON.stringify(row),
      });
    } catch (error) {
      console.error('upsertNote error:', error, row);
    }
  }, [isOffline, userId, whiteboardReady, effectiveWhiteboardId, apiFetchFn]);

  const deleteNoteFromDb = useCallback(async (id: string) => {
    if (isOffline) return;
    if (!userId) return;
    if (!whiteboardReady) return;
    try {
      await apiFetchFn(`/whiteboard-notes/${id}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  }, [isOffline, userId, whiteboardReady, apiFetchFn]);

  useEffect(() => {
    if (whiteboardId) {
      setEffectiveWhiteboardId(whiteboardId);
      return;
    }
    if (!userId) return;
    apiFetchFn(`/whiteboards?user_id=${userId}`, { method: 'GET' })
      .then((result) => {
        const first = result?.boards?.[0];
        if (first?.id) setEffectiveWhiteboardId(first.id);
      })
      .catch((error) => {
        console.error('Error fetching user whiteboards:', error);
      });
  }, [whiteboardId, userId, apiFetchFn]);

  useEffect(() => {
    const ensureWhiteboardExists = async () => {
      if (isOffline) return;
      if (!userId) return;
      setWhiteboardReady(false);

      let board = null;
      try {
        const result = await apiFetchFn(`/whiteboards/${effectiveWhiteboardId}`, { method: 'GET' });
        board = result?.board ?? null;
      } catch (error) {
        console.error('whiteboards select error:', error);
        return;
      }

      if (!board) {
        try {
          await apiFetchFn('/whiteboards', {
            method: 'POST',
            body: JSON.stringify({
              id: effectiveWhiteboardId,
              title: 'My Whiteboard',
            }),
          });
        } catch (error) {
          console.error('Failed to create whiteboard:', error);
          return;
        }
      }
      setWhiteboardReady(true);
    };

    void ensureWhiteboardExists();
  }, [userId, isOffline, apiFetchFn, effectiveWhiteboardId]);

  useEffect(() => {
    const fetchNotes = async () => {
      if (isOffline) return;
      if (!userId || !whiteboardReady) return;

      try {
        const result = await apiFetchFn(`/whiteboard-notes?whiteboard_id=${effectiveWhiteboardId}`, {
          method: 'GET',
        });
        const data = result?.notes ?? [];
        const mappedNotes: WhiteboardNote[] = data.map(fromDbRow);
        const maxZ = Math.max(...mappedNotes.map((n) => n.zIndex), 10);
        highestZIndex.current = maxZ;
        setNotes(mappedNotes);
      } catch (error) {
        console.error('Error fetching notes:', error);
      }
    };

    void fetchNotes();
  }, [userId, whiteboardReady, isOffline, setNotes, effectiveWhiteboardId, apiFetchFn, highestZIndex]);

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
      if (!userId) return;
      try {
        const result = await apiFetchFn(`/whiteboard-drawings?whiteboard_id=${effectiveWhiteboardId}`, {
          method: 'GET',
        });
        const data = result?.drawings ?? [];
        const normalized: WhiteboardDrawing[] = data.map((d: any) => ({
          ...d,
          thickness: Number(d?.stroke_width ?? d?.thickness ?? 3),
        }));
        setDrawings(normalized);
      } catch (error) {
        console.error('Error fetching drawings:', error);
      }
    };
    void fetchDrawings();
  }, [userId, apiFetchFn, effectiveWhiteboardId]);

  const saveDrawing = useCallback(async (drawing: WhiteboardDrawing) => {
    if (!userId || drawing.path_points.length < 2) return;
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
      await apiFetchFn(`/whiteboard-drawings/${drawing.id}`, {
        method: 'PUT',
        body: JSON.stringify(withStrokeWidth),
      });
    } catch (error) {
      try {
        await apiFetchFn(`/whiteboard-drawings/${drawing.id}`, {
          method: 'PUT',
          body: JSON.stringify(withoutStrokeWidth),
        });
      } catch (fallbackError) {
        console.error('Error saving drawing:', fallbackError);
      }
    }
  }, [userId, effectiveWhiteboardId, apiFetchFn]);

  const deleteDrawing = useCallback(async (id: string) => {
    setDrawings((prev) => prev.filter((d) => d.id !== id));
    try {
      await apiFetchFn(`/whiteboard-drawings/${id}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Error deleting drawing:', error);
    }
  }, [apiFetchFn]);

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
      await apiFetchFn(`/whiteboard-drawings/${drawing.id}`, {
        method: 'PUT',
        body: JSON.stringify(withStrokeWidth),
      });
    } catch (error) {
      try {
        await apiFetchFn(`/whiteboard-drawings/${drawing.id}`, {
          method: 'PUT',
          body: JSON.stringify(withoutStrokeWidth),
        });
      } catch (fallbackError) {
        console.error('Error upserting drawing:', fallbackError);
      }
    }
  }, [isOffline, userId, whiteboardReady, effectiveWhiteboardId, apiFetchFn]);

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
      ...drawingIdsToDelete.map((id) => apiFetchFn(`/whiteboard-drawings/${id}`, { method: 'DELETE' })),
    ]);
  }, [isOffline, userId, whiteboardReady, upsertNote, deleteNoteFromDb, upsertDrawing, apiFetchFn]);

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
        drawingIds.map((id) => apiFetchFn(`/whiteboard-drawings/${id}`, { method: 'DELETE' }))
      );
    } catch (error) {
      console.error('Error clearing all drawings:', error);
    }
  }, [saveHistorySnapshot, apiFetchFn]);

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
      const baseUrl = (import.meta as any).env?.VITE_PUBLIC_BASE_URL || 'http://172.26.144.1:3000/To-Do-List/';
      const existing = await apiFetchFn(`/whiteboard-shares?whiteboard_id=${effectiveWhiteboardId}`, { method: 'GET' });
      let shareId = existing?.shares?.[0]?.id;
      if (!shareId) {
        shareId = crypto.randomUUID();
        await apiFetchFn('/whiteboard-shares', {
          method: 'POST',
          body: JSON.stringify({
            id: shareId,
            whiteboard_id: effectiveWhiteboardId,
          }),
        });
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
  }, [canShare, apiFetchFn, effectiveWhiteboardId]);

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
