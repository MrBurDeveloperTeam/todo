import { useCallback, useEffect } from 'react';
import { Task, WhiteboardNote } from '@/src/hooks/types';
import { ToolType } from '@/src/features/whiteboard/types/whiteboard.types';
import {
  REMINDER_CHECKED_PREFIX,
  REMINDER_UNCHECKED_PREFIX,
} from '@/src/features/whiteboard/constants/whiteboard.constants';
import { parseReminderTitle } from '@/src/features/whiteboard/utils/reminder.utils';

interface UseWhiteboardNoteActionsParams {
  notes: WhiteboardNote[];
  canvasSize: { width: number; height: number };
  selectedNoteIds: Set<string>;
  editingReminderTitleValue: string;
  setEditingReminderTitleNoteId: React.Dispatch<React.SetStateAction<string | null>>;
  setEditingReminderTitleValue: React.Dispatch<React.SetStateAction<string>>;
  setNotes: React.Dispatch<React.SetStateAction<WhiteboardNote[]>>;
  setSelectedNoteIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setActiveTool: React.Dispatch<React.SetStateAction<ToolType>>;
  setShowColorPicker: React.Dispatch<React.SetStateAction<boolean>>;
  setIsTaskPickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsReminderMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  highestZIndex: React.MutableRefObject<number>;
  saveHistorySnapshot: () => void;
  scheduleSaveNote: (note: WhiteboardNote) => void;
  upsertNote: (note: WhiteboardNote) => Promise<void>;
  deleteNoteFromDb: (id: string) => Promise<void>;
  screenToCanvas: (screenX: number, screenY: number) => { x: number; y: number };
  bringToFront: (id: string) => void;
}

export function useWhiteboardNoteActions({
  notes,
  canvasSize,
  selectedNoteIds,
  editingReminderTitleValue,
  setEditingReminderTitleNoteId,
  setEditingReminderTitleValue,
  setNotes,
  setSelectedNoteIds,
  setActiveTool,
  setShowColorPicker,
  setIsTaskPickerOpen,
  setIsReminderMenuOpen,
  fileInputRef,
  containerRef,
  highestZIndex,
  saveHistorySnapshot,
  scheduleSaveNote,
  upsertNote,
  deleteNoteFromDb,
  screenToCanvas,
  bringToFront,
}: UseWhiteboardNoteActionsParams) {
  const addNote = useCallback((
    x: number,
    y: number,
    type: 'sticky' | 'text' | 'image' = 'sticky',
    imageUrl?: string
  ) => {
    if (x < 0 || y < 0 || x > canvasSize.width || y > canvasSize.height) return;

    saveHistorySnapshot();
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
      createdAt: Date.now(),
    };

    setNotes((prev) => [...prev, newNote]);
    setSelectedNoteIds(new Set([id]));
    setActiveTool('select');
    void upsertNote(newNote);
  }, [canvasSize, saveHistorySnapshot, highestZIndex, setNotes, setSelectedNoteIds, setActiveTool, upsertNote]);

  const addTaskAsNote = useCallback((task: Task) => {
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
      'Write notes here...',
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
    void upsertNote(newNote);
  }, [saveHistorySnapshot, highestZIndex, canvasSize, setNotes, setSelectedNoteIds, setActiveTool, setIsTaskPickerOpen, setIsReminderMenuOpen, upsertNote]);

  const addReminderSticky = useCallback((x: number, y: number) => {
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
    void upsertNote(newNote);
  }, [saveHistorySnapshot, highestZIndex, canvasSize, setNotes, setSelectedNoteIds, setActiveTool, upsertNote]);

  const updateReminderDate = useCallback((noteId: string, dateValue: string) => {
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
  }, [saveHistorySnapshot, setNotes, scheduleSaveNote]);

  const toggleReminderChecked = useCallback((noteId: string) => {
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
  }, [saveHistorySnapshot, setNotes, scheduleSaveNote]);

  const startReminderTitleEdit = useCallback((note: WhiteboardNote) => {
    const parsed = parseReminderTitle(note);
    setEditingReminderTitleNoteId(note.id);
    setEditingReminderTitleValue(parsed.taskName);
  }, [setEditingReminderTitleNoteId, setEditingReminderTitleValue]);

  const saveReminderTitleEdit = useCallback((noteId: string) => {
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
  }, [editingReminderTitleValue, setEditingReminderTitleNoteId, saveHistorySnapshot, setNotes, scheduleSaveNote]);

  const processImageFile = useCallback((file: File, x: number, y: number) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string;
      addNote(x, y, 'image', imageUrl);
    };
    reader.readAsDataURL(file);
  }, [addNote]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file, canvasSize.width / 2, canvasSize.height / 2);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [processImageFile, canvasSize, fileInputRef]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const coords = screenToCanvas(e.clientX, e.clientY);
      processImageFile(file, coords.x, coords.y);
    }
  }, [screenToCanvas, processImageFile]);

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
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
  }, [containerRef, screenToCanvas, processImageFile, addNote, canvasSize]);

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const deleteSelected = useCallback(() => {
    if (selectedNoteIds.size === 0) return;
    saveHistorySnapshot();
    selectedNoteIds.forEach((id) => void deleteNoteFromDb(id));
    setNotes((prev) => prev.filter((n) => !selectedNoteIds.has(n.id)));
    setSelectedNoteIds(new Set());
  }, [selectedNoteIds, saveHistorySnapshot, deleteNoteFromDb, setNotes, setSelectedNoteIds]);

  const getSelectedNote = useCallback(() => {
    if (selectedNoteIds.size !== 1) return null;
    const id = Array.from(selectedNoteIds)[0];
    return notes.find((n) => n.id === id) || null;
  }, [selectedNoteIds, notes]);

  const updateNoteColor = useCallback((color: WhiteboardNote['color']) => {
    const stickyType: WhiteboardNote['type'] = 'sticky';
    saveHistorySnapshot();
    setNotes((prev) => {
      const next = prev.map((n) => selectedNoteIds.has(n.id) ? { ...n, color, type: stickyType } : n);
      next.forEach((n) => { if (selectedNoteIds.has(n.id)) scheduleSaveNote(n); });
      return next;
    });
    setShowColorPicker(false);
  }, [saveHistorySnapshot, setNotes, selectedNoteIds, scheduleSaveNote, setShowColorPicker]);

  const updateNoteFontSize = useCallback((increment: number) => {
    setNotes((prev) => {
      const next = prev.map((n) => {
        if (selectedNoteIds.has(n.id)) {
          return { ...n, fontSize: Math.max(8, Math.min(96, n.fontSize + increment)) };
        }
        return n;
      });
      next.forEach((n) => {
        if (selectedNoteIds.has(n.id)) scheduleSaveNote(n);
      });
      return next;
    });
  }, [setNotes, selectedNoteIds, scheduleSaveNote]);

  const updateNoteContent = useCallback((id: string, content: string) => {
    setNotes((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, content } : n));
      const changed = next.find((n) => n.id === id);
      if (changed) scheduleSaveNote(changed);
      return next;
    });
  }, [setNotes, scheduleSaveNote]);

  const selectAndBringToFront = useCallback((id: string) => {
    if (!selectedNoteIds.has(id)) {
      setSelectedNoteIds(new Set([id]));
    }
    bringToFront(id);
  }, [selectedNoteIds, setSelectedNoteIds, bringToFront]);

  return {
    addNote,
    addTaskAsNote,
    addReminderSticky,
    updateReminderDate,
    toggleReminderChecked,
    startReminderTitleEdit,
    saveReminderTitleEdit,
    handleImageUpload,
    handleDrop,
    deleteSelected,
    getSelectedNote,
    updateNoteColor,
    updateNoteFontSize,
    updateNoteContent,
    selectAndBringToFront,
  };
}
