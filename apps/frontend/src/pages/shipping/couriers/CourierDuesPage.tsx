import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import {
  RotateCcw,
  Banknote,
  Building2,
  CheckCircle2,
  Clock,
  ArrowRight,
  ArrowLeft,
  Filter,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import courierService, { CourierCommissionSummaryRow, CourierCommissionEntry } from '../../../services/courierService';
import { useCurrency } from '../../../hooks/useCurrency';
import i18n from '../../../i18n';

/**
 * مستحقات المناديب — ledger العمولات: إجمالي DUE/PAID لكل مندوب + تفصيل القيود
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
        toast.success(res.message || 'تم صرف المستحقات بنجاح');
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
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 bg-card border border-border/70 rounded-xl p-3 shadow-xs">
          <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Clock size={13} className="text-amber-500" />
              <span>إجمالي المستحق المعلق (DUE)</span>
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400 mt-1">
              {formatPrice(totalDue)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">عمولات تنتظر الصرف للخزينة</div>
          </div>

          <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-500" />
              <span>مناديب لهم مستحقات</span>
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground mt-1">
              {summary.filter((r) => r.dueAmount > 0).length}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">من أصل {summary.length} مندوب مسجل</div>
          </div>

          <div className="p-3 rounded-lg bg-muted/20 border border-border/40 col-span-2 lg:col-span-1">
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Banknote size={13} className="text-primary" />
              <span>إجمالي القيود المسجلة</span>
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-foreground mt-1">
              {pagination?.total ?? 0}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">سجلات العمولات المحسوبة</div>
          </div>
        </div>

        {/* Courier Balances Summary */}
        <div className="bg-card border border-border/70 rounded-xl overflow-hidden shadow-xs">
          <div className="px-4 py-3 bg-muted/30 border-b border-border/70 flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">ملخص مستحقات المناديب</span>
            <span className="text-[11px] font-mono text-muted-foreground">{summary.length} مندوب</span>
          </div>

          <div className="divide-y divide-border/60">
            {summary.length === 0 ? (
              <div className="py-10 text-center text-xs text-muted-foreground font-mono">
                لا توجد عمولات مسجلة بعد — يتم توليدها تلقائياً عند تسوية مأموريات التوصيل
              </div>
            ) : (
              summary.map((r) => (
                <div key={r.courierId} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-muted/10 transition-colors">
                  <div className="min-w-0">
                    <div className="font-semibold text-xs text-foreground truncate">{r.name}</div>
                    <div className="text-[11px] font-mono text-muted-foreground mt-0.5" dir="ltr">{r.phone}</div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-left font-mono">
                      <div className="text-[10px] text-muted-foreground uppercase">مستحق معلق</div>
                      <div className="font-bold text-xs text-amber-600 dark:text-amber-400 tabular-nums">
                        {formatPrice(r.dueAmount)} <span className="text-[10px] font-normal text-muted-foreground">({r.dueCount})</span>
                      </div>
                    </div>

                    <div className="text-left font-mono">
                      <div className="text-[10px] text-muted-foreground uppercase">تم صرفه</div>
                      <div className="font-semibold text-xs text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {formatPrice(r.paidAmount)} <span className="text-[10px] font-normal text-muted-foreground">({r.paidCount})</span>
                      </div>
                    </div>

                    {r.dueAmount > 0 && (
                      <button
                        onClick={() => openPay(r.courierId)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold active:scale-[0.97] transition-all shadow-xs"
                      >
                        صرف المستحقات
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Detailed Commission Entries Ledger */}
        <div className="bg-card border border-border/70 rounded-xl overflow-hidden shadow-xs">
          <div className="px-4 py-3 bg-muted/30 border-b border-border/70 flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">تفاصيل قيود العمولات</span>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'DUE' | 'PAID')}
                className="text-xs h-8 px-2.5 rounded-lg border border-border/70 bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
              >
                <option value="DUE">المعلقة فقط (DUE)</option>
                <option value="PAID">المصروفة (PAID)</option>
                <option value="ALL">جميع الحالات (ALL)</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-muted/15 border-b border-border/60 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">المندوب</th>
                  <th className="py-2.5 px-4">نوع العمولة</th>
                  <th className="py-2.5 px-4 font-mono">المبلغ</th>
                  <th className="py-2.5 px-4 text-center">الحالة</th>
                  <th className="py-2.5 px-4">ملاحظات وقيد الخزينة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-medium">
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground font-mono">
                      لا توجد قيود مسجلة لهذا الفلتر
                    </td>
                  </tr>
                ) : (
                  entries.map((e) => (
                    <tr key={e.id} className="hover:bg-muted/10 transition-colors">
                      <td className="py-2.5 px-4 font-semibold text-foreground">{e.courier?.name || '—'}</td>
                      <td className="py-2.5 px-4 text-muted-foreground text-xs">
                        {e.commissionType === 'PERCENTAGE'
                          ? 'نسبة مئوية'
                          : e.commissionType === 'SALARY_ONLY'
                          ? 'راتب شهري ثابت'
                          : 'عمولة ثابتة / طلب'}
                      </td>
                      <td className="py-2.5 px-4 font-mono tabular-nums font-bold text-foreground">
                        {formatPrice(e.amount)}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={`inline-block text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                          e.status === 'PAID'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                        }`}>
                          {e.status === 'PAID' ? 'مصروفة' : 'مستحقة'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground text-[11px] truncate max-w-xs font-mono">
                        {e.notes || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/70 text-xs text-muted-foreground">
              <span className="font-mono tabular-nums">صفحة {pagination.page} من {pagination.pages}</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-2.5 py-1 rounded-md border border-border/70 hover:bg-muted/30 disabled:opacity-40 transition-colors"
                >
                  السابق
                </button>
                <button
                  onClick={() => setPage((p) => (pagination && p < pagination.pages ? p + 1 : p))}
                  disabled={!pagination || page >= pagination.pages}
                  className="px-2.5 py-1 rounded-md border border-border/70 hover:bg-muted/30 disabled:opacity-40 transition-colors"
                >
                  التالي
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal: Pay Courier Commission */}
        {payingCourierId && payingRow && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
            <div className="bg-card border border-border/70 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <Banknote className="size-5 text-emerald-600" />
                  <h3 className="font-bold text-sm text-foreground">صرف مستحقات {payingRow.name}</h3>
                </div>
                <button
                  onClick={() => setPayingCourierId(null)}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/30"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <div>المبلغ الإجمالي المستحق:</div>
                <div className="text-xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
                  {formatPrice(payingRow.dueAmount)}
                  <span className="text-xs font-normal text-muted-foreground mr-1.5">({payingRow.dueCount} قيد معلق)</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-foreground">
                  الخزينة المصروف منها (خصم فوري من الرصيد)
                </label>
                <div className="relative">
                  <select
                    value={payAccountId}
                    onChange={(e) => setPayAccountId(e.target.value)}
                    className="w-full text-xs h-9 px-3 rounded-lg border border-border/70 bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                  >
                    <option value="">بدون قيد خزينة (صرف خارج الدفاتر)</option>
                    {treasuryAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} — رصيد: {formatPrice(a.balance)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => setPayingCourierId(null)}
                  className="h-9 border border-border/70 hover:bg-muted/30 rounded-xl text-xs font-semibold transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={confirmPay}
                  className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold active:scale-[0.98] transition-all shadow-xs"
                >
                  تأكيد الصرف
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default CourierDuesPage;
