import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArchiveX, RotateCcw, Trash2 } from "lucide-react";

interface ProductsTrashHeaderProps {
  productsCount: number;
  selectedCount: number;
  loading: boolean;
  onRestoreAll: () => void;
  onPermanentDeleteAll: () => void;
  onRefresh: () => void;
}

export const ProductsTrashHeader: React.FC<ProductsTrashHeaderProps> = ({
  productsCount,
  selectedCount,
  loading,
  onRestoreAll,
  onPermanentDeleteAll,
  onRefresh,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/70">
      <div className="flex items-center gap-3">
        <Link
          to="/products"
          className="p-2 rounded-xl border border-border/70 bg-card text-muted-foreground hover:text-foreground hover:bg-muted/40 active:scale-[0.96] transition-all cursor-pointer"
          title="العودة إلى المنتجات"
        >
          <ArrowRight className="h-4 w-4" />
        </Link>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              سلة المحذوفات
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted/40 text-muted-foreground border border-border/70 font-mono tabular-nums">
              <ArchiveX className="h-3.5 w-3.5 text-muted-foreground" />
              {productsCount} منتج
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            المنتجات المحذوفة مؤقتاً يمكنك استعادتها أو تفريغها نهائياً
          </p>
        </div>
      </div>

      {/* Bulk Actions */}
      <div className="flex items-center gap-2">
        {selectedCount > 0 && (
          <>
            <button
              type="button"
              onClick={onRestoreAll}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 active:scale-[0.97] transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>استعادة ({selectedCount})</span>
            </button>
            <button
              type="button"
              onClick={onPermanentDeleteAll}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 active:scale-[0.97] transition-all disabled:opacity-50 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>حذف نهائي ({selectedCount})</span>
            </button>
          </>
        )}

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center justify-center h-8 w-8 rounded-xl border border-border/70 bg-card text-muted-foreground hover:text-foreground hover:bg-muted/40 active:scale-[0.94] transition-all disabled:opacity-50 cursor-pointer"
          title="تحديث"
        >
          <RotateCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>
    </div>
  );
};
