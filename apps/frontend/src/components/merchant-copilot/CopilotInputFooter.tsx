import React, { useRef } from 'react';
import { ArrowUp, Paperclip, X, Image as ImageIcon } from 'lucide-react';

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

  const canSubmit = !loading && (inputValue.trim().length > 0 || attachedImages.length > 0);

  return (
    <footer className="px-3 pb-3 pt-1 bg-[#09090b]">
      {/* Seamless Input Chassis */}
      <div className="rounded-2xl border border-white/[0.1] bg-[#121215] p-2.5 focus-within:border-zinc-500 focus-within:ring-1 focus-within:ring-zinc-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-all">
        {/* Attached Images Carousel/Thumbnails */}
        {attachedImages.length > 0 && (
          <div className="flex items-center gap-2 pb-2 mb-2 border-b border-white/[0.06] overflow-x-auto">
            {attachedImages.map((img, idx) => (
              <div
                key={idx}
                className="relative h-14 w-14 rounded-lg border border-white/[0.12] overflow-hidden flex-shrink-0 group"
              >
                <img src={img} alt="attached" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => onRemoveImage(idx)}
                  className="absolute top-1 right-1 rounded-full bg-black/80 p-0.5 text-zinc-300 hover:text-white hover:bg-rose-600 transition-colors"
                  aria-label="إزالة الصورة"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Text Area */}
        <textarea
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (canSubmit) onSendMessage();
            }
          }}
          rows={2}
          placeholder="اكتب استفسارك أو أمرك التشغيلي (Enter للإرسال)..."
          className="w-full bg-transparent text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none resize-none leading-relaxed min-h-[44px] max-h-32"
        />

        {/* Bottom Control Toolbar */}
        <div className="flex items-center justify-between pt-1.5 border-t border-white/[0.04]">
          <div className="flex items-center gap-1.5">
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
              className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded-md hover:bg-white/[0.06] transition-colors"
              title="إرفاق صورة أو لقطة شاشة"
              aria-label="إرفاق صورة أو لقطة شاشة"
            >
              <Paperclip className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">إرفاق</span>
            </button>

            <span className="font-mono text-[9px] text-zinc-400 bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.5 rounded">
              DeepSeek-V3
            </span>
          </div>

          <button
            type="button"
            onClick={onSendMessage}
            disabled={!canSubmit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-xs shadow-sm transition-all duration-150 active:scale-[0.96] disabled:opacity-30 disabled:pointer-events-none"
            aria-label="إرسال الطلب"
          >
            <span>إرسال</span>
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Telemetry and Shortcuts Bar */}
      <div className="flex items-center justify-between text-[10px] text-zinc-400 px-1 pt-1 font-mono">
        <span className="font-sans flex items-center gap-1">
          <span>اختصار:</span>
          <kbd className="rounded border border-white/[0.08] bg-white/[0.04] px-1 py-0.5 text-zinc-400 font-mono text-[9px]">
            Ctrl + J
          </kbd>
        </span>

        {telemetry && (
          <span className="tabular-nums flex items-center gap-1.5">
            <span>{telemetry.model || 'DeepSeek-V3'}</span>
            <span>·</span>
            <span>{telemetry.latency_ms}ms</span>
          </span>
        )}
      </div>
    </footer>
  );
};
