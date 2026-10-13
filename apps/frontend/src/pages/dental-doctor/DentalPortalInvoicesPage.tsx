import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronDown,
  ChevronUp,
  Receipt,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight,
} from "lucide-react";

import {
  formatCurrency,
  formatDate,
  getInvoices,
  type DentalInvoice,
} from "./shared";

function invoiceStatusVisual(
  status: string,
  t: (key: string) => string,
): { label: string; pill: string } {
  const s = (status || "").toLowerCase();
  if (s.includes("paid") && !s.includes("unpaid")) {
    return {
      label: t("dentalPortal.invoices.paidBadge"),
      pill: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    };
  }
  if (s.includes("partial")) {
    return {
      label: t("dentalPortal.invoices.partialBadge"),
      pill: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    };
  }
  if (s.includes("unpaid") || s.includes("due") || s.includes("open")) {
    return {
      label: t("dentalPortal.invoices.unpaidBadge"),
      pill: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    };
  }
  return {
    label: status || "—",
    pill: "bg-muted/60 text-muted-foreground border-border/40",
  };
}

const DentalPortalInvoicesPage: React.FC = () => {
  const { t: tRaw } = useTranslation();
  const t = tRaw as unknown as (key: string) => string;
  const [invoices, setInvoices] = useState<DentalInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getInvoices()
      .then((items) => {
        if (!cancelled) setInvoices(items);
      })
      .catch(() => {
        if (!cancelled) setError(t("dentalPortal.invoices.error"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const stats = useMemo(() => {
    let totalBilled = 0;
    let totalPaid = 0;
    let totalRemaining = 0;
    invoices.forEach((inv) => {
      totalBilled += inv.total || 0;
      totalPaid += inv.paid || 0;
      totalRemaining += inv.remaining || 0;
    });
    return { totalBilled, totalPaid, totalRemaining, count: invoices.length };
  }, [invoices]);

  if (loading) {
    return (
      <div className="flex min-h-[350px] items-center justify-center rounded-2xl border border-border/70 bg-card">
        <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span>{t("dentalPortal.invoices.loading")}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-center text-xs text-rose-700 dark:text-rose-400">
        <AlertCircle size={20} className="mb-2 mx-auto" />
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <span>بوابة الأطباء</span>
            <span>/</span>
            <span className="text-foreground">الفواتير والحسابات</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
            {t("dentalPortal.invoices.title")}
          </h1>
          <p className="text-xs text-muted-foreground">
            {t("dentalPortal.invoices.subtitle")}
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-card px-3 py-1.5 font-mono text-xs text-muted-foreground">
          <Receipt size={14} className="text-primary" />
          <span>إجمالي الفواتير:</span>
          <span className="font-semibold text-foreground">{stats.count}</span>
        </div>
      </div>

      {/* Financial Telemetry Ribbon */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">إجمالي المستحق</span>
            <Receipt size={15} className="text-primary" />
          </div>
          <div className="mt-2 font-mono text-xl font-bold tabular-nums text-foreground">
            {formatCurrency(stats.totalBilled)}
          </div>
          <div className="mt-1 font-mono text-[11px] text-muted-foreground">
            كافة الحالات المفوترة
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">إجمالي المدفوع</span>
            <CheckCircle2 size={15} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 font-mono text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatCurrency(stats.totalPaid)}
          </div>
          <div className="mt-1 font-mono text-[11px] text-muted-foreground">
            المسدد للمعمل فعلياً
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">المتبقي المطلوب سداده</span>
            <Clock size={15} className="text-rose-600 dark:text-rose-400" />
          </div>
          <div className="mt-2 font-mono text-xl font-bold tabular-nums text-rose-600 dark:text-rose-400">
            {formatCurrency(stats.totalRemaining)}
          </div>
          <div className="mt-1 font-mono text-[11px] text-muted-foreground">
            رصيد آجل مستحق
          </div>
        </div>
      </div>

      {/* Invoices Table Card */}
      {invoices.length === 0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-card p-8 text-center text-muted-foreground">
          <Receipt size={40} className="mb-3 opacity-40" />
          <p className="text-sm font-medium text-foreground">{t("dentalPortal.invoices.noInvoices")}</p>
          <p className="mt-1 text-xs text-muted-foreground">لا توجد فواتير مسجلة لحسابك حالياً</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-right text-xs">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-medium">
                    {t("dentalPortal.invoices.invoiceNumber")}
                  </th>
                  <th className="px-4 py-3 font-medium">
                    {t("dentalPortal.invoices.date")}
                  </th>
                  <th className="px-4 py-3 font-medium">
                    {t("dentalPortal.invoices.total")}
                  </th>
                  <th className="px-4 py-3 font-medium">
                    {t("dentalPortal.invoices.paid")}
                  </th>
                  <th className="px-4 py-3 font-medium">
                    {t("dentalPortal.invoices.remaining")}
                  </th>
                  <th className="px-4 py-3 font-medium">
                    {t("dentalPortal.invoices.status")}
                  </th>
                  <th className="px-4 py-3 text-center">المدفوعات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 font-mono">
                {invoices.map((inv) => {
                  const status = invoiceStatusVisual(inv.status, t);
                  const isExpanded = expandedId === inv.id;
                  const payments = inv.payments ?? [];
                  return (
                    <React.Fragment key={inv.id}>
                      <tr
                        onClick={() =>
                          setExpandedId(isExpanded ? null : inv.id)
                        }
                        className="cursor-pointer transition-colors hover:bg-muted/40"
                      >
                        <td className="px-4 py-3.5 font-semibold text-primary">
                          {inv.invoiceNumber}
                        </td>
                        <td className="px-4 py-3.5 text-muted-foreground">
                          {formatDate(inv.createdAt)}
                        </td>
                        <td className="px-4 py-3.5 font-bold tabular-nums text-foreground">
                          {formatCurrency(inv.total)}
                        </td>
                        <td className="px-4 py-3.5 font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(inv.paid)}
                        </td>
                        <td className="px-4 py-3.5 font-medium tabular-nums text-rose-600 dark:text-rose-400">
                          {formatCurrency(inv.remaining)}
                        </td>
                        <td className="px-4 py-3.5 font-sans">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ${status.pill}`}
                          >
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center text-muted-foreground">
                          {payments.length > 0 ? (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                            >
                              <span>{payments.length} سند</span>
                              {isExpanded ? (
                                <ChevronUp size={14} />
                              ) : (
                                <ChevronDown size={14} />
                              )}
                            </button>
                          ) : (
                            <span className="text-[11px] text-muted-foreground/60">—</span>
                          )}
                        </td>
                      </tr>
                      {isExpanded && payments.length > 0 ? (
                        <tr className="bg-muted/20">
                          <td colSpan={7} className="px-6 py-4">
                            <div className="rounded-xl border border-border/60 bg-card p-3.5">
                              <div className="mb-2.5 flex items-center gap-2 font-sans text-xs font-semibold text-foreground">
                                <CreditCard size={14} className="text-primary" />
                                <span>سجل الدفعات والسدادات للفاتورة {inv.invoiceNumber}</span>
                              </div>
                              <div className="space-y-2">
                                {payments.map((p) => (
                                  <div
                                    key={p.id}
                                    className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/30 px-3 py-2 text-xs"
                                  >
                                    <div className="flex items-center gap-2 text-foreground font-sans">
                                      <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />
                                      <span>طريقة السداد: {p.method || "نقدي"}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="font-mono font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                                        {formatCurrency(p.amount)}
                                      </span>
                                      <span className="font-mono text-[11px] text-muted-foreground">
                                        {formatDate(p.paidAt)}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          {invoices.some((inv) => (inv.payments?.length ?? 0) > 0) ? (
            <div className="border-t border-border/60 bg-muted/20 px-4 py-2 text-center text-[11px] text-muted-foreground">
              {t("dentalPortal.invoices.clickToExpand")}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default DentalPortalInvoicesPage;