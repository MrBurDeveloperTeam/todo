import { supabase } from './supabase';
import type { TaskItem } from '../types';

const TYPE_KEY = 'snabbb.todo.workspaceType';
const OWNER_KEY = 'snabbb.todo.workspaceOwnerUserId';
export interface TodoWorkspace {
  actorUserId: string;
  workspaceUserId: string;
  workspaceType: 'personal' | 'company';
  role: string;
  canManageEvents: boolean;
}

export function captureTodoWorkspace() {
  const url = new URL(window.location.href);
  const type = url.searchParams.get('workspace_type');
  if (type === null) return;
  // Preserve invalid selections so they fail closed, never silently open Personal.
  sessionStorage.setItem(TYPE_KEY, type);
  sessionStorage.removeItem(OWNER_KEY);
  if (type === 'company') sessionStorage.setItem(OWNER_KEY, url.searchParams.get('workspace_owner_id') || '');
  url.searchParams.delete('workspace_type');
  url.searchParams.delete('workspace_owner_id');
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
}

export function todoSelection() {
  const type = sessionStorage.getItem(TYPE_KEY) || 'personal';
  const owner = sessionStorage.getItem(OWNER_KEY) || '';
  if (!['personal', 'company'].includes(type) || (type === 'company' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(owner))) {
    throw new Error('Select a workspace in Snabbb and reopen To Do.');
  }
  return { type, owner };
}

export async function todoRequest(path: string, method = 'GET', body?: unknown, expected?: TodoWorkspace) {
  const selection = todoSelection();
  if (!supabase) throw new Error('To Do authentication is not configured.');
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error('Your session has expired. Please sign in again.');
  if (expected && (expected.actorUserId !== data.session.user.id || expected.workspaceType !== selection.type ||
      (selection.type === 'company' && expected.workspaceUserId !== selection.owner))) {
    throw new Error('Your account or workspace changed. Reload To Do before continuing.');
  }
  // Use a dedicated base: legacy api.ts can overwrite Bearer headers with Odoo cookies.
  const base = (import.meta.env.VITE_TODO_API_BASE_URL || 'https://sso.snabbb.com/api').replace(/\/$/, '');
  const response = await fetch(`${base}${path}`, {
    method,
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${data.session.access_token}`,
      'Content-Type': 'application/json',
      'X-Snabbb-Workspace-Type': selection.type,
      ...(selection.type === 'company' ? { 'X-Snabbb-Workspace-User-Id': selection.owner } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result?.ok) throw new Error(result?.error || `To Do request failed (${response.status}).`);
  const latestSelection = todoSelection();
  const latestSession = await supabase.auth.getSession();
  if (latestSession.data.session?.user.id !== data.session.user.id ||
      latestSelection.type !== selection.type || latestSelection.owner !== selection.owner) {
    throw new Error('Your account or workspace changed. Reload To Do before continuing.');
  }
  return result;
}

export async function loadTodoWorkspace(actorId: string): Promise<TodoWorkspace> {
  const result = await todoRequest('/todo/workspace-context');
  const selected = todoSelection();
  if (result.actorUserId !== actorId || result.workspaceType !== selected.type ||
      result.workspaceUserId !== (selected.type === 'company' ? selected.owner : actorId) ||
      typeof result.canManageEvents !== 'boolean') throw new Error('Unable to validate the selected workspace.');
  return result;
}

export function mapTodoTask(t: any): TaskItem {
  const urgency = String(t.urgency || '').toLowerCase();
  return {
    id: t.id, type: t.type || 'task', title: t.title, desc: t.description || '',
    date: t.date || '', time: t.time || '', enddate: t.enddate || '', endtime: t.endtime || '',
    location: t.location || '', priority: urgency === 'medium' ? 'med' : ['high', 'low', 'med'].includes(urgency) ? urgency as TaskItem['priority'] : 'none',
    list: t.list_id_text || (t.workspace_type === 'company' ? 'work' : 'personal'),
    done: t.status === 'done' || t.is_completed === true, created: new Date(t.created_at).getTime(),
  };
}

export function todoTaskPayload(task: TaskItem) {
  return {
    title: task.title, description: task.desc || null, type: task.type,
    date: task.date || null, time: task.time || null, enddate: task.enddate || null,
    endtime: task.endtime || null, location: task.location || null,
    urgency: task.priority === 'none' ? 'NORMAL' : task.priority === 'med' ? 'MEDIUM' : task.priority.toUpperCase(),
    list_id_text: task.list, status: task.done ? 'done' : 'todo', is_completed: task.done,
  };
}
