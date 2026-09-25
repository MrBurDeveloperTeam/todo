-- DATA-PRESERVING ROLLBACK of 01-database.sql, run as postgres.
-- Returns tasks to the four owner-only policies supplied before the migration.
-- It intentionally does NOT restore the earlier optional blanket company CRUD policy.
-- This is an access rollback, NOT an exact reversal of every schema/data change.
-- Keep workspace_type, created_by, their defaults/index/check, and event responses.
-- Never discard company/personal classification or recorded accept/reject responses.
-- Coordinate with rolling back/disabling the new To Do company UI and API.
BEGIN;

DROP POLICY IF EXISTS todo_read ON public.tasks;
DROP POLICY IF EXISTS todo_read_guard ON public.tasks;
DROP POLICY IF EXISTS todo_insert ON public.tasks;
DROP POLICY IF EXISTS todo_insert_guard ON public.tasks;
DROP POLICY IF EXISTS todo_update ON public.tasks;
DROP POLICY IF EXISTS todo_update_guard ON public.tasks;
DROP POLICY IF EXISTS todo_delete ON public.tasks;
DROP POLICY IF EXISTS todo_delete_guard ON public.tasks;
DROP TRIGGER IF EXISTS todo_keep_task_identity ON public.tasks;

-- These policies were not changed by the forward migration. Create only if absent.
DO $rollback$
DECLARE operation text; policy_name text;
BEGIN
 FOREACH operation IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE'] LOOP
  policy_name := 'tasks_' || lower(operation) || '_own';
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
      AND tablename='tasks' AND policyname=policy_name) THEN
   EXECUTE format('CREATE POLICY %I ON public.tasks FOR %s TO authenticated %s %s',
     policy_name, operation,
     CASE WHEN operation IN ('SELECT','UPDATE','DELETE') THEN 'USING (auth.uid() = user_id)' ELSE '' END,
     CASE WHEN operation IN ('INSERT','UPDATE') THEN 'WITH CHECK (auth.uid() = user_id)' ELSE '' END);
  END IF;
 END LOOP;
END $rollback$;

-- Retain response rows but remove this feature's access paths.
-- Conditional block also makes rollback safe if the forward migration never ran.
DO $rollback$
BEGIN
 IF to_regclass('public.task_event_responses') IS NOT NULL THEN
  EXECUTE 'DROP POLICY IF EXISTS todo_response_read ON public.task_event_responses';
  EXECUTE 'DROP POLICY IF EXISTS todo_response_insert ON public.task_event_responses';
  EXECUTE 'DROP POLICY IF EXISTS todo_response_update ON public.task_event_responses';
  EXECUTE 'ALTER TABLE public.task_event_responses ENABLE ROW LEVEL SECURITY';
  EXECUTE 'REVOKE ALL ON public.task_event_responses FROM authenticated, anon';
 END IF;
END $rollback$;

-- No CASCADE: unexpected dependencies abort the transaction instead of being deleted.
DROP FUNCTION IF EXISTS todo_private.event_response_allowed(uuid,uuid,boolean);
DROP FUNCTION IF EXISTS todo_private.keep_task_identity();
DROP FUNCTION IF EXISTS todo_private.task_allowed(uuid,text,text,boolean);
DROP FUNCTION IF EXISTS todo_private.company_level(uuid);
-- Keep the schema rather than risking deleting unrelated objects inside it.
COMMIT;

-- Read-only confirmation: expect the four tasks_*_own policies and no todo_* policies.
SELECT policyname, cmd, qual, with_check
FROM pg_policies WHERE schemaname='public' AND tablename='tasks'
ORDER BY policyname;
