import React from 'react';
import { X, Layers, Copy, Edit, Clock, ShieldCheck, AlertCircle } from 'lucide-react';
import { BillOfMaterials } from '../manufacturingApi';

interface BomDetailDrawerProps {
  bom: BillOfMaterials | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (bom: BillOfMaterials) => void;
  onClone: (bom: BillOfMaterials) => void;
}

export const BomDetailDrawer: React.FC<BomDetailDrawerProps> = ({
  bom,
  isOpen,
  onClose,
  onEdit,
  onClone,
}) => {
  if (!isOpen || !bom) return null;

  const totalStandardMinutes = (bom.standardStages || []).reduce(
    (sum, s) => sum + (Number(s.standardMinutes) || 0),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-background/80 backdrop-blur-sm animate-in fade-in duration-200" dir="rtl">
      <div className="w-full max-w-2xl h-full bg-card border-r border-border/70 shadow-2xl flex flex-col text-foreground animate-in slide-in-from-right duration-200 overflow-hidden">
        {/* Drawer Header */}
        <div className="p-4 border-b border-border/60 flex items-center justify-between bg-muted/20 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-foreground">{bom.code}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted text-muted-foreground border border-border/60">
                  V{bom.version}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                    bom.isActive
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                      : 'bg-muted text-muted-foreground border-border/60'
                  }`}
                >
                  {bom.isActive ? 'معتمدة ونشطة' : 'معطلة'}
                </span>
              </div>
              <h2 className="text-base font-bold text-foreground mt-0.5">{bom.name}</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 text-xs">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-3 rounded-xl bg-card border border-border/70 shadow-xs">
              <span className="text-[11px] text-muted-foreground block mb-1">الكمية المرجعية</span>
              <span className="font-mono font-bold text-sm text-foreground">{bom.baseQuantity} قطعة</span>
            </div>
            <div className="p-3 rounded-xl bg-card border border-border/70 shadow-xs">
              <span className="text-[11px] text-muted-foreground block mb-1">نسبة الهالك المسموح</span>
              <span className="font-mono font-bold text-sm text-amber-600">{bom.wasteMarginPercent}%</span>
            </div>
            <div className="p-3 rounded-xl bg-card border border-border/70 shadow-xs">
              <span className="text-[11px] text-muted-foreground block mb-1">العمالة المعيارية</span>
              <span className="font-mono font-bold text-sm text-foreground">{Number(bom.laborCostPerUnit).toFixed(2)} ج.م</span>
            </div>
            <div className="p-3 rounded-xl bg-card border border-border/70 shadow-xs">
              <span className="text-[11px] text-muted-foreground block mb-1">الأعباء المعيارية MOH</span>
              <span className="font-mono font-bold text-sm text-foreground">{Number(bom.overheadCostPerUnit).toFixed(2)} ج.م</span>
            </div>
          </div>

          {/* Components Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-foreground">
                بنود الخامات والمستلزمات ({(bom.components || []).length} خامة)
              </h3>
            </div>
            <div className="rounded-xl border border-border/70 overflow-hidden bg-card">
              <table className="w-full text-right text-xs">
                <thead className="bg-muted/40 text-muted-foreground border-b border-border/60">
                  <tr>
                    <th className="p-2.5 font-semibold">الخامة</th>
                    <th className="p-2.5 font-semibold">الاستهلاك</th>
                    <th className="p-2.5 font-semibold">الهالك %</th>
                    <th className="p-2.5 font-semibold">المقاسات المطبقة</th>
                    <th className="p-2.5 font-semibold">الألوان</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {(bom.components || []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-muted-foreground">
                        لا توجد خامات مسجلة في هذه القائمة
                      </td>
                    </tr>
                  ) : (
                    bom.components!.map((comp, idx) => (
                      <tr key={idx} className="hover:bg-muted/20 transition">
                        <td className="p-2.5 font-medium text-foreground">
                          <div>{comp.rawMaterialName || comp.rawMaterialId}</div>
                          {(comp.composition || comp.fabricWidthM || comp.targetGsm || comp.purchaseUnit) && (
                            <div className="text-[10px] text-muted-foreground mt-0.5 flex flex-wrap gap-1.5 font-normal">
                              {comp.composition && <span className="text-foreground/80 font-medium">{comp.composition}</span>}
                              {comp.fabricWidthM && <span className="bg-muted px-1.5 py-0.5 rounded border border-border/50">عرض: {comp.fabricWidthM} م</span>}
                              {comp.targetGsm && <span className="bg-muted px-1.5 py-0.5 rounded border border-border/50">{comp.targetGsm} GSM</span>}
                              {comp.purchaseUnit && <span className="text-primary font-medium">شراء: {comp.purchaseUnit}</span>}
                            </div>
                          )}
                        </td>
                        <td className="p-2.5 font-mono tabular-nums text-foreground">
                          {comp.consumptionPerUnit} {comp.consumptionUnit || comp.unit}
                        </td>
                        <td className="p-2.5 font-mono tabular-nums text-amber-600">
                          {comp.scrapRate}%
                        </td>
                        <td className="p-2.5">
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {(comp.appliesToSizes || ['ALL']).join(', ')}
                          </span>
                        </td>
                        <td className="p-2.5">
                          <span className="font-mono text-[11px] text-muted-foreground">
                            {(comp.appliesToColors || ['ALL']).join(', ')}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Standard Stages Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-foreground">
                مراحل التشغيل والإنتاج القياسية ({(bom.standardStages || []).length} مرحلة)
              </h3>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span>إجمالي الزمن: {totalStandardMinutes} دقيقة</span>
              </div>
            </div>
            <div className="rounded-xl border border-border/70 overflow-hidden bg-card">
              <table className="w-full text-right text-xs">
                <thead className="bg-muted/40 text-muted-foreground border-b border-border/60">
                  <tr>
                    <th className="p-2.5 w-12 text-center font-semibold">#</th>
                    <th className="p-2.5 font-semibold">اسم المرحلة</th>
                    <th className="p-2.5 font-semibold">النوع</th>
                    <th className="p-2.5 font-semibold">أجر القطعة</th>
                    <th className="p-2.5 font-semibold">الزمن المعياري</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {(bom.standardStages || []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-muted-foreground">
                        لا توجد مراحل مسجلة
                      </td>
                    </tr>
                  ) : (
                    bom.standardStages!.map((st, idx) => (
                      <tr key={idx} className="hover:bg-muted/20 transition">
                        <td className="p-2.5 text-center font-mono text-muted-foreground">{st.sequence || idx + 1}</td>
                        <td className="p-2.5 font-medium text-foreground">{st.name}</td>
                        <td className="p-2.5">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-muted text-muted-foreground border border-border/60">
                            {st.stageType}
                          </span>
                        </td>
                        <td className="p-2.5 font-mono font-bold text-emerald-600">
                          {Number(st.ratePerPiece).toFixed(2)} ج.م
                        </td>
                        <td className="p-2.5 font-mono text-muted-foreground">
                          {st.standardMinutes} دقيقة
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notes */}
          {bom.notes && (
            <div className="p-3 rounded-xl bg-muted/20 border border-border/60">
              <span className="text-[11px] font-semibold text-muted-foreground block mb-1">ملاحظات التشغيل والموديل:</span>
              <p className="text-xs text-foreground whitespace-pre-wrap">{bom.notes}</p>
            </div>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 border-t border-border/60 flex items-center justify-between bg-muted/20 shrink-0">
          <button
            onClick={() => {
              onClose();
              onClone(bom);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-card border border-border/70 text-foreground hover:bg-muted/50 transition"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>استنساخ إصدار جديد</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs rounded-lg border border-border/70 text-muted-foreground hover:text-foreground transition"
            >
              إغلاق
            </button>
            <button
              onClick={() => {
                onClose();
                onEdit(bom);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>تعديل الـ BOM</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
