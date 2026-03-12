import React, { useState, useRef, useEffect } from 'react';
import { WhiteboardMetadata } from '@/src/features/whiteboard/types/whiteboard.types';

interface WhiteboardSelectorProps {
    whiteboards: WhiteboardMetadata[];
    activeId: string;
    onSelect: (id: string) => void;
    onCreate: (title: string) => void;
    onDelete?: (id: string) => void;
}

export default function WhiteboardSelector({
    whiteboards,
    activeId,
    onSelect,
    onCreate,
    onDelete
}: WhiteboardSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const menuRef = useRef<HTMLDivElement>(null);

    const activeBoard = whiteboards.find(b => b.id === activeId) || whiteboards[0];

    useEffect(() => {
        const handleOutside = (e: PointerEvent) => {
            if (isOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setIsCreating(false);
                setNewTitle('');
            }
        };
        window.addEventListener('pointerdown', handleOutside);
        return () => window.removeEventListener('pointerdown', handleOutside);
    }, [isOpen]);

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newTitle.trim()) {
            onCreate(newTitle.trim());
            setIsCreating(false);
            setNewTitle('');
            setIsOpen(false);
        }
    };

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-xl bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 shadow-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors backdrop-blur-md"
            >
                <span className="material-symbols-outlined text-[18px]">developer_board</span>
                <span className="font-semibold text-sm max-w-[120px] md:max-w-[200px] truncate">
                    {activeBoard?.title || 'Whiteboard'}
                </span>
                <span className="material-symbols-outlined text-[16px] text-slate-400">
                    {isOpen ? 'expand_less' : 'expand_more'}
                </span>
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 md:w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-[9999] overflow-hidden">
                    <div className="p-3 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Your Whiteboards</span>
                        <button
                            onClick={() => setIsCreating(true)}
                            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors flex items-center"
                            title="New Whiteboard"
                        >
                            <span className="material-symbols-outlined text-[18px]">add_circle</span>
                        </button>
                    </div>

                    <div className="max-h-64 overflow-y-auto w-full">
                        {isCreating && (
                            <form onSubmit={handleCreateSubmit} className="p-2 border-b border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/50 dark:bg-indigo-900/10">
                                <input
                                    type="text"
                                    autoFocus
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    placeholder="Whiteboard Name..."
                                    className="w-full px-3 py-2 text-sm rounded-lg border border-indigo-200 dark:border-indigo-700/50 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <div className="flex gap-2 mt-2 justify-end">
                                    <button type="button" onClick={() => setIsCreating(false)} className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">Cancel</button>
                                    <button type="submit" className="text-xs font-semibold px-2 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700">Create</button>
                                </div>
                            </form>
                        )}

                        {whiteboards.length === 0 && !isCreating && (
                            <div className="p-4 text-center text-sm text-slate-500">No whiteboards found.</div>
                        )}

                        {whiteboards.map((board) => (
                            <div
                                key={board.id}
                                className={`group flex items-center justify-between px-2 w-full transition-colors ${board.id === activeId
                                        ? 'bg-blue-50 dark:bg-blue-900/20'
                                        : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                    }`}
                            >
                                <button
                                    onClick={() => {
                                        onSelect(board.id);
                                        setIsOpen(false);
                                    }}
                                    className="flex-1 py-3 px-2 text-left text-sm font-medium flex items-center gap-2"
                                >
                                    <span className={`material-symbols-outlined text-[16px] ${board.id === activeId ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity'}`}>
                                        {board.id === activeId ? 'check' : 'drag_indicator'}
                                    </span>
                                    <span className={`truncate text-ellipsis ${board.id === activeId ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200'}`}>
                                        {board.title}
                                    </span>
                                </button>

                                {onDelete && whiteboards.length > 1 && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (window.confirm(`Delete "${board.title}"? This cannot be undone.`)) {
                                                onDelete(board.id);
                                            }
                                        }}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 opacity-0 group-hover:opacity-100 transition-all ml-2 flex-shrink-0 mr-1"
                                        title="Delete Whiteboard"
                                    >
                                        <span className="material-symbols-outlined text-[16px]">delete</span>
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
