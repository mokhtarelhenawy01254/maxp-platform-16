import React from "react";
import { Link } from "react-router-dom";
import {
  ShoppingCart,
  X,
  Phone,
  MessageSquare,
  Package,
} from "lucide-react";
import { useCurrency } from "../../../hooks/useCurrency";
import { CartItem } from "./abandonedCartTypes";

interface AbandonedCartDetailModalProps {
  selectedCart: CartItem | null;
  onClose: () => void;
  onWhatsApp: (cart: CartItem) => void;
  cleanPhone: (phone?: string | null) => string;
}

export const AbandonedCartDetailModal: React.FC<AbandonedCartDetailModalProps> = ({
  selectedCart,
  onClose,
  onWhatsApp,
  cleanPhone,
}) => {
  const { formatPrice } = useCurrency();
  if (!selectedCart) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm" dir="rtl">
      <div className="bg-card rounded-lg max-w-lg w-full p-4 sm:p-5 shadow-lg border border-border/70 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border/70 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10 text-primary">
              <ShoppingCart className="h-4 w-4" />
            </div>
            <h3 className="font-semibold text-sm text-foreground">
              تفاصيل السلة المتروكة ({selectedCart.cartId})
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Customer Summary */}
        <div className="p-3 rounded-md border border-border/70 bg-muted/20 space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">العميل:</span>
            <span className="font-medium text-foreground">
              {selectedCart.customerName || "عميل زائر"}
            </span>
          </div>
          {selectedCart.customerPhone && (
            <div className="flex justify-between font-mono tabular-nums">
              <span className="font-sans text-muted-foreground">الهاتف:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold" dir="ltr">
                {selectedCart.customerPhone}
              </span>
            </div>
          )}
          {selectedCart.governorate && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">المحافظة:</span>
              <span className="text-foreground">{selectedCart.governorate}</span>
            </div>
          )}
        </div>

        {/* Products List */}
        <div className="space-y-2">
          <h4 className="text-[11px] font-semibold text-muted-foreground">
            المنتجات داخل السلة ({selectedCart.items.length})
          </h4>
          <div className="divide-y divide-border/40 font-mono tabular-nums">
            {selectedCart.items.map((item, i) => (
              <div key={i} className="py-2 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0 font-sans">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-8 w-8 rounded object-cover border border-border/60 shrink-0"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-muted-foreground shrink-0 border border-border/60">
                      <Package className="h-4 w-4" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate max-w-[200px]">
                      {item.name}
                    </p>
                    <p className="font-mono text-[10px] text-muted-foreground tabular-nums">
                      {item.quantity} × {formatPrice(item.price)}
                    </p>
                  </div>
                </div>
                <span className="font-bold text-foreground shrink-0">
                  {formatPrice(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Total Footer */}
        <div className="pt-3 border-t border-border/70 flex items-center justify-between text-xs font-mono tabular-nums">
          <span className="font-sans font-medium text-foreground">إجمالي قيمة السلة:</span>
          <span className="font-bold text-rose-600 dark:text-rose-400 text-sm">
            {formatPrice(selectedCart.cartValue)}
          </span>
        </div>

        {/* Modal Actions */}
        <div className="pt-2 flex items-center gap-2">
          {selectedCart.hasPhone && (
            <>
              <button
                type="button"
                onClick={() => onWhatsApp(selectedCart)}
                className="flex-1 py-1.5 px-3 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                تواصل عبر واتساب
              </button>
              <a
                href={`tel:${cleanPhone(selectedCart.customerPhone)}`}
                className="py-1.5 px-3 rounded-md border border-border/70 bg-card hover:bg-muted text-foreground text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                اتصال
              </a>
            </>
          )}
          <Link
            to="/orders/incomplete"
            className="py-1.5 px-3 rounded-md border border-border/70 text-foreground text-xs font-medium flex items-center justify-center hover:bg-muted transition-colors"
          >
            فتح الورشة
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AbandonedCartDetailModal;
