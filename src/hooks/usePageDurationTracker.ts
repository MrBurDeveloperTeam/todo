import { useEffect, useRef } from 'react';

/**
 * Tracks how long the user spends on each "view" of the to-do app (My
 * Tasks, Calendar, Today, Upcoming, Settings) and reports the duration via
 * a callback when the view changes, the tab is hidden, or the page is
 * left. Mirrors the appointment app's usePageDurationTracker.js — same
 * accumulate-while-visible pattern, same minimum-seconds threshold — but
 * is callback-based since this app has no global DataStore singleton to
 * log through directly.
 */

const MIN_LOGGED_SECONDS = 3;

function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}

export type PageViewLogMeta = {
  pagePath: string;
  pageDurationSeconds: number;
};

export default function usePageDurationTracker(
  view: string | null | undefined,
  pageLabel: string | null | undefined,
  enabled: boolean,
  onLogged: (description: string, meta: PageViewLogMeta) => void
) {
  const activeSinceRef = useRef<number | null>(null);
  const accumulatedRef = useRef(0);
  const viewRef = useRef<string | null>(null);
  const labelRef = useRef<string | null>(null);
  const enabledRef = useRef(enabled);
  const onLoggedRef = useRef(onLogged);

  useEffect(() => { enabledRef.current = enabled; }, [enabled]);
  useEffect(() => { onLoggedRef.current = onLogged; }, [onLogged]);

  const logDuration = (viewKey: string | null, label: string | null, seconds: number) => {
    if (!enabledRef.current || !viewKey || !label || seconds < MIN_LOGGED_SECONDS) return;
    const roundedSeconds = Math.round(seconds);
    onLoggedRef.current?.(`Viewed ${label} page for ${formatDuration(roundedSeconds)}`, {
      pagePath: `/${viewKey}`,
      pageDurationSeconds: roundedSeconds,
    });
  };

  const pause = () => {
    if (activeSinceRef.current != null) {
      accumulatedRef.current += (Date.now() - activeSinceRef.current) / 1000;
      activeSinceRef.current = null;
    }
  };

  const resume = () => {
    if (viewRef.current && document.visibilityState === 'visible') {
      activeSinceRef.current = Date.now();
    }
  };

  useEffect(() => {
    pause();
    logDuration(viewRef.current, labelRef.current, accumulatedRef.current);
    accumulatedRef.current = 0;
    viewRef.current = view || null;
    labelRef.current = pageLabel || null;
    resume();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, pageLabel]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') pause();
      else resume();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const flushOnExit = () => {
      pause();
      logDuration(viewRef.current, labelRef.current, accumulatedRef.current);
      accumulatedRef.current = 0;
    };
    window.addEventListener('pagehide', flushOnExit);
    window.addEventListener('beforeunload', flushOnExit);
    return () => {
      window.removeEventListener('pagehide', flushOnExit);
      window.removeEventListener('beforeunload', flushOnExit);
      flushOnExit();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
