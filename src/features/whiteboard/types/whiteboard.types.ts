import { WhiteboardNote } from '@/src/hooks/types';

export type ToolType = 'select' | 'hand' | 'note' | 'reminder' | 'text' | 'image' | 'pen' | 'eraser';

export type WhiteboardDrawing = {
  id: string;
  user_id: string;
  whiteboard_id: string;
  path_points: { x: number; y: number }[];
  color: string;
  thickness?: number;
};

export type WhiteboardSnapshot = {
  notes: WhiteboardNote[];
  drawings: WhiteboardDrawing[];
};

export type WhiteboardDragState = {
  type: 'move' | 'resize' | 'rotate' | 'pan';
  startMouse: { x: number; y: number };
  startNote?: WhiteboardNote;
  handle?: string;
  startScroll?: { x: number; y: number };
} | null;
