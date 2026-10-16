import React from 'react';
import { BillOfMaterials } from '../../manufacturingApi';

interface WizardVariantMatrixStepProps {
  selectedBom: BillOfMaterials | null;
  totalPlannedQty: number;
  sizes: string[];
  colors: string[];
  getMatrixQty: (size: string, color: string) => number;
  setMatrixQty: (size: string, color: string, qty: number) => void;
}

export const WizardVariantMatrixStep: React.FC<WizardVariantMatrixStepProps> = ({
  selectedBom,
  totalPlannedQty,
  sizes,
  colors,
  getMatrixQty,
  setMatrixQty,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-foreground">
            مصفوفة إنتاج المقاسات والألوان (Size x Color Matrix)
          </h3>
          <p className="text-[11px] text-muted-foreground">
            أدخل الكميات المطلوبة لكل مقاس ولون لموديل {selectedBom?.name}
          </p>
        </div>
        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
          إجمالي الكمية المخططة: <span className="font-mono text-sm">{totalPlannedQty}</span> قطعة
        </div>
      </div>

      <div className="rounded-xl border border-border/70 overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-center text-xs">
            <thead className="bg-muted/40 text-muted-foreground border-b border-border/60">
              <tr>
                <th className="p-2 text-right font-semibold">المقاس \ اللون</th>
                {colors.map((color) => (
                  <th key={color} className="p-2 font-semibold">
                    {color}
                  </th>
                ))}
                <th className="p-2 font-semibold">إجمالي المقاس</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {sizes.map((size) => {
                const rowTotal = colors.reduce((sum, col) => sum + getMatrixQty(size, col), 0);
                return (
                  <tr key={size} className="hover:bg-muted/20 transition">
                    <td className="p-2 text-right font-bold font-mono text-foreground">{size}</td>
                    {colors.map((color) => (
                      <td key={color} className="p-1.5">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={getMatrixQty(size, color) || ''}
                          onChange={(e) =>
                            setMatrixQty(size, color, parseInt(e.target.value, 10) || 0)
                          }
                          placeholder="0"
                          className="w-16 px-2 py-1 text-center font-mono text-xs rounded border border-border/60 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </td>
                    ))}
                    <td className="p-2 font-mono font-bold text-muted-foreground">{rowTotal}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
