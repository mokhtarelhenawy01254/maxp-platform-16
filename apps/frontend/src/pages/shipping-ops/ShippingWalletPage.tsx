import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Download,
  Filter,
  RefreshCw,
  PlusCircle,
  Banknote,
  Scale,
  Calendar,
  X,
} from 'lucide-react';
import {
  shippingOpsService,
  CompanyWalletData,
  CompanyWalletTransactionItem,
} from '../../services/shippingOpsService';
import { formatCurrency, formatDate } from './shippingOpsShared';

export const ShippingWalletPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';

  const [wallet, setWallet] = useState<CompanyWalletData | null>(null);
  const [transactions, setTransactions] = useState<CompanyWalletTransactionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [reasonFilter, setReasonFilter] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState<string>('');
  const [adjustType, setAdjustType] = useState<'DEPOSIT' | 'WITHDRAW'>('DEPOSIT');
  const [adjustReason, setAdjustReason] = useState<string>('ADJUSTMENT');
  const [adjustNotes, setAdjustNotes] = useState<string>('');
  const [adjustCode, setAdjustCode] = useState<string>('');
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [wRes, txRes] = await Promise.all([
        shippingOpsService.getWalletSummary(),
        shippingOpsService.getWalletTransactions({
          page,
          limit,
          type: typeFilter || undefined,
          reason: reasonFilter || undefined,
          from: fromDate || undefined,
          to: toDate || undefined,
        }),
      ]);
      setWallet(wRes);
      setTransactions(txRes.transactions || []);
      setTotal(txRes.pagination?.total || 0);
      setPages(txRes.pagination?.pages || 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ أثناء تحميل المعاملات';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [page, limit, typeFilter, reasonFilter, fromDate, toDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (typeFilter) params.append('type', typeFilter);
    if (reasonFilter) params.append('reason', reasonFilter);
    if (fromDate) params.append('from', fromDate);
    if (toDate) params.append('to', toDate);
    params.append('export', 'csv');
    window.open(`/api/v1/wallet/transactions?${params.toString()}`, '_blank');
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(adjustAmount);
    if (isNaN(num) || num <= 0) {
      setAdjustError('يرجى إدخال مبلغ صحيح أكبر من صفر');
      return;
    }
    if (!adjustNotes.trim()) {
      setAdjustError('يرجى إدخال سبب وملاحظات التعديل');
      return;
    }

    try {
      setAdjustLoading(true);
      setAdjustError(null);
      await shippingOpsService.adjustWalletBalance({
        amount: num,
        type: adjustType,
        reason: adjustReason,
        notes: adjustNotes.trim(),
        code: adjustCode.trim() || undefined,
      });
      setIsAdjustModalOpen(false);
      setAdjustAmount('');
      setAdjustNotes('');
      setAdjustCode('');
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل تعديل الرصيد';
      setAdjustError(msg);
    } finally {
      setAdjustLoading(false);
    }
  };

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case 'COD_COLLECTED':
        return isEn ? 'COD Collected' : 'تحصيل COD';
      case 'SETTLEMENT_PAYOUT':
        return isEn ? 'Settlement Payout' : 'صرف تسوية';
      case 'PRINT_FEE':
        return isEn ? 'Print Fee' : 'رسوم طباعة البوليصة';
      case 'OPEN_PACKAGE_FEE':
        return isEn ? 'Package Open Fee' : 'رسوم فتح الشحنة';
      case 'ADJUSTMENT':
        return isEn ? 'Manual Adjustment' : 'تسوية يدوية';
      case 'COMMISSION_PAYOUT':
        return isEn ? 'Commission Payout' : 'صرف عمولة';
      default:
        return reason;
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 w-full max-w-[1800px] mx-auto text-slate-900 dark:text-slate-100">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
            <Wallet className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <span>{isEn ? 'Company Wallet & Transactions Ledger' : 'محفظة الشركة ودفتر المعاملات'}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isEn ? 'Live ledger of collections, payouts, and automated system fees' : 'دفتر الحركات المالية المباشرة، تحصيلات COD، رسوم الطباعة، وفتح الشحنات'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{isEn ? 'Refresh' : 'تحديث'}</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition active:scale-95"
            title="تصدير CSV مطابق لـ Turbo"
          >
            <Download className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span>{isEn ? 'Export CSV' : 'تصدير كشف (CSV)'}</span>
          </button>
          <button
            onClick={() => setIsAdjustModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{isEn ? 'Manual Adjustment' : 'تسوية يدوية'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-xs sm:text-sm">
          {error}
        </div>
      )}

      {/* Turbo 3 KPI Financial Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-xl p-4 sm:p-5 shadow-sm border border-slate-700/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300">{isEn ? 'Total Balance' : 'الرصيد الإجمالي'}</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold tabular-nums">
            {loading ? '—' : formatCurrency(wallet?.balance ?? 0, wallet?.currency || 'EGP')}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">{isEn ? 'Actual cash balance' : 'الرصيد الفعلي الحالي في المحفظة'}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{isEn ? 'Available For Remittance' : 'القابل للتوريد'}</span>
            <Banknote className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
            {loading ? '—' : formatCurrency(wallet?.availableForRemittance ?? 0, wallet?.currency || 'EGP')}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">{isEn ? 'COD − Fees − Payouts' : 'مجموع COD المحصل − الرسوم − المسحوبات'}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{isEn ? 'Upcoming Remittance' : 'التوريد القادم'}</span>
            <Scale className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
            {loading ? '—' : formatCurrency(wallet?.upcomingRemittance ?? 0, wallet?.currency || 'EGP')}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">{isEn ? 'Pending issued statements' : 'صافي كشوف التسوية المعتمدة ISSUED'}</p>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{isEn ? 'Filters:' : 'الفلاتر:'}</span>
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="text-xs border border-slate-300 dark:border-slate-700 bg-transparent rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500"
          >
            <option value="">{isEn ? 'All Types' : 'كافة الأنواع'}</option>
            <option value="DEPOSIT">{isEn ? 'Deposit (+)' : 'إيداع (+)'}</option>
            <option value="WITHDRAW">{isEn ? 'Withdraw (-)' : 'سحب (-)'}</option>
          </select>

          {/* Reason Filter */}
          <select
            value={reasonFilter}
            onChange={(e) => { setReasonFilter(e.target.value); setPage(1); }}
            className="text-xs border border-slate-300 dark:border-slate-700 bg-transparent rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500"
          >
            <option value="">{isEn ? 'All Reasons' : 'كافة الأسباب'}</option>
            <option value="COD_COLLECTED">{isEn ? 'COD Collected' : 'تحصيل COD'}</option>
            <option value="SETTLEMENT_PAYOUT">{isEn ? 'Settlement Payout' : 'صرف كشف تسوية'}</option>
            <option value="PRINT_FEE">{isEn ? 'Print Fee' : 'رسوم طباعة البوليصة'}</option>
            <option value="OPEN_PACKAGE_FEE">{isEn ? 'Open Package Fee' : 'رسوم فتح الشحنة'}</option>
            <option value="ADJUSTMENT">{isEn ? 'Manual Adjustment' : 'تسوية يدوية'}</option>
          </select>

          {/* Date Range */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
              className="text-xs border border-slate-300 dark:border-slate-700 bg-transparent rounded-lg px-2 py-1"
              placeholder="من"
            />
            <span>{isEn ? 'to' : 'إلى'}</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setPage(1); }}
              className="text-xs border border-slate-300 dark:border-slate-700 bg-transparent rounded-lg px-2 py-1"
              placeholder="إلى"
            />
          </div>

          {(typeFilter || reasonFilter || fromDate || toDate) && (
            <button
              onClick={() => { setTypeFilter(''); setReasonFilter(''); setFromDate(''); setToDate(''); setPage(1); }}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              <span>{isEn ? 'Reset' : 'إلغاء الفلاتر'}</span>
            </button>
          )}

          <div className="ml-auto text-xs text-slate-400 font-mono">
            {isEn ? `${total} transactions` : `${total} حركة`}
          </div>
        </div>
      </div>

      {/* Turbo Transactions Ledger Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-3 py-3 font-semibold">{isEn ? 'ID' : 'المعرف'}</th>
                <th className="px-3 py-3 font-semibold text-center">{isEn ? 'Type' : 'النوع'}</th>
                <th className="px-3 py-3 font-semibold">{isEn ? 'Reason' : 'السبب'}</th>
                <th className="px-3 py-3 font-semibold">{isEn ? 'Code' : 'الكود'}</th>
                <th className="px-3 py-3 font-semibold text-left">{isEn ? 'Amount' : 'القيمة'}</th>
                <th className="px-3 py-3 font-semibold text-left">{isEn ? 'Balance After' : 'الرصيد بعد الحركة'}</th>
                <th className="px-3 py-3 font-semibold">{isEn ? 'Notes' : 'ملاحظات'}</th>
                <th className="px-3 py-3 font-semibold">{isEn ? 'Created By' : 'أنشأ بواسطة'}</th>
                <th className="px-3 py-3 font-semibold text-center">{isEn ? 'Date' : 'التاريخ'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                    <span>{isEn ? 'Loading ledger...' : 'جاري تحميل سجل المعاملات...'}</span>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    {isEn ? 'No transactions found' : 'لا توجد حركات مسجلة تطابق الفلاتر'}
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const isDeposit = tx.type === 'DEPOSIT';
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-3 py-2.5 font-mono text-[11px] text-slate-500">
                        {tx.id.slice(0, 8)}...
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            isDeposit
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}
                        >
                          {isDeposit ? <ArrowDownLeft className="w-2.5 h-2.5" /> : <ArrowUpRight className="w-2.5 h-2.5" />}
                          <span>{isDeposit ? (isEn ? 'Deposit' : 'إيداع') : (isEn ? 'Withdraw' : 'سحب')}</span>
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-medium">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                          {tx.reasonLabel || getReasonLabel(tx.reason)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono font-medium text-blue-600 dark:text-blue-400">
                        {tx.code || '—'}
                      </td>
                      <td className={`px-3 py-2.5 text-left font-bold tabular-nums ${isDeposit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {isDeposit ? '+' : '−'}{formatCurrency(tx.amount)}
                      </td>
                      <td className="px-3 py-2.5 text-left font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                        {formatCurrency(tx.balanceAfter)}
                      </td>
                      <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400 max-w-[200px] truncate" title={tx.notes || ''}>
                        {tx.notes || '—'}
                      </td>
                      <td className="px-3 py-2.5 text-slate-500 text-[11px]">
                        {tx.createdBy || 'SYSTEM'}
                      </td>
                      <td className="px-3 py-2.5 text-center font-mono text-[11px] text-slate-400">
                        {formatDate(tx.createdAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between p-3 border-t border-slate-200 dark:border-slate-800 text-xs">
            <span className="text-slate-400 font-mono">
              {isEn ? `Page ${page} of ${pages}` : `صفحة ${page} من ${pages}`}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
              >
                {isEn ? 'Previous' : 'السابق'}
              </button>
              <button
                disabled={page >= pages || loading}
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                className="px-2.5 py-1 border border-slate-300 dark:border-slate-700 rounded hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
              >
                {isEn ? 'Next' : 'التالي'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Manual Adjustment Modal */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-emerald-600" />
                <span>{isEn ? 'Manual Wallet Adjustment' : 'تسوية يدوية للرصيد'}</span>
              </h3>
              <button onClick={() => setIsAdjustModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {adjustError && (
              <div className="p-3 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 rounded-lg text-xs">
                {adjustError}
              </div>
            )}

            <form onSubmit={handleAdjustSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium mb-1">{isEn ? 'Type' : 'نوع الحركة'}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('DEPOSIT')}
                    className={`py-2 rounded-lg font-semibold border ${
                      adjustType === 'DEPOSIT'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                        : 'border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    + {isEn ? 'Deposit' : 'إيداع'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('WITHDRAW')}
                    className={`py-2 rounded-lg font-semibold border ${
                      adjustType === 'WITHDRAW'
                        ? 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                        : 'border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    − {isEn ? 'Withdraw' : 'سحب / خصم'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1">{isEn ? 'Amount (EGP)' : 'المبلغ (ج.م) *'}</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-slate-300 dark:border-slate-700 bg-transparent rounded-lg px-3 py-2 text-sm font-semibold focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-medium mb-1">{isEn ? 'Reference Code (Optional)' : 'كود المعاملة / الشحنة (اختياري)'}</label>
                <input
                  type="text"
                  value={adjustCode}
                  onChange={(e) => setAdjustCode(e.target.value)}
                  placeholder="مثال: ADJ-2026-01"
                  className="w-full border border-slate-300 dark:border-slate-700 bg-transparent rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block font-medium mb-1">{isEn ? 'Notes / Audit Reason' : 'سبب التعديل والملاحظات *'}</label>
                <textarea
                  required
                  rows={2}
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  placeholder="وثّق سبب التسوية بالتفصيل لملف التدقيق..."
                  className="w-full border border-slate-300 dark:border-slate-700 bg-transparent rounded-lg px-3 py-2"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-3.5 py-2 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  {isEn ? 'Cancel' : 'إلغاء'}
                </button>
                <button
                  type="submit"
                  disabled={adjustLoading}
                  className="px-4 py-2 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg disabled:opacity-50"
                >
                  {adjustLoading ? (isEn ? 'Saving...' : 'جاري الحفظ...') : (isEn ? 'Save Adjustment' : 'حفظ التعديل')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShippingWalletPage;
