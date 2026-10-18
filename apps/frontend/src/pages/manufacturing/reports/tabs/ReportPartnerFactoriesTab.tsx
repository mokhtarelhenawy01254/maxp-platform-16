import React, { useState, useEffect } from 'react';
import {
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCw,
  Coins,
  Layers,
  Phone,
  FileText,
} from 'lucide-react';
import {
  manufacturingApi,
  PartnerFactoryPerformance,
} from '../../manufacturingApi';

interface ReportPartnerFactoriesTabProps {
  dateFilter?: 'all' | 'today' | 'week' | 'month' | 'quarter';
  formatEGP: (num: number) => string;
}

export const ReportPartnerFactoriesTab: React.FC<ReportPartnerFactoriesTabProps> = ({
  dateFilter = 'month',
  formatEGP,
}) => {
  const [data, setData] = useState<PartnerFactoryPerformance[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Compute from/to ISO based on dateFilter
      let from: string | undefined;
      const now = new Date();
      if (dateFilter === 'today') {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        from = d.toISOString();
      } else if (dateFilter === 'week') {
        const d = new Date(now.getTime() - 7 * 86400000);
        from = d.toISOString();
      } else if (dateFilter === 'month') {
        const d = new Date(now.getTime() - 30 * 86400000);
        from = d.toISOString();
      } else if (dateFilter === 'quarter') {
        const d = new Date(now.getTime() - 90 * 86400000);
        from = d.toISOString();
      }

      const res = await manufacturingApi.getPartnerFactoriesPerformance({ from });
      setData(res);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'فشل تحميل تقرير أداء المصانع');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateFilter]);

  // Aggregate KPI summary
  const totalFactories = data.length;
  const totalStages = data.reduce((sum, f) => sum + f.assignedStagesCount, 0);
  const totalCompleted = data.reduce((sum, f) => sum + f.completedStagesCount, 0);
  const totalLaborSpend = data.reduce((sum, f) => sum + f.totalLaborCost, 0);
  const avgOnTimeRate =
    totalStages > 0
      ? Math.round((data.reduce((sum, f) => sum + f.onTimeCount, 0) / totalStages) * 100)
      : 100;

  if (loading) {
    return (
      <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
        <RotateCw className="w-5 h-5 animate-spin text-primary" />
        <span className="text-xs">جارٍ تحليل مؤشرات أداء المصانع الشركاء...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-xs">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4 text-xs" dir="rtl">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-border/70 bg-card">
          <div className="text-[11px] text-muted-foreground font-medium flex items-center justify-between mb-1">
            <span>المصانع الشركاء</span>
            <Building2 className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="text-xl font-bold tracking-tight text-foreground tabular-nums">
            {totalFactories}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">مسجلين بالفترة</div>
        </div>

        <div className="p-3.5 rounded-xl border border-border/70 bg-card">
          <div className="text-[11px] text-muted-foreground font-medium flex items-center justify-between mb-1">
            <span>المراحل المسندة / المنجزة</span>
            <Layers className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-xl font-bold tracking-tight text-foreground tabular-nums">
            {totalCompleted} <span className="text-xs font-normal text-muted-foreground">/ {totalStages}</span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">مرحلة تشغيل خارجي</div>
        </div>

        <div className="p-3.5 rounded-xl border border-border/70 bg-card">
          <div className="text-[11px] text-muted-foreground font-medium flex items-center justify-between mb-1">
            <span>معدل الالتزام بالمواعيد</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
            {avgOnTimeRate}%
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">تسليم في الموعد المحدد</div>
        </div>

        <div className="p-3.5 rounded-xl border border-border/70 bg-card">
          <div className="text-[11px] text-muted-foreground font-medium flex items-center justify-between mb-1">
            <span>إجمالي تكلفة التشغيل الخارجي</span>
            <Coins className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-bold tracking-tight text-foreground tabular-nums">
            {formatEGP(totalLaborSpend)}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">أجور تشغيل مسندة</div>
        </div>
      </div>

      {/* Performance Table */}
      <div className="rounded-xl bg-card border border-border/70 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-border/70 bg-muted/40 text-muted-foreground font-medium">
                <th className="py-3 px-4">المصنع الشريك</th>
                <th className="py-3 px-4">التخصص</th>
                <th className="py-3 px-4">مسؤول التواصل</th>
                <th className="py-3 px-4 text-center">أوامر / مراحل</th>
                <th className="py-3 px-4 text-center">تامة / جارية</th>
                <th className="py-3 px-4 text-center">في الموعد / متأخرة</th>
                <th className="py-3 px-4 text-center">نسبة الالتزام</th>
                <th className="py-3 px-4 text-center">متوسط دورة الإنجاز</th>
                <th className="py-3 px-4">إجمالي التكلفة المسندة</th>
                <th className="py-3 px-4 text-center">المرفقات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-muted-foreground">
                    لا توجد مصانع شركاء مسجلة أو بيانات تشغيل خارجي في الفترة المحددة.
                  </td>
                </tr>
              ) : (
                data.map((f) => {
                  const onTimeBadge =
                    f.onTimeRate >= 90
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                      : f.onTimeRate >= 70
                      ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                      : 'bg-destructive/10 text-destructive border-destructive/20';

                  return (
                    <tr key={f.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-foreground flex items-center gap-1.5">
                          <span>{f.name}</span>
                          {f.code && (
                            <span className="text-[10px] font-mono px-1 rounded bg-muted text-muted-foreground">
                              {f.code}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {f.specialty ? (
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium bg-secondary text-secondary-foreground">
                            {f.specialty}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-[11px] space-y-0.5">
                          {f.contactPerson && <div className="text-foreground">{f.contactPerson}</div>}
                          {f.phone && (
                            <div className="text-muted-foreground font-mono dir-ltr text-right">
                              {f.phone}
                            </div>
                          )}
                          {!f.contactPerson && !f.phone && <span className="text-muted-foreground">—</span>}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center font-mono tabular-nums text-foreground">
                        {f.assignedOrdersCount} أمر / {f.assignedStagesCount} مرحلة
                      </td>

                      <td className="py-3 px-4 text-center font-mono tabular-nums">
                        <span className="text-emerald-600 font-bold">{f.completedStagesCount}</span>
                        <span className="text-muted-foreground mx-1">/</span>
                        <span className="text-blue-600 font-bold">{f.inProgressStagesCount}</span>
                      </td>

                      <td className="py-3 px-4 text-center font-mono tabular-nums">
                        <span className="text-emerald-600">{f.onTimeCount}</span>
                        <span className="text-muted-foreground mx-1">/</span>
                        <span className={f.lateCount > 0 ? 'text-destructive font-bold' : 'text-muted-foreground'}>
                          {f.lateCount}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border tabular-nums ${onTimeBadge}`}
                        >
                          {f.onTimeRate}%
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center font-mono tabular-nums text-muted-foreground">
                        {f.avgExecutionDays > 0 ? `${f.avgExecutionDays} يوم` : '—'}
                      </td>

                      <td className="py-3 px-4 font-mono font-bold tabular-nums text-foreground">
                        {formatEGP(f.totalLaborCost)}
                      </td>

                      <td className="py-3 px-4 text-center font-mono tabular-nums text-muted-foreground">
                        {f.attachmentsCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-primary">
                            <FileText className="w-3 h-3" />
                            <span>{f.attachmentsCount}</span>
                          </span>
                        ) : (
                          '0'
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
