import { Task } from '../../../hooks/types';

export const urgencyOptions: Task['urgency'][] = ['Low', 'Normal', 'Medium', 'High'];

export const getUrgencyStyles = (urgency: Task['urgency']) => {
  switch (urgency) {
    case 'High':
      return 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
    case 'Medium':
      return 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800';
    case 'Low':
      return 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800';
    default:
      return 'bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
  }
};

export const getTaskStyles = (task: Task) => {
  const colors: Record<string, { bg: string; text: string; dot: string; border: string }> = {
    blue: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500', border: 'border-blue-200 dark:border-blue-700/50' },
    red: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', dot: 'bg-red-500', border: 'border-red-200 dark:border-red-700/50' },
    green: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500', border: 'border-emerald-200 dark:border-emerald-700/50' },
    amber: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500', border: 'border-amber-200 dark:border-amber-700/50' },
    violet: { bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-700 dark:text-violet-400', dot: 'bg-violet-500', border: 'border-violet-200 dark:border-violet-700/50' },
    pink: { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-700 dark:text-pink-400', dot: 'bg-pink-500', border: 'border-pink-200 dark:border-pink-700/50' },
    cyan: { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-400', dot: 'bg-cyan-500', border: 'border-cyan-200 dark:border-cyan-700/50' },
    slate: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', dot: 'bg-slate-500', border: 'border-slate-200 dark:border-slate-700' },
  };

  if (!task.color) {
    return { bg: 'bg-slate-50 dark:bg-slate-800', text: 'text-slate-600', dot: 'bg-slate-500', border: 'border-slate-200' };
  }

  return colors[task.color] || colors.slate;
};

export const getDayColumnStyle = (index: number) => {
  const styles = [
    'bg-[#FDF6D8] dark:bg-yellow-900/30 border-[#F5E6A3] dark:border-yellow-900/40 backdrop-blur-sm',
    'bg-[#E3F1FC] dark:bg-blue-900/30 border-[#C8E4FA] dark:border-blue-900/40 backdrop-blur-sm',
    'bg-[#E8F5E9] dark:bg-green-900/30 border-[#C8E6C9] dark:border-green-900/40 backdrop-blur-sm',
    'bg-[#F3E5F5] dark:bg-purple-900/30 border-[#E1BEE7] dark:border-purple-900/40 backdrop-blur-sm',
    'bg-[#FCE4EC] dark:bg-pink-900/30 border-[#F8BBD0] dark:border-pink-900/40 backdrop-blur-sm',
    'bg-[#FFF3E0] dark:bg-orange-900/30 border-[#FFE0B2] dark:border-orange-900/40 backdrop-blur-sm',
    'bg-[#E0F7FA] dark:bg-cyan-900/30 border-[#B2EBF2] dark:border-cyan-900/40 backdrop-blur-sm',
  ];
  return styles[index % styles.length];
};
