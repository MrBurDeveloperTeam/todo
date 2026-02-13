import React from 'react';

interface ClearDrawingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

export default function ClearDrawingsModal({
  isOpen,
  onClose,
  onConfirm,
}: ClearDrawingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-[360px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Clear all drawings?</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              This will remove all pen drawings on this whiteboard.
            </p>
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
            title="Close"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3.5 py-2 text-sm font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-3.5 py-2 text-sm font-semibold rounded-lg bg-red-500 text-white hover:bg-red-600"
          >
            Clear Drawings
          </button>
        </div>
      </div>
    </div>
  );
}
