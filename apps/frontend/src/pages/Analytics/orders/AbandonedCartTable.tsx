import React from "react";
import { Link } from "react-router-dom";
import {
  ShoppingCart,
  CheckCircle,
  Phone,
  MessageSquare,
  Eye,
  Download,
  Search,
  ExternalLink,
  Flame,
  Clock,
} from "lucide-react";
import { useCurrency } from "../../../hooks/useCurrency";
import {
  CartItem,
  ConvertedCartItem,
  FilterType,
} from "./abandonedCartTypes";

interface AbandonedCartTableProps {
  activeTab: "abandoned" | "recovered";
  onTabChange: (tab: "abandoned" | "recovered") => void;
  filter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  abandonedCarts: CartItem[];
  convertedCarts: ConvertedCartItem[];
  onSelectCart: (cart: CartItem) => void;
  onWhatsApp: (cart: CartItem) => void;
  cleanPhone: (phone?: string | null) => string;
  onExportCSV: () => void;
}

export const AbandonedCartTable: React.FC<AbandonedCartTableProps> = ({
  activeTab,
  onTabChange,
  filter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  abandonedCarts,
  convertedCarts,
  onSelectCart,
  onWhatsApp,
  cleanPhone,
  onExportCSV,
}) => {
  const { formatPrice } = useCurrency();

  return (
    <div className="rounded-lg border border-border/70 bg-card shadow-none overflow-hidden">
      {/* Header with Tabs & Search */}
      <div className="p-3 border-b border-border/70 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="inline-flex rounded-md bg-muted p-0.5">
            <button
              type="button"
              onClick={() => onTabChange("abandoned")}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                activeTab === "abandoned"
                  ? "bg-card shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              السلات المتروكة ({abandonedCarts.length})
            </button>
            <button
              type="button"
              onClick={() => onTabChange("recovered")}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${
                activeTab === "recovered"
                  ? "bg-card shadow-sm text-emerald-600 dark:text-emerald-400 font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CheckCircle className="h-3.5 w-3.5" />
              تم استرجاعها ({convertedCarts.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === "abandoned" && abandonedCarts.length > 0 && (
              <button
                type="button"
                onClick={onExportCSV}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border border-border/70 rounded-md hover:bg-muted text-foreground transition-colors"
              >
                <Download className="h-3.5 w-3.5 text-muted-foreground" />
                تصدير CSV
              </button>
            )}
          </div>
        </div>

        {/* Filters and Search Bar */}
        {activeTab === "abandoned" && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 max-w-full">
              {(
                [
                  { id: "all", label: "الكل" },
                  { id: "with_phone", label: "برقم هاتف" },
                  { id: "fresh", label: "فرصة ذهبية" },
                  { id: "active", label: "سلة نشطة" },
                  { id: "expired", label: "منتهية" },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => onFilterChange(f.id)}
                  className={`px-2.5 py-1 text-xs rounded transition-colors shrink-0 font-medium ${
                    filter === f.id
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-60">
              <Search className="h-3.5 w-3.5 text-muted-foreground absolute right-2.5 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="بحث بالاسم أو الهاتف أو السلة..."
                className="w-full text-xs rounded-md border border-border/70 bg-background py-1.5 pr-8 pl-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
        )}
      </div>

      {/* Tab 1: Abandoned Carts Table */}
      {activeTab === "abandoned" && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead>
              <tr className="border-b border-border/70 bg-muted/30 text-muted-foreground text-[11px] font-semibold">
                <th className="py-2.5 px-3">العميل</th>
                <th className="py-2.5 px-3">المنتجات</th>
                <th className="py-2.5 px-3">قيمة السلة</th>
                <th className="py-2.5 px-3">الأولوية</th>
                <th className="py-2.5 px-3">آخر تحديث</th>
                <th className="py-2.5 px-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-mono tabular-nums">
              {abandonedCarts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground font-sans">
                    <ShoppingCart className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                    لا توجد سلات متروكة مطابقة للمعايير المحددة.
                  </td>
                </tr>
              ) : (
                abandonedCarts.map((cart) => {
                  const isFresh = cart.urgencyTier === "fresh";
                  const isActive = cart.urgencyTier === "active";
                  return (
                    <tr key={cart.id || cart.cartId} className="hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 px-3 font-sans">
                        <div className="font-semibold text-foreground">
                          {cart.customerName || <span className="text-muted-foreground font-normal">عميل زائر</span>}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] font-mono text-muted-foreground">
                          {cart.customerPhone ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold" dir="ltr">
                              {cart.customerPhone}
                            </span>
                          ) : (
                            <span>بدون هاتف</span>
                          )}
                          {cart.governorate && <span>• {cart.governorate}</span>}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 font-sans">
                        <button
                          type="button"
                          onClick={() => onSelectCart(cart)}
                          className="text-right hover:text-primary transition-colors"
                        >
                          <div className="font-medium text-foreground">
                            {cart.itemsCount} {cart.itemsCount === 1 ? "منتج" : "منتجات"}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate max-w-[180px]">
                            {cart.items.map((i) => i.name).join("، ") || "تفاصيل السلة"}
                          </div>
                        </button>
                      </td>

                      <td className="py-2.5 px-3 font-bold text-foreground">
                        {formatPrice(cart.cartValue)}
                      </td>

                      <td className="py-2.5 px-3 font-sans">
                        {isFresh && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <Flame className="h-3 w-3" /> فرصة ذهبية
                          </span>
                        )}
                        {isActive && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            <Clock className="h-3 w-3" /> سلة نشطة
                          </span>
                        )}
                        {!isFresh && !isActive && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                            منتهية
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-[11px] text-muted-foreground font-mono">
                        {new Date(cart.lastUpdated).toLocaleDateString("ar-EG", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="flex items-center justify-center gap-1.5">
                          {cart.hasPhone && (
                            <>
                              <button
                                type="button"
                                onClick={() => onWhatsApp(cart)}
                                title="تواصل عبر واتساب"
                                className="p-1 rounded text-emerald-600 hover:bg-emerald-500/10 transition-colors"
                              >
                                <MessageSquare className="h-3.5 w-3.5" />
                              </button>
                              <a
                                href={`tel:${cleanPhone(cart.customerPhone)}`}
                                title="اتصال هاتفي"
                                className="p-1 rounded text-blue-600 hover:bg-blue-500/10 transition-colors"
                              >
                                <Phone className="h-3.5 w-3.5" />
                              </a>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => onSelectCart(cart)}
                            title="عرض السلة"
                            className="p-1 rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Recovered Carts Table */}
      {activeTab === "recovered" && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead>
              <tr className="border-b border-border/70 bg-muted/30 text-muted-foreground text-[11px] font-semibold">
                <th className="py-2.5 px-3">رقم الطلب المسترد</th>
                <th className="py-2.5 px-3">قيمة الطلب</th>
                <th className="py-2.5 px-3">المسؤول / القناة</th>
                <th className="py-2.5 px-3">المحافظة</th>
                <th className="py-2.5 px-3">تاريخ الاسترجاع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-mono tabular-nums">
              {convertedCarts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground font-sans">
                    <CheckCircle className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                    لا توجد سلات مسترجعة مسجلة في هذه الفترة.
                  </td>
                </tr>
              ) : (
                convertedCarts.map((conv) => (
                  <tr key={conv.id || conv.cartId} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3 font-sans">
                      {conv.orderNumber ? (
                        <Link
                          to="/orders"
                          className="font-mono font-bold text-primary hover:underline inline-flex items-center gap-1"
                        >
                          {conv.orderNumber}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      ) : (
                        <span className="font-medium text-foreground">تم التحويل</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-emerald-600 dark:text-emerald-400">
                      {formatPrice(conv.cartValue)}
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {conv.employeeName || (conv.channel === "natural" ? "تحويل ذاتي" : "إدارة المتجر")}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-sans text-muted-foreground">
                      {conv.governorate || "غير محدد"}
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-muted-foreground font-mono">
                      {new Date(conv.convertedAt).toLocaleDateString("ar-EG", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AbandonedCartTable;
