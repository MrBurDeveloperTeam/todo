// Small, presentation-only component. Deliberately contains NO
// deterministic business logic — it only renders whatever candidate
// `useTodoPersonalizedInsight` already resolved and invokes the action
// callback it's given. All eligibility/priority/tie-break decisions live in
// ../providers and ../resolver, never here.

import React from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import type { InsightCandidate, InsightPriority } from '../contracts/insightCandidate';

interface PersonalizedInsightProps {
  candidate: InsightCandidate<unknown>;
  onAction: () => void;
}

const PRIORITY_STYLES: Record<InsightPriority, { icon: React.ReactNode; wrapperClass: string }> = {
  HIGH: {
    icon: <AlertTriangle size={16} />,
    wrapperClass: 'border-red-500/25 bg-red-500/8 text-red-600 dark:text-red-400',
  },
  MEDIUM: {
    icon: <Clock size={16} />,
    wrapperClass: 'border-accent/25 bg-accent/8 text-accent',
  },
};

export function PersonalizedInsight({ candidate, onAction }: PersonalizedInsightProps) {
  const style = PRIORITY_STYLES[candidate.priority];

  return (
    <div
      className={`mb-3 flex items-center gap-3 rounded-xl border px-4 py-3 text-[13px] ${style.wrapperClass}`}
    >
      <div className="flex-shrink-0">{style.icon}</div>
      <p className="min-w-0 flex-1 text-[var(--text)]">{candidate.message}</p>
      {candidate.action && (
        <button
          type="button"
          onClick={onAction}
          className="flex-shrink-0 text-[12px] font-semibold text-accent transition hover:opacity-75"
        >
          {candidate.action.label}
        </button>
      )}
    </div>
  );
}
