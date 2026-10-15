import React from "react";
import { useTranslation } from "react-i18next";
import {
  Trash2,
  X,
  EyeOff,
  Eye,
  Layers,
  Box,
} from "lucide-react";

interface ProductsBulkBarProps {
  selectedCount: number;
  onDelete: () => void;
  onClear: () => void;
  onHide: () => void;
  onUnhide: () => void;
  onConvertToPresentations: () => void;
  onEnableTrack?: () => void;
  onDisableTrack?: () => void;
}

const ProductsBulkBar: React.FC<ProductsBulkBarProps> = ({
  selectedCount,
  onDelete,
  onClear,
  onHide,
  onUnhide,
  onConvertToPresentations,
  onEnableTrack,
  onDisableTrack,
}) => {
  const { i18n } = useTranslation();
  const isEn = Boolean(i18n.language && i18n.language.startsWith("en"));

  if (selectedCount === 0) return null;

  return (
    <div className="bg-card border border-primary/40 rounded-xl p-2.5 sm:p-3 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 animate-slide-up">
      {/* Selection Counter */}
      <div className="flex items-center justify-between sm:justify-start gap-2">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 text-xs font-semibold">
          {isEn ? (
            <>
              <span className="font-mono tabular-nums px-1.5 py-0.5 bg-primary/15 rounded">
                {selectedCount}
              </span>
              <span>{selectedCount === 1 ? "product selected" : "products selected"}</span>
            </>
          ) : (
            <>
              <span>تم تحديد</span>
              <span className="font-mono tabular-nums px-1.5 py-0.5 bg-primary/15 rounded">
                {selectedCount}
              </span>
              <span>منتج</span>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={onClear}
          className="sm:hidden inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted rounded-lg border border-border/60"
        >
          <X className="h-3.5 w-3.5" />
          <span>{isEn ? "Cancel" : "إلغاء"}</span>
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-0.5 pt-0.5 sm:pb-0">
        <button
          type="button"
          onClick={onConvertToPresentations}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition-all shadow-xs shrink-0 active:scale-[0.98]"
        >
          <Layers className="h-3.5 w-3.5" />
          <span>{isEn ? "Presentations" : "حوّل لعروض"}</span>
        </button>

        {onEnableTrack && (
          <button
            type="button"
            onClick={onEnableTrack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold transition-all shadow-xs shrink-0 active:scale-[0.98]"
            title={isEn ? "Enable stock tracking" : "تفعيل تتبع المخزون"}
          >
            <Box className="h-3.5 w-3.5" />
            <span>{isEn ? "Enable Track" : "تفعيل التتبع"}</span>
          </button>
        )}

        {onDisableTrack && (
          <button
            type="button"
            onClick={onDisableTrack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground border border-border/70 rounded-lg text-xs font-semibold transition-all shadow-xs shrink-0 active:scale-[0.98]"
            title={isEn ? "Disable stock tracking" : "إيقاف تتبع المخزون"}
          >
            <Box className="h-3.5 w-3.5 opacity-60" />
            <span>{isEn ? "Disable Track" : "إيقاف التتبع"}</span>
          </button>
        )}

        <button
          type="button"
          onClick={onHide}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition-all shadow-xs shrink-0 active:scale-[0.98]"
        >
          <EyeOff className="h-3.5 w-3.5" />
          <span>{isEn ? "Hide" : "إخفاء"}</span>
        </button>

        <button
          type="button"
          onClick={onUnhide}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-all shadow-xs shrink-0 active:scale-[0.98]"
        >
          <Eye className="h-3.5 w-3.5" />
          <span>{isEn ? "Show" : "إظهار"}</span>
        </button>

        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-lg text-xs font-semibold transition-all shadow-xs shrink-0 active:scale-[0.98]"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>{isEn ? "Delete" : "حذف"}</span>
        </button>

        <button
          type="button"
          onClick={onClear}
          className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 bg-muted hover:bg-muted/80 text-foreground border border-border/70 rounded-lg text-xs font-semibold transition-all shadow-xs shrink-0 active:scale-[0.98]"
        >
          <X className="h-3.5 w-3.5" />
          <span>{isEn ? "Clear" : "إلغاء التحديد"}</span>
        </button>
      </div>
    </div>
  );
};

export default ProductsBulkBar;
