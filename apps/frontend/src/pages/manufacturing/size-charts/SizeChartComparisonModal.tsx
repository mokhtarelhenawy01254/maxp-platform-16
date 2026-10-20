import React, { useEffect, useState } from 'react';
import { X, GitCompare, AlertTriangle, CheckCircle2, Ruler, Info } from 'lucide-react';
import { manufacturingApi, SizeChart, SizeChartMatrixResponse } from '../manufacturingApi';

interface SizeChartComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  sizeChart: SizeChart | null;
}

export const SizeChartComparisonModal: React.FC<SizeChartComparisonModalProps> = ({
  isOpen,
  onClose,
  sizeChart,
}) => {
  const [data, setData] = useState<SizeChartMatrixResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && sizeChart) {
      setLoading(true);
      setError(null);
      manufacturingApi
        .getSizeChartMatrix(sizeChart.id)
        .then((res) => setData(res))
        .catch(() => setError('تعذر تحميل مصفوفة مقارنة النسخ الثلاث'))
        .finally(() => setLoading(false));
    }
  }, [isOpen, sizeChart]);

  if (!isOpen || !sizeChart) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200" dir="rtl">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-xl bg-card border border-border/70 shadow-2xl overflow-hidden text-foreground">
        {/* Header */}
        <div className="p-4 border-b border-border/60 flex items-center justify-between bg-muted/20 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <GitCompare className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold">مقارنة النسخ الثلاث المترابطة (عميل / باترون / مصنع)</h2>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted text-foreground border border-border/60 font-bold">
                  {sizeChart.code} (V{sizeChart.version})
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">{sizeChart.name} — فحص تجاوزات نسبة التفاوت (Tolerance)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {loading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">جارٍ حساب الفروق وفحص التفاوتات...</div>
          ) : error ? (
            <div className="py-8 text-center text-xs text-destructive">{error}</div>
          ) : !data || data.matrix.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">لا توجد قياسات مسجلة للمقارنة</div>
          ) : (
            <>
              {/* Alert Banner */}
              {data.hasExceededTolerance ? (
                <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="text-xs leading-relaxed">
                    <strong>تنبيه فني (تجاوز التفاوت المسموح):</strong> تم رصد{' '}
                    <span className="font-bold underline">{data.exceededCount} قياس(ات)</span> تجاوزت فيها الفروق نسبة
                    التسامح المسموح بها بين العميل، الباترون، والمصنع. تم إبراز الخلايا المخالفة باللون التحذيري أدناه.
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <div className="text-xs font-semibold">
                    جميع القياسات مطابقة وضمن نسبة التفاوت المسموح بها (Tolerance) عبر النسخ الثلاث بنجاح.
                  </div>
                </div>
              )}

              {/* Info summary strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 rounded-lg border border-border/60 bg-muted/20">
                  <span className="text-[10px] text-muted-foreground block">وحدة القياس</span>
                  <strong className="text-foreground">{data.chart.unit}</strong>
                </div>
                <div className="p-2.5 rounded-lg border border-border/60 bg-muted/20">
                  <span className="text-[10px] text-muted-foreground block">طريقة القياس</span>
                  <strong className="text-foreground">
                    {data.chart.measurementMethod === 'FLAT' ? 'فلات مسطح (FLAT)' : 'محيط دائري (ROUND)'}
                  </strong>
                </div>
                <div className="p-2.5 rounded-lg border border-border/60 bg-muted/20">
                  <span className="text-[10px] text-muted-foreground block">إجمالي القياسات</span>
                  <strong className="text-foreground">{data.totalCells}</strong>
                </div>
                <div className="p-2.5 rounded-lg border border-border/60 bg-muted/20">
                  <span className="text-[10px] text-muted-foreground block">حالات التجاوز</span>
                  <strong className={data.exceededCount > 0 ? 'text-amber-600 font-bold' : 'text-emerald-600'}>
                    {data.exceededCount} حالة
                  </strong>
                </div>
              </div>

              {/* Matrix Table */}
              <div className="rounded-xl border border-border/70 overflow-hidden bg-card">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-muted/40 text-muted-foreground border-b border-border/60">
                      <tr>
                        <th className="p-2.5 font-semibold">المقاس</th>
                        <th className="p-2.5 font-semibold">القياس</th>
                        <th className="p-2.5 font-semibold text-center">نسخة العميل</th>
                        <th className="p-2.5 font-semibold text-center">نسخة الباترون</th>
                        <th className="p-2.5 font-semibold text-center">نسخة المصنع</th>
                        <th className="p-2.5 font-semibold text-center">التسامح ±</th>
                        <th className="p-2.5 font-semibold">الفروق الفعلية والتجاوز</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {data.matrix.map((row, idx) => (
                        <tr
                          key={idx}
                          className={`transition-colors ${
                            row.isToleranceExceeded
                              ? 'bg-amber-500/10 hover:bg-amber-500/15'
                              : 'hover:bg-muted/20'
                          }`}
                        >
                          <td className="p-2.5 font-mono font-bold text-foreground">
                            {row.sizeLabel}
                          </td>
                          <td className="p-2.5 font-medium text-foreground">
                            {row.measurementKey}
                          </td>
                          <td className="p-2.5 text-center font-mono font-semibold text-foreground tabular-nums">
                            {row.customerValue !== null ? `${row.customerValue} ${data.chart.unit}` : '—'}
                          </td>
                          <td className="p-2.5 text-center font-mono font-semibold text-foreground tabular-nums">
                            {row.patternValue !== null ? `${row.patternValue} ${data.chart.unit}` : '—'}
                          </td>
                          <td className="p-2.5 text-center font-mono font-semibold text-foreground tabular-nums">
                            {row.factoryValue !== null ? `${row.factoryValue} ${data.chart.unit}` : '—'}
                          </td>
                          <td className="p-2.5 text-center font-mono text-muted-foreground tabular-nums">
                            ±{row.tolerance}
                          </td>
                          <td className="p-2.5">
                            {row.isToleranceExceeded ? (
                              <div className="space-y-1">
                                {row.exceededSources.map((ex, exIdx) => (
                                  <div
                                    key={exIdx}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30"
                                  >
                                    <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                                    <span>
                                      {ex.label}: فرق {ex.diff} {data.chart.unit} (المسموح: {ex.allowedTolerance})
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>مطابق</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
