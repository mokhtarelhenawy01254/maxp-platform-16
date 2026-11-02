import React, { useMemo } from 'react';
import { Plus, Trash2, Calculator } from 'lucide-react';
import { BomComponentItem, ProductOption } from '../../manufacturingApi';

interface BomComponentsTableProps {
  components: BomComponentItem[];
  products?: ProductOption[];
  onAddComponent: () => void;
  onRemoveComponent: (idx: number) => void;
  onChangeComponent: (idx: number, field: keyof BomComponentItem, val: any) => void;
}

export const BomComponentsTable: React.FC<BomComponentsTableProps> = ({
  components,
  products = [],
  onAddComponent,
  onRemoveComponent,
  onChangeComponent,
}) => {
  // Check if candidate is descendant of target to prevent circular relations in dropdown
  const isDescendant = (candidateRef: string, targetRef: string, items: BomComponentItem[]): boolean => {
    let curr = items.find((c, i) => (c.clientRef || c.id || `idx-${i}`) === candidateRef);
    const visited = new Set<string>();
    while (curr && (curr.parentRef || curr.parentId)) {
      const pRef = curr.parentRef || curr.parentId;
      if (!pRef || visited.has(pRef)) break;
      if (pRef === targetRef) return true;
      visited.add(pRef);
      curr = items.find((c, i) => (c.clientRef || c.id || `idx-${i}`) === pRef);
    }
    return false;
  };

  // Determine tree depth / level for indentation
  const getLevel = (item: BomComponentItem, items: BomComponentItem[]): number => {
    let level = 0;
    let curr = item;
    const visited = new Set<string>();
    while (curr && (curr.parentRef || curr.parentId)) {
      const pRef = curr.parentRef || curr.parentId;
      if (!pRef || visited.has(pRef)) break;
      level++;
      visited.add(pRef);
      curr = items.find((c, i) => (c.clientRef || c.id || `idx-${i}`) === pRef) as any;
    }
    return Math.min(level, 5);
  };

  // Live node totals for real-time display in table
  const liveTotals = useMemo(() => {
    const result = new Map<string, number>();
    const byRef = new Map<string, BomComponentItem>();
    const childrenMap = new Map<string, string[]>();

    components.forEach((item, idx) => {
      const ref = item.clientRef || item.id || `idx-${idx}`;
      byRef.set(ref, item);
      childrenMap.set(ref, []);
    });

    components.forEach((item, idx) => {
      const ref = item.clientRef || item.id || `idx-${idx}`;
      const pRef = item.parentRef || item.parentId;
      if (pRef && childrenMap.has(pRef)) {
        childrenMap.get(pRef)!.push(ref);
      }
    });

    const visited = new Set<string>();
    const getNodeTotal = (ref: string): number => {
      if (visited.has(ref)) return 0;
      visited.add(ref);
      const item = byRef.get(ref);
      if (!item) return 0;
      const ownPrice = Number(item.totalPrice) || 0;
      const isInclusive = item.pricingMode === 'INCLUSIVE';
      const childRefs = childrenMap.get(ref) || [];
      let childrenSum = 0;
      for (const chRef of childRefs) {
        childrenSum += getNodeTotal(chRef);
      }
      const total = isInclusive ? ownPrice : Math.round((ownPrice + childrenSum) * 100) / 100;
      result.set(ref, total);
      return total;
    };

    components.forEach((item, idx) => {
      const ref = item.clientRef || item.id || `idx-${idx}`;
      getNodeTotal(ref);
    });

    return result;
  }, [components]);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-xs font-bold text-foreground">بنود الخامات والمستلزمات (Raw Materials & Fabric)</h3>
          <p className="text-[11px] text-muted-foreground">
            استهلاك القطعة، وحدات القياس، شجرة التسلسل (الأب/الابن)، الأسعار ووضع التسعير ونسب الهدر
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
                <th className="p-2 font-semibold">التابع لـ</th>
                <th className="p-2 font-semibold">السعر</th>
                <th className="p-2 font-semibold">وضع التسعير</th>
                <th className="p-2 font-semibold">الإجمالي</th>
                <th className="p-2 font-semibold">الاستهلاك / قطعة</th>
                <th className="p-2 font-semibold">وحدة الاستهلاك</th>
                <th className="p-2 font-semibold">فاقد البند %</th>
                <th className="p-2 font-semibold">المقاسات</th>
                <th className="p-2 font-semibold">الألوان</th>
                <th className="p-2 font-semibold text-center w-10">حذف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {components.map((item, idx) => {
                const itemRef = item.clientRef || item.id || `idx-${idx}`;
                const level = getLevel(item, components);
                const hasChildren = components.some(
                  (c, i) =>
                    (c.parentRef || c.parentId) === itemRef && (c.clientRef || c.id || `idx-${i}`) !== itemRef
                );
                const nodeTotal = liveTotals.get(itemRef) ?? (Number(item.totalPrice) || 0);

                return (
                  <React.Fragment key={idx}>
                    <tr className="hover:bg-muted/20 transition">
                      <td className="p-1.5 min-w-[220px]">
                        <div style={{ paddingInlineStart: `${level * 16}px` }} className="space-y-1">
                          <div className="flex items-center gap-1">
                            {level > 0 && <span className="text-muted-foreground font-mono text-xs select-none">↳</span>}
                            <div className="relative flex-1">
                              <input
                                type="text"
                                required
                                list={`products-datalist-${idx}`}
                                value={item.rawMaterialName || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const matched = products.find(
                                    (p) => p.name === val || (p.sku && `${p.name} (${p.sku})` === val) || p.id === val
                                  );
                                  if (matched) {
                                    onChangeComponent(idx, 'rawMaterialId', matched.id);
                                    onChangeComponent(idx, 'rawMaterialName', matched.name);
                                  } else {
                                    onChangeComponent(idx, 'rawMaterialName', val);
                                    if (item.rawMaterialId && !products.some((p) => p.id === item.rawMaterialId && p.name === val)) {
                                      onChangeComponent(idx, 'rawMaterialId', '');
                                    }
                                  }
                                }}
                                placeholder="اختر من المنتجات أو اكتب اسم الخامة"
                                className="w-full px-2 py-1 text-xs rounded border border-border/60 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                              <datalist id={`products-datalist-${idx}`}>
                                {products.map((p) => (
                                  <option key={p.id} value={p.name}>
                                    {p.sku ? `(${p.sku})` : ''} {p.cost ? `— ${p.cost} ج.م` : ''}
                                  </option>
                                ))}
                              </datalist>
                            </div>

                            {products.length > 0 && (
                              <select
                                value={products.some((p) => p.id === item.rawMaterialId) ? item.rawMaterialId : ''}
                                onChange={(e) => {
                                  const selectedId = e.target.value;
                                  if (!selectedId) return;
                                  const p = products.find((prod) => prod.id === selectedId);
                                  if (p) {
                                    onChangeComponent(idx, 'rawMaterialId', p.id);
                                    onChangeComponent(idx, 'rawMaterialName', p.name);
                                  }
                                }}
                                title="اختيار من قائمة المنتجات المسجلة"
                                className="w-6 px-0 py-1 text-xs rounded border border-border/60 bg-muted/40 hover:bg-muted text-muted-foreground cursor-pointer focus:outline-none shrink-0 text-center"
                              >
                                <option value="">▼</option>
                                {products.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} {p.sku ? `(${p.sku})` : ''}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>

                          {/* شارة الربط بكتالوج المنتجات */}
                          <div className="flex items-center gap-1">
                            {Boolean(item.rawMaterialId && products.some((p) => p.id === item.rawMaterialId)) ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                مرتبط بمنتج
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                                title="هذه الخامة غير مرتبطة بمنتج في الكتالوج ولن يتم خصمها من المخزن عند التشغيل"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                غير مرتبط — مش هيتخصم من المخزن
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Parent selector */}
                      <td className="p-1.5 w-36">
                        <select
                          value={item.parentRef || item.parentId || ''}
                          onChange={(e) => {
                            const val = e.target.value || null;
                            onChangeComponent(idx, 'parentRef', val);
                            onChangeComponent(idx, 'parentId', val);
                          }}
                          className="w-full px-1.5 py-1 text-xs rounded border border-border/60 bg-background focus:outline-none"
                        >
                          <option value="">بدون أب (مستوى أول)</option>
                          {components.map((other, oIdx) => {
                            const otherRef = other.clientRef || other.id || `idx-${oIdx}`;
                            if (otherRef === itemRef) return null;
                            if (isDescendant(otherRef, itemRef, components)) return null;
                            return (
                              <option key={otherRef} value={otherRef}>
                                {other.rawMaterialName || `بند ${oIdx + 1}`}
                              </option>
                            );
                          })}
                        </select>
                      </td>

                      {/* Price input */}
                      <td className="p-1.5 w-24">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.totalPrice ?? 0}
                          onChange={(e) =>
                            onChangeComponent(idx, 'totalPrice', parseFloat(e.target.value) || 0)
                          }
                          className="w-full px-2 py-1 text-xs rounded border border-border/60 bg-background font-mono text-left focus:outline-none"
                          placeholder="0.00"
                        />
                      </td>

                      {/* Pricing Mode select */}
                      <td className="p-1.5 w-28">
                        <select
                          value={item.pricingMode || 'ADDITIVE'}
                          onChange={(e) => onChangeComponent(idx, 'pricingMode', e.target.value)}
                          className="w-full px-1.5 py-1 text-xs rounded border border-border/60 bg-background focus:outline-none"
                        >
                          <option value="ADDITIVE">إضافي</option>
                          <option value="INCLUSIVE" disabled={!hasChildren}>
                            شامل للأبناء {!hasChildren ? '(يتطلب أبناء)' : ''}
                          </option>
                        </select>
                      </td>

                      {/* Node Total (display only) */}
                      <td className="p-1.5 w-24 text-left font-mono font-semibold text-xs text-foreground px-2">
                        {nodeTotal.toFixed(2)} ج.م
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
                      <td colSpan={11} className="px-3 py-1.5">
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
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BomComponentsTable;
