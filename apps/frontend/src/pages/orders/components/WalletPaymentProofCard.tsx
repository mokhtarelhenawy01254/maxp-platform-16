import React from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, XCircle, Clock, Wallet } from "lucide-react";

export interface WalletPaymentProof {
  id?: string;
  status?: string;
  imageUrl?: string | null;
  walletNumber?: string | null;
  transferRef?: string | null;
  submittedAt?: string | null;
  rejectReason?: string | null;
}

export interface WalletPaymentProofCardProps {
  proof: WalletPaymentProof;
  onVerify: (action: "VERIFY" | "REJECT", reason?: string) => Promise<boolean>;
}

export const WalletPaymentProofCard: React.FC<WalletPaymentProofCardProps> = ({
  proof,
  onVerify,
}) => {
  const { t } = useTranslation();
  const status = String(proof.status || "PENDING").toUpperCase();

  const getStatusBadge = () => {
    switch (status) {
      case "VERIFIED":
        return {
          icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />,
          label: t("orders.verified", { defaultValue: "تم التحقق" }),
          cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
        };
      case "REJECTED":
        return {
          icon: <XCircle className="h-3.5 w-3.5 text-destructive" />,
          label: t("orders.rejected", { defaultValue: "مرفوض" }),
          cls: "bg-destructive/10 text-destructive border-destructive/20",
        };
      default:
        return {
          icon: <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />,
          label: t("orders.pendingReview", { defaultValue: "بانتظار المراجعة" }),
          cls: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
        };
    }
  };

  const badge = getStatusBadge();

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Wallet className="h-4 w-4" />
          </div>
          <span className="text-xs sm:text-sm font-bold text-foreground">
            {t("orders.walletPaymentProof", { defaultValue: "إثبات الدفع بالمحفظة" })}
          </span>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${badge.cls}`}
        >
          {badge.icon}
          <span>{badge.label}</span>
        </span>
      </div>

      {proof.imageUrl ? (
        <a
          href={proof.imageUrl}
          target="_blank"
          rel="noreferrer"
          className="block overflow-hidden rounded-xl border border-border/70 hover:opacity-90 transition-opacity"
        >
          <img
            src={proof.imageUrl}
            alt={String(t("orders.transferReceipt", { defaultValue: "إيصال التحويل" }))}
            className="max-h-48 w-full object-cover"
          />
        </a>
      ) : null}

      <div className="space-y-1.5 text-xs text-foreground">
        {proof.walletNumber ? (
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">{t("orders.walletNumber", { defaultValue: "رقم المحفظة" })}</span>
            <span dir="ltr" className="font-semibold font-mono tabular-nums">{proof.walletNumber}</span>
          </div>
        ) : null}
        {proof.transferRef ? (
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">{t("orders.transferRef", { defaultValue: "رقم العملية" })}</span>
            <span className="font-semibold font-mono tabular-nums">{proof.transferRef}</span>
          </div>
        ) : null}
        {proof.submittedAt ? (
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">{t("orders.uploadDate", { defaultValue: "تاريخ الرفع" })}</span>
            <span className="font-semibold font-mono tabular-nums">
              {new Date(proof.submittedAt).toLocaleString("ar-EG")}
            </span>
          </div>
        ) : null}
        {proof.rejectReason ? (
          <div className="mt-1 rounded-xl bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
            <span className="font-bold">{t("orders.rejectReason", { defaultValue: "سبب الرفض" })}: </span>
            <span>{proof.rejectReason}</span>
          </div>
        ) : null}
      </div>

      {status === "PENDING" ? (
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => void onVerify("VERIFY")}
            className="flex-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 active:scale-95 transition-all shadow-xs"
          >
            {t("orders.confirmPayment", { defaultValue: "تأكيد الدفع" })}
          </button>
          <button
            type="button"
            onClick={() => {
              const reason = window.prompt("اكتب سبب الرفض (اختياري)");
              if (reason !== null) void onVerify("REJECT", reason || undefined);
            }}
            className="flex-1 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-bold text-destructive hover:bg-destructive/20 active:scale-95 transition-all"
          >
            {t("orders.reject", { defaultValue: "رفض" })}
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default WalletPaymentProofCard;
