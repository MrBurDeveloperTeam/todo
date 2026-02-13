import React from 'react';
import { WhiteboardNote } from '@/src/hooks/types';
import { ToolType } from '@/src/features/whiteboard/types/whiteboard.types';
type ReminderMeta = { checked: boolean; taskName: string };

const REMINDER_CHECKED_PREFIX = '[x] ';
const REMINDER_UNCHECKED_PREFIX = '[ ] ';

const COLORS = {
  yellow: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/40',
    border: 'border-yellow-200 dark:border-yellow-700',
  },
  pink: {
    bg: 'bg-pink-100 dark:bg-pink-900/40',
    border: 'border-pink-200 dark:border-pink-700',
  },
  blue: {
    bg: 'bg-blue-100 dark:bg-blue-900/40',
    border: 'border-blue-200 dark:border-blue-700',
  },
  green: {
    bg: 'bg-green-100 dark:bg-green-900/40',
    border: 'border-green-200 dark:border-green-700',
  },
  transparent: {
    bg: 'bg-transparent',
    border: 'border-transparent hover:border-slate-300/50',
  },
} as const;

interface WhiteboardNotesLayerProps {
  notes: WhiteboardNote[];
  selectedNoteIds: Set<string>;
  activeTool: ToolType;
  rotatingNoteId: string | null;
  editingReminderDateNoteId: string | null;
  editingReminderTitleNoteId: string | null;
  editingReminderTitleValue: string;
  setEditingReminderTitleValue: React.Dispatch<React.SetStateAction<string>>;
  setEditingReminderTitleNoteId: React.Dispatch<React.SetStateAction<string | null>>;
  setEditingReminderDateNoteId: React.Dispatch<React.SetStateAction<string | null>>;
  onNotePointerDown: (e: React.PointerEvent, id: string) => void;
  onResizeStart: (e: React.PointerEvent, note: WhiteboardNote, handle: string) => void;
  onRotateStart: (e: React.PointerEvent, note: WhiteboardNote) => void;
  onToggleReminderChecked: (noteId: string) => void;
  onStartReminderTitleEdit: (note: WhiteboardNote) => void;
  onSaveReminderTitleEdit: (noteId: string) => void;
  onUpdateReminderDate: (noteId: string, dateValue: string) => void;
  onUpdateNoteContent: (id: string, content: string) => void;
  onSelectAndBringToFront: (id: string) => void;
  getReminderDateValue: (content: string) => string;
  formatReminderDateLabel: (dateValue: string) => string;
  parseReminderTitle: (note: WhiteboardNote) => ReminderMeta;
}

export default function WhiteboardNotesLayer({
  notes,
  selectedNoteIds,
  activeTool,
  rotatingNoteId,
  editingReminderDateNoteId,
  editingReminderTitleNoteId,
  editingReminderTitleValue,
  setEditingReminderTitleValue,
  setEditingReminderTitleNoteId,
  setEditingReminderDateNoteId,
  onNotePointerDown,
  onResizeStart,
  onRotateStart,
  onToggleReminderChecked,
  onStartReminderTitleEdit,
  onSaveReminderTitleEdit,
  onUpdateReminderDate,
  onUpdateNoteContent,
  onSelectAndBringToFront,
  getReminderDateValue,
  formatReminderDateLabel,
  parseReminderTitle,
}: WhiteboardNotesLayerProps) {
  return (
    <>
      {notes.map((note) => {
        const isSelected = selectedNoteIds.has(note.id);
        const isText = note.type === 'text';
        const isReminder =
          note.type === 'sticky' &&
          (note.title?.startsWith(REMINDER_CHECKED_PREFIX) ||
            note.title?.startsWith(REMINDER_UNCHECKED_PREFIX) ||
            note.title === 'Reminder');
        const reminderMeta = parseReminderTitle(note);
        const theme = COLORS[(note.color as keyof typeof COLORS) ?? 'yellow'] ?? COLORS.yellow;

        return (
          <div
            key={note.id}
            onPointerDown={(e) => onNotePointerDown(e, note.id)}
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
              cursor: activeTool === 'hand' ? 'grabbing' : 'grab',
            }}
          >
            {isSelected && (
              <>
                <div className={`absolute -inset-1 border-2 border-blue-500 pointer-events-none ${isReminder ? 'rounded-2xl' : 'rounded-lg'}`}></div>
                <div
                  className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-3 bg-white border-2 border-blue-500 rounded-full cursor-ns-resize z-50 hover:bg-blue-50 transition-colors shadow-sm"
                  onPointerDown={(e) => onResizeStart(e, note, 't')}
                />
                <div
                  className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-8 h-3 bg-white border-2 border-blue-500 rounded-full cursor-ns-resize z-50 hover:bg-blue-50 transition-colors shadow-sm"
                  onPointerDown={(e) => onResizeStart(e, note, 'b')}
                />
                <div
                  className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-8 bg-white border-2 border-blue-500 rounded-full cursor-ew-resize z-50 hover:bg-blue-50 transition-colors shadow-sm"
                  onPointerDown={(e) => onResizeStart(e, note, 'l')}
                />
                <div
                  className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-8 bg-white border-2 border-blue-500 rounded-full cursor-ew-resize z-50 hover:bg-blue-50 transition-colors shadow-sm"
                  onPointerDown={(e) => onResizeStart(e, note, 'r')}
                />
                <div
                  className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-nwse-resize z-50 hover:scale-125 transition-transform"
                  onPointerDown={(e) => onResizeStart(e, note, 'tl')}
                />
                <div
                  className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-nesw-resize z-50 hover:scale-125 transition-transform"
                  onPointerDown={(e) => onResizeStart(e, note, 'tr')}
                />
                <div
                  className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-nesw-resize z-50 hover:scale-125 transition-transform"
                  onPointerDown={(e) => onResizeStart(e, note, 'bl')}
                />
                <div
                  className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-blue-500 rounded-full cursor-nwse-resize z-50 hover:scale-125 transition-transform"
                  onPointerDown={(e) => onResizeStart(e, note, 'br')}
                />
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-0.5 h-12 bg-blue-500 pointer-events-none"></div>
                <div
                  className="absolute -top-[70px] left-1/2 -translate-x-1/2 w-9 h-9 bg-white border-2 border-blue-500 rounded-full cursor-grab active:cursor-grabbing z-50 hover:bg-blue-50 flex items-center justify-center shadow-sm transition-colors"
                  onPointerDown={(e) => onRotateStart(e, note)}
                >
                  <span className="material-symbols-outlined text-[16px] text-blue-600 font-bold">refresh</span>
                </div>
              </>
            )}

            {rotatingNoteId === note.id && (
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
                      onToggleReminderChecked(note.id);
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
                        onBlur={() => onSaveReminderTitleEdit(note.id)}
                        onPointerDown={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            onSaveReminderTitleEdit(note.id);
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
                          onStartReminderTitleEdit(note);
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
                        onChange={(e) => onUpdateReminderDate(note.id, e.target.value)}
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
                    onChange={(e) => onUpdateNoteContent(note.id, e.target.value)}
                    placeholder="Add reminder details..."
                    className={`flex-1 w-full h-full border rounded-xl resize-none focus:ring-0 p-3 font-medium leading-relaxed transition-all [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${reminderMeta.checked ? 'bg-white/40 dark:bg-rose-950/20 border-rose-200/60 dark:border-rose-900/35 text-rose-900/75 dark:text-rose-100/80 placeholder:text-rose-800/35 dark:placeholder:text-rose-100/25' : 'bg-white/60 dark:bg-slate-900/50 border-rose-200/70 dark:border-rose-900/40 text-slate-800 dark:text-slate-100 placeholder:text-slate-500/40'} ${activeTool === 'hand' ? 'pointer-events-none' : 'cursor-text'}`}
                    style={{
                      fontSize: `${note.fontSize}px`,
                      lineHeight: 1.4,
                    }}
                    spellCheck={false}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      onSelectAndBringToFront(note.id);
                    }}
                    autoFocus={isSelected}
                  />
                </div>
              ) : (
                <textarea
                  value={note.content}
                  onChange={(e) => onUpdateNoteContent(note.id, e.target.value)}
                  placeholder="Write something..."
                  className={`flex-1 w-full h-full bg-transparent border-0 resize-none focus:ring-0 p-0 text-slate-800 dark:text-slate-100 font-medium leading-relaxed placeholder:text-slate-500/30 transition-all [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${activeTool === 'hand' ? 'pointer-events-none' : 'cursor-text'}`}
                  style={{
                    fontSize: `${note.fontSize}px`,
                    lineHeight: 1.4,
                  }}
                  spellCheck={false}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    onSelectAndBringToFront(note.id);
                  }}
                  autoFocus={isSelected}
                />
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}
