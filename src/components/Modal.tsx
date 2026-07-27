import React, { useState, useRef, useEffect } from 'react';
import { X, Clock, Calendar, Search, Briefcase, ChevronDown } from 'lucide-react';
import { TaskItem, ItemType, Priority, ListType } from '../types';

interface ModalProps {
  show: boolean;
  onClose: () => void;
  newTask: Partial<TaskItem>;
  setNewTask: (task: Partial<TaskItem>) => void;
  onSubmit: () => void;
  isEdit?: boolean;
  availableLists?: {id: string, name: string, color: string}[];
}

export function Modal({ show, onClose, newTask, setNewTask, onSubmit, isEdit, availableLists = [] }: ModalProps) {
  const [isListDropdownOpen, setIsListDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedList = availableLists.find(l => l.id === newTask.list) || availableLists[0];

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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 sm:p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-[var(--surface)] rounded-2xl sm:rounded-3xl shadow-2xl border border-[var(--border)] overflow-hidden animate-in zoom-in-95 duration-200 max-h-[calc(100vh-1rem)] sm:max-h-[calc(100vh-2rem)]">
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--bg3)]/50">
          <h2 className="text-lg sm:text-xl font-black">{isEdit ? 'Edit Item' : 'Create New'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-[var(--bg3)] rounded-full transition"><X size={20} /></button>
        </div>

        <div className="p-4 sm:p-6 space-y-5 max-h-[calc(100vh-8.5rem)] sm:max-h-[80vh] overflow-y-auto custom-scrollbar">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {(['task', 'event', 'reminder'] as ItemType[]).map(t => (
                <button 
                  key={t}
                  onClick={() => setNewTask({...newTask, type: t})}
                  className={`min-w-0 py-2 px-2 sm:px-3 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition border ${newTask.type === t ? 'bg-accent text-white border-accent shadow-lg shadow-accent/20' : 'bg-[var(--bg3)] border-[var(--border)] text-[var(--text3)] hover:border-accent/40'}`}
                >
                  {t}
                </button>
              ))}
            </div>

            <input 
              autoFocus
              autoComplete="off"
              className="w-full text-xl sm:text-2xl font-black bg-transparent outline-none placeholder:text-[var(--text4)]"
              placeholder="What needs to be done?"
              value={newTask.title || ''}
              onChange={e => setNewTask({...newTask, title: e.target.value})}
            />

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
                      {availableLists.map(l => (
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

        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-[var(--bg3)]/50 border-t border-[var(--border)] flex flex-col-reverse sm:flex-row justify-end gap-3">
          <button onClick={onClose} className="w-full sm:w-auto px-5 py-2.5 rounded-2xl text-[13.5px] font-bold hover:bg-[var(--bg3)] transition text-[var(--text2)]">Cancel</button>
          <button 
            onClick={onSubmit} 
            disabled={!newTask.title}
            className={`w-full sm:w-auto px-8 py-2.5 rounded-2xl text-[13.5px] font-black shadow-lg transition active:scale-95 ${newTask.title ? 'bg-accent text-white shadow-accent/20 hover:brightness-110' : 'bg-[var(--bg-disabled)] text-[var(--text4)] cursor-not-allowed'}`}
          >
            {isEdit ? 'Save Changes' : (newTask.type === 'task' ? 'Create Task' : newTask.type === 'event' ? 'Add Event' : 'Add Reminder')}
          </button>
        </div>
      </div>
    </div>
  );
}
