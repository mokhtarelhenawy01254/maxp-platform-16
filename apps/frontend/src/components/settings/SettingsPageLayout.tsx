import React from "react";
import { RotateCcw, Check, Loader2 } from "lucide-react";

interface SettingsPageLayoutProps {
  title: string;
  description?: string;
  loading: boolean;
  saving: boolean;
  onSave: () => void;
  onReset: () => void;
  children: React.ReactNode;
  fullWidth?: boolean;
}

export const SettingsPageLayout: React.FC<SettingsPageLayoutProps> = ({
  title,
  description,
  loading,
  saving,
  onSave,
  onReset,
  children,
  fullWidth = false,
}) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] gap-2.5">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground font-mono">جاري تحميل الإعدادات...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-foreground">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-foreground tracking-tight">
            {title}
          </h2>
          {description && (
            <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
              {description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={onReset}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border/70 text-xs font-medium rounded-lg text-muted-foreground bg-card hover:bg-muted/40 hover:text-foreground active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>إعادة تعيين</span>
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-lg text-primary-foreground bg-primary hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 shadow-xs"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>حفظ التغييرات</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className={fullWidth ? "w-full" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"}>
        {children}
      </div>
    </div>
  );
};

export default SettingsPageLayout;
