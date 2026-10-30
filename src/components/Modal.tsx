import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Clock, Calendar, Search, Briefcase, ChevronDown } from 'lucide-react';
import { TaskItem, ItemType, Priority, ListType } from '../types';

interface ModalProps {
  show: boolean;
  canManageEvents: boolean;
  saving: boolean;
  whiteTextAccentFill: string;
  onClose: () => void;
  newTask: Partial<TaskItem>;
  setNewTask: (task: Partial<TaskItem>) => void;
  onSubmit: () => void;
  isEdit?: boolean;
  availableLists?: {id: string, name: string, color: string}[];
}

export function Modal({ canManageEvents, saving, whiteTextAccentFill, show, onClose, newTask, setNewTask, onSubmit, isEdit, availableLists = [] }: ModalProps) {
  const [isListDropdownOpen, setIsListDropdownOpen] = useState(false);
  const [titleError, setTitleError] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!show) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const viewport = window.visualViewport;
    // The visual viewport also shrinks when a phone's keyboard opens.
    const updateViewport = () => {
      const overlay = overlayRef.current;
      if (!overlay) return;
      overlay.style.height = `${viewport?.height ?? window.innerHeight}px`;
      overlay.style.top = `${viewport?.offsetTop ?? 0}px`;
    };
    updateViewport();
    viewport?.addEventListener('resize', updateViewport);
    viewport?.addEventListener('scroll', updateViewport);
    window.addEventListener('resize', updateViewport);
    return () => {
      document.body.style.overflow = previousOverflow;
      viewport?.removeEventListener('resize', updateViewport);
      viewport?.removeEventListener('scroll', updateViewport);
      window.removeEventListener('resize', updateViewport);
    };
  }, [show]);

  const selectableLists = availableLists.filter(list => canManageEvents || (list.id.toLowerCase() !== 'events' && list.name.toLowerCase() !== 'events'));
  const selectedList = selectableLists.find(l => l.id === newTask.list) || selectableLists[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsListDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!show) return null;

  return createPortal(
    <div ref={overlayRef} className="task-modal-overlay fixed inset-x-0 top-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div role="dialog" aria-modal="true" aria-labelledby="task-modal-heading" style={{ '--modal-white-text-accent-bg': whiteTextAccentFill } as React.CSSProperties} className="task-modal-panel flex min-h-0 min-w-0 flex-col w-full max-w-xl max-h-full bg-[var(--surface)] rounded-2xl sm:rounded-3xl shadow-2xl border border-[var(--border)] overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="shrink-0 px-4 py-3 sm:px-6 sm:py-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg3)]/50">
          <h2 id="task-modal-heading" className="text-lg sm:text-xl font-black">{isEdit ? 'Edit Item' : 'Create New'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-[var(--bg3)] rounded-full transition"><X size={20} /></button>
        </div>

        <div className="min-h-0 min-w-0 p-4 sm:p-6 space-y-5 overflow-y-auto overscroll-contain custom-scrollbar" onScroll={() => setIsListDropdownOpen(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {(['task', 'event', 'reminder'] as ItemType[]).map(t => (
                <button 
                  key={t}
                  disabled={saving || (t === 'event' && !canManageEvents)}
                  title={t === 'event' && !canManageEvents ? 'Only the company owner or manager can create events' : undefined}
                  onClick={() => setNewTask({...newTask, type: t})}
                  className={`min-w-0 py-2 px-2 sm:px-3 rounded-xl text-[10px] sm:text-xs font-medium uppercase tracking-wider transition border disabled:opacity-75 disabled:cursor-not-allowed ${newTask.type === t ? 'bg-accent text-white border-accent' : 'bg-[var(--bg3)] border-[var(--border)] text-[var(--text3)] hover:border-accent/40'}`}
                >
                  {t === 'event' && !canManageEvents ? 'Event (locked)' : t}
                </button>
              ))}
            </div>

            <input 
              autoFocus
              autoComplete="off"
              className="w-full text-xl sm:text-2xl font-black bg-transparent outline-none placeholder:text-[var(--text4)]"
              aria-label="Task title"
              placeholder="What needs to be done?"
              aria-invalid={Boolean(titleError)}
              aria-describedby={titleError ? 'modal-title-error' : undefined}
              value={newTask.title || ''}
              onChange={e => {
                setNewTask({...newTask, title: e.target.value});
                if (titleError) setTitleError('');
              }}
            />
            {titleError && <p id="modal-title-error" role="alert" className="text-xs font-semibold text-[var(--priority-high)]">{titleError}</p>}

            <textarea 
              className="w-full min-h-[100px] bg-[var(--bg3)] p-4 rounded-2xl outline-none placeholder:text-[var(--text4)] resize-none text-[13.5px] border border-[var(--border)] focus:border-accent transition group"
              placeholder="Add details, notes or description..."
              value={newTask.desc || ''}
              onChange={e => setNewTask({...newTask, desc: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text4)] flex items-center gap-1.5"><Calendar size={12} /> Date</label>
              <input 
                type="date"
                className="w-full bg-[var(--bg3)] p-3 rounded-xl outline-none border border-[var(--border)] focus:border-accent text-sm font-medium"
                value={newTask.date || ''}
                onChange={e => setNewTask({...newTask, date: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text4)] flex items-center gap-1.5"><Clock size={12} /> Time</label>
              <input 
                type="time"
                className="w-full bg-[var(--bg3)] p-3 rounded-xl outline-none border border-[var(--border)] focus:border-accent text-sm font-medium"
                value={newTask.time || ''}
                onChange={e => setNewTask({...newTask, time: e.target.value})}
              />
            </div>
          </div>

          <div className={`grid overflow-hidden transition-all duration-300 ease-in-out ${newTask.type === 'event' ? 'grid-rows-[1fr] opacity-100 mt-0' : 'grid-rows-[0fr] opacity-0 -mt-2'}`}>
            <div className="min-h-0">
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
               <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text4)]">End Date</label>
                 <input 
                   type="date"
                   className="w-full bg-[var(--bg3)] p-3 rounded-xl outline-none border border-[var(--border)] focus:border-accent text-sm font-medium"
                   value={newTask.enddate || ''}
                   onChange={e => setNewTask({...newTask, enddate: e.target.value})}
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text4)]">End Time</label>
                 <input 
                   type="time"
                   className="w-full bg-[var(--bg3)] p-3 rounded-xl outline-none border border-[var(--border)] focus:border-accent text-sm font-medium"
                   value={newTask.endtime || ''}
                   onChange={e => setNewTask({...newTask, endtime: e.target.value})}
                 />
               </div>
             </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text4)]">Priority</label>
              <div className="flex gap-1 bg-[var(--bg3)] p-1 rounded-xl border border-[var(--border)]">
                {(['none', 'low', 'med', 'high'] as Priority[]).map(p => (
                  <button 
                    key={p}
                    onClick={() => setNewTask({...newTask, priority: p})}
                    className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-black uppercase transition ${newTask.priority === p ? (p === 'high' ? 'bg-red-500 text-white' : p === 'med' ? 'bg-orange-500 text-white' : p === 'low' ? 'bg-blue-500 text-white' : 'bg-slate-500 text-white') : 'hover:bg-[var(--bg-hover)] text-[var(--text3)]'}`}
                  >
                    {p === 'none' ? '—' : p}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text4)]">Category</label>
              <div className="relative" ref={dropdownRef}>
                <button 
                  type="button"
                  onClick={() => setIsListDropdownOpen(!isListDropdownOpen)}
                  className="w-full flex items-center justify-between bg-[var(--bg3)] px-3 py-2 rounded-xl border border-[var(--border)] focus:border-accent outline-none text-[13px] font-medium transition-all hover:bg-[var(--bg-hover)]"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedList?.color || 'var(--accent)' }} />
                    <span className="text-[12px]">{selectedList?.name || 'Select a list...'}</span>
                  </div>
                  <ChevronDown size={12} className={`transition-transform duration-200 ${isListDropdownOpen ? 'rotate-180 opacity-60' : 'opacity-60'}`} />
                </button>

                {isListDropdownOpen && (
                  <div className="fixed mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.2)] z-[200] py-1 overflow-hidden animate-in slide-in-from-top-2 duration-200 max-w-[calc(100vw-1rem)] sm:max-w-none" 
                       style={{ 
                         width: dropdownRef.current?.offsetWidth || '200px',
                          top: (dropdownRef.current?.getBoundingClientRect().bottom || 0) + 4,
                         left: Math.max(8, dropdownRef.current?.getBoundingClientRect().left || 0)
                       }}>
                    <div className="max-h-[100px] overflow-y-auto custom-scrollbar shadow-inner">
                      {selectableLists.map(l => (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => {
                            setNewTask({...newTask, list: l.id});
                            setIsListDropdownOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-2 text-[11px] font-bold transition-colors hover:bg-[var(--bg3)] ${newTask.list === l.id ? 'bg-[var(--accent-light)] text-accent' : 'text-[var(--text2)]'}`}
                        >
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: l.color }} />
                          {l.name}
                          {newTask.list === l.id && <div className="ml-auto w-1 h-1 rounded-full bg-accent" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        <div className="shrink-0 px-4 py-3 sm:px-6 sm:py-4 bg-[var(--bg3)]/50 border-t border-[var(--border)] flex flex-col-reverse sm:flex-row justify-end gap-3">
          <button onClick={onClose} className="w-full sm:w-auto px-5 py-2.5 rounded-2xl text-[13.5px] font-bold hover:bg-[var(--bg3)] transition text-[var(--text2)]">Cancel</button>
          <button 
            onClick={() => {
              if (!newTask.title?.trim()) {
                setTitleError('Enter a title before saving.');
                return;
              }
              setTitleError('');
              onSubmit();
            }}
            disabled={saving}
            className={`w-full sm:w-auto px-8 py-2.5 rounded-2xl text-[13.5px] font-medium transition active:scale-95 ${newTask.title?.trim() ? 'bg-accent text-white' : 'bg-[var(--bg-disabled)] text-[var(--text4)]'}`}
          >
            {isEdit ? 'Save Changes' : (newTask.type === 'task' ? 'Create Task' : newTask.type === 'event' ? 'Add Event' : 'Add Reminder')}
          </button>
        </div>
      </div>
    </div>, document.body
  );
}
