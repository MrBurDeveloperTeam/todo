import { useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
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
  userId: string | null;
  effectiveWhiteboardId: string;
  notes: WhiteboardNote[];
  setNotes: React.Dispatch<React.SetStateAction<WhiteboardNote[]>>;
  selectedNoteIds: Set<string>;
  setSelectedNoteIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setShowColorPicker: React.Dispatch<React.SetStateAction<boolean>>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  saveHistorySnapshot: () => void;
  saveDrawing: (drawing: WhiteboardDrawing) => Promise<void>;
  scheduleSaveDrawing: (drawing: WhiteboardDrawing) => void;
  scheduleSaveNote: (note: WhiteboardNote) => void;
  screenToCanvas: (screenX: number, screenY: number) => { x: number; y: number };
  checkEraserCollision: (x: number, y: number) => void;
  addNote: (x: number, y: number, type?: 'sticky' | 'text' | 'image', imageUrl?: string) => void;
  addReminderSticky: (x: number, y: number) => void;
  bringToFront: (id: string) => void;
  isMobileApp?: boolean;
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
  scheduleSaveDrawing,
  scheduleSaveNote,
  screenToCanvas,
  checkEraserCollision,
  addNote,
  addReminderSticky,
  bringToFront,
  isMobileApp,
}: UseWhiteboardInteractionsParams) {
  const activePointerIdRef = useRef<number | null>(null);
  const isDrawingRef = useRef(false);
  const moveIdleTimerRef = useRef<number | null>(null);
  const closeDanglingStroke = useCallback((persist: boolean) => {
    if (!currentDrawingIdRef.current) return;

    const id = currentDrawingIdRef.current;
    const existing = drawingsRef.current.find((d) => d.id === id);

    if (persist && !cancelCurrentDrawingRef.current && existing && currentPathRef.current.length > 1) {
      void saveDrawing({
        ...existing,
        path_points: [...currentPathRef.current],
      });
    } else {
      setDrawings((prev) => prev.filter((d) => d.id !== id));
    }

    currentPathRef.current = [];
    currentDrawingIdRef.current = null;
    cancelCurrentDrawingRef.current = false;
    setIsDrawing(false);
    isDrawingRef.current = false;
    activePointerIdRef.current = null;
    if (moveIdleTimerRef.current) {
      window.clearTimeout(moveIdleTimerRef.current);
      moveIdleTimerRef.current = null;
    }
  }, [cancelCurrentDrawingRef, currentDrawingIdRef, currentPathRef, drawingsRef, saveDrawing, setDrawings, setIsDrawing]);

  useEffect(() => {
    isDrawingRef.current = isDrawing;
  }, [isDrawing]);

  const handlePointerUp = useCallback((e?: React.PointerEvent | TouchEvent | Event) => {
    if (e && 'pointerId' in e) {
      try {
        if ((e.target as HTMLElement).hasPointerCapture((e as any).pointerId)) {
          (e.target as HTMLElement).releasePointerCapture((e as any).pointerId);
        }
      } catch (err) { }
    }

    activePointerIdRef.current = null;
    setDragState(null);
    if (moveIdleTimerRef.current) {
      window.clearTimeout(moveIdleTimerRef.current);
      moveIdleTimerRef.current = null;
    }

    if (isDrawingRef.current) {
      setIsDrawing(false);
      isDrawingRef.current = false;
      if (!cancelCurrentDrawingRef.current && currentPathRef.current.length > 0 && currentDrawingIdRef.current) {
        const finishedDrawing = drawingsRef.current.find((d) => d.id === currentDrawingIdRef.current);
        if (finishedDrawing) {
          void saveDrawing({
            ...finishedDrawing,
            path_points: [...currentPathRef.current],
          });
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
  }, [setDragState, setIsDrawing, saveDrawing, drawingsRef, currentDrawingIdRef, currentPathRef, cancelCurrentDrawingRef, setDrawings]);

  useEffect(() => {
    const handleGlobalEnd = (e: Event) => handlePointerUp(e);
    window.addEventListener('pointerup', handleGlobalEnd);
    window.addEventListener('pointercancel', handleGlobalEnd);
    window.addEventListener('touchend', handleGlobalEnd);
    window.addEventListener('touchcancel', handleGlobalEnd);

    return () => {
      window.removeEventListener('pointerup', handleGlobalEnd);
      window.removeEventListener('pointercancel', handleGlobalEnd);
      window.removeEventListener('touchend', handleGlobalEnd);
      window.removeEventListener('touchcancel', handleGlobalEnd);
    };
  }, [handlePointerUp]);

  // Safari iOS fix: attach native touch listeners directly on the container.
  // Safari sometimes swallows pointerup but always fires touchend on the element.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onTouchEnd = () => {
      // If pointerup didn't fire, this will catch it
      if (isDrawingRef.current) {
        handlePointerUp();
      }
    };

    container.addEventListener('touchend', onTouchEnd, { passive: true });
    container.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [containerRef, handlePointerUp]);

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
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    if (activePointerIdRef.current !== null) {
      // iPhone Safari can miss pointer-up; recover so the next touch can start.
      if (activeTool === 'pen' && e.pointerType !== 'mouse') {
        closeDanglingStroke(true);
        setDragState(null);
        activePointerIdRef.current = null;
      } else {
        return;
      }
    }

    activePointerIdRef.current = e.pointerId;

    try {
      // Skip pointer capture for touch — Safari iOS keeps the session alive
      // and never fires pointerup when capture is active.
      if (e.pointerType === 'mouse') {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      }
    } catch (err) { }

    if (activeTool === 'pen') {
      closeDanglingStroke(true);

      saveHistorySnapshot();
      setIsDrawing(true);
      isDrawingRef.current = true;
      cancelCurrentDrawingRef.current = false;
      const coords = screenToCanvas(e.clientX, e.clientY);
      const newPoint = { x: coords.x, y: coords.y };
      currentPathRef.current = [newPoint];

      const tempId = uuidv4();
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
    closeDanglingStroke, setDragState,
  ]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (activePointerIdRef.current !== null && e.pointerId !== activePointerIdRef.current) return;

    if (isDrawingRef.current && activeTool === 'pen') {
      if (cancelCurrentDrawingRef.current) return;
      const coords = screenToCanvas(e.clientX, e.clientY);
      const newPoint = { x: coords.x, y: coords.y };

      // Distance-jump detection: if the new point is very far from the last
      // point, the user almost certainly lifted their finger and placed it
      // somewhere else.  Safari never fired pointerup in between.
      const prevPoints = currentPathRef.current;
      if (prevPoints.length > 0) {
        const last = prevPoints[prevPoints.length - 1];
        const dist = Math.sqrt(Math.pow(newPoint.x - last.x, 2) + Math.pow(newPoint.y - last.y, 2));
        if (dist > 200) {
          // Auto-close the old stroke and start a brand new one
          closeDanglingStroke(true);
          activePointerIdRef.current = e.pointerId;
          saveHistorySnapshot();
          setIsDrawing(true);
          isDrawingRef.current = true;
          cancelCurrentDrawingRef.current = false;
          currentPathRef.current = [newPoint];
          const tempId = uuidv4();
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
      }

      currentPathRef.current.push(newPoint);

      // Reset the idle timer — if no move event arrives within 300ms,
      // automatically finalize the stroke.  This is the ultimate Safari
      // fallback because it doesn’t rely on ANY up/end event at all.
      if (moveIdleTimerRef.current) {
        window.clearTimeout(moveIdleTimerRef.current);
      }
      moveIdleTimerRef.current = window.setTimeout(() => {
        if (isDrawingRef.current) {
          closeDanglingStroke(true);
        }
      }, 2000);

      setDrawings((prev) => {
        const newDrawings = [...prev];
        if (newDrawings.length > 0) {
          const lastIdx = newDrawings.length - 1;
          const lastDrawing = newDrawings[lastIdx];
          if (currentDrawingIdRef.current && lastDrawing.id !== currentDrawingIdRef.current) {
            return newDrawings;
          }
          const updated = {
            ...lastDrawing,
            path_points: [...lastDrawing.path_points, newPoint],
          };
          newDrawings[lastIdx] = updated;
          // Debounced auto-save every 1s while drawing
          scheduleSaveDrawing(updated);
        }
        return newDrawings;
      });
      return;
    }

    if (activeTool === 'eraser' && (e.buttons === 1 || e.pointerType !== 'mouse')) {
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
    closeDanglingStroke, userId, effectiveWhiteboardId, penColor, penThickness, saveHistorySnapshot, setIsDrawing,
    scheduleSaveDrawing,
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
    handlePointerUp,
    handleNotePointerDown,
    handleResizeStart,
    handleRotateStart,
    getCursor,
  };
}
