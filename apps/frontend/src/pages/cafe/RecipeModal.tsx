import React from 'react';
import { X, Plus, Trash2, Check, FlaskConical, Scale, Clock } from 'lucide-react';

export interface IngredientInput {
  rawProductId: string;
  rawProductName?: string;
  quantity: number;
  unit: string;
  unitConversionRatio: number;
  yieldPercentage: number;
  costPerUnit?: number;
}

export interface ProductOption {
  id: string;
  name: string;
  price: number;
  cost: number;
  sku?: string;
}

interface RecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProductId: string;
  setSelectedProductId: (v: string) => void;
  recipeName: string;
  setRecipeName: (v: string) => void;
  prepTime: number;
  setPrepTime: (v: number) => void;
  ingredients: IngredientInput[];
  products: ProductOption[];
  onAddIngredientRow: () => void;
  onRemoveIngredientRow: (index: number) => void;
  onIngredientChange: (index: number, field: keyof IngredientInput, value: any) => void;
  liveModalCost: number;
  onSave: (e: React.FormEvent) => void;
  saving: boolean;
  formatPrice: (price: number) => string;
}

export const RecipeModal: React.FC<RecipeModalProps> = ({
  isOpen,
  onClose,
  selectedProductId,
  setSelectedProductId,
  recipeName,
  setRecipeName,
  prepTime,
  setPrepTime,
  ingredients,
  products,
  onAddIngredientRow,
  onRemoveIngredientRow,
  onIngredientChange,
  liveModalCost,
  onSave,
  saving,
  formatPrice,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-card border border-border/70 w-full max-w-2xl rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <FlaskConical className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-bold text-foreground">
              معيار تصنيع مشروب جديد (Recipe BOM)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                المشروب النهائي <span className="text-destructive">*</span>
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl bg-muted/20 border border-border/70 text-foreground focus:outline-hidden"
              >
                <option value="">اختر المنتج / المشروب من القائمة</option>
                {(products || []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — سعر البيع: {p.price} ج.م
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                اسم المعيار (اختياري)
              </label>
              <input
                type="text"
                value={recipeName}
                onChange={(e) => setRecipeName(e.target.value)}
                placeholder="مثال: المعيار القياسي لكوب 12 أونص"
                className="w-full px-3 py-2 text-xs rounded-xl bg-muted/20 border border-border/70 text-foreground focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                وقت التحضير المتوقع (بالدقائق)
              </label>
              <input
                type="number"
                min="1"
                value={prepTime}
                onChange={(e) => setPrepTime(Number(e.target.value) || 1)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-muted/20 border border-border/70 text-foreground font-mono tabular-nums focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                التكلفة المقدرة للخامات
              </label>
              <div className="h-9 px-3 rounded-xl border border-border/70 bg-muted/20 flex items-center justify-between font-mono tabular-nums font-bold text-foreground">
                <span className="text-muted-foreground text-[11px]">مجموع الخامات:</span>
                <span className="text-primary">{formatPrice(liveModalCost)}</span>
              </div>
            </div>
          </div>

          {/* Ingredients Rows */}
          <div className="space-y-2 pt-2 border-t border-border/60">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-foreground">المكونات والمقادير الخام</span>
              <button
                type="button"
                onClick={onAddIngredientRow}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                إضافة مكون
              </button>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {(ingredients || []).map((ing, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-muted/20 p-2.5 rounded-xl border border-border/60">
                  <select
                    value={ing.rawProductId}
                    onChange={(e) => onIngredientChange(idx, 'rawProductId', e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs rounded-lg bg-card border border-border/70 text-foreground"
                    required
                  >
                    <option value="">اختر مادة خام (بن، حليب، سيرب…)</option>
                    {(products || []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    placeholder="الكمية"
                    value={ing.quantity}
                    onChange={(e) => onIngredientChange(idx, 'quantity', Number(e.target.value))}
                    className="w-20 px-2 py-1.5 text-xs rounded-lg bg-card border border-border/70 text-foreground font-mono tabular-nums text-center"
                    required
                  />

                  <select
                    value={ing.unit}
                    onChange={(e) => onIngredientChange(idx, 'unit', e.target.value)}
                    className="w-20 px-2 py-1.5 text-xs rounded-lg bg-card border border-border/70 text-foreground"
                  >
                    <option value="G">جرام (G)</option>
                    <option value="ML">ملل (ML)</option>
                    <option value="UNIT">قطعة</option>
                    <option value="KG">كجم</option>
                    <option value="L">لتر</option>
                  </select>

                  {ingredients.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onRemoveIngredientRow(idx)}
                      className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-border/70 bg-card hover:bg-muted/30 text-foreground transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-[0.98] shadow-xs disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{saving ? 'جاري الحفظ…' : 'حفظ معيار التصنيع'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
