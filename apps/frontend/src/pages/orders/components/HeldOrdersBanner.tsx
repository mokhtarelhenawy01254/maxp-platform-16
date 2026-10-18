import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPortal } from "react-dom";
import { format } from "date-fns";
import { AlertCircle, X, ExternalLink, CreditCard } from "lucide-react";
import { useAuth } from "../../../hooks/useAuthSimple";
import { apiClient } from "../../../services/apiClient";

export interface BillingHoldOrder {
  id: string | number;
  orderNumber: string;
  customerName?: string;
  customerPhone?: string;
  createdAt: string;
  billingHoldAmount?: number;
  holdReason: "wallet_insufficient" | "subscription_expired" | string;
  itemCount: number;
}

export const HELD_REASON_LABEL: Record<string, string> = {
  wallet_insufficient: "رصيد المحفظة غير كافٍ",
  subscription_expired: "انتهاء اشتراك الطلبات اليدوية",
};

export const HeldOrdersBanner: React.FC = () => {
  const { user } = useAuth();
  const [held, setHeld] = useState<{
    count: number;
    amount: number;
    subscriptionCount: number;
  } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [heldOrders, setHeldOrders] = useState<BillingHoldOrder[]>([]);
  const [heldTotal, setHeldTotal] = useState(0);
  const [loadingHeld, setLoadingHeld] = useState(false);

  const isAdmin = ["OWNER", "COMPANY_ADMIN", "SUPER_ADMIN", "MANAGER"].includes(
    user?.role || "",
  );

  useEffect(() => {
    if (!isAdmin) return;
    apiClient
      .get("/wallet/billing/summary")
      .then(
        (res: {
          data?: {
            data?: {
              heldOrders?: { count?: number; amount?: number; subscriptionCount?: number };
            };
          };
        }) => {
          const data = res?.data?.data;
          const count = Number(data?.heldOrders?.count || 0);
          if (count > 0) {
            setHeld({
              count,
              amount: Number(data?.heldOrders?.amount || 0),
              subscriptionCount: Number(data?.heldOrders?.subscriptionCount || 0),
            });
          }
        },
      )
      .catch(() => {
        /* Optional banner silently ignores error */
      });
  }, [isAdmin]);

  useEffect(() => {
    if (!modalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [modalOpen]);

  const openMoreInfo = async () => {
    setModalOpen(true);
    setLoadingHeld(true);
    try {
      const res = await apiClient.get("/orders-new/billing-holds");
      const data = (res as {
        data?: {
          data?: {
            orders?: BillingHoldOrder[];
            totalAmount?: number;
            subscriptionCount?: number;
          };
        };
      })?.data?.data;
      setHeldOrders(data?.orders || []);
      setHeldTotal(Number(data?.totalAmount || 0));
    } catch {
      setHeldOrders([]);
    } finally {
      setLoadingHeld(false);
    }
  };

  if (!held) return null;

  const modalContent = modalOpen && (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={() => setModalOpen(false)}
      />

      <div
        className="relative z-10 w-full max-w-2xl rounded-2xl border border-border/70 bg-card p-5 sm:p-6 shadow-2xl text-card-foreground animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between border-b border-border/50 pb-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <h3 className="text-base sm:text-lg font-bold text-foreground">
              الطلبات المعلّقة ({heldOrders.length})
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(false)}
            aria-label="إغلاق"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loadingHeld ? (
          <div className="py-8 text-center text-xs sm:text-sm text-muted-foreground">
            جاري التحميل...
          </div>
        ) : heldOrders.length === 0 ? (
          <div className="py-8 text-center text-xs sm:text-sm text-muted-foreground">
            لا توجد طلبات معلّقة.
          </div>
        ) : (
          <>
            <div className="mb-3 rounded-xl border border-border/70 bg-muted/40 p-3 text-xs sm:text-sm text-foreground">
              {heldTotal > 0 ? (
                <>
                  المبلغ المستحق الإجمالي:{" "}
                  <b className="font-bold font-mono tabular-nums text-foreground">
                    {heldTotal.toLocaleString("en-US", { maximumFractionDigits: 2 })} ج.م
                  </b>
                </>
              ) : (
                "لا توجد رسوم مستحقة — الطلبات معلّقة بسبب انتهاء الاشتراك."
              )}
            </div>

            <div className="max-h-96 space-y-2 overflow-y-auto pe-1">
              {heldOrders.map((o) => (
                <div
                  key={o.id}
                  className="rounded-xl border border-border/70 bg-background/80 p-3 shadow-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold font-mono tabular-nums text-foreground text-xs sm:text-sm">
                      {o.orderNumber}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        o.holdReason === "subscription_expired"
                          ? "bg-violet-500/10 text-violet-700 dark:text-violet-300"
                          : "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                      }`}
                    >
                      {HELD_REASON_LABEL[o.holdReason] || "معلّق"}
                    </span>
                  </div>

                  <div className="text-[11px] font-mono tabular-nums text-muted-foreground">
                    {format(new Date(o.createdAt), "dd/MM/yyyy HH:mm")} • عدد القطع: {o.itemCount}
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-foreground/80">
                    <span>العميل: {o.customerName || "-"}</span>
                    <span dir="ltr">الهاتف: {o.customerPhone || "-"}</span>
                  </div>

                  <div className="text-[11px] text-muted-foreground font-medium pt-1 border-t border-border/40">
                    {o.holdReason === "subscription_expired"
                      ? "معلّق حتى تجديد اشتراك الطلبات اليدوية"
                      : `رسوم الاستخدام المستحقة: ${(o.billingHoldAmount || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })} ج.م`}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-border/50">
              <Link
                to="/payments"
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs sm:text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-all active:scale-[0.98]"
              >
                <CreditCard className="h-4 w-4" />
                <span>شحن الرصيد / تجديد الاشتراك لإظهار الطلبات</span>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-900 dark:text-amber-200 shadow-xs">
        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <span className="font-bold text-xs sm:text-sm">
          لديك <span className="font-mono tabular-nums">{held.count}</span> طلب معلّق
          {held.subscriptionCount > 0 && held.subscriptionCount === held.count
            ? " بسبب انتهاء اشتراك الطلبات اليدوية"
            : held.subscriptionCount > 0
              ? " (رصيد + اشتراك)"
              : " بسبب انخفاض رصيد المحفظة"}
          .
        </span>
        <span className="text-xs sm:text-sm text-amber-800/90 dark:text-amber-300/90">
          {held.amount > 0 ? (
            <>
              المبلغ المستحق{" "}
              <span className="font-mono tabular-nums font-semibold">
                {held.amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}
              </span>{" "}
              ج.م —{" "}
            </>
          ) : (
            ""
          )}
          اشحن رصيدك أو جدّد اشتراكك ليُخصم المبلغ وتظهر الطلبات تلقائياً.
        </span>
        <button
          type="button"
          onClick={openMoreInfo}
          className="text-xs sm:text-sm font-bold underline underline-offset-4 hover:text-amber-950 dark:hover:text-amber-100 transition-colors cursor-pointer"
        >
          مزيد المعلومات
        </button>
        <Link
          to="/payments"
          className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold underline underline-offset-4 hover:text-amber-950 dark:hover:text-amber-100 transition-colors"
        >
          <span>شحن الرصيد</span>
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      {typeof document !== "undefined" && modalContent
        ? createPortal(modalContent, document.body)
        : modalContent}
    </>
  );
};

export default HeldOrdersBanner;
