import { useCallback, useEffect, useRef } from 'react';
import { WhiteboardNote } from '@/src/hooks/types';
import { WhiteboardDragState } from '@/src/features/whiteboard/types/whiteboard.types';
import { LANDSCAPE_SIZE, PORTRAIT_SIZE } from '@/src/features/whiteboard/constants/whiteboard.constants';

interface UseWhiteboardViewportParams {
  view: { scale: number };
  setView: React.Dispatch<React.SetStateAction<{ scale: number }>>;
  setCanvasSize: React.Dispatch<React.SetStateAction<{ width: number; height: number }>>;
  setNotes: React.Dispatch<React.SetStateAction<WhiteboardNote[]>>;
  dragState: WhiteboardDragState;
  isReminderMenuOpen: boolean;
  setIsReminderMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsTaskPickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
  reminderMenuRef: React.RefObject<HTMLDivElement | null>;
  highestZIndex: React.MutableRefObject<number>;
}

export function useWhiteboardViewport({
  view,
  setView,
  setCanvasSize,
  setNotes,
  dragState,
  isReminderMenuOpen,
  setIsReminderMenuOpen,
  setIsTaskPickerOpen,
  containerRef,
  contentRef,
  reminderMenuRef,
  highestZIndex,
}: UseWhiteboardViewportParams) {
  const lastOrientation = useRef<'landscape' | 'portrait'>(
    window.innerWidth < 768 ? 'portrait' : 'landscape'
  );

  useEffect(() => {
    const handleResize = () => {
      const isPortrait = window.innerWidth < 768;
      const newOrientation = isPortrait ? 'portrait' : 'landscape';

      if (newOrientation !== lastOrientation.current) {
        setNotes((prevNotes) => prevNotes.map((note) => {
          if (newOrientation === 'portrait') {
            const cx = note.x + note.width / 2;
            const cy = note.y + note.height / 2;
            const newCx = PORTRAIT_SIZE.width - cy;
            const newCy = cx;
            return {
              ...note,
              x: newCx - note.width / 2,
              y: newCy - note.height / 2,
            };
          }
          const cx = note.x + note.width / 2;
          const cy = note.y + note.height / 2;
          const newCx = cy;
          const newCy = LANDSCAPE_SIZE.height - cx;
          return {
            ...note,
            x: newCx - note.width / 2,
            y: newCy - note.height / 2,
          };
        }));

        lastOrientation.current = newOrientation;
        setCanvasSize(isPortrait ? PORTRAIT_SIZE : LANDSCAPE_SIZE);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setNotes, setCanvasSize]);

  useEffect(() => {
    const isDragging =
      !!dragState &&
      (dragState.type === 'move' || dragState.type === 'resize' || dragState.type === 'rotate' || dragState.type === 'pan');

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
  }, [isReminderMenuOpen, reminderMenuRef, setIsReminderMenuOpen, setIsTaskPickerOpen]);

  const screenToCanvas = useCallback((screenX: number, screenY: number) => {
    if (!contentRef.current) return { x: 0, y: 0 };
    const rect = contentRef.current.getBoundingClientRect();
    return {
      x: (screenX - rect.left) / view.scale,
      y: (screenY - rect.top) / view.scale,
    };
  }, [contentRef, view.scale]);

  const handleZoom = useCallback((delta: number) => {
    setView((prev) => {
      const newScale = Math.min(Math.max(prev.scale + delta, 0.2), 3);
      return { ...prev, scale: newScale };
    });
  }, [setView]);

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
    return () => container.removeEventListener('wheel', handleWheel);
  }, [containerRef, handleZoom]);

  const bringToFront = useCallback((id: string) => {
    highestZIndex.current += 1;
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, zIndex: highestZIndex.current } : n)));
  }, [setNotes, highestZIndex]);

  return {
    screenToCanvas,
    handleZoom,
    bringToFront,
  };
}
