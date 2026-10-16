import React from 'react';
import { Plus, Trash2, Wrench } from 'lucide-react';
import { BomStandardStage, ProductionStageType } from '../../manufacturingApi';

interface BomStagesTableProps {
  standardStages: BomStandardStage[];
  onAddStage: () => void;
  onRemoveStage: (idx: number) => void;
  onChangeStage: (idx: number, field: keyof BomStandardStage, val: any) => void;
  totalCalculatedLabor: number;
}

export const BomStagesTable: React.FC<BomStagesTableProps> = ({
  standardStages,
  onAddStage,
  onRemoveStage,
  onChangeStage,
  totalCalculatedLabor,
}) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-xs font-bold text-foreground">مراحل خط الإنتاج القياسية (Standard Stages)</h3>
          <p className="text-[11px] text-muted-foreground">
            تسلسل المراحل التشغيلية ومعدل أجر القطعة القياسي بالورشة
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            إجمالي أجر العمالة: {totalCalculatedLabor.toFixed(2)} ج.م/قطعة
          </span>
          <button
            type="button"
            onClick={onAddStage}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>إضافة مرحلة</span>
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border/70 overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-muted/40 text-muted-foreground border-b border-border/60">
              <tr>
                <th className="p-2 font-semibold w-12 text-center">#</th>
                <th className="p-2 font-semibold">اسم المرحلة</th>
                <th className="p-2 font-semibold">نوع المرحلة</th>
                <th className="p-2 font-semibold">الأجر / قطعة (ج.م)</th>
                <th className="p-2 font-semibold">الوقت القياسي (دقيقة)</th>
                <th className="p-2 font-semibold text-center w-10">حذف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {standardStages.map((stage, idx) => (
                <tr key={idx} className="hover:bg-muted/20 transition">
                  <td className="p-1.5 text-center font-mono text-muted-foreground">{idx + 1}</td>
                  <td className="p-1.5">
                    <input
                      type="text"
                      required
                      value={stage.name}
                      onChange={(e) => onChangeStage(idx, 'name', e.target.value)}
                      className="w-full px-2 py-1 text-xs rounded border border-border/60 bg-background focus:outline-none"
                    />
                  </td>
                  <td className="p-1.5 w-36">
                    <select
                      value={stage.stageType}
                      onChange={(e) =>
                        onChangeStage(idx, 'stageType', e.target.value as ProductionStageType)
                      }
                      className="w-full px-1.5 py-1 text-xs rounded border border-border/60 bg-background focus:outline-none"
                    >
                      <option value="CUTTING">قص وتفصيل</option>
                      <option value="SEWING">خياطة وتجميع</option>
                      <option value="FINISHING">تشطيب وتنظيف</option>
                      <option value="QC">فحص الجودة</option>
                      <option value="PACKAGING">تعبئة وتغليف</option>
                      <option value="CUSTOM">مرحلة مخصصة</option>
                    </select>
                  </td>
                  <td className="p-1.5 w-28">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={stage.ratePerPiece}
                      onChange={(e) =>
                        onChangeStage(idx, 'ratePerPiece', parseFloat(e.target.value) || 0)
                      }
                      className="w-full px-2 py-1 text-xs rounded border border-border/60 bg-background font-mono text-left focus:outline-none"
                    />
                  </td>
                  <td className="p-1.5 w-28">
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={stage.standardMinutes}
                      onChange={(e) =>
                        onChangeStage(idx, 'standardMinutes', parseInt(e.target.value, 10) || 0)
                      }
                      className="w-full px-2 py-1 text-xs rounded border border-border/60 bg-background font-mono text-left focus:outline-none"
                    />
                  </td>
                  <td className="p-1.5 text-center">
                    <button
                      type="button"
                      onClick={() => onRemoveStage(idx)}
                      className="p-1 text-muted-foreground hover:text-destructive transition rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5 mx-auto" />
                    </button>
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
