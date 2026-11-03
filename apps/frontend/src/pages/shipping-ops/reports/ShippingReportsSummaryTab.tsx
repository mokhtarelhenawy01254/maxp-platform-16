import React from 'react';
import { Package, CheckCircle2, RotateCcw, AlertTriangle, Target, Clock } from 'lucide-react';
import { SummaryReportResponse } from '../../../services/shippingReportsService';
import { formatNumber } from './shippingReportsHelpers';

interface Props {
  data: SummaryReportResponse | null;
  loading: boolean;
}

export const ShippingReportsSummaryTab: React.FC<Props> = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="py-12 flex justify-center items-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data || !data.totals) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
        لا توجد بيانات متاحة لهذه الفترة
      </div>
    );
  }

  const { totals, rows } = data;

  const kpis = [
    {
      title: 'إجمالي الشحنات',
      value: formatNumber(totals.totalShipments),
      icon: Package,
      color: 'text-slate-700 dark:text-slate-200',
      bg: 'bg-slate-100 dark:bg-slate-800',
    },
    {
      title: 'الشحنات المسلّمة',
      value: formatNumber(totals.delivered),
      icon: CheckCircle2,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    },
    {
      title: 'الشحنات المرتجعة',
      value: formatNumber(totals.returned),
      icon: RotateCcw,
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-950/40',
    },
    {
      title: 'نسبة المرتجع (RTO)',
      value: `${totals.rtoRate}%`,
      icon: AlertTriangle,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      sub: 'مرتجعة ÷ (مسلّمة + مرتجعة)',
    },
    {
      title: 'نجاح أول محاولة',
      value: `${totals.firstAttemptSuccessRate}%`,
      icon: Target,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/40',
      sub: 'تسليم بدون أي فشل سابق',
    },
    {
      title: 'متوسط زمن التسليم',
      value: `${totals.avgDeliveryHours} س`,
      icon: Clock,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-950/40',
      sub: 'من الإنشاء إلى التسليم',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 6 KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{kpi.title}</span>
                <span className={`p-1.5 rounded-md ${kpi.bg} ${kpi.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="mt-2">
                <span className={`text-xl font-bold tabular-nums tracking-tight ${kpi.color}`}>
                  {kpi.value}
                </span>
                {kpi.sub && (
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate" title={kpi.sub}>
                    {kpi.sub}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Status Breakdown Table with Progress Bars */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            توزيع حالات الشحنات
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 font-medium">
              <tr>
                <th className="py-2.5 px-4">الحالة</th>
                <th className="py-2.5 px-4 text-center">العدد</th>
                <th className="py-2.5 px-4 text-center">النسبة</th>
                <th className="py-2.5 px-4 w-1/3">شريط التوزيع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((row) => (
                <tr key={row.key} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                    {row.label}
                  </td>
                  <td className="py-3 px-4 text-center tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                    {formatNumber(row.count)}
                  </td>
                  <td className="py-3 px-4 text-center tabular-nums text-slate-600 dark:text-slate-400">
                    {row.percentage}%
                  </td>
                  <td className="py-3 px-4">
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          row.key === 'delivered'
                            ? 'bg-emerald-500'
                            : row.key === 'returned'
                            ? 'bg-rose-500'
                            : row.key === 'failed'
                            ? 'bg-amber-500'
                            : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(100, row.percentage)}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
