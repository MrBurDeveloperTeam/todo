-- Existing owner Work/Events tasks only. Does not move Personal-category tasks.
-- FIRST run this preview separately and check every returned row.
-- Replace the owner UUID in BOTH places if correcting another company.
SELECT t.id, t.title, t.list_id_text, t.workspace_type, t.created_by
FROM public.tasks t
JOIN public.profiles p ON p.user_id = t.user_id AND p.account_type = 'company'
WHERE t.user_id = '37c433fc-e5e8-48bf-a9b1-4e371ab02a6b'::uuid
  AND t.workspace_type = 'personal'
  AND lower(btrim(coalesce(t.list_id_text, ''))) IN ('work', 'events');

-- AFTER reviewing the preview, run the following transaction as postgres.
-- Requires the original 01-database.sql migration. Not run by Codex.
BEGIN;
CREATE TABLE IF NOT EXISTS todo_private.owner_task_workspace_backup (
  task_id uuid PRIMARY KEY,
  owner_id uuid NOT NULL,
  previous_workspace_type text NOT NULL,
  saved_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON todo_private.owner_task_workspace_backup FROM PUBLIC, anon, authenticated;
INSERT INTO todo_private.owner_task_workspace_backup (task_id, owner_id, previous_workspace_type)
SELECT t.id, t.user_id, t.workspace_type
FROM public.tasks t
JOIN public.profiles p ON p.user_id = t.user_id AND p.account_type = 'company'
WHERE t.user_id = '37c433fc-e5e8-48bf-a9b1-4e371ab02a6b'::uuid
  AND t.workspace_type = 'personal'
  AND lower(btrim(coalesce(t.list_id_text, ''))) IN ('work', 'events')
ON CONFLICT (task_id) DO NOTHING;
UPDATE public.tasks t
SET workspace_type = 'company'
FROM todo_private.owner_task_workspace_backup b
WHERE t.id = b.task_id AND t.user_id = b.owner_id
  AND t.user_id = '37c433fc-e5e8-48bf-a9b1-4e371ab02a6b'::uuid
  AND t.workspace_type = 'personal'
  AND lower(btrim(coalesce(t.list_id_text, ''))) IN ('work', 'events');
COMMIT;
