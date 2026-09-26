import React, { useState, useRef, useEffect } from 'react';
import { Send, Globe, CheckSquare, Square } from 'lucide-react';
import { TabContext } from '../types/extension';

interface ChatInputProps {
  onSend: (text: string, includeContext: boolean) => void;
  isLoading: boolean;
  activeTab: TabContext | null;
  includeTabContext: boolean;
  onToggleTabContext: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  isLoading,
  activeTab,
  includeTabContext,
  onToggleTabContext,
}) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() || isLoading) return;
    onSend(text.trim(), includeTabContext);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="p-2.5 bg-[#0e0e11] border-t border-white/10 select-none">
      {/* Context pill toggle */}
      {activeTab && (
        <div className="flex items-center justify-between mb-1.5 px-1">
          <button
            type="button"
            onClick={onToggleTabContext}
            className={`flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full transition-all duration-150 cursor-pointer ${
              includeTabContext
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'bg-white/5 text-slate-400 border border-white/5 hover:text-slate-200'
            }`}
            title="تضمين عنوان ورابط الصفحة المفتوحة في المتصفح لمساعدة الوكيل في فهم سياقك"
          >
            <Globe className="w-3 h-3" />
            <span className="truncate max-w-[200px]">{activeTab.title}</span>
            {includeTabContext ? (
              <CheckSquare className="w-3 h-3 text-indigo-400" />
            ) : (
              <Square className="w-3 h-3 text-slate-500" />
            )}
          </button>
        </div>
      )}

      {/* Input box */}
      <form onSubmit={handleSubmit} className="relative flex items-end gap-1.5">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="اسأل MaxP Copilot أو اطلب مساعدة…"
          rows={1}
          disabled={isLoading}
          className="w-full resize-none bg-[#16161a] text-slate-100 placeholder:text-slate-500 text-xs rounded-xl px-3 py-2 border border-white/10 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 outline-none max-h-24 overflow-y-auto leading-normal"
        />

        <button
          type="submit"
          disabled={!text.trim() || isLoading}
          className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white shrink-0 shadow-md shadow-indigo-600/20 transition-all duration-150 active:scale-[0.95] cursor-pointer"
          title="إرسال (Enter)"
          aria-label="إرسال"
        >
          <Send className="w-3.5 h-3.5 -scale-x-100" />
        </button>
      </form>
    </div>
  );
};
