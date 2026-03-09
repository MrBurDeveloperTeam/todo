export const WHITEBOARD_ID = 'a1111111-b222-c333-d444-e55555555555';

export const LANDSCAPE_SIZE = { width: 1920, height: 1080 };
export const PORTRAIT_SIZE = { width: 1080, height: 1920 };
export const MIN_SIZE = 150;

export const REMINDER_CHECKED_PREFIX = '[x] ';
export const REMINDER_UNCHECKED_PREFIX = '[ ] ';

export const COLORS = {
  yellow: {
    bg: 'bg-yellow-100 dark:bg-yellow-500/10',
    border: 'border-yellow-200 dark:border-yellow-500/20',
    hex: '#fef3c7',
    accent: 'bg-yellow-400',
  },
  pink: {
    bg: 'bg-pink-100 dark:bg-pink-500/10',
    border: 'border-pink-200 dark:border-pink-500/20',
    hex: '#fce7f3',
    accent: 'bg-pink-400',
  },
  blue: {
    bg: 'bg-blue-100 dark:bg-blue-500/10',
    border: 'border-blue-200 dark:border-blue-500/20',
    hex: '#dbeafe',
    accent: 'bg-blue-400',
  },
  green: {
    bg: 'bg-green-100 dark:bg-green-500/10',
    border: 'border-green-200 dark:border-green-500/20',
    hex: '#dcfce7',
    accent: 'bg-green-400',
  },
  transparent: {
    bg: 'bg-transparent',
    border: 'border-transparent hover:border-slate-300/50 dark:hover:border-slate-600/50',
    hex: 'transparent',
    accent: 'bg-slate-400',
  },
} as const;
