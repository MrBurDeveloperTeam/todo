import React, { useState, useRef, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';
import { Task, WhiteboardNote } from '@/src/hooks/types';
import { apiFetch } from '@/src/lib/api';

// ✅ Use a real UUID for the whiteboard too
const WHITEBOARD_ID = 'a1111111-b222-c333-d444-e55555555555';

// --- Constants ---
const LANDSCAPE_SIZE = { width: 1920, height: 1080 };
const PORTRAIT_SIZE = { width: 1080, height: 1920 };
const MIN_SIZE = 150;
const REMINDER_CHECKED_PREFIX = '[x] ';
const REMINDER_UNCHECKED_PREFIX = '[ ] ';

interface WhiteboardProps {
  toggleTheme: () => void;
  isDarkMode: boolean;
  notes: WhiteboardNote[];
  setNotes: React.Dispatch<React.SetStateAction<WhiteboardNote[]>>;
  userId: string;
  tasks?: Task[];
  isOffline?: boolean;
  whiteboardId?: string;
  allowShare?: boolean;
}

type ToolType = 'select' | 'hand' | 'note' | 'reminder' | 'text' | 'image' | 'pen' | 'eraser';
type WhiteboardDrawing = {
  id: string;
  user_id: string;
  whiteboard_id: string;
  path_points: { x: number; y: number }[];
  color: string;
  thickness?: number;
};

type WhiteboardSnapshot = {
  notes: WhiteboardNote[];
  drawings: WhiteboardDrawing[];
};

const COLORS = {
  yellow: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/40',
    border: 'border-yellow-200 dark:border-yellow-700',
    hex: '#fef3c7',
    accent: 'bg-yellow-400'
  },
  pink: {
    bg: 'bg-pink-100 dark:bg-pink-900/40',
    border: 'border-pink-200 dark:border-pink-700',
    hex: '#fce7f3',
    accent: 'bg-pink-400'
  },
  blue: {
    bg: 'bg-blue-100 dark:bg-blue-900/40',
    border: 'border-blue-200 dark:border-blue-700',
    hex: '#dbeafe',
    accent: 'bg-blue-400'
  },
  green: {
    bg: 'bg-green-100 dark:bg-green-900/40',
    border: 'border-green-200 dark:border-green-700',
    hex: '#dcfce7',
    accent: 'bg-green-400'
  },
  transparent: {
    bg: 'bg-transparent',
    border: 'border-transparent hover:border-slate-300/50',
    hex: 'transparent',
    accent: 'bg-slate-400'
  }
};

const Whiteboard: React.FC<WhiteboardProps> = ({
  toggleTheme,
  notes,
  setNotes,
  userId,
  tasks = [],
  isOffline,
  whiteboardId,
  allowShare
}) => {
  const saveTimers = useRef<Record<string, number>>({});
  const [effectiveWhiteboardId, setEffectiveWhiteboardId] = useState<string>(
    whiteboardId ?? WHITEBOARD_ID
  );
  const canShare = allowShare !== false;
  const apiFetchFn = useCallback(
    async (path: string, options: RequestInit = {}) => {
      return await apiFetch(path, options);
    },
    []
  );

  // ✅ Prevent notes upsert before whiteboard exists (FK fix)
  const [whiteboardReady, setWhiteboardReady] = useState(false);

  // ----------------------------
  // DB Helpers
  // ----------------------------
  const toDbRow = (n: WhiteboardNote) => ({
    // NOTE: This assumes whiteboard_notes.id is UUID
    id: n.id,
    whiteboard_id: effectiveWhiteboardId, // must exist in whiteboards

    type: n.type,
    x: n.x,
    y: n.y,
    width: n.width,
    height: n.height,
    rotation: n.rotation ?? 0,
    z_index: n.zIndex ?? 0,

    color: n.color ?? 'yellow',
    content: n.content ?? '',
    title: n.title ?? '',
    image_url: n.imageUrl ?? null,
    font_size: n.fontSize ?? 16,

    updated_at: new Date().toISOString()
  });

  const upsertNote = async (note: WhiteboardNote) => {
    if (isOffline) {
      console.log('Upsert Skipped: Offline');
      return;
    }
    if (!userId) {
      console.log('Upsert Skipped: No User ID');
      return;
    }
    if (!whiteboardReady) {
      console.log('Upsert Skipped: Whiteboard Not Ready');
      return;
    }

    // console.log('Upserting Note:', note.id);
    const row = toDbRow(note);

      try {
        await apiFetchFn(`/whiteboard-notes/${note.id}`, {
          method: 'PUT',
          body: JSON.stringify(row),
        });
        console.log('Upsert Success:', note.id);
      } catch (error) {
        console.error('upsertNote error:', error, row);
      }
    };

  const deleteNoteFromDb = async (id: string) => {
    if (isOffline) return;
    if (!userId) return;
    if (!whiteboardReady) return;

      try {
        await apiFetchFn(`/whiteboard-notes/${id}`, { method: 'DELETE' });
      } catch (error) {
        console.error('Error deleting note:', error);
      }
    };

  // ----------------------------
  // Ensure Whiteboard Exists (FK prerequisite)
  // ----------------------------
  useEffect(() => {
    if (whiteboardId) {
      setEffectiveWhiteboardId(whiteboardId);
      return;
    }
    if (!userId) return;
    // Fetch user's whiteboard id from API
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
      console.log('Ensure Whiteboard: Starting check', { userId, isOffline });
      if (isOffline) {
        console.log('Ensure Whiteboard: Offline mode, skipping DB check.');
        return;
      }
      if (!userId) {
        console.log('Ensure Whiteboard: No userId found yet.');
        return;
      }

      setWhiteboardReady(false);

      let board = null;
      try {
        const result = await apiFetchFn(`/whiteboards/${effectiveWhiteboardId}`, {
          method: 'GET',
        });
        board = result?.board ?? null;
      } catch (error) {
        console.error('whiteboards select error:', error);
        return;
      }

      if (!board) {
        console.log('Whiteboard missing, creating...', effectiveWhiteboardId);

        try {
          await apiFetchFn('/whiteboards', {
            method: 'POST',
            body: JSON.stringify({
              id: effectiveWhiteboardId,
              title: 'My Whiteboard',
            }),
          });
          console.log('Whiteboard created successfully');
        } catch (error) {
          console.error('Failed to create whiteboard:', error);
          return;
        }
      } else {
        console.log('Whiteboard exists found:', board);
      }

      console.log('Whiteboard Ready: TRUE');
      setWhiteboardReady(true);
    };

    ensureWhiteboardExists();
  }, [userId, isOffline, apiFetchFn, effectiveWhiteboardId]);

  // ----------------------------
  // Fetch Notes on Load
  // ----------------------------
  const mapDbNote = useCallback((n: any): WhiteboardNote => ({
    id: n.id,
    type: n.type,
    x: n.x ?? 100,
    y: n.y ?? 100,
    width: n.width ?? 200,
    height: n.height ?? 200,
    rotation: n.rotation ?? 0,
    zIndex: n.z_index ?? 1,
    color: n.color ?? 'yellow',
    content: n.content ?? '',
    title: n.title ?? '',
    imageUrl: n.image_url,
    fontSize: n.font_size ?? 16,
    createdAt: new Date(n.created_at).getTime(),
  }), []);

  useEffect(() => {
    const fetchNotes = async () => {
      if (isOffline) return;
      if (!userId || !whiteboardReady) return;

      console.log('Fetching Notes...');
      try {
        const result = await apiFetchFn(`/whiteboard-notes?whiteboard_id=${effectiveWhiteboardId}`, {
          method: 'GET',
        });
        const data = result?.notes ?? [];
        console.log('Notes Fetched:', data.length);
        if (data.length > 0) {
          console.log('Sample Note Data:', data[0]);
        }

        const mappedNotes: WhiteboardNote[] = data.map(mapDbNote);

        // Update highestZIndex to match loaded notes
        const maxZ = Math.max(...mappedNotes.map(n => n.zIndex), 10);
        highestZIndex.current = maxZ;

        setNotes(mappedNotes);
      } catch (error) {
        console.error('Error fetching notes:', error);
      }
    };

    fetchNotes();
  }, [userId, whiteboardReady, isOffline, setNotes, mapDbNote, effectiveWhiteboardId, apiFetchFn]);

  // ----------------------------
  // Debounced Autosave
  // ----------------------------
  function scheduleSaveNote(note: WhiteboardNote) {
    const id = note.id;

    if (saveTimers.current[id]) {
      window.clearTimeout(saveTimers.current[id]);
    }

    saveTimers.current[id] = window.setTimeout(() => {
      // helpful debug
      // console.log('Auto-saving note exec', { id, userId, whiteboardReady });
      upsertNote(note);
      delete saveTimers.current[id];
    }, 400);
  }




  // --- State ---
  const [view, setView] = useState({ scale: 0.75 });
  const [canvasSize, setCanvasSize] = useState(LANDSCAPE_SIZE);
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());

  // --- Drawing State ---
  const [drawings, setDrawings] = useState<WhiteboardDrawing[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penColor, setPenColor] = useState('black');
  const [penThickness, setPenThickness] = useState(3);
  const currentPathRef = useRef<{ x: number; y: number }[]>([]);
  const drawingsRef = useRef<typeof drawings>([]);
  const currentDrawingIdRef = useRef<string | null>(null);
  const cancelCurrentDrawingRef = useRef(false);

  useEffect(() => {
    drawingsRef.current = drawings;
  }, [drawings]);

  // --- Fetch Drawings ---
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
    fetchDrawings();
  }, [userId, apiFetchFn, effectiveWhiteboardId]);

  const saveDrawing = async (drawing: WhiteboardDrawing) => {
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
  };

  const deleteDrawing = async (id: string) => {
    // Optimistic Update
    setDrawings(prev => prev.filter(d => d.id !== id));

    // DB Update
    try {
      await apiFetchFn(`/whiteboard-drawings/${id}`, { method: 'DELETE' });
    } catch (error) {
      console.error('Error deleting drawing:', error);
    }
  };

  const upsertDrawing = async (drawing: WhiteboardDrawing) => {
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
  };

  const clearAllDrawings = async () => {
    const drawingIds = drawingsRef.current.map((drawing) => drawing.id);
    if (drawingIds.length === 0) return;
    saveHistorySnapshot();

    // Clear canvas immediately.
    setDrawings([]);

    // Cancel in-progress drawing to avoid restoring it on pointer-up.
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
  };

  const checkEraserCollision = (x: number, y: number) => {
    const ERASER_RADIUS = 10; // px
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

    drawingsRef.current.forEach(drawing => {
      // Simple bounding box check first (optimization)
      // skipping for now, direct point check
      for (const p of drawing.path_points) {
        const dist = Math.sqrt(Math.pow(p.x - x, 2) + Math.pow(p.y - y, 2));
        if (dist <= ERASER_RADIUS) {
          idsToDelete.push(drawing.id);
          break; // Stop checking this drawing, it's already marked
        }
      }
    });

    if (idsToDelete.length > 0) {
      idsToDelete.forEach(id => deleteDrawing(id));
    }

    if (currentDrawingIdRef.current && idsToDelete.includes(currentDrawingIdRef.current)) {
      cancelCurrentDrawingRef.current = true;
      setIsDrawing(false);
      currentPathRef.current = [];
      currentDrawingIdRef.current = null;
    }
  };


  // Modify this part to include the new drawing tool
  const handleToolChange = (tool: ToolType) => {
    if (activeTool === 'pen' && isDrawing) {
      cancelCurrentDrawingRef.current = true;
      setIsDrawing(false);
      currentPathRef.current = [];
      if (currentDrawingIdRef.current) {
        const idToRemove = currentDrawingIdRef.current;
        setDrawings(prev => prev.filter(d => d.id !== idToRemove));
      }
      currentDrawingIdRef.current = null;
    }
    setActiveTool(tool);
  };

  const openShare = async () => {
    if (!canShare) return;
    setShareLoading(true);
    setShareError(null);
    try {
      const baseUrl = (import.meta as any).env?.VITE_PUBLIC_BASE_URL || 'http://172.26.144.1:3000/To-Do-List/';
      const existing = await apiFetchFn(
        `/whiteboard-shares?whiteboard_id=${effectiveWhiteboardId}`,
        { method: 'GET' }
      );

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
  };


  // UI State
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isToolbarExpanded, setIsToolbarExpanded] = useState(true);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isClearDrawingsModalOpen, setIsClearDrawingsModalOpen] = useState(false);
  const [isReminderMenuOpen, setIsReminderMenuOpen] = useState(false);
  const [isTaskPickerOpen, setIsTaskPickerOpen] = useState(false);
  const [editingReminderDateNoteId, setEditingReminderDateNoteId] = useState<string | null>(null);
  const [editingReminderTitleNoteId, setEditingReminderTitleNoteId] = useState<string | null>(null);
  const [editingReminderTitleValue, setEditingReminderTitleValue] = useState('');
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareQrDataUrl, setShareQrDataUrl] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  // Interaction State
  const [dragState, setDragState] = useState<{
    type: 'move' | 'resize' | 'rotate' | 'pan';
    startMouse: { x: number; y: number };
    startNote?: WhiteboardNote; // Snapshot for note operations
    handle?: string; // 'tl', 'tr', 'bl', 'br', 't', 'b', 'l', 'r'
    startScroll?: { x: number; y: number }; // For panning
  } | null>(null);

  // --- History State ---
  const [history, setHistory] = useState<WhiteboardSnapshot[]>([]);
  const [future, setFuture] = useState<WhiteboardSnapshot[]>([]);

  const buildSnapshot = useCallback((): WhiteboardSnapshot => ({
    notes: notes.map((n) => ({ ...n })),
    drawings: drawings.map((d) => ({
      ...d,
      path_points: d.path_points.map((p) => ({ ...p })),
    })),
  }), [notes, drawings]);

  const saveHistorySnapshot = useCallback(() => {
    setHistory(prev => [...prev, buildSnapshot()].slice(-50));
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
  }, [isOffline, userId, whiteboardReady, apiFetchFn, upsertNote, deleteNoteFromDb, upsertDrawing]);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const current = buildSnapshot();
    const previous = history[history.length - 1];
    clearPendingNoteSaves();
    setFuture(prev => [current, ...prev]);
    setHistory(prev => prev.slice(0, -1));
    setNotes(previous.notes);
    setDrawings(previous.drawings);
    setSelectedNoteIds(new Set());
    void syncSnapshotToDb(current, previous);
  }, [history, buildSnapshot, setNotes, clearPendingNoteSaves, syncSnapshotToDb]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const current = buildSnapshot();
    const next = future[0];
    clearPendingNoteSaves();
    setHistory(prev => [...prev, current]);
    setFuture(prev => prev.slice(1));
    setNotes(next.notes);
    setDrawings(next.drawings);
    setSelectedNoteIds(new Set());
    void syncSnapshotToDb(current, next);
  }, [future, buildSnapshot, setNotes, clearPendingNoteSaves, syncSnapshotToDb]);

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reminderMenuRef = useRef<HTMLDivElement>(null);
  const highestZIndex = useRef(10);

  // --- Resize Logic ---
  const lastOrientation = useRef<'landscape' | 'portrait'>(window.innerWidth < 768 ? 'portrait' : 'landscape');

  useEffect(() => {
    const handleResize = () => {
      const isPortrait = window.innerWidth < 768;
      const newOrientation = isPortrait ? 'portrait' : 'landscape';

      if (newOrientation !== lastOrientation.current) {
        // Transform Notes
        setNotes(prevNotes => prevNotes.map(note => {
          if (newOrientation === 'portrait') {
            // Landscape -> Portrait (90° CW)
            const cx = note.x + note.width / 2;
            const cy = note.y + note.height / 2;
            const newCx = PORTRAIT_SIZE.width - cy;
            const newCy = cx;
            return {
              ...note,
              x: newCx - note.width / 2,
              y: newCy - note.height / 2,
            };
          } else {
            // Portrait -> Landscape (90° CCW)
            const cx = note.x + note.width / 2;
            const cy = note.y + note.height / 2;
            const newCx = cy;
            const newCy = LANDSCAPE_SIZE.height - cx;
            return {
              ...note,
              x: newCx - note.width / 2,
              y: newCy - note.height / 2,
            };
          }
        }));

        lastOrientation.current = newOrientation;
        setCanvasSize(isPortrait ? PORTRAIT_SIZE : LANDSCAPE_SIZE);
      }
    };

    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setNotes]);

  useEffect(() => {
    const isDragging =
      !!dragState && (dragState.type === 'move' || dragState.type === 'resize' || dragState.type === 'rotate' || dragState.type === 'pan');

    if (!isDragging) return;

    const prevUserSelect = document.body.style.userSelect;
    const prevWebkitUserSelect = (document.body.style as any).webkitUserSelect;

    document.body.style.userSelect = 'none';
    (document.body.style as any).webkitUserSelect = 'none';

    return () => {
      document.body.style.userSelect = prevUserSelect;
      (document.body.style as any).webkitUserSelect = prevWebkitUserSelect;
    };
  }, [dragState]);

  useEffect(() => {
    if (!isReminderMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (reminderMenuRef.current && !reminderMenuRef.current.contains(event.target as Node)) {
        setIsReminderMenuOpen(false);
        setIsTaskPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isReminderMenuOpen]);


  // --- Helpers ---

  const screenToCanvas = (screenX: number, screenY: number) => {
    if (!contentRef.current) return { x: 0, y: 0 };
    const rect = contentRef.current.getBoundingClientRect();
    return {
      x: (screenX - rect.left) / view.scale,
      y: (screenY - rect.top) / view.scale,
    };
  };

  const handleZoom = useCallback((delta: number) => {
    setView(prev => {
      const newScale = Math.min(Math.max(prev.scale + delta, 0.2), 3);
      return { ...prev, scale: newScale };
    });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        handleZoom(e.deltaY * -0.001);
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [handleZoom]);

  const bringToFront = (id: string) => {
    highestZIndex.current += 1;
    setNotes(prev => prev.map(n => n.id === id ? { ...n, zIndex: highestZIndex.current } : n));
  };

  // ----------------------------
  // Create Note (immediate save)
  // ----------------------------
  const addNote = (
    x: number,
    y: number,
    type: 'sticky' | 'text' | 'image' = 'sticky',
    imageUrl?: string
  ) => {
    if (x < 0 || y < 0 || x > canvasSize.width || y > canvasSize.height) return;

    saveHistorySnapshot();

    // ✅ IMPORTANT: id must be UUID because DB expects uuid
    const id = crypto.randomUUID();

    highestZIndex.current += 1;

    let width = 256;
    let height = 256;

    if (type === 'text') {
      width = 400;
      height = 100;
    } else if (type === 'image') {
      width = 300;
      height = 300;
    }

    const newNote: WhiteboardNote = {
      id,
      type,
      x: type === 'text' ? x : x - width / 2,
      y: type === 'text' ? y : y - height / 2,
      width,
      height,
      content: '',
      imageUrl,
      title: type === 'text' ? 'Text Box' : type === 'image' ? 'Image' : 'New Note',
      color: type === 'text' || type === 'image' ? 'transparent' : 'yellow',
      rotation: type === 'text' || type === 'image' ? 0 : Math.random() * 4 - 2,
      zIndex: highestZIndex.current,
      fontSize: type === 'text' ? 24 : 16,
      createdAt: Date.now()
    };

    setNotes(prev => [...prev, newNote]);
    setSelectedNoteIds(new Set([id]));
    setActiveTool('select');

    // ✅ Save immediately (only if ready)
    upsertNote(newNote);
  };

  const addTaskAsNote = (task: Task) => {
    saveHistorySnapshot();
    const id = crypto.randomUUID();
    highestZIndex.current += 1;

    const width = 340;
    const height = 260;
    const x = Math.max(0, Math.min(canvasSize.width - width, canvasSize.width / 2 - width / 2 + (Math.random() * 120 - 60)));
    const y = Math.max(0, Math.min(canvasSize.height - height, canvasSize.height / 2 - height / 2 + (Math.random() * 80 - 40)));

    const content = [
      `Date: ${task.date || new Date().toLocaleDateString('en-CA')}`,
      task.time ? `Time: ${task.time}` : '',
      task.description ? `Description: ${task.description}` : '',
      '',
      'Write notes here...'
    ].filter(Boolean).join('\n');

    const newNote: WhiteboardNote = {
      id,
      type: 'sticky',
      x,
      y,
      width,
      height,
      content,
      title: `${REMINDER_UNCHECKED_PREFIX}${task.title}`,
      color: 'pink',
      rotation: Math.random() * 4 - 2,
      zIndex: highestZIndex.current,
      fontSize: 16,
      createdAt: Date.now(),
    };

    setNotes((prev) => [...prev, newNote]);
    setSelectedNoteIds(new Set([id]));
    setActiveTool('select');
    setIsTaskPickerOpen(false);
    setIsReminderMenuOpen(false);
    upsertNote(newNote);
  };

  const addReminderSticky = (x: number, y: number) => {
    saveHistorySnapshot();
    const id = crypto.randomUUID();
    highestZIndex.current += 1;

    const width = 360;
    const height = 280;
    const noteX = Math.max(0, Math.min(canvasSize.width - width, x - width / 2));
    const noteY = Math.max(0, Math.min(canvasSize.height - height, y - height / 2));

    const today = new Date().toLocaleDateString('en-CA');
    const newNote: WhiteboardNote = {
      id,
      type: 'sticky',
      x: noteX,
      y: noteY,
      width,
      height,
      content: `Date: ${today}\n\nWrite notes here...`,
      title: `${REMINDER_UNCHECKED_PREFIX}Reminder Task`,
      color: 'pink',
      rotation: Math.random() * 4 - 2,
      zIndex: highestZIndex.current,
      fontSize: 16,
      createdAt: Date.now(),
    };

    setNotes((prev) => [...prev, newNote]);
    setSelectedNoteIds(new Set([id]));
    setActiveTool('select');
    upsertNote(newNote);
  };

  const getReminderDateValue = (content: string) => {
    const firstLine = (content || '').split('\n')[0] || '';
    if (!firstLine.startsWith('Date: ')) return '';
    const dateValue = firstLine.replace('Date: ', '').trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(dateValue) ? dateValue : '';
  };

  const formatReminderDateLabel = (dateValue: string) => {
    if (!dateValue) return 'Set date';
    const parsed = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return 'Set date';
    return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const updateReminderDate = (noteId: string, dateValue: string) => {
    if (!dateValue) return;
    saveHistorySnapshot();
    setNotes((prev) => {
      const next = prev.map((n) => {
        if (n.id !== noteId) return n;
        const lines = (n.content || '').split('\n');
        const hasDateLine = lines[0]?.startsWith('Date: ');
        if (hasDateLine) {
          lines[0] = `Date: ${dateValue}`;
          return { ...n, content: lines.join('\n') };
        }
        const body = (n.content || '').trim();
        const content = body ? `Date: ${dateValue}\n\n${body}` : `Date: ${dateValue}\n\nWrite notes here...`;
        return { ...n, content };
      });
      const changed = next.find((n) => n.id === noteId);
      if (changed) scheduleSaveNote(changed);
      return next;
    });
  };

  const parseReminderTitle = (note: WhiteboardNote) => {
    const raw = (note.title || 'Reminder Task').trim();
    if (raw.startsWith(REMINDER_CHECKED_PREFIX)) {
      return { checked: true, taskName: raw.slice(REMINDER_CHECKED_PREFIX.length) || 'Reminder Task' };
    }
    if (raw.startsWith(REMINDER_UNCHECKED_PREFIX)) {
      return { checked: false, taskName: raw.slice(REMINDER_UNCHECKED_PREFIX.length) || 'Reminder Task' };
    }
    return { checked: false, taskName: raw || 'Reminder Task' };
  };

  const toggleReminderChecked = (noteId: string) => {
    saveHistorySnapshot();
    setNotes((prev) => {
      const next = prev.map((n) => {
        if (n.id !== noteId) return n;
        const parsed = parseReminderTitle(n);
        const nextChecked = !parsed.checked;
        const nextTitle = `${nextChecked ? REMINDER_CHECKED_PREFIX : REMINDER_UNCHECKED_PREFIX}${parsed.taskName}`;
        return { ...n, title: nextTitle };
      });
      const changed = next.find((n) => n.id === noteId);
      if (changed) scheduleSaveNote(changed);
      return next;
    });
  };

  const startReminderTitleEdit = (note: WhiteboardNote) => {
    const parsed = parseReminderTitle(note);
    setEditingReminderTitleNoteId(note.id);
    setEditingReminderTitleValue(parsed.taskName);
  };

  const saveReminderTitleEdit = (noteId: string) => {
    const nextName = editingReminderTitleValue.trim();
    setEditingReminderTitleNoteId(null);
    if (!nextName) return;

    saveHistorySnapshot();
    setNotes((prev) => {
      const next = prev.map((n) => {
        if (n.id !== noteId) return n;
        const parsed = parseReminderTitle(n);
        const prefix = parsed.checked ? REMINDER_CHECKED_PREFIX : REMINDER_UNCHECKED_PREFIX;
        return { ...n, title: `${prefix}${nextName}` };
      });
      const changed = next.find((n) => n.id === noteId);
      if (changed) scheduleSaveNote(changed);
      return next;
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file, canvasSize.width / 2, canvasSize.height / 2);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processImageFile = (file: File, x: number, y: number) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string;
      addNote(x, y, 'image', imageUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files?.[0];
    if (file) {
      const coords = screenToCanvas(e.clientX, e.clientY);
      processImageFile(file, coords.x, coords.y);
    }
  };

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          // Paste at center of viewport
          if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const coords = screenToCanvas(centerX, centerY);
            processImageFile(file, coords.x, coords.y);
          } else {
            addNote(canvasSize.width / 2, canvasSize.height / 2, 'image');
          }
        }
      }
    }
  }, [canvasSize, screenToCanvas]);

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const deleteSelected = useCallback(() => {
    if (selectedNoteIds.size === 0) return;
    saveHistorySnapshot();

    // Delete from DB
    selectedNoteIds.forEach(id => deleteNoteFromDb(id));

    setNotes(prev => prev.filter(n => !selectedNoteIds.has(n.id)));
    setSelectedNoteIds(new Set());
  }, [selectedNoteIds, setNotes, saveHistorySnapshot]);

  // --- Toolbar Logic ---

  const getSelectedNote = () => {
    if (selectedNoteIds.size !== 1) return null;
    const id = Array.from(selectedNoteIds)[0];
    return notes.find(n => n.id === id) || null;
  };

  const updateNoteColor = (color: WhiteboardNote['color']) => {
    const stickyType: WhiteboardNote['type'] = 'sticky';
    saveHistorySnapshot();
    setNotes(prev => {
      const next = prev.map(n => selectedNoteIds.has(n.id) ? { ...n, color, type: stickyType } : n);
      next.forEach(n => { if (selectedNoteIds.has(n.id)) scheduleSaveNote(n); });
      return next;
    });
    setShowColorPicker(false);
  };

  const updateNoteFontSize = (increment: number) => {
    setNotes(prev => {
      const next = prev.map(n => {
        if (selectedNoteIds.has(n.id)) {
          return { ...n, fontSize: Math.max(8, Math.min(96, n.fontSize + increment)) };
        }
        return n;
      });
      // Save changes
      next.forEach(n => {
        if (selectedNoteIds.has(n.id)) scheduleSaveNote(n);
      });
      return next;
    });
  };

  const updateNoteContent = (id: string, content: string) => {
    setNotes(prev => {
      const next = prev.map(n => (n.id === id ? { ...n, content } : n));
      const changed = next.find(n => n.id === id);
      if (changed) scheduleSaveNote(changed);
      return next;
    });
  };
  // --- Event Handlers ---

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (document.activeElement?.tagName === 'TEXTAREA') return;

    // History Shortcuts
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      if (e.shiftKey) redo();
      else undo();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
      redo();
      return;
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      deleteSelected();
    }

    // Tools
    if (e.key === 'v') setActiveTool('select');
    if (e.key === 'h' || e.code === 'Space') {
      if (e.code === 'Space') e.preventDefault();
      setActiveTool('hand');
    }
    if (e.key === 'n') setActiveTool('note');
    if (e.key === 'r') setActiveTool('reminder');
    if (e.key === 't') setActiveTool('text');

  }, [deleteSelected, undo, redo]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    const handleGlobalPointerUp = () => {
      setDragState(null);
      if (isDrawing) {
        setIsDrawing(false);
        if (!cancelCurrentDrawingRef.current && currentPathRef.current.length > 0 && currentDrawingIdRef.current) {
          const finishedDrawing = drawingsRef.current.find((d) => d.id === currentDrawingIdRef.current);
          if (finishedDrawing) {
            saveDrawing(finishedDrawing);
          }
          currentPathRef.current = [];
        }
        if (cancelCurrentDrawingRef.current && currentDrawingIdRef.current) {
          const idToRemove = currentDrawingIdRef.current;
          setDrawings(prev => prev.filter(d => d.id !== idToRemove));
        }
        cancelCurrentDrawingRef.current = false;
        currentDrawingIdRef.current = null;
      }
    };
    window.addEventListener('pointerup', handleGlobalPointerUp);
    return () => window.removeEventListener('pointerup', handleGlobalPointerUp);
  }, [isDrawing]); // Depend on isDrawing to close properly

  const handlePointerDown = (e: React.PointerEvent) => {
    // 0. Pen Tool (Drawing)
    if (activeTool === 'pen') {
      saveHistorySnapshot();
      setIsDrawing(true);
      cancelCurrentDrawingRef.current = false;
      const coords = screenToCanvas(e.clientX, e.clientY);
      const newPoint = { x: coords.x, y: coords.y };
      currentPathRef.current = [newPoint];

      // Optimistic Render
      const tempId = crypto.randomUUID();
      currentDrawingIdRef.current = tempId;
      setDrawings(prev => [...prev, {
        id: tempId,
        user_id: userId,
        whiteboard_id: effectiveWhiteboardId,
        path_points: [newPoint],
        color: penColor,
        thickness: penThickness,
      }]);
      return;
    }

    // 0.5. Eraser Tool
    if (activeTool === 'eraser') {
      if (drawingsRef.current.length > 0) {
        saveHistorySnapshot();
      }
      const coords = screenToCanvas(e.clientX, e.clientY);
      checkEraserCollision(coords.x, coords.y);
      // We don't need to "start" an interaction state for eraser, just continuous checking on move
      // But we might want to track "isErasing" if we put it in handlePointerMove
      // handlePointerMove usually checks "e.buttons" or implicit state.
      // Let's rely on e.buttons in handlePointerMove
      return;
    }

    // 1. Hand Tool Panning
    if (activeTool === 'hand') {
      if (containerRef.current) {
        startInteraction('pan', { x: e.clientX, y: e.clientY });
      }
      return;
    }

    // 2. Note Creation Tool
    if (activeTool === 'note') {
      const coords = screenToCanvas(e.clientX, e.clientY);
      addNote(coords.x, coords.y, 'sticky');
      return;
    }

    // 3. Reminder Creation Tool
    if (activeTool === 'reminder') {
      const coords = screenToCanvas(e.clientX, e.clientY);
      addReminderSticky(coords.x, coords.y);
      return;
    }

    // 4. Text Creation Tool
    if (activeTool === 'text') {
      const coords = screenToCanvas(e.clientX, e.clientY);
      addNote(coords.x, coords.y, 'text');
      return;
    }

    // 5. Deselect if clicking empty space
    if (e.target === containerRef.current || (e.target as HTMLElement).closest('.canvas-background')) {
      setSelectedNoteIds(new Set());
      setShowColorPicker(false);
    }
  };

  const startInteraction = (type: 'move' | 'resize' | 'rotate' | 'pan', mouse: { x: number; y: number }, note?: WhiteboardNote, handle?: string) => {
    if (type !== 'pan') {
      saveHistorySnapshot();
    }
    setDragState({
      type,
      startMouse: mouse,
      startNote: note ? { ...note } : undefined,
      handle,
      startScroll: type === 'pan' && containerRef.current ? { x: containerRef.current.scrollLeft, y: containerRef.current.scrollTop } : undefined
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    // --- Drawing ---
    if (isDrawing && activeTool === 'pen') {
      if (cancelCurrentDrawingRef.current) return;
      const coords = screenToCanvas(e.clientX, e.clientY);
      const newPoint = { x: coords.x, y: coords.y };
      currentPathRef.current.push(newPoint);

      setDrawings(prev => {
        const newDrawings = [...prev];
        if (newDrawings.length > 0) {
          const lastIdx = newDrawings.length - 1;
          const lastDrawing = newDrawings[lastIdx];
          if (currentDrawingIdRef.current && lastDrawing.id !== currentDrawingIdRef.current) {
            return newDrawings;
          }
          newDrawings[lastIdx] = {
            ...lastDrawing,
            path_points: [...lastDrawing.path_points, newPoint],
          };
        }
        return newDrawings;
      });
      return;
    }

    // --- Eraser ---
    if (activeTool === 'eraser' && e.buttons === 1) {
      const coords = screenToCanvas(e.clientX, e.clientY);
      checkEraserCollision(coords.x, coords.y);
      return;
    }

    if (!dragState) return;

    // --- Panning ---
    if (dragState.type === 'pan' && containerRef.current && dragState.startScroll) {
      e.preventDefault();
      const dx = e.clientX - dragState.startMouse.x;
      const dy = e.clientY - dragState.startMouse.y;
      containerRef.current.scrollLeft = dragState.startScroll.x - dx;
      containerRef.current.scrollTop = dragState.startScroll.y - dy;
      return;
    }

    const coords = screenToCanvas(e.clientX, e.clientY);

    // --- Moving Note ---
    if (dragState.type === 'move' && dragState.startNote) {
      const dx = coords.x - dragState.startMouse.x;
      const dy = coords.y - dragState.startMouse.y;

      setNotes(prev => {
        const next = prev.map(n => {
          if (n.id === dragState.startNote!.id) {
            return { ...n, x: dragState.startNote!.x + dx, y: dragState.startNote!.y + dy };
          }
          return n;
        });

        const changed = next.find(n => n.id === dragState.startNote!.id);
        if (changed) {
          // console.log('Move: Scheduling save');
          scheduleSaveNote(changed);
        }

        return next;
      });

    }

    // --- Rotating Note ---
    if (dragState.type === 'rotate' && dragState.startNote) {
      const sn = dragState.startNote;
      const centerX = sn.x + sn.width / 2;
      const centerY = sn.y + sn.height / 2;

      // Calculate angle relative to center
      const startAngle = Math.atan2(dragState.startMouse.y - centerY, dragState.startMouse.x - centerX);
      const currentAngle = Math.atan2(coords.y - centerY, coords.x - centerX);
      const deltaAngle = (currentAngle - startAngle) * (180 / Math.PI);

      setNotes(prev => {
        const next = prev.map(n => {
          if (n.id === sn.id) {
            return { ...n, rotation: sn.rotation + deltaAngle };
          }
          return n;
        });
        const changed = next.find(n => n.id === sn.id);
        if (changed) scheduleSaveNote(changed);
        return next;
      });
    }

    // --- Resizing Note ---
    if (dragState.type === 'resize' && dragState.startNote && dragState.handle) {
      const sn = dragState.startNote;

      // 1. Calculate mouse delta in Global Space
      const globalDx = coords.x - dragState.startMouse.x;
      const globalDy = coords.y - dragState.startMouse.y;

      // 2. Rotate Delta to Local Space (unrotated axis)
      const rad = sn.rotation * (Math.PI / 180);
      const cos = Math.cos(-rad);
      const sin = Math.sin(-rad);
      const localDx = globalDx * cos - globalDy * sin;
      const localDy = globalDx * sin + globalDy * cos;

      // 3. Calculate New Dimensions based on handle
      let newW = sn.width;
      let newH = sn.height;

      // Determine which side we are resizing
      const isLeft = dragState.handle.includes('l');
      const isRight = dragState.handle.includes('r');
      const isTop = dragState.handle.includes('t');
      const isBottom = dragState.handle.includes('b');

      if (isLeft) newW -= localDx;
      else if (isRight) newW += localDx;

      if (isTop) newH -= localDy;
      else if (isBottom) newH += localDy;

      // 4. Enforce Min Size
      const minH = sn.type === 'text' ? 50 : MIN_SIZE;
      newW = Math.max(newW, MIN_SIZE);
      newH = Math.max(newH, minH);

      const wDiff = newW - sn.width;
      const hDiff = newH - sn.height;

      let localShiftX = 0;
      let localShiftY = 0;

      if (isLeft) localShiftX = -wDiff / 2;
      else if (isRight) localShiftX = wDiff / 2;

      if (isTop) localShiftY = -hDiff / 2;
      else if (isBottom) localShiftY = hDiff / 2;

      const cosRev = Math.cos(rad);
      const sinRev = Math.sin(rad);

      const globalShiftX = localShiftX * cosRev - localShiftY * sinRev;
      const globalShiftY = localShiftX * sinRev + localShiftY * cosRev;

      setNotes(prev => {
        const next = prev.map(n => {
          if (n.id === sn.id) {
            return {
              ...n,
              width: newW,
              height: newH,
              x: sn.x + globalShiftX - (wDiff / 2),
              y: sn.y + globalShiftY - (hDiff / 2)
            };
          }
          return n;
        });
        const changed = next.find(n => n.id === sn.id);
        if (changed) scheduleSaveNote(changed);
        return next;
      });
    }
  };

  const handleNotePointerDown = (e: React.PointerEvent, id: string) => {
    console.log('Note Pointer Down:', id);
    e.stopPropagation();

    if (!selectedNoteIds.has(id) && !e.shiftKey) {
      setSelectedNoteIds(new Set([id]));
    }

    bringToFront(id);

    const coords = screenToCanvas(e.clientX, e.clientY);
    const note = notes.find(n => n.id === id);
    if (note) {
      startInteraction('move', coords, note);
    }
  };

  const handleResizeStart = (e: React.PointerEvent, note: WhiteboardNote, handle: string) => {
    e.stopPropagation();
    const coords = screenToCanvas(e.clientX, e.clientY);
    startInteraction('resize', coords, note, handle);
  };

  const handleRotateStart = (e: React.PointerEvent, note: WhiteboardNote) => {
    e.stopPropagation();
    const coords = screenToCanvas(e.clientX, e.clientY);
    startInteraction('rotate', coords, note);
  };

  const getCursor = () => {
    if (dragState?.type === 'pan' || activeTool === 'hand') return 'grabbing';
    if (activeTool === 'eraser') {
      return `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="black" stroke-width="1.5" fill="white" fill-opacity="0.5"/></svg>') 12 12, auto`;
    }
    if (activeTool === 'note' || activeTool === 'reminder' || activeTool === 'text' || activeTool === 'pen') return 'crosshair';
    if (dragState?.type === 'rotate') return 'alias';
    if (dragState?.type === 'resize') {
      const h = dragState.handle;
      if (h === 't' || h === 'b') return 'ns-resize';
      if (h === 'l' || h === 'r') return 'ew-resize';
      if (h === 'bl' || h === 'tr') return 'nesw-resize';
      return 'nwse-resize';
    }
    return 'default';
  };



  const selectedNote = getSelectedNote();

  const renderDrawings = () => {
    return drawings.map((drawing) => (
      <svg key={drawing.id} className="absolute top-0 left-0 pointer-events-none overflow-visible" width={canvasSize.width} height={canvasSize.height} style={{ zIndex: 9999 }}>
        <polyline
          points={drawing.path_points.map((p) => `${p.x},${p.y}`).join(' ')}
          stroke={drawing.color || 'black'}
          strokeWidth={drawing.thickness ?? 3}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ));
  };


  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-transparent overflow-hidden font-sans relative">
      <div className="relative z-10 flex flex-col h-full overflow-hidden">
        <div className="relative flex-1 bg-transparent overflow-hidden">

          {/* Floating Toolbar (Properties) */}
          <div
            className={`absolute top-3 md:top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 p-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200 dark:border-slate-800 z-50 transition-all duration-300 ease-[cubic-bezier(0.19,1,0.22,1)] origin-top 
            ${selectedNote ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto' : 'opacity-0 -translate-y-4 scale-95 pointer-events-none'}`}
          >
            <div className="relative">
              <button
                onClick={() => selectedNote && setShowColorPicker(!showColorPicker)}
                className={`w-9 h-9 rounded-full border border-slate-300 dark:border-slate-600 shadow-sm transition-transform active:scale-95 relative overflow-hidden`}
                title="Background Color"
              >
                <span
                  className="absolute inset-0"
                  style={{ backgroundColor: selectedNote && selectedNote.color !== 'transparent' ? COLORS[selectedNote.color].hex : '#fff' }}
                ></span>
                {selectedNote?.color === 'transparent' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-full h-px bg-red-500 transform rotate-45"></div>
                  </div>
                )}
              </button>
              {showColorPicker && (
                <div className="absolute top-full left-0 mt-3 p-2 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-2 z-50 animate-in fade-in zoom-in-95 duration-100 min-w-[100px]">
                  {(Object.keys(COLORS) as Array<keyof typeof COLORS>).filter(c => c !== 'transparent').map(c => (
                    <button
                      key={c}
                      onClick={() => updateNoteColor(c)}
                      className={`w-8 h-8 rounded-full border border-slate-300 ${COLORS[c].accent} hover:scale-110 transition-transform shadow-sm`}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>

            <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800/50 rounded-full px-1">
              <button
                onClick={() => updateNoteFontSize(-2)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">remove</span>
              </button>
              <div className="w-8 text-center text-sm font-bold">
                {selectedNote ? selectedNote.fontSize : '--'}
              </div>
              <button
                onClick={() => updateNoteFontSize(2)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
              </button>
            </div>

            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>

            <button
              onClick={deleteSelected}
              className="w-9 h-9 rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center justify-center transition-colors"
              title="Delete Note (Del)"
            >
              <span className="material-symbols-outlined text-[20px]">delete</span>
            </button>
          </div>

          {/* SCROLL CONTAINER */}
          <div
            ref={containerRef}
            className="absolute inset-0 w-full h-full overflow-auto flex touch-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            style={{ cursor: getCursor() }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
          >
            <div
              className="relative shrink-0 m-auto transition-all duration-75 ease-out will-change-transform"
              style={{
                width: canvasSize.width * view.scale,
                height: canvasSize.height * view.scale
              }}
            >
              <div
                ref={contentRef}
                className="absolute top-0 left-0 bg-white dark:bg-slate-900 shadow-2xl border border-slate-300 dark:border-slate-800 origin-top-left canvas-background"
                style={{
                  width: canvasSize.width,
                  height: canvasSize.height,
                  transform: `scale(${view.scale})`
                }}
              >
                {/* Drawings Layer */}
                <div className="absolute top-0 left-0 pointer-events-none w-full h-full z-[9999]">
                  {renderDrawings()}
                </div>

                {/* Removed duplicate noise layer to allow premium background to show */}
                <div className="absolute inset-0 w-full h-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none canvas-background"></div>

                {notes.map(note => {
                  const isSelected = selectedNoteIds.has(note.id);
                  const isText = note.type === 'text';
                  const isReminder =
                    note.type === 'sticky' &&
                    (note.title?.startsWith(REMINDER_CHECKED_PREFIX) ||
                      note.title?.startsWith(REMINDER_UNCHECKED_PREFIX) ||
                      note.title === 'Reminder');
                  const reminderMeta = parseReminderTitle(note);
                  const theme = COLORS[note.color];
                  return (
                    <div
                      key={note.id}
                      onPointerDown={(e) => handleNotePointerDown(e, note.id)}
                      className={`absolute flex flex-col transition-shadow duration-200 group
                        ${isReminder ? 'rounded-2xl overflow-hidden shadow-[0_12px_32px_rgba(15,23,42,0.18)]' : ''}
                        ${isSelected ? 'z-[9999]' : ''}
                        ${(activeTool === 'pen' || activeTool === 'eraser') ? 'pointer-events-none' : ''}
                      `}
                      style={{
                        left: note.x,
                        top: note.y,
                        width: note.width,
                        height: note.height,
                        transform: `rotate(${note.rotation}deg)`,
                        zIndex: note.zIndex,
                        cursor: activeTool === 'hand' ? 'grabbing' : 'grab'
                      }}
                    >
                      {isSelected && (
                        <>
                          <div className={`absolute -inset-1 border-2 border-blue-500 pointer-events-none ${isReminder ? 'rounded-2xl' : 'rounded-lg'}`}></div>
                          <div
                            className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-3 bg-white border-2 border-blue-500 rounded-full cursor-ns-resize z-50 hover:bg-blue-50 transition-colors shadow-sm"
                            onPointerDown={(e) => handleResizeStart(e, note, 't')}
                          />
                          <div
                            className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-8 h-3 bg-white border-2 border-blue-500 rounded-full cursor-ns-resize z-50 hover:bg-blue-50 transition-colors shadow-sm"
                            onPointerDown={(e) => handleResizeStart(e, note, 'b')}
                          />
                          <div
                            className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-8 bg-white border-2 border-blue-500 rounded-full cursor-ew-resize z-50 hover:bg-blue-50 transition-colors shadow-sm"
                            onPointerDown={(e) => handleResizeStart(e, note, 'l')}
                          />
                          <div
                            className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-8 bg-white border-2 border-blue-500 rounded-full cursor-ew-resize z-50 hover:bg-blue-50 transition-colors shadow-sm"
                            onPointerDown={(e) => handleResizeStart(e, note, 'r')}
                          />
                          <div
                            className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-nwse-resize z-50 hover:scale-125 transition-transform"
                            onPointerDown={(e) => handleResizeStart(e, note, 'tl')}
                          />
                          <div
                            className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-nesw-resize z-50 hover:scale-125 transition-transform"
                            onPointerDown={(e) => handleResizeStart(e, note, 'tr')}
                          />
                          <div
                            className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-nesw-resize z-50 hover:scale-125 transition-transform"
                            onPointerDown={(e) => handleResizeStart(e, note, 'bl')}
                          />
                          <div
                            className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-nwse-resize z-50 hover:scale-125 transition-transform"
                            onPointerDown={(e) => handleResizeStart(e, note, 'br')}
                          />
                          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-0.5 h-12 bg-blue-500 pointer-events-none"></div>
                          <div
                            className="absolute -top-[70px] left-1/2 -translate-x-1/2 w-9 h-9 bg-white border-2 border-blue-500 rounded-full cursor-grab active:cursor-grabbing z-50 hover:bg-blue-50 flex items-center justify-center shadow-sm transition-colors"
                            onPointerDown={(e) => handleRotateStart(e, note)}
                          >
                            <span className="material-symbols-outlined text-[16px] text-blue-600 font-bold">refresh</span>
                          </div>
                        </>
                      )}

                      {dragState?.type === 'rotate' && dragState.startNote?.id === note.id && (
                        <div
                          className="absolute -top-32 left-1/2 bg-slate-900 text-white text-md font-bold px-0.5 py-1.5 rounded-lg shadow-xl pointer-events-none z-[100] min-w-[60px] text-center border border-white/10 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
                          style={{ transform: `translateX(-50%) rotate(${-note.rotation}deg)` }}
                        >
                          {Math.round(note.rotation)}°
                        </div>
                      )}

                      {note.type !== 'image' && !isReminder && (
                        <div className={`absolute inset-0 top-0 ${theme.bg} rounded-sm ${!isText ? 'shadow-md' : ''} border ${theme.border} transition-colors`}></div>
                      )}

                      {isReminder && (
                        <div className={`absolute inset-0 rounded-2xl border ${reminderMeta.checked ? 'border-rose-200/70 bg-gradient-to-br from-rose-50/80 via-orange-50/80 to-amber-50/80 dark:border-rose-900/40 dark:from-rose-950/30 dark:via-slate-900/70 dark:to-amber-950/15 brightness-75 saturate-75' : 'border-rose-200/80 bg-gradient-to-br from-rose-50 via-orange-50 to-amber-50 dark:border-rose-900/50 dark:from-rose-950/40 dark:via-slate-900 dark:to-amber-950/20'}`}>
                          <div className={`absolute inset-x-0 top-0 h-10 ${reminderMeta.checked ? 'bg-gradient-to-r from-rose-500/12 via-orange-400/10 to-amber-400/12 border-b border-rose-200/50 dark:border-rose-900/35' : 'bg-gradient-to-r from-rose-500/20 via-orange-400/15 to-amber-400/20 border-b border-rose-200/60 dark:border-rose-900/40'}`}></div>
                        </div>
                      )}

                      {note.type === 'sticky' && !isReminder && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none drop-shadow-md w-1/2">
                          <div className="w-full h-9 bg-slate-200/90 dark:bg-white/10 backdrop-blur-md border-white/20 dark:border-white/5 skew-x-1 flex items-center justify-center overflow-hidden [clip-path:polygon(0%_0%,100%_0%,100%_75%,96%_100%,92%_75%,88%_100%,84%_75%,80%_100%,76%_75%,72%_100%,68%_75%,64%_100%,60%_75%,56%_100%,52%_75%,48%_100%,44%_75%,40%_100%,36%_75%,32%_100%,28%_75%,24%_100%,20%_75%,16%_100%,12%_75%,8%_100%,4%_75%,0%_100%)]">
                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent opacity-50"></div>
                          </div>
                        </div>
                      )}

                      <div className={`relative flex-1 flex flex-col z-10 ${note.type === 'image' ? 'p-0' : isReminder ? 'p-0' : 'p-5'} ${note.type === 'sticky' && !isReminder ? 'pt-10' : ''} h-full`}>
                        {note.type === 'image' ? (
                          <div className="flex-1 w-full h-full relative overflow-hidden rounded-md">
                            <img
                              src={note.imageUrl}
                              alt="Uploaded"
                              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                            />
                          </div>
                        ) : isReminder ? (
                          <div className="relative flex-1 flex flex-col z-10 p-4 pt-10 h-full">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleReminderChecked(note.id);
                              }}
                              className={`absolute top-3 left-3 size-6 rounded-md border flex items-center justify-center transition-colors z-20 ${reminderMeta.checked ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white/80 dark:bg-slate-900/50 border-slate-300 dark:border-slate-600 text-transparent hover:border-emerald-500'}`}
                              title={reminderMeta.checked ? 'Mark not done' : 'Mark done'}
                            >
                              <span className="material-symbols-outlined text-[16px]">check</span>
                            </button>
                            <div className="mb-3 flex items-center gap-2 min-h-8">
                              {editingReminderTitleNoteId === note.id ? (
                                <input
                                  value={editingReminderTitleValue}
                                  onChange={(e) => setEditingReminderTitleValue(e.target.value)}
                                  onBlur={() => saveReminderTitleEdit(note.id)}
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      saveReminderTitleEdit(note.id);
                                    }
                                    if (e.key === 'Escape') {
                                      setEditingReminderTitleNoteId(null);
                                    }
                                  }}
                                  className={`h-9 px-2 rounded-md border text-base font-bold w-full max-w-[230px] ${reminderMeta.checked ? 'bg-white/40 border-rose-200/60 text-rose-900/75 dark:bg-rose-950/20 dark:border-rose-900/35 dark:text-rose-100/75' : 'bg-white/70 border-rose-200/70 text-slate-800 dark:bg-slate-900/50 dark:border-rose-900/40 dark:text-slate-100'}`}
                                  autoFocus
                                />
                              ) : (
                                <button
                                  type="button"
                                  onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    startReminderTitleEdit(note);
                                  }}
                                  className={`text-left text-base font-bold px-1 rounded ${reminderMeta.checked ? 'text-rose-900/70 dark:text-rose-100/70 line-through' : 'text-slate-800 dark:text-slate-100'}`}
                                  title="Double-click to rename"
                                >
                                  {reminderMeta.taskName}
                                </button>
                              )}
                            </div>
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <div className={`inline-flex items-center gap-1.5 self-start px-2 py-1 rounded-md text-[11px] font-bold tracking-wide uppercase border ${reminderMeta.checked ? 'bg-white/45 dark:bg-rose-950/25 text-rose-800/75 dark:text-rose-200/75 border-rose-200/60 dark:border-rose-900/35' : 'bg-white/70 dark:bg-slate-800/70 text-rose-700 dark:text-rose-300 border-rose-200/70 dark:border-rose-900/40'}`}>
                                <span className="material-symbols-outlined text-[14px]">notifications_active</span>
                                Notes
                              </div>
                              {editingReminderDateNoteId === note.id ? (
                                <input
                                  type="date"
                                  value={getReminderDateValue(note.content)}
                                  onChange={(e) => updateReminderDate(note.id, e.target.value)}
                                  onBlur={() => setEditingReminderDateNoteId(null)}
                                  onPointerDown={(e) => e.stopPropagation()}
                                  className={`h-7 px-2 rounded-md text-[11px] font-semibold border ${reminderMeta.checked ? 'border-rose-200/60 dark:border-rose-900/35 bg-white/45 dark:bg-rose-950/25 text-rose-800/80 dark:text-rose-200/80' : 'border-rose-200/80 dark:border-rose-900/50 bg-white/80 dark:bg-slate-900/60 text-rose-700 dark:text-rose-300'}`}
                                  autoFocus
                                />
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingReminderDateNoteId(note.id);
                                  }}
                                  className={`h-7 px-2 rounded-md text-[11px] font-semibold border transition-colors ${reminderMeta.checked ? 'border-rose-200/60 dark:border-rose-900/35 bg-white/45 dark:bg-rose-950/25 text-rose-800/80 dark:text-rose-200/80 hover:bg-white/55 dark:hover:bg-rose-950/35' : 'border-rose-200/80 dark:border-rose-900/50 bg-white/80 dark:bg-slate-900/60 text-rose-700 dark:text-rose-300 hover:bg-white dark:hover:bg-slate-900'}`}
                                  title="Change date"
                                >
                                  {formatReminderDateLabel(getReminderDateValue(note.content))}
                                </button>
                              )}
                            </div>
                            <textarea
                              value={note.content}
                              onChange={(e) => updateNoteContent(note.id, e.target.value)}
                              placeholder="Add reminder details..."
                              className={`flex-1 w-full h-full border rounded-xl resize-none focus:ring-0 p-3 font-medium leading-relaxed transition-all [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${reminderMeta.checked ? 'bg-white/40 dark:bg-rose-950/20 border-rose-200/60 dark:border-rose-900/35 text-rose-900/75 dark:text-rose-100/80 placeholder:text-rose-800/35 dark:placeholder:text-rose-100/25' : 'bg-white/60 dark:bg-slate-900/50 border-rose-200/70 dark:border-rose-900/40 text-slate-800 dark:text-slate-100 placeholder:text-slate-500/40'} ${activeTool === 'hand' ? 'pointer-events-none' : 'cursor-text'}`}
                              style={{
                                fontSize: `${note.fontSize}px`,
                                lineHeight: 1.4
                              }}
                              spellCheck={false}
                              onPointerDown={(e) => {
                                e.stopPropagation();
                                if (!selectedNoteIds.has(note.id)) {
                                  setSelectedNoteIds(new Set([note.id]));
                                }
                                bringToFront(note.id);
                              }}
                              autoFocus={isSelected}
                            />
                          </div>
                        ) : (
                          <textarea
                            value={note.content}
                            onChange={(e) => updateNoteContent(note.id, e.target.value)}
                            placeholder="Write something..."
                            className={`flex-1 w-full h-full bg-transparent border-0 resize-none focus:ring-0 p-0 text-slate-800 dark:text-slate-100 font-medium leading-relaxed placeholder:text-slate-500/30 transition-all [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${activeTool === 'hand' ? 'pointer-events-none' : 'cursor-text'}`}
                            style={{
                              fontSize: `${note.fontSize}px`,
                              lineHeight: 1.4
                            }}
                            spellCheck={false}
                            onPointerDown={(e) => {
                              e.stopPropagation();
                              if (!selectedNoteIds.has(note.id)) {
                                setSelectedNoteIds(new Set([note.id]));
                              }
                              bringToFront(note.id);
                            }}
                            autoFocus={isSelected}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {canShare && (
            <div className="absolute top-6 right-6 z-50">
              <button
                onClick={openShare}
                disabled={shareLoading}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 shadow-lg hover:bg-white transition-colors disabled:opacity-60"
                title="Share Whiteboard"
              >
                {shareLoading ? 'Creating...' : 'Share'}
              </button>
            </div>
          )}

          {isShareOpen && shareUrl && (
            <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="w-[320px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Share Whiteboard</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Scan to open on phone or iPad.</p>
                  </div>
                  <button
                    onClick={() => setIsShareOpen(false)}
                    className="size-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>

                <div className="mt-4 flex items-center justify-center">
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    {shareQrDataUrl ? (
                      <img src={shareQrDataUrl} alt="Whiteboard QR" className="w-[200px] h-[200px]" />
                    ) : (
                      <div className="w-[200px] h-[200px] flex items-center justify-center text-xs text-slate-400">
                        Generating QR...
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Share Link</label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      className="flex-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1.5 text-slate-700 dark:text-slate-200"
                      value={shareUrl}
                      readOnly
                    />
                    <button
                      onClick={() => navigator.clipboard.writeText(shareUrl)}
                      className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-primary text-white"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                {shareError && <div className="mt-2 text-xs text-red-500">{shareError}</div>}
              </div>
            </div>
          )}

          {isClearDrawingsModalOpen && (
            <div className="absolute inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="w-[360px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Clear all drawings?</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      This will remove all pen drawings on this whiteboard.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsClearDrawingsModalOpen(false)}
                    className="size-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                    title="Close"
                  >
                    <span className="material-symbols-outlined text-[20px]">close</span>
                  </button>
                </div>

                <div className="mt-5 flex items-center justify-end gap-2">
                  <button
                    onClick={() => setIsClearDrawingsModalOpen(false)}
                    className="px-3.5 py-2 text-sm font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      await clearAllDrawings();
                      setIsClearDrawingsModalOpen(false);
                    }}
                    className="px-3.5 py-2 text-sm font-semibold rounded-lg bg-red-500 text-white hover:bg-red-600"
                  >
                    Clear Drawings
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Floating Toolbar (Tools only) */}
          <div
            className={`absolute flex flex-row md:flex-col items-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-[0_-8px_30px_rgb(0,0,0,0.06)] md:shadow-[0_8px_30px_rgb(0,0,0,0.12)] border-t md:border border-slate-100 dark:border-slate-800 z-50 transition-all duration-300 ease-[cubic-bezier(0.19,1,0.22,1)]
            ${isToolbarExpanded
                ? 'bottom-0 left-0 right-0 md:bottom-auto md:left-6 md:top-1/2 md:-translate-y-1/2 md:right-auto md:w-auto p-2 rounded-t-[32px] md:rounded-2xl gap-1 md:gap-2 justify-between md:justify-center'
                : 'bottom-0 left-1/2 -translate-x-1/2 md:left-0 md:top-1/2 md:-translate-y-1/2 md:translate-x-0 md:bottom-auto p-0 rounded-t-xl md:rounded-r-xl md:rounded-l-none md:rounded-b-none gap-0'}`}
          >
            {/* Toggle Button */}
            <button
              onClick={() => setIsToolbarExpanded(!isToolbarExpanded)}
              className={`transition-all text-slate-400 dark:text-slate-500 hover:text-slate-600 flex items-center justify-center
              md:static absolute -top-7 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-t-2xl px-6 py-0.5 
              md:bg-transparent md:border-none md:px-1 py-6  md:rounded-xl md:translate-x-0 md:top-auto
              shadow-[0_-4px_10px_rgb(0,0,0,0.03)] md:shadow-none`}
              title={isToolbarExpanded ? "Hide Toolbar" : "Show Toolbar"}
            >
              {/* Desktop Icon */}
              <span className={`hidden md:block material-symbols-outlined transition-transform duration-500 text-[26px] 
              ${isToolbarExpanded ? '' : 'rotate-180'}`}>
                chevron_left
              </span>
            </button>

            <div className={`flex flex-1 md:flex-none flex-row md:flex-col items-center justify-around md:justify-center gap-1 md:gap-3 transition-all duration-300 ${isToolbarExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none w-0 h-0 md:h-0 overflow-hidden'}`}>
              <div className="hidden md:block w-full h-px bg-slate-100 dark:bg-slate-800 my-1"></div>
              {/* Select Tool */}
              <button
                onClick={() => setActiveTool('select')}
                className={`p-3 rounded-xl transition-all group relative flex items-center justify-center ${activeTool === 'select' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                title="Select Tool (V)"
              >
                <span className="material-symbols-outlined">near_me</span>
              </button>

              {/* Hand Tool */}
              <button
                onClick={() => setActiveTool('hand')}
                className={`p-3 rounded-xl transition-all group relative flex items-center justify-center ${activeTool === 'hand' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                title="Hand Tool (Space)"
              >
                <span className="material-symbols-outlined">pan_tool</span>
              </button>

              <button
                onClick={() => handleToolChange('pen')}
                className={`p-3 rounded-xl transition-all group relative flex items-center justify-center ${activeTool === 'pen' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                title="Pen Tool"
              >
                <span className="material-symbols-outlined">edit</span>
              </button>

              {/* Pen Color Picker */}
              {activeTool === 'pen' && (
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 flex flex-col gap-2 p-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-200 z-[60]">
                  {['black', '#ef4444', '#3b82f6', '#22c55e', '#f97316'].map(c => (
                    <button
                      key={c}
                      onClick={(e) => { e.stopPropagation(); setPenColor(c); }}
                      className={`w-6 h-6 rounded-full border border-slate-200 dark:border-slate-600 ${penColor === c ? 'scale-125 ring-2 ring-blue-500 ring-offset-2' : 'hover:scale-110'} transition-all`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                  <div className="h-px bg-slate-200 dark:bg-slate-700 my-1"></div>
                  {[2, 4, 6, 8].map((size) => (
                    <button
                      key={size}
                      onClick={(e) => { e.stopPropagation(); setPenThickness(size); }}
                      className={`w-9 h-8 rounded-lg border flex items-center justify-center transition-all ${penThickness === size ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' : 'border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/40'}`}
                      title={`Thickness ${size}px`}
                    >
                      <span
                        className="rounded-full bg-slate-700 dark:bg-slate-100"
                        style={{ width: `${size + 2}px`, height: `${size + 2}px` }}
                      />
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={() => handleToolChange('eraser')}
                className={`p-3 rounded-xl transition-all group relative flex items-center justify-center ${activeTool === 'eraser' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                title="Eraser Tool"
              >
                <span className="material-symbols-outlined">ink_eraser</span>
              </button>

              <button
                onClick={() => setIsClearDrawingsModalOpen(true)}
                disabled={drawings.length === 0}
                className={`p-3 rounded-xl transition-all group relative flex items-center justify-center ${drawings.length === 0 ? 'opacity-30 cursor-not-allowed' : 'text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500'}`}
                title="Clear All Drawings"
              >
                <span className="material-symbols-outlined">delete_sweep</span>
              </button>


              <div className="hidden md:block w-full h-px bg-slate-100 dark:bg-slate-800 my-1"></div>

              {/* Note Tool */}
              <button
                onClick={() => setActiveTool('note')}
                className={`p-3 rounded-xl transition-all group relative flex items-center justify-center ${activeTool === 'note' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                title="Sticky Note (N)"
              >
                <span className="material-symbols-outlined">sticky_note_2</span>
              </button>

              <div className="relative" ref={reminderMenuRef}>
                <button
                  onClick={() => {
                    setIsReminderMenuOpen((prev) => !prev);
                    setIsTaskPickerOpen(false);
                  }}
                  className={`p-3 rounded-xl transition-all group relative flex items-center justify-center ${activeTool === 'reminder' || isReminderMenuOpen ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                  title="Reminder Options"
                >
                  <span className="material-symbols-outlined">notifications_active</span>
                </button>

                {isReminderMenuOpen && (
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:left-full md:ml-3 md:translate-x-0 w-56 p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl z-[70]">
                    <button
                      onClick={() => {
                        setActiveTool('reminder');
                        setIsReminderMenuOpen(false);
                        setIsTaskPickerOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">note_add</span>
                      Empty Reminder
                    </button>

                    <button
                      onClick={() => setIsTaskPickerOpen((prev) => !prev)}
                      disabled={tasks.length === 0}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-between ${tasks.length === 0 ? 'opacity-50 cursor-not-allowed text-slate-400' : 'text-slate-700 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">add_task</span>
                        Add Task
                      </span>
                      <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    </button>

                    {isTaskPickerOpen && tasks.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 max-h-56 overflow-y-auto space-y-1">
                        {tasks.map((task) => (
                          <button
                            key={task.id}
                            onClick={() => addTaskAsNote(task)}
                            className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          >
                            <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{task.title}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {[task.date, task.time].filter(Boolean).join(' ')}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Text Tool */}
              <button
                onClick={() => setActiveTool('text')}
                className={`p-3 rounded-xl transition-all group relative flex items-center justify-center ${activeTool === 'text' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                title="Text Box (T)"
              >
                <span className="material-symbols-outlined">text_fields</span>
              </button>

              {/* Image Tool */}
              <div className="relative">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-3 rounded-xl transition-all group relative flex items-center justify-center ${activeTool === 'image' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                  title="Upload Image"
                >
                  <span className="material-symbols-outlined">image</span>
                </button>
              </div>

              <div className="hidden md:block w-full h-px bg-slate-100 dark:bg-slate-800 my-1"></div>

              {/* Undo */}
              <button
                onClick={undo}
                disabled={history.length === 0}
                className={`p-3 rounded-xl transition-all group relative flex items-center justify-center ${history.length === 0 ? 'opacity-30 cursor-not-allowed' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                title="Undo (Ctrl+Z)"
              >
                <span className="material-symbols-outlined">undo</span>
              </button>

              {/* Redo */}
              <button
                onClick={redo}
                disabled={future.length === 0}
                className={`p-3 rounded-xl transition-all group relative flex items-center justify-center ${future.length === 0 ? 'opacity-30 cursor-not-allowed' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                title="Redo (Ctrl+Y)"
              >
                <span className="material-symbols-outlined">redo</span>
              </button>
            </div>
          </div>

          <div className="absolute bottom-6 right-4 md:right-6 flex flex-col gap-3 z-50">
            {/* Zoom Controls */}
            <div className="flex flex-col bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-xl rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
              <button onClick={() => handleZoom(0.1)} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors">
                <span className="material-symbols-outlined text-[20px]">add</span>
              </button>
              <div className="px-1 py-1 text-[10px] font-black text-center text-slate-400 dark:text-slate-500 border-y border-slate-50 dark:border-slate-800 select-none bg-slate-50/50 dark:bg-slate-800/30">
                {Math.round(view.scale * 100)}%
              </div>
              <button onClick={() => handleZoom(-0.1)} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors">
                <span className="material-symbols-outlined text-[20px]">remove</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Whiteboard;
