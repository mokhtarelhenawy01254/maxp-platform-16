import React from 'react';
import { Link } from 'react-router-dom';
import { RotateCcw, ArrowRight, ArrowLeft } from 'lucide-react';
import i18n from '../../../i18n';
import { useCourierDuesData } from './hooks/useCourierDuesData';
import { CourierDuesMetricsRibbon } from './components/CourierDuesMetricsRibbon';
import { CourierDuesSummaryList } from './components/CourierDuesSummaryList';
import { CourierCommissionLedgerTable } from './components/CourierCommissionLedgerTable';
import { PayCourierCommissionModal } from './components/PayCourierCommissionModal';

/**
 * مستحقات المناديب — ledger العمولات: إجمالي DUE/PAID لكل مندوب + تفصيل القيود
 * والصرف للخزينة (WITHDRAWAL باسم صرف العمولة).
 */
const CourierDuesPage: React.FC = () => {
  const {
    formatPrice,
    summary,
    entries,
    pagination,
    loading,
    statusFilter,
    setStatusFilter,
    page,
    setPage,
    payingCourierId,
    treasuryAccounts,
    payAccountId,
    setPayAccountId,
    load,
    openPay,
    closePay,
    confirmPay,
    totalDue,
    payingRow,
  } = useCourierDuesData();

  return (
    <div className="w-full min-h-screen bg-background text-foreground" dir={i18n.dir()}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Command Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
          <div className="flex items-center gap-3">
            <Link
              to="/shipping/couriers"
              className="p-2 rounded-lg border border-border/60 hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors"
              title="العودة لإدارة المناديب"
            >
              {i18n.dir() === 'rtl' ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">مستحقات وعمولات المناديب</h1>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  COMMISSION LEDGER
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                احتساب العمولات آلياً عند تسوية المأموريات، والصرف المباشر كخصم من خزينة المنشأة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="h-9 px-3.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50 shadow-xs"
            >
              <RotateCcw size={13} className={loading ? 'animate-spin' : ''} />
              <span>تحديث</span>
            </button>
          </div>
        </div>

        {/* Telemetry Metric Ribbon */}
        <CourierDuesMetricsRibbon
          totalDue={totalDue}
          summary={summary}
          totalEntries={pagination?.total ?? 0}
          formatPrice={formatPrice}
        />

        {/* Courier Balances Summary */}
        <CourierDuesSummaryList
          summary={summary}
          formatPrice={formatPrice}
          onOpenPay={openPay}
        />

        {/* Detailed Commission Entries Ledger */}
        <CourierCommissionLedgerTable
          entries={entries}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          formatPrice={formatPrice}
          pagination={pagination}
          page={page}
          onPageChange={setPage}
        />

        {/* Modal: Pay Courier Commission */}
        {payingCourierId && payingRow && (
          <PayCourierCommissionModal
            payingRow={payingRow}
            treasuryAccounts={treasuryAccounts}
            payAccountId={payAccountId}
            onPayAccountIdChange={setPayAccountId}
            formatPrice={formatPrice}
            onConfirm={confirmPay}
            onClose={closePay}
          />
        )}
      </div>
    </div>
  );
};

export default CourierDuesPage;
