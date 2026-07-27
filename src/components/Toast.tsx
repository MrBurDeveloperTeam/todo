import React from 'react';
import { CheckCircle2, X } from 'lucide-react';

interface ToastProps {
  message: string;
  onUndo: () => void;
  onClose: () => void;
}

export function Toast({ message, onUndo, onClose }: ToastProps) {
  return (
    <div className="pointer-events-auto flex min-w-[280px] max-w-[420px] items-start gap-3 rounded-xl border border-emerald-500/20 bg-[var(--surface)] px-4 py-3 text-[var(--text)] shadow-[0_16px_40px_rgba(0,0,0,0.16)] backdrop-blur-sm animate-[toast-in_180ms_ease-out]">
      <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-400">
          Completed
        </p>
        <p className="mt-0.5 text-[13px] leading-snug">{message}</p>
        <button
          type="button"
          onClick={onUndo}
          className="mt-2 text-[12px] font-semibold text-accent transition hover:opacity-75"
        >
          Undo
        </button>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[var(--text4)] transition hover:bg-[var(--bg3)] hover:text-[var(--text2)]"
        aria-label="Close notification"
      >
        <X size={14} />
      </button>
    </div>
  );
}
