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
          className="rounded-xl border border-amber-300 dark:border-amber-800/70 bg-gradient-to-r from-amber-50 via-amber-50/70 to-amber-100/50 dark:from-amber-950/40 dark:via-amber-950/30 dark:to-amber-900/20 p-4 sm:p-5 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Context Info */}
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-lg bg-amber-500/10 dark:bg-amber-400/10 border border-amber-300/60 dark:border-amber-700/50 shrink-0 text-amber-700 dark:text-amber-300 mt-0.5 sm:mt-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-bold text-amber-900 dark:text-amber-100">
                    خصم بانتظار اعتماد الإدارة
                  </h4>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-200/80 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-300/80 dark:border-amber-700/60">
                    <Percent className="w-3 h-3" />
                    <span className="font-mono tabular-nums">{discountAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span> {order.currency || "ج.م"}
                  </span>
                </div>
                <p className="text-xs text-amber-800/90 dark:text-amber-200/80">
                  السبب: <span className="font-semibold text-amber-950 dark:text-amber-100">{discountReason}</span>. لا يمكن تأكيد هذا الطلب أو تجهيزه أو شحنه قبل الاعتماد أو الرفض.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={handleApproveClick}
                disabled={loading || actionInProgress !== null}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all duration-150 active:scale-[0.97] disabled:opacity-60 disabled:pointer-events-none"
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
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800/60 text-xs font-semibold shadow-sm transition-all duration-150 active:scale-[0.97] disabled:opacity-60 disabled:pointer-events-none"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>رفض وإلغاء الخصم</span>
              </button>
            </div>
          </div>
        </div>

        {/* Confirmation Modal for Reject */}
        {showRejectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div
              dir="rtl"
              className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
                <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/40">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  تأكيد رفض وإلغاء الخصم
                </h3>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                سيتم إلغاء قيمة الخصم (<span className="font-mono font-bold tabular-nums text-rose-600">{discountAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} {order.currency || "ج.م"}</span>) وإعادة احتساب إجمالي الطلب بدون خصم ليصبح قابلاً للتأكيد.
              </p>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  سبب الرفض (اختياري)
                </label>
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="مثال: الكوبون غير مخصص لهذا المنتج"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  disabled={actionInProgress !== null}
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                >
                  تراجع
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  disabled={actionInProgress !== null}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-60"
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
        className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/20 px-4 py-2.5 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 shadow-sm"
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>
            تم اعتماد هذا الخصم (<span className="font-mono font-bold tabular-nums">-{discountAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })} {order.currency || "ج.م"}</span>) بواسطة <span className="font-semibold">{approvedBy}</span>
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
        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50 px-4 py-2.5 flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 shadow-sm"
      >
        <div className="flex items-center gap-2">
          <XCircle className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
          <span>
            تم رفض الخصم وإلغاؤه من هذا الطلب بواسطة <span className="font-semibold">{rejectedBy}</span>
            {rejectionReason && (
              <span className="text-slate-500 dark:text-slate-400"> ({rejectionReason})</span>
            )}
          </span>
        </div>
      </div>
    );
  }

  return null;
};

export default OrderDiscountApprovalBanner;
