// Small, presentation-only component. Deliberately contains NO
// deterministic business logic — it only renders whatever candidate
// `useTodoPersonalizedInsight` already resolved and invokes the action
// callback it's given. All eligibility/priority/tie-break decisions live in
// ../providers and ../resolver, never here.

import React from 'react';
import { AlertTriangle, Clock, ListChecks, CheckCircle2 } from 'lucide-react';
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
  // Normal Tasks Today — informational, non-critical, deliberately neutral
  // (not red/accent like the two urgent tiers above).
  LOW: {
    icon: <ListChecks size={16} />,
    wrapperClass: 'border-slate-400/25 bg-slate-400/8 text-slate-500 dark:text-slate-400',
  },
  // Nothing Today — a positive fallback, not an alert; reuses the same
  // emerald "success" tokens Toast.tsx already uses for its own completed
  // state, rather than introducing a new color convention.
  INFO: {
    icon: <CheckCircle2 size={16} />,
    wrapperClass: 'border-emerald-500/25 bg-emerald-500/8 text-emerald-600 dark:text-emerald-400',
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
