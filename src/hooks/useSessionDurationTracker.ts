import { useEffect, useRef } from 'react';

/**
 * Tracks how long the user's session in the to-do app lasted and reports it
 * once, as a "session_end" activity, when the session ends — mirroring the
 * inventory app's sendSessionEndRef flow (App.tsx in that repo):
 *
 *   - session starts when a signed-in user is present (`enabled` becomes true)
 *   - it ends on explicit logout (call the returned `endSession()`), on
 *     `pagehide`, or when the tab becomes hidden (`visibilitychange`)
 *   - the start timestamp is zeroed the moment it is sent, so a logout that
 *     is immediately followed by pagehide/hidden can't double-send
 *   - page-close / tab-hidden sends pass `useBeacon = true` so the caller can
 *     use navigator.sendBeacon (a normal fetch is unreliable during unload)
 *
 * Like the inventory app, the session timer does NOT restart when the tab
 * becomes visible again — one session_end per sign-in. Reloading the app
 * (which re-mounts and starts a fresh session) or logging in again starts a
 * new one.
 *
 * Callback-based (like usePageDurationTracker) because this app has no global
 * DataStore to log through; the caller decides how the event is delivered.
 */

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return h > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function useSessionDurationTracker(
  enabled: boolean,
  onSessionEnd: (details: string, durationSeconds: number, useBeacon: boolean) => void
): (useBeacon?: boolean) => void {
  /** Wall-clock timestamp (ms) when the current session started. Null when no session is in progress. */
  const sessionStartRef = useRef<number | null>(null);
  /** Always the latest callback, so pagehide/visibilitychange listeners never capture a stale closure. */
  const onSessionEndRef = useRef(onSessionEnd);
  onSessionEndRef.current = onSessionEnd;

  // Start the session when a signed-in user appears; drop it (without
  // sending) if the user goes away without endSession() having been called.
  useEffect(() => {
    if (enabled) {
      if (sessionStartRef.current == null) sessionStartRef.current = Date.now();
    } else {
      sessionStartRef.current = null;
    }
  }, [enabled]);

  const endSessionRef = useRef<(useBeacon?: boolean) => void>(() => {});
  endSessionRef.current = (useBeacon = false) => {
    if (sessionStartRef.current == null) return; // no session, or already sent
    const durationSeconds = Math.round((Date.now() - sessionStartRef.current) / 1000);
    sessionStartRef.current = null; // zero out to prevent double-send
    onSessionEndRef.current(`Session ended after ${formatDuration(durationSeconds)}`, durationSeconds, useBeacon);
  };

  useEffect(() => {
    const handlePageHide = () => endSessionRef.current(true);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') endSessionRef.current(true);
    };
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (useBeacon = false) => endSessionRef.current(useBeacon);
}
