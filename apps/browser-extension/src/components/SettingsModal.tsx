import React, { useState } from 'react';
import { X, Server, User, LogOut, Check, RefreshCw } from 'lucide-react';
import { ExtensionSettings, ExtensionAgent, UserSession } from '../types/extension';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ExtensionSettings;
  onSaveSettings: (settings: Partial<ExtensionSettings>) => void;
  session: UserSession | null;
  onLogout: () => void;
  availableAgents: ExtensionAgent[];
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  session,
  onLogout,
  availableAgents,
}) => {
  const [serverUrl, setServerUrl] = useState(settings.serverUrl);
  const [agentSlug, setAgentSlug] = useState(settings.selectedAgentSlug);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings({
      serverUrl: serverUrl.trim(),
      selectedAgentSlug: agentSlug,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm select-none animate-in fade-in duration-150">
      <div className="w-full max-w-xs bg-[#111114] border border-white/10 rounded-2xl p-4 shadow-2xl space-y-3.5">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <h3 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
            <span>إعدادات MaxP Copilot</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Info if logged in */}
        {session && (
          <div className="flex items-center justify-between p-2 rounded-xl bg-[#16161a] border border-white/5 text-[11px]">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                <User className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-slate-200 truncate">{session.user.name}</div>
                <div className="text-[9px] text-slate-400 font-mono truncate">
                  {session.user.email}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onLogout}
              className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="تسجيل الخروج"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Server URL Input */}
        <div>
          <label className="block text-[10px] font-medium text-slate-400 mb-1 flex items-center gap-1">
            <Server className="w-3 h-3 text-slate-500" />
            <span>رابط سيرفر MaxP</span>
          </label>
          <input
            type="text"
            value={serverUrl}
            onChange={(e) => setServerUrl(e.target.value)}
            placeholder="https://maxp.online"
            className="w-full bg-[#18181c] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 outline-none focus:border-indigo-500"
          />
          <div className="flex gap-1.5 mt-1.5">
            <button
              type="button"
              onClick={() => setServerUrl('https://maxp.online')}
              className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200"
            >
              Cloud (maxp.online)
            </button>
            <button
              type="button"
              onClick={() => setServerUrl('http://localhost:5000')}
              className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200"
            >
              Local (localhost:5000)
            </button>
          </div>
        </div>

        {/* Default Agent Picker */}
        <div>
          <label className="block text-[10px] font-medium text-slate-400 mb-1">
            الوكيل الافتراضي عند الفتح
          </label>
          <select
            value={agentSlug}
            onChange={(e) => setAgentSlug(e.target.value)}
            className="w-full bg-[#18181c] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500 cursor-pointer"
          >
            {availableAgents.map((a) => (
              <option key={a.slug} value={a.slug} className="bg-[#111114]">
                {a.badge} — {a.name}
              </option>
            ))}
          </select>
        </div>

        {/* Footer actions */}
        <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/5">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white transition-colors"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all active:scale-[0.98]"
          >
            {savedSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                <span>تم الحفظ</span>
              </>
            ) : (
              <span>حفظ الإعدادات</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
