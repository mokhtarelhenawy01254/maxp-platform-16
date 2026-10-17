import React from "react";
import { useTranslation } from "react-i18next";
import { ShoppingBag } from "lucide-react";

export interface CartItem {
  name?: string;
  productName?: string;
  title?: string;
  quantity?: number;
  price?: number | string;
  total?: number | string;
}

interface IncompleteCartItemsCardProps {
  items?: CartItem[];
  cartId: string;
  total?: number;
  formatPrice: (price: number) => string;
}

export const IncompleteCartItemsCard: React.FC<IncompleteCartItemsCardProps> = ({
  items,
  cartId,
  total,
  formatPrice,
}) => {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl border border-border/70 bg-card p-5 shadow-xs lg:col-span-2">
      <div className="flex items-center gap-2 mb-3.5">
        <ShoppingBag className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-bold text-foreground">
          {t("orders.incompleteItems") || "منتجات السلة المتروكة"}
        </h2>
      </div>

      <div className="space-y-2.5">
        {items?.length ? (
          <>
            {items.map((item, index) => {
              const name =
                item.name || item.productName || item.title || t("orders.notSpecified") || "منتج";
              const quantity = item.quantity ?? 1;
              const price = Number(item.price ?? item.total ?? 0) || 0;
              const lineTotal = quantity * price;

              return (
                <div
                  key={`${cartId}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs text-foreground transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-foreground truncate">{name}</div>
                    <div className="text-[11px] font-mono tabular-nums text-muted-foreground mt-0.5">
                      {quantity} × {formatPrice(price)}
                    </div>
                  </div>
                  <div className="text-xs font-mono tabular-nums font-bold text-foreground shrink-0">
                    {formatPrice(lineTotal)}
                  </div>
                </div>
              );
            })}

            <div className="flex items-center justify-between border-t border-border/70 pt-3 text-xs font-bold text-foreground">
              <span>{t("orders.total") || "الإجمالي"}</span>
              <span className="font-mono tabular-nums text-sm text-primary">
                {formatPrice(total || 0)}
              </span>
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-dashed border-border/70 p-6 text-center text-xs text-muted-foreground">
            {t("orders.incompleteNoDetails") || "لا توجد تفاصيل للمنتجات في هذه السلة"}
          </div>
        )}
      </div>
    </div>
  );
};
