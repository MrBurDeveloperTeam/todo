-- Undo only the correction in 03-owner-task-correction.sql, as postgres.
-- Keeps tasks, edits, creators and event responses. No task deletion.
-- Corrected Work/Events tasks become private again and no longer appear in the
-- new owner Company view. Coordinate any frontend/Worker rollback separately.
BEGIN;
UPDATE public.tasks t
SET workspace_type = b.previous_workspace_type
FROM todo_private.owner_task_workspace_backup b
WHERE t.id = b.task_id AND t.user_id = b.owner_id
  AND t.user_id = '37c433fc-e5e8-48bf-a9b1-4e371ab02a6b'::uuid
  AND t.workspace_type = 'company';
COMMIT;
