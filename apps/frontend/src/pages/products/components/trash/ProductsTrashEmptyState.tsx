import React from "react";
import { Link } from "react-router-dom";
import { ArchiveX, Package } from "lucide-react";

export const ProductsTrashEmptyState: React.FC = () => {
  return (
    <div className="bg-card border border-border/70 rounded-2xl p-12 text-center shadow-2xs">
      <div className="h-12 w-12 rounded-2xl bg-muted/40 flex items-center justify-center text-muted-foreground mx-auto mb-3 border border-border/60">
        <ArchiveX className="h-6 w-6" />
      </div>
      <h3 className="text-sm font-bold text-foreground mb-1">
        سلة المحذوفات فارغة
      </h3>
      <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
        لا توجد أي منتجات محذوفة حالياً. المنتجات التي تحذفها مؤقتاً تظهر هنا.
      </p>
      <Link
        to="/products"
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition-all shadow-2xs"
      >
        <Package className="h-3.5 w-3.5" />
        <span>العودة للمنتجات</span>
      </Link>
    </div>
  );
};
