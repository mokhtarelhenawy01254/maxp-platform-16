import React from 'react';
import { Sparkles, Package, AlertTriangle, Globe, HelpCircle } from 'lucide-react';
import { TabContext } from '../types/extension';

interface QuickActionsProps {
  onSelectPrompt: (prompt: string) => void;
  activeTab: TabContext | null;
  agentPrompts: string[];
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onSelectPrompt,
  activeTab,
  agentPrompts,
}) => {
  return (
    <div className="p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          إجراءات سريعة مقترحة
        </span>
      </div>

      <div className="grid grid-cols-1 gap-1.5">
        {/* If an active tab is available, show quick analyze button */}
        {activeTab && (
          <button
            type="button"
            onClick={() =>
              onSelectPrompt(
                `حلل لي الصفحة المفتوحة حالياً (${activeTab.title}) واستخرج أهم النقاط والمحتوى المفيد منها لمتجري.`
              )
            }
            className="flex items-center gap-2 p-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/15 border border-indigo-500/25 text-left text-slate-200 hover:text-white transition-all duration-150 active:scale-[0.98] group cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <div className="flex flex-col min-w-0 text-right w-full">
              <span className="text-[11px] font-medium leading-tight truncate">
                تحليل محتوى الصفحة المفتوحة
              </span>
              <span className="text-[9px] text-indigo-300/80 truncate font-mono">
                {activeTab.title}
              </span>
            </div>
          </button>
        )}

        {/* Dynamic prompts based on selected agent */}
        {agentPrompts.map((prompt, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectPrompt(prompt)}
            className="flex items-center gap-2 p-2 rounded-lg bg-[#141417] hover:bg-[#1a1a20] border border-white/5 hover:border-white/15 text-slate-300 hover:text-white transition-all duration-150 active:scale-[0.98] text-right cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-[11px] font-medium leading-tight truncate">{prompt}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
