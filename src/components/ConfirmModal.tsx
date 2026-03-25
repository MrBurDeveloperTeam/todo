import React from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ConfirmModalProps {
  show: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export function ConfirmModal({ 
  show, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = 'Confirm', 
  type = 'danger' 
}: ConfirmModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-5">
          <div className="flex items-start gap-4">
            <div className={`h-10 w-10 rounded-full flex-shrink-0 flex items-center justify-center ${
              type === 'danger' ? 'bg-red-500/10 text-red-500' : 
              type === 'warning' ? 'bg-amber-500/10 text-amber-500' : 
              'bg-accent/10 text-accent'
            }`}>
              <AlertCircle size={20} />
            </div>
            
            <div className="flex-1 pt-0.5">
              <h3 className="text-base font-bold text-[var(--text)] mb-1">{title}</h3>
              <p className="text-sm text-[var(--text3)] leading-relaxed">{message}</p>
            </div>

            <button 
              onClick={onClose}
              className="p-1 hover:bg-[var(--bg3)] rounded-lg transition-colors text-[var(--text4)]"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="px-5 py-4 bg-[var(--bg2)] flex gap-2">
           <button 
             onClick={onClose}
             className="flex-1 py-2 text-[13px] font-bold text-[var(--text2)] hover:bg-[var(--bg3)] rounded-xl transition-all border border-[var(--border)]"
           >
             Cancel
           </button>
           <button 
             onClick={() => {
               onConfirm();
               onClose();
             }}
             className={`flex-1 py-2 text-[13px] font-bold text-white rounded-xl transition-all shadow-lg active:scale-[0.98] ${
               type === 'danger' ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 
               type === 'warning' ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' : 
               'bg-accent hover:bg-[var(--accent-hover)] shadow-accent/20'
             }`}
           >
             {confirmText}
           </button>
        </div>
      </div>
    </div>
  );
}
