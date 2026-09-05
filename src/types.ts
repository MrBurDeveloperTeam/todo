// Minimal internal type surface for src/aiExperience/** and
// src/petExperience/** (ported from the shared-experience integration
// branch). Production's own task shape lives in src/hooks/types.ts
// (`Task`) and is intentionally NOT the same shape as `TaskItem` below —
// see src/aiExperience/adaptTaskItem.ts for the one-way mapping used at
// the host integration boundary (App.tsx / TasksPage.tsx). Nothing in
// Production's own CRUD/routing/auth code depends on this file.
export type ItemType = 'task' | 'event' | 'reminder';
export type Priority = 'none' | 'low' | 'med' | 'high';
export type ListType = string;
export type ViewType = 'todo' | 'calendar' | 'today' | 'upcoming' | 'settings';

export interface TaskItem {
  id: string;
  type: ItemType;
  title: string;
  desc: string;
  date: string;
  time: string;
  enddate?: string;
  endtime?: string;
  location?: string;
  priority: Priority;
  list: ListType;
  done: boolean;
  created: number;
}
