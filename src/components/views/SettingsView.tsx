import React from 'react';
import { User, Sun, Moon, LayoutGrid, Check, Loader2 } from 'lucide-react';
import { supabase } from '../../supabase';
import { AppUser } from '../../types';
import { ACCENTS } from '../../utils';
import { ConfirmModal } from '../ConfirmModal';

interface SettingsViewProps {
  user: AppUser;
  setUser: React.Dispatch<React.SetStateAction<AppUser>>;
  theme: string;
  setTheme: (theme: string) => void;
  accent: string;
  setAccent: (accent: string) => void;
  showCompleted: boolean;
  setShowCompleted: (show: boolean) => void;
  handleLogout: () => void;
  setTasks: (tasks: any[]) => void;
  setUserLists: React.Dispatch<React.SetStateAction<any[]>>;
  defaultListId: string;
  setDefaultListId: (id: string) => void;
  userLists: { id: string; name: string; color: string }[];
}

export function SettingsView({
  user,
  setUser,
  theme,
  setTheme,
  accent,
  setAccent,
  showCompleted,
  setShowCompleted,
  handleLogout,
  setTasks,
  setUserLists,
  defaultListId,
  setDefaultListId,
  userLists
}: SettingsViewProps) {
  const [showClearConfirm, setShowClearConfirm] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveStatus, setSaveStatus] = React.useState<'idle' | 'success' | 'error'>('idle');

  const handleSaveProfile = async () => {
    if (!supabase) return;
    setIsSaving(true);
    setSaveStatus('idle');

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.user_id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          position: user.position,
          company_name: user.company_name,
          account_type: user.account_type,
          avatar_url: user.avatar_url,
          background_url: user.background_url,
          status: user.status,
          plan: user.plan,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error('Error saving profile:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-[var(--surface)] p-6 rounded-xl border border-[var(--border)]">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><User size={16} className="text-accent" /> Profile Information</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-[var(--text4)] uppercase block mb-1">Full Name</label>
                <input
                  type="text"
                  value={user.name}
                  onChange={(e) => setUser({ ...user, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] text-[12px] outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[var(--text4)] uppercase block mb-1">Email</label>
                <input
                  type="email"
                  value={user.email}
                  readOnly
                  className="w-full px-3 py-2 rounded-lg border border-[var(--input-border)] bg-[var(--bg3)] text-[12px] opacity-70 cursor-not-allowed outline-none focus:border-accent"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-[var(--text4)] uppercase block mb-1">Position</label>
                <input
                  type="text"
                  value={user.position || ''}
                  readOnly
                  className="w-full px-3 py-2 rounded-lg border border-[var(--input-border)] bg-[var(--bg3)] text-[12px] opacity-70 cursor-not-allowed outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[var(--text4)] uppercase block mb-1">Company</label>
                <input
                  type="text"
                  value={user.company_name || ''}
                  onChange={(e) => setUser({ ...user, company_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] text-[12px] outline-none focus:border-accent"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-[var(--text4)] uppercase block mb-1">Phone</label>
                <input
                  type="text"
                  value={user.phone || ''}
                  onChange={(e) => setUser({ ...user, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] text-[12px] outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[var(--text4)] uppercase block mb-1">Account Type</label>
                <select
                  value={user.account_type || 'individual'}
                  onChange={(e) => setUser({ ...user, account_type: e.target.value })}
                  className="w-full px-3 pr-8 py-2 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] text-[12px] outline-none focus:border-accent select-custom-arrow"
                >
                  <option value="individual">Individual</option>
                  <option value="company">Company</option>
                </select>
              </div>
            </div>
            <div className="pt-2">
              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className={`w-full py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 ${saveStatus === 'success'
                    ? 'bg-green-500 text-white'
                    : saveStatus === 'error'
                      ? 'bg-red-500 text-white'
                      : 'bg-accent text-white hover:opacity-90 active:scale-[0.98]'
                  } disabled:opacity-50`}
              >
                {isSaving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : saveStatus === 'success' ? (
                  <>
                    <Check size={14} />
                    <span>Profile Saved!</span>
                  </>
                ) : saveStatus === 'error' ? (
                  <span>Error! Try Again</span>
                ) : (
                  <span>Save Profile Changes</span>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-[var(--surface)] p-6 rounded-xl border border-[var(--border)]">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2">🎨 Appearance</h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-[var(--text2)]">Theme</div>
                <div className="text-[11px] text-[var(--text3)]">Choose your preferred color scheme</div>
              </div>
              <div className="flex gap-2">
                <button
                  className={`p-2 rounded-lg border transition ${theme === 'light' ? 'border-accent bg-[var(--accent-light)] text-accent' : 'border-[var(--border)]'}`}
                  onClick={() => setTheme('light')}
                  aria-label="Use light mode"
                >
                  <Sun size={16} />
                </button>
                <button
                  className={`p-2 rounded-lg border transition ${theme === 'dark' ? 'border-accent bg-accent text-white' : 'border-[var(--border)]'}`}
                  onClick={() => setTheme('dark')}
                  aria-label="Use dark mode"
                >
                  <Moon size={16} />
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--border)]">
              <div className="text-xs font-bold text-[var(--text2)] mb-3">Accent Color</div>
              <div className="flex flex-wrap items-center gap-3">
                {Object.keys(ACCENTS).map(a => (
                  <button
                    key={a}
                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 shadow-sm ${accent === a ? 'border-[var(--text)]' : 'border-transparent'}`}
                    style={{ backgroundColor: (ACCENTS as any)[a].main }}
                    onClick={() => setAccent(a)}
                    title={a}
                  />
                ))}
                <div className="flex items-center gap-2 pl-2 border-l border-[var(--border)]">
                  <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-[var(--border)] hover:scale-110 transition-transform shadow-sm">
                    <input
                      type="color"
                      value={accent.startsWith('#') ? accent : (ACCENTS as any)[accent]?.main || '#0078d4'}
                      onChange={(e) => setAccent(e.target.value)}
                      className="absolute inset-0 w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer"
                    />
                  </div>
                  <span className="text-[10px] font-bold text-[var(--text4)] uppercase tracking-wider">Custom</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[var(--surface)] p-6 rounded-xl border border-[var(--border)]">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2">📋 Display & Security</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-[var(--text2)]">Show Completed</div>
                <div className="text-[11px] text-[var(--text3)]">Display finished tasks in list</div>
              </div>
              <div
                className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${showCompleted ? 'bg-accent' : 'bg-gray-300'}`}
                onClick={() => setShowCompleted(!showCompleted)}
              >
                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${showCompleted ? 'translate-x-5' : ''}`}></div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
              <div>
                <div className="text-xs font-bold text-[var(--text2)]">Default Save Location</div>
                <div className="text-[11px] text-[var(--text3)]">Where new tasks go by default</div>
              </div>
              <select
                value={defaultListId}
                onChange={(e) => setDefaultListId(e.target.value)}
                className="pl-3 pr-8 py-1.5 rounded-lg border border-[var(--input-border)] bg-[var(--input-bg)] text-[11px] font-bold outline-none focus:border-accent select-custom-arrow"
              >
                {userLists.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>

            <div className="pt-4 border-t border-[var(--border)] flex gap-2">
              <button
                className="flex-1 py-2 rounded-lg border border-red-200 text-red-600 font-bold text-xs hover:bg-red-50 transition"
                onClick={() => setShowClearConfirm(true)}
              >
                Clear Data
              </button>
              <button
                className="flex-1 py-2 rounded-lg bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition"
                onClick={handleLogout}
              >
                Log Out
              </button>
            </div>

            <ConfirmModal
              show={showClearConfirm}
              onClose={() => setShowClearConfirm(false)}
              onConfirm={async () => {
                if (supabase) {
                  // 1. Delete from DB
                  await supabase.from('tasks').delete().eq('user_id', user.user_id);
                  await supabase.from('task-categories').delete().eq('user_id', user.user_id);
                }

                // 2. Clear local state
                const DEFAULT_CATEGORIES = [
                  { id: 'personal', name: 'Personal', color: '#3b82f6' },
                  { id: 'work', name: 'Work', color: '#a855f7' },
                  { id: 'events', name: 'Events', color: '#ef4444' }
                ];
                setTasks([]);
                setUserLists(DEFAULT_CATEGORIES);

                // 3. Selective LocalStorage Clear (only app keys, don't touch auth)
                const keysToClear = [
                  'tf_tasks', 'tf_user_lists', 'tf_pinned_lists',
                  'tf_default_list', 'tf_show_completed'
                ];
                keysToClear.forEach(key => localStorage.removeItem(key));

                setShowClearConfirm(false);
              }}
              title="Clear All Data?"
              message="This will permanently delete all your tasks, categories, and settings from this browser. This action cannot be undone."
              confirmText="Clear Everything"
            />
          </div>
        </div>
      </div>

      <div className="bg-accent text-white p-6 rounded-xl shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-xl font-black mb-1">To-do manager v1.0.0</h2>
          <p className="text-sm opacity-90">Experience the premium task manager. Your data is saved locally on this browser.</p>
        </div>
        <LayoutGrid className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10 rotate-12" />
      </div>

      <div className="pt-4 text-[10px] font-black uppercase tracking-widest text-[var(--text4)] flex items-center justify-between">
        <span>© 2026 To-do manager Systems</span>
        <span>Designed by Hei</span>
      </div>
    </div>
  );
}
