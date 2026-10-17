import React, { useState } from "react";
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Percent,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { OrderDetailsType } from "../types";

interface OrderDiscountApprovalBannerProps {
  order: OrderDetailsType;
  onApprove: () => Promise<void> | void;
  onReject: (reason?: string) => Promise<void> | void;
  loading?: boolean;
}

export const OrderDiscountApprovalBanner: React.FC<OrderDiscountApprovalBannerProps> = ({
  order,
  onApprove,
  onReject,
  loading = false,
}) => {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [actionInProgress, setActionInProgress] = useState<"APPROVE" | "REJECT" | null>(null);

  const discountApprovalStatus =
    order.discountApprovalStatus ||
    (order.metadata as any)?.discountApprovalStatus ||
    null;

  const discountAmount = Number(order.discount || 0);
  const discountReason =
    order.discountReason ||
    (order.metadata as any)?.discountReason ||
    "كوبون أو عرض ترويجي";

  // If no approval is needed and no explicit status, don't render anything
  if (!discountApprovalStatus && !order.needsDiscountApproval) {
    return null;
  }

  const handleApproveClick = async () => {
    try {
      setActionInProgress("APPROVE");
      await onApprove();
    } finally {
      setActionInProgress(null);
    }
  };

  const handleConfirmReject = async () => {
    try {
      setActionInProgress("REJECT");
      await onReject(rejectReason.trim() || undefined);
      setShowRejectModal(false);
      setRejectReason("");
    } finally {
      setActionInProgress(null);
    }
  };

  // 1. Pending Approval State
  if (discountApprovalStatus === "PENDING_APPROVAL" || order.needsDiscountApproval) {
    return (
      <>
        <div
          dir="rtl"
          className="rounded-xl border border-amber-500/30 bg-amber-500/[0.04] p-3.5 sm:p-4 text-card-foreground shadow-none"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
            {/* Context Info */}
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 shrink-0 text-amber-700 dark:text-amber-300 mt-0.5 sm:mt-0">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-xs font-semibold text-amber-900 dark:text-amber-100">
                    خصم بانتظار اعتماد الإدارة
                  </h4>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[11px] font-medium tabular-nums bg-amber-500/10 text-amber-800 dark:text-amber-200 border border-amber-500/30">
                    <Percent className="w-3 h-3" />
                    <span>{discountAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span> {order.currency || "ج.م"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  السبب: <span className="font-medium text-foreground">{discountReason}</span>. لا يمكن تأكيد هذا الطلب أو تجهيزه أو شحنه قبل الاعتماد أو الرفض.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={handleApproveClick}
                disabled={loading || actionInProgress !== null}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition-all duration-150 active:scale-[0.98] disabled:opacity-50"
              >
                {actionInProgress === "APPROVE" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>اعتماد الخصم</span>
              </button>

              <button
                type="button"
                onClick={() => setShowRejectModal(true)}
                disabled={loading || actionInProgress !== null}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-medium transition-all duration-150 active:scale-[0.98] disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>رفض وإلغاء الخصم</span>
              </button>
            </div>
          </div>
        </div>

        {/* Confirmation Modal for Reject */}
        {showRejectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
            <div
              dir="rtl"
              className="w-full max-w-md bg-card border border-border/70 rounded-xl p-5 shadow-2xl text-card-foreground space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
                <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">
                  تأكيد رفض وإلغاء الخصم
                </h3>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                سيتم إلغاء قيمة الخصم (<span className="font-mono font-semibold tabular-nums text-rose-600 dark:text-rose-400">{discountAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} {order.currency || "ج.م"}</span>) وإعادة احتساب إجمالي الطلب بدون خصم ليصبح قابلاً للتأكيد.
              </p>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  سبب الرفض (اختياري)
                </label>
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="مثال: الكوبون غير مخصص لهذا المنتج"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-border/70 bg-background text-foreground outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  disabled={actionInProgress !== null}
                  className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
                >
                  تراجع
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  disabled={actionInProgress !== null}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {actionInProgress === "REJECT" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5" />
                  )}
                  <span>تأكيد الرفض والإلغاء</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // 2. Approved State
  if (discountApprovalStatus === "APPROVED") {
    const approvedBy =
      order.discountApprovedBy ||
      (order.metadata as any)?.discountApprovedBy ||
      "الإدارة";

    return (
      <div
        dir="rtl"
        className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-300 shadow-none"
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>
            تم اعتماد هذا الخصم (<span className="font-mono font-semibold tabular-nums">-{discountAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} {order.currency || "ج.م"}</span>) بواسطة <span className="font-medium text-foreground">{approvedBy}</span>
          </span>
        </div>
      </div>
    );
  }

  // 3. Rejected State
  if (discountApprovalStatus === "REJECTED") {
    const rejectedBy =
      order.discountRejectedBy ||
      (order.metadata as any)?.discountRejectedBy ||
      "الإدارة";
    const rejectionReason =
      order.discountRejectionReason ||
      (order.metadata as any)?.discountRejectionReason ||
      null;

    return (
      <div
        dir="rtl"
        className="rounded-xl border border-border/70 bg-muted/30 px-4 py-2 flex items-center justify-between text-xs text-muted-foreground shadow-none"
      >
        <div className="flex items-center gap-2">
          <XCircle className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span>
            تم رفض الخصم وإلغاؤه من هذا الطلب بواسطة <span className="font-medium text-foreground">{rejectedBy}</span>
            {rejectionReason && (
              <span className="text-muted-foreground"> ({rejectionReason})</span>
            )}
          </span>
        </div>
      </div>
    );
  }

  return null;
};

export default OrderDiscountApprovalBanner;
