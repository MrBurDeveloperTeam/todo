import { WhiteboardNote } from '@/src/hooks/types';
import {
  REMINDER_CHECKED_PREFIX,
  REMINDER_UNCHECKED_PREFIX,
} from '@/src/features/whiteboard/constants/whiteboard.constants';

export type ReminderMeta = { checked: boolean; taskName: string };

export function getReminderDateValue(content: string): string {
  const firstLine = (content || '').split('\n')[0] || '';
  if (!firstLine.startsWith('Date: ')) return '';
  const dateValue = firstLine.replace('Date: ', '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(dateValue) ? dateValue : '';
}

export function formatReminderDateLabel(dateValue: string): string {
  if (!dateValue) return 'Set date';
  const parsed = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return 'Set date';
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function parseReminderTitle(note: WhiteboardNote): ReminderMeta {
  const raw = (note.title || 'Reminder Task').trim();
  if (raw.startsWith(REMINDER_CHECKED_PREFIX)) {
    return { checked: true, taskName: raw.slice(REMINDER_CHECKED_PREFIX.length) || 'Reminder Task' };
  }
  if (raw.startsWith(REMINDER_UNCHECKED_PREFIX)) {
    return { checked: false, taskName: raw.slice(REMINDER_UNCHECKED_PREFIX.length) || 'Reminder Task' };
  }
  return { checked: false, taskName: raw || 'Reminder Task' };
}
