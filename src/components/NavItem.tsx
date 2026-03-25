import React from 'react';

export function NavItem({ icon, label, badge, active, onClick, collapsed }: { icon: React.ReactNode, label: string, badge?: number, active?: boolean, onClick: () => void, collapsed: boolean }) {
  return (
    <button 
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all relative group ${active ? 'bg-[var(--sidebar-active)] text-accent font-bold' : 'text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover)]'}`}
      onClick={onClick}
    >
      <div className={`flex-shrink-0 transition-transform group-hover:scale-110 ${active ? 'text-accent' : 'text-[var(--text3)]'}`}>{icon}</div>
      {!collapsed && (
        <span className="text-[13.5px] whitespace-nowrap transition-all opacity-100">{label}</span>
      )}
      {!collapsed && badge !== undefined && badge > 0 && (
        <span className="ml-auto bg-accent text-white text-[9px] font-bold h-4.5 min-w-[18px] px-1.5 rounded-full flex items-center justify-center">{badge}</span>
      )}
      {collapsed && (
        <div className="absolute left-16 bg-black text-white px-2 py-1 rounded text-[10px] invisible group-hover:visible whitespace-nowrap z-[100] shadow-xl">{label}</div>
      )}
    </button>
  );
}
