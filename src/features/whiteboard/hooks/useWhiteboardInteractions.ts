import { useCallback, useEffect } from 'react';
import { WhiteboardNote } from '@/src/hooks/types';
import { ToolType, WhiteboardDragState, WhiteboardDrawing } from '@/src/features/whiteboard/types/whiteboard.types';
import { MIN_SIZE } from '@/src/features/whiteboard/constants/whiteboard.constants';

interface UseWhiteboardInteractionsParams {
  activeTool: ToolType;
  dragState: WhiteboardDragState;
  setDragState: React.Dispatch<React.SetStateAction<WhiteboardDragState>>;
  isDrawing: boolean;
  setIsDrawing: React.Dispatch<React.SetStateAction<boolean>>;
  cancelCurrentDrawingRef: React.MutableRefObject<boolean>;
  currentPathRef: React.MutableRefObject<{ x: number; y: number }[]>;
  currentDrawingIdRef: React.MutableRefObject<string | null>;
  drawingsRef: React.MutableRefObject<WhiteboardDrawing[]>;
  setDrawings: React.Dispatch<React.SetStateAction<WhiteboardDrawing[]>>;
  penColor: string;
  penThickness: number;
  userId: string;
  effectiveWhiteboardId: string;
  notes: WhiteboardNote[];
  setNotes: React.Dispatch<React.SetStateAction<WhiteboardNote[]>>;
  selectedNoteIds: Set<string>;
  setSelectedNoteIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setShowColorPicker: React.Dispatch<React.SetStateAction<boolean>>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  saveHistorySnapshot: () => void;
  saveDrawing: (drawing: WhiteboardDrawing) => Promise<void>;
  scheduleSaveNote: (note: WhiteboardNote) => void;
  screenToCanvas: (screenX: number, screenY: number) => { x: number; y: number };
  checkEraserCollision: (x: number, y: number) => void;
  addNote: (x: number, y: number, type?: 'sticky' | 'text' | 'image', imageUrl?: string) => void;
  addReminderSticky: (x: number, y: number) => void;
  bringToFront: (id: string) => void;
}

export function useWhiteboardInteractions({
  activeTool,
  dragState,
  setDragState,
  isDrawing,
  setIsDrawing,
  cancelCurrentDrawingRef,
  currentPathRef,
  currentDrawingIdRef,
  drawingsRef,
  setDrawings,
  penColor,
  penThickness,
  userId,
  effectiveWhiteboardId,
  notes,
  setNotes,
  selectedNoteIds,
  setSelectedNoteIds,
  setShowColorPicker,
  containerRef,
  saveHistorySnapshot,
  saveDrawing,
  scheduleSaveNote,
  screenToCanvas,
  checkEraserCollision,
  addNote,
  addReminderSticky,
  bringToFront,
}: UseWhiteboardInteractionsParams) {
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      setDragState(null);
      if (isDrawing) {
        setIsDrawing(false);
        if (!cancelCurrentDrawingRef.current && currentPathRef.current.length > 0 && currentDrawingIdRef.current) {
          const finishedDrawing = drawingsRef.current.find((d) => d.id === currentDrawingIdRef.current);
          if (finishedDrawing) {
            void saveDrawing(finishedDrawing);
          }
          currentPathRef.current = [];
        }
        if (cancelCurrentDrawingRef.current && currentDrawingIdRef.current) {
          const idToRemove = currentDrawingIdRef.current;
          setDrawings((prev) => prev.filter((d) => d.id !== idToRemove));
        }
        cancelCurrentDrawingRef.current = false;
        currentDrawingIdRef.current = null;
      }
    };
    window.addEventListener('pointerup', handleGlobalPointerUp);
    return () => window.removeEventListener('pointerup', handleGlobalPointerUp);
  }, [isDrawing, setDragState, setIsDrawing, saveDrawing, drawingsRef, currentDrawingIdRef, currentPathRef, cancelCurrentDrawingRef, setDrawings]);

  const startInteraction = useCallback((type: 'move' | 'resize' | 'rotate' | 'pan', mouse: { x: number; y: number }, note?: WhiteboardNote, handle?: string) => {
    if (type !== 'pan') {
      saveHistorySnapshot();
    }
    setDragState({
      type,
      startMouse: mouse,
      startNote: note ? { ...note } : undefined,
      handle,
      startScroll: type === 'pan' && containerRef.current ? { x: containerRef.current.scrollLeft, y: containerRef.current.scrollTop } : undefined,
    });
  }, [saveHistorySnapshot, setDragState, containerRef]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (activeTool === 'pen') {
      saveHistorySnapshot();
      setIsDrawing(true);
      cancelCurrentDrawingRef.current = false;
      const coords = screenToCanvas(e.clientX, e.clientY);
      const newPoint = { x: coords.x, y: coords.y };
      currentPathRef.current = [newPoint];

      const tempId = crypto.randomUUID();
      currentDrawingIdRef.current = tempId;
      setDrawings((prev) => [...prev, {
        id: tempId,
        user_id: userId,
        whiteboard_id: effectiveWhiteboardId,
        path_points: [newPoint],
        color: penColor,
        thickness: penThickness,
      }]);
      return;
    }

    if (activeTool === 'eraser') {
      if (drawingsRef.current.length > 0) {
        saveHistorySnapshot();
      }
      const coords = screenToCanvas(e.clientX, e.clientY);
      checkEraserCollision(coords.x, coords.y);
      return;
    }

    if (activeTool === 'hand') {
      if (containerRef.current) {
        startInteraction('pan', { x: e.clientX, y: e.clientY });
      }
      return;
    }

    if (activeTool === 'note') {
      const coords = screenToCanvas(e.clientX, e.clientY);
      addNote(coords.x, coords.y, 'sticky');
      return;
    }

    if (activeTool === 'reminder') {
      const coords = screenToCanvas(e.clientX, e.clientY);
      addReminderSticky(coords.x, coords.y);
      return;
    }

    if (activeTool === 'text') {
      const coords = screenToCanvas(e.clientX, e.clientY);
      addNote(coords.x, coords.y, 'text');
      return;
    }

    if (e.target === containerRef.current || (e.target as HTMLElement).closest('.canvas-background')) {
      setSelectedNoteIds(new Set());
      setShowColorPicker(false);
    }
  }, [
    activeTool, saveHistorySnapshot, setIsDrawing, screenToCanvas, setDrawings, userId, effectiveWhiteboardId, penColor,
    penThickness, drawingsRef, checkEraserCollision, containerRef, startInteraction, addNote, addReminderSticky,
    setSelectedNoteIds, setShowColorPicker, cancelCurrentDrawingRef, currentPathRef, currentDrawingIdRef,
  ]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (isDrawing && activeTool === 'pen') {
      if (cancelCurrentDrawingRef.current) return;
      const coords = screenToCanvas(e.clientX, e.clientY);
      const newPoint = { x: coords.x, y: coords.y };
      currentPathRef.current.push(newPoint);

      setDrawings((prev) => {
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

    if (activeTool === 'eraser' && e.buttons === 1) {
      const coords = screenToCanvas(e.clientX, e.clientY);
      checkEraserCollision(coords.x, coords.y);
      return;
    }

    if (!dragState) return;

    if (dragState.type === 'pan' && containerRef.current && dragState.startScroll) {
      e.preventDefault();
      const dx = e.clientX - dragState.startMouse.x;
      const dy = e.clientY - dragState.startMouse.y;
      containerRef.current.scrollLeft = dragState.startScroll.x - dx;
      containerRef.current.scrollTop = dragState.startScroll.y - dy;
      return;
    }

    const coords = screenToCanvas(e.clientX, e.clientY);

    if (dragState.type === 'move' && dragState.startNote) {
      const dx = coords.x - dragState.startMouse.x;
      const dy = coords.y - dragState.startMouse.y;

      setNotes((prev) => {
        const next = prev.map((n) => {
          if (n.id === dragState.startNote!.id) {
            return { ...n, x: dragState.startNote!.x + dx, y: dragState.startNote!.y + dy };
          }
          return n;
        });
        const changed = next.find((n) => n.id === dragState.startNote!.id);
        if (changed) scheduleSaveNote(changed);
        return next;
      });
    }

    if (dragState.type === 'rotate' && dragState.startNote) {
      const sn = dragState.startNote;
      const centerX = sn.x + sn.width / 2;
      const centerY = sn.y + sn.height / 2;
      const startAngle = Math.atan2(dragState.startMouse.y - centerY, dragState.startMouse.x - centerX);
      const currentAngle = Math.atan2(coords.y - centerY, coords.x - centerX);
      const deltaAngle = (currentAngle - startAngle) * (180 / Math.PI);

      setNotes((prev) => {
        const next = prev.map((n) => (n.id === sn.id ? { ...n, rotation: sn.rotation + deltaAngle } : n));
        const changed = next.find((n) => n.id === sn.id);
        if (changed) scheduleSaveNote(changed);
        return next;
      });
    }

    if (dragState.type === 'resize' && dragState.startNote && dragState.handle) {
      const sn = dragState.startNote;
      const globalDx = coords.x - dragState.startMouse.x;
      const globalDy = coords.y - dragState.startMouse.y;

      const rad = sn.rotation * (Math.PI / 180);
      const cos = Math.cos(-rad);
      const sin = Math.sin(-rad);
      const localDx = globalDx * cos - globalDy * sin;
      const localDy = globalDx * sin + globalDy * cos;

      let newW = sn.width;
      let newH = sn.height;

      const isLeft = dragState.handle.includes('l');
      const isRight = dragState.handle.includes('r');
      const isTop = dragState.handle.includes('t');
      const isBottom = dragState.handle.includes('b');

      if (isLeft) newW -= localDx;
      else if (isRight) newW += localDx;

      if (isTop) newH -= localDy;
      else if (isBottom) newH += localDy;

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

      setNotes((prev) => {
        const next = prev.map((n) => {
          if (n.id === sn.id) {
            return {
              ...n,
              width: newW,
              height: newH,
              x: sn.x + globalShiftX - (wDiff / 2),
              y: sn.y + globalShiftY - (hDiff / 2),
            };
          }
          return n;
        });
        const changed = next.find((n) => n.id === sn.id);
        if (changed) scheduleSaveNote(changed);
        return next;
      });
    }
  }, [
    isDrawing, activeTool, cancelCurrentDrawingRef, screenToCanvas, currentPathRef, setDrawings, currentDrawingIdRef,
    checkEraserCollision, dragState, containerRef, setNotes, scheduleSaveNote,
  ]);

  const handleNotePointerDown = useCallback((e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    if (!selectedNoteIds.has(id) && !e.shiftKey) {
      setSelectedNoteIds(new Set([id]));
    }
    bringToFront(id);
    const coords = screenToCanvas(e.clientX, e.clientY);
    const note = notes.find((n) => n.id === id);
    if (note) {
      startInteraction('move', coords, note);
    }
  }, [selectedNoteIds, setSelectedNoteIds, bringToFront, screenToCanvas, notes, startInteraction]);

  const handleResizeStart = useCallback((e: React.PointerEvent, note: WhiteboardNote, handle: string) => {
    e.stopPropagation();
    const coords = screenToCanvas(e.clientX, e.clientY);
    startInteraction('resize', coords, note, handle);
  }, [screenToCanvas, startInteraction]);

  const handleRotateStart = useCallback((e: React.PointerEvent, note: WhiteboardNote) => {
    e.stopPropagation();
    const coords = screenToCanvas(e.clientX, e.clientY);
    startInteraction('rotate', coords, note);
  }, [screenToCanvas, startInteraction]);

  const getCursor = useCallback(() => {
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
  }, [activeTool, dragState]);

  return {
    handlePointerDown,
    handlePointerMove,
    handleNotePointerDown,
    handleResizeStart,
    handleRotateStart,
    getCursor,
  };
}
