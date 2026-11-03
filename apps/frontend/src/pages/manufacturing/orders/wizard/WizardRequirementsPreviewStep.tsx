import React, { useState, useMemo } from 'react';
import { Sparkles, Plus, Trash2, Package, Search, X, Layers } from 'lucide-react';
import { BillOfMaterials, VariantRequirementResolution, ProductOption } from '../../manufacturingApi';

export interface WizardMaterialItem {
  key: string;
  productId?: string | null;
  rawMaterialId?: string | null;
  name: string;
  plannedQuantity: number;
  unit: string;
  unitCost: number;
  source: 'BOM' | 'MANUAL';
  sortOrder: number;
}

interface WizardRequirementsPreviewStepProps {
  selectedBom: BillOfMaterials | null;
  totalPlannedQty: number;
  variantCount: number;
  resolved: VariantRequirementResolution | null;
  materials: WizardMaterialItem[];
  onChangeMaterials: (materials: WizardMaterialItem[]) => void;
  products: ProductOption[];
}

export const WizardRequirementsPreviewStep: React.FC<WizardRequirementsPreviewStepProps> = ({
  selectedBom,
  totalPlannedQty,
  variantCount,
  resolved,
  materials,
  onChangeMaterials,
  products = [],
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newProductId, setNewProductId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newQuantity, setNewQuantity] = useState<number | ''>(1);
  const [newUnit, setNewUnit] = useState('PIECE');
  const [newUnitCost, setNewUnitCost] = useState<number | ''>(0);
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // Filter products for combobox
  const filteredProducts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return products.slice(0, 10);
    return products
      .filter((p) => p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q)))
      .slice(0, 10);
  }, [products, searchTerm]);

  const handleSelectProduct = (prod: ProductOption) => {
    setNewProductId(prod.id);
    setNewName(prod.name);
    setSearchTerm(prod.name);
    setNewUnitCost(prod.cost || 0);
    setShowProductDropdown(false);
  };

  const handleConfirmAdd = () => {
    const finalName = (newName || searchTerm).trim();
    if (!finalName) return;

    const qty = typeof newQuantity === 'number' && newQuantity > 0 ? newQuantity : 1;
    const cost = typeof newUnitCost === 'number' && newUnitCost >= 0 ? newUnitCost : 0;

    const newItem: WizardMaterialItem = {
      key: `manual_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      productId: newProductId || null,
      rawMaterialId: null,
      name: finalName,
      plannedQuantity: qty,
      unit: newUnit.trim() || 'PIECE',
      unitCost: cost,
      source: 'MANUAL',
      sortOrder: materials.length + 1,
    };

    onChangeMaterials([...materials, newItem]);

    // Reset adding form
    setIsAdding(false);
    setSearchTerm('');
    setNewProductId(null);
    setNewName('');
    setNewQuantity(1);
    setNewUnit('PIECE');
    setNewUnitCost(0);
    setShowProductDropdown(false);
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
    setSearchTerm('');
    setNewProductId(null);
    setNewName('');
    setNewQuantity(1);
    setNewUnit('PIECE');
    setNewUnitCost(0);
    setShowProductDropdown(false);
  };

  const handleUpdateItem = (index: number, patch: Partial<WizardMaterialItem>) => {
    const updated = [...materials];
    updated[index] = { ...updated[index], ...patch };
    onChangeMaterials(updated);
  };

  const handleRemoveMaterial = (index: number) => {
    const updated = materials.filter((_, i) => i !== index);
    onChangeMaterials(updated);
  };

  const totalCost = useMemo(() => {
    return materials.reduce((sum, m) => sum + (Number(m.plannedQuantity) || 0) * (Number(m.unitCost) || 0), 0);
  }, [materials]);

  return (
    <div className="space-y-4">
      {/* Header Info Card */}
      <div className="p-3.5 rounded-xl bg-card border border-border/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold text-foreground">
              جدول خامات أمر الإنتاج (BOM Materials Table)
            </h3>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            تم الملء تلقائياً لـ <span className="font-mono font-bold text-foreground">{totalPlannedQty}</span> قطعة
            بـ {variantCount} متغير. تقدر تعدّل الكميات والأسعار وتضيف خامات يدوي حسب رغبتك.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-left font-mono text-xs">
            <span className="text-muted-foreground text-[10px] block">كود الـ BOM:</span>
            <span className="font-bold text-primary">{resolved?.bomCode || selectedBom?.code || '—'}</span>
          </div>
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 text-xs font-semibold hover:bg-primary/20 transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ إضافة خامة</span>
          </button>
        </div>
      </div>

      {/* Add Material Combobox & Form */}
      {isAdding && (
        <div className="p-4 rounded-xl border border-primary/40 bg-primary/5 space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Package className="w-4 h-4 text-primary" />
              إضافة خامة جديدة (من منتجات المخزن أو اسم حر)
            </span>
            <button
              type="button"
              onClick={handleCancelAdd}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            {/* Product Combobox */}
            <div className="sm:col-span-4 relative">
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                اسم الخامة أو الصنف من المخزن
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setNewName(e.target.value);
                    setNewProductId(null);
                    setShowProductDropdown(true);
                  }}
                  onFocus={() => setShowProductDropdown(true)}
                  placeholder="ابحث في المخزن أو اكتب اسم حر..."
                  className="w-full p-2 pr-8 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-muted-foreground" />
              </div>

              {/* Dropdown Menu */}
              {showProductDropdown && (
                <div className="absolute z-20 top-full mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-border bg-card shadow-lg text-xs">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => handleSelectProduct(p)}
                        className="p-2 hover:bg-muted/50 cursor-pointer flex items-center justify-between transition border-b border-border/40 last:border-b-0"
                      >
                        <div className="truncate">
                          <span className="font-semibold text-foreground block truncate">{p.name}</span>
                          {p.sku && <span className="text-[10px] text-muted-foreground font-mono">{p.sku}</span>}
                        </div>
                        <span className="font-mono text-[11px] text-emerald-600 shrink-0">
                          {p.cost ? `${p.cost} ج.م` : 'بدون تكلفة'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-2 text-center text-muted-foreground text-[11px]">
                      مفيش تطابق في المنتجات — هيتم تسجيلها كـ «اسم حر»
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quantity */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                الكمية المخططة
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value === '' ? '' : parseFloat(e.target.value))}
                placeholder="1"
                className="w-full p-2 text-xs rounded-lg border border-border bg-background font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Unit */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                الوحدة
              </label>
              <input
                type="text"
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                placeholder="METER / PIECE"
                className="w-full p-2 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Unit Cost */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                تكلفة الوحدة (ج.م)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={newUnitCost}
                onChange={(e) => setNewUnitCost(e.target.value === '' ? '' : parseFloat(e.target.value))}
                placeholder="0"
                className="w-full p-2 text-xs rounded-lg border border-border bg-background font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Action Buttons */}
            <div className="sm:col-span-2 flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleConfirmAdd}
                disabled={!(newName || searchTerm).trim()}
                className="flex-1 py-2 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition disabled:opacity-50"
              >
                إضافة للجدول
              </button>
              <button
                type="button"
                onClick={handleCancelAdd}
                className="py-2 px-2.5 rounded-lg border border-border text-muted-foreground hover:text-foreground text-xs font-medium"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Materials Table */}
      <div className="rounded-xl border border-border/70 overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-muted/40 text-muted-foreground border-b border-border/60">
              <tr>
                <th className="p-2.5 font-semibold">الصنف</th>
                <th className="p-2.5 font-semibold text-emerald-600 font-bold">الكمية المخططة</th>
                <th className="p-2.5 font-semibold">الوحدة</th>
                <th className="p-2.5 font-semibold">تكلفة الوحدة</th>
                <th className="p-2.5 font-semibold text-foreground font-bold">الإجمالي</th>
                <th className="p-2.5 font-semibold text-center w-12">حذف</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {materials.length > 0 ? (
                materials.map((m, idx) => {
                  const lineTotal = (Number(m.plannedQuantity) || 0) * (Number(m.unitCost) || 0);
                  return (
                    <tr key={m.key || idx} className="hover:bg-muted/20 transition">
                      {/* Name / Product */}
                      <td className="p-2.5 font-medium text-foreground min-w-[180px]">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={m.name}
                            onChange={(e) => handleUpdateItem(idx, { name: e.target.value })}
                            className="bg-transparent border-b border-dashed border-border/60 focus:border-primary focus:outline-none text-xs font-medium w-full text-foreground"
                          />
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-semibold shrink-0 ${
                              m.source === 'MANUAL'
                                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                                : 'bg-primary/10 text-primary border border-primary/20'
                            }`}
                          >
                            {m.source === 'MANUAL' ? 'يدوي' : 'BOM'}
                          </span>
                        </div>
                      </td>

                      {/* Planned Quantity Input */}
                      <td className="p-2.5 min-w-[120px]">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={m.plannedQuantity}
                          onChange={(e) =>
                            handleUpdateItem(idx, {
                              plannedQuantity: Math.max(0, parseFloat(e.target.value) || 0),
                            })
                          }
                          className="w-24 p-1.5 text-xs rounded-md border border-border bg-background font-mono font-bold text-emerald-600 tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </td>

                      {/* Unit Input */}
                      <td className="p-2.5 min-w-[90px]">
                        <input
                          type="text"
                          value={m.unit}
                          onChange={(e) => handleUpdateItem(idx, { unit: e.target.value })}
                          className="w-20 p-1.5 text-xs rounded-md border border-border bg-background font-mono text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </td>

                      {/* Unit Cost Input */}
                      <td className="p-2.5 min-w-[110px]">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={m.unitCost}
                          onChange={(e) =>
                            handleUpdateItem(idx, {
                              unitCost: Math.max(0, parseFloat(e.target.value) || 0),
                            })
                          }
                          className="w-24 p-1.5 text-xs rounded-md border border-border bg-background font-mono text-foreground tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </td>

                      {/* Line Total */}
                      <td className="p-2.5 font-mono font-bold tabular-nums text-foreground min-w-[100px]">
                        {lineTotal.toFixed(2)} ج.م
                      </td>

                      {/* Delete Action */}
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveMaterial(idx)}
                          title="حذف الخامة من أمر الإنتاج"
                          className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground text-xs">
                    مفيش خامات مضافة حالياً. اضغط على «+ إضافة خامة» لإضافة بنود.
                  </td>
                </tr>
              )}
            </tbody>
            {materials.length > 0 && (
              <tfoot className="bg-muted/30 border-t border-border/70 font-semibold">
                <tr>
                  <td className="p-2.5 text-foreground font-bold">
                    الإجمالي ({materials.length} خامة)
                  </td>
                  <td colSpan={3}></td>
                  <td className="p-2.5 font-mono font-bold text-primary text-sm tabular-nums">
                    {totalCost.toFixed(2)} ج.م
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Footer Instructions / Lifecycle Note */}
      <div className="p-3 rounded-xl bg-muted/20 border border-border/60 text-[11px] text-muted-foreground space-y-1">
        <div className="flex items-center gap-1.5 font-semibold text-foreground">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span>ملاحظات خامات أمر الإنتاج:</span>
        </div>
        <p>
          الجدول ده هيتحفظ كخامات مستهدفة لأمر الإنتاج. وقت بدء التشغيل والصرف، شاشة صرف الخامات هتبدأ من
          الجدول ده مباشرة عشان توفر وقت الإدخال، وتقدر تصرف جزئي أو كلي في أي وقت.
        </p>
      </div>
    </div>
  );
};
