import React from 'react';

export function FeatureCardSmall({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl glass text-accent shadow-sm">{icon}</div>
      <div>
        <h3 className="text-lg font-black tracking-tight">{title}</h3>
        <p className="text-sm opacity-60">{desc}</p>
      </div>
    </div>
  );
}

export function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface)] p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-accent hover:shadow-[0_20px_45px_var(--accent-subtle)]">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--bg3)]">{icon}</div>
      <h3 className="mb-3 text-xl font-black tracking-tight">{title}</h3>
      <p className="text-sm leading-7 text-[var(--text3)]">{desc}</p>
    </div>
  );
}
