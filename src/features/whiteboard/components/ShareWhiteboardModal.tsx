import React from 'react';

interface ShareWhiteboardModalProps {
  isOpen: boolean;
  shareUrl: string | null;
  shareQrDataUrl: string | null;
  shareError: string | null;
  onClose: () => void;
}

export default function ShareWhiteboardModal({
  isOpen,
  shareUrl,
  shareQrDataUrl,
  shareError,
  onClose,
}: ShareWhiteboardModalProps) {
  if (!isOpen || !shareUrl) return null;

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-[320px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Share Whiteboard</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Scan to open on phone or iPad.</p>
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="mt-4 flex items-center justify-center">
          <div className="p-3 bg-white rounded-xl border border-slate-200">
            {shareQrDataUrl ? (
              <img src={shareQrDataUrl} alt="Whiteboard QR" className="w-[200px] h-[200px]" />
            ) : (
              <div className="w-[200px] h-[200px] flex items-center justify-center text-xs text-slate-400">
                Generating QR...
              </div>
            )}
          </div>
        </div>

        <div className="mt-4">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Share Link</label>
          <div className="mt-1 flex items-center gap-2">
            <input
              className="flex-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-1.5 text-slate-700 dark:text-slate-200"
              value={shareUrl}
              readOnly
            />
            <button
              onClick={() => navigator.clipboard.writeText(shareUrl)}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-primary text-white"
            >
              Copy
            </button>
          </div>
        </div>
        {shareError && <div className="mt-2 text-xs text-red-500">{shareError}</div>}
      </div>
    </div>
  );
}
