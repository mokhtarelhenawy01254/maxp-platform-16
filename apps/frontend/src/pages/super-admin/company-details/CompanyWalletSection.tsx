import { formatDate } from '@/utils/formatters';
import { formatCurrency } from '@/utils/formatters';
import type { CompanyReview } from "./companyDetailsTypes";
import { ArrowUpCircle, CreditCard as WalletIcon } from 'lucide-react';
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { MiniStat } from "./MiniStat";
import { SectionShell } from "./SectionShell";
import { EmptyState } from "./EmptyState";
import {
  formatDate,
  formatDateTime,
  formatCurrency,
  getTransactionTypeLabel,
} from "./helpers";

export function CompanyWalletSection({ review, reviewCurrency, openTopUpModal, navigate }: {
  review?: CompanyReview | null;
  reviewCurrency: string;
  openTopUpModal: () => void;
  navigate: (path: string) => void;
}) {
  return (
    <SectionShell
      title="المحفظة والشحن"
      description="رصيد الشركة، حركة الشحن، وآخر العمليات المالية على المحفظة."
      actions={
        <>
          <Button type="button" variant="outline" className="rounded-2xl"
            onClick={() => navigate("/super-admin/wallet-management")}
          >
            <WalletIcon className="size-4" />
            إدارة المحافظ
          </Button>
          <Button type="button" className="rounded-2xl" onClick={openTopUpModal}>
            <ArrowUpCircle className="size-4" />
            شحن المحفظة
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <MiniStat label="الرصيد الحالي" value={formatCurrency(review?.wallet?.balance, reviewCurrency)}
          helper="المتاح الآن للتغطية والدفع" valueClassName="text-emerald-700 dark:text-emerald-300" />
        <MiniStat label="إجمالي الإيداعات" value={formatCurrency(review?.wallet?.totalDeposited, reviewCurrency)}
          helper="كل ما تم شحنه تاريخيًا" />
        <MiniStat label="إجمالي المصروف" value={formatCurrency(review?.wallet?.totalSpent, reviewCurrency)}
          helper="خصومات ورسوم واستخدام" />
      </div>

      <div className="py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-black text-foreground">آخر حركات المحفظة</p>
            <p className="text-xs text-muted-foreground">آخر الشحنات أو الخصومات المسجلة على محفظة الشركة.</p>
          </div>
          <Badge variant="outline" className="rounded-full border-border/50 bg-muted/30 px-3 py-1 text-xs">
            آخر تحديث {formatDate(review?.wallet?.updatedAt)}
          </Badge>
        </div>

        <div className="mt-4 space-y-2">
          {review?.wallet?.recentTransactions?.length ? (
            review.wallet.recentTransactions.map((transaction) => (
              <div key={transaction.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="rounded-full px-2.5 py-1 text-[11px]">
                      {getTransactionTypeLabel(transaction.type)}
                    </Badge>
                    <span className="text-sm font-bold text-foreground">
                      {formatCurrency(transaction.amount, reviewCurrency)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{transaction.description || "بدون وصف"}</p>
                </div>
                <div className="text-xs text-muted-foreground sm:text-left">
                  {formatDateTime(transaction.createdAt)}
                </div>
              </div>
            ))
          ) : (
            <EmptyState message="لا توجد حركات محفظة مسجلة بعد." icon={WalletIcon} />
          )}
        </div>
      </div>
    </SectionShell>
  );
}
