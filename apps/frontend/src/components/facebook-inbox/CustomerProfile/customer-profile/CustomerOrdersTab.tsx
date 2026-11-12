import React from "react";
import { format } from "date-fns";
import { arSA } from "date-fns/locale";
import {
  ExternalLink,
  FileText,
  MapPin,
  MessageSquare,
  ShoppingBag,
  Star,
  User,
  Wrench,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { getStatusDisplay } from "../../../../utils/statusRegistry";
import { getOrderStatusTheme } from "./styles";
import { CustomerOrdersPhoneBanner } from "./CustomerOrdersPhoneBanner";
import { InboxConversation } from "../../../../types/inbox.types";

interface CustomerOrdersTabProps {
  orders: any[];
  customer: any;
  conversation: InboxConversation;
  editingPhone: boolean;
  phoneDraft: string;
  setPhoneDraft: (val: string) => void;
  savingPhone: boolean;
  phoneUpdateMessage: string | null;
  handleStartEditPhone: () => void;
  handleSavePhone: () => void;
  setEditingPhone: (val: boolean) => void;
  setPhoneUpdateMessage: (val: string | null) => void;
  searchOrderPhone: string;
  setSearchOrderPhone: (val: string) => void;
  loadCustomerData: (customerId: string, options?: any) => void;
  setPreviewOrder: (order: any) => void;
}

export const CustomerOrdersTab: React.FC<CustomerOrdersTabProps> = ({
  orders,
  customer,
  conversation,
  editingPhone,
  phoneDraft,
  setPhoneDraft,
  savingPhone,
  phoneUpdateMessage,
  handleStartEditPhone,
  handleSavePhone,
  setEditingPhone,
  setPhoneUpdateMessage,
  searchOrderPhone,
  setSearchOrderPhone,
  loadCustomerData,
  setPreviewOrder,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <CustomerOrdersPhoneBanner
        customer={customer}
        editingPhone={editingPhone}
        phoneDraft={phoneDraft}
        setPhoneDraft={setPhoneDraft}
        savingPhone={savingPhone}
        phoneUpdateMessage={phoneUpdateMessage}
        handleStartEditPhone={handleStartEditPhone}
        handleSavePhone={handleSavePhone}
        setEditingPhone={setEditingPhone}
        setPhoneUpdateMessage={setPhoneUpdateMessage}
      />

      {/* Orders Summary Header & Quick Phone Search */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            placeholder="بحث برقم هاتف عن طلبات سابقة..."
            className="flex-1 rounded-lg border border-border/60 bg-background px-2.5 py-1.5 text-xs tabular-nums text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            dir="ltr"
            value={searchOrderPhone}
            onChange={(e) => setSearchOrderPhone(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && searchOrderPhone.trim()) {
                loadCustomerData(customer?.id || "", {
                  conversationId: conversation?.id,
                  phone: searchOrderPhone.trim(),
                });
              }
            }}
          />
          <button
            type="button"
            onClick={() => {
              if (searchOrderPhone.trim()) {
                loadCustomerData(customer?.id || "", {
                  conversationId: conversation?.id,
                  phone: searchOrderPhone.trim(),
                });
              }
            }}
            className="rounded-lg border border-border/60 bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
          >
            بحث
          </button>
          {searchOrderPhone && (
            <button
              type="button"
              onClick={() => {
                setSearchOrderPhone("");
                loadCustomerData(conversation?.customerId || "", {
                  conversationId: conversation?.id,
                  phone:
                    conversation?.customerPhone ||
                    customer?.phone ||
                    undefined,
                });
              }}
              className="rounded-lg border border-border/60 bg-background px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="إعادة تعيين"
            >
              إلغاء
            </button>
          )}
        </div>

        {/* Customer Information Card (from phone lookup) */}
        {(customer?.name ||
          customer?.address ||
          customer?.governorate ||
          customer?.city ||
          customer?.customerRating) && (
          <div className="p-3 rounded-lg text-xs space-y-1.5 border border-border/50 bg-muted/20">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 font-bold text-sm text-foreground">
                <User size={15} className="text-primary shrink-0" />
                <span>{customer.name || conversation.customerName}</span>
              </div>
              {customer.customerRating && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                  <Star size={11} className="text-amber-500 fill-amber-500" />
                  {customer.customerRating}
                </span>
              )}
            </div>

            {(customer.governorate || customer.city || customer.address) && (
              <div className="flex items-start gap-1.5 text-muted-foreground">
                <MapPin size={13} className="text-primary shrink-0 mt-0.5" />
                <span className="leading-snug">
                  {[customer.governorate, customer.city, customer.address]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
            )}

            {customer.notes && (
              <div className="flex items-start gap-1.5 text-muted-foreground">
                <FileText size={13} className="text-amber-500 shrink-0 mt-0.5" />
                <span className="leading-snug">{customer.notes}</span>
              </div>
            )}
          </div>
        )}

        {orders.length > 0 && (
          <div className="p-2.5 rounded-lg border border-primary/20 bg-primary/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag size={16} className="text-primary" />
              <span className="font-semibold text-xs text-primary">
                سجل الطلبات
              </span>
            </div>
            <span className="bg-primary text-primary-foreground text-[11px] font-bold tabular-nums px-2 py-0.5 rounded-full">
              <span className="font-mono">{orders.length}</span>{" "}
              <span>طلب</span>
            </span>
          </div>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <ShoppingBag size={40} className="mx-auto mb-2 opacity-20" />
          <p className="text-xs">لا توجد طلبات سابقة لهذا الرقم</p>
        </div>
      ) : (
        orders.map((order) => {
          const isFromThisConv = Boolean(
            order.conversationId &&
              conversation?.id &&
              String(order.conversationId) === String(conversation.id),
          );
          const isServiceOrder =
            order.type === "SERVICE" || order.orderType === "SERVICE";

          return (
            <div
              key={order.id}
              className="p-3 rounded-lg border border-border/50 bg-muted/20 transition-colors space-y-2.5"
            >
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-bold text-sm font-mono tabular-nums text-foreground">
                      #{order.orderNumber}
                    </p>
                    {isServiceOrder && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/60">
                        <Wrench className="h-3 w-3" />
                        <span>طلب خدمة</span>
                      </span>
                    )}
                    {isFromThisConv && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        <MessageSquare className="h-3 w-3" />
                        <span>من هذه المحادثة</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5 text-muted-foreground">
                    {format(
                      new Date(order.createdAt),
                      "dd MMM yyyy - HH:mm",
                      { locale: arSA },
                    )}
                  </p>
                </div>
                <span
                  className="px-2 py-0.5 text-xs rounded-full shrink-0 font-medium"
                  style={getOrderStatusTheme(order.status)}
                >
                  {(() => {
                    const info = getStatusDisplay(order.status);
                    return t(info.labelKey) || info.label;
                  })()}
                </span>
              </div>

              {order.items && order.items.length > 0 && (
                <div className="pt-2 space-y-1.5 border-t border-dashed border-border/50">
                  {order.items.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center text-xs gap-2"
                    >
                      <span className="truncate font-medium flex-1 text-right text-foreground">
                        {item.quantity}× {item.productName || item.name}
                        {(item.productColor || item.productSize) && (
                          <span className="text-[11px] opacity-75 mr-1 font-normal">
                            (
                            {[item.productColor, item.productSize]
                              .filter(Boolean)
                              .join(" - ")}
                            )
                          </span>
                        )}
                      </span>
                      <span className="tabular-nums shrink-0 text-left font-medium text-foreground">
                        <span className="font-mono">
                          {(item.price * item.quantity).toLocaleString()}
                        </span>{" "}
                        <span>ج.م</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t border-border/50">
                <span className="text-xs font-medium text-muted-foreground">
                  الإجمالي:
                </span>
                <span className="font-bold text-sm tabular-nums text-primary">
                  <span className="font-mono">
                    {order.total?.toLocaleString() || 0}
                  </span>{" "}
                  <span>ج.م</span>
                </span>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPreviewOrder(order)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-primary/20 bg-primary/10 text-primary text-xs font-medium hover:bg-primary/15 transition-colors cursor-pointer"
                >
                  معاينة سريعة
                </button>
                <a
                  href={`/orders/${order.orderNumber || order.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border/60 bg-background text-foreground text-xs font-medium hover:bg-muted/50 transition-colors"
                >
                  <ExternalLink size={12} />
                  <span>صفحة الطلب</span>
                </a>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
