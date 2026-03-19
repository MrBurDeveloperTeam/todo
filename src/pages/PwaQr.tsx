import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';

const targetUrl = import.meta.env.VITE_APP_PUBLIC_URL || window.location.origin;

export default function PwaQr() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.08),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(59,130,246,0.12),transparent_30%),radial-gradient(circle_at_50%_80%,rgba(14,165,233,0.12),transparent_30%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),transparent)] backdrop-blur-[2px]" />

      <div className="relative z-10 w-full max-w-md mx-auto bg-white/90 dark:bg-slate-900/90 border border-white/20 dark:border-slate-700 rounded-3xl shadow-2xl shadow-blue-900/40 p-6 space-y-6">
        <div className="text-center space-y-1">
          <div className="text-xs uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400 font-semibold">
            Add to Home Screen
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">Scan to Install</div>
          <div className="text-sm text-slate-500 dark:text-slate-300">
            Open the link in Safari, then share → “Add to Home Screen”
          </div>
        </div>

        <div className="flex justify-center">
          <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
            <QRCodeCanvas value={targetUrl} size={220} level="H" includeMargin />
          </div>
        </div>

        <div className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
          <div className="font-bold">Steps for iPhone:</div>
          <ol className="list-decimal list-inside space-y-1">
            <li>Scan the QR with the Camera and tap the banner to open in Safari.</li>
            <li>Tap the Share icon, then “Add to Home Screen”.</li>
            <li>Tap “Add”. The app will open full-screen as a PWA.</li>
          </ol>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            URL: {targetUrl}
          </div>
        </div>
      </div>
    </div>
  );
}
