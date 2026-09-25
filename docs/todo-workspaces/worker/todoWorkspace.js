// New file: supabase/todoWorkspace.js. Does not import companyWorkspace.js.
export function todoError(message, status = 400) {
  return Object.assign(new Error(message), { status });
}
export async function resolveTodoWorkspace(env, actorUserId, request) {
  if (!actorUserId) throw todoError('Unauthorized', 401);
  let workspaceType = (request.headers.get('X-Snabbb-Workspace-Type') || 'personal').trim().toLowerCase();
  if (!['personal', 'company'].includes(workspaceType)) throw todoError('Invalid workspace type');
  let owner = (request.headers.get('X-Snabbb-Workspace-User-Id') || '').trim();
  const base = env.SUPABASE_URL.replace(/\/$/, '');
  const headers = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` };
  async function read(path) {
    const response = await fetch(`${base}/rest/v1/${path}`, { headers });
    if (!response.ok) throw todoError('Unable to validate company membership', 502);
    return response.json();
  }
  if (workspaceType === 'personal') {
    const profiles = await read(`profiles?user_id=eq.${encodeURIComponent(actorUserId)}&select=user_id,account_type&limit=1`);
    if (profiles[0]?.account_type !== 'company') return {
      actorUserId, workspaceUserId: actorUserId, workspaceType,
      actorType: 'individual', role: 'individual', canManageEvents: true,
    };
    workspaceType = 'company';
    owner = actorUserId;
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(owner)) throw todoError('Select a company workspace');
  const owners = await read(`profiles?user_id=eq.${encodeURIComponent(owner)}&select=user_id,account_type&limit=1`);
  if (owners[0]?.account_type !== 'company') throw todoError('Company unavailable', 403);
  let role = 'owner';
  if (owner !== actorUserId) {
    const rows = await read(`company_members?company_owner_user_id=eq.${encodeURIComponent(owner)}&member_user_id=eq.${encodeURIComponent(actorUserId)}&status=eq.active&select=role&limit=1`);
    if (!rows[0]) throw todoError('You do not have access to this company', 403);
    role = String(rows[0].role || '').trim().toLowerCase();
    if (role === 'reception') role = 'manager';
  }
  return { actorUserId, workspaceUserId: owner, workspaceType, actorType: owner === actorUserId ? 'owner' : 'member', role, canManageEvents: owner === actorUserId || role === 'manager' };
}
