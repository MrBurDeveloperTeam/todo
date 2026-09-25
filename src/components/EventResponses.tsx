import React, { useEffect, useState } from 'react';
import { todoRequest, type TodoWorkspace } from '../lib/todoWorkspace';

interface EventResponse { member_user_id: string; member_name?: string | null; response: 'accepted' | 'rejected'; }
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
      <button disabled={busy} aria-pressed={own?.response === 'accepted'} className={`rounded-lg border px-3 py-1.5 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${own?.response === 'accepted' ? 'bg-teal-600 border-teal-600 text-white' : 'bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100 dark:bg-teal-950 dark:border-teal-800 dark:text-teal-300'}`} onClick={() => void respond('accepted')}>Accept</button>
      <button disabled={busy} aria-pressed={own?.response === 'rejected'} className={`rounded-lg border px-3 py-1.5 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${own?.response === 'rejected' ? 'bg-rose-600 border-rose-600 text-white' : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 dark:bg-rose-950 dark:border-rose-800 dark:text-rose-300'}`} onClick={() => void respond('rejected')}>Reject</button>
      <button disabled={busy} className="underline" onClick={() => setRefresh(value => value + 1)}>Refresh</button>
    </div>
    {error && <p role="alert" className="text-red-600 mt-2">{error}</p>}
    {workspace.canManageEvents && !busy && !error && <div className="mt-3">
      <p className="font-semibold">Event responses ({responses.length})</p>
      {responses.length === 0 && <p>No responses yet.</p>}
      {responses.map(row => <p className="break-all text-xs mt-2" key={row.member_user_id}>
        {row.member_name || (row.member_user_id === workspace.actorUserId ? 'You' : 'Name unavailable')}: <span className={row.response === 'accepted' ? 'text-teal-700 dark:text-teal-300' : 'text-rose-700 dark:text-rose-300'}>{row.response}</span>
      </p>)}
    </div>}
  </section>;
}
