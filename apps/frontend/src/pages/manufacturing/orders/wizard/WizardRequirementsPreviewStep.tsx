import React from 'react';
import { Sparkles } from 'lucide-react';
import { BillOfMaterials, VariantRequirementResolution } from '../../manufacturingApi';

interface WizardRequirementsPreviewStepProps {
  selectedBom: BillOfMaterials | null;
  totalPlannedQty: number;
  variantCount: number;
  resolved: VariantRequirementResolution | null;
}

export const WizardRequirementsPreviewStep: React.FC<WizardRequirementsPreviewStepProps> = ({
  selectedBom,
  totalPlannedQty,
  variantCount,
  resolved,
}) => {
  return (
    <div className="space-y-4">
      <div className="p-3.5 rounded-xl bg-card border border-border/70 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-foreground">
            معاينة الاحتياجات التقديرية للخامات (BOM Requirements)
          </h3>
          <p className="text-[11px] text-muted-foreground">
            محسوبة آلياً لـ <span className="font-mono font-bold text-foreground">{totalPlannedQty}</span> قطعة
            بـ {variantCount} متغير مقاس ولون (شاملة نسب الفاقد والهدر)
          </p>
        </div>
        <div className="text-left font-mono text-xs">
          <span className="text-muted-foreground text-[11px] block">كود الـ BOM:</span>
          <span className="font-bold text-primary">{resolved?.bomCode || selectedBom?.code}</span>
        </div>
      </div>

      <div className="rounded-xl border border-border/70 overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-muted/40 text-muted-foreground border-b border-border/60">
              <tr>
                <th className="p-2.5 font-semibold">الخامة المطلوبة</th>
                <th className="p-2.5 font-semibold">الاستهلاك الأساسي</th>
                <th className="p-2.5 font-semibold text-emerald-600 font-bold">الكمية الإجمالية المطلوبة</th>
                <th className="p-2.5 font-semibold">الوحدة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {(resolved?.aggregatedMaterials || []).map((m, idx) => (
                <tr key={idx} className="hover:bg-muted/20 transition">
                  <td className="p-2.5 font-medium text-foreground">
                    {m.rawMaterialName || m.rawMaterialId}
                  </td>
                  <td className="p-2.5 font-mono tabular-nums text-muted-foreground">
                    {m.baseConsumptionPerUnit} {m.unit}/قطعة
                  </td>
                  <td className="p-2.5 font-mono font-bold tabular-nums text-emerald-600 text-sm">
                    {m.totalRequiredQuantity}
                  </td>
                  <td className="p-2.5 font-mono text-muted-foreground">{m.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-muted/20 border border-border/60 text-[11px] text-muted-foreground space-y-1">
        <div className="flex items-center gap-1.5 font-semibold text-foreground">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span>دورة التشغيل عند الإنشاء:</span>
        </div>
        <p>
          سيتم إنشاء أمر الإنتاج بحالة «مخطط PLANNED». يمكنك اعتماد الأمر (RELEASE) فوراً، ثم بدء
          التشغيل مع إمكانية الصرف التلقائي للخامات أو الصرف اليدوي بأي كميات ترغب بها.
        </p>
      </div>
    </div>
  );
};
