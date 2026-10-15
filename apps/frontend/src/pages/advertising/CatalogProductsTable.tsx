import React from 'react';
import { Package, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { FacebookCatalogProduct } from '../../services/facebookAdsService';

interface CatalogProductsTableProps {
  products: FacebookCatalogProduct[];
  selectedProducts: string[];
  onToggleProduct: (id: string) => void;
  syncAll: boolean;
}

export const CatalogProductsTable: React.FC<CatalogProductsTableProps> = ({
  products,
  selectedProducts,
  onToggleProduct,
  syncAll,
}) => {
  const getSyncStatusBadge = (status?: string) => {
    switch (status) {
      case "SUCCESS":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            متزامن
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2.5 py-0.5 text-[11px] font-semibold text-destructive border border-destructive/20">
            <AlertCircle className="w-3 h-3" />
            فشل المزامنة
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3 animate-spin" />
            جاري المزامنة
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted/40 px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground border border-border/70">
            غير متزامن
          </span>
        );
    }
  };

  if ((products || []).length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-border/70 rounded-2xl bg-card p-6">
        <Package className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
        <p className="text-xs text-muted-foreground">لا توجد منتجات مسجلة في هذا الكتالوج حالياً</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border/70 bg-card shadow-2xs">
      <table className="w-full text-xs">
        <thead className="bg-muted/40 border-b border-border/70 text-muted-foreground">
          <tr>
            {!syncAll && <th className="px-3 py-3 w-10 text-center">اختيار</th>}
            <th className="px-4 py-3 text-right font-semibold">المنتج</th>
            <th className="px-4 py-3 text-right font-semibold">السعر</th>
            <th className="px-4 py-3 text-right font-semibold">التوفر</th>
            <th className="px-4 py-3 text-right font-semibold">العلامة التجارية</th>
            <th className="px-4 py-3 text-center font-semibold">حالة المزامنة</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {products.map((product) => {
            const isSelected = selectedProducts.includes(product.id);

            return (
              <tr
                key={product.id}
                className={`hover:bg-muted/20 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}
              >
                {!syncAll && (
                  <td className="px-3 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleProduct(product.id)}
                      className="rounded border-border/80 text-primary focus:ring-0 cursor-pointer"
                    />
                  </td>
                )}
                <td className="px-4 py-3">
                  <div className="font-semibold text-foreground text-xs">{product.name}</div>
                  {product.id && (
                    <div className="font-mono text-[10px] text-muted-foreground mt-0.5" dir="ltr">
                      ID: {product.id}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 font-mono tabular-nums text-foreground">
                  {product.price} {product.currency || 'EGP'}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {product.availability === 'in stock' ? 'متوفر' : 'غير متوفر'}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {product.brand || '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  {getSyncStatusBadge(product.syncStatus)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
