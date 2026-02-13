import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Task, WhiteboardNote } from '@/src/hooks/types';
import ShareWhiteboardModal from '@/src/features/whiteboard/components/ShareWhiteboardModal';
import ClearDrawingsModal from '@/src/features/whiteboard/components/ClearDrawingsModal';
import WhiteboardToolbar from '@/src/features/whiteboard/components/WhiteboardToolbar';
import WhiteboardNotesLayer from '@/src/features/whiteboard/components/WhiteboardNotesLayer';
import {
  ToolType,
  WhiteboardDragState,
} from '@/src/features/whiteboard/types/whiteboard.types';
import { useWhiteboardInteractions } from '@/src/features/whiteboard/hooks/useWhiteboardInteractions';
import { useWhiteboardNoteActions } from '@/src/features/whiteboard/hooks/useWhiteboardNoteActions';
import { useWhiteboardData } from '@/src/features/whiteboard/hooks/useWhiteboardData';
import { useWhiteboardViewport } from '@/src/features/whiteboard/hooks/useWhiteboardViewport';
import {
  getReminderDateValue,
  formatReminderDateLabel,
  parseReminderTitle,
} from '@/src/features/whiteboard/utils/reminder.utils';

import {
  LANDSCAPE_SIZE,
  COLORS,
} from '@/src/features/whiteboard/constants/whiteboard.constants';

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

const WhiteboardPage: React.FC<WhiteboardProps> = ({
  toggleTheme,
  notes,
  setNotes,
  userId,
  tasks = [],
  isOffline,
  whiteboardId,
  allowShare
}) => {
  const canShare = allowShare !== false;

  // --- State ---
  const [view, setView] = useState({ scale: 0.75 });
  const [canvasSize, setCanvasSize] = useState(LANDSCAPE_SIZE);
  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());

  // UI State
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isToolbarExpanded, setIsToolbarExpanded] = useState(true);
  const [isClearDrawingsModalOpen, setIsClearDrawingsModalOpen] = useState(false);
  const [isReminderMenuOpen, setIsReminderMenuOpen] = useState(false);
  const [isTaskPickerOpen, setIsTaskPickerOpen] = useState(false);
  const [editingReminderDateNoteId, setEditingReminderDateNoteId] = useState<string | null>(null);
  const [editingReminderTitleNoteId, setEditingReminderTitleNoteId] = useState<string | null>(null);
  const [editingReminderTitleValue, setEditingReminderTitleValue] = useState('');

  // Interaction State
  const [dragState, setDragState] = useState<WhiteboardDragState>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reminderMenuRef = useRef<HTMLDivElement>(null);
  const highestZIndex = useRef(10);

  const {
    effectiveWhiteboardId,
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
  } = useWhiteboardData({
    notes,
    setNotes,
    setSelectedNoteIds,
    userId,
    isOffline,
    whiteboardId,
    canShare,
    highestZIndex,
  });

  const handleToolChange = (tool: ToolType) => {
    if (activeTool === 'pen' && isDrawing) {
      cancelCurrentDrawingRef.current = true;
      setIsDrawing(false);
      currentPathRef.current = [];
      if (currentDrawingIdRef.current) {
        const idToRemove = currentDrawingIdRef.current;
        setDrawings((prev) => prev.filter((d) => d.id !== idToRemove));
      }
      currentDrawingIdRef.current = null;
    }
    setActiveTool(tool);
  };
  const { screenToCanvas, handleZoom, bringToFront } = useWhiteboardViewport({
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
  });
  // ----------------------------
  // Create Note (immediate save)
  // ----------------------------
  const {
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
  } = useWhiteboardNoteActions({
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
  });

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

  const {
    handlePointerDown,
    handlePointerMove,
    handleNotePointerDown,
    handleResizeStart,
    handleRotateStart,
    getCursor,
  } = useWhiteboardInteractions({
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
  });
  const selectedNote = getSelectedNote();
  const rotatingNoteId = dragState?.type === 'rotate' ? dragState.startNote?.id ?? null : null;

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

                <WhiteboardNotesLayer
                  notes={notes}
                  selectedNoteIds={selectedNoteIds}
                  activeTool={activeTool}
                  rotatingNoteId={rotatingNoteId}
                  editingReminderDateNoteId={editingReminderDateNoteId}
                  editingReminderTitleNoteId={editingReminderTitleNoteId}
                  editingReminderTitleValue={editingReminderTitleValue}
                  setEditingReminderTitleValue={setEditingReminderTitleValue}
                  setEditingReminderTitleNoteId={setEditingReminderTitleNoteId}
                  setEditingReminderDateNoteId={setEditingReminderDateNoteId}
                  onNotePointerDown={handleNotePointerDown}
                  onResizeStart={handleResizeStart}
                  onRotateStart={handleRotateStart}
                  onToggleReminderChecked={toggleReminderChecked}
                  onStartReminderTitleEdit={startReminderTitleEdit}
                  onSaveReminderTitleEdit={saveReminderTitleEdit}
                  onUpdateReminderDate={updateReminderDate}
                  onUpdateNoteContent={updateNoteContent}
                  onSelectAndBringToFront={selectAndBringToFront}
                  getReminderDateValue={getReminderDateValue}
                  formatReminderDateLabel={formatReminderDateLabel}
                  parseReminderTitle={parseReminderTitle}
                />
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

          <ShareWhiteboardModal
            isOpen={isShareOpen}
            shareUrl={shareUrl}
            shareQrDataUrl={shareQrDataUrl}
            shareError={shareError}
            onClose={() => setIsShareOpen(false)}
          />

          <ClearDrawingsModal
            isOpen={isClearDrawingsModalOpen}
            onClose={() => setIsClearDrawingsModalOpen(false)}
            onConfirm={async () => {
              await clearAllDrawings();
              setIsClearDrawingsModalOpen(false);
            }}
          />

          <WhiteboardToolbar
            isToolbarExpanded={isToolbarExpanded}
            setIsToolbarExpanded={setIsToolbarExpanded}
            activeTool={activeTool}
            setActiveTool={setActiveTool}
            handleToolChange={handleToolChange}
            penColor={penColor}
            setPenColor={setPenColor}
            penThickness={penThickness}
            setPenThickness={setPenThickness}
            drawingsLength={drawings.length}
            onOpenClearDrawingsModal={() => setIsClearDrawingsModalOpen(true)}
            reminderMenuRef={reminderMenuRef}
            isReminderMenuOpen={isReminderMenuOpen}
            setIsReminderMenuOpen={setIsReminderMenuOpen}
            isTaskPickerOpen={isTaskPickerOpen}
            setIsTaskPickerOpen={setIsTaskPickerOpen}
            tasks={tasks}
            addTaskAsNote={addTaskAsNote}
            fileInputRef={fileInputRef}
            handleImageUpload={handleImageUpload}
            undo={undo}
            redo={redo}
            historyLength={history.length}
            futureLength={future.length}
          />

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

export default WhiteboardPage;






