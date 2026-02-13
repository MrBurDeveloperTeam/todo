import React from 'react';
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
}: WhiteboardToolbarProps) {
  return (
    <div
      className={`absolute flex flex-row md:flex-col items-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-md shadow-[0_-8px_30px_rgb(0,0,0,0.06)] md:shadow-[0_8px_30px_rgb(0,0,0,0.12)] border-t md:border border-slate-100 dark:border-slate-800 z-50 transition-all duration-300 ease-[cubic-bezier(0.19,1,0.22,1)]
            ${isToolbarExpanded
          ? 'bottom-0 left-0 right-0 md:bottom-auto md:left-6 md:top-1/2 md:-translate-y-1/2 md:right-auto md:w-auto p-2 rounded-t-[32px] md:rounded-2xl gap-1 md:gap-2 justify-between md:justify-center'
          : 'bottom-0 left-1/2 -translate-x-1/2 md:left-0 md:top-1/2 md:-translate-y-1/2 md:translate-x-0 md:bottom-auto p-0 rounded-t-xl md:rounded-r-xl md:rounded-l-none md:rounded-b-none gap-0'}`}
    >
      <button
        onClick={() => setIsToolbarExpanded(!isToolbarExpanded)}
        className={`transition-all text-slate-400 dark:text-slate-500 hover:text-slate-600 flex items-center justify-center
              md:static absolute -top-7 left-1/2 -translate-x-1/2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-t-2xl px-6 py-0.5 
              md:bg-transparent md:border-none md:px-1 py-6  md:rounded-xl md:translate-x-0 md:top-auto
              shadow-[0_-4px_10px_rgb(0,0,0,0.03)] md:shadow-none`}
        title={isToolbarExpanded ? 'Hide Toolbar' : 'Show Toolbar'}
      >
        <span className={`hidden md:block material-symbols-outlined transition-transform duration-500 text-[26px] 
              ${isToolbarExpanded ? '' : 'rotate-180'}`}>
          chevron_left
        </span>
      </button>

      <div className={`flex flex-1 md:flex-none flex-row md:flex-col items-center justify-around md:justify-center gap-1 md:gap-3 transition-all duration-300 ${isToolbarExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none w-0 h-0 md:h-0 overflow-hidden'}`}>
        <div className="hidden md:block w-full h-px bg-slate-100 dark:bg-slate-800 my-1"></div>
        <button
          onClick={() => setActiveTool('select')}
          className={`p-3 rounded-xl transition-all group relative flex items-center justify-center ${activeTool === 'select' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          title="Select Tool (V)"
        >
          <span className="material-symbols-outlined">near_me</span>
        </button>

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
          onClick={onOpenClearDrawingsModal}
          disabled={drawingsLength === 0}
          className={`p-3 rounded-xl transition-all group relative flex items-center justify-center ${drawingsLength === 0 ? 'opacity-30 cursor-not-allowed' : 'text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500'}`}
          title="Clear All Drawings"
        >
          <span className="material-symbols-outlined">delete_sweep</span>
        </button>

        <div className="hidden md:block w-full h-px bg-slate-100 dark:bg-slate-800 my-1"></div>

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

        <button
          onClick={() => setActiveTool('text')}
          className={`p-3 rounded-xl transition-all group relative flex items-center justify-center ${activeTool === 'text' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
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
            className={`p-3 rounded-xl transition-all group relative flex items-center justify-center ${activeTool === 'image' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            title="Upload Image"
          >
            <span className="material-symbols-outlined">image</span>
          </button>
        </div>

        <div className="hidden md:block w-full h-px bg-slate-100 dark:bg-slate-800 my-1"></div>

        <button
          onClick={undo}
          disabled={historyLength === 0}
          className={`p-3 rounded-xl transition-all group relative flex items-center justify-center ${historyLength === 0 ? 'opacity-30 cursor-not-allowed' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          title="Undo (Ctrl+Z)"
        >
          <span className="material-symbols-outlined">undo</span>
        </button>

        <button
          onClick={redo}
          disabled={futureLength === 0}
          className={`p-3 rounded-xl transition-all group relative flex items-center justify-center ${futureLength === 0 ? 'opacity-30 cursor-not-allowed' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          title="Redo (Ctrl+Y)"
        >
          <span className="material-symbols-outlined">redo</span>
        </button>
      </div>
    </div>
  );
}
