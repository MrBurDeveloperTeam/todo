/**
 * Pushes a single to-do activity event to Odoo. Mirrors the same sync built
 * for the inventory and appointment apps (see ACTIVITY_TRACKER_ODOO_SYNC.md
 * / APPOINTMENT_ACTIVITY_TRACKER_ODOO_SYNC.md in those repos) — same
 * idempotency-key pattern, same best-effort fire-and-forget semantics, same
 * X-Snabbb-Api-Key + email auth model.
 *
 * Unlike the inventory/appointment apps, this repo's own `worker.js` is the
 * actual live Cloudflare Pages worker for todo.snabbb.com (it already
 * proxies real `/api/auth/sign-up` and `/api/auth/login` calls to Odoo SSO),
 * not a shared cross-app worker reached via a Workers Route — so this new
 * route is added straight into that file rather than a separate
 * "paste this in" reference snippet. There's no existing `/api/activity`
 * path here to collide with, but the endpoint still follows the same
 * `/api/<app>/activity` convention as the other two apps for consistency.
 *
 * This call is best-effort: activity logging must never block the UI or
 * fail the local (Supabase) task/list write, so callers should
 * fire-and-forget it and swallow/log errors rather than await + throw.
 */

const ACTIVITY_ENDPOINT = '/api/todo/activity';

export interface TodoActivityPayload {
  logId: string;               // idempotency key so retries don't double-log in Odoo
  actorEmail: string | null;   // used by the worker/Odoo to resolve the partner
  actorName: string | null;
  supabaseUserId: string | null;
  action: string;              // e.g. "task_added", "task_completed", "list_deleted", ...
  details: string;
  occurredAt: string;          // ISO timestamp
  pagePath?: string | null;            // e.g. "/calendar" — set for "page_view" duration events
  pageDurationSeconds?: number | null; // seconds spent on pagePath before it was logged
}

export async function logActivityToOdoo(params: TodoActivityPayload): Promise<boolean> {
  if (!params.actorEmail) {
    // Nothing to resolve the Odoo partner by — skip rather than send a
    // request we know the backend will reject.
    console.warn('Skipping Odoo activity sync: no actor email available.');
    return false;
  }

  const payload = {
    external_ref: `todo-activity-${params.logId}`,
    actor_email: params.actorEmail,
    actor_name: params.actorName ?? null,
    supabase_user_id: params.supabaseUserId ?? null,
    action: params.action,
    details: params.details,
    occurred_at: params.occurredAt,
    ...(params.pagePath != null ? { page_path: params.pagePath } : {}),
    ...(params.pageDurationSeconds != null ? { page_duration_seconds: params.pageDurationSeconds } : {}),
  };

  try {
    const res = await fetch(ACTIVITY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || data?.ok === false) {
      console.error('Failed to sync activity to Odoo:', data?.error || res.status);
      return false;
    }
    return true;
  } catch (err: any) {
    // Best-effort: the worker/Odoo being unreachable should never break local task logging.
    console.error('Failed to sync activity to Odoo:', err?.message || err);
    return false;
  }
}
