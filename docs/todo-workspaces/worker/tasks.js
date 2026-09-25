// Replacement supabase/tasks.js. Public entry name stays handleTasksApi.
// All task/response DB calls use the VERIFIED USER JWT so SQL RLS also applies.
import { resolveTodoWorkspace, todoError } from './todoWorkspace.js';
const FIELDS = ['title','description','status','due_date','color','date','priority','position','completed','assignee','list_id','tags','enddate','endtime','type','time','location','urgency','list_id_text','is_completed'];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function handleTasksApi({ request, env, corsHeaders = {} }) {
  const url = new URL(request.url);
  const path = url.pathname;
  const contextRoute = path === '/api/todo/workspace-context';
  const match = path.match(/^\/(?:api\/)?tasks(?:\/([^/]+))?(\/responses)?\/?$/);
  if (!contextRoute && !match) return null;
  const reply = (data, status = 200) => Response.json(data, { status, headers: { ...corsHeaders, 'Cache-Control': 'no-store' } });
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  try {
    const token = request.headers.get('Authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1];
    if (!token) throw todoError('A Supabase Bearer session is required for To Do', 401);
    const base = env.SUPABASE_URL.replace(/\/$/, '');
    const headers = { apikey: env.SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    const verified = await fetch(`${base}/auth/v1/user`, { headers });
    const actor = await verified.json().catch(() => null);
    if (!verified.ok || !actor?.id) throw todoError('Invalid or expired login', 401);
    const workspace = await resolveTodoWorkspace(env, actor.id, request);
    if (contextRoute) {
      if (request.method !== 'GET') throw todoError('Method not allowed', 405);
      return reply({ ok: true, ...workspace });
    }
    const id = match[1];
    if (id && !uuid.test(id)) throw todoError('Invalid task ID');
    const isOwner = workspace.workspaceType === 'company' && workspace.workspaceUserId === actor.id;
    const personalCategory = value => String(value || '').trim().toLowerCase() === 'personal';
    const scope = `user_id=eq.${encodeURIComponent(workspace.workspaceUserId)}&` + (isOwner
      ? 'or=(workspace_type.eq.company,and(workspace_type.eq.personal,list_id_text.eq.personal))'
      : `workspace_type=eq.${workspace.workspaceType}`);
    // No user-controlled owner override, even on legacy GET /tasks?user_id=...
    if (url.searchParams.has('user_id') && url.searchParams.get('user_id') !== workspace.workspaceUserId) throw todoError('Task owner does not match selected workspace', 403);
    async function db(path, options = {}) {
      const response = await fetch(`${base}/rest/v1/${path}`, { ...options, headers: { ...headers, Prefer: 'return=representation', ...options.headers } });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw todoError(data?.code === '42501' ? 'You do not have permission for this action' : 'Unable to complete task operation', response.status);
      return data;
    }
    async function existing() {
      const rows = await db(`tasks?select=*&id=eq.${id}&${scope}`);
      if (!rows?.[0]) throw todoError('Task not found in this workspace', 404);
      return rows[0];
    }
    async function body() {
      const value = await request.json().catch(() => null);
      if (!value || Array.isArray(value) || typeof value !== 'object') throw todoError('Invalid JSON body');
      return value;
    }
    const event = type => String(type || '').trim().toLowerCase() === 'event';
    function canWrite(type) {
      if (event(type) && !workspace.canManageEvents) throw todoError('Only the company owner or manager can manage events', 403);
    }
    if (match[2]) {
      const task = await existing();
      if (workspace.workspaceType !== 'company' || task.workspace_type !== 'company' || !event(task.type)) throw todoError('Responses are only available for company events');
      if (request.method === 'GET') {
        const filter = workspace.canManageEvents ? '' : `&member_user_id=eq.${actor.id}`;
        // First obtain only responses this verified caller is allowed to read via RLS.
        const responses = await db(`task_event_responses?task_id=eq.${id}${filter}&select=*`);
        const ids = [...new Set(responses.map(row => row.member_user_id))].filter(value => uuid.test(value));
        const names = new Map();
        // Profiles may be private under RLS. Enrich only the authorized respondents,
        // returning names only (never expose a general service-role profile lookup).
        for (let offset = 0; offset < ids.length; offset += 100) {
          const selectedIds = ids.slice(offset, offset + 100).join(',');
          const profileResponse = await fetch(`${base}/rest/v1/profiles?select=user_id,name&user_id=in.(${selectedIds})`, {
            headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` },
          });
          if (!profileResponse.ok) throw todoError('Unable to load respondent names', 502);
          for (const profile of await profileResponse.json()) names.set(profile.user_id, profile.name);
        }
        return reply({ ok: true, responses: responses.map(row => ({ ...row, member_name: names.get(row.member_user_id) || null })) });
      }
      if (request.method === 'PUT') {
        const input = await body();
        if (!['accepted','rejected'].includes(input.response)) throw todoError('Response must be accepted or rejected');
        const saved = await db('task_event_responses?on_conflict=task_id,member_user_id', {
          method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
          body: JSON.stringify({ task_id: id, member_user_id: actor.id, response: input.response, responded_at: new Date().toISOString() }),
        });
        return reply({ ok: true, response: saved?.[0] });
      }
      throw todoError('Method not allowed', 405);
    }
    if (request.method === 'GET') return id ? reply({ ok:true, task:await existing() }) : reply({ ok:true, tasks:await db(`tasks?select=*&${scope}&order=date.asc`) });
    if (request.method === 'POST' && !id) {
      const input = await body();
      const row = Object.fromEntries(FIELDS.filter(k => input[k] !== undefined).map(k => [k,input[k]]));
      row.type = String(row.type || 'task').trim().toLowerCase();
      if (personalCategory(row.list_id_text)) row.list_id_text = 'personal';
      if (!['task','event','reminder'].includes(row.type)) throw todoError('Invalid task type');
      if (typeof row.title !== 'string' || !row.title.trim()) throw todoError('Title is required');
      canWrite(row.type);
      if (workspace.workspaceType === 'company' && !isOwner && personalCategory(row.list_id_text)) throw todoError('Personal tasks must be created in your personal workspace', 403);
      if (input.id !== undefined && !uuid.test(input.id)) throw todoError('Invalid task ID');
      Object.assign(row, { id: input.id || crypto.randomUUID(), user_id:workspace.workspaceUserId, workspace_type:isOwner && personalCategory(row.list_id_text) ? 'personal' : workspace.workspaceType, created_by:actor.id });
      const saved = await db('tasks', { method:'POST', body:JSON.stringify(row) });
      return reply({ ok:true, task:saved?.[0] },201);
    }
    if (id && ['PUT','PATCH','DELETE'].includes(request.method)) {
      const task = await existing(); canWrite(task.type);
      if (request.method === 'DELETE') {
        const deleted = await db(`tasks?id=eq.${id}&${scope}`,{ method:'DELETE' });
        if (!deleted?.length) throw todoError('Task not deleted; access may have changed',403);
        return reply({ok:true});
      }
      const input = await body();
      if (['id','user_id','workspace_type','created_by'].some(k => k in input && input[k] !== task[k])) throw todoError('Task identity cannot be changed');
      const row = Object.fromEntries(FIELDS.filter(k => input[k] !== undefined).map(k => [k,input[k]]));
      if ('type' in row) {
        row.type=String(row.type).trim().toLowerCase();
        if (!['task','event','reminder'].includes(row.type)) throw todoError('Invalid task type');
      }
      canWrite(row.type ?? task.type);
      if (personalCategory(row.list_id_text)) row.list_id_text = 'personal';
      const targetCategory = row.list_id_text ?? task.list_id_text;
      if (workspace.workspaceType === 'company' && !isOwner && personalCategory(targetCategory)) throw todoError('Personal tasks must be created in your personal workspace', 403);
      if (isOwner && (personalCategory(targetCategory) ? 'personal' : 'company') !== task.workspace_type) {
        throw todoError('To change between private and shared, create a new task in the destination category, then delete the original.', 409);
      }
      if ('title' in row && (typeof row.title !== 'string' || !row.title.trim())) throw todoError('Title is required');
      row.updated_at=new Date().toISOString();
      const saved = await db(`tasks?id=eq.${id}&${scope}`,{ method:'PATCH',body:JSON.stringify(row) });
      if (!saved?.length) throw todoError('Task not updated; access may have changed',403);
      return reply({ok:true,task:saved[0]});
    }
    throw todoError('Method not allowed',405);
  } catch (error) { return reply({ok:false,error:error.status ? error.message : 'To Do service is unavailable'},error.status || 500); }
}
