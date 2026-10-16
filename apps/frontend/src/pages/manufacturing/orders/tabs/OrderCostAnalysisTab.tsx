import React, { useState, useEffect } from 'react';
import { Calculator, TrendingDown, TrendingUp, RotateCw, AlertCircle } from 'lucide-react';
import { ProductionOrder, CostAnalysis, manufacturingApi } from '../../manufacturingApi';

interface OrderCostAnalysisTabProps {
  order: ProductionOrder;
}

export const OrderCostAnalysisTab: React.FC<OrderCostAnalysisTabProps> = ({ order }) => {
  const [analysis, setAnalysis] = useState<CostAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCostAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await manufacturingApi.getOrderCostAnalysis(order.id);
      setAnalysis(res);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'تعذر حساب تحليل التكاليف');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCostAnalysis();
  }, [order.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground text-xs">
        <RotateCw className="w-4 h-4 animate-spin text-primary" />
        <span>جارٍ احتساب مقارنة التكاليف المعيارية والفعلية...</span>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center justify-between">
        <span>{error || 'لا تتوفر بيانات تحليل التكلفة لهذا الأمر'}</span>
        <button
          onClick={loadCostAnalysis}
          className="px-2.5 py-1 rounded bg-destructive text-destructive-foreground text-[11px] font-medium"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  const { standardCost, actualCost, variance } = analysis;

  const renderVarianceCell = (act: number, std: number) => {
    const diff = Math.round((act - std) * 100) / 100;
    if (diff === 0) {
      return <span className="font-mono text-muted-foreground">0.00 ج.م</span>;
    }
    const isFavorable = diff < 0;
    return (
      <span
        className={`font-mono font-bold tabular-nums inline-flex items-center gap-0.5 ${
          isFavorable ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
        }`}
      >
        {isFavorable ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
        <span>{Math.abs(diff).toFixed(2)} ج.م</span>
        <span className="text-[10px] font-sans font-normal">({isFavorable ? 'وفر' : 'زيادة'})</span>
      </span>
    );
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Executive Costing Summary Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-card border border-border/70 shadow-xs">
          <span className="text-[11px] text-muted-foreground block mb-1">إجمالي التكلفة المعيارية (المخططة)</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono tabular-nums text-foreground">
              {Number(standardCost.total).toFixed(2)}
            </span>
            <span className="text-xs text-muted-foreground font-sans">ج.م</span>
          </div>
          <span className="text-[11px] text-muted-foreground font-mono mt-1 block">
            تكلفة القطعة المعيارية: {Number(standardCost.unitCost).toFixed(2)} ج.م
          </span>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border/70 shadow-xs">
          <span className="text-[11px] text-muted-foreground block mb-1">إجمالي التكلفة الفعلية المحققة</span>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold font-mono tabular-nums text-foreground">
              {Number(actualCost.total).toFixed(2)}
            </span>
            <span className="text-xs text-muted-foreground font-sans">ج.م</span>
          </div>
          <span className="text-[11px] text-muted-foreground font-mono mt-1 block">
            تكلفة القطعة الفعلية المحسوبة: {Number(actualCost.unitCost).toFixed(2)} ج.م
          </span>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border/70 shadow-xs">
          <span className="text-[11px] text-muted-foreground block mb-1">صافي انحراف التكلفة (Variance)</span>
          <div className="flex items-baseline gap-1">
            <span
              className={`text-xl font-bold font-mono tabular-nums ${
                variance.isFavorable ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {Math.abs(Number(variance.totalVariance)).toFixed(2)}
            </span>
            <span className="text-xs text-muted-foreground font-sans">ج.م</span>
          </div>
          <span className="text-[11px] font-semibold mt-1 block text-muted-foreground">
            {variance.isFavorable ? '✅ وفر في التكاليف الصناعية' : '⚠️ تجاوز عن التكلفة التقديرية'}
          </span>
        </div>
      </div>

      {/* Three-Way Costing Table */}
      <div className="rounded-xl bg-card border border-border/70 overflow-hidden shadow-xs">
        <div className="p-3.5 bg-muted/20 border-b border-border/60">
          <h3 className="text-xs font-bold text-foreground">
            المقارنة التفصيلية لعناصر التكلفة الصناعية الثلاثية (Three-Way Industrial Costing)
          </h3>
          <p className="text-[11px] text-muted-foreground">
            الخامات المباشرة + العمالة المباشرة + المصروفات الصناعية غير المباشرة (MOH)
          </p>
        </div>

        <table className="w-full text-right text-xs">
          <thead className="bg-muted/40 text-muted-foreground border-b border-border/60">
            <tr>
              <th className="p-3 font-semibold">عنصر التكلفة</th>
              <th className="p-3 font-semibold">التكلفة المعيارية (المخططة)</th>
              <th className="p-3 font-semibold">التكلفة الفعلية (المحققة)</th>
              <th className="p-3 font-semibold">الانحراف (Variance)</th>
              <th className="p-3 font-semibold">النسبة من الإجمالي</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            <tr className="hover:bg-muted/20 transition">
              <td className="p-3 font-bold text-foreground">1. تكلفة الخامات المباشرة (Direct Materials)</td>
              <td className="p-3 font-mono tabular-nums text-foreground">{Number(standardCost.materials).toFixed(2)} ج.م</td>
              <td className="p-3 font-mono font-bold tabular-nums text-foreground">{Number(actualCost.materials).toFixed(2)} ج.م</td>
              <td className="p-3">{renderVarianceCell(actualCost.materials, standardCost.materials)}</td>
              <td className="p-3 font-mono text-muted-foreground">
                {actualCost.total > 0 ? ((actualCost.materials / actualCost.total) * 100).toFixed(1) : 0}%
              </td>
            </tr>
            <tr className="hover:bg-muted/20 transition">
              <td className="p-3 font-bold text-foreground">2. تكلفة العمالة المباشرة (Direct Labor)</td>
              <td className="p-3 font-mono tabular-nums text-foreground">{Number(standardCost.labor).toFixed(2)} ج.م</td>
              <td className="p-3 font-mono font-bold tabular-nums text-foreground">{Number(actualCost.labor).toFixed(2)} ج.م</td>
              <td className="p-3">{renderVarianceCell(actualCost.labor, standardCost.labor)}</td>
              <td className="p-3 font-mono text-muted-foreground">
                {actualCost.total > 0 ? ((actualCost.labor / actualCost.total) * 100).toFixed(1) : 0}%
              </td>
            </tr>
            <tr className="hover:bg-muted/20 transition">
              <td className="p-3 font-bold text-foreground">3. التكاليف الصناعية غير المباشرة (MOH)</td>
              <td className="p-3 font-mono tabular-nums text-foreground">{Number(standardCost.overhead).toFixed(2)} ج.م</td>
              <td className="p-3 font-mono font-bold tabular-nums text-foreground">{Number(actualCost.overhead).toFixed(2)} ج.م</td>
              <td className="p-3">{renderVarianceCell(actualCost.overhead, standardCost.overhead)}</td>
              <td className="p-3 font-mono text-muted-foreground">
                {actualCost.total > 0 ? ((actualCost.overhead / actualCost.total) * 100).toFixed(1) : 0}%
              </td>
            </tr>
            <tr className="bg-muted/30 font-bold border-t border-border">
              <td className="p-3 text-foreground">إجمالي تكلفة أمر الإنتاج</td>
              <td className="p-3 font-mono tabular-nums text-foreground">{Number(standardCost.total).toFixed(2)} ج.م</td>
              <td className="p-3 font-mono tabular-nums text-emerald-600 dark:text-emerald-400">{Number(actualCost.total).toFixed(2)} ج.م</td>
              <td className="p-3">{renderVarianceCell(actualCost.total, standardCost.total)}</td>
              <td className="p-3 font-mono">100%</td>
            </tr>
            <tr className="bg-primary/5 font-bold">
              <td className="p-3 text-primary">تكلفة القطعة الواحدة تامة الصنع (Unit Cost)</td>
              <td className="p-3 font-mono tabular-nums text-primary">{Number(standardCost.unitCost).toFixed(2)} ج.م/قطعة</td>
              <td className="p-3 font-mono tabular-nums text-primary">{Number(actualCost.unitCost).toFixed(2)} ج.م/قطعة</td>
              <td className="p-3" colSpan={2}>
                {renderVarianceCell(actualCost.unitCost, standardCost.unitCost)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
