import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { BomComponentItem } from '../../manufacturingApi';

interface BomComponentsTableProps {
  components: BomComponentItem[];
  onAddComponent: () => void;
  onRemoveComponent: (idx: number) => void;
  onChangeComponent: (idx: number, field: keyof BomComponentItem, val: any) => void;
}

export const BomComponentsTable: React.FC<BomComponentsTableProps> = ({
  components,
  onAddComponent,
  onRemoveComponent,
  onChangeComponent,
}) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-xs font-bold text-foreground">بنود الخامات والمستلزمات (Raw Materials)</h3>
          <p className="text-[11px] text-muted-foreground">
            استهلاك القطعة الواحدة من الأقمشة، الخيوط، الإكسسوارات ونسب الهدر لكل بند
          </p>
        </div>
        <button
          type="button"
          onClick={onAddComponent}
          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>إضافة خامة</span>
        </button>
      </div>

      <div className="rounded-xl border border-border/70 overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-muted/40 text-muted-foreground border-b border-border/60">
              <tr>
                <th className="p-2 font-semibold">اسم الخامة / المستلزم</th>
                <th className="p-2 font-semibold">الاستهلاك / قطعة</th>
                <th className="p-2 font-semibold">الوحدة</th>
                <th className="p-2 font-semibold">فاقد البند %</th>
                <th className="p-2 font-semibold">المقاسات</th>
                <th className="p-2 font-semibold">الألوان</th>
                <th className="p-2 font-semibold text-center w-10">حذف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {components.map((item, idx) => (
                <tr key={idx} className="hover:bg-muted/20 transition">
                  <td className="p-1.5">
                    <input
                      type="text"
                      required
                      value={item.rawMaterialName || ''}
                      onChange={(e) => onChangeComponent(idx, 'rawMaterialName', e.target.value)}
                      placeholder="مثال: قماش ميلتون، خيط"
                      className="w-full px-2 py-1 text-xs rounded border border-border/60 bg-background focus:outline-none"
                    />
                  </td>
                  <td className="p-1.5 w-24">
                    <input
                      type="number"
                      step="0.01"
                      min="0.0001"
                      required
                      value={item.consumptionPerUnit}
                      onChange={(e) =>
                        onChangeComponent(idx, 'consumptionPerUnit', parseFloat(e.target.value) || 0)
                      }
                      className="w-full px-2 py-1 text-xs rounded border border-border/60 bg-background font-mono text-left focus:outline-none"
                    />
                  </td>
                  <td className="p-1.5 w-24">
                    <select
                      value={item.unit}
                      onChange={(e) => onChangeComponent(idx, 'unit', e.target.value)}
                      className="w-full px-1.5 py-1 text-xs rounded border border-border/60 bg-background focus:outline-none"
                    >
                      <option value="METER">متر</option>
                      <option value="KG">كجم</option>
                      <option value="PIECE">قطعة</option>
                      <option value="SPOOL">بكرة</option>
                      <option value="YARD">ياردة</option>
                    </select>
                  </td>
                  <td className="p-1.5 w-20">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={item.scrapRate}
                      onChange={(e) =>
                        onChangeComponent(idx, 'scrapRate', parseFloat(e.target.value) || 0)
                      }
                      className="w-full px-2 py-1 text-xs rounded border border-border/60 bg-background font-mono text-left focus:outline-none"
                    />
                  </td>
                  <td className="p-1.5 w-24">
                    <input
                      type="text"
                      value={(item.appliesToSizes || ['ALL']).join(',')}
                      onChange={(e) =>
                        onChangeComponent(
                          idx,
                          'appliesToSizes',
                          e.target.value.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
                        )
                      }
                      placeholder="ALL أو S,M,L"
                      className="w-full px-2 py-1 text-xs rounded border border-border/60 bg-background font-mono focus:outline-none text-center"
                    />
                  </td>
                  <td className="p-1.5 w-24">
                    <input
                      type="text"
                      value={(item.appliesToColors || ['ALL']).join(',')}
                      onChange={(e) =>
                        onChangeComponent(
                          idx,
                          'appliesToColors',
                          e.target.value.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
                        )
                      }
                      placeholder="ALL أو أسود,أبيض"
                      className="w-full px-2 py-1 text-xs rounded border border-border/60 bg-background font-mono focus:outline-none text-center"
                    />
                  </td>
                  <td className="p-1.5 text-center">
                    <button
                      type="button"
                      onClick={() => onRemoveComponent(idx)}
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
