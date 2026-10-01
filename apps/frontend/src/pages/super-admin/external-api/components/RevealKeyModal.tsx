import React, { useState } from 'react';
import { Copy, Check, AlertTriangle, Key } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  apiKey: string | null;
  keyName: string;
  onClose: () => void;
}

export const RevealKeyModal: React.FC<Props> = ({ apiKey, keyName, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!apiKey) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      toast.success('تم نسخ مفتاح API إلى الحافظة بنجاح');
      setTimeout(() => setCopied(false), 3000);
    } catch (_err) {
      toast.error('تعذر النسخ التلقائي، يُرجى النسخ يدويًا');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl border border-border/80 bg-card p-6 shadow-2xl space-y-6 text-right">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border/60 pb-4">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Key className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">تم توليد مفتاح API بنجاح</h2>
            <p className="text-xs text-muted-foreground">{keyName}</p>
          </div>
        </div>

        {/* Severe Warning Notice */}
        <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 space-y-1.5 text-xs">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
            تحذير أمني إلزامي: احفظ المفتاح الآن
          </div>
          <p className="leading-relaxed">
            لن يتم عرض هذا المفتاح مرة أخرى نهائيًا لأسباب أمنية صارمة، حيث يتم تخزين صيغة مشفرة (Hash) فقط في قاعدة البيانات. في حال فقدانه ستحتاج لإنشاء مفتاح بديل.
          </p>
        </div>

        {/* API Key Box */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground">مفتاح الوصول السري (API Key)</label>
          <div className="flex items-center gap-2 p-2.5 rounded-xl border border-border bg-muted/30">
            <code className="flex-1 font-mono text-xs text-foreground select-all break-all text-left dir-ltr">
              {apiKey}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className={`p-2 rounded-lg transition active:scale-[0.97] shrink-0 flex items-center gap-1.5 text-xs font-semibold ${
                copied
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'bg-primary text-primary-foreground hover:opacity-90'
              }`}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>تم النسخ</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>نسخ</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Done Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-sm font-semibold rounded-xl bg-foreground text-background hover:opacity-90 transition active:scale-[0.98]"
          >
            لقد نسخت المفتاح وحفظته في مكان آمن
          </button>
        </div>
      </div>
    </div>
  );
};
