import React, { useRef } from 'react';
import { Send, Paperclip, X } from 'lucide-react';

interface CopilotInputFooterProps {
  inputValue: string;
  setInputValue: (val: string) => void;
  loading: boolean;
  attachedImages: string[];
  onRemoveImage: (index: number) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSendMessage: () => void;
  telemetry: { model?: string; latency_ms?: number } | null;
  inputRef?: React.RefObject<HTMLTextAreaElement>;
}

export const CopilotInputFooter: React.FC<CopilotInputFooterProps> = ({
  inputValue,
  setInputValue,
  loading,
  attachedImages,
  onRemoveImage,
  onFileUpload,
  onSendMessage,
  telemetry,
  inputRef,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      {/* Attached Images Preview */}
      {attachedImages.length > 0 && (
        <div className="px-4 py-2 border-t border-white/5 bg-[#121214] flex items-center gap-2">
          {attachedImages.map((img, idx) => (
            <div key={idx} className="relative h-12 w-12 rounded-lg border border-white/10 overflow-hidden">
              <img src={img} alt="attached" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => onRemoveImage(idx)}
                className="absolute top-0.5 right-0.5 rounded-full bg-black/70 p-0.5 text-white hover:bg-rose-600 transition-colors"
                aria-label="إزالة الصورة"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Footer Input Bar */}
      <footer className="p-3 border-t border-white/10 bg-[#121214]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSendMessage();
          }}
          className="relative flex items-center"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFileUpload}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute right-2.5 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            title="إرفاق صورة أو لقطة شاشة"
            aria-label="إرفاق صورة أو لقطة شاشة"
          >
            <Paperclip className="h-4 w-4" />
          </button>

          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSendMessage();
              }
            }}
            rows={1}
            placeholder="اكتب أمرك أو استفسارك (Enter للإرسال)..."
            className="w-full bg-[#18181b] border border-white/10 rounded-xl px-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none max-h-28"
          />

          <button
            type="submit"
            disabled={loading || (!inputValue.trim() && attachedImages.length === 0)}
            className="absolute left-2.5 p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            title="إرسال"
            aria-label="إرسال"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>

        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 px-1">
          <span>
            اختصار: <kbd className="rounded border border-white/10 bg-white/5 px-1 py-0.5 text-slate-400 font-mono">Ctrl + J</kbd>
          </span>
          {telemetry && (
            <span className="font-mono tabular-nums text-slate-400">
              {telemetry.model} · {telemetry.latency_ms}ms
            </span>
          )}
        </div>
      </footer>
    </>
  );
};
