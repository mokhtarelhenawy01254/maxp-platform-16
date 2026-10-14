import React from "react";
import {
  TikTokShopOrder,
  TikTokShopProduct,
} from "../../services/tiktokShopService";

interface TikTokShopTablesProps {
  orders: TikTokShopOrder[];
  products: TikTokShopProduct[];
  formatDate: (value: string | null) => string;
  formatAmount: (value: number) => string;
}

export const TikTokShopTables: React.FC<TikTokShopTablesProps> = ({
  orders,
  products,
  formatDate,
  formatAmount,
}) => {
  return (
    <div className="space-y-6">
      {/* Orders table */}
      {orders.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border/70 bg-card">
          <div className="border-b border-border/70 px-4 py-3 bg-muted/20 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              سجل طلبات TikTok المتزامنة
            </h3>
            <span className="text-[11px] font-mono tabular-nums text-muted-foreground">{orders.length} طلب</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-muted/30 text-muted-foreground text-[11px] font-medium border-b border-border/70">
                <tr>
                  <th className="px-4 py-2.5">معرف الطلب</th>
                  <th className="px-4 py-2.5">الحالة</th>
                  <th className="px-4 py-2.5">المشتري</th>
                  <th className="px-4 py-2.5">الإجمالي</th>
                  <th className="px-4 py-2.5">العملة</th>
                  <th className="px-4 py-2.5">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {orders.map((order) => (
                  <tr key={order.orderId} className="hover:bg-muted/25 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-foreground">{order.orderId}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-muted/40 text-foreground border border-border/70">
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-foreground">
                      {order.buyerName || order.buyerUsername || "—"}
                    </td>
                    <td className="px-4 py-2.5 font-mono tabular-nums font-semibold text-foreground">
                      {formatAmount(order.totalAmount)}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-muted-foreground">{order.currency}</td>
                    <td className="px-4 py-2.5 font-mono tabular-nums text-muted-foreground">
                      {formatDate(order.createTime)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Products table */}
      {products.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border/70 bg-card">
          <div className="border-b border-border/70 px-4 py-3 bg-muted/20 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              كتالوج المنتجات المعروضة على تيك توك
            </h3>
            <span className="text-[11px] font-mono tabular-nums text-muted-foreground">{products.length} منتج</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-muted/30 text-muted-foreground text-[11px] font-medium border-b border-border/70">
                <tr>
                  <th className="px-4 py-2.5">المعرف</th>
                  <th className="px-4 py-2.5">الاسم</th>
                  <th className="px-4 py-2.5">الحالة</th>
                  <th className="px-4 py-2.5">عدد الـ SKU</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {products.map((product) => (
                  <tr key={product.productId} className="hover:bg-muted/25 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-muted-foreground">{product.productId}</td>
                    <td className="px-4 py-2.5 text-foreground font-medium">{product.title}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        {product.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono tabular-nums text-foreground">{product.skuCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
export default TikTokShopTables;
