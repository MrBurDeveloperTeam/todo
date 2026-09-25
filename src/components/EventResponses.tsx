import React, { useEffect, useState } from 'react';
import { todoRequest, type TodoWorkspace } from '../lib/todoWorkspace';

interface EventResponse { member_user_id: string; response: 'accepted' | 'rejected'; }
export function EventResponses({ taskId, workspace }: { taskId: string; workspace: TodoWorkspace }) {
  const [responses, setResponses] = useState<EventResponse[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    setResponses([]);
    setError('');
    setBusy(true);
    todoRequest(`/tasks/${taskId}/responses`, 'GET', undefined, workspace)
      .then(result => { if (active) setResponses(result.responses); })
      .catch(error => { if (active) setError(error.message); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [taskId, workspace, refresh]);
  const own = responses.find(row => row.member_user_id === workspace.actorUserId);
  const respond = async (response: EventResponse['response']) => {
    setBusy(true);
    setError('');
    try {
      await todoRequest(`/tasks/${taskId}/responses`, 'PUT', { response }, workspace);
      setRefresh(value => value + 1);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to save response.');
      setBusy(false);
    }
  };
  return <section className="my-3 p-3 rounded-lg border border-[var(--border)] text-sm" onClick={event => event.stopPropagation()}>
    <p className="font-semibold">Your response: {busy ? 'Loading…' : own?.response || 'Not responded'}</p>
    <div className="flex gap-2 mt-2">
      <button disabled={busy} className="border rounded px-3 py-1 disabled:opacity-50" onClick={() => void respond('accepted')}>Accept</button>
      <button disabled={busy} className="border rounded px-3 py-1 disabled:opacity-50" onClick={() => void respond('rejected')}>Reject</button>
      <button disabled={busy} className="underline" onClick={() => setRefresh(value => value + 1)}>Refresh</button>
    </div>
    {error && <p role="alert" className="text-red-600 mt-2">{error}</p>}
    {workspace.canManageEvents && !busy && !error && <div className="mt-3">
      <p className="font-semibold">Event responses ({responses.length})</p>
      <p className="text-xs opacity-70">Members are identified by their user ID.</p>
      {responses.length === 0 && <p>No responses yet.</p>}
      {responses.map(row => <p className="break-all text-xs mt-2" key={row.member_user_id}>
        {row.member_user_id === workspace.actorUserId ? 'You' : row.member_user_id}: {row.response}
      </p>)}
    </div>}
  </section>;
}
