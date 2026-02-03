import React from 'react';

const HandDrawView: React.FC = () => {
  return (
    <div className="w-full h-full rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md p-6">
      <h2 className="text-xl font-bold text-slate-900 dark:text-white">Hand Draw</h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        This is your hand draw view. Add your canvas or tools here.
      </p>
    </div>
  );
};

export default HandDrawView;
