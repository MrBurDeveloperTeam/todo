import React, { useState, useEffect, useRef } from 'react';
import { Task } from '@/src/hooks/types';
import { ToolType } from '@/src/features/whiteboard/types/whiteboard.types';

interface WhiteboardToolbarProps {
  isToolbarExpanded: boolean;
  setIsToolbarExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  activeTool: ToolType;
  setActiveTool: React.Dispatch<React.SetStateAction<ToolType>>;
  handleToolChange: (tool: ToolType) => void;
  penColor: string;
  setPenColor: React.Dispatch<React.SetStateAction<string>>;
  penThickness: number;
  setPenThickness: React.Dispatch<React.SetStateAction<number>>;
  drawingsLength: number;
  onOpenClearDrawingsModal: () => void;
  reminderMenuRef: React.RefObject<HTMLDivElement | null>;
  isReminderMenuOpen: boolean;
  setIsReminderMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isTaskPickerOpen: boolean;
  setIsTaskPickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  tasks: Task[];
  addTaskAsNote: (task: Task) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  undo: () => void;
  redo: () => void;
  historyLength: number;
  futureLength: number;
  isMobileApp?: boolean;
}

export default function WhiteboardToolbar({
  isToolbarExpanded,
  setIsToolbarExpanded,
  activeTool,
  setActiveTool,
  handleToolChange,
  penColor,
  setPenColor,
  penThickness,
  setPenThickness,
  drawingsLength,
  onOpenClearDrawingsModal,
  reminderMenuRef,
  isReminderMenuOpen,
  setIsReminderMenuOpen,
  isTaskPickerOpen,
  setIsTaskPickerOpen,
  tasks,
  addTaskAsNote,
  fileInputRef,
  handleImageUpload,
  undo,
  redo,
  historyLength,
  futureLength,
  isMobileApp,
}: WhiteboardToolbarProps) {
  const btnBase = isMobileApp ? 'p-2 rounded-lg' : 'p-3 rounded-xl';
  const [showPenOptions, setShowPenOptions] = useState(false);
  const penPopupRef = useRef<HTMLDivElement>(null);

  // Close popup on outside click/touch
  useEffect(() => {
    if (!showPenOptions) return;
    const handleOutside = (e: PointerEvent) => {
      if (penPopupRef.current && !penPopupRef.current.contains(e.target as Node)) {
        setShowPenOptions(false);
      }
    };
    window.addEventListener('pointerdown', handleOutside);
    return () => window.removeEventListener('pointerdown', handleOutside);
  }, [showPenOptions]);
  return (
    <div
      className={isMobileApp
        ? `relative flex flex-col items-center bg-white/95 dark:bg-slate-900/95 border-r border-slate-200 dark:border-slate-800 z-50 overflow-y-auto overflow-x-visible shrink-0 justify-center
            ${isToolbarExpanded ? 'w-[48px] py-1 px-1 gap-0' : 'w-0 p-0 gap-0 border-r-0 overflow-hidden'}`
        : `absolute flex flex-col items-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-100 dark:border-slate-800 z-50 transition-all duration-300 ease-[cubic-bezier(0.19,1,0.22,1)]
            ${isToolbarExpanded
          ? 'left-6 top-1/2 -translate-y-1/2 w-auto p-2 rounded-2xl gap-2 justify-center'
          : 'left-0 top-1/2 -translate-y-1/2 p-0 rounded-r-xl gap-0'}`}
    >
      <button
        onClick={() => setIsToolbarExpanded(!isToolbarExpanded)}
        className={`transition-all text-slate-400 dark:text-slate-500 hover:text-slate-600 flex items-center justify-center
              ${isMobileApp ? 'p-1 rounded-lg bg-transparent border-none shadow-none hidden' : 'px-1 py-6 rounded-xl bg-transparent border-none shadow-none'}`}
        title={isToolbarExpanded ? 'Hide Toolbar' : 'Show Toolbar'}
      >
        <span className={`${isMobileApp ? '' : ''} material-symbols-outlined transition-transform duration-500 text-[26px] 
              ${isToolbarExpanded ? '' : 'rotate-180'}`}>
          chevron_left
        </span>
      </button>

      <div className={isMobileApp
        ? `flex flex-none flex-col items-center justify-center gap-0 ${isToolbarExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none h-0 overflow-hidden'}`
        : `flex flex-none flex-col items-center justify-center gap-3 transition-all duration-300 ${isToolbarExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none h-0 overflow-hidden'}`}>

        <button
          onClick={() => setActiveTool('select')}
          className={`${btnBase} transition-all group relative flex items-center justify-center ${activeTool === 'select' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          title="Select Tool (V)"
        >
          <span className="material-symbols-outlined">near_me</span>
        </button>

        <button
          onClick={() => setActiveTool('hand')}
          className={`${btnBase} transition-all group relative flex items-center justify-center ${activeTool === 'hand' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          title="Hand Tool (Space)"
        >
          <span className="material-symbols-outlined">pan_tool</span>
        </button>

        <div className="relative">
          <button
            onClick={() => { handleToolChange('pen'); setShowPenOptions(prev => !prev); }}
            className={`${btnBase} transition-all group relative flex items-center justify-center ${activeTool === 'pen' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            title="Pen Tool"
          >
            <span className="material-symbols-outlined">edit</span>
          </button>

          {activeTool === 'pen' && showPenOptions && (
            <div
              className="absolute left-full ml-2 top-1/2 -translate-y-1/2 flex flex-col gap-2 p-3 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-[9999]"
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
              ref={penPopupRef}
            >
              <div className="flex flex-row gap-2">
                {['black', '#ef4444', '#3b82f6', '#22c55e', '#f97316'].map(c => (
                  <button
                    key={c}
                    onClick={(e) => { e.stopPropagation(); setPenColor(c); setShowPenOptions(false); }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className={`w-7 h-7 rounded-full border-2 border-slate-200 dark:border-slate-600 ${penColor === c ? 'scale-125 ring-2 ring-blue-500 ring-offset-2' : 'hover:scale-110'} transition-all`}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
              <div className="w-full h-px bg-slate-200 dark:bg-slate-700"></div>
              <div className="flex flex-col items-center gap-1.5 px-1">
                <input
                  type="range"
                  min={1}
                  max={12}
                  value={penThickness}
                  onChange={(e) => { e.stopPropagation(); setPenThickness(Number(e.target.value)); }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  onTouchMove={(e) => e.stopPropagation()}
                  className="w-full h-1.5 accent-blue-500 cursor-pointer"
                  style={{ touchAction: 'auto' }}
                  title={`Thickness ${penThickness}px`}
                />
                <div className="flex items-center justify-center w-8 h-8">
                  <span
                    className="rounded-full bg-slate-700 dark:bg-slate-100 transition-all"
                    style={{ width: `${penThickness + 2}px`, height: `${penThickness + 2}px` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => handleToolChange('eraser')}
          className={`${btnBase} transition-all group relative flex items-center justify-center ${activeTool === 'eraser' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          title="Eraser Tool"
        >
          <span className="material-symbols-outlined">ink_eraser</span>
        </button>

        <button
          onClick={onOpenClearDrawingsModal}
          disabled={drawingsLength === 0}
          className={`${btnBase} transition-all group relative flex items-center justify-center ${drawingsLength === 0 ? 'opacity-30 cursor-not-allowed' : 'text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500'}`}
          title="Clear All Drawings"
        >
          <span className="material-symbols-outlined">delete_sweep</span>
        </button>

        <div className="w-full h-px bg-slate-100 dark:bg-slate-800"></div>

        <button
          onClick={() => setActiveTool('note')}
          className={`${btnBase} transition-all group relative flex items-center justify-center ${activeTool === 'note' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
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
            className={`${btnBase} transition-all group relative flex items-center justify-center ${activeTool === 'reminder' || isReminderMenuOpen ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
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

        <button
          onClick={() => setActiveTool('text')}
          className={`${btnBase} transition-all group relative flex items-center justify-center ${activeTool === 'text' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          title="Text Box (T)"
        >
          <span className="material-symbols-outlined">text_fields</span>
        </button>

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
            className={`${btnBase} transition-all group relative flex items-center justify-center ${activeTool === 'image' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            title="Upload Image"
          >
            <span className="material-symbols-outlined">image</span>
          </button>
        </div>

        <div className="w-full h-px bg-slate-100 dark:bg-slate-800"></div>

        <button
          onClick={undo}
          disabled={historyLength === 0}
          className={`${btnBase} transition-all group relative flex items-center justify-center ${historyLength === 0 ? 'opacity-30 cursor-not-allowed' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          title="Undo (Ctrl+Z)"
        >
          <span className="material-symbols-outlined">undo</span>
        </button>

        <button
          onClick={redo}
          disabled={futureLength === 0}
          className={`${btnBase} transition-all group relative flex items-center justify-center ${futureLength === 0 ? 'opacity-30 cursor-not-allowed' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          title="Redo (Ctrl+Y)"
        >
          <span className="material-symbols-outlined">redo</span>
        </button>
      </div>
    </div>
  );
}
