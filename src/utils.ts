// Minimal runtime-required subset of the shared-experience integration
// branch's own `src/utils.ts`, restored ONLY for `todayStr` — the single
// export the ported src/aiExperience/providers/** and dataChat/providers/**
// files depend on (see their own `import { todayStr } from '../../utils'`).
// Production has no equivalent shared date-string helper of its own (only
// an inline `new Date().toLocaleDateString('en-CA')` local to
// useTaskGrouping.ts) and no other exports from the feature branch's
// original utils.ts (apiBaseUrl, ACCENTS, formatDate, etc.) are referenced
// by anything ported into this repo, so they are intentionally not
// restored here.
export const toLocalDateStr = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const todayStr = () => toLocalDateStr(new Date());
