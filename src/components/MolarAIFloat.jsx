import { useEffect, useMemo, useState } from 'react';
import { SharedMolarAI } from '@mrburdeveloperteam/molar-experience/ai';
import { supabase } from '../lib/supabase';
import { createTodoMolarAdapter } from '../aiExperience/todoMolarAdapter';

// PHASE 5C NOTE (Molar AI extraction): this file is now a LOCAL adapter
// only — the floating button, chat panel, message rendering, markdown,
// input/loading/error UI, and generic send/scroll/clear lifecycle all
// live in @mrburdeveloperteam/molar-experience/ai's <SharedMolarAI>. This
// component's job is: (1) build the AIAdapter To-Do's own business logic
// implements (see ../aiExperience/todoMolarAdapter.ts — moved
// mechanically, not rewritten), and (2) fetch the empty-state welcome
// title/subtitle/prompt-suggestions data this app has always pulled from
// AIBoard, reactively feeding it to the shared component.
//
// KNOWN, ACCEPTED TIMING SEAM (same pattern as Profit Calculator's Phase
// 4D migration): the empty-state AIBoard config now fetches once on
// mount rather than only when the panel is first opened, because the
// shared component's open/closed state is intentionally internal to it,
// not exposed back to hosts. This is one cheap, harmless, read-only
// query per page load — it has no effect on anything the user sees.
export default function MolarAIFloat({ userContext, disabled = false, onPetToggle, tasks = [], taskDataStatus = 'loading' }) {
  const [emptyState, setEmptyState] = useState(undefined);

  useEffect(() => {
    let cancelled = false;
    const fetchSimConfig = async () => {
      try {
        const { data: configs } = await supabase
          .from('aiboard_simulator_configs')
          .select('id, title, subtitle')
          .eq('module_name', 'To-Do Manager')
          .limit(1);

        const fallbackPrompts = [
          { label: 'How does it work?', iconName: 'Zap' },
          { label: 'Show examples', iconName: 'ShieldCheck' },
          { label: 'Best practices', iconName: 'AlertCircle' },
          { label: 'Get help', iconName: 'BarChart3' },
        ];

        if (configs && configs.length > 0) {
          const title = configs[0].title;
          const subtitle = configs[0].subtitle || 'Ready to assist with tasks, reminders, calendar planning, and productivity workflows.';

          const { data: promptData } = await supabase
            .from('aiboard_simulator_prompts')
            .select('text, icon_name, sort_order')
            .eq('config_id', configs[0].id)
            .order('sort_order', { ascending: true });

          const prompts = promptData && promptData.length > 0
            ? promptData.map((p) => ({ label: p.text, iconName: p.icon_name }))
            : fallbackPrompts;

          if (!cancelled) setEmptyState({ title, subtitle, prompts });
        } else if (!cancelled) {
          setEmptyState({ prompts: fallbackPrompts });
        }
      } catch (err) {
        console.error('Error fetching sim configs:', err);
      }
    };

    fetchSimConfig();
    return () => { cancelled = true; };
  }, []);

  const adapter = useMemo(
    () => createTodoMolarAdapter({
      tasks,
      taskDataStatus,
      userContext: userContext || '',
    }),
    [tasks, taskDataStatus, userContext]
  );

  return (
    <SharedMolarAI
      adapter={adapter}
      disabled={disabled}
      onPetToggle={onPetToggle}
      emptyState={emptyState}
    />
  );
}
