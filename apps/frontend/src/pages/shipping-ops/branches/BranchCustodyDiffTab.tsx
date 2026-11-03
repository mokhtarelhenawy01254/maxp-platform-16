import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  GitCompare,
  RefreshCw,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Building2,
  ArrowDownLeft,
  ArrowUpRight,
  Package,
} from 'lucide-react';
import { toast } from 'sonner';

interface DiffRow {
  branchId: string;
  branchName: string;
  branchCode: string;
  governorate: string;
  received: number;
  transferredIn: number;
  transferredOut: number;
  delivered: number;
  returned: number;
  currentInventory: number;
  discrepancies: Array<{ shipmentId: string; trackingNumber?: string; issue: string; message: string }>;
}

interface DiffTotals {
  totalBranches: number;
  totalReceived: number;
  totalTransferredIn: number;
  totalTransferredOut: number;
  totalDelivered: number;
  totalReturned: number;
  totalCurrentInventory: number;
  totalDiscrepancies: number;
}

export const BranchCustodyDiffTab: React.FC = () => {
  const { i18n } = useTranslation();
  const isEn = i18n.language === 'en';

  const todayStr = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [diff, setDiff] = useState<DiffRow[]>([]);
  const [totals, setTotals] = useState<DiffTotals | null>(null);

  const fetchDiff = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.append('from', from);
      if (to) params.append('to', to);

      const token = localStorage.getItem('token');
      const res = await fetch(`/api/v1/shipping-portal/branches/custody-diff?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setDiff(data.diff || []);
        setTotals(data.totals || null);
      } else {
        toast.error(data.error || 'تعذر جلب تقرير فروق العهدة');
      }
    } catch {
      toast.error('حدث خطأ أثناء الاتصال بالسيرفر');
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    fetchDiff();
  }, [fetchDiff]);

  return (
    <div className="space-y-5">
      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-50 dark:bg-purple-950/40 rounded-xl text-purple-600">
            <GitCompare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {isEn ? 'Custody Reconciliation & Differences' : 'تقرير فروق وحركة العهدة بين الفروع'}
            </h3>
            <p className="text-xs text-slate-500">
              {isEn ? 'Reconciliation of receipts, transfers, deliveries, and returns' : 'مطابقة عمليات الاستلام والتحويلات والتسليمات والمرتجعات لكل فرع'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-medium">من:</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-xs outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-medium">إلى:</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-xs outline-none"
            />
          </div>

          <button
            onClick={fetchDiff}
            disabled={loading}
            className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary KPI Counters */}
      {totals && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm">
            <span className="text-slate-500 text-[11px] block">الفروع النشطة</span>
            <span className="text-lg font-bold font-mono text-slate-800 dark:text-slate-200">{totals.totalBranches}</span>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm">
            <span className="text-slate-500 text-[11px] block">إجمالي المستلم</span>
            <span className="text-lg font-bold font-mono text-blue-600">{totals.totalReceived}</span>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm">
            <span className="text-slate-500 text-[11px] block">تحويل صادر</span>
            <span className="text-lg font-bold font-mono text-amber-600">{totals.totalTransferredOut}</span>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm">
            <span className="text-slate-500 text-[11px] block">تحويل وارد</span>
            <span className="text-lg font-bold font-mono text-indigo-600">{totals.totalTransferredIn}</span>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm">
            <span className="text-slate-500 text-[11px] block">إجمالي المسلّم</span>
            <span className="text-lg font-bold font-mono text-emerald-600">{totals.totalDelivered}</span>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm">
            <span className="text-slate-500 text-[11px] block">إجمالي المرتجع</span>
            <span className="text-lg font-bold font-mono text-rose-600">{totals.totalReturned}</span>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm">
            <span className="text-slate-500 text-[11px] block">العهدة الحالية</span>
            <span className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100">{totals.totalCurrentInventory}</span>
          </div>
        </div>
      )}

      {/* Discrepancies Alert Banner if any */}
      {totals && totals.totalDiscrepancies > 0 && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2 text-xs text-rose-800 dark:text-rose-300">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>تم رصد {totals.totalDiscrepancies} شحنة بها تعارض بين حالتها النهائية ووجودها في عهدة الفرع (يرجى مراجعة الجدول أدناه).</span>
        </div>
      )}

      {/* Diff Reconciliation Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
              <tr>
                <th className="px-4 py-3">الفرع والكود</th>
                <th className="px-3 py-3 text-center">المستلم في الهاَب</th>
                <th className="px-3 py-3 text-center">محول صادر</th>
                <th className="px-3 py-3 text-center">محول وارد</th>
                <th className="px-3 py-3 text-center">المسلّم</th>
                <th className="px-3 py-3 text-center">المرتجع</th>
                <th className="px-3 py-3 text-center">العهدة الحالية</th>
                <th className="px-4 py-3">حالة المطابقة والفروق</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {diff.map((row) => (
                <tr key={row.branchId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-900 dark:text-slate-100">{row.branchName}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{row.branchCode} • {row.governorate}</div>
                  </td>
                  <td className="px-3 py-3 text-center font-mono font-bold text-blue-600">
                    {row.received}
                  </td>
                  <td className="px-3 py-3 text-center font-mono font-medium text-amber-600">
                    {row.transferredOut}
                  </td>
                  <td className="px-3 py-3 text-center font-mono font-medium text-indigo-600">
                    {row.transferredIn}
                  </td>
                  <td className="px-3 py-3 text-center font-mono font-bold text-emerald-600">
                    {row.delivered}
                  </td>
                  <td className="px-3 py-3 text-center font-mono font-medium text-rose-600">
                    {row.returned}
                  </td>
                  <td className="px-3 py-3 text-center font-mono font-bold text-slate-900 dark:text-slate-100 bg-slate-50/60 dark:bg-slate-800/40">
                    {row.currentInventory}
                  </td>
                  <td className="px-4 py-3">
                    {row.discrepancies.length === 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>مطابق بنسبة 100%</span>
                      </span>
                    ) : (
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                          <AlertTriangle className="w-3 h-3" />
                          <span>{row.discrepancies.length} فرق مرصود</span>
                        </span>
                        <div className="text-[10px] text-rose-600 dark:text-rose-400">
                          {row.discrepancies[0]?.message}
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {diff.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    لا توجد بيانات حركة للفروع في هذه الفترة
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
