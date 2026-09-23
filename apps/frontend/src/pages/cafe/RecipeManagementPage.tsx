import React, { useState, useEffect, useMemo } from 'react';
import {
  BeakerIcon,
  PlusIcon,
  TrashIcon,
  ScaleIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { companyAwareApi } from '../../services/companyAwareApi';
import { useCurrency } from '../../hooks/useCurrency';

interface IngredientInput {
  rawProductId: string;
  rawProductName?: string;
  quantity: number;
  unit: string;
  unitConversionRatio: number;
  yieldPercentage: number;
  costPerUnit?: number;
}

interface Recipe {
  id: string;
  name: string;
  description?: string;
  prepTimeMinutes: number;
  yieldQuantity: number;
  estimatedCost: number;
  liveTheoreticalCost?: number;
  profitMarginPercentage?: number;
  product: {
    id: string;
    name: string;
    price: number;
    sku?: string;
  };
  ingredients: Array<{
    id: string;
    quantity: number;
    unit: string;
    unitConversionRatio: number;
    yieldPercentage: number;
    effectiveCost?: number;
    rawProduct: {
      id: string;
      name: string;
      cost: number;
      stock: number;
    };
  }>;
}

interface ProductOption {
  id: string;
  name: string;
  price: number;
  cost: number;
  sku?: string;
}

export const RecipeManagementPage: React.FC = () => {
  const { formatPrice } = useCurrency();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [recipeName, setRecipeName] = useState('');
  const [prepTime, setPrepTime] = useState(3);
  const [ingredients, setIngredients] = useState<IngredientInput[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [recipesRes, productsRes] = await Promise.all([
        companyAwareApi.get('/cafe/recipes'),
        companyAwareApi.get('/products?limit=200')
      ]);

      if (recipesRes.data?.success) {
        setRecipes(recipesRes.data.data.recipes || []);
      }
      if (productsRes.data?.data) {
        setProducts(productsRes.data.data || []);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'فشل تحميل بيانات الوصفات');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setSelectedProductId('');
    setRecipeName('');
    setPrepTime(3);
    setIngredients([
      { rawProductId: '', quantity: 18, unit: 'G', unitConversionRatio: 1, yieldPercentage: 100 }
    ]);
    setIsModalOpen(true);
  };

  const handleAddIngredientRow = () => {
    setIngredients([
      ...ingredients,
      { rawProductId: '', quantity: 1, unit: 'G', unitConversionRatio: 1, yieldPercentage: 100 }
    ]);
  };

  const handleRemoveIngredientRow = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleIngredientChange = (index: number, field: keyof IngredientInput, value: any) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  // Preview estimated cost live in modal
  const liveModalCost = useMemo(() => {
    return ingredients.reduce((sum, ing) => {
      const prod = products.find((p) => p.id === ing.rawProductId);
      const cost = Number(prod?.cost || 0);
      const qty = Number(ing.quantity || 0);
      const ratio = Number(ing.unitConversionRatio || 1);
      const yieldPct = Number(ing.yieldPercentage || 100) / 100;
      const effective = yieldPct > 0 ? (qty * ratio) / yieldPct : qty * ratio;
      return sum + effective * cost;
    }, 0);
  }, [ingredients, products]);

  const handleSaveRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      toast.error('يرجى اختيار المشروب / المنتج النهائي');
      return;
    }
    const validIngredients = ingredients.filter((i) => i.rawProductId && Number(i.quantity) > 0);
    if (validIngredients.length === 0) {
      toast.error('يرجى إضافة مكون خام واحد على الأقل مع تحديد الكمية');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        productId: selectedProductId,
        name: recipeName || undefined,
        prepTimeMinutes: prepTime,
        yieldQuantity: 1,
        ingredients: validIngredients
      };

      const res = await companyAwareApi.post('/cafe/recipes', payload);
      if (res.data?.success) {
        toast.success(res.data.message || 'تم حفظ معيار التصنيع بنجاح');
        setIsModalOpen(false);
        loadData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'فشل حفظ معيار التصنيع');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecipe = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف معيار هذا المشروب؟')) return;
    try {
      const res = await companyAwareApi.delete(`/cafe/recipes/${id}`);
      if (res.data?.success) {
        toast.success('تم حذف الرسيبي بنجاح');
        setRecipes(recipes.filter((r) => r.id !== id));
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'فشل حذف الرسيبي');
    }
  };

  const filteredRecipes = recipes.filter(
    (r) =>
      r.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.product?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background text-foreground p-3 sm:p-6 space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <BeakerIcon className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold tracking-tight text-pretty">
              معايير تصنيع المشروبات (Recipe BOM)
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            ضبط مقادير الأكواب بالجرام والمل، واحتساب تكلفة الخامات وهامش الربح الحقيقي
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-transform active:scale-[0.97]"
        >
          <PlusIcon className="w-4 h-4" />
          معيار مشروب جديد
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center justify-between gap-3">
        <input
          type="text"
          placeholder="بحث في المشروبات والمعايير…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:max-w-xs px-3 py-1.5 text-xs rounded-md bg-muted/30 border border-border/50 focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
          {filteredRecipes.length} معيار مسجل
        </span>
      </div>

      {/* Recipes Grid */}
      {loading ? (
        <div className="py-20 text-center text-xs text-muted-foreground">جاري تحميل المعايير…</div>
      ) : filteredRecipes.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-border/50 rounded-lg p-6">
          <BeakerIcon className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
          <h3 className="text-sm font-semibold mb-1">لا توجد معايير تصنيع مسجلة بعد</h3>
          <p className="text-xs text-muted-foreground mb-4">
            ابدأ بتحديد مقادير مشروباتك (مثل اللاتيه والكابتشينو) ليتم خصم الخامات آلياً عند كل طلب كاشير.
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="px-3 py-1.5 text-xs rounded bg-primary text-primary-foreground"
          >
            إضافة أول معيار
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredRecipes.map((recipe) => (
            <div
              key={recipe.id}
              className="rounded-lg border border-border/60 bg-card p-3.5 space-y-3 relative transition-colors hover:border-border"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-pretty">{recipe.product?.name}</h3>
                  <span className="text-[11px] text-muted-foreground">{recipe.name}</span>
                </div>
                <button
                  onClick={() => handleDeleteRecipe(recipe.id)}
                  aria-label="حذف المعيار"
                  className="text-muted-foreground/60 hover:text-destructive p-1 rounded"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Cost & Margin Metrics */}
              <div className="grid grid-cols-3 gap-2 p-2 rounded bg-muted/40 text-center">
                <div>
                  <div className="text-[10px] text-muted-foreground">سعر البيع</div>
                  <div className="text-xs font-semibold tabular-nums">
                    {formatPrice(Number(recipe.product?.price || 0))}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">تكلفة الخامات</div>
                  <div className="text-xs font-semibold text-amber-500 tabular-nums">
                    {formatPrice(recipe.liveTheoreticalCost || recipe.estimatedCost || 0)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">هامش الربح</div>
                  <div className="text-xs font-bold text-emerald-500 tabular-nums">
                    {recipe.profitMarginPercentage || 0}%
                  </div>
                </div>
              </div>

              {/* Ingredients List */}
              <div className="space-y-1.5 border-t border-border/40 pt-2">
                <div className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
                  <span>المكونات والخامات</span>
                  <span className="tabular-nums">{recipe.ingredients.length} مكون</span>
                </div>
                <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                  {recipe.ingredients.map((ing) => (
                    <div
                      key={ing.id}
                      className="flex items-center justify-between text-xs py-0.5 border-b border-border/20 last:border-0"
                    >
                      <span className="truncate max-w-[160px] text-muted-foreground">
                        {ing.rawProduct?.name}
                      </span>
                      <span className="tabular-nums font-mono text-[11px]">
                        {Number(ing.quantity)} {ing.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Recipe Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-card border border-border w-full max-w-xl rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-3.5 border-b border-border">
              <h2 className="text-sm font-semibold">تحديد معيار ومقادير المشروب</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRecipe} className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1">المشروب من قائمة البيع *</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => {
                    setSelectedProductId(e.target.value);
                    const prod = products.find((p) => p.id === e.target.value);
                    if (prod && !recipeName) {
                      setRecipeName(`معيار ${prod.name}`);
                    }
                  }}
                  required
                  className="w-full px-3 py-1.5 text-xs rounded bg-muted/40 border border-border focus:ring-1 focus:ring-primary"
                >
                  <option value="">اختر المشروب…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({formatPrice(p.price)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">اسم المعيار</label>
                  <input
                    type="text"
                    value={recipeName}
                    onChange={(e) => setRecipeName(e.target.value)}
                    placeholder="مثال: المعيار القياسي لكوب 8oz"
                    className="w-full px-3 py-1.5 text-xs rounded bg-muted/40 border border-border"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">زمن التجهيز (دقائق)</label>
                  <input
                    type="number"
                    value={prepTime}
                    onChange={(e) => setPrepTime(Number(e.target.value))}
                    min={1}
                    className="w-full px-3 py-1.5 text-xs rounded bg-muted/40 border border-border tabular-nums"
                  />
                </div>
              </div>

              {/* Ingredients Builder */}
              <div className="border border-border/60 rounded p-3 space-y-2 bg-muted/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">المكونات الداخلة في التحضير</span>
                  <button
                    type="button"
                    onClick={handleAddIngredientRow}
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                  >
                    <PlusIcon className="w-3.5 h-3.5" /> إضافة مكون
                  </button>
                </div>

                <div className="space-y-2">
                  {ingredients.map((ing, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={ing.rawProductId}
                        onChange={(e) => handleIngredientChange(idx, 'rawProductId', e.target.value)}
                        className="flex-1 px-2.5 py-1 text-xs rounded bg-background border border-border"
                        required
                      >
                        <option value="">اختر المادة الخام…</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (تكلفة: {formatPrice(p.cost || 0)})
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        step="any"
                        placeholder="الكمية"
                        value={ing.quantity}
                        onChange={(e) => handleIngredientChange(idx, 'quantity', Number(e.target.value))}
                        className="w-20 px-2 py-1 text-xs rounded bg-background border border-border tabular-nums"
                        required
                      />

                      <select
                        value={ing.unit}
                        onChange={(e) => handleIngredientChange(idx, 'unit', e.target.value)}
                        className="w-20 px-2 py-1 text-xs rounded bg-background border border-border"
                      >
                        <option value="G">جرام</option>
                        <option value="ML">مل</option>
                        <option value="PIECE">حبة/قطعة</option>
                      </select>

                      {ingredients.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveIngredientRow(idx)}
                          className="text-muted-foreground hover:text-destructive p-1"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Total Cost preview in modal */}
                <div className="mt-3 pt-2 border-t border-border flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">التكلفة التقديرية المحسوبة للمشروب:</span>
                  <span className="font-bold text-amber-500 tabular-nums">
                    {formatPrice(liveModalCost)}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs rounded border border-border hover:bg-muted"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 text-xs font-medium rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? 'جاري الحفظ…' : 'حفظ المعيار'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipeManagementPage;
