import React, { useRef } from 'react';
import { ArrowUp, Paperclip, Undo2, X } from 'lucide-react';

interface CopilotInputFooterProps {
  inputValue: string;
  setInputValue: (val: string) => void;
  loading: boolean;
  attachedImages: string[];
  onRemoveImage: (index: number) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPasteImage?: (files: File[]) => void;
  onSendMessage: () => void;
  onRewind?: () => void;
  canRewind?: boolean;
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
  onPasteImage,
  onSendMessage,
  onRewind,
  canRewind = false,
  telemetry,
  inputRef,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canSubmit = !loading && (inputValue.trim().length > 0 || attachedImages.length > 0);

  return (
    <footer className="px-4 pb-4 pt-1 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-850">
      {/* Seamless Input Chassis */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/80 p-3 focus-within:border-indigo-500 dark:focus-within:border-indigo-400 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-2 focus-within:ring-indigo-500/20 shadow-2xs transition-all">
        {/* Attached Images Carousel/Thumbnails */}
        {attachedImages.length > 0 && (
          <div className="flex items-center gap-2 pb-2.5 mb-2.5 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
            {attachedImages.map((img, idx) => (
              <div
                key={idx}
                className="relative h-14 w-14 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden flex-shrink-0 group shadow-2xs"
              >
                <img src={img} alt="attached" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => onRemoveImage(idx)}
                  className="absolute top-1 right-1 rounded-full bg-slate-900/80 p-0.5 text-white hover:bg-rose-600 transition-colors"
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
          onPaste={(e) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            const imageFiles: File[] = [];
            for (let i = 0; i < items.length; i++) {
              if (items[i].type.startsWith('image/')) {
                const f = items[i].getAsFile();
                if (f) imageFiles.push(f);
              }
            }
            if (imageFiles.length > 0) {
              e.preventDefault();
              onPasteImage?.(imageFiles);
            }
          }}
          rows={2}
          placeholder="اكتب استفسارك أو أمرك التشغيلي (Enter للإرسال)..."
          className="w-full bg-transparent text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none resize-none leading-relaxed min-h-[44px] max-h-32"
        />

        {/* Bottom Control Toolbar */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-800">
          <div className="flex items-center gap-2">
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
              className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 px-2 py-1 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
              title="إرفاق صورة أو لقطة شاشة"
              aria-label="إرفاق صورة أو لقطة شاشة"
            >
              <Paperclip className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">إرفاق صورة</span>
            </button>

            {onRewind && (
              <button
                type="button"
                onClick={onRewind}
                disabled={!canRewind}
                className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 px-2 py-1 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                title="تراجع عن آخر خطوة (Undo)"
                aria-label="تراجع عن آخر خطوة"
              >
                <Undo2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">تراجع</span>
              </button>
            )}

            {telemetry?.model && (
              <span className="font-mono text-[9px] text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-800 border border-slate-300/60 dark:border-slate-700/60 px-2 py-0.5 rounded-md">
                {telemetry.model}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => onSendMessage()}
            disabled={!canSubmit}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.97] text-white font-bold text-xs shadow-xs transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none"
            aria-label="إرسال الطلب"
          >
            <span>إرسال</span>
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Telemetry and Shortcuts Bar */}
      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 px-1 pt-1.5 font-mono">
        <span className="font-sans flex items-center gap-1.5 text-slate-400 dark:text-slate-500 text-[10px]">
          <kbd className="rounded border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 font-mono text-[9px] text-slate-600 dark:text-slate-300">
            Enter
          </kbd>
          <span>إرسال</span>
          <span className="text-slate-300 dark:text-slate-700">·</span>
          <kbd className="rounded border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-1 py-0.5 font-mono text-[9px] text-slate-600 dark:text-slate-300">
            Ctrl+J
          </kbd>
          <span>المساعد</span>
        </span>

        {telemetry && (
          <span className="tabular-nums flex items-center gap-1.5 text-slate-500">
            {telemetry.model && <span>{telemetry.model}</span>}
            {telemetry.model && telemetry.latency_ms ? <span>·</span> : null}
            {telemetry.latency_ms ? <span>{telemetry.latency_ms}ms</span> : null}
          </span>
        )}
      </div>
    </footer>
  );
};
