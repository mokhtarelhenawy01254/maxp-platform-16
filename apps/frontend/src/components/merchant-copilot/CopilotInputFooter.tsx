import React, { useRef } from 'react';
import { ArrowUp, Paperclip, Undo2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    <footer className="px-3 sm:px-4 pb-3.5 pt-1 bg-card border-t border-border/60 text-foreground">
      {/* Seamless Input Chassis */}
      <div className="rounded-xl border border-border/70 bg-muted/20 focus-within:border-primary/80 focus-within:bg-card focus-within:ring-1 focus-within:ring-primary/20 p-2.5 sm:p-3 shadow-2xs transition-all">
        {/* Attached Images Carousel/Thumbnails */}
        {attachedImages.length > 0 && (
          <div className="flex items-center gap-2 pb-2 mb-2 border-b border-border/50 overflow-x-auto no-scrollbar">
            {attachedImages.map((img, idx) => (
              <div
                key={idx}
                className="relative size-13 rounded-lg border border-border/70 overflow-hidden shrink-0 group shadow-2xs"
              >
                <img src={img} alt="attached" className="size-full object-cover" />
                <button
                  type="button"
                  onClick={() => onRemoveImage(idx)}
                  className="absolute top-1 right-1 rounded-full bg-black/70 p-0.5 text-white hover:bg-destructive transition-colors"
                  aria-label="إزالة الصورة"
                >
                  <X className="size-3" />
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
          className="w-full bg-transparent text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none resize-none leading-relaxed min-h-[44px] max-h-32"
        />

        {/* Bottom Control Toolbar */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
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
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted transition-colors cursor-pointer"
              title="إرفاق صورة أو لقطة شاشة"
              aria-label="إرفاق صورة أو لقطة شاشة"
            >
              <Paperclip className="size-3.5" />
              <span className="hidden sm:inline">إرفاق صورة</span>
            </button>

            {onRewind && (
              <button
                type="button"
                onClick={onRewind}
                disabled={!canRewind}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                title="تراجع عن آخر خطوة (Undo)"
                aria-label="تراجع عن آخر خطوة"
              >
                <Undo2 className="size-3.5" />
                <span className="hidden sm:inline">تراجع</span>
              </button>
            )}

            {telemetry?.model && (
              <span className="font-mono text-[9px] text-muted-foreground bg-muted border border-border/60 px-1.5 py-0.5 rounded-md tabular-nums">
                {telemetry.model}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => onSendMessage()}
            disabled={!canSubmit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 active:scale-[0.98] text-primary-foreground font-semibold text-xs shadow-2xs transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            aria-label="إرسال الطلب"
          >
            <span>إرسال</span>
            <ArrowUp className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Telemetry and Shortcuts Bar */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1 pt-1.5 font-mono tabular-nums">
        <span className="font-sans flex items-center gap-1 text-[10px]">
          <kbd className="rounded border border-border/60 bg-muted px-1 py-0.5 font-mono text-[9px] text-foreground">
            Enter
          </kbd>
          <span>إرسال</span>
          <span className="text-border">·</span>
          <kbd className="rounded border border-border/60 bg-muted px-1 py-0.5 font-mono text-[9px] text-foreground">
            Ctrl+J
          </kbd>
          <span>المساعد</span>
        </span>

        {telemetry && (
          <span className="flex items-center gap-1 text-muted-foreground">
            {telemetry.model && <span>{telemetry.model}</span>}
            {telemetry.model && telemetry.latency_ms ? <span>·</span> : null}
            {telemetry.latency_ms ? <span>{telemetry.latency_ms}ms</span> : null}
          </span>
        )}
      </div>
    </footer>
  );
};

export default CopilotInputFooter;
