import { CreditCard, FileText, History, Receipt, RotateCcw } from "lucide-react";
import { cn } from "../../../lib/utils";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { MiniStat } from "./MiniStat";
import { SectionShell } from "./SectionShell";
import { EmptyState } from "./EmptyState";
import {
  formatDate,
  formatDateTime,
  formatNumber,
  formatCurrency,
  getStatusMeta,
  getInvoiceDisplayTitle,
  getInvoiceReferenceLabel,
  getPaymentDisplayTitle,
  getPaymentReferenceLabel,
  getReceiptDisplayTitle,
  getReceiptReferenceLabel,
  getBillingTypeLabel,
} from "./helpers";

export function CompanyBillingSection({
  review,
  reviewCurrency,
  navigate,
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <SectionShell
        title="الفواتير والمدفوعات"
        description="آخر الفواتير والمدفوعات لمراجعة التحصيل بشكل سريع."
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              className="rounded-2xl"
              onClick={() => navigate("/super-admin/invoices")}
            >
              <Receipt className="size-4" />
              الفواتير
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-2xl"
              onClick={() => navigate("/super-admin/payments")}
            >
              <CreditCard className="size-4" />
              المدفوعات
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <MiniStat
            label="فواتير غير مسددة"
            value={formatNumber(review?.billing?.stats?.unpaidInvoices || 0)}
            helper={`المتأخرة ${formatNumber(review?.billing?.stats?.overdueInvoices || 0)}`}
          />
          <MiniStat
            label="مدفوعات فاشلة"
            value={formatNumber(review?.billing?.stats?.failedPayments || 0)}
            helper={`المعلقة ${formatNumber(review?.billing?.stats?.pendingPayments || 0)}`}
          />
          <MiniStat
            label="فواتير مدفوعة"
            value={formatNumber(review?.billing?.stats?.paidInvoices || 0)}
            helper={`الإجمالي ${formatNumber(review?.billing?.stats?.totalInvoices || 0)}`}
          />
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="space-y-2">
            <p className="text-sm font-black text-foreground">آخر الفواتير</p>
            {review?.billing?.recentInvoices?.length ? (
              review.billing.recentInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="py-3 border-b border-border/20 last:border-b-0"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-foreground">
                          {getInvoiceDisplayTitle(invoice)}
                        </p>
                        <Badge
                          variant="outline"
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[11px]",
                            getStatusMeta("invoice", invoice.status).className,
                          )}
                        >
                          {getStatusMeta("invoice", invoice.status).label}
                        </Badge>
                      </div>
                      {getInvoiceReferenceLabel(invoice) ? (
                        <p className="text-[11px] text-muted-foreground">
                          {getInvoiceReferenceLabel(invoice)}
                        </p>
                      ) : null}
                      <p className="text-xs text-muted-foreground">
                        إصدار {formatDate(invoice.issueDate)} • استحقاق {formatDate(invoice.dueDate)}
                      </p>
                    </div>
                    <div className="text-sm font-bold text-foreground">
                      {formatCurrency(invoice.totalAmount, invoice.currency || reviewCurrency)}
                    </div>
                  </div>
                </div>
              ))
                  ) : (
                    <EmptyState message="لا توجد فواتير مسجلة." icon={FileText} />
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-black text-foreground">آخر المدفوعات</p>
            {review?.billing?.recentPayments?.length ? (
              review.billing.recentPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="py-3 border-b border-border/20 last:border-b-0"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-foreground">
                          {getPaymentDisplayTitle(payment)}
                        </p>
                        <Badge
                          variant="outline"
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[11px]",
                            getStatusMeta("payment", payment.status).className,
                          )}
                        >
                          {getStatusMeta("payment", payment.status).label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {getPaymentReferenceLabel(payment) || "بدون مرجع دفع إضافي"}
                      </p>
                      {payment.failureReason ? (
                        <p className="text-[11px] text-rose-600 dark:text-rose-300">
                          {payment.failureReason}
                        </p>
                      ) : null}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-foreground">
                        {formatCurrency(payment.amount, payment.currency || reviewCurrency)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(payment.paidAt || payment.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
                  ) : (
                    <EmptyState message="لا توجد مدفوعات مسجلة." icon={CreditCard} />
            )}
          </div>
        </div>
      </SectionShell>

      <div className="space-y-4">
        <SectionShell
          title="الإيصالات وسجل الفوترة"
          description="الإيصالات المعلقة وآخر الحركات المالية المرتبطة بالشركة."
          actions={
            <Button
              type="button"
              variant="outline"
              className="rounded-2xl"
              onClick={() => navigate("/super-admin/pending-receipts")}
            >
              <History className="size-4" />
              مراجعة الإيصالات
            </Button>
          }
        >
          <div className="space-y-2">
            {review?.billing?.recentReceipts?.length ? (
              review.billing.recentReceipts.map((receipt) => (
                <div
                  key={receipt.id}
                  className="py-3 border-b border-border/20 last:border-b-0"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-foreground">
                          {getReceiptDisplayTitle(receipt)}
                        </p>
                        <Badge
                          variant="outline"
                          className={cn(
                            "rounded-full px-2.5 py-1 text-[11px]",
                            getStatusMeta("receipt", receipt.status).className,
                          )}
                        >
                          {getStatusMeta("receipt", receipt.status).label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        قدم في {formatDateTime(receipt.submittedAt)}
                      </p>
                      {getReceiptReferenceLabel(receipt) ? (
                        <p className="text-[11px] text-muted-foreground">
                          {getReceiptReferenceLabel(receipt)}
                        </p>
                      ) : null}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-foreground">
                        {formatCurrency(
                          receipt.invoice?.totalAmount,
                          receipt.invoice?.currency || reviewCurrency,
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {receipt.walletNumber?.name || "محفظة غير محددة"}
                      </p>
                    </div>
                  </div>
                </div>
              ))
                  ) : (
                    <EmptyState message="لا توجد إيصالات مسجلة لهذه الشركة." icon={Receipt} />
            )}
          </div>
        </SectionShell>

        <SectionShell
          title="سجل الفوترة"
          description="آخر الرسوم والحركات المسجلة على مستوى المنصة."
        >
          <div className="space-y-2">
            {review?.billing?.recentHistory?.length ? (
              review.billing.recentHistory.map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-col gap-3 py-3 border-b border-border/20 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className="rounded-full px-2.5 py-1 text-[11px]"
                      >
                        {getBillingTypeLabel(entry.type)}
                      </Badge>
                      <p className="text-sm font-bold text-foreground">
                        {entry.description}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(entry.createdAt)}
                    </p>
                  </div>
                  <div className="text-sm font-bold text-foreground">
                    {formatCurrency(entry.amount, reviewCurrency)}
                  </div>
                </div>
              ))
                  ) : (
                    <EmptyState message="لا توجد حركات فوترة حديثة." icon={RotateCcw} />
            )}
          </div>
        </SectionShell>
      </div>
    </div>
  );
}
