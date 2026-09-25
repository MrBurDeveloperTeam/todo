-- Run as postgres. Existing tasks default to Personal; no existing company task
-- is relabelled, and legacy company creators are NOT guessed.
BEGIN;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS workspace_type text NOT NULL DEFAULT 'personal';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.tasks ALTER COLUMN created_by SET DEFAULT auth.uid();
UPDATE public.tasks SET created_by=user_id WHERE workspace_type='personal' AND created_by IS NULL;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.tasks'::regclass AND conname='todo_workspace_type_check') THEN
  ALTER TABLE public.tasks ADD CONSTRAINT todo_workspace_type_check CHECK (workspace_type IS NOT NULL AND workspace_type IN ('personal','company'));
 END IF;
END $$;
CREATE INDEX IF NOT EXISTS tasks_workspace_lookup_idx ON public.tasks(user_id,workspace_type);

CREATE SCHEMA IF NOT EXISTS todo_private;
REVOKE ALL ON SCHEMA todo_private FROM PUBLIC;
GRANT USAGE ON SCHEMA todo_private TO authenticated;

-- 0 = no company access, 1 = member, 2 = owner/manager. No clinic lookup.
CREATE OR REPLACE FUNCTION todo_private.company_level(owner_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT CASE
 WHEN auth.uid() IS NULL THEN 0
 WHEN EXISTS(SELECT 1 FROM public.profiles p WHERE p.user_id=owner_id AND p.account_type='company') THEN
   CASE WHEN auth.uid()=owner_id THEN 2 ELSE coalesce((
     SELECT max(CASE WHEN lower(btrim(m.role::text)) IN ('manager','reception') THEN 2 ELSE 1 END)
     FROM public.company_members m WHERE m.company_owner_user_id=owner_id
       AND m.member_user_id=auth.uid() AND m.status='active'
   ),0) END
 ELSE 0 END;
$$;
CREATE OR REPLACE FUNCTION todo_private.task_allowed(owner_id uuid, workspace text, task_type text, writing boolean)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND CASE
 WHEN workspace='personal' THEN owner_id=auth.uid()
 WHEN workspace='company' THEN todo_private.company_level(owner_id) >=
   CASE WHEN writing AND lower(btrim(coalesce(task_type,'')))='event' THEN 2 ELSE 1 END
 ELSE false END;
$$;
REVOKE ALL ON FUNCTION todo_private.company_level(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION todo_private.task_allowed(uuid,text,text,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION todo_private.company_level(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION todo_private.task_allowed(uuid,text,text,boolean) TO authenticated;

-- Both grant and guard: pre-existing owner/member policies cannot bypass event rules.
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tasks_company_member_access ON public.tasks;
DROP POLICY IF EXISTS todo_read ON public.tasks;
CREATE POLICY todo_read ON public.tasks FOR SELECT TO authenticated
 USING(todo_private.task_allowed(user_id,workspace_type,type,false));
DROP POLICY IF EXISTS todo_read_guard ON public.tasks;
CREATE POLICY todo_read_guard ON public.tasks AS RESTRICTIVE FOR SELECT TO authenticated
 USING(todo_private.task_allowed(user_id,workspace_type,type,false));
DROP POLICY IF EXISTS todo_insert ON public.tasks;
CREATE POLICY todo_insert ON public.tasks FOR INSERT TO authenticated
 WITH CHECK(created_by=auth.uid() AND todo_private.task_allowed(user_id,workspace_type,type,true));
DROP POLICY IF EXISTS todo_insert_guard ON public.tasks;
CREATE POLICY todo_insert_guard ON public.tasks AS RESTRICTIVE FOR INSERT TO authenticated
 WITH CHECK(created_by=auth.uid() AND todo_private.task_allowed(user_id,workspace_type,type,true));
DROP POLICY IF EXISTS todo_update ON public.tasks;
CREATE POLICY todo_update ON public.tasks FOR UPDATE TO authenticated
 USING(todo_private.task_allowed(user_id,workspace_type,type,true))
 WITH CHECK(todo_private.task_allowed(user_id,workspace_type,type,true));
DROP POLICY IF EXISTS todo_update_guard ON public.tasks;
CREATE POLICY todo_update_guard ON public.tasks AS RESTRICTIVE FOR UPDATE TO authenticated
 USING(todo_private.task_allowed(user_id,workspace_type,type,true))
 WITH CHECK(todo_private.task_allowed(user_id,workspace_type,type,true));
DROP POLICY IF EXISTS todo_delete ON public.tasks;
CREATE POLICY todo_delete ON public.tasks FOR DELETE TO authenticated
 USING(todo_private.task_allowed(user_id,workspace_type,type,true));
DROP POLICY IF EXISTS todo_delete_guard ON public.tasks;
CREATE POLICY todo_delete_guard ON public.tasks AS RESTRICTIVE FOR DELETE TO authenticated
 USING(todo_private.task_allowed(user_id,workspace_type,type,true));

CREATE OR REPLACE FUNCTION todo_private.keep_task_identity()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NOT NULL AND (NEW.id IS DISTINCT FROM OLD.id OR NEW.user_id IS DISTINCT FROM OLD.user_id
   OR NEW.workspace_type IS DISTINCT FROM OLD.workspace_type OR NEW.created_by IS DISTINCT FROM OLD.created_by) THEN
  RAISE EXCEPTION 'Task identity, workspace and creator cannot be changed' USING ERRCODE='42501';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION todo_private.keep_task_identity() FROM PUBLIC;
DROP TRIGGER IF EXISTS todo_keep_task_identity ON public.tasks;
CREATE TRIGGER todo_keep_task_identity BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION todo_private.keep_task_identity();

CREATE TABLE IF NOT EXISTS public.task_event_responses (
 task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
 member_user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
 response text NOT NULL CHECK(response IN ('accepted','rejected')),
 responded_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(task_id,member_user_id)
);
ALTER TABLE public.task_event_responses ENABLE ROW LEVEL SECURITY;
GRANT SELECT,INSERT,UPDATE ON public.task_event_responses TO authenticated;
REVOKE ALL ON public.task_event_responses FROM anon;
CREATE OR REPLACE FUNCTION todo_private.event_response_allowed(event_id uuid, respondent uuid, writing boolean)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS (
  SELECT 1 FROM public.tasks t WHERE t.id=event_id AND t.workspace_type='company'
  AND lower(btrim(t.type))='event' AND todo_private.company_level(t.user_id)>0
  AND (respondent=auth.uid() OR (NOT writing AND todo_private.company_level(t.user_id)=2))
 );
$$;
REVOKE ALL ON FUNCTION todo_private.event_response_allowed(uuid,uuid,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION todo_private.event_response_allowed(uuid,uuid,boolean) TO authenticated;
DROP POLICY IF EXISTS todo_response_read ON public.task_event_responses;
CREATE POLICY todo_response_read ON public.task_event_responses FOR SELECT TO authenticated
 USING(todo_private.event_response_allowed(task_id,member_user_id,false));
DROP POLICY IF EXISTS todo_response_insert ON public.task_event_responses;
CREATE POLICY todo_response_insert ON public.task_event_responses FOR INSERT TO authenticated
 WITH CHECK(todo_private.event_response_allowed(task_id,member_user_id,true));
DROP POLICY IF EXISTS todo_response_update ON public.task_event_responses;
CREATE POLICY todo_response_update ON public.task_event_responses FOR UPDATE TO authenticated
 USING(todo_private.event_response_allowed(task_id,member_user_id,true))
 WITH CHECK(todo_private.event_response_allowed(task_id,member_user_id,true));
COMMIT;
