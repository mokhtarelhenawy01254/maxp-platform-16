import React from 'react';
import { Settings, ShieldCheck, Zap } from 'lucide-react';
import { ExtensionAgent } from '../types/extension';

interface HeaderProps {
  currentAgent: ExtensionAgent;
  isConnected: boolean;
  onOpenSettings: () => void;
  onSelectAgent: (agent: ExtensionAgent) => void;
  availableAgents: ExtensionAgent[];
}

export const Header: React.FC<HeaderProps> = ({
  currentAgent,
  isConnected,
  onOpenSettings,
  onSelectAgent,
  availableAgents,
}) => {
  return (
    <header className="flex items-center justify-between px-3 py-2.5 bg-[#0e0e11] border-b border-white/10 select-none">
      {/* Brand & Connection Status */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="relative flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold text-xs">
          <Zap className="w-3.5 h-3.5" />
          <span
            className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ring-2 ring-[#0e0e11] ${
              isConnected ? 'bg-emerald-500' : 'bg-amber-500'
            }`}
            title={isConnected ? 'متصل بسيرفر MaxP' : 'غير متصل (تأكد من تسجيل الدخول)'}
          />
        </div>

        <div className="flex flex-col min-w-0">
          <span className="text-[11px] font-bold text-slate-100 tracking-tight leading-tight truncate">
            MaxP Copilot
          </span>
          <span className="text-[9px] text-slate-400 font-mono leading-none">
            {isConnected ? 'جاهز للمساعدة' : 'سجل الدخول'}
          </span>
        </div>
      </div>

      {/* Agent Selector Dropdown */}
      <div className="flex items-center gap-1.5">
        <select
          value={currentAgent.slug}
          onChange={(e) => {
            const found = availableAgents.find((a) => a.slug === e.target.value);
            if (found) onSelectAgent(found);
          }}
          className="text-[11px] font-medium bg-[#16161a] hover:bg-[#1c1c22] text-slate-200 border border-white/10 rounded-md px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-500/50 cursor-pointer max-w-[140px] truncate transition-colors"
          aria-label="اختيار الوكيل"
        >
          {availableAgents.map((agent) => (
            <option key={agent.slug} value={agent.slug} className="bg-[#121214] text-slate-200">
              {agent.badge} — {agent.name.split('—')[0]}
            </option>
          ))}
        </select>

        {/* Settings Button */}
        <button
          type="button"
          onClick={onOpenSettings}
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-white/5 transition-all duration-150 active:scale-[0.97]"
          title="الإعدادات وسيرفر الربط"
          aria-label="الإعدادات"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
