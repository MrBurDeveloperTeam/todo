import { WhiteboardNote } from '@/src/hooks/types';

export function toDbRow(note: WhiteboardNote, whiteboardId: string, userId?: string) {
  return {
    id: note.id,
    whiteboard_id: whiteboardId,
    ...(userId ? { user_id: userId } : {}),
    type: note.type,
    x: note.x,
    y: note.y,
    width: note.width,
    height: note.height,
    rotation: note.rotation ?? 0,
    z_index: note.zIndex ?? 0,
    color: note.color ?? 'yellow',
    content: note.content ?? '',
    title: note.title ?? '',
    image_url: note.imageUrl ?? null,
    font_size: note.fontSize ?? 16,
    status: note.status ?? 'idle',
    updated_at: new Date().toISOString(),
  };
}
