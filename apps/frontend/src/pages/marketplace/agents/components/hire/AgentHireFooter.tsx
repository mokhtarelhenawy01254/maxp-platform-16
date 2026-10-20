import React from "react";
import { Loader2, Check } from "lucide-react";

interface AgentHireFooterProps {
  loading: boolean;
  isPro: boolean;
  hasEnoughBalance: boolean;
  onClose: () => void;
  onConfirmHire: () => void;
}

export const AgentHireFooter: React.FC<AgentHireFooterProps> = ({
  loading,
  isPro,
  hasEnoughBalance,
  onClose,
  onConfirmHire,
}) => {
  return (
    <div className="flex items-center justify-end gap-3 pt-2 border-t border-border/60">
      <button
        type="button"
        onClick={onClose}
        disabled={loading}
        className="h-9 px-4 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted active:scale-[0.97] transition-all"
      >
        إلغاء
      </button>

      <button
        type="button"
        onClick={onConfirmHire}
        disabled={loading || (isPro && !hasEnoughBalance)}
        className="flex items-center justify-center gap-2 h-9 px-5 rounded-lg bg-primary text-xs font-bold text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="size-3.5 animate-spin" />
            <span>جاري التعيين…</span>
          </>
        ) : isPro && !hasEnoughBalance ? (
          <span>اشحن المحفظة للمتابعة</span>
        ) : (
          <>
            <Check className="size-3.5 stroke-[2]" />
            <span>تأكيد تعيين الإيجنت</span>
          </>
        )}
      </button>
    </div>
  );
};
