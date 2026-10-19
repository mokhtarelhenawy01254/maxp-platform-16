import React from 'react';
import { Plus, Trash2, Calculator } from 'lucide-react';
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
          <h3 className="text-xs font-bold text-foreground">بنود الخامات والمستلزمات (Raw Materials & Fabric)</h3>
          <p className="text-[11px] text-muted-foreground">
            استهلاك القطعة، وحدات القياس (شراء واستهلاك)، مواصفات القماش (العرض، GSM، التركيب) ونسب الهدر
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
                <th className="p-2 font-semibold">وحدة الاستهلاك</th>
                <th className="p-2 font-semibold">فاقد البند %</th>
                <th className="p-2 font-semibold">المقاسات</th>
                <th className="p-2 font-semibold">الألوان</th>
                <th className="p-2 font-semibold text-center w-10">حذف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {components.map((item, idx) => (
                <React.Fragment key={idx}>
                  <tr className="hover:bg-muted/20 transition">
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
                        value={item.consumptionUnit || item.unit}
                        onChange={(e) => {
                          onChangeComponent(idx, 'unit', e.target.value);
                          onChangeComponent(idx, 'consumptionUnit', e.target.value);
                        }}
                        className="w-full px-1.5 py-1 text-xs rounded border border-border/60 bg-background focus:outline-none"
                      >
                        <option value="METER">متر (M)</option>
                        <option value="KG">كجم (KG)</option>
                        <option value="PIECE">قطعة (PC)</option>
                        <option value="SPOOL">بكرة (SPOOL)</option>
                        <option value="YARD">ياردة (YD)</option>
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

                  {/* Textile & Fabric Specs Secondary Row */}
                  <tr className="bg-muted/15 border-b border-border/60">
                    <td colSpan={7} className="px-3 py-1.5">
                      <div className="flex flex-wrap items-center gap-3 text-[11px]">
                        <span className="font-semibold text-primary/80 flex items-center gap-1 shrink-0">
                          <span>مواصفات الخامة النسيجية:</span>
                        </span>

                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">العرض:</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder="1.60"
                            value={item.fabricWidthM ?? ''}
                            onChange={(e) =>
                              onChangeComponent(
                                idx,
                                'fabricWidthM',
                                e.target.value ? parseFloat(e.target.value) : null
                              )
                            }
                            className="w-16 px-1.5 py-0.5 text-xs rounded border border-border/60 bg-background font-mono text-center focus:outline-none"
                          />
                          <span className="text-muted-foreground">م</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">الكثافة:</span>
                          <input
                            type="number"
                            step="1"
                            min="1"
                            placeholder="240"
                            value={item.targetGsm ?? ''}
                            onChange={(e) =>
                              onChangeComponent(
                                idx,
                                'targetGsm',
                                e.target.value ? parseFloat(e.target.value) : null
                              )
                            }
                            className="w-14 px-1.5 py-0.5 text-xs rounded border border-border/60 bg-background font-mono text-center focus:outline-none"
                          />
                          <span className="text-muted-foreground">GSM</span>
                        </div>

                        <div className="flex items-center gap-1 flex-1 min-w-[160px]">
                          <span className="text-muted-foreground shrink-0">التركيب:</span>
                          <input
                            type="text"
                            placeholder="مثال: 90% Polyester / 10% Elastane"
                            value={item.composition || ''}
                            onChange={(e) => onChangeComponent(idx, 'composition', e.target.value)}
                            className="w-full px-2 py-0.5 text-xs rounded border border-border/60 bg-background focus:outline-none"
                          />
                        </div>

                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">وحدة الشراء:</span>
                          <select
                            value={item.purchaseUnit || 'KG'}
                            onChange={(e) => onChangeComponent(idx, 'purchaseUnit', e.target.value)}
                            className="px-1.5 py-0.5 text-xs rounded border border-border/60 bg-background focus:outline-none font-mono"
                          >
                            <option value="KG">كجم (KG)</option>
                            <option value="METER">متر (METER)</option>
                            <option value="ROLL">ثوب/رول (ROLL)</option>
                            <option value="PIECE">قطعة (PIECE)</option>
                            <option value="SPOOL">بكرة (SPOOL)</option>
                            <option value="YARD">ياردة (YARD)</option>
                          </select>
                        </div>

                        <a
                          href={`/manufacturing/fabric-calculator?widthM=${item.fabricWidthM || '1.6'}&gsm=${item.targetGsm || '240'}&consumption=${item.consumptionPerUnit || '1.4'}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition shrink-0"
                          title="فتح حاسبة القماش المعتمدة"
                        >
                          <Calculator className="w-3 h-3" />
                          <span>حاسبة القماش</span>
                        </a>
                      </div>
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BomComponentsTable;
