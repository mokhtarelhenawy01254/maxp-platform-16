import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import {
  ArrowPathIcon,
  BanknotesIcon,
  BuildingLibraryIcon,
  CheckBadgeIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import courierService, { CourierCommissionSummaryRow, CourierCommissionEntry } from '../../../services/courierService';
import { useCurrency } from '../../../hooks/useCurrency';

/**
 * مستحقات المناديب — ledger العمولات: إجمالي DUE/PAID لكل منديب + تفصيل القيود
 * والصرف للخزينة (WITHDRAWAL باسم صرف العمولة).
 */
const CourierDuesPage: React.FC = () => {
  const { formatPrice } = useCurrency();

  const [summary, setSummary] = useState<CourierCommissionSummaryRow[]>([]);
  const [entries, setEntries] = useState<CourierCommissionEntry[]>([]);
  const [pagination, setPagination] = useState<{ total: number; page: number; pages: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DUE' | 'PAID'>('DUE');
  const [page, setPage] = useState(1);
  const [payingCourierId, setPayingCourierId] = useState<string | null>(null);
  const [treasuryAccounts, setTreasuryAccounts] = useState<Array<{ id: string; name: string; balance: number }>>([]);
  const [payAccountId, setPayAccountId] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await courierService.getCommissions({ status: statusFilter, page, limit: 20 });
      if (res.success) {
        setSummary(res.summary || []);
        setEntries(res.data || []);
        setPagination(res.pagination || null);
      }
    } catch (err: any) {
      toast.error(err?.message || 'تعذر تحميل مستحقات المناديب');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const openPay = async (courierId: string) => {
    setPayingCourierId(courierId);
    try {
      const res = await courierService.getTreasuryAccounts();
      const accounts = res.data || [];
      setTreasuryAccounts(accounts);
      setPayAccountId(accounts[0]?.id || '');
    } catch {
      setTreasuryAccounts([]);
    }
  };

  const confirmPay = async () => {
    if (!payingCourierId) return;
    try {
      const res = await courierService.payCommissions(payingCourierId, {
        treasuryAccountId: payAccountId || undefined
      });
      if (res.success) {
        toast.success(res.message || 'تم صرف المستحقات');
        setPayingCourierId(null);
        load();
      }
    } catch (err: any) {
      toast.error(err?.message || 'تعذر صرف المستحقات');
    }
  };

  const totalDue = summary.reduce((s, r) => s + r.dueAmount, 0);
  const payingRow = summary.find((r) => r.courierId === payingCourierId);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto text-slate-900 dark:text-slate-100">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link to="/shipping/couriers" className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
              المناديب ←
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">مستحقات عمولات المناديب</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            عمولات محسوبة تلقائيًا عند تسوية كل مأمورية — الصرف بيتسجل خصمًا من خزينة الشركة
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
        >
          <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          تحديث
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 flex items-center gap-1.5"><ClockIcon className="w-4 h-4" /> إجمالي المستحق (DUE)</div>
          <div className="text-lg sm:text-xl font-bold text-amber-600 dark:text-amber-400 mt-1 tabular-nums">{formatPrice(totalDue)}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 flex items-center gap-1.5"><CheckBadgeIcon className="w-4 h-4" /> مناديب عليهم مستحقات</div>
          <div className="text-lg sm:text-xl font-bold tabular-nums mt-1">{summary.filter((r) => r.dueAmount > 0).length}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 flex items-center gap-1.5"><BanknotesIcon className="w-4 h-4" /> قيود مسجلة (الصفحة)</div>
          <div className="text-lg sm:text-xl font-bold tabular-nums mt-1">{pagination?.total ?? 0}</div>
        </div>
      </div>

      {/* Per-courier totals */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 text-xs font-semibold">إجماليات المناديب</div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          {summary.length === 0 ? (
            <div className="py-8 text-center text-slate-400">لا توجد عمولات مسجلة بعد — بتتولد تلقائيًا عند تسوية أول مأمورية</div>
          ) : (
            summary.map((r) => (
              <div key={r.courierId} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{r.name}</div>
                  <div className="text-slate-400 text-[11px]" dir="ltr">{r.phone}</div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-left">
                    <div className="text-[10px] text-slate-400">مستحق</div>
                    <div className="font-bold text-amber-600 dark:text-amber-400 tabular-nums">{formatPrice(r.dueAmount)} <span className="text-[10px] font-normal">({r.dueCount})</span></div>
                  </div>
                  <div className="text-left">
                    <div className="text-[10px] text-slate-400">مصروف</div>
                    <div className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatPrice(r.paidAmount)} <span className="text-[10px] font-normal">({r.paidCount})</span></div>
                  </div>
                  {r.dueAmount > 0 && (
                    <button
                      onClick={() => openPay(r.courierId)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold active:scale-[0.97] transition"
                    >
                      صرف
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Entries */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold">
          <span>تفصيل القيود</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'DUE' | 'PAID')}
            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-normal focus:outline-none"
          >
            <option value="DUE">غير مدفوعة</option>
            <option value="PAID">مدفوعة</option>
            <option value="ALL">الكل</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="py-2.5 px-4 font-medium">المندوب</th>
                <th className="py-2.5 px-4 font-medium">النوع</th>
                <th className="py-2.5 px-4 font-medium">المبلغ</th>
                <th className="py-2.5 px-4 font-medium">الحالة</th>
                <th className="py-2.5 px-4 font-medium">ملاحظة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {entries.length === 0 ? (
                <tr><td colSpan={5} className="py-6 text-center text-slate-400">لا قيود</td></tr>
              ) : (
                entries.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-4 font-medium">{e.courier?.name || '—'}</td>
                    <td className="py-2.5 px-4 text-slate-500">{e.commissionType === 'PERCENTAGE' ? 'نسبة' : e.commissionType === 'SALARY_ONLY' ? 'راتب فقط' : 'ثابتة/طلب'}</td>
                    <td className="py-2.5 px-4 tabular-nums font-semibold">{formatPrice(e.amount)}</td>
                    <td className="py-2.5 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        e.status === 'PAID'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                      }`}>
                        {e.status === 'PAID' ? 'مصروفة' : 'مستحقة'}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-400 truncate max-w-[220px]">{e.notes || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
            <span className="tabular-nums">صفحة {pagination.page} من {pagination.pages}</span>
            <div className="flex gap-1.5">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition">السابق</button>
              <button onClick={() => setPage((p) => (pagination && p < pagination.pages ? p + 1 : p))} disabled={!pagination || page >= pagination.pages} className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition">التالي</button>
            </div>
          </div>
        )}
      </div>

      {/* Pay modal */}
      {payingCourierId && payingRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <BanknotesIcon className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-sm">صرف مستحقات {payingRow.name}</h3>
            </div>
            <div className="text-sm">
              المبلغ الإجمالي المستحق: <span className="font-bold text-amber-600 dark:text-amber-400 tabular-nums">{formatPrice(payingRow.dueAmount)}</span>
              <span className="text-xs text-slate-400"> ({payingRow.dueCount} قيد)</span>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">الخزينة المصروف منها (اختياري)</label>
              <div className="flex items-center gap-2">
                <BuildingLibraryIcon className="w-4 h-4 text-slate-400" />
                <select
                  value={payAccountId}
                  onChange={(e) => setPayAccountId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:outline-none"
                >
                  <option value="">بدون قيد خزينة (صرف خارج الدفاتر)</option>
                  {treasuryAccounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} — رصيد: {formatPrice(a.balance)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button onClick={() => setPayingCourierId(null)} className="py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold active:scale-[0.98] transition">رجوع</button>
              <button onClick={confirmPay} className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold active:scale-[0.98] transition">تأكيد الصرف</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourierDuesPage;
