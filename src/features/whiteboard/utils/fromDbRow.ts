import { WhiteboardNote } from '@/src/hooks/types';

export function fromDbRow(row: any): WhiteboardNote {
  return {
    id: row.id,
    type: row.type,
    x: row.x ?? 100,
    y: row.y ?? 100,
    width: row.width ?? 200,
    height: row.height ?? 200,
    rotation: row.rotation ?? 0,
    zIndex: row.z_index ?? 1,
    color: row.color ?? 'yellow',
    content: row.content ?? '',
    title: row.title ?? '',
    imageUrl: row.image_url,
    fontSize: row.font_size ?? 16,
    createdAt: new Date(row.created_at).getTime(),
  };
}
